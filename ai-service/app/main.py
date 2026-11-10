import base64
import hmac
import json
import os
import re
import shutil
import tempfile
import time
import urllib.error
import urllib.request

from fastapi import FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from app import fotogramas

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


# Ajustes opcionales de la generación. Si un modelo no los acepta (400) o la petición se pasa
# del límite de tokens por minuto (429), se repite sin ellos antes de cambiar de modelo.
# - Razonamiento medio: alcanza para medir cada res y responde mucho antes que el completo.
#   La alta resolución en video se probó y multiplicaba el tiempo (más de 170 s por intento
#   con un video de 12 s); el detalle fino lo da la captura, que es una sola imagen.
EXTRAS_CAPTURA = {"thinkingConfig": {"thinkingLevel": "medium"}}
EXTRAS_CENSO = {"thinkingConfig": {"thinkingLevel": "medium"}}


def con_extras(cuerpo, extras):
    datos = json.loads(cuerpo)
    datos.setdefault("generationConfig", {}).update(extras)
    return json.dumps(datos).encode("utf-8")


def fallo_ia(motivo, fallos):
    # El detalle técnico (modelos y códigos) va al registro; al backend solo llega el motivo
    print("La IA no respondió:", "; ".join(fallos), flush=True)
    raise HTTPException(status_code=503, detail={"motivo": motivo, "fallos": fallos})


def llamar_gemini(cuerpo, presupuesto=TIMEOUT_TOTAL, extras=None, timeout=TIMEOUT_MODELO):
    limite = time.monotonic() + presupuesto
    modelos = list(dict.fromkeys(MODELOS))
    intentos = [modelos[0]] * INTENTOS_MEJOR + modelos[1:]
    cuerpo_extras = con_extras(cuerpo, extras) if extras else None
    sin_extras = set()  # modelos que ya rechazaron los ajustes opcionales
    fallos = []
    for n, modelo in enumerate(intentos):
        restante = limite - time.monotonic()
        if restante < 5:
            break
        datos = cuerpo_extras if cuerpo_extras and modelo not in sin_extras else cuerpo
        req = urllib.request.Request(
            url_modelo(modelo), data=datos,
            headers={"Content-Type": "application/json"}, method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=min(timeout, restante)) as resp:
                return json.loads(resp.read().decode("utf-8")), modelo
        except urllib.error.HTTPError as error:
            if error.code in (400, 429) and datos is not cuerpo:
                print(f"{modelo} no aceptó los ajustes opcionales ({error.code}); se repite sin ellos", flush=True)
                sin_extras.add(modelo)
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
REFERENCIA_PESOS = """Cómo estimar el peso de cada res (peso vivo en kilogramos). Sigue estos pasos en orden:
1. ESCALA. Antes de medir animales, determina cuántos metros de terreno cubre la imagen. Usa la altura de vuelo si se indica más abajo y cualquier objeto de tamaño conocido que se vea: postes y cuerdas de cerca, bebederos, saladeros, portones, personas, vehículos, caminos.
2. MEDIDAS. Con esa escala mide CADA animal por separado: su largo de cuerpo (de la cruz a la base de la cola, sin cabeza ni cuello) en "largo_cm" y su ancho a la altura del vientre. Si está echado o se ve de lado, corrige la medida por la postura y la perspectiva.
3. CONDICIÓN CORPORAL. Observa si está flaco (costillas, cadera y espinazo marcados), normal o gordo (lomo ancho y redondeado, grupa llena).
4. PESO. A partir del largo, el ancho y la condición corporal da el peso más probable de ESE animal. Un cuerpo más largo y más ancho pesa más aunque sea de la misma categoría; dos animales de distinto tamaño no pueden quedar con el mismo peso. No redondees a cifras parecidas para todos ni acerques los valores a un número fijo.
5. CATEGORÍA. Decide si es vaca, toro, novillo, novilla o ternero por su tamaño, su forma (giba, cuello, cabeza) y su comportamiento, después de medirlo.
- Como orientación, en la Orinoquía colombiana (Brahman, cebú y sus cruces) suelen pesar: vaca adulta 380-600 kg, toro 550-1000 kg, novillo 250-500 kg, novilla 250-420 kg, ternero 60-250 kg. Si tus medidas indican un peso fuera de ese rango, usa tus medidas.
- Si un animal se ve mal (lejos, tapado o borroso), estímalo igual con lo que se alcance a medir."""


