// El texto exacto del estado lo define el backend; aquí solo se elige el color
function StatusBadge({ estado }) {
  const texto = String(estado ?? "").trim();
  const n = texto.toLocaleLowerCase("es");
  let clase = "neutro";
  let etiqueta = texto || "Sin estado";
  if (n.includes("error") || n.includes("fall")) {
    clase = "err";
    etiqueta = "No se pudo procesar";
  } else if (n.includes("proces") && !n.includes("procesado")) {
    clase = "espera";
  } else if (n.includes("complet") || n.includes("final")) {
    clase = "ok";
  }
  return <span className={`estado ${clase}`}>{etiqueta}</span>;
}

export default StatusBadge;
