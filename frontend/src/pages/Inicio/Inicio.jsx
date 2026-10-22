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

const PASOS = [
  ["Vuela sobre el potrero", "Graba tu finca con el dron a unos 30 a 50 metros de altura y con luz suave."],
  ["Sube el video", "En Censo elige la finca, la fecha del vuelo y el archivo del video."],
  ["Recibe el conteo", "El modelo de visión por computadora detecta cada bovino y suma el total. El resultado queda guardado en tu historial."],
  ["Compara con tu registro", "En Fincas registra cada animal y revisa si el conteo del dron coincide con tu inventario."],
];

const CONSEJOS = [
  ["altura", "Altura de vuelo", "Entre 30 y 50 metros: los animales se ven completos y con buen detalle."],
  ["recorrido", "Recorrido", "Avanza en líneas paralelas y no pases dos veces por la misma zona, así no se cuenta dos veces a un animal."],
  ["sun", "Luz", "Graba a primera hora o con cielo nublado para evitar sombras fuertes."],
  ["video", "Formato del video", "Sube el archivo en MP4, tal como sale del dron."],
];

const COMPARACION = [
  ["Método", "Recorrido a pie o a caballo", "Video aéreo con dron"],
  ["Tiempo de la jornada", "Depende del tamaño del potrero", "Depende de la duración del vuelo"],
  ["Registro de resultados", "Cuaderno u hojas sueltas", "Base de datos centralizada"],
  ["Peso del hato", "Báscula o cálculo a ojo", "Peso estimado por res y total"],
  ["Historial de censos", "Difícil de consultar", "Gráficas de evolución"],
];

export default function Inicio() {
  const { autenticado } = useAuth();

  return (
    <>
      <div className="heroe">
        <div>
          <h1>Cuenta tu ganado con un video de dron</h1>
          <p className="bajada">
            Sube el video del vuelo y BioCenso detectará cada bovino, dando el total y comparándolo
            con el registro de tu finca.
          </p>
          {/* Subir videos exige sesión: sin ella, los botones llevan a iniciar sesión o crear cuenta */}
          {autenticado ? (
            <div className="heroe-acciones">
              <Link className="btn btn-brote" to="/censos">
                <span className="ico-circ"><Icon name="arrowUp" strokeWidth={2.4} /></span>Subir video del censo
              </Link>
              <Link className="btn btn-oscuro" to="/fincas">Ver mis fincas</Link>
            </div>
          ) : (
            <div className="heroe-acciones">
              <Link className="btn btn-brote" to="/login" state={{ from: { pathname: "/censos" } }}>
                <span className="ico-circ"><Icon name="user" strokeWidth={2.2} /></span>Iniciar sesión para subir un video
              </Link>
              <Link className="btn btn-oscuro" to="/registro">Crear cuenta</Link>
            </div>
          )}
        </div>
        <DetectionPreview />
      </div>

      {autenticado && <PanelGeneral />}

      <section className="seccion" id="como-funciona" aria-labelledby="t-como">
        <h2 id="t-como">¿Cómo funciona?</h2>
        <ol className="panel pasos">
          {PASOS.map(([titulo, texto], i) => (
            <li className="paso" key={titulo}>
              <span className="paso-num">{i + 1}</span>
              <h3>{titulo}</h3>
              <p>{texto}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="seccion" aria-labelledby="t-consejos">
        <h2 id="t-consejos">Para un buen conteo</h2>
        <div className="panel consejos">
          {CONSEJOS.map(([icono, titulo, texto]) => (
            <div className="consejo" key={titulo}>
              <h3><Icon name={icono} />{titulo}</h3>
              <p>{texto}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="seccion comparacion" id="comparacion" aria-labelledby="t-comp">
        <h2 id="t-comp">Conteo manual vs. BioCenso</h2>
        <div className="tabla-caja" style={{ marginTop: 22 }}>
          <table>
            <thead><tr><th>Criterio</th><th>Conteo manual</th><th className="bc">BioCenso</th></tr></thead>
            <tbody>
              {COMPARACION.map(([criterio, manual, bc]) => (
                <tr key={criterio}><td>{criterio}</td><td>{manual}</td><td className="bc">{bc}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {!autenticado && (
        <section className="panel panel-solido llamado" aria-labelledby="t-llamado">
          <div>
            <h2 id="t-llamado">Lleva el registro de tu finca</h2>
            <p>Crea tu cuenta para subir tus censos, registrar cada bovino y llevar sus vacunas. Solo tú ves la información de tus fincas.</p>
          </div>
          <div className="acciones">
            <ButtonLink to="/registro">Crear cuenta</ButtonLink>
            <ButtonLink to="/login" variant="outline">Iniciar sesión</ButtonLink>
          </div>
        </section>
      )}

      <footer className="pie">BioCenso · Trabajo de grado · Universidad Cooperativa de Colombia, Villavicencio</footer>
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