NOMBRE_GRUPO = {  # (singular, plural)
    "vaca": ("vaca", "vacas"), "toro": ("toro", "toros"), "novillo": ("novillo", "novillos"),
    "novilla": ("novilla", "novillas"), "ternero": ("ternero", "terneros"), "ternera": ("ternera", "terneras"),
    "hembra": ("hembra sin tipo registrado", "hembras sin tipo registrado"),
    "macho": ("macho sin tipo registrado", "machos sin tipo registrado"),
}


def texto_calibracion(calibracion):
    """Convierte los datos del vuelo y de la finca (JSON que arma el backend) en una nota para la IA."""
    try:
        datos = json.loads(calibracion or "{}")
    except (TypeError, ValueError):
        return ""
    if not isinstance(datos, dict):
        return ""
    lineas = []
    try:
        altura = float(datos.get("altura_m") or 0)
    except (TypeError, ValueError):
        altura = 0
    if 5 <= altura <= 500:
        lineas.append(
            f"- Altura de vuelo: el dron voló a unos {altura:g} m sobre el terreno. Con la cámara apuntando hacia abajo y "
            f"el lente gran angular habitual de un dron, el ancho de terreno que cubre la imagen es de aproximadamente "
            f"{altura * 1.4:.0f} a {altura * 1.6:.0f} m. Úsalo para pasar de la imagen a metros.")
    grupos = []
    for g in datos.get("finca") if isinstance(datos.get("finca"), list) else []:
        try:
            n, prom, minimo, maximo = int(g["cantidad"]), float(g["promedio"]), float(g["minimo"]), float(g["maximo"])
        except (KeyError, TypeError, ValueError):
            continue
        # Grupo = tipo de animal (vaca, ternero...) o, si no tiene tipo, su sexo
        nombres = NOMBRE_GRUPO.get(str(g.get("grupo") or g.get("sexo") or "").lower())
        if nombres and n > 0 and 20 <= minimo <= maximo <= 2000:
            if n == 1:
                grupos.append(f"1 {nombres[0]} de {prom:.0f} kg")
            else:
                grupos.append(f"{n} {nombres[1]}: promedio {prom:.0f} kg (de {minimo:.0f} a {maximo:.0f} kg)")
    if grupos:
        lineas.append(
            "- Pesos reales que el ganadero tiene registrados en esta misma finca: " + "; ".join(grupos) + ". "
            "Sirven para saber qué tamaños son normales en este hato y afinar la escala, pero cada res se "
            "estima por sus propias medidas: no copies estos valores.")
    return ("\n\nDatos de este vuelo y de esta finca:\n" + "\n".join(lineas)) if lineas else ""

