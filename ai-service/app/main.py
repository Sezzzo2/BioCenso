import base64
import hmac
import json
import os
import re
import time
import urllib.error
import urllib.request

from fastapi import FastAPI, File, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

# La clave nunca va en el código: se configura como variable de entorno del servicio
API_KEY = os.getenv("GEMINI_API_KEY", "")
# Si está definido, /predict solo atiende al backend (cabecera X-Servicio-Token).
# Evita que cualquiera que encuentre la URL pública gaste la cuota de Gemini.
SERVICIO_TOKEN = os.getenv("AI_SERVICE_TOKEN", "")
# Solo modelos Flash completos del plan gratuito: los "lite" ubicaban peor las reses y
# estimaban peor los pesos. Si uno está saturado (503) o sin cuota (429), se prueba el
# siguiente; cada modelo tiene su propia cuota. GEMINI_MODEL, si se define, va primero.
MODELOS = [
    "gemini-3-flash-preview",
    "gemini-3.8-flash",
    "gemini-flash-latest",
]
if os.getenv("GEMINI_MODEL"):
    MODELOS.insert(0, os.environ["GEMINI_MODEL"])
REINTENTABLES = {404, 429, 500, 503}
BASE_API = "https://generativelanguage.googleapis.com"


def url_modelo(modelo):
    return f"{BASE_API}/v1beta/models/{modelo}:generateContent?key={API_KEY}"


# Tiempo por intento y tope total para generar la respuesta (sin contar la subida del video)
TIMEOUT_MODELO = float(os.getenv("GEMINI_TIMEOUT_MODELO", "75"))
TIMEOUT_TOTAL = float(os.getenv("GEMINI_TIMEOUT_TOTAL", "300"))
# El mejor modelo (el primero) se reintenta antes de pasar a los de respaldo cuando está
# saturado o tarda; sin cuota (429) no tiene sentido insistir y se pasa al siguiente.
INTENTOS_MEJOR = int(os.getenv("GEMINI_INTENTOS_MEJOR", "3"))
ESPERAS = [3, 8, 15]


def con_pensamiento_medio(cuerpo):
    """Misma petición con razonamiento medio: alcanza para estimar bien el peso de cada res
    en una sola imagen y responde antes que con el razonamiento completo."""
    datos = json.loads(cuerpo)
    datos.setdefault("generationConfig", {})["thinkingConfig"] = {"thinkingLevel": "medium"}
    return json.dumps(datos).encode("utf-8")


def fallo_ia(motivo, fallos):
    # El detalle técnico (modelos y códigos) va al registro; al backend solo llega el motivo
    print("La IA no respondió:", "; ".join(fallos), flush=True)
    raise HTTPException(status_code=503, detail={"motivo": motivo, "fallos": fallos})


def llamar_gemini(cuerpo, presupuesto=TIMEOUT_TOTAL, rapido=False):
    limite = time.monotonic() + presupuesto
    modelos = list(dict.fromkeys(MODELOS))
    intentos = [modelos[0]] * INTENTOS_MEJOR + modelos[1:]
    fallos = []
    for n, modelo in enumerate(intentos):
        restante = limite - time.monotonic()
        if restante < 5:
            break
        datos = con_pensamiento_medio(cuerpo) if rapido and modelo.startswith("gemini-3") else cuerpo
        req = urllib.request.Request(
            url_modelo(modelo), data=datos,
            headers={"Content-Type": "application/json"}, method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=min(TIMEOUT_MODELO, restante)) as resp:
                return json.loads(resp.read().decode("utf-8")), modelo
        except urllib.error.HTTPError as error:
            if error.code == 400 and datos is not cuerpo:
                # El modelo no acepta thinkingLevel: se repite tal cual
                rapido = False
                intentos.insert(n + 1, modelo)
                continue
            if error.code not in REINTENTABLES:
                fallos.append(f"{modelo}: {error.code}")
                fallo_ia("rechazo", fallos)
            fallos.append(f"{modelo}: {error.code}")
            if error.code == 429 and modelo == modelos[0]:
                # Sin cuota: los demás intentos con el mejor modelo también fallarían
                intentos[:] = [m for i, m in enumerate(intentos) if i <= n or m != modelo]
        except (TimeoutError, urllib.error.URLError) as error:
            fallos.append(f"{modelo}: {type(error).__name__}")
        print("La IA no respondió, se reintenta:", fallos[-1], flush=True)
        siguiente = intentos[n + 1] if n + 1 < len(intentos) else None
        espera = ESPERAS[min(n, len(ESPERAS) - 1)] if siguiente == modelo else 0.3
        time.sleep(min(espera, max(0, limite - time.monotonic() - 5)))
    cuota = fallos and all(f.endswith(": 429") for f in fallos)
    tiempo = fallos and all(f.endswith("Error") for f in fallos)
    fallo_ia("cuota" if cuota else "tiempo" if tiempo else "saturado", fallos)


