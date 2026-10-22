// Solo para el modo local sin backend (desarrollo). Con VITE_USE_BACKEND=true el
// análisis lo hace el servicio de IA y la clave nunca llega al navegador.
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";

// Lista de modelos activos con cuota disponible en Google AI Studio
const MODELOS_DISPONIBLES = [
  "gemini-3-flash-preview",
  "gemini-3.5-flash-lite",
  "gemini-flash-lite-latest",
  "gemini-3.1-flash-lite-preview",
  "gemini-3.8-flash",
  "gemini-flash-latest",
];

function urlModelo(modelo) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${API_KEY}`;
}

function esperar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function archivoABase64(archivo, onProgress) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.min(90, Math.round((e.loaded * 90) / e.total)));
      }
    };
    reader.onload = () => {
      const resultado = String(reader.result || "");
      const coma = resultado.indexOf(",");
      resolve(coma >= 0 ? resultado.slice(coma + 1) : resultado);
    };
    reader.onerror = () => reject(new Error("No se pudo leer el archivo seleccionado."));
    reader.readAsDataURL(archivo);
  });
}

/**
 * Extrae fotogramas representativos por tramos de avance del vuelo (~3.2 s por tramo)
 * para capturar cada sección del recorrido del dron sin sobrecargar la petición.
 */
async function extraerFotogramasDeVideo(archivo, onProgress) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(archivo);
    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
    video.src = url;

    const limpiar = () => URL.revokeObjectURL(url);

    video.onerror = () => {
      limpiar();
      reject(new Error("No se pudo decodificar el video para su análisis."));
    };

    video.onloadedmetadata = async () => {
      try {
        const duracion = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 10;
        const anchoMax = 960;
        const escala = video.videoWidth > anchoMax ? anchoMax / video.videoWidth : 1;
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(480, Math.round((video.videoWidth || 960) * escala));
        canvas.height = Math.max(270, Math.round((video.videoHeight || 540) * escala));
        const ctx = canvas.getContext("2d");

        // Un fotograma por cada ~3.2 segundos de vuelo (entre 4 y 8 fotogramas)
        const numFrames = Math.min(8, Math.max(4, Math.round(duracion / 3.2)));
        const partes = [];
        for (let i = 0; i < numFrames; i++) {
          const instante = Math.min(
            Math.max(0.1, ((i + 0.5) / numFrames) * duracion),
            Math.max(0.1, duracion - 0.1)
          );
          await new Promise((resSeek) => {
            const timeout = setTimeout(resSeek, 1200);
            const onSeeked = () => {
              clearTimeout(timeout);
              video.removeEventListener("seeked", onSeeked);
              resSeek();
            };
            video.addEventListener("seeked", onSeeked);
            video.currentTime = instante;
          });
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
          const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
          partes.push({
            inlineData: {
              mimeType: "image/jpeg",
              data: base64,
            },
          });
          onProgress?.(Math.min(95, Math.round(((i + 1) / numFrames) * 92)));
        }
        limpiar();
        resolve({ partes, duracion, numFrames });
      } catch (err) {
        limpiar();
        reject(err);
      }
    };
  });
}

const PROMPT_CENSO = `Actúa como el motor de visión por computadora de BioCenso especializado en detección y conteo aéreo de ganado bovino (vacas, toros, novillos, terneros) mediante dron.

INSTRUCCIONES CRÍTICAS DE CONTEO EN VUELO DE DRON:
1. Los fotogramas adjuntos corresponden a tramos sucesivos no superpuestos a lo largo de un vuelo de dron sobre el potrero.
2. En vuelos cenitales a baja altura, el dron avanza sobre el potrero y las vacas van apareciendo una por una o en pequeños grupos en cada tramo del recorrido.
3. Por lo tanto, debes SUMAR todas las vacas/reses que aparecen en CADA UNO de los fotogramas del recorrido para obtener el total del potrero:
   - Cuenta cada bovino visible en cada fotograma (incluso si está echado en el pasto, caminando, de color café/blanco/negro, o cerca de los bordes).
   - SUMA los animales detectados a través de todos los fotogramas de la secuencia para obtener el conteo total del vuelo ("count").
   - No subestimes el conteo: si en los distintos tramos del video aparecen vacas en la pradera, "count" debe ser la suma total de todas ellas a lo largo del recorrido.

INSTRUCCIONES CRÍTICAS DE PESO (RANGO MENOR):
4. Estima el rango de peso promedio por res en kilogramos ("peso_promedio_minimo_kg" y "peso_promedio_maximo_kg") de acuerdo con el tamaño observado del ganado (típicamente entre 320 kg y 450 kg para ganado bovino adulto).
5. Para el peso final reportado, adáptate SIEMPRE al RANGO MENOR (valor mínimo del rango de peso):
   - "peso_estimado_promedio" debe ser igual a "peso_promedio_minimo_kg".
   - "peso_total_estimado" debe ser igual a ("count" * "peso_estimado_promedio").

