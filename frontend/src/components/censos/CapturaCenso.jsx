import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { detectarCaptura, guardarCaptura } from "../../services/censoService.js";
import TablaPesos from "./TablaPesos.jsx";
import Icon from "../ui/Icon.jsx";
import { armarTablaBovinos } from "../../utils/bovinos.js";
import { extraerError } from "../../utils/errores.js";

const VERDE = "#86e05b";
const TINTA = "#10230c";
const LADO_MAXIMO = 1600; // px del fotograma que se envía y se dibuja
const REINTENTOS_AUTOMATICOS = 2;

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

// Numera las reses de izquierda a derecha y de arriba abajo (por franjas), como se leen en la imagen
function numerar(animales) {
  const franja = (a) => Math.floor(((a.caja[0] + a.caja[2]) / 2) / 250);
  return [...animales].sort((a, b) => franja(a) - franja(b) || a.caja[1] - b.caja[1]);
}

// Dibuja sobre el lienzo visible el fotograma recortado a la zona de las reses, con recuadros,
// el número de cada bovino y su peso. Si la etiqueta completa no cabe, queda solo el número.
// Devuelve la tabla [{ n, peso_kg }] con el mismo número que aparece en la imagen.
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
    const c = cajas[i];
    const n = i + 1;
    const texto = a.peso_kg == null ? String(n) : `${n} · ${a.peso_kg} kg`;
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
      sinLugar.push({ n, caja: c });
    }
  });
  ctx.font = `700 ${Math.round(letra * 0.85)}px "DM Sans", system-ui, sans-serif`;
  for (const s of sinLugar) {
    const w = ctx.measureText(String(s.n)).width + pad * 2;
    etiqueta(String(s.n), { x: s.caja.x, y: s.caja.y, w, h: letra * 0.85 + pad * 1.4 });
  }
  return animales.map((a, i) => ({ n: i + 1, peso_kg: a.peso_kg ?? null }));
}

const comoBlob = (cv) => new Promise((ok) => cv.toBlob(ok, "image/jpeg", 0.9));

// Fotograma con un recuadro, el número y el peso de cada res, junto a la tabla de TODOS los
// bovinos contados en el censo. En videos el navegador extrae el fotograma que eligió la IA y
// le pide marcar las reses sobre esa misma imagen, para que los recuadros coincidan.
const SIN_RESES = []; // constante: un [] nuevo en cada render volvería a lanzar la captura