# Cómo estimar el peso: a partir de lo que se ve de cada animal, sin empujarlo hacia un
# valor elegido de antemano. Los rangos típicos solo orientan y se pueden superar.
REFERENCIA_PESOS = """Cómo estimar el peso de cada res (peso vivo en kilogramos):
- Estima CADA animal por separado a partir de lo que se ve de él: largo y ancho del cuerpo, profundidad del tórax, tamaño frente a las demás reses y objetos de la escena, y su condición corporal (costillas y cadera marcadas = flaco; lomo ancho y redondeado = gordo).
- Da el valor más probable para ese animal, sin redondear a cifras parecidas para todos ni acercarlo a un valor fijo. Si hay animales de distinto tamaño, sus pesos deben ser distintos.
- La categoría (vaca, toro, novillo, novilla o ternero) se decide por su tamaño, su forma y su comportamiento, no al revés.
- Como orientación, en la Orinoquía colombiana (Brahman, cebú y sus cruces) suelen pesar: vaca adulta 380-600 kg, toro 550-1000 kg, novillo 250-500 kg, novilla 250-420 kg, ternero 60-250 kg. Si lo que ves indica un peso fuera de ese rango, usa lo que ves.
- Si un animal se ve mal (lejos, tapado o borroso), estímalo igual con lo que se alcance a ver de su tamaño."""

PROMPT_CENSO = """Actúa como el motor de visión por computadora de BioCenso especializado en detección y conteo de ganado bovino (vacas, toros, novillos, terneros).
1. Examina con máxima atención todo el video o imagen de principio a fin y cuenta TODAS las vacas/reses que aparecen en la escena o recorrido (de pie, echadas, caminando, agrupadas, parcialmente visibles o en sombra). NO subestimes el conteo: "count" debe ser el número total real de reses identificadas.
2. En "reses" agrega UN elemento por CADA res contada en todo el video (exactamente "count" elementos, sin repetir la misma res): su "categoria" (vaca, toro, novillo, novilla o ternero), su peso individual estimado en "peso_kg" según la guía de abajo, y el segundo del video en que mejor se ve en "segundo" (0 si es una imagen).
3. Elige el fotograma donde se vean más reses con claridad. En "captura.segundo" indica su segundo exacto dentro del video (usa 0 si es una imagen). Para CADA res visible en ese fotograma agrega un elemento a "captura.animales" con su recuadro "box_2d" = [ymin, xmin, ymax, xmax] en coordenadas normalizadas de 0 a 1000 sobre ese fotograma, y su peso individual estimado en kilogramos en "peso_kg". No marques otros animales (perros, caballos, cabras).

Responde ÚNICAMENTE con JSON válido con esta forma (los valores entre <> son lo que debes estimar):
{
  "count": <número de reses>,
  "reses": [
    {"categoria": "<vaca|toro|novillo|novilla|ternero>", "peso_kg": <peso estimado de esa res>, "segundo": <segundo del video>}
  ],
  "captura": {
    "segundo": <segundo del fotograma>,
    "animales": [
      {"box_2d": [<ymin>, <xmin>, <ymax>, <xmax>], "peso_kg": <peso estimado de esa res>}
    ]
  }
}

""" + REFERENCIA_PESOS

