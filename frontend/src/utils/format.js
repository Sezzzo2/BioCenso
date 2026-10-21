// Las fechas del vuelo llegan como "YYYY-MM-DD"; se interpretan en hora local para no correr un día.
export function parseFecha(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
}

// Formato corto tipo "12 sept 2026" (sin los "de" que agrega es-CO).
export function formatFecha(iso, opciones = { day: "numeric", month: "short", year: "numeric" }) {
  const fecha = parseFecha(iso);
  if (!fecha) return "—";
  return new Intl.DateTimeFormat("es-CO", opciones)
    .formatToParts(fecha)
    .filter((p) => p.type !== "literal")
    .map((p) => p.value.replace(".", ""))
    .join(" ");
}

export function formatFechaLarga(iso) {
  const fecha = parseFecha(iso);
  return fecha
    ? fecha.toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" })
    : "—";
}

export function hoyISO() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function formatDuracion(segundos) {
  if (segundos == null) return "—";
  const m = Math.floor(segundos / 60);
  const s = Math.round(segundos % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function formatTamano(bytes) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

// Compara lo que vio el dron con lo que hay registrado en la finca.
export function describirDiferencia(detectados, registrados) {
  if (detectados == null || registrados == null) {
    return { valor: "—", texto: "Sin datos para comparar", tono: "neutral" };
  }
  const diff = detectados - registrados;
  if (diff === 0) {
    return { valor: "0", texto: "El conteo coincide con tu registro", tono: "ok" };
  }
  if (diff > 0) {
    return {
      valor: `+${diff}`,
      texto: `${diff} ${diff === 1 ? "animal más" : "animales más"} que en tu registro`,
      tono: "warn",
    };
  }
  return {
    valor: String(diff),
    texto: `${-diff} ${diff === -1 ? "animal no fue detectado" : "animales no fueron detectados"}`,
    tono: "warn",
  };
}
