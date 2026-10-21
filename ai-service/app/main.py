import random
import time
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="BioCenso AI Service (Mock)")

# El único cliente esperado es el backend de Node, no un navegador directo
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"estado": "ok", "servicio": "ai-service-mock"}


@app.post("/predict")
async def predict(imagen: UploadFile = File(...)):
    inicio = time.perf_counter()

    # --- MOCK ---
    # No se ejecuta ningún modelo real todavía (YOLOv26s no está entrenado).
    # Se simula una detección plausible para poder desarrollar y probar
    # el resto del sistema (punto 14 y 19 del documento del proyecto).
    await imagen.read()  # se lee el archivo para simular el costo real de procesarlo

    cantidad_detectada = random.randint(5, 60)
    peso_promedio_estimado = round(random.uniform(280, 420), 2)

    detecciones = [
        {
            "clase": "bovino",
            "confianza": round(random.uniform(0.75, 0.99), 2),
            "bounding_box": {
                "x": random.randint(0, 800),
                "y": random.randint(0, 600),
                "ancho": random.randint(40, 120),
                "alto": random.randint(40, 120),
            },
        }
        for _ in range(cantidad_detectada)
    ]

    tiempo_procesamiento = round(time.perf_counter() - inicio, 2)

    return {
        "count": cantidad_detectada,
        "peso_estimado_promedio": peso_promedio_estimado,
        "detections": detecciones,
        "processing_time": tiempo_procesamiento,
        "model": "YOLOv26s-mock",
    }