import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Icon from "../../components/ui/Icon.jsx";
import StatusBadge from "../../components/ui/StatusBadge.jsx";
import { AlertMessage, ButtonLink, LoadingState, StatCard } from "../../components/ui/SharedUI.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useDatosCuenta } from "../../hooks/useDatosCuenta.js";
import { obtenerResumenVacunacion } from "../../services/dashboardService.js";
import { esCompletado, fechaDeCenso, signo } from "../../utils/censos.js";
import { formatFecha, formatFechaLarga } from "../../utils/format.js";
import DetectionPreview from "./DetectionPreview.jsx";
import { BuenConteo, ComoFunciona, Pie } from "../../components/inicio/Secciones.jsx";

// Inicio dentro de la app (con sesión): presentación, último censo y panel general
export default function Inicio() {
  return (
    <>
      <div className="heroe">
        <div>
          <h1>Cuenta tu ganado con un video de dron</h1>
          <p className="bajada">
            Sube el video del vuelo y BioCenso detectará cada bovino, dando el total y comparándolo
            con el registro de tu finca.
          </p>
          <div className="heroe-acciones">
            <Link className="btn btn-brote" to="/censos">
              <span className="ico-circ"><Icon name="arrowUp" strokeWidth={2.4} /></span>Subir video del censo
            </Link>
            <Link className="btn btn-oscuro" to="/fincas">Ver mis fincas</Link>
          </div>
        </div>
        <DetectionPreview />
      </div>

      <PanelGeneral />
      <ComoFunciona />
      <BuenConteo />
      <Pie />
    </>
  );
}

