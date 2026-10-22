import { useEffect, useState } from "react";

// Posiciones (en un lienzo de 400×300) de los bovinos reales de la toma aérea de ejemplo
const CAJAS = [
  [212, 97], [211, 114], [139, 121], [157, 129], [220, 134], [117, 139],
  [155, 146], [226, 152], [216, 166], [189, 181], [232, 202], [284, 196],
];
const reducirMovimiento = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// Toma aérea de ejemplo: las cajas de detección aparecen una a una y el contador las suma
export default function DetectionPreview() {
  const [contados, setContados] = useState(() => (reducirMovimiento() ? CAJAS.length : 0));

  useEffect(() => {
    if (reducirMovimiento()) return undefined;
    const temporizadores = CAJAS.map((_, i) => setTimeout(() => setContados(i + 1), 750 + i * 170));
    return () => temporizadores.forEach(clearTimeout);
  }, []);

  return (
    <figure className="vuelo" aria-label="Ejemplo de detección de bovinos sobre una toma aérea">
      <div className="vuelo-img">
        <svg viewBox="0 0 400 300" preserveAspectRatio="none" aria-hidden="true">
          {CAJAS.map(([x, y], i) => (
            <rect key={i} className="caja" x={x - 9} y={y - 7} width="18" height="14" rx="3"
              style={{ animationDelay: `${(0.5 + i * 0.17).toFixed(2)}s` }} />
          ))}
        </svg>
        <div className="barrido" />
        <span className="vuelo-etq">Vista de ejemplo · toma aérea</span>
      </div>
      <div className="contador">
        <span>Bovinos detectados</span>
        <strong aria-live="off">{contados}</strong>
      </div>
    </figure>
  );
}
