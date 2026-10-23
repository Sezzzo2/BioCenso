import { useEffect, useRef, useState } from "react";

const VERDE = "#86e05b";
const TINTA = "#10230c";

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

// Dibuja el fotograma que eligió la IA con un recuadro y el peso de cada res.
// archivo: el File que se acaba de subir (video o imagen). captura: { segundo, animales: [{ caja, peso_kg }] }
export default function CapturaCenso({ archivo, captura }) {
  const lienzo = useRef(null);
  const [estado, setEstado] = useState("cargando"); // cargando | listo | error
  const [numerados, setNumerados] = useState([]); // pesos que no cupieron junto a su recuadro

  useEffect(() => {
    if (!archivo || !captura?.animales?.length) return undefined;
    const url = URL.createObjectURL(archivo);
    let cancelado = false;

    const dibujar = (fuente, ancho, alto) => {
      const cv = lienzo.current;
      if (!cv || cancelado) return;
      const zona = zonaDeInteres(captura.animales);
      const sx = (zona.x0 / 1000) * ancho, sy = (zona.y0 / 1000) * alto;
      const sw = ((zona.x1 - zona.x0) / 1000) * ancho, sh = ((zona.y1 - zona.y0) / 1000) * alto;
      // Amplía recortes pequeños (hasta 3×) y limita los grandes a 1600 px
      const escala = Math.min(3, 1600 / Math.max(sw, sh));
      cv.width = Math.round(sw * escala);
      cv.height = Math.round(sh * escala);
      const ctx = cv.getContext("2d");
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(fuente, sx, sy, sw, sh, 0, 0, cv.width, cv.height);

      const aLienzo = (caja) => {
        const [ymin, xmin, ymax, xmax] = caja;
        const px = (v, eje) => eje === "x"
          ? ((v - zona.x0) / (zona.x1 - zona.x0)) * cv.width
          : ((v - zona.y0) / (zona.y1 - zona.y0)) * cv.height;
        const x = px(xmin, "x"), y = px(ymin, "y");
        return { x, y, w: px(xmax, "x") - x, h: px(ymax, "y") - y };
      };

      const grosor = Math.max(2, cv.width / 500);
      const letra = Math.max(12, Math.round(cv.width / 75));
      const cajas = captura.animales.map((a) => aLienzo(a.caja));
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
      const pad = letra * 0.3, alto_ = letra + pad * 1.4, sep = grosor;
      const dibujarEtiqueta = (texto, r) => {
        ctx.fillStyle = VERDE;
        ctx.beginPath();
        ctx.roundRect(r.x, r.y, r.w, r.h, pad);
        ctx.fill();
        ctx.fillStyle = TINTA;
        ctx.fillText(texto, r.x + pad, r.y + pad * 0.7);
      };
      captura.animales.forEach((a, i) => {
        if (a.peso_kg == null) return;
        const c = cajas[i];
        const texto = `${a.peso_kg} kg`;
        const w = ctx.measureText(texto).width + pad * 2;
        const opciones = [
          { x: c.x, y: c.y - alto_ - sep },
          { x: c.x, y: c.y + c.h + sep },
          { x: c.x + c.w + sep, y: c.y },
          { x: c.x - w - sep, y: c.y },
        ].map((o) => ({ ...o, w, h: alto_ }));
        const libre = opciones.find((r) => r.x >= 0 && r.y >= 0 && r.x + r.w <= cv.width && r.y + r.h <= cv.height
          && !ocupados.some((o, j) => j !== i && chocan(r, o)));
        if (libre) {
          dibujarEtiqueta(texto, libre);
          ocupados.push(libre);
        } else {
          sinLugar.push({ n: sinLugar.length + 1, peso: a.peso_kg, caja: c });
        }
      });
      // Las que no cupieron llevan un número pequeño dentro de su recuadro
      ctx.font = `700 ${Math.round(letra * 0.85)}px "DM Sans", system-ui, sans-serif`;
      for (const s of sinLugar) {
        const texto = String(s.n);
        const w = ctx.measureText(texto).width + pad * 2;
        dibujarEtiqueta(texto, { x: s.caja.x, y: s.caja.y, w, h: letra * 0.85 + pad * 1.4 });
      }
      setNumerados(sinLugar.map(({ n, peso }) => ({ n, peso })));
      setEstado("listo");
    };

    if (archivo.type.startsWith("image/")) {
      const img = new Image();
      img.onload = () => dibujar(img, img.naturalWidth, img.naturalHeight);
      img.onerror = () => !cancelado && setEstado("error");
      img.src = url;
    } else {
      const video = document.createElement("video");
      video.muted = true;
      video.playsInline = true;
      video.preload = "auto";
      video.onloadedmetadata = () => {
        const t = Math.min(Math.max(0, captura.segundo || 0), Math.max(0, video.duration - 0.1));
        video.currentTime = Number.isFinite(t) ? t : 0;
      };
      video.onseeked = () => dibujar(video, video.videoWidth, video.videoHeight);
      video.onerror = () => !cancelado && setEstado("error");
      video.src = url;
    }

    return () => {
      cancelado = true;
      URL.revokeObjectURL(url);
    };
  }, [archivo, captura]);

  if (!captura?.animales?.length) return null;

  const pesos = captura.animales.map((a) => a.peso_kg).filter((p) => p != null);
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
          aria-label={`Fotograma con ${captura.animales.length} reses marcadas y su peso estimado`}
          hidden={estado !== "listo"} />
        {estado === "cargando" && <p className="cargando"><i aria-hidden="true" />Preparando la captura…</p>}
        {estado === "error" && (
          <p className="texto-suave" style={{ padding: 20 }}>
            Este navegador no pudo leer el fotograma del video. El conteo y los pesos sí quedaron guardados.
          </p>
        )}
      </div>
      {numerados.length > 0 && (
        <ol className="captura-lista" aria-label="Peso de las reses numeradas">
          {numerados.map((r) => <li key={r.n}><b>{r.n}</b>{r.peso} kg</li>)}
        </ol>
      )}
      <figcaption>
        <span>
          {esVideo ? `Fotograma del segundo ${Math.round(captura.segundo)}` : "Imagen analizada"} ·{" "}
          {captura.animales.length} reses marcadas
          {pesos.length > 0 && <> · {totalMarcado.toLocaleString("es-CO")} kg entre todas</>}
        </span>
        <span className="tenue">Recuadros y pesos aproximados estimados por la IA.</span>
        {estado === "listo" && <button type="button" className="btn-texto" onClick={descargar}>Descargar captura</button>}
      </figcaption>
    </figure>
  );
}
