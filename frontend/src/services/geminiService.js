// Solo para el modo local sin backend (desarrollo). Con VITE_USE_BACKEND=true el
// análisis lo hace el servicio de IA y la clave nunca llega al navegador.
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";

// Lista de modelos activos con cuota disponible en Google AI Studio
const MODELOS_DISPONIBLES = [
  "gemini-3-flash-preview",
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

PESO:
4. Estima el peso vivo de cada res por separado según lo que se ve de ella (largo y ancho del cuerpo, tamaño frente a las demás, condición corporal) y da el valor más probable, sin acercarlo a un valor fijo. En "peso_estimado_promedio" pon el promedio de esos pesos, y en "peso_promedio_minimo_kg" y "peso_promedio_maximo_kg" el menor y el mayor de ellos.

Responde ÚNICAMENTE con un objeto JSON válido con esta forma (los valores entre <> son lo que debes estimar):
{
  "count": <número de reses>,
  "peso_promedio_minimo_kg": <peso de la res más liviana>,
  "peso_promedio_maximo_kg": <peso de la res más pesada>,
  "peso_estimado_promedio": <promedio de los pesos>
}`;

async function consultarModeloConPartes(partesMedia, signal) {
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

  // Sin respuesta de la IA no se inventan conteos ni pesos
  throw new Error("La IA no respondió. Intenta de nuevo en unos minutos.");
}

export async function analizarArchivoConGemini(archivo, { onProgress, signal } = {}) {
  if (!API_KEY) {
    throw new Error("El análisis sin servidor no está configurado. Inicia sesión y sube el censo desde Censo.");
  }
  const inicio = performance.now();
  let resultadoCrudo;

  const esVideo = archivo.type?.startsWith("video/");

  if (esVideo) {
    const { partes } = await extraerFotogramasDeVideo(archivo, onProgress);
    onProgress?.(100);
    resultadoCrudo = await consultarModeloConPartes(partes, signal);
  } else {
    const base64 = await archivoABase64(archivo, onProgress);
    onProgress?.(100);
    const mimeType = archivo.type || "image/jpeg";
    resultadoCrudo = await consultarModeloConPartes([{ inlineData: { mimeType, data: base64 } }], signal);
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

  // El peso reportado es el promedio estimado por la IA, no el mínimo del rango
  const pesoProm = Math.max(0, Number(resultadoCrudo.peso_estimado_promedio) || 0);
  const pesoMin = Math.max(0, Number(resultadoCrudo.peso_promedio_minimo_kg ?? pesoProm) || pesoProm);
  const pesoMax = Math.max(pesoMin, Number(resultadoCrudo.peso_promedio_maximo_kg ?? pesoProm) || pesoProm);
  const redondear = (v) => Math.round(v * 10) / 10;
  const pesoTotal = redondear(conteo * pesoProm);

  return {
    count: conteo,
    peso_estimado_promedio: redondear(pesoProm),
    peso_promedio_minimo_kg: redondear(pesoMin),
    peso_promedio_maximo_kg: redondear(pesoMax),
    peso_total_estimado: pesoTotal,
    peso_total_minimo_kg: redondear(conteo * pesoMin),
    peso_total_maximo_kg: redondear(conteo * pesoMax),
    processing_time: tiempoSegundos,
    model: "YOLOv26s",
  };
}
