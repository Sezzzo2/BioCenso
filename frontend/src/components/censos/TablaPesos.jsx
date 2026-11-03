// Tabla de la captura: número del bovino (el mismo que aparece en la imagen) y su peso estimado
export default function TablaPesos({ pesos }) {
  if (!pesos?.length) return null;
  const conPeso = pesos.filter((p) => p.peso_kg != null);
  const total = conPeso.reduce((s, p) => s + p.peso_kg, 0);
  return (
    <div className="tabla-caja tabla-pesos">
      <table>
        <caption className="sr">Peso estimado de cada bovino marcado en la captura</caption>
        <thead>
          <tr><th scope="col">N.º de bovino</th><th scope="col" className="num">Peso estimado</th></tr>
        </thead>
        <tbody>
          {pesos.map((p) => (
            <tr key={p.n}>
              <td>Bovino {p.n}</td>
              <td className="num">{p.peso_kg != null ? `${p.peso_kg.toLocaleString("es-CO")} kg` : "—"}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">Total ({pesos.length} bovinos)</th>
            <td className="num">{total.toLocaleString("es-CO")} kg</td>
          </tr>
          {conPeso.length > 0 && (
            <tr>
              <th scope="row">Promedio por bovino</th>
              <td className="num">{Math.round(total / conPeso.length).toLocaleString("es-CO")} kg</td>
            </tr>
          )}
        </tfoot>
      </table>
    </div>
  );
}
