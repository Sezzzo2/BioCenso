import { useLayoutEffect, useRef, useState } from "react";
import { formatFecha } from "../../utils/format.js";

// Paleta validada para daltonismo sobre el fondo oscuro (ΔE deutan 22.8)
export const COLOR_IA = "#4fa236";
export const COLOR_MANUAL = "#a775e0";

// Conteo de la IA frente al conteo manual por censo. puntos: [{ id, fecha, ia, manual }]
export default function GraficoEvolucion({ puntos }) {
  const caja = useRef(null);
  const [ancho, setAncho] = useState(720);
  const [activo, setActivo] = useState(null);

  // El lienzo usa el ancho real para que los textos no se encojan en móvil
  useLayoutEffect(() => {
    const el = caja.current;
    if (!el) return undefined;
    const medir = () => setAncho(Math.max(320, Math.round(el.clientWidth)));
    medir();
    const obs = new ResizeObserver(medir);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const W = ancho, H = 280, m = { t: 20, r: 74, b: 34, l: 40 };
  const valores = puntos.flatMap((p) => [p.ia, p.manual]).filter((v) => v != null);
  const maxV = Math.max(...valores), minV = Math.min(...valores);
  const paso = Math.max(1, Math.ceil((maxV - minV + 4) / 4));
  const y0 = Math.max(0, Math.floor((minV - paso) / paso) * paso);
  const y1 = Math.ceil((maxV + 1) / paso) * paso;
  const x = (i) => (puntos.length === 1 ? (m.l + W - m.r) / 2 : m.l + (i * (W - m.l - m.r)) / (puntos.length - 1));
  const y = (v) => m.t + (H - m.t - m.b) * (1 - (v - y0) / (y1 - y0 || 1));
  const ticks = [];
  for (let v = y0; v <= y1; v += paso) ticks.push(v);

  const camino = (k) => {
    let d = "", abierto = false;
    puntos.forEach((p, i) => {
      if (p[k] == null) { abierto = false; return; }
      d += `${abierto ? "L" : "M"}${x(i).toFixed(1)} ${y(p[k]).toFixed(1)}`;
      abierto = true;
    });
    return d;
  };
  const ultimo = (k) => { for (let i = puntos.length - 1; i >= 0; i--) if (puntos[i][k] != null) return i; return -1; };
  const iIA = ultimo("ia"), iMan = ultimo("manual");
  let yIA = iIA >= 0 ? y(puntos[iIA].ia) : 0;
  let yMan = iMan >= 0 ? y(puntos[iMan].manual) : 0;
  // Evita que las etiquetas finales se monten cuando los valores son cercanos
  if (iIA >= 0 && iMan >= 0 && Math.abs(yIA - yMan) < 14) {
    const medio = (yIA + yMan) / 2;
    [yIA, yMan] = puntos[iIA].ia >= puntos[iMan].manual ? [medio - 8, medio + 8] : [medio + 8, medio - 8];
  }
  const columna = puntos.length === 1 ? W - m.l - m.r : (W - m.l - m.r) / (puntos.length - 1);
  const p = activo != null ? puntos[activo] : null;
  let tipX = activo != null ? x(activo) + 14 : 0;
  if (tipX + 190 > W) tipX = x(activo) - 200;

  return (
    <div className="grafico" ref={caja}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Conteo de la IA y conteo manual por censo"
        onPointerLeave={() => setActivo(null)}>
        {ticks.map((v) => (
          <g key={v}>
            <line className="g-rejilla" x1={m.l} x2={W - m.r} y1={y(v)} y2={y(v)} />
            <text className="g-eje" x={m.l - 8} y={y(v) + 4} textAnchor="end">{v}</text>
          </g>
        ))}
        {puntos.map((pt, i) => (
          <text key={pt.id} className="g-eje" x={x(i)} y={H - 10} textAnchor="middle">
            {formatFecha(pt.fecha).replace(/ \d{4}$/, "")}
          </text>
        ))}
        {activo != null && <line className="g-guia" x1={x(activo)} x2={x(activo)} y1={m.t} y2={H - m.b} />}
        <path className="g-linea" d={camino("ia")} stroke={COLOR_IA} />
        <path className="g-linea" d={camino("manual")} stroke={COLOR_MANUAL} />
        {puntos.map((pt, i) => (
          <g key={pt.id}>
            {pt.ia != null && <circle className="g-punto" cx={x(i)} cy={y(pt.ia)} r="5" fill={COLOR_IA} />}
            {pt.manual != null && <circle className="g-punto" cx={x(i)} cy={y(pt.manual)} r="5" fill={COLOR_MANUAL} />}
          </g>
        ))}
        {iIA >= 0 && <text className="g-etq" x={x(iIA) + 10} y={yIA + 4}>IA {puntos[iIA].ia}</text>}
        {iMan >= 0 && <text className="g-etq" x={x(iMan) + 10} y={yMan + 4}>Manual {puntos[iMan].manual}</text>}
        {puntos.map((pt, i) => (
          <rect key={pt.id} x={x(i) - columna / 2} y={m.t} width={columna} height={H - m.t - m.b}
            fill="transparent" onPointerMove={() => setActivo(i)} />
        ))}
      </svg>
      <div className={`g-tip ${p ? "ver" : ""}`} role="tooltip" style={{ left: Math.max(0, tipX), top: m.t }}>
        {p && (
          <>
            <b>Censo n.º {p.id} · {formatFecha(p.fecha)}</b>
            <div><span><i style={{ background: COLOR_IA }} />Conteo de la IA</span><span>{p.ia ?? "—"}</span></div>
            <div><span><i style={{ background: COLOR_MANUAL }} />Conteo manual</span><span>{p.manual ?? "Sin registrar"}</span></div>
          </>
        )}
      </div>
    </div>
  );
}
