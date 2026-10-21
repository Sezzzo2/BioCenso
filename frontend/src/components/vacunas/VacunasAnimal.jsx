import { useCallback, useEffect, useMemo, useState } from "react";
import {
  aplicarVacuna, crearVacuna, eliminarAplicacion, idVacuna,
  listarVacunas, listarVacunasDeAnimal,
} from "../../services/vacunasService.js";
import { extraerError } from "../../utils/errores.js";
import Icon from "../ui/Icon.jsx";
import "./vacunas.css";

const hoy = () => new Date().toISOString().slice(0, 10);
const fechaCorta = (v) => (v ? String(v).slice(0, 10) : "—");

export default function VacunasAnimal({ idAnimal }) {
  const [aplicaciones, setAplicaciones] = useState([]);
  const [catalogo, setCatalogo] = useState([]);
  const [idCargado, setIdCargado] = useState(null);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [busqueda, setBusqueda] = useState("");

  const [seleccion, setSeleccion] = useState("");
  const [fecha, setFecha] = useState(hoy());
  const [enviando, setEnviando] = useState(false);

  const [mostrarNueva, setMostrarNueva] = useState(false);
  const [nombreNueva, setNombreNueva] = useState("");
  const [creando, setCreando] = useState(false);
  const [erroresCampos, setErroresCampos] = useState({});
  const cargando = String(idCargado) !== String(idAnimal);

  const cargarAplicaciones = useCallback(() => listarVacunasDeAnimal(idAnimal), [idAnimal]);
  const cargarCatalogo = useCallback(() => listarVacunas(), []);
  const aplicacionesFiltradas = useMemo(() => {
    const termino = busqueda.trim().toLocaleLowerCase("es");
    if (!termino) return aplicaciones;
    return aplicaciones.filter((aplicacion) =>
      [aplicacion.nombre, aplicacion.fecha]
        .some((valor) => String(valor ?? "").toLocaleLowerCase("es").includes(termino))
    );
  }, [aplicaciones, busqueda]);

  useEffect(() => {
    let vigente = true;
    Promise.all([cargarAplicaciones(), cargarCatalogo()])
      .then(([aplicacionesCargadas, catalogoCargado]) => {
        if (vigente) {
          setAplicaciones(aplicacionesCargadas);
          setCatalogo(catalogoCargado);
          setError("");
          setIdCargado(idAnimal);
        }
      })
      .catch((err) => {
        if (vigente) {
          setError(extraerError(err));
          setIdCargado(idAnimal);
        }
      });
    return () => { vigente = false; };
  }, [cargarAplicaciones, cargarCatalogo, idAnimal]);

  const aplicar = async (e) => {
    e.preventDefault();
    setError("");
    setOk("");
    const nuevosErrores = {};
    if (!seleccion) nuevosErrores.vacuna = "Selecciona una vacuna.";
    if (!fecha) nuevosErrores.fecha = "Indica la fecha de aplicación.";
    else if (fecha > hoy()) nuevosErrores.fecha = "La fecha no puede ser futura.";
    setErroresCampos(nuevosErrores);
    if (Object.keys(nuevosErrores).length > 0) return;

    setEnviando(true);
    try {
      await aplicarVacuna({ idAnimal, idVacuna: seleccion, fecha });
      setAplicaciones(await cargarAplicaciones());
      setSeleccion("");
      setOk("Vacuna registrada.");
    } catch (err) {
      setError(extraerError(err));
    } finally {
      setEnviando(false);
    }
  };

  const agregarAlCatalogo = async () => {
    setError("");
    setOk("");
    const nombre = nombreNueva.trim();
    if (nombre.length < 2) return setError("Escribe el nombre de la vacuna.");

    setCreando(true);
    try {
      await crearVacuna(nombre);
      const lista = await listarVacunas();
      setCatalogo(lista);
      // Deja seleccionada la que se acaba de crear
      const creada = lista.find((v) => v.nombre?.toLowerCase() === nombre.toLowerCase());
      if (creada) setSeleccion(String(idVacuna(creada)));
      setNombreNueva("");
      setMostrarNueva(false);
      setOk("Vacuna agregada al catálogo.");
    } catch (err) {
      setError(extraerError(err));
    } finally {
      setCreando(false);
    }
  };

  const borrar = async (a) => {
    if (!window.confirm(`¿Eliminar el registro de "${a.nombre}" del ${fechaCorta(a.fecha)}?`)) return;
    setError("");
    setOk("");
    try {
      await eliminarAplicacion(a.id);
      setAplicaciones(await cargarAplicaciones());
      setOk("Registro eliminado.");
    } catch (err) {
      setError(extraerError(err));
    }
  };

  return (
    <>
      <div className="bc-section-head bc-vaccine-module-heading">
        <div>
          <span className="bc-module-eyebrow">Salud y seguimiento</span>
          <h2>Gestión de vacunas</h2>
          <p className="bc-animal-section-subtitle">
            Registra aplicaciones y consulta el historial de este animal.
          </p>
        </div>
      </div>

      {!cargando && error && <div className="bc-alert-error" role="alert">{error}</div>}
      {ok && <div className="bc-alert-ok" role="status">{ok}</div>}

      {!cargando && !error && (
        <div className="bc-vaccine-summary" aria-label="Resumen de vacunación">
          <article className="bc-vaccine-stat">
            <span className="bc-vaccine-stat__icon" aria-hidden="true"><Icon name="check" size={19} /></span>
            <div><span>Aplicaciones registradas</span><strong>{aplicaciones.length}</strong></div>
          </article>
          <article className="bc-vaccine-stat">
            <span className="bc-vaccine-stat__icon" aria-hidden="true"><Icon name="history" size={19} /></span>
            <div><span>Tipos en el catálogo</span><strong>{catalogo.length}</strong></div>
          </article>
        </div>
      )}

      <form className="bc-card bc-vaccine-form" onSubmit={aplicar} noValidate>
        <div className="bc-vaccine-card-heading">
          <div>
            <span className="bc-module-eyebrow">Registro sanitario</span>
            <h3>Registrar vacunación</h3>
            <p>Selecciona una vacuna y registra la fecha real de aplicación.</p>
          </div>
        </div>
        <div className="bc-inline-form">
          <div className="bc-field">
            <label htmlFor="vacuna">Vacuna</label>
            <select id="vacuna" className="bc-input" value={seleccion}
                    onChange={(e) => {
                      setSeleccion(e.target.value);
                      setErroresCampos((actuales) => ({ ...actuales, vacuna: "" }));
                    }}
                    required aria-required="true" aria-invalid={Boolean(erroresCampos.vacuna)}
                    aria-describedby={erroresCampos.vacuna ? "vacuna-error" : undefined}>
              <option value="">Seleccionar...</option>
              {catalogo.map((v) => (
                <option key={idVacuna(v)} value={idVacuna(v)}>{v.nombre}</option>
              ))}
            </select>
            {erroresCampos.vacuna && <p id="vacuna-error" className="bc-vaccine-field-error">{erroresCampos.vacuna}</p>}
          </div>
          <div className="bc-field">
            <label htmlFor="fecha_aplicacion">Fecha de aplicación</label>
            <input id="fecha_aplicacion" type="date" className="bc-input"
                   max={hoy()} value={fecha} onChange={(e) => {
                     setFecha(e.target.value);
                     setErroresCampos((actuales) => ({ ...actuales, fecha: "" }));
                   }}
                   required aria-required="true" aria-invalid={Boolean(erroresCampos.fecha)}
                   aria-describedby={erroresCampos.fecha ? "fecha-error" : undefined} />
            {erroresCampos.fecha && <p id="fecha-error" className="bc-vaccine-field-error">{erroresCampos.fecha}</p>}
          </div>
          <button type="submit" className="bc-btn bc-btn-primary" disabled={enviando || cargando}>
            <Icon name="plus" size={18} />
            {enviando ? "Guardando..." : "Registrar vacunación"}
          </button>
        </div>

        <div className="bc-vaccine-catalog">
          {!mostrarNueva ? (
            <button type="button" className="bc-link-btn" onClick={() => setMostrarNueva(true)}>
              ¿No está en la lista? Agregar un tipo de vacuna
            </button>
          ) : (
            <div className="bc-inline-form">
              <div className="bc-field">
                <label htmlFor="nueva_vacuna">Nombre de la nueva vacuna</label>
                <input id="nueva_vacuna" className="bc-input" value={nombreNueva}
                       onChange={(e) => setNombreNueva(e.target.value)} />
              </div>
              <button type="button" className="bc-btn bc-btn-outline bc-btn-sm"
                      onClick={agregarAlCatalogo} disabled={creando}>
                {creando ? "Agregando..." : "Agregar"}
              </button>
              <button type="button" className="bc-link-btn" onClick={() => setMostrarNueva(false)}>
                Cancelar
              </button>
            </div>
          )}
          {mostrarNueva && (
            <p className="bc-sub mt-2 mb-0" style={{ color: "var(--bc-muted)", fontSize: ".85rem" }}>
              El catálogo es compartido: la vacuna que agregues la verán todos los usuarios.
            </p>
          )}
        </div>
      </form>

      {cargando && <p className="bc-module-feedback" role="status" aria-live="polite">Cargando historial de vacunación...</p>}

      {!cargando && !error && aplicaciones.length === 0 && (
        <div className="bc-card bc-vaccine-empty">
          <span className="bc-vaccine-empty__icon" aria-hidden="true"><Icon name="calendar" size={24} /></span>
          <h3>Sin vacunas registradas</h3>
          <p>Cuando registres una aplicación, su nombre y fecha aparecerán aquí.</p>
        </div>
      )}

      {!cargando && !error && aplicaciones.length > 0 && (
        <section className="bc-vaccine-history" aria-labelledby="vaccine-history-title">
          <div className="bc-vaccine-history__heading">
            <div>
              <span className="bc-module-eyebrow">Seguimiento del animal</span>
              <h3 id="vaccine-history-title">Historial de vacunación</h3>
            </div>
            <label className="bc-vaccine-search" htmlFor="vaccine-search">
              <Icon name="search" size={18} />
              <span className="visually-hidden">Buscar en el historial</span>
              <input
                id="vaccine-search"
                type="search"
                placeholder="Buscar vacuna o fecha..."
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
              />
            </label>
          </div>
          <div className="bc-card bc-vaccine-table-card">
            {aplicacionesFiltradas.length > 0 ? (
              <>
                <div className="bc-animal-table-caption" aria-live="polite">
                  Mostrando <strong>{aplicacionesFiltradas.length}</strong> de {aplicaciones.length} aplicaciones
                </div>
                <div className="bc-table-wrap">
                  <table className="bc-table bc-vaccine-table">
                    <thead>
                      <tr>
                        <th scope="col">Vacuna</th>
                        <th scope="col">Fecha de aplicación</th>
                        <th scope="col">Estado</th>
                        <th scope="col"><span className="visually-hidden">Acciones</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {aplicacionesFiltradas.map((aplicacion, i) => (
                        <tr key={aplicacion.id ?? i}>
                          <td><strong>{aplicacion.nombre}</strong></td>
                          <td>{fechaCorta(aplicacion.fecha)}</td>
                          <td><span className="bc-vaccine-applied"><Icon name="check" size={15} /> Aplicada</span></td>
                          <td className="bc-vaccine-action-cell">
                            {aplicacion.id != null && (
                              <button
                                type="button"
                                className="bc-btn bc-btn-danger bc-btn-sm"
                                onClick={() => borrar(aplicacion)}
                                aria-label={`Eliminar aplicación de ${aplicacion.nombre}, fecha ${fechaCorta(aplicacion.fecha)}`}
                              >
                                Eliminar
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="bc-animal-no-results" role="status">
                <h3>No hay coincidencias en el historial</h3>
                <p>Prueba con otro nombre de vacuna o fecha.</p>
              </div>
            )}
          </div>
        </section>
      )}
    </>
  );
}