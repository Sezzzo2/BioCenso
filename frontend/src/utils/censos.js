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

// Fecha que se muestra para un censo: la del vuelo si se registró; si no, el día
// (en hora local) en que se procesó. Devuelve "AAAA-MM-DD".
export function fechaDeCenso(censo) {
  if (censo?.fecha_vuelo) return String(censo.fecha_vuelo).slice(0, 10);
  if (!censo?.fecha_procesamiento) return null;
  const d = new Date(censo.fecha_procesamiento);
  const dos = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
}

export const esCompletado = (censo) => /complet/i.test(censo?.estado ?? "");

// Más reciente primero
export const ordenarCensos = (lista) =>
  [...lista].sort((a, b) =>
    (fechaDeCenso(b) ?? "").localeCompare(fechaDeCenso(a) ?? "") ||
    new Date(b.fecha_procesamiento) - new Date(a.fecha_procesamiento));

export const signo = (n) => (n == null ? "—" : n > 0 ? `+${n}` : String(n));

export function fraseRegistro(diferencia) {
  if (diferencia == null) return "";
  if (diferencia === 0) return "El conteo del dron coincide con tu registro.";
  const n = Math.abs(diferencia);
  const bovinos = `${n} bovino${n === 1 ? "" : "s"}`;
  return diferencia > 0
    ? `El dron vio ${bovinos} más de los que tienes registrados. Revisa si hay animales sin registrar.`
    : `El dron vio ${bovinos} menos de los registrados. Puede haber animales fuera del recorrido.`;
}