PROMPT_CENSO = """Actúa como el motor de visión por computadora de BioCenso especializado en detección y conteo de ganado bovino (vacas, toros, novillos, terneros).
1. Examina con máxima atención todo el video o imagen de principio a fin y cuenta TODAS las vacas/reses que aparecen en la escena o recorrido (de pie, echadas, caminando, agrupadas, parcialmente visibles o en sombra). NO subestimes el conteo: "count" debe ser el número total real de reses identificadas.
2. En "reses" agrega UN elemento por CADA res contada en todo el video (exactamente "count" elementos, sin repetir la misma res): su "categoria" (vaca, toro, novillo, novilla o ternero), su peso individual estimado en "peso_kg" según la guía de abajo, el segundo exacto del video en que mejor se ve en "segundo" (0 si es una imagen) y su recuadro "box_2d" = [ymin, xmin, ymax, xmax] (0 a 1000) sobre el fotograma de ESE segundo, ajustado a su cuerpo.
3. Elige el fotograma donde se vean más reses con claridad. En "captura.segundo" indica su segundo exacto dentro del video (usa 0 si es una imagen). Para CADA res visible en ese fotograma agrega un elemento a "captura.animales" con su recuadro "box_2d" = [ymin, xmin, ymax, xmax] en coordenadas normalizadas de 0 a 1000 sobre ese fotograma, y su peso individual estimado en kilogramos en "peso_kg". No marques otros animales (perros, caballos, cabras).

Responde ÚNICAMENTE con JSON válido con esta forma (los valores entre <> son lo que debes estimar):
{
  "count": <número de reses>,
  "reses": [
    {"categoria": "<vaca|toro|novillo|novilla|ternero>", "largo_cm": <largo de cuerpo medido>, "peso_kg": <peso estimado de esa res>, "segundo": <segundo del video>, "box_2d": [<ymin>, <xmin>, <ymax>, <xmax>]}
  ],
  "captura": {
    "segundo": <segundo del fotograma>,
    "animales": [
      {"box_2d": [<ymin>, <xmin>, <ymax>, <xmax>], "categoria": "<vaca|toro|novillo|novilla|ternero>", "largo_cm": <largo de cuerpo medido>, "peso_kg": <peso estimado de esa res>}
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


def indice_de(valor, total):
    """Número de fotograma válido (0..total-1) o None."""
    try:
        k = int(valor)
    except (TypeError, ValueError):
        return None
    return k if 0 <= k < total else None


def leer_reses(lista, conteo, segundos=None):
    """Peso y categoría de cada res contada, como mucho tantas como el conteo. Con
    `segundos` (modo fotogramas) cada res queda ligada al fotograma exacto donde se marcó."""
    reses = []
    for r in (lista if isinstance(lista, list) else [])[:max(0, conteo)]:
        if not isinstance(r, dict):
            continue
        try:
            peso = round(float(r.get("peso_kg")))
            segundo = round(max(0.0, float(r.get("segundo") or 0)), 1)
        except (TypeError, ValueError):
            continue
        k = indice_de(r.get("fotograma"), len(segundos)) if segundos else None
        if k is not None:
            segundo = segundos[k]
        if 30 <= peso <= 1500:
            reses.append({"categoria": categoria_de(r.get("categoria")), "peso_kg": peso, "segundo": segundo,
                          "caja": caja_de(r.get("box_2d")), "cuadro": k})
    return reses


def caja_de(valor):
    """Recuadro [ymin, xmin, ymax, xmax] normalizado a 0-1000, o None si no es válido."""
    if not isinstance(valor, list) or len(valor) != 4:
        return None
    try:
        ymin, xmin, ymax, xmax = (min(1000, max(0, int(round(float(v))))) for v in valor)
    except (TypeError, ValueError):
        return None
    return [ymin, xmin, ymax, xmax] if ymax > ymin and xmax > xmin else None


def leer_captura(datos, segundos=None):
    """Segundo del fotograma elegido y, si llegaron, sus recuadros. None si el modelo no lo envió.
    Con `segundos` (modo fotogramas) el fotograma es exactamente uno de los enviados."""
    captura = datos.get("captura")
    if not isinstance(captura, dict):
        return None
    k = indice_de(captura.get("fotograma"), len(segundos)) if segundos else None
    try:
        segundo = segundos[k] if k is not None else max(0.0, float(captura.get("segundo") or 0))
    except (TypeError, ValueError):
        segundo = 0.0
    return {"segundo": round(segundo, 2), "animales": leer_animales(captura.get("animales")), "cuadro": k}


PROMPT_FOTOGRAMAS = """Actúa como el motor de visión por computadora de BioCenso especializado en detección y conteo de ganado bovino (vacas, toros, novillos, terneros).
Recibes {n} fotograma(s) de un vuelo de dron sobre un potrero, en orden, cada uno precedido por su etiqueta "Fotograma k (segundo s)". El número k también está escrito en la esquina superior izquierda de cada imagen: úsalo para saber a qué fotograma corresponde lo que marcas, y no marques ese rótulo. El dron avanza: una misma res puede aparecer en varios fotogramas seguidos.
1. Cuenta TODAS las reses distintas del vuelo (de pie, echadas, caminando, agrupadas, parcialmente visibles o en sombra), cada una UNA sola vez aunque aparezca en varios fotogramas: reconócela por su posición respecto al terreno, su color y el avance del dron. "count" es el número total de reses distintas. No marques otros animales (perros, caballos, cabras).
2. En "reses" agrega UN elemento por CADA res contada (exactamente "count" elementos): su "categoria", su "largo_cm" y su "peso_kg" según la guía de abajo, el número del fotograma donde mejor se ve en "fotograma" (el k de su etiqueta) y su recuadro "box_2d" = [ymin, xmin, ymax, xmax] (0 a 1000) sobre ESE fotograma, ajustado a su cuerpo.
3. En "captura" indica el fotograma donde se ven más reses con claridad ("fotograma": su k) y, en "animales", el recuadro, la categoría, el largo y el peso de CADA res visible en él.

Responde ÚNICAMENTE con JSON válido con esta forma (los valores entre <> son lo que debes estimar):
{{
  "count": <número de reses distintas>,
  "reses": [
    {{"categoria": "<vaca|toro|novillo|novilla|ternero>", "largo_cm": <largo de cuerpo medido>, "peso_kg": <peso estimado>, "fotograma": <k>, "box_2d": [<ymin>, <xmin>, <ymax>, <xmax>]}}
  ],
  "captura": {{
    "fotograma": <k>,
    "animales": [
      {{"box_2d": [<ymin>, <xmin>, <ymax>, <xmax>], "categoria": "<vaca|toro|novillo|novilla|ternero>", "largo_cm": <largo>, "peso_kg": <peso estimado>}}
    ]
  }}
}}

