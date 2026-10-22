import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { obtenerResumen } from "../../services/dashboardService.js";
import { obtenerFinca } from "../../services/fincaService.js";
import { listarCensosDeFinca } from "../../services/censoService.js";
import { extraerError } from "../../utils/errores.js";
import { esCompletado, fechaDeCenso, ordenarCensos, signo } from "../../utils/censos.js";
import { formatFecha } from "../../utils/format.js";
import { ButtonLink, LoadingState, PageHeader, StatCard } from "../../components/ui/SharedUI.jsx";
import GraficoEvolucion, { COLOR_IA, COLOR_MANUAL } from "../../components/censos/GraficoEvolucion.jsx";

function formatearTiempo(s) {
  if (s == null) return "—";
  return Number(s) < 1 ? "menos de 1 s" : `${Number(s).toFixed(1)} s`;
}

export default function Dashboard() {
  const { id } = useParams();
  const [datos, setDatos] = useState({ id: null, finca: null, resumen: null, censos: [], error: "" });
  const cargando = String(datos.id) !== String(id);

  useEffect(() => {
    let vigente = true;
    Promise.all([obtenerFinca(id), obtenerResumen(id), listarCensosDeFinca(id)])
      .then(([finca, resumen, censos]) => {
        if (vigente) setDatos({ id, finca, resumen, censos, error: "" });
      })
      .catch((err) => {
        if (vigente) {
          setDatos({ id, finca: null, resumen: null, censos: [],
            error: err.response?.status === 404 ? "Finca no encontrada." : extraerError(err) });
        }
      });
    return () => { vigente = false; };
  }, [id]);

  // Del más antiguo al más reciente para el gráfico
  const puntos = useMemo(
    () => ordenarCensos(datos.censos.filter(esCompletado)).reverse()
      .map((c) => ({ id: c.id_censo, fecha: fechaDeCenso(c), ia: c.cantidad_animales, manual: c.conteo_manual })),
    [datos.censos]
  );

  if (cargando) return <LoadingState>Cargando panel...</LoadingState>;
  if (datos.error) {
    return (
      <div className="panel panel-solido vacio-bloque" style={{ marginTop: 40 }}>
        <h3>{datos.error}</h3>
        <ButtonLink to="/fincas">Volver a mis fincas</ButtonLink>
      </div>
    );
  }

  const { finca, resumen } = datos;
  const ultimo = ordenarCensos(datos.censos.filter(esCompletado))[0];
  const ia = ultimo?.cantidad_animales ?? null;
  const manual = ultimo?.conteo_manual ?? null;
  const pesoTotal = ia != null && ultimo?.peso_estimado != null ? Math.round(ia * ultimo.peso_estimado) : null;

  return (
    <>
      <PageHeader
        migas={[{ texto: "Fincas", ruta: "/fincas" }, { texto: finca.nombre, ruta: `/fincas/${id}` }, { texto: "Panel" }]}
        title={`Panel de ${finca.nombre}`}
        description="Resumen y evolución de los censos de la finca."
        action={<ButtonLink to={`/fincas/${id}`} variant="outline">Ver finca y bovinos</ButtonLink>}
      />

      <section className="panel panel-pad bloque">
        <div className="cifras">
          <StatCard label="Animales registrados" value={resumen?.total_bovinos_registrados ?? 0} />
          <StatCard label="Censos realizados" value={datos.censos.length} description={`${puntos.length} completados`} />
          <StatCard label="Tiempo promedio de análisis" value={formatearTiempo(resumen?.tiempo_promedio_procesamiento)} />
        </div>
      </section>

      {ultimo ? (
        <>
          <section className="panel panel-pad bloque" aria-labelledby="t-ult">
            <div className="bloque-cab">
              <h2 id="t-ult">Último censo</h2>
              <ButtonLink to={`/fincas/${id}/censos/${ultimo.id_censo}`} variant="outline" size="small">Ver detalle</ButtonLink>
            </div>
            <div className="cifras">
              <StatCard label="Conteo de la IA" value={ia ?? "—"} unit="animales" description={`Vuelo del ${formatFecha(fechaDeCenso(ultimo))}`} />
              <StatCard label="Peso total estimado" value={pesoTotal != null ? pesoTotal.toLocaleString("es-CO") : "—"} unit="kg"
                description={ultimo.peso_estimado != null ? `${ultimo.peso_estimado} kg por res en promedio` : null} />
              <StatCard label="Conteo manual" value={manual ?? "—"} unit={manual != null ? "animales" : undefined}
                description={manual == null ? "Sin registrar" : null} />
              <StatCard label="Diferencia (IA − manual)" value={signo(ia != null && manual != null ? ia - manual : null)} />
            </div>
          </section>

          <section className="panel panel-solido panel-pad bloque" aria-labelledby="t-evo">
            <h2 id="t-evo">Evolución del conteo</h2>
            <p className="sub">Conteo de la IA frente al conteo manual en cada censo. Los censos sin conteo manual solo muestran el punto de la IA.</p>
            <div className="leyenda" aria-hidden="true">
              <span><i style={{ background: COLOR_IA }} />Conteo de la IA</span>
              <span><i style={{ background: COLOR_MANUAL }} />Conteo manual</span>
            </div>
            <GraficoEvolucion puntos={puntos} />
            <p className="pista" style={{ marginTop: 10 }}>
              Los mismos datos están en la tabla de censos de la <Link className="enlace" to={`/fincas/${id}`}>ficha de la finca</Link>.
            </p>
          </section>
        </>
      ) : (
        <div className="panel panel-solido bloque vacio-bloque">
          <h3>Aún no hay censos completados en esta finca</h3>
          <p>Sube un video del dron para ver aquí la evolución del conteo.</p>
          <ButtonLink to={`/censos?finca=${id}`}>Nuevo censo</ButtonLink>
        </div>
      )}
    </>
  );
}
