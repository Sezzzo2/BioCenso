import { useEffect, useRef, useState } from "react";
import { detectarCaptura } from "../../services/censoService.js";

const VERDE = "#86e05b";
const TINTA = "#10230c";
const LADO_MAXIMO = 1600; // px del fotograma que se envía y se dibuja

// Zona del fotograma que contiene todas las reses, con margen, para acercar la imagen
function zonaDeInteres(animales) {
  const ys = animales.flatMap((a) => [a.caja[0], a.caja[2]]);
  const xs = animales.flatMap((a) => [a.caja[1], a.caja[3]]);
  let [y0, y1, x0, x1] = [Math.min(...ys), Math.max(...ys), Math.min(...xs), Math.max(...xs)];
  const margenY = Math.max(60, (y1 - y0) * 0.25), margenX = Math.max(60, (x1 - x0) * 0.25);
  y0 -= margenY; y1 += margenY; x0 -= margenX; x1 += margenX;
  // Nunca menos de un tercio del fotograma, para que se entienda dónde está el grupo
  const minimo = 340;
  if (x1 - x0 < minimo) { const c = (x0 + x1) / 2; x0 = c - minimo / 2; x1 = c + minimo / 2; }
  if (y1 - y0 < minimo) { const c = (y0 + y1) / 2; y0 = c - minimo / 2; y1 = c + minimo / 2; }
  const ajustar = (a, b) => (a < 0 ? [0, b - a] : b > 1000 ? [a - (b - 1000), 1000] : [a, b]);
  [x0, x1] = ajustar(x0, x1);
  [y0, y1] = ajustar(y0, y1);
  return { x0: Math.max(0, x0), y0: Math.max(0, y0), x1: Math.min(1000, x1), y1: Math.min(1000, y1) };
}

const chocan = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

// Copia la imagen o el fotograma del video a un lienzo de como mucho LADO_MAXIMO px
function aLienzo(fuente, ancho, alto) {
  const escala = Math.min(1, LADO_MAXIMO / Math.max(ancho, alto));
  const cv = document.createElement("canvas");
  cv.width = Math.round(ancho * escala);
  cv.height = Math.round(alto * escala);
  cv.getContext("2d").drawImage(fuente, 0, 0, cv.width, cv.height);
  return cv;
}

// Obtiene el fotograma: la imagen tal cual o el instante del video que eligió la IA
function extraerFotograma(archivo, segundo) {
  return new Promise((resolver, rechazar) => {
    const url = URL.createObjectURL(archivo);
    const terminar = (resultado, error) => {
      URL.revokeObjectURL(url);
      error ? rechazar(error) : resolver(resultado);
    };
    if (archivo.type.startsWith("image/")) {
      const img = new Image();
      img.onload = () => terminar(aLienzo(img, img.naturalWidth, img.naturalHeight));
      img.onerror = () => terminar(null, new Error("imagen"));
      img.src = url;
      return;
    }
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    let listo = false;
    const capturar = () => {
      if (listo) return;
      listo = true;
      clearTimeout(espera);
      terminar(aLienzo(video, video.videoWidth, video.videoHeight));
    };
    // Algunos archivos no permiten saltar a un segundo exacto (sin índice): si el salto
    // no termina, se usa el fotograma que ya esté cargado en vez de quedarse esperando.
    const espera = setTimeout(() => {
      if (video.readyState >= 2) capturar();
      else if (!listo) { listo = true; terminar(null, new Error("video")); }
    }, 8000);
    video.onloadedmetadata = () => {
      const fin = Number.isFinite(video.duration) ? video.duration - 0.1 : Infinity;
      video.currentTime = Math.min(Math.max(0, segundo || 0), Math.max(0, fin));
    };
    video.onseeked = capturar;
    video.onerror = () => { if (!listo) { listo = true; clearTimeout(espera); terminar(null, new Error("video")); } };
    video.src = url;
  });
}

