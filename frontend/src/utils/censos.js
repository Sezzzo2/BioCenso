// El valor exacto de "estado" lo define el backend; aquí solo se elige el color
export function claseEstado(estado = "") {
  const e = estado.toLowerCase();
  if (e.includes("error") || e.includes("fall")) return "bc-badge bc-badge-err";
  if (e.includes("proces") && !e.includes("procesado")) return "bc-badge bc-badge-wait";
  if (e.includes("complet") || e.includes("procesado") || e.includes("final")) return "bc-badge bc-badge-ok";
  return "bc-badge";
}

export const fechaHora = (v) =>
  v ? new Date(v).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" }) : "—";