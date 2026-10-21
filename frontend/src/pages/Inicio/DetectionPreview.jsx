// Ilustración de una toma aérea con las cajas de detección del modelo.
const vacas = [
  [62, 70, -20], [88, 58, 15], [120, 92, 40], [150, 66, -10], [196, 104, 25],
  [228, 72, -35], [256, 118, 10], [92, 142, 30], [140, 160, -15], [182, 150, 50],
  [222, 176, 5], [268, 160, -25], [52, 182, 20], [110, 196, -40],
];

function DetectionPreview({ total }) {
  return (
    <figure className="bc-preview">
      <svg viewBox="0 0 320 240" role="img" aria-label="Vista aérea de un potrero con bovinos detectados">
        <rect width="320" height="240" fill="#5f7d3a" />
        <path d="M0 0h140l-30 90L0 110Z" fill="#6f8d43" />
        <path d="M140 0h180v70l-120 30-90-10Z" fill="#7d9a4d" />
        <path d="M0 110l110-20 90 10 120-30v90l-150 20L0 200Z" fill="#688a3f" />
        <path d="M0 200l170-20 150-10v70H0Z" fill="#577434" />
        <path d="M140 0l-30 90 90 10 120-30M110 90 0 110M170 180 0 200M170 180l30-80" stroke="#9fc65e" strokeWidth="2" fill="none" opacity="0.6" />
        {vacas.map(([x, y, rot], i) => (
          <g key={i} transform={`translate(${x} ${y}) rotate(${rot})`}>
            <ellipse rx="9" ry="5" fill={i % 3 === 0 ? "#3a2a1f" : i % 3 === 1 ? "#8a5a32" : "#2a2522"} />
            <ellipse cx="9" rx="3" ry="2.5" fill={i % 3 === 1 ? "#6e4527" : "#1d1815"} />
            <rect x="-14" y="-10" width="28" height="20" rx="2" fill="none" stroke="#c6f27e" strokeWidth="1.6" />
          </g>
        ))}
      </svg>
      <figcaption className="bc-preview__count">
        <span>Bovinos detectados</span>
        <strong>{total}</strong>
      </figcaption>
    </figure>
  );
}

export default DetectionPreview;
