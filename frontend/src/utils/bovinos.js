// Tabla de TODOS los bovinos contados en el censo, no solo los que se ven en la captura.
// Primero van los marcados en la imagen (mismo número que su recuadro); luego los que la IA
// contó en otros momentos del vuelo, eligiendo los más alejados del fotograma para no repetir
// a los que ya están en la imagen. Si faltan pesos individuales se usa el promedio del censo.
export function armarTablaBovinos({ capturados = [], reses = [], conteo = 0, pesoPromedio = null, segundoCaptura = null }) {
  const filas = capturados.map((a, i) => ({
    n: i + 1,
    peso_kg: a.peso_kg ?? null,
    categoria: a.categoria ?? null,
    origen: "imagen",
    segundo: segundoCaptura,
  }));

  const faltan = Math.max(0, conteo - filas.length);
  const lejania = (r) => (segundoCaptura == null ? 0 : Math.abs((r.segundo ?? 0) - segundoCaptura));
  const restantes = [...reses]
    .sort((a, b) => lejania(b) - lejania(a))
    .slice(0, faltan)
    .sort((a, b) => (a.segundo ?? 0) - (b.segundo ?? 0));

  for (const r of restantes) {
    filas.push({ n: filas.length + 1, peso_kg: r.peso_kg, categoria: r.categoria ?? null, origen: "video", segundo: r.segundo ?? null });
  }
  const promedio = pesoPromedio != null ? Math.round(Number(pesoPromedio)) : null;
  while (filas.length < conteo) {
    filas.push({ n: filas.length + 1, peso_kg: promedio, categoria: null, origen: "promedio", segundo: null });
  }
  return filas;
}

export const NOMBRE_CATEGORIA = {
  vaca: "Vaca",
  toro: "Toro",
  novillo: "Novillo",
  novilla: "Novilla",
  ternero: "Ternero",
};