// Dibuja sobre el lienzo visible el fotograma recortado a la zona de las reses, con recuadros y pesos.
// Devuelve los pesos que no cupieron junto a su recuadro (se numeran y se listan aparte).
function dibujar(cv, fotograma, animales) {
  const zona = zonaDeInteres(animales);
  const sx = (zona.x0 / 1000) * fotograma.width, sy = (zona.y0 / 1000) * fotograma.height;
  const sw = ((zona.x1 - zona.x0) / 1000) * fotograma.width, sh = ((zona.y1 - zona.y0) / 1000) * fotograma.height;
  // Amplía recortes pequeños (hasta 3×) y limita los grandes
  const escala = Math.min(3, LADO_MAXIMO / Math.max(sw, sh));
  cv.width = Math.round(sw * escala);
  cv.height = Math.round(sh * escala);
  const ctx = cv.getContext("2d");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(fotograma, sx, sy, sw, sh, 0, 0, cv.width, cv.height);

  const enLienzo = ([ymin, xmin, ymax, xmax]) => {
    const px = (v) => ((v - zona.x0) / (zona.x1 - zona.x0)) * cv.width;
    const py = (v) => ((v - zona.y0) / (zona.y1 - zona.y0)) * cv.height;
    return { x: px(xmin), y: py(ymin), w: px(xmax) - px(xmin), h: py(ymax) - py(ymin) };
  };

  const grosor = Math.max(2, cv.width / 500);
  const letra = Math.max(12, Math.round(cv.width / 75));
  const cajas = animales.map((a) => enLienzo(a.caja));
  ctx.lineWidth = grosor;
  ctx.strokeStyle = VERDE;
  for (const c of cajas) {
    ctx.beginPath();
    ctx.roundRect(c.x, c.y, c.w, c.h, grosor * 2);
    ctx.stroke();
  }

  // Etiquetas: arriba, abajo, derecha o izquierda del recuadro, sin taparse entre sí
  ctx.font = `600 ${letra}px "DM Sans", system-ui, sans-serif`;
  ctx.textBaseline = "top";
  const ocupados = [...cajas];
  const sinLugar = [];
  const pad = letra * 0.3, altoEtiqueta = letra + pad * 1.4, sep = grosor;
  const etiqueta = (texto, r) => {
    ctx.fillStyle = VERDE;
    ctx.beginPath();
    ctx.roundRect(r.x, r.y, r.w, r.h, pad);
    ctx.fill();
    ctx.fillStyle = TINTA;
    ctx.fillText(texto, r.x + pad, r.y + pad * 0.7);
  };
  animales.forEach((a, i) => {
    if (a.peso_kg == null) return;
    const c = cajas[i];
    const texto = `${a.peso_kg} kg`;
    const w = ctx.measureText(texto).width + pad * 2;
    const opciones = [
      { x: c.x, y: c.y - altoEtiqueta - sep },
      { x: c.x, y: c.y + c.h + sep },
      { x: c.x + c.w + sep, y: c.y },
      { x: c.x - w - sep, y: c.y },
    ].map((o) => ({ ...o, w, h: altoEtiqueta }));
    const libre = opciones.find((r) => r.x >= 0 && r.y >= 0 && r.x + r.w <= cv.width && r.y + r.h <= cv.height
      && !ocupados.some((o, j) => j !== i && chocan(r, o)));
    if (libre) {
      etiqueta(texto, libre);
      ocupados.push(libre);
    } else {
      sinLugar.push({ n: sinLugar.length + 1, peso: a.peso_kg, caja: c });
    }
  });
  ctx.font = `700 ${Math.round(letra * 0.85)}px "DM Sans", system-ui, sans-serif`;
  for (const s of sinLugar) {
    const w = ctx.measureText(String(s.n)).width + pad * 2;
    etiqueta(String(s.n), { x: s.caja.x, y: s.caja.y, w, h: letra * 0.85 + pad * 1.4 });
  }
  return sinLugar.map(({ n, peso }) => ({ n, peso }));
}