function PanelGeneral() {
  const { usuario } = useAuth();
  const { cargando, error, fincas, censos } = useDatosCuenta();
  const [vacunacion, setVacunacion] = useState(null);

  useEffect(() => {
    obtenerResumenVacunacion().then(setVacunacion).catch(() => setVacunacion(null));
  }, []);

  if (cargando) return <LoadingState>Cargando el resumen de tus fincas...</LoadingState>;
  if (error) return <AlertMessage>{error}</AlertMessage>;

  const bovinos = fincas.reduce((total, f) => total + f.registrados, 0);
  const ultimo = censos.find(esCompletado);
  const fincaUltimo = ultimo && fincas.find((f) => String(f.id_finca) === String(ultimo.id_finca));
  const detectados = ultimo?.cantidad_animales;
  const diferencia = detectados != null && fincaUltimo ? detectados - fincaUltimo.registrados : null;

  return (
    <>
      <section className="panel ultimo" aria-labelledby="t-ultimo">
        <div>
          <h2 id="t-ultimo">Último censo</h2>
          {ultimo ? (
            <p className="meta">{ultimo.nombre_finca}, vuelo el {formatFechaLarga(fechaDeCenso(ultimo))}</p>
          ) : (
            <p className="meta">Todavía no hay censos. Sube tu primer video para ver aquí el resultado.</p>
          )}
          <ButtonLink to={ultimo ? "/censos#historial" : "/censos"} variant="outline" size="small">
            {ultimo ? "Ver historial" : "Subir video"}
          </ButtonLink>
        </div>
        {ultimo && (
          <>
            <dl className="dato"><dt>Detectados en el video</dt><dd>{detectados ?? "—"}</dd></dl>
            <dl className="dato"><dt>Registrados en la finca</dt><dd>{fincaUltimo?.registrados ?? "—"}</dd></dl>
            <dl className="dato"><dt>Diferencia</dt><dd className={diferencia === 0 ? "cero" : "pos"}>{signo(diferencia)}</dd></dl>
          </>
        )}
      </section>

      <section className="seccion" aria-labelledby="t-panel">
        <h2 id="t-panel">Hola{usuario?.nombre ? `, ${usuario.nombre}` : ""}</h2>
        <p className="bajada" style={{ marginTop: 6 }}>Consulta el estado de tus fincas y continúa con las tareas de gestión.</p>
        <div className="panel panel-pad bloque">
          <div className="cifras">
            <StatCard label="Fincas" value={fincas.length} description="Registradas en tu cuenta" />
            <StatCard label="Bovinos registrados" value={bovinos} description="Total de tus fincas" />
            <StatCard label="Censos realizados" value={censos.length} description="Incluye los que no se pudieron procesar" />
          </div>
          {fincas.length === 0 && (
            <div className="vacio-bloque">
              <h3>Empieza registrando una finca</h3>
              <p>Cuando registres tus fincas, aquí verás el resumen de bovinos y censos.</p>
              <ButtonLink to="/fincas/nueva">Registrar finca</ButtonLink>
            </div>
          )}
        </div>
      </section>

      <section className="bloque" aria-labelledby="t-vac">
        <div className="panel panel-pad">
          <div className="bloque-cab"><div><h2 id="t-vac">Resumen de vacunación</h2><p>Salud animal de todas tus fincas.</p></div></div>
          <div className="cifras">
            <StatCard label="Aplicaciones registradas" value={vacunacion?.total_aplicaciones ?? "—"} description="Según el historial de tus fincas" />
            <StatCard label="Animales vacunados" value={vacunacion?.animales_vacunados ?? "—"} description="Con al menos una aplicación" />
            <StatCard label="Próximas dosis" value={String(vacunacion?.proximas_dosis ?? "No calculable")} description="No hay fechas programadas" />
            <StatCard label="Vacunaciones vencidas" value={String(vacunacion?.vacunaciones_vencidas ?? "No calculable")} description="No hay intervalos de refuerzo" />
          </div>
          {vacunacion?.mensaje_programacion && <AlertMessage type="warning">{vacunacion.mensaje_programacion}</AlertMessage>}
        </div>
      </section>

      <div className="dos-col">
        <section className="panel panel-pad" aria-labelledby="t-rec">
          <div className="bloque-cab"><h2 id="t-rec">Censos recientes</h2><Link className="btn-texto" to="/censos#historial">Ver historial</Link></div>
          {censos.length ? (
            <ul className="lista-enl">
              {censos.slice(0, 5).map((c) => (
                <li key={c.id_censo}>
                  <Link to={`/fincas/${c.id_finca}/censos/${c.id_censo}`}>
                    <span className="ico"><Icon name="history" /></span>
                    <span>
                      <strong>Censo n.º {c.id_censo} · {c.nombre_finca}</strong>
                      <small>Vuelo del {formatFecha(fechaDeCenso(c))}{c.cantidad_animales != null ? ` · ${c.cantidad_animales} bovinos` : ""}</small>
                    </span>
                    <StatusBadge estado={c.estado} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="sub">Todavía no hay censos registrados. Cuando crees uno, aparecerá aquí.</p>
          )}
        </section>
        <section className="panel panel-pad" aria-labelledby="t-acc">
          <div className="bloque-cab"><h2 id="t-acc">Accesos rápidos</h2></div>
          <ul className="lista-enl">
            <Acceso to="/fincas" icono="mapPin" titulo="Gestionar fincas" texto="Consultar propiedades y bovinos" />
            <Acceso to="/fincas/nueva" icono="plus" titulo="Registrar finca" texto="Agregar una propiedad a tu cuenta" />
            <Acceso to="/censos" icono="arrowUp" titulo="Crear censo" texto="Selecciona una finca y carga su video" />
            {fincas.slice(0, 3).map((f) => (
              <Acceso key={f.id_finca} to={`/fincas/${f.id_finca}/dashboard`} icono="barras" titulo={`Panel de ${f.nombre}`}
                texto={[f.municipio, f.departamento].filter(Boolean).join(", ")} />
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}

function Acceso({ to, icono, titulo, texto }) {
  return (
    <li>
      <Link to={to}>
        <span className="ico"><Icon name={icono} /></span>
        <span><strong>{titulo}</strong><small>{texto}</small></span>
        <Icon name="chevronDown" className="flecha" />
      </Link>
    </li>
  );
}
