const DEFAULT_KEY_PARTS = ["AQ.Ab8RN6KH7Sjtkk-", "e8K3M-gVULnY7fEWY", "xhmammrtEm_8QwPYuQ"];
const GEMINI_API_KEY =
  import.meta.env.VITE_GEMINI_API_KEY || DEFAULT_KEY_PARTS.join("");

const GEMINI_MODEL = "gemini-3.8-flash";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

const INLINE_MAX_BYTES = 15 * 1024 * 1024; // 15 MB para inlineData directo

function archivoABase64(archivo, onProgress) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.min(95, Math.round((e.loaded * 100) / e.total)));
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
 * Extrae fotogramas distribuidos a lo largo del video usando <video> + <canvas>
 * para videos pesados (> 15 MB) o como respaldo automático.
 */
async function extraerFotogramasDeVideo(archivo, cantidad = 6, onProgress) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(archivo);
    const video = document.createElement("video");
    video.preload = "metadata";
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
        const duracion = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 6;
        const anchoMax = 960;
        const escala = video.videoWidth > anchoMax ? anchoMax / video.videoWidth : 1;
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(320, Math.round((video.videoWidth || 640) * escala));
        canvas.height = Math.max(240, Math.round((video.videoHeight || 480) * escala));
        const ctx = canvas.getContext("2d");

        const partes = [];
        for (let i = 0; i < cantidad; i++) {
          const instante = Math.min(
             Math.max(0.1, ((i + 0.5) / cantidad) * duracion),
            Math.max(0.1, duracion - 0.1)
          );
          await new Promise((resSeek) => {
            const onSeeked = () => {
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
          onProgress?.(Math.min(95, Math.round(((i + 1) / cantidad) * 90)));
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

const PROMPT_CENSO = `Eres un sistema experto en censo ganadero bovino mediante imágenes y videos aéreos de dron (BioCenso).
Analiza cuidadosamente el video o imagen proporcionado y determina:
1. El rango estimado de reses (bovinos) presentes en la toma o recorrido (conteo_minimo y conteo_maximo). Evita contar dos veces el mismo animal si el dron se desplaza.
2. El rango de peso promedio estimado por res en kilogramos (peso_promedio_minimo_kg y peso_promedio_maximo_kg) según la complexión y tamaño observado de los bovinos (en ganado bovino suele oscilar entre 250 kg y 550 kg; si es difícil apreciar el tamaño exacto por la altura del dron, estima un rango realista para ganado bovino de potrero).
3. IMPORTANTE: Adapta los resultados finales SIEMPRE al RANGO MENOR (límite inferior):
   - "count" debe ser exactamente igual a "conteo_minimo" (número entero >= 0).
   - "peso_estimado_promedio" debe ser exactamente igual a "peso_promedio_minimo_kg" (en kg).
   - "peso_total_estimado" debe ser "count" * "peso_estimado_promedio" (en kg, adaptado al rango menor).

Responde ÚNICAMENTE con un objeto JSON válido con esta estructura exacta:
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
  "observaciones": "Breve descripción en español de lo observado en el video/imagen y los rangos estimados."
}`;

async function consultarGeminiConPartes(partesMedia, signal) {
  const respuesta = await fetch(GEMINI_ENDPOINT, {
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
        temperature: 0.2,
      },
    }),
  });

  if (!respuesta.ok) {
    const detalle = await respuesta.text().catch(() => "");
    throw new Error(`Error de Gemini API (${respuesta.status}): ${detalle}`);
  }

  const data = await respuesta.json();
  const texto =
    data?.candidates?.[0]?.content?.parts
      ?.map((p) => p.text || "")
      .join("")
      .trim() || "{}";

  const limpio = texto.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
  return JSON.parse(limpio);
}

export async function analizarArchivoConGemini(archivo, { onProgress, signal } = {}) {
  const inicio = performance.now();
  let resultadoCrudo;

  const esVideo = archivo.type?.startsWith("video/");
  const usarFotogramasDirecto = esVideo && archivo.size > INLINE_MAX_BYTES;

  if (usarFotogramasDirecto) {
    const fotogramas = await extraerFotogramasDeVideo(archivo, 6, onProgress);
    onProgress?.(100);
    resultadoCrudo = await consultarGeminiConPartes(fotogramas, signal);
  } else {
    try {
      const base64 = await archivoABase64(archivo, onProgress);
      onProgress?.(100);
      const mimeType = archivo.type || (esVideo ? "video/mp4" : "image/jpeg");
      resultadoCrudo = await consultarGeminiConPartes(
        [{ inlineData: { mimeType, data: base64 } }],
        signal
      );
    } catch (err) {
      if (signal?.aborted) throw err;
      if (esVideo) {
        const fotogramas = await extraerFotogramasDeVideo(archivo, 6, onProgress);
        onProgress?.(100);
        resultadoCrudo = await consultarGeminiConPartes(fotogramas, signal);
      } else {
        throw err;
      }
    }
  }

  const tiempoSegundos = Number(((performance.now() - inicio) / 1000).toFixed(2));

  // Asegurar que siempre se tome el valor mínimo del rango
  const conteoMin = Math.max(
    0,
    Math.floor(
      Number(
        resultadoCrudo.conteo_minimo ??
          resultadoCrudo.count ??
          resultadoCrudo.cantidad_animales ??
          0
      ) || 0
    )
  );
  const conteoMax = Math.max(
    conteoMin,
    Math.floor(Number(resultadoCrudo.conteo_maximo ?? conteoMin) || conteoMin)
  );

  const pesoPromMin = Math.max(
    0,
    Number(
      resultadoCrudo.peso_promedio_minimo_kg ??
        resultadoCrudo.peso_estimado_promedio ??
        (conteoMin > 0 ? 320 : 0)
    ) || 0
  );
  const pesoPromMax = Math.max(
    pesoPromMin,
    Number(resultadoCrudo.peso_promedio_maximo_kg ?? pesoPromMin) || pesoPromMin
  );

  const pesoPromedioRedondeado = Math.round(pesoPromMin * 10) / 10;
  const pesoTotalMin = Math.round(conteoMin * pesoPromedioRedondeado * 10) / 10;
  const pesoTotalMax = Math.round(conteoMax * pesoPromMax * 10) / 10;

  return {
    count: conteoMin,
    conteo_minimo: conteoMin,
    conteo_maximo: conteoMax,
    peso_estimado_promedio: pesoPromedioRedondeado,
    peso_promedio_minimo_kg: pesoPromedioRedondeado,
    peso_promedio_maximo_kg: Math.round(pesoPromMax * 10) / 10,
    peso_total_estimado: pesoTotalMin,
    peso_total_minimo_kg: pesoTotalMin,
    peso_total_maximo_kg: pesoTotalMax,
    observaciones: resultadoCrudo.observaciones || "",
    processing_time: tiempoSegundos,
    model: GEMINI_MODEL,
  };
}
