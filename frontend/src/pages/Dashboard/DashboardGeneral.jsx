import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Icon from "../../components/ui/Icon.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { listarCensosDeFinca } from "../../services/censoService.js";
import { obtenerResumen, obtenerResumenVacunacion } from "../../services/dashboardService.js";
import { listarFincas } from "../../services/fincaService.js";
import { extraerError } from "../../utils/errores.js";
import { fechaHora } from "../../utils/censos.js";
import { AlertMessage, StatCard } from "../../components/ui/SharedUI.jsx";
import StatusBadge from "../../components/ui/StatusBadge.jsx";

const vacio = {
  fincas: [],
  resumenes: [],
  vacunacion: null,
  actividad: [],
};

function valorAgregado(resumenes, propiedad) {
  if (resumenes.length === 0) return 0;
  if (resumenes.some((resumen) => resumen?.[propiedad] == null)) return null;
  return resumenes.reduce((total, resumen) => total + Number(resumen[propiedad]), 0);
}

export default function DashboardGeneral() {
  const { usuario } = useAuth();
  const [datos, setDatos] = useState(vacio);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let vigente = true;
    async function cargar() {
      try {
        const [fincas, vacunacion] = await Promise.all([
          listarFincas(),
          obtenerResumenVacunacion(),
        ]);
        const resumenesPorFinca = await Promise.all(fincas.map(async (finca) => {
          const [resumen, censos] = await Promise.all([
            obtenerResumen(finca.id_finca),
            listarCensosDeFinca(finca.id_finca),
          ]);
          return {
            finca,
            resumen,
            censos: censos.map((censo) => ({ ...censo, nombre_finca: finca.nombre })),
          };
        }));
        if (!vigente) return;
        const actividad = resumenesPorFinca
          .flatMap(({ finca, censos }) => censos.map((censo) => ({
            ...censo,
            id_finca: finca.id_finca,
            nombre_finca: finca.nombre,
          })))
          .sort((a, b) => new Date(b.fecha_procesamiento) - new Date(a.fecha_procesamiento))
          .slice(0, 5);
        setDatos({
          fincas,
          resumenes: resumenesPorFinca.map(({ resumen }) => resumen),
          vacunacion,
          actividad,
        });
      } catch (err) {
        if (vigente) setError(extraerError(err));
      } finally {
        if (vigente) setCargando(false);
      }
    }
    cargar();
    return () => { vigente = false; };
  }, []);

  const animales = valorAgregado(datos.resumenes, "total_bovinos_registrados");
  const censos = valorAgregado(datos.resumenes, "numero_censos");

  return (
    <div className="bc-dashboard-home">
      <header className="bc-dashboard-welcome">
        <div>
          <span className="bc-module-eyebrow">Panel general</span>
          <h1>Hola{usuario?.nombre ? `, ${usuario.nombre}` : ""}</h1>
          <p>Consulta el estado de tus fincas y continúa con las tareas de gestión.</p>
        </div>
        <Link to="/censos/nuevo" className="bc-btn bc-btn-primary">
          <Icon name="plus" size={18} /> Registrar censo
        </Link>
      </header>

      {error && <AlertMessage>{error}</AlertMessage>}

      <section className="bc-dashboard-stats" aria-label="Indicadores del sistema">
        <StatCard icon="home" label="Fincas" value={cargando ? "—" : datos.fincas.length}
          description="Registradas en tu cuenta" />
        <StatCard icon="user" label="Bovinos registrados" value={cargando ? "—" : animales}
          description="Total de tus fincas" />
        <StatCard icon="calendar" label="Censos realizados" value={cargando ? "—" : censos}
          description="Según el resumen de cada finca" />
      </section>

      <section className="bc-dashboard-vaccination" aria-labelledby="dashboard-vacunacion-title">
        <div className="bc-dashboard-section__heading">
          <div>
            <span className="bc-module-eyebrow">Salud animal</span>
            <h2 id="dashboard-vacunacion-title">Resumen de vacunación</h2>
          </div>
        </div>
        <div className="bc-dashboard-stats" aria-label="Indicadores de vacunación">
          <StatCard icon="check" label="Aplicaciones registradas"
            value={cargando ? "—" : datos.vacunacion?.total_aplicaciones}
            description="Según el historial de tus fincas" />
          <StatCard icon="user" label="Animales vacunados"
            value={cargando ? "—" : datos.vacunacion?.animales_vacunados}
            description="Con al menos una aplicación registrada" />
          <StatCard icon="calendar" label="Próximas dosis"
            value={cargando ? "—" : datos.vacunacion?.proximas_dosis ?? "No calculable"}
            description="No hay fechas programadas" />
          <StatCard icon="alert" label="Vacunaciones vencidas"
            value={cargando ? "—" : datos.vacunacion?.vacunaciones_vencidas ?? "No calculable"}
            description="No hay intervalos de refuerzo" />
        </div>
        {!cargando && datos.vacunacion?.mensaje_programacion && (
          <AlertMessage type="warning" className="bc-dashboard-vaccination__notice">
            {datos.vacunacion.mensaje_programacion}
          </AlertMessage>
        )}
      </section>

      {!cargando && !error && datos.fincas.length === 0 && (
        <div className="bc-card bc-dashboard-empty">
          <span className="bc-farms-empty-icon"><Icon name="home" size={24} /></span>
          <h2>Empieza registrando una finca</h2>
          <p>Cuando registres tus fincas, aquí verás el resumen de bovinos y censos.</p>
          <Link to="/fincas/nueva" className="bc-btn bc-btn-primary">Registrar finca</Link>
        </div>
      )}

      <div className="bc-dashboard-columns">
        <section className="bc-card bc-dashboard-section" aria-labelledby="dashboard-quick-title">
          <div className="bc-dashboard-section__heading">
            <div><span className="bc-module-eyebrow">Operaciones</span><h2 id="dashboard-quick-title">Accesos rápidos</h2></div>
          </div>
          <div className="bc-dashboard-actions">
            <Link to="/fincas" className="bc-dashboard-action">
              <span><Icon name="home" size={20} /></span>
              <div><strong>Gestionar fincas</strong><small>Consultar propiedades y bovinos</small></div>
              <b aria-hidden="true">→</b>
            </Link>
            <Link to="/fincas/nueva" className="bc-dashboard-action">
              <span><Icon name="plus" size={20} /></span>
              <div><strong>Registrar finca</strong><small>Agregar una propiedad a tu cuenta</small></div>
              <b aria-hidden="true">→</b>
            </Link>
            <Link to="/censos/nuevo" className="bc-dashboard-action">
              <span><Icon name="upload" size={20} /></span>
              <div><strong>Crear censo</strong><small>Selecciona una finca y carga su archivo</small></div>
              <b aria-hidden="true">→</b>
            </Link>
          </div>
        </section>

        <section className="bc-card bc-dashboard-section" aria-labelledby="dashboard-farms-title">
          <div className="bc-dashboard-section__heading">
            <div><span className="bc-module-eyebrow">Propiedades</span><h2 id="dashboard-farms-title">Tus fincas</h2></div>
            <Link to="/fincas" className="bc-dashboard-text-link">Ver todas</Link>
          </div>
          {cargando && <p className="bc-dashboard-placeholder" role="status">Cargando fincas...</p>}
          {!cargando && !error && datos.fincas.length === 0 && (
            <p className="bc-dashboard-placeholder">Aún no hay fincas registradas.</p>
          )}
          {!cargando && datos.fincas.slice(0, 4).map((finca) => (
            <Link key={finca.id_finca} to={`/fincas/${finca.id_finca}`} className="bc-dashboard-farm-link">
              <span className="bc-farms-stat__icon"><Icon name="mapPin" size={18} /></span>
              <span><strong>{finca.nombre}</strong><small>{[finca.municipio, finca.departamento].filter(Boolean).join(", ")}</small></span>
              <b aria-hidden="true">→</b>
            </Link>
          ))}
        </section>
      </div>

      <section className="bc-card bc-dashboard-section bc-dashboard-activity" aria-labelledby="dashboard-activity-title">
        <div className="bc-dashboard-section__heading">
          <div><span className="bc-module-eyebrow">Seguimiento</span><h2 id="dashboard-activity-title">Censos recientes</h2></div>
        </div>
        {cargando && <p className="bc-dashboard-placeholder" role="status">Cargando actividad...</p>}
        {!cargando && !error && datos.actividad.length === 0 && (
          <div className="bc-dashboard-placeholder">
            Todavía no hay censos registrados. Cuando crees uno, aparecerá aquí.
          </div>
        )}
        {!cargando && datos.actividad.length > 0 && (
          <div className="bc-dashboard-activity-list">
            {datos.actividad.map((censo) => (
              <Link
                key={`${censo.id_finca}-${censo.id_censo}`}
                to={`/fincas/${censo.id_finca}/censos/${censo.id_censo}`}
                className="bc-dashboard-activity-item"
              >
                <span className="bc-dashboard-activity-item__icon"><Icon name="history" size={18} /></span>
                <span className="bc-dashboard-activity-item__main">
                  <strong>Censo n.º {censo.id_censo} · {censo.nombre_finca}</strong>
                  <small>{fechaHora(censo.fecha_procesamiento)}</small>
                </span>
                <StatusBadge estado={censo.estado} />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
