const FILAS = [
  { criterio: "Método", manual: "Recorrido a pie o a caballo", bc: "Video aéreo con dron" },
  { criterio: "Tiempo de la jornada", manual: "Depende del tamaño del potrero", bc: "Depende de la duración del vuelo" },
  { criterio: "Registro de resultados", manual: "Cuaderno u hojas sueltas", bc: "Base de datos centralizada" },
  { criterio: "Ubicación de los animales", manual: "No se registra", bc: "Georreferenciada en mapa" },
  { criterio: "Historial de censos", manual: "Difícil de consultar", bc: "Gráficas de evolución" },
];

export default function ComparisonTable() {
  return (
    <section id="comparacion" className="bc-section bc-steps">
      <div className="bc-container">
        <p className="bc-eyebrow">Comparación</p>
        <h2 className="bc-title mb-4" style={{ fontSize: "2.2rem" }}>Conteo manual vs. BioCenso</h2>
        <div className="bc-table-wrap">
          <table className="bc-table">
            <thead>
              <tr>
                <th>Criterio</th>
                <th>Conteo manual</th>
                <th className="bc-col-bc">BioCenso</th>
              </tr>
            </thead>
            <tbody>
              {FILAS.map((f) => (
                <tr key={f.criterio}>
                  <td>{f.criterio}</td>
                  <td>{f.manual}</td>
                  <td className="bc-col-bc">{f.bc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}