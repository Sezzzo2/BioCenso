import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { extraerError } from "../../utils/errores.js";
import { listarCensosDeFinca } from "../../services/censoService.js";
import StatusBadge from "../ui/StatusBadge.jsx";
import { AlertMessage, EmptyState, LoadingState, TableContainer } from "../ui/SharedUI.jsx";

const fechaHora = (v) =>
  v ? new Date(v).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" }) : "—";

export default function CensosDeFinca({ idFinca }) {
  const [resultado, setResultado] = useState({ idFinca: null, censos: [], error: "" });
  const cargando = String(resultado.idFinca) !== String(idFinca);
  const censos = cargando ? [] : resultado.censos;
  const error = cargando ? "" : resultado.error;

  useEffect(() => {
    let vigente = true;
    listarCensosDeFinca(idFinca)
      .then((lista) => {
        if (!vigente) return;
        setResultado({
          idFinca,
          censos: [...lista].sort(
            (a, b) => new Date(b.fecha_procesamiento) - new Date(a.fecha_procesamiento)
          ),
          error: "",
        });
      })
      .catch((err) => {
        if (vigente) setResultado({ idFinca, censos: [], error: extraerError(err) });
      });
    return () => { vigente = false; };
  }, [idFinca]);

  return (
    <>
      <div className="bc-section-head">
        <div>
          <span className="bc-module-eyebrow">Historial de la propiedad</span>
          <h2>Censos {!cargando && !error && `(${censos.length})`}</h2>
          <p className="bc-section-description">Consulta la fecha, las reses detectadas y el peso mínimo estimado en cada censo.</p>
        </div>
        <Link to={`/censos/nuevo?finca=${idFinca}`} className="bc-btn bc-btn-primary">
          Registrar censo
        </Link>
      </div>

      {cargando && <LoadingState>Cargando censos...</LoadingState>}
      {error && <AlertMessage>{error}</AlertMessage>}

      {!cargando && !error && censos.length === 0 && (
        <EmptyState
          title="Esta finca aún no tiene censos"
          description="Carga una imagen o video para iniciar el primer censo con Gemini 3.8 Flash."
          icon="calendar"
        />
      )}

      {censos.length > 0 && (
        <div className="bc-card bc-census-table-card">
          <TableContainer>
            <table className="bc-table">
              <caption className="visually-hidden">Censos registrados para esta finca</caption>
              <thead>
                <tr>
                  <th>Censo</th>
                  <th>Fecha</th>
                  <th>Estado</th>
                  <th>Reses (IA mín.)</th>
                  <th>Peso prom. (mín.)</th>
                  <th>Peso total (mín.)</th>
                  <th>Conteo manual</th>
                  <th>Nota</th>
                </tr>
              </thead>
              <tbody>
                {censos.map((c) => {
                  const pesoTotal =
                    c.peso_total_estimado ??
                    (c.cantidad_animales != null && c.peso_estimado != null
                      ? Math.round(c.cantidad_animales * c.peso_estimado * 10) / 10
                      : null);
                  return (
                    <tr key={c.id_censo}>
                      <td><strong>#{c.id_censo}</strong></td>
                      <td>
                        <Link to={`/fincas/${idFinca}/censos/${c.id_censo}`} className="bc-rowlink">
                          {fechaHora(c.fecha_procesamiento)}
                        </Link>
                      </td>
                      <td><StatusBadge estado={c.estado} /></td>
                      <td><strong>{c.cantidad_animales ?? "—"}</strong></td>
                      <td>{c.peso_estimado != null ? `${c.peso_estimado} kg` : "—"}</td>
                      <td>{pesoTotal != null ? `${pesoTotal.toLocaleString("es-CO")} kg` : "—"}</td>
                      <td>{c.conteo_manual ?? "—"}</td>
                      <td className="bc-note-cell" title={c.nota || ""}>{c.nota || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableContainer>
        </div>
      )}
    </>
  );
}