const comoBlob = (cv) => new Promise((ok) => cv.toBlob(ok, "image/jpeg", 0.9));

// Fotograma con un recuadro y el peso de cada res.
// En videos el navegador extrae el fotograma que eligió la IA y le pide marcar las reses
// sobre esa misma imagen, para que los recuadros coincidan con lo que se ve.
export default function CapturaCenso({ archivo, captura, idCenso }) {
  const lienzo = useRef(null);
  const [estado, setEstado] = useState("cargando"); // cargando | marcando | listo | sinReses | error
  const [animales, setAnimales] = useState([]);
  const [numerados, setNumerados] = useState([]);

  useEffect(() => {
    if (!archivo || !captura) return undefined;
    let cancelado = false;
    (async () => {
      try {
        const fotograma = await extraerFotograma(archivo, captura.segundo);
        if (cancelado) return;
        let marcados = archivo.type.startsWith("image/") ? captura.animales ?? [] : [];
        if (!marcados.length && idCenso) {
          setEstado("marcando");
          marcados = await detectarCaptura(idCenso, await comoBlob(fotograma));
          if (cancelado) return;
        }
        if (!marcados.length) {
          setEstado("sinReses");
          return;
        }
        setNumerados(dibujar(lienzo.current, fotograma, marcados));
        setAnimales(marcados);
        setEstado("listo");
      } catch {
        if (!cancelado) setEstado("error");
      }
    })();
    return () => { cancelado = true; };
  }, [archivo, captura, idCenso]);

  if (!captura) return null;

  const pesos = animales.map((a) => a.peso_kg).filter((p) => p != null);
  const totalMarcado = pesos.reduce((s, p) => s + p, 0);
  const esVideo = archivo?.type.startsWith("video/");

  const descargar = () => {
    const enlace = document.createElement("a");
    enlace.href = lienzo.current.toDataURL("image/jpeg", 0.9);
    enlace.download = `captura-censo${esVideo ? `-seg${Math.round(captura.segundo)}` : ""}.jpg`;
    enlace.click();
  };

  return (
    <figure className="captura">
      <div className="captura-lienzo">
        <canvas ref={lienzo} role="img"
          aria-label={`Fotograma con ${animales.length} reses marcadas y su peso estimado`}
          hidden={estado !== "listo"} />
        {(estado === "cargando" || estado === "marcando") && (
          <p className="cargando" style={{ padding: "18px 20px" }}><i aria-hidden="true" />
            {estado === "cargando" ? "Preparando la captura…" : "Marcando las reses en el fotograma…"}
          </p>
        )}
        {estado === "sinReses" && (
          <p className="texto-suave" style={{ padding: 20 }}>La IA no encontró reses claras en el fotograma elegido para la captura.</p>
        )}
        {estado === "error" && (
          <p className="texto-suave" style={{ padding: 20 }}>
            No se pudo preparar la captura del fotograma. El conteo y los pesos sí quedaron guardados.
          </p>
        )}
      </div>
      {estado === "listo" && numerados.length > 0 && (
        <ol className="captura-lista" aria-label="Peso de las reses numeradas">
          {numerados.map((r) => <li key={r.n}><b>{r.n}</b>{r.peso} kg</li>)}
        </ol>
      )}
      {estado === "listo" && (
        <figcaption>
          <span>
            {esVideo ? `Fotograma del segundo ${Math.round(captura.segundo)}` : "Imagen analizada"} ·{" "}
            {animales.length} reses marcadas
            {pesos.length > 0 && <> · {totalMarcado.toLocaleString("es-CO")} kg entre todas</>}
          </span>
          <span className="tenue">Recuadros y pesos aproximados estimados por la IA.</span>
          <button type="button" className="btn-texto" onClick={descargar}>Descargar captura</button>
        </figcaption>
      )}
    </figure>
  );
}
