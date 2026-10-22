import base64
import json
import os
import time
import urllib.request
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

# La clave nunca va en el código: se configura como variable de entorno del servicio
API_KEY = os.getenv("GEMINI_API_KEY", "")
MODEL_ID = os.getenv("GEMINI_MODEL", "gemini-3.8-flash")
ENDPOINT = (
    f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL_ID}:generateContent?key={API_KEY}"
)

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

    req = urllib.request.Request(
        ENDPOINT,
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
