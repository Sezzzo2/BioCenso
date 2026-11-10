import { NOMBRE_CATEGORIA } from "../../utils/bovinos.js";

const kg = (v) => `${Math.round(v).toLocaleString("es-CO")} kg`;

function dondeSeVe(fila) {
  if (fila.origen === "imagen") return "Captura";
  if (fila.origen === "promedio") return "Peso promedio";
  return fila.segundo != null ? `Video · ${Math.round(fila.segundo)} s` : "Video";
}

// Resumen por categoría: "8 vacas · 3 terneros"
function porCategoria(pesos) {
  const cuenta = {};
  for (const p of pesos) if (p.categoria) cuenta[p.categoria] = (cuenta[p.categoria] ?? 0) + 1;
  return Object.entries(cuenta)
    .sort((a, b) => b[1] - a[1])
    .map(([c, n]) => `${n} ${NOMBRE_CATEGORIA[c].toLowerCase()}${n === 1 ? "" : "s"}`)
    .join(" · ");
}

// Todos los bovinos contados en el censo con su peso estimado. Los marcados en la captura
// llevan el mismo número que su recuadro en la imagen.
export default function TablaPesos({ pesos, titulo = "Bovinos contados" }) {
  if (!pesos?.length) return null;
  const conPeso = pesos.filter((p) => p.peso_kg != null);
  const total = conPeso.reduce((s, p) => s + p.peso_kg, 0);
  const enImagen = pesos.filter((p) => p.origen === "imagen").length;
  const categorias = porCategoria(pesos);
  const conCategoria = pesos.some((p) => p.categoria);
  const conOrigen = pesos.some((p) => p.origen);
  const conMiniaturas = pesos.some((p) => p.miniatura);

  return (
    <section className="bovinos" aria-labelledby="t-bovinos">
      <header className="bovinos-cab">
        <h3 id="t-bovinos">{titulo}</h3>
        <dl className="bovinos-resumen">
          <div><dt>Bovinos</dt><dd>{pesos.length}</dd></div>
          <div><dt>Peso total</dt><dd>{kg(total)}</dd></div>
          {conPeso.length > 0 && <div><dt>Promedio</dt><dd>{kg(total / conPeso.length)}</dd></div>}
        </dl>
        {(categorias || enImagen > 0) && (
          <p className="bovinos-nota">
            {categorias}
            {categorias && enImagen > 0 && " · "}
            {enImagen > 0 && `${enImagen} marcados en la captura`}
          </p>
        )}
      </header>
      <div className="bovinos-tabla">
        <table>
          <caption className="sr">Peso estimado de cada bovino contado en el censo</caption>
          <thead>
            <tr>
              <th scope="col">N.º</th>
              {conCategoria && <th scope="col">Tipo</th>}
              <th scope="col" className="num">Peso</th>
              {conOrigen && <th scope="col">Visto en</th>}
            </tr>
          </thead>
          <tbody>
            {pesos.map((p) => (
              <tr key={p.n}>
                <td>
                  <span className="bovino-id">
                    {conMiniaturas && (p.miniatura
                      ? <img className="bovino-mini" src={p.miniatura} alt={`Bovino ${p.n}`} loading="lazy" />
                      : <span className="bovino-mini vacia" aria-hidden="true" />)}
                    <span className={`bovino-num${p.origen === "imagen" ? " en-imagen" : ""}`}>{p.n}</span>
                  </span>
                </td>
                {conCategoria && <td>{p.categoria ? NOMBRE_CATEGORIA[p.categoria] : "—"}</td>}
                <td className="num">{p.peso_kg != null ? kg(p.peso_kg) : "—"}</td>
                {conOrigen && <td className="bovino-origen">{dondeSeVe(p)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