# Gemini acepta archivos en la misma petición hasta ~20 MB (en base64 crecen un tercio);
# por encima se suben antes con la API de archivos, que admite videos de hasta 2 GB.
LIMITE_EN_LINEA = int(os.getenv("GEMINI_LIMITE_EN_LINEA_MB", "14")) * 1024 * 1024
ESPERA_PROCESADO = float(os.getenv("GEMINI_ESPERA_PROCESADO", "240"))


def borrar_archivo(nombre):
    try:
        urllib.request.urlopen(
            urllib.request.Request(f"{BASE_API}/v1beta/{nombre}?key={API_KEY}", method="DELETE"), timeout=30)
    except Exception:  # El archivo caduca solo a las 48 h; no vale la pena fallar el censo por esto
        pass


def subir_archivo(archivo, tamano, mime, nombre):
    """Sube el archivo por partes (protocolo reanudable) y espera a que Gemini lo procese."""
    inicio = urllib.request.Request(
        f"{BASE_API}/upload/v1beta/files?key={API_KEY}",
        data=json.dumps({"file": {"display_name": (nombre or "censo")[:120]}}).encode("utf-8"),
        headers={
            "X-Goog-Upload-Protocol": "resumable",
            "X-Goog-Upload-Command": "start",
            "X-Goog-Upload-Header-Content-Length": str(tamano),
            "X-Goog-Upload-Header-Content-Type": mime,
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(inicio, timeout=60) as resp:
        url_subida = resp.headers.get("X-Goog-Upload-URL")
    if not url_subida:
        raise HTTPException(status_code=502, detail="Gemini no aceptó la subida del archivo")

    archivo.seek(0)
    # urllib envía el archivo por bloques: el video nunca se carga entero en memoria
    subida = urllib.request.Request(
        url_subida, data=archivo,
        headers={"Content-Length": str(tamano), "X-Goog-Upload-Offset": "0", "X-Goog-Upload-Command": "upload, finalize"},
        method="POST",
    )
    with urllib.request.urlopen(subida, timeout=600) as resp:
        info = json.loads(resp.read().decode("utf-8"))["file"]

    limite = time.monotonic() + ESPERA_PROCESADO
    while info.get("state") == "PROCESSING":
        if time.monotonic() > limite:
            borrar_archivo(info["name"])
            raise HTTPException(status_code=504, detail="Gemini tardó demasiado en procesar el video")
        time.sleep(3)
        with urllib.request.urlopen(f"{BASE_API}/v1beta/{info['name']}?key={API_KEY}", timeout=30) as resp:
            info = json.loads(resp.read().decode("utf-8"))
    if info.get("state") != "ACTIVE":
        borrar_archivo(info["name"])
        raise HTTPException(status_code=502, detail="Gemini no pudo procesar el video")
    return info


def leer_respuesta(raw_resp):
    """Saca el JSON del texto que devuelve Gemini, aunque venga envuelto en marcas de código."""
    candidato = (raw_resp.get("candidates") or [{}])[0]
    partes = (candidato.get("content") or {}).get("parts") or [{}]
    texto = "".join(p.get("text", "") for p in partes).strip()
    if not texto:
        motivo = candidato.get("finishReason") or "respuesta vacía"
        raise HTTPException(status_code=502, detail=f"Gemini no devolvió resultado ({motivo})")
    texto = re.sub(r"^```(?:json)?\s*|\s*```$", "", texto)
    try:
        return json.loads(texto)
    except json.JSONDecodeError:
        inicio, fin = texto.find("{"), texto.rfind("}")
        if inicio >= 0 and fin > inicio:
            try:
                return json.loads(texto[inicio:fin + 1])
            except json.JSONDecodeError:
                pass
        raise HTTPException(status_code=502, detail="Gemini devolvió una respuesta que no se pudo leer")


def leer_animales(lista):
    """Normaliza los recuadros [ymin, xmin, ymax, xmax] (0-1000) y el peso de cada res."""
    animales = []
    for a in (lista if isinstance(lista, list) else [])[:300]:
        caja = a.get("box_2d") if isinstance(a, dict) else None
        if not isinstance(caja, list) or len(caja) != 4:
            continue
        try:
            ymin, xmin, ymax, xmax = (min(1000, max(0, int(round(float(v))))) for v in caja)
            peso = a.get("peso_kg")
            peso = round(float(peso)) if peso is not None else None
        except (TypeError, ValueError):
            continue
        if ymax > ymin and xmax > xmin:
            animales.append({"caja": [ymin, xmin, ymax, xmax], "peso_kg": peso, "categoria": categoria_de(a.get("categoria"))})
    return animales


CATEGORIAS = {"vaca", "toro", "novillo", "novilla", "ternero"}


def categoria_de(valor):
    texto = str(valor or "").strip().lower()
    texto = "ternero" if texto.startswith("terner") else texto
    return texto if texto in CATEGORIAS else None


def leer_reses(lista, conteo):
    """Peso y categoría de cada res contada en el video, como mucho tantas como el conteo."""
    reses = []
    for r in (lista if isinstance(lista, list) else [])[:max(0, conteo)]:
        if not isinstance(r, dict):
            continue
        try:
            peso = round(float(r.get("peso_kg")))
            segundo = round(max(0.0, float(r.get("segundo") or 0)), 1)
        except (TypeError, ValueError):
            continue
        if 30 <= peso <= 1500:
            reses.append({"categoria": categoria_de(r.get("categoria")), "peso_kg": peso, "segundo": segundo})
    return reses


def leer_captura(datos):
    """Segundo del fotograma elegido y, si llegaron, sus recuadros. None si el modelo no lo envió."""
    captura = datos.get("captura")
    if not isinstance(captura, dict):
        return None
    try:
        segundo = max(0.0, float(captura.get("segundo") or 0))
    except (TypeError, ValueError):
        segundo = 0.0
    return {"segundo": round(segundo, 2), "animales": leer_animales(captura.get("animales"))}


PROMPT_CAJAS = """Esta es una imagen aérea de un potrero tomada por un dron. Detecta CADA res (bovino: vaca, toro, novillo, ternero) visible, incluidas las que están echadas, en sombra o parcialmente fuera del borde.
No marques otros animales (perros, caballos, cabras, ovejas, aves) ni objetos.
Para cada res da su recuadro "box_2d" = [ymin, xmin, ymax, xmax] ajustado al cuerpo, en coordenadas normalizadas de 0 a 1000 sobre esta misma imagen, su "categoria" (vaca, toro, novillo, novilla o ternero) y su peso individual estimado en kilogramos en "peso_kg".

""" + REFERENCIA_PESOS + """

Responde ÚNICAMENTE con JSON válido con esta forma (los valores entre <> son lo que debes estimar):
{"animales": [{"box_2d": [<ymin>, <xmin>, <ymax>, <xmax>], "categoria": "<vaca|toro|novillo|novilla|ternero>", "peso_kg": <peso estimado de esa res>}]}
Si no hay reses, responde {"animales": []}."""


app = FastAPI(title="BioCenso AI Service")

# Solo lo llama el backend (servidor a servidor); ningún navegador necesita acceso directo
app.add_middleware(
    CORSMiddleware,
    allow_origins=[],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"estado": "ok", "servicio": "ai-service", "clave_configurada": bool(API_KEY)}


# Función síncrona a propósito: FastAPI la ejecuta en un hilo aparte, así las esperas
# a Gemini no bloquean otras peticiones.
@app.post("/predict")
def predict(imagen: UploadFile = File(...), x_servicio_token: str = Header(default="")):
    if SERVICIO_TOKEN and not hmac.compare_digest(x_servicio_token, SERVICIO_TOKEN):
        raise HTTPException(status_code=401, detail="No autorizado")
    if not API_KEY:
        raise HTTPException(status_code=503, detail="GEMINI_API_KEY no está configurada")
    inicio = time.perf_counter()
    mime_type = imagen.content_type or "video/mp4"
    archivo = imagen.file
    archivo.seek(0, os.SEEK_END)
    tamano = archivo.tell()
    archivo.seek(0)

    subido = None
    if tamano <= LIMITE_EN_LINEA:
        parte_archivo = {"inlineData": {"mimeType": mime_type, "data": base64.b64encode(archivo.read()).decode("utf-8")}}
    else:
        subido = subir_archivo(archivo, tamano, mime_type, imagen.filename)
        parte_archivo = {"fileData": {"mimeType": subido.get("mimeType", mime_type), "fileUri": subido["uri"]}}

    payload = {
        "contents": [{"parts": [parte_archivo, {"text": PROMPT_CENSO}]}],
        "generationConfig": {"responseMimeType": "application/json", "temperature": 0.1},
    }
    try:
        raw_resp, modelo_usado = llamar_gemini(json.dumps(payload).encode("utf-8"))
    finally:
        if subido:
            borrar_archivo(subido["name"])

    datos = leer_respuesta(raw_resp)

    conteo = max(0, int(datos.get("count", datos.get("conteo_maximo", 0)) or 0))
    reses = leer_reses(datos.get("reses"), conteo)
    captura = leer_captura(datos)

    # El promedio y el total salen de los pesos de cada animal, sin acotarlos a un rango
    # elegido de antemano. Si faltan pesos individuales se usan los de la captura y, como
    # último recurso, el promedio que haya dado el modelo.
    pesos = [r["peso_kg"] for r in reses] or [a["peso_kg"] for a in (captura or {}).get("animales", []) if a["peso_kg"]]
    if pesos:
        peso_prom = sum(pesos) / len(pesos)
    else:
        try:
            peso_prom = float(datos.get("peso_estimado_promedio") or 0)
        except (TypeError, ValueError):
            peso_prom = 0.0
    peso_prom = round(peso_prom, 2)
    # Los animales sin peso propio (si el modelo listó menos que el conteo) aportan el promedio
    peso_total = round(sum(pesos[:conteo]) + max(0, conteo - len(pesos)) * peso_prom, 2) if conteo else 0.0
    peso_min = round(min(pesos), 2) if pesos else peso_prom
    peso_max = round(max(pesos), 2) if pesos else peso_prom

    tiempo_procesamiento = round(time.perf_counter() - inicio, 2)

    return {
        "count": conteo,
        "peso_estimado_promedio": peso_prom,
        "peso_promedio_minimo_kg": peso_min,
        "peso_promedio_maximo_kg": peso_max,
        "peso_total_estimado": peso_total,
        "observaciones": datos.get("observaciones", ""),
        "captura": captura,
        "reses": reses,
        "detections": [],
        "processing_time": tiempo_procesamiento,
        "model": "YOLOv26s",
        "modelo_gemini": modelo_usado,
    }


# Marca las reses sobre una imagen exacta (el fotograma que el navegador extrajo del video).
# Así los recuadros coinciden con lo que se ve, sin depender de que el segundo sea preciso.
@app.post("/detectar")
def detectar(fotograma: UploadFile = File(...), x_servicio_token: str = Header(default="")):
    if SERVICIO_TOKEN and not hmac.compare_digest(x_servicio_token, SERVICIO_TOKEN):
        raise HTTPException(status_code=401, detail="No autorizado")
    if not API_KEY:
        raise HTTPException(status_code=503, detail="GEMINI_API_KEY no está configurada")
    contenido = fotograma.file.read()
    payload = {
        "contents": [{"parts": [
            {"inlineData": {"mimeType": fotograma.content_type or "image/jpeg", "data": base64.b64encode(contenido).decode("utf-8")}},
            {"text": PROMPT_CAJAS},
        ]}],
        "generationConfig": {"responseMimeType": "application/json", "temperature": 0.1},
    }
    # El backend espera 180 s: se deja margen para que su respuesta llegue antes
    raw_resp, modelo_usado = llamar_gemini(json.dumps(payload).encode("utf-8"), presupuesto=165, rapido=True)
    datos = leer_respuesta(raw_resp)
    lista = datos.get("animales") if isinstance(datos, dict) else datos
    return {"animales": leer_animales(lista), "modelo_gemini": modelo_usado}
