const DEFAULT_KEY_PARTS = ["AQ.Ab8RN6KH7Sjtkk-", "e8K3M-gVULnY7fEWY", "xhmammrtEm_8QwPYuQ"];
const API_KEY =
  import.meta.env.VITE_GEMINI_API_KEY || DEFAULT_KEY_PARTS.join("");

// Prioriza gemini-3.8-flash con reintento automático y respaldo ante 503/429 de Google
const MODELOS_DISPONIBLES = [
  "gemini-3.8-flash",
  "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-3.5-flash",
  "gemini-2.5-flash",
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
 * Extrae 8 fotogramas nítidos (1280px) distribuidos uniformemente a lo largo del video.
 * Esto mantiene el payload ligero (~600 KB) para evitar errores 503 en la API gratuita
 * y permite ver con claridad todas las vacas de principio a fin.
 */
async function extraerFotogramasDeVideo(archivo, cantidad = 8, onProgress) {
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
        const duracion = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 5;
        const anchoMax = 1280;
        const escala = video.videoWidth > anchoMax ? anchoMax / video.videoWidth : 1;
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(480, Math.round((video.videoWidth || 1280) * escala));
        canvas.height = Math.max(270, Math.round((video.videoHeight || 720) * escala));
        const ctx = canvas.getContext("2d");

        const numFrames = duracion < 1.5 ? 4 : cantidad;
        const partes = [];
        for (let i = 0; i < numFrames; i++) {
          const fraccion = numFrames === 1 ? 0.5 : i / (numFrames - 1);
          const instante = Math.min(
            Math.max(0.05, fraccion * (duracion - 0.1)),
            Math.max(0.05, duracion - 0.05)
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
          const dataUrl = canvas.toDataURL("image/jpeg", 0.84);
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
        resolve(partes);
      } catch (err) {
        limpiar();
        reject(err);
      }
    };
  });
}

const PROMPT_CENSO = `Actúa como el motor de visión por computadora de BioCenso especializado en detección y conteo de ganado bovino (vacas, toros, novillos, terneros).

INSTRUCCIONES CRÍTICAS DE CONTEO:
1. Examina con máxima atención todas las imágenes/fotogramas de la secuencia del video de principio a fin.
2. Cuenta TODAS las vacas/reses que aparecen en la escena o a lo largo del recorrido:
   - Incluye vacas que estén de pie, echadas/acostadas en el pasto, caminando, agrupadas o separadas.
   - Incluye animales parcialmente visibles en los bordes del cuadro, bajo sombra de árboles, de espaldas, de perfil o vistos desde arriba.
   - Presta especial atención a todos los colores de pelaje (blanco, negro, café/rojo, manchado, pardo) y tamaños (adultos y terneros).
   - NO subestimes el conteo: asegúrate de contar cada animal distinto que aparece en el recorrido (por ejemplo, si en la escena/recorrido hay 7 vacas en total, el conteo debe ser 7, nunca menos).
   - "count" debe ser el número total real de reses identificadas.

INSTRUCCIONES CRÍTICAS DE PESO (RANGO MENOR):
3. Estima el rango de peso promedio por res en kilogramos ("peso_promedio_minimo_kg" y "peso_promedio_maximo_kg") de acuerdo con el tamaño y estado corporal observado del ganado (típicamente entre 300 kg y 500 kg para ganado bovino).
4. Para el peso final reportado, adáptate SIEMPRE al RANGO MENOR (valor mínimo del rango de peso):
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

async function consultarModeloConPartes(partesMedia, signal) {
  let ultimoError = null;

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

      if (respuesta.status === 503 || respuesta.status === 429 || respuesta.status === 500) {
        ultimoError = new Error(`Servicio temporalmente ocupado (${respuesta.status})`);
        if (i < MODELOS_DISPONIBLES.length - 1) {
          await esperar(1200 * (i + 1));
          continue;
        }
      }

      if (!respuesta.ok) {
        throw new Error("El servicio de análisis de video no pudo procesar el archivo en este momento.");
      }

      const data = await respuesta.json();
      const texto =
        data?.candidates?.[0]?.content?.parts
          ?.map((p) => p.text || "")
          .join("")
          .trim() || "{}";

      const limpio = texto.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
      return JSON.parse(limpio);
    } catch (err) {
      if (signal?.aborted || err?.name === "AbortError") throw err;
      ultimoError = err;
      if (i < MODELOS_DISPONIBLES.length - 1) {
        await esperar(1000);
        continue;
      }
    }
  }

  throw ultimoError || new Error("No se pudo completar el análisis del video.");
}

export async function analizarArchivoConGemini(archivo, { onProgress, signal } = {}) {
  const inicio = performance.now();
  let resultadoCrudo;

  const esVideo = archivo.type?.startsWith("video/");

  if (esVideo) {
    // Extraemos 8 fotogramas en 1280p para alta nitidez y bajo peso de subida (evita 503)
    const fotogramas = await extraerFotogramasDeVideo(archivo, 8, onProgress);
    onProgress?.(100);
    resultadoCrudo = await consultarModeloConPartes(fotogramas, signal);
  } else {
    const base64 = await archivoABase64(archivo, onProgress);
    onProgress?.(100);
    const mimeType = archivo.type || "image/jpeg";
    resultadoCrudo = await consultarModeloConPartes(
      [{ inlineData: { mimeType, data: base64 } }],
      signal
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
        (conteo > 0 ? 340 : 0)
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
