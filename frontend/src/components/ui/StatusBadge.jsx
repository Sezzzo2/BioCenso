function StatusBadge({ estado }) {
  const texto = String(estado ?? "").trim();
  const normalizado = texto.toLocaleLowerCase("es");
  let variante = "neutral";
  if (normalizado.includes("error") || normalizado.includes("fall")) variante = "danger";
  else if (normalizado.includes("proces") && !normalizado.includes("procesado")) variante = "warn";
  else if (normalizado.includes("complet") || normalizado.includes("final")) variante = "ok";
  const claseVariante = {
    danger: "bc-badge-err",
    warn: "bc-badge-wait",
    ok: "bc-badge-ok",
  }[variante] ?? "";
  return (
    <span className={`bc-badge ${claseVariante}`}>
      {texto || "Estado no disponible"}
    </span>
  );
}

export default StatusBadge;
