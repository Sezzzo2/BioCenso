import base64
import hmac
import json
import os
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
# Mismos modelos que usaba el frontend: si uno está saturado (503) o sin cuota (429),
# se prueba el siguiente. GEMINI_MODEL, si se define, se intenta primero.
MODELOS = [
    "gemini-3-flash-preview",
    "gemini-3.5-flash-lite",
    "gemini-flash-lite-latest",
    "gemini-3.1-flash-lite-preview",
    "gemini-3.8-flash",
    "gemini-flash-latest",
]
if os.getenv("GEMINI_MODEL"):
    MODELOS.insert(0, os.environ["GEMINI_MODEL"])
REINTENTABLES = {404, 429, 500, 503}
BASE_API = "https://generativelanguage.googleapis.com"


def url_modelo(modelo):
    return f"{BASE_API}/v1beta/models/{modelo}:generateContent?key={API_KEY}"


# Tiempo por modelo y tope total para generar la respuesta (sin contar la subida del video)
TIMEOUT_MODELO = float(os.getenv("GEMINI_TIMEOUT_MODELO", "60"))
TIMEOUT_TOTAL = float(os.getenv("GEMINI_TIMEOUT_TOTAL", "150"))


def llamar_gemini(cuerpo):
    limite = time.monotonic() + TIMEOUT_TOTAL
    fallos = []
    for modelo in dict.fromkeys(MODELOS):
        restante = limite - time.monotonic()
        if restante < 5:
            break
        req = urllib.request.Request(
            url_modelo(modelo), data=cuerpo,
            headers={"Content-Type": "application/json"}, method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=min(TIMEOUT_MODELO, restante)) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as error:
            if error.code not in REINTENTABLES:
                raise HTTPException(status_code=502, detail=f"Gemini rechazó la solicitud ({error.code})")
            fallos.append(f"{modelo}: {error.code}")
        except (TimeoutError, urllib.error.URLError) as error:
            fallos.append(f"{modelo}: {type(error).__name__}")
        print("Gemini no respondió, probando el siguiente modelo:", fallos[-1], flush=True)
        time.sleep(0.3)
    raise HTTPException(status_code=503, detail="Ningún modelo de Gemini respondió: " + "; ".join(fallos))


PROMPT_CENSO = """Actúa como el motor de visión por computadora de BioCenso especializado en detección y conteo de ganado bovino (vacas, toros, novillos, terneros).
1. Examina con máxima atención todo el video o imagen de principio a fin y cuenta TODAS las vacas/reses que aparecen en la escena o recorrido (de pie, echadas, caminando, agrupadas, parcialmente visibles o en sombra). NO subestimes el conteo: "count" debe ser el número total real de reses identificadas.
2. Estima el rango de peso promedio por res en kilogramos ("peso_promedio_minimo_kg" y "peso_promedio_maximo_kg") y toma SIEMPRE el valor mínimo del rango de peso como "peso_estimado_promedio".
3. Calcula "peso_total_estimado" = "count" * "peso_estimado_promedio".
4. Elige el fotograma donde se vean más reses con claridad. En "captura.segundo" indica su segundo exacto dentro del video (usa 0 si es una imagen). Para CADA res visible en ese fotograma agrega un elemento a "captura.animales" con su recuadro "box_2d" = [ymin, xmin, ymax, xmax] en coordenadas normalizadas de 0 a 1000 sobre ese fotograma, y su peso individual estimado en kilogramos en "peso_kg".

Responde ÚNICAMENTE con JSON válido:
{
  "count": 7,
  "peso_promedio_minimo_kg": 350,
  "peso_promedio_maximo_kg": 410,
  "peso_estimado_promedio": 350,
  "peso_total_estimado": 2450,
  "captura": {
    "segundo": 12.5,
    "animales": [
      {"box_2d": [412, 230, 470, 290], "peso_kg": 360}
    ]
  }
}"""

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


def leer_captura(datos):
    """Normaliza el fotograma con sus recuadros; devuelve None si el modelo no lo envió bien."""
    captura = datos.get("captura")
    if not isinstance(captura, dict):
        return None
    animales = []
    for a in (captura.get("animales") or [])[:300]:
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
            animales.append({"caja": [ymin, xmin, ymax, xmax], "peso_kg": peso})
    if not animales:
        return None
    try:
        segundo = max(0.0, float(captura.get("segundo") or 0))
    except (TypeError, ValueError):
        segundo = 0.0
    return {"segundo": round(segundo, 2), "animales": animales}


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
        raw_resp = llamar_gemini(json.dumps(payload).encode("utf-8"))
    finally:
        if subido:
            borrar_archivo(subido["name"])

    texto = (
        raw_resp.get("candidates", [{}])[0]
        .get("content", {})
        .get("parts", [{}])[0]
        .get("text", "{}")
    )
    datos = json.loads(texto)

    conteo = max(0, int(datos.get("count", datos.get("conteo_maximo", 0)) or 0))
    peso_min = round(float(datos.get("peso_promedio_minimo_kg", datos.get("peso_estimado_promedio", 0)) or 0), 2)
    peso_max = round(max(peso_min, float(datos.get("peso_promedio_maximo_kg", peso_min) or peso_min)), 2)
    peso_total_min = round(conteo * peso_min, 2)

    tiempo_procesamiento = round(time.perf_counter() - inicio, 2)

    return {
        "count": conteo,
        "peso_estimado_promedio": peso_min,
        "peso_promedio_minimo_kg": peso_min,
        "peso_promedio_maximo_kg": peso_max,
        "peso_total_estimado": peso_total_min,
        "observaciones": datos.get("observaciones", ""),
        "captura": leer_captura(datos),
        "detections": [],
        "processing_time": tiempo_procesamiento,
        "model": "YOLOv26s",
    }
