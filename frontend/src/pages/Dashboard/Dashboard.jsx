import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { obtenerEvolucion, obtenerResumen } from "../../services/dashboardService.js";
import { fechaHora } from "../../utils/censos.js";
import { extraerError } from "../../utils/errores.js";
import { StatCard } from "../../components/ui/SharedUI.jsx";

const COLOR_IA = "#245c3a";
const COLOR_MANUAL = "#d89b24";
const EVOLUCION_VACIA = [];

const etiquetaCorta = (v) =>
  new Date(v).toLocaleString("es-CO", {
    day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
  });

function formatearTiempo(s) {
  if (s == null) return "—";
  return Number(s) < 1 ? "menos de 1 s" : `${Number(s).toFixed(1)} s`;
}

function Tarjeta({ etiqueta, valor, unidad, pista, verde }) {
  return (
    <StatCard
      label={etiqueta}
      value={valor}
      unit={unidad}
      description={pista}
      tone={verde ? "accent" : ""}
    />
  );
}

export default function Dashboard() {
  const { id } = useParams();
  const [resultado, setResultado] = useState({
    id: null, resumen: null, evolucion: [], error: "",
  });
  const cargando = String(resultado.id) !== String(id);
  const resumen = cargando ? null : resultado.resumen;
  const evolucion = cargando ? EVOLUCION_VACIA : resultado.evolucion;
  const error = cargando ? "" : resultado.error;

  useEffect(() => {
    let vigente = true;
    Promise.all([obtenerResumen(id), obtenerEvolucion(id)])
      .then(([r, e]) => {
        if (vigente) setResultado({ id, resumen: r, evolucion: e, error: "" });
      })
      .catch((err) => {
        if (vigente) {
          setResultado({
            id,
            resumen: null,
            evolucion: [],
            error: err.response?.status === 404 ? "Finca no encontrada." : extraerError(err),
          });
        }
      });
    return () => { vigente = false; };
  }, [id]);

  // Orden cronológico y etiqueta para el eje X
  const datos = useMemo(
    () =>
      [...evolucion]
        .sort((a, b) => new Date(a.fecha_procesamiento) - new Date(b.fecha_procesamiento))
        .map((p) => ({
          ...p,
          etiqueta: etiquetaCorta(p.fecha_procesamiento),
          fechaCompleta: fechaHora(p.fecha_procesamiento),
        })),
    [evolucion]
  );

  const diferencia = resumen?.diferencia_ultimo_censo;
  const hayCensos = (resumen?.numero_censos ?? 0) > 0;
  const pesoTotalUltimo =
    resumen?.peso_total_estimado_ultimo_censo ??
    (resumen?.cantidad_detectada_ultimo_censo != null && resumen?.peso_estimado_ultimo_censo != null
      ? Math.round(resumen.cantidad_detectada_ultimo_censo * resumen.peso_estimado_ultimo_censo * 10) / 10
      : null);

  return (
    <>
      <Link to={`/fincas/${id}`} className="bc-back">← Volver a la finca</Link>
      <div className="bc-page-head mt-3"><h1>Panel de la finca</h1></div>

      {cargando && <p className="bc-empty">Cargando panel...</p>}
      {error && <div className="bc-alert-error" role="alert">{error}</div>}

      {resumen && (
        <>
          {/* Resumen general */}
          <div className="row g-3 mb-3">
            <div className="col-6 col-lg-4">
              <Tarjeta etiqueta="Animales registrados" valor={resumen.total_bovinos_registrados ?? 0} />
            </div>
            <div className="col-6 col-lg-4">
              <Tarjeta etiqueta="Censos realizados" valor={resumen.numero_censos ?? 0} />
            </div>
            <div className="col-12 col-lg-4">
              <Tarjeta
                etiqueta="Tiempo promedio de análisis"
                valor={formatearTiempo(resumen.tiempo_promedio_procesamiento)}
              />
            </div>
          </div>

          {/* Último censo */}
          {hayCensos ? (
            <>
              <div className="bc-section-head" style={{ marginTop: "1.5rem" }}>
                <h2>Último censo</h2>
                {resumen.id_ultimo_censo && (
                  <Link
                    to={`/fincas/${id}/censos/${resumen.id_ultimo_censo}`}
                    className="bc-btn bc-btn-outline bc-btn-sm"
                  >
                    Ver detalle
                  </Link>
                )}
              </div>
              <div className="row g-3 mb-4">
                <div className="col-6 col-lg-3">
                  <Tarjeta
                    etiqueta="Conteo de la IA" verde unidad="animales"
                    valor={resumen.cantidad_detectada_ultimo_censo ?? "—"}
                    pista={resumen.fecha_ultimo_censo ? fechaHora(resumen.fecha_ultimo_censo) : null}
                  />
                </div>
                <div className="col-6 col-lg-3">
                  <Tarjeta
                    etiqueta="Peso total estimado" verde unidad="kg"
                    valor={pesoTotalUltimo != null ? pesoTotalUltimo.toLocaleString("es-CO") : "—"}
                    pista={resumen.peso_estimado_ultimo_censo != null ? `${resumen.peso_estimado_ultimo_censo} kg/res prom.` : null}
                  />
                </div>
                <div className="col-6 col-lg-3">
                  <Tarjeta
                    etiqueta="Conteo manual" unidad="animales"
                    valor={resumen.conteo_manual_ultimo_censo ?? "—"}
                    pista={resumen.conteo_manual_ultimo_censo == null ? "Sin registrar" : null}
                  />
                </div>
                <div className="col-6 col-lg-3">
                  <Tarjeta
                    etiqueta="Diferencia (IA − manual)"
                    valor={diferencia == null ? "—" : diferencia > 0 ? `+${diferencia}` : diferencia}
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="bc-card bc-empty mb-4">
              <h2>Aún no hay censos en esta finca</h2>
              <p>Sube un video del dron para ver aquí la evolución del conteo.</p>
              <Link to={`/censos/nuevo?finca=${id}`} className="bc-btn bc-btn-primary">
                Nuevo censo
              </Link>
            </div>
          )}

          {/* Evolución */}
          {datos.length > 0 && (
            <div className="bc-card bc-chart-card">
              <h2>Evolución del conteo</h2>
              <p className="bc-sub">
                Conteo de la IA frente al conteo manual en cada censo. Los censos sin conteo
                manual solo muestran el punto de la IA.
              </p>
              <div className="bc-chart-box">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={datos} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
                    <CartesianGrid stroke="#e4e9e4" strokeDasharray="3 3" />
                    <XAxis dataKey="etiqueta" stroke="#667085" tick={{ fontSize: 12 }} />
                    <YAxis stroke="#667085" tick={{ fontSize: 12 }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        background: "#ffffff", border: "1px solid #e4e9e4",
                        borderRadius: 12, color: "#344054",
                      }}
                      labelFormatter={(_, payload) =>
                        payload?.[0]?.payload
                          ? `Censo n.º ${payload[0].payload.id_censo} · ${payload[0].payload.fechaCompleta}`
                          : ""
                      }
                    />
                    <Legend />
                    <Line
                      type="monotone" dataKey="cantidad_animales" name="Conteo de la IA"
                      stroke={COLOR_IA} strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }}
                    />
                    <Line
                      type="monotone" dataKey="conteo_manual" name="Conteo manual"
                      stroke={COLOR_MANUAL} strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }}
                      connectNulls={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