""" + REFERENCIA_PESOS.replace("{", "{{").replace("}", "}}")

PROMPT_CAJAS = """Esta es una imagen aérea de un potrero tomada por un dron. Detecta CADA res (bovino: vaca, toro, novillo, ternero) visible, incluidas las que están echadas, en sombra o parcialmente fuera del borde.
No marques otros animales (perros, caballos, cabras, ovejas, aves) ni objetos.
Para cada res da su recuadro "box_2d" = [ymin, xmin, ymax, xmax] ajustado al cuerpo, en coordenadas normalizadas de 0 a 1000 sobre esta misma imagen, su "categoria" (vaca, toro, novillo, novilla o ternero) y su peso individual estimado en kilogramos en "peso_kg".

""" + REFERENCIA_PESOS + """

Responde ÚNICAMENTE con JSON válido con esta forma (los valores entre <> son lo que debes estimar):
{"animales": [{"box_2d": [<ymin>, <xmin>, <ymax>, <xmax>], "categoria": "<vaca|toro|novillo|novilla|ternero>", "largo_cm": <largo de cuerpo medido>, "peso_kg": <peso estimado de esa res>}]}
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
    return {"estado": "ok", "servicio": "ai-service", "clave_configurada": bool(API_KEY),
            "ffmpeg": bool(fotogramas.FFMPEG)}


def agregar_imagenes(cuadros, captura, reses):
    """Agrega la imagen del fotograma de la captura y una miniatura de cada res, recortadas de
    los mismos fotogramas que vio la IA. Si algo falla, el censo sigue sin imágenes."""
    try:
        k = (captura or {}).get("cuadro")
        if captura is not None and isinstance(k, int) and 0 <= k < len(cuadros):
            captura["fotograma"] = fotogramas.a_data_url(cuadros[k])
        fotogramas.miniaturas_de_reses(reses, cuadros)
    except Exception as error:  # las imágenes son un extra: nunca tumban el censo
        print("No se pudieron preparar las imágenes del censo:", type(error).__name__, error, flush=True)
    finally:
        if captura is not None:
            captura.pop("cuadro", None)
        for r in reses:
            r.pop("caja", None)
            r.pop("cuadro", None)


def preparar_cuadros(archivo, mime_type):
    """Fotogramas que se envían a la IA: la imagen tal cual o fotogramas repartidos por el vuelo.
    Devuelve (cuadros PIL, segundos) o ([], []) si no se pudieron sacar (se usa el video entero)."""
    archivo.seek(0)
    if mime_type.startswith("image/"):
        img = fotogramas.imagen_de_archivo(archivo.read())
        return ([img], [0.0]) if img is not None else ([], [])
    ruta = None
    try:
        # ffmpeg necesita una ruta: el video se copia a un temporal que se borra enseguida
        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
            shutil.copyfileobj(archivo, tmp, 1024 * 1024)
            ruta = tmp.name
        muestras = fotogramas.muestrear_video(ruta)
        return [img for _, img in muestras], [seg for seg, _ in muestras]
    except Exception as error:
        print("No se pudieron sacar fotogramas del video:", type(error).__name__, error, flush=True)
        return [], []
    finally:
        if ruta:
            try:
                os.remove(ruta)
            except OSError:
                pass


def partes_de_cuadros(cuadros, segundos):
    """Cada fotograma va precedido de su etiqueta, para que la IA diga en cuál marcó cada res.
    Si el total pasa del límite de una petición, se reducen tamaño y calidad."""
    for lado, calidad in ((1280, 80), (960, 72), (720, 65)):
        partes, total = [], 0
        for k, (img, seg) in enumerate(zip(cuadros, segundos)):
            copia = img.copy()
            copia.thumbnail((lado, lado))
            jpg = fotogramas.a_jpeg(fotogramas.con_numero(copia, k), calidad)
            total += len(jpg)
            partes.append({"text": f"Fotograma {k} (segundo {seg:g}), la imagen que sigue:"})
            partes.append({"inlineData": {"mimeType": "image/jpeg", "data": base64.b64encode(jpg).decode("utf-8")}})
        if total <= LIMITE_EN_LINEA:
            return partes
    return partes


