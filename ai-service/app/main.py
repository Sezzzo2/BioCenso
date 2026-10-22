import base64
import json
import os
import time
import urllib.error
import urllib.request
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

# La clave nunca va en el código: se configura como variable de entorno del servicio
API_KEY = os.getenv("GEMINI_API_KEY", "")
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


def url_modelo(modelo):
    return f"https://generativelanguage.googleapis.com/v1beta/models/{modelo}:generateContent?key={API_KEY}"


# Tiempo por modelo y tope total: el backend espera 170 s y el navegador 180 s
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

Responde ÚNICAMENTE con JSON válido:
{
  "count": 7,
  "peso_promedio_minimo_kg": 350,
  "peso_promedio_maximo_kg": 410,
  "peso_estimado_promedio": 350,
  "peso_total_estimado": 2450
}"""

app = FastAPI(title="BioCenso AI Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"estado": "ok", "servicio": "ai-service", "clave_configurada": bool(API_KEY)}


@app.post("/predict")
async def predict(imagen: UploadFile = File(...)):
    if not API_KEY:
        raise HTTPException(status_code=503, detail="GEMINI_API_KEY no está configurada")
    inicio = time.perf_counter()
    contenido = await imagen.read()
    b64 = base64.b64encode(contenido).decode("utf-8")
    mime_type = imagen.content_type or "video/mp4"

    payload = {
        "contents": [
            {
                "parts": [
                    {"inlineData": {"mimeType": mime_type, "data": b64}},
                    {"text": PROMPT_CENSO},
                ]
            }
        ],
        "generationConfig": {
            "responseMimeType": "application/json",
            "temperature": 0.1,
        },
    }

    raw_resp = llamar_gemini(json.dumps(payload).encode("utf-8"))

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
        "detections": [],
        "processing_time": tiempo_procesamiento,
        "model": "YOLOv26s",
    }