export default function CapturaCenso({ archivo, captura, idCenso, idFinca, conteo = 0, pesoPromedio = null, reses = SIN_RESES, onTabla }) {
  const lienzo = useRef(null);
  const fotogramaRef = useRef(null); // se conserva para reintentar sin volver a leer el video
  const [estado, setEstado] = useState("cargando"); // cargando | marcando | listo | sinReses | error
  const [motivo, setMotivo] = useState("");
  const [animales, setAnimales] = useState([]);
  const [tabla, setTabla] = useState([]);
  const [intento, setIntento] = useState(0);
  const [hayFotograma, setHayFotograma] = useState(false);
  const [esperando, setEsperando] = useState(0); // reintento automático en curso
  const [guardado, setGuardado] = useState({ estado: "", conImagen: false }); // estado: "" | guardando | ok | error

  // Tabla de todos los contados: primero los marcados en la imagen, luego el resto del vuelo
  const armar = useCallback((capturados) => armarTablaBovinos({
    capturados, reses, conteo, pesoPromedio, segundoCaptura: captura?.segundo ?? null,
  }), [reses, conteo, pesoPromedio, captura]);

  // Guarda la tabla en la ficha del censo y, si se pudo marcar, la imagen con los recuadros
  const guardarEnFicha = useCallback(async (filas, conImagen) => {
    onTabla?.(filas); // el resumen del censo usa el promedio y el total de esta tabla
    if (!idCenso || !filas.length) return;
    setGuardado({ estado: "guardando", conImagen });
    try {
      await guardarCaptura(idCenso, {
        imagen: conImagen ? await comoBlob(lienzo.current) : null,
        pesos: filas,
        segundo: conImagen ? captura?.segundo ?? null : null,
      });
      setGuardado({ estado: "ok", conImagen });
    } catch {
      setGuardado({ estado: "error", conImagen });
    }
  }, [idCenso, captura, onTabla]);

  useEffect(() => {
    if (!archivo || !captura) return undefined;
    let cancelado = false;
    // Sin imagen marcada la tabla igual se arma y se guarda con los contados en el video
    const sinImagen = (nuevoEstado, texto = "") => {
      const filas = armar([]);
      setTabla(filas);
      setMotivo(texto);
      setEstado(nuevoEstado);
      guardarEnFicha(filas, false);
    };
    (async () => {
      let fotograma = fotogramaRef.current;
      if (!fotograma) {
        try {
          fotograma = await extraerFotograma(archivo, captura.segundo);
          fotogramaRef.current = fotograma;
          setHayFotograma(true);
        } catch {
          if (!cancelado) sinImagen("error", "Este navegador no pudo leer el video para sacar el fotograma.");
          return;
        }
      }
      if (cancelado) return;
      try {
        let marcados = archivo.type.startsWith("image/") ? captura.animales ?? [] : [];
        if (!marcados.length && idCenso) {
          setEstado("marcando");
          const imagen = await comoBlob(fotograma);
          let respuesta;
          // Si la IA está saturada se vuelve a pedir sola antes de mostrar el error
          for (let vuelta = 0; ; vuelta++) {
            try {
              respuesta = await detectarCaptura(idCenso, imagen);
              break;
            } catch (err) {
              const ocupada = err?.response?.status === 503 || err?.code === "ECONNABORTED";
              if (!ocupada || vuelta >= REINTENTOS_AUTOMATICOS || cancelado) throw err;
              setEsperando(vuelta + 1);
              await new Promise((ok) => setTimeout(ok, 15000));
              if (cancelado) return;
            }
          }
          if (cancelado) return;
          setEsperando(0);
          marcados = respuesta.animales;
        }
        if (!marcados.length) {
          sinImagen("sinReses");
          return;
        }
        const ordenados = numerar(marcados);
        dibujar(lienzo.current, fotograma, ordenados);
        const filas = armar(ordenados);
        setAnimales(ordenados);
        setTabla(filas);
        setEstado("listo");
        guardarEnFicha(filas, true);
      } catch (err) {
        if (!cancelado) {
          setEsperando(0);
          sinImagen("error", err?.code === "ECONNABORTED" ? "La IA tardó demasiado en marcar las reses." : extraerError(err));
        }
      }
    })();
    return () => { cancelado = true; };
  }, [archivo, captura, idCenso, intento, armar, guardarEnFicha]);

  if (!captura) return null;

  const esVideo = archivo?.type.startsWith("video/");
  const terminado = estado === "listo" || estado === "sinReses" || estado === "error";

  const descargar = () => {
    const enlace = document.createElement("a");
    enlace.href = lienzo.current.toDataURL("image/jpeg", 0.9);
    enlace.download = `captura-censo${esVideo ? `-seg${Math.round(captura.segundo)}` : ""}.jpg`;
    enlace.click();
  };

  return (
    <section className="captura" aria-labelledby="t-captura-nueva">
      <div className="captura-cab">
        <h3 id="t-captura-nueva">Captura y pesos por bovino</h3>
        <EstadoGuardado guardado={guardado} idFinca={idFinca} idCenso={idCenso}
          onReintentar={() => guardarEnFicha(tabla, guardado.conImagen)} />
      </div>
      <div className="captura-ficha">
        <figure className="captura-figura">
          <div className="captura-lienzo">
            <canvas ref={lienzo} role="img"
              aria-label={`Fotograma con ${animales.length} reses numeradas y su peso estimado`}
              hidden={estado !== "listo"} />
            {(estado === "cargando" || estado === "marcando") && (
              <p className="cargando captura-aviso"><i aria-hidden="true" />
                {estado === "cargando"
                  ? "Preparando la captura…"
                  : esperando
                    ? `La IA está ocupada; reintentando la captura (${esperando} de ${REINTENTOS_AUTOMATICOS})…`
                    : "Marcando las reses en el fotograma…"}
              </p>
            )}
            {estado === "sinReses" && (
              <p className="captura-aviso texto-suave">La IA no encontró reses claras en el fotograma elegido para la captura.</p>
            )}
            {estado === "error" && (
              <div className="captura-aviso">
                <p>{motivo || "No se pudo preparar la captura del fotograma."}</p>
                <p className="texto-suave">El conteo y la tabla de pesos sí quedaron guardados.</p>
                {hayFotograma && idCenso && (
                  <button type="button" className="btn btn-oscuro btn-sm"
                    onClick={() => { setMotivo(""); setIntento((n) => n + 1); }}>
                    Reintentar captura
                  </button>
                )}
              </div>
            )}
          </div>
          {estado === "listo" && (
            <figcaption>
              <span>
                {esVideo ? `Fotograma del segundo ${Math.round(captura.segundo)}` : "Imagen analizada"} · {animales.length} de {Math.max(conteo, animales.length)} bovinos marcados
              </span>
              <span className="tenue">Recuadros y pesos aproximados</span>
              <button type="button" className="btn-texto" onClick={descargar}>Descargar imagen</button>
            </figcaption>
          )}
        </figure>
        {terminado ? (
          <TablaPesos pesos={tabla} />
        ) : (
          <div className="bovinos bovinos-espera"><p className="texto-suave">La tabla de pesos aparece cuando termine la captura.</p></div>
        )}
      </div>
    </section>
  );
}

function EstadoGuardado({ guardado, idFinca, idCenso, onReintentar }) {
  if (guardado.estado === "guardando") return <p className="captura-guardado">Guardando en la ficha del censo…</p>;
  if (guardado.estado === "error") {
    return (
      <p className="captura-guardado">
        No se pudo guardar en la ficha. <button type="button" className="btn-texto" onClick={onReintentar}>Reintentar</button>
      </p>
    );
  }
  if (guardado.estado !== "ok") return null;
  return (
    <p className="captura-guardado ok">
      <Icon name="check" size={16} strokeWidth={2.6} />
      {guardado.conImagen ? "Guardada en la ficha del censo" : "Tabla guardada en la ficha del censo"}
      {idFinca && <Link className="btn-texto" to={`/fincas/${idFinca}/censos/${idCenso}`}>Ver ficha</Link>}
    </p>
  );
}