def parte_video_entero(archivo, tamano, mime_type, nombre):
    """Respaldo cuando no se pudieron sacar fotogramas: el video tal cual (en línea o subido)."""
    archivo.seek(0)
    if tamano <= LIMITE_EN_LINEA:
        return {"inlineData": {"mimeType": mime_type, "data": base64.b64encode(archivo.read()).decode("utf-8")}}, None
    subido = subir_archivo(archivo, tamano, mime_type, nombre)
    return {"fileData": {"mimeType": subido.get("mimeType", mime_type), "fileUri": subido["uri"]}}, subido


# Función síncrona a propósito: FastAPI la ejecuta en un hilo aparte, así las esperas
# a Gemini no bloquean otras peticiones.
@app.post("/predict")
def predict(imagen: UploadFile = File(...), calibracion: str = Form(default=""), x_servicio_token: str = Header(default="")):
    if SERVICIO_TOKEN and not hmac.compare_digest(x_servicio_token, SERVICIO_TOKEN):
        raise HTTPException(status_code=401, detail="No autorizado")
    if not API_KEY:
        raise HTTPException(status_code=503, detail="GEMINI_API_KEY no está configurada")
    inicio = time.perf_counter()
    mime_type = imagen.content_type or "video/mp4"
    archivo = imagen.file
    archivo.seek(0, os.SEEK_END)
    tamano = archivo.tell()

    # Lo normal: la IA recibe fotogramas numerados y marca cada res en uno de ellos, así su
    # recuadro corresponde exactamente a una imagen que el servidor tiene (para la captura y
    # las miniaturas). En un video, los recuadros no coinciden bien con el fotograma real.
    cuadros, segundos = preparar_cuadros(archivo, mime_type)
    subido = None
    if cuadros:
        partes = partes_de_cuadros(cuadros, segundos)
        texto = PROMPT_FOTOGRAMAS.format(n=len(cuadros))
    else:
        parte, subido = parte_video_entero(archivo, tamano, mime_type, imagen.filename)
        partes, texto = [parte], PROMPT_CENSO
    payload = {
        "contents": [{"parts": partes + [{"text": texto + texto_calibracion(calibracion)}]}],
        "generationConfig": {"responseMimeType": "application/json", "temperature": 0.1},
    }
    try:
        # Se le da tiempo de sobra a cada intento: cortarlo gasta la petición y hay que repetirla.
        # El backend espera 600 s en total.
        raw_resp, modelo_usado = llamar_gemini(
            json.dumps(payload).encode("utf-8"), presupuesto=560, extras=EXTRAS_CENSO, timeout=270)
    finally:
        if subido:
            borrar_archivo(subido["name"])

    datos = leer_respuesta(raw_resp)
    if isinstance(datos, list):  # a veces el modelo envuelve el objeto en una lista
        datos = next((d for d in datos if isinstance(d, dict)), {})
    if not isinstance(datos, dict):
        raise HTTPException(status_code=502, detail="La IA devolvió una respuesta con un formato inesperado")

    conteo = max(0, int(datos.get("count", datos.get("conteo_maximo", 0)) or 0))
    reses = leer_reses(datos.get("reses"), conteo, segundos or None)
    captura = leer_captura(datos, segundos or None)

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

    agregar_imagenes(cuadros, captura, reses)
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
def detectar(fotograma: UploadFile = File(...), calibracion: str = Form(default=""), x_servicio_token: str = Header(default="")):
    if SERVICIO_TOKEN and not hmac.compare_digest(x_servicio_token, SERVICIO_TOKEN):
        raise HTTPException(status_code=401, detail="No autorizado")
    if not API_KEY:
        raise HTTPException(status_code=503, detail="GEMINI_API_KEY no está configurada")
    contenido = fotograma.file.read()
    payload = {
        "contents": [{"parts": [
            {"inlineData": {"mimeType": fotograma.content_type or "image/jpeg", "data": base64.b64encode(contenido).decode("utf-8")}},
            {"text": PROMPT_CAJAS + texto_calibracion(calibracion)},
        ]}],
        "generationConfig": {"responseMimeType": "application/json", "temperature": 0.1},
    }
    # Medir cada res puede pasar de un minuto: cortar antes desperdicia la petición y obliga a
    # repetirla. El backend espera 240 s; se deja margen para que la respuesta llegue antes.
    raw_resp, modelo_usado = llamar_gemini(
        json.dumps(payload).encode("utf-8"), presupuesto=230, extras=EXTRAS_CAPTURA, timeout=120)
    datos = leer_respuesta(raw_resp)
    lista = datos.get("animales") if isinstance(datos, dict) else datos
    return {"animales": leer_animales(lista), "modelo_gemini": modelo_usado}
