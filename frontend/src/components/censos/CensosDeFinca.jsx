import { Link } from "react-router-dom";
import { fechaDeCenso } from "../../utils/censos.js";
import { formatFecha } from "../../utils/format.js";
import Icon from "../ui/Icon.jsx";
import StatusBadge from "../ui/StatusBadge.jsx";
import { ButtonLink, EmptyState } from "../ui/SharedUI.jsx";

// Tabla de censos de una finca (los datos los carga la página)
export default function CensosDeFinca({ idFinca, censos }) {
  return (
    <section className="panel panel-solido panel-pad bloque" aria-labelledby="t-censos-finca">
      <div className="bloque-cab">
        <div>
          <h2 id="t-censos-finca">Censos ({censos.length})</h2>
          <p>Fecha, estado y resultados de cada censo de esta finca.</p>
        </div>
        <ButtonLink to={`/censos?finca=${idFinca}`} variant="light" size="small"><Icon name="plus" />Nuevo censo</ButtonLink>
      </div>

      {censos.length === 0 ? (
        <EmptyState
          title="Esta finca aún no tiene censos"
          description="Sube un video del dron para iniciar el primer censo."
          action={<ButtonLink to={`/censos?finca=${idFinca}`}>Subir video</ButtonLink>}
        />
      ) : (
        <div className="tabla-caja">
          <table>
            <caption className="sr">Censos registrados para esta finca</caption>
            <thead>
              <tr>
                <th>Censo</th><th>Fecha del vuelo</th><th>Estado</th><th className="num">Reses</th>
                <th className="num">Peso prom.</th><th className="num">Peso total</th><th className="num">Conteo manual</th><th>Nota</th>
              </tr>
            </thead>
            <tbody>
              {censos.map((c) => {
                const pesoTotal = c.cantidad_animales != null && c.peso_estimado != null
                  ? Math.round(c.cantidad_animales * c.peso_estimado) : null;
                return (
                  <tr key={c.id_censo}>
                    <td><Link className="fila-link" to={`/fincas/${idFinca}/censos/${c.id_censo}`}>n.º {c.id_censo}</Link></td>
                    <td>{formatFecha(fechaDeCenso(c))}</td>
                    <td><StatusBadge estado={c.estado} /></td>
                    <td className="num">{c.cantidad_animales ?? "—"}</td>
                    <td className="num">{c.peso_estimado != null ? `${c.peso_estimado} kg` : "—"}</td>
                    <td className="num">{pesoTotal != null ? `${pesoTotal.toLocaleString("es-CO")} kg` : "—"}</td>
                    <td className="num">{c.conteo_manual ?? "—"}</td>
                    <td className="nota-celda" title={c.nota || ""}>{c.nota || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