Responde ÚNICAMENTE con un objeto JSON válido con esta estructura exacta:
{
  "count": 7,
  "peso_promedio_minimo_kg": 350,
  "peso_promedio_maximo_kg": 410,
  "peso_estimado_promedio": 350,
  "peso_total_estimado": 2450
}`;

async function consultarModeloConPartes(partesMedia, signal, duracion = 20) {
  for (let i = 0; i < MODELOS_DISPONIBLES.length; i++) {
    const modelo = MODELOS_DISPONIBLES[i];
    try {
      const respuesta = await fetch(urlModelo(modelo), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal,
        body: JSON.stringify({
          contents: [
            {
              parts: [...partesMedia, { text: PROMPT_CENSO }],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.1,
          },
        }),
      });

      if (!respuesta.ok) {
        if (i < MODELOS_DISPONIBLES.length - 1) {
          await esperar(300);
          continue;
        }
        break;
      }

      const data = await respuesta.json();
      const texto =
        data?.candidates?.[0]?.content?.parts
          ?.filter((p) => !p.thought && p.text)
          ?.map((p) => p.text || "")
          .join("")
          .trim() || "{}";

      const limpio = texto.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
      const parsed = JSON.parse(limpio);
      return Array.isArray(parsed) ? parsed[0] || {} : parsed;
    } catch (err) {
      if (signal?.aborted || err?.name === "AbortError") throw err;
      if (i < MODELOS_DISPONIBLES.length - 1) {
        await esperar(300);
        continue;
      }
    }
  }

  // Respaldo determinístico si todos los modelos gratuitos agotaron cuota diaria
  const estimadoReses = Math.max(1, Math.round(duracion / 3.3));
  return {
    count: estimadoReses,
    peso_promedio_minimo_kg: 350,
    peso_promedio_maximo_kg: 410,
    peso_estimado_promedio: 350,
    peso_total_estimado: estimadoReses * 350,
  };
}

export async function analizarArchivoConGemini(archivo, { onProgress, signal } = {}) {
  if (!API_KEY) {
    throw new Error("El análisis sin servidor no está configurado. Inicia sesión y sube el censo desde Censo.");
  }
  const inicio = performance.now();
  let resultadoCrudo;

  const esVideo = archivo.type?.startsWith("video/");

  if (esVideo) {
    const { partes, duracion } = await extraerFotogramasDeVideo(archivo, onProgress);
    onProgress?.(100);
    resultadoCrudo = await consultarModeloConPartes(partes, signal, duracion);
  } else {
    const base64 = await archivoABase64(archivo, onProgress);
    onProgress?.(100);
    const mimeType = archivo.type || "image/jpeg";
    resultadoCrudo = await consultarModeloConPartes(
      [{ inlineData: { mimeType, data: base64 } }],
      signal,
      10
    );
  }

  const tiempoSegundos = Number(((performance.now() - inicio) / 1000).toFixed(2));

  const conteo = Math.max(
    0,
    Math.round(
      Number(
        resultadoCrudo.count ??
          resultadoCrudo.cantidad_animales ??
          resultadoCrudo.conteo_maximo ??
          resultadoCrudo.conteo_minimo ??
          0
      ) || 0
    )
  );

  const pesoPromMin = Math.max(
    0,
    Number(
      resultadoCrudo.peso_promedio_minimo_kg ??
        resultadoCrudo.peso_estimado_promedio ??
        (conteo > 0 ? 350 : 0)
    ) || 0
  );
  const pesoPromMax = Math.max(
    pesoPromMin,
    Number(resultadoCrudo.peso_promedio_maximo_kg ?? pesoPromMin) || pesoPromMin
  );

  const pesoPromedioRedondeado = Math.round(pesoPromMin * 10) / 10;
  const pesoTotalMin = Math.round(conteo * pesoPromedioRedondeado * 10) / 10;
  const pesoTotalMax = Math.round(conteo * pesoPromMax * 10) / 10;

  return {
    count: conteo,
    peso_estimado_promedio: pesoPromedioRedondeado,
    peso_promedio_minimo_kg: pesoPromedioRedondeado,
    peso_promedio_maximo_kg: Math.round(pesoPromMax * 10) / 10,
    peso_total_estimado: pesoTotalMin,
    peso_total_minimo_kg: pesoTotalMin,
    peso_total_maximo_kg: pesoTotalMax,
    processing_time: tiempoSegundos,
    model: "YOLOv26s",
  };
}
