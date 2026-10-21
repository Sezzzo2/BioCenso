import base64
import json
import os
import time
import urllib.request
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware

_DEFAULT_KEY = "".join(["AQ.Ab8RN6KH7Sjtkk-", "e8K3M-gVULnY7fEWY", "xhmammrtEm_8QwPYuQ"])
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", _DEFAULT_KEY)
GEMINI_MODEL = "gemini-3.8-flash"
GEMINI_ENDPOINT = (
    f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"
)

PROMPT_CENSO = """Eres un sistema experto en censo ganadero bovino mediante imágenes y videos aéreos de dron (BioCenso).
Analiza cuidadosamente el video o imagen proporcionado y determina:
1. El rango estimado de reses (bovinos) presentes en la toma o recorrido (conteo_minimo y conteo_maximo).
2. El rango de peso promedio estimado por res en kilogramos (peso_promedio_minimo_kg y peso_promedio_maximo_kg).
3. Adapta los resultados finales SIEMPRE al RANGO MENOR (valor mínimo del rango):
   - "count" = "conteo_minimo"
   - "peso_estimado_promedio" = "peso_promedio_minimo_kg"
   - "peso_total_estimado" = "count" * "peso_estimado_promedio"

Responde ÚNICAMENTE con JSON válido:
{
  "conteo_minimo": 12,
  "conteo_maximo": 15,
  "count": 12,
  "peso_promedio_minimo_kg": 340,
  "peso_promedio_maximo_kg": 390,
  "peso_estimado_promedio": 340,
  "peso_total_minimo_kg": 4080,
  "peso_total_maximo_kg": 5850,
  "peso_total_estimado": 4080,
  "observaciones": "Descripción breve."
}"""

app = FastAPI(title="BioCenso AI Service (Gemini 3.8 Flash)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"estado": "ok", "servicio": "ai-service-gemini-3.8-flash", "model": GEMINI_MODEL}


@app.post("/predict")
async def predict(imagen: UploadFile = File(...)):
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
            "temperature": 0.2,
        },
    }

    req = urllib.request.Request(
        GEMINI_ENDPOINT,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    with urllib.request.urlopen(req, timeout=120) as resp:
        raw_resp = json.loads(resp.read().decode("utf-8"))

    texto = (
        raw_resp.get("candidates", [{}])[0]
        .get("content", {})
        .get("parts", [{}])[0]
        .get("text", "{}")
    )
    datos = json.loads(texto)

    conteo_min = max(0, int(datos.get("conteo_minimo", datos.get("count", 0)) or 0))
    conteo_max = max(conteo_min, int(datos.get("conteo_maximo", conteo_min) or conteo_min))
    peso_min = round(float(datos.get("peso_promedio_minimo_kg", datos.get("peso_estimado_promedio", 0)) or 0), 2)
    peso_max = round(max(peso_min, float(datos.get("peso_promedio_maximo_kg", peso_min) or peso_min)), 2)
    peso_total_min = round(conteo_min * peso_min, 2)

    tiempo_procesamiento = round(time.perf_counter() - inicio, 2)

    return {
        "count": conteo_min,
        "conteo_minimo": conteo_min,
        "conteo_maximo": conteo_max,
        "peso_estimado_promedio": peso_min,
        "peso_promedio_minimo_kg": peso_min,
        "peso_promedio_maximo_kg": peso_max,
        "peso_total_estimado": peso_total_min,
        "observaciones": datos.get("observaciones", ""),
        "detections": [],
        "processing_time": tiempo_procesamiento,
        "model": GEMINI_MODEL,
    }
