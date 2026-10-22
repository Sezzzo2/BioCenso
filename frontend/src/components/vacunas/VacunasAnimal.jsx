import { useCallback, useEffect, useMemo, useState } from "react";
import {
  aplicarVacuna, crearVacuna, eliminarAplicacion, idVacuna,
  listarVacunas, listarVacunasDeAnimal,
} from "../../services/vacunasService.js";
import { extraerError } from "../../utils/errores.js";
import { formatFecha, formatFechaLarga, hoyISO } from "../../utils/format.js";
import Icon from "../ui/Icon.jsx";
import { AlertMessage, EmptyState, LoadingState, SearchField, SelectField, StatCard } from "../ui/SharedUI.jsx";

const dia = (v) => (v ? String(v).slice(0, 10) : null);

export default function VacunasAnimal({ idAnimal }) {
  const [aplicaciones, setAplicaciones] = useState([]);
  const [catalogo, setCatalogo] = useState([]);
  const [idCargado, setIdCargado] = useState(null);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [busqueda, setBusqueda] = useState("");

  const [seleccion, setSeleccion] = useState("");
  const [fecha, setFecha] = useState(hoyISO());
  const [enviando, setEnviando] = useState(false);
  const [erroresCampos, setErroresCampos] = useState({});

  const [mostrarNueva, setMostrarNueva] = useState(false);
  const [nombreNueva, setNombreNueva] = useState("");
  const [creando, setCreando] = useState(false);
  const [porEliminar, setPorEliminar] = useState(null);
  const cargando = String(idCargado) !== String(idAnimal);

  const cargarAplicaciones = useCallback(() => listarVacunasDeAnimal(idAnimal), [idAnimal]);

  const ordenadas = useMemo(
    () => [...aplicaciones].sort((a, b) => String(dia(b.fecha)).localeCompare(String(dia(a.fecha)))),
    [aplicaciones]
  );
  const filtradas = useMemo(() => {
    const termino = busqueda.trim().toLocaleLowerCase("es");
    if (!termino) return ordenadas;
    return ordenadas.filter((a) =>
      [a.nombre, dia(a.fecha), formatFecha(dia(a.fecha))]
        .some((v) => String(v ?? "").toLocaleLowerCase("es").includes(termino)));
  }, [ordenadas, busqueda]);

  useEffect(() => {
    let vigente = true;
    Promise.all([cargarAplicaciones(), listarVacunas()])
      .then(([aplicacionesCargadas, catalogoCargado]) => {
        if (!vigente) return;
        setAplicaciones(aplicacionesCargadas);
        setCatalogo(catalogoCargado);
        setError("");
        setIdCargado(idAnimal);
      })
      .catch((err) => {
        if (!vigente) return;
        setError(extraerError(err));
        setIdCargado(idAnimal);
      });
    return () => { vigente = false; };
  }, [cargarAplicaciones, idAnimal]);

  const aplicar = async (e) => {
    e.preventDefault();
    setError("");
    setOk("");
    const nuevosErrores = {};
    if (!seleccion) nuevosErrores.vacuna = "Selecciona una vacuna.";
    if (!fecha) nuevosErrores.fecha = "Indica la fecha de aplicación.";
    else if (fecha > hoyISO()) nuevosErrores.fecha = "La fecha no puede ser futura.";
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

  const agregarAlCatalogo = async (e) => {
    e.preventDefault();
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
    setError("");
    setOk("");
    try {
      await eliminarAplicacion(a.id);
      setAplicaciones(await cargarAplicaciones());
      setOk("Registro eliminado.");
    } catch (err) {
      setError(extraerError(err));
    } finally {
      setPorEliminar(null);
    }
  };

  const ultima = ordenadas[0];

  return (
    <section className="panel panel-solido panel-pad bloque" aria-labelledby="t-vacunas">
      <div className="bloque-cab"><div><h2 id="t-vacunas">Vacunas</h2><p>Registra cada aplicación con su fecha real.</p></div></div>

      {cargando ? <LoadingState>Cargando historial de vacunación...</LoadingState> : (
        <>
          <div className="cifras" style={{ marginBottom: 22 }}>
            <StatCard label="Aplicaciones registradas" value={aplicaciones.length} />
            <StatCard label="Última aplicación" value={ultima ? formatFecha(dia(ultima.fecha)) : "Ninguna"} description={ultima?.nombre} />
            <StatCard label="Tipos en el catálogo" value={catalogo.length} />
          </div>

          <form onSubmit={aplicar} noValidate aria-busy={enviando}>
            <h3 className="subtitulo">Registrar vacunación</h3>
            <div className="form-linea linea-3">
              <div className="campo">
                <label htmlFor="v-vacuna">Vacuna</label>
                <SelectField id="v-vacuna" value={seleccion} onChange={(e) => { setSeleccion(e.target.value); setErroresCampos((x) => ({ ...x, vacuna: "" })); }}
                  aria-invalid={Boolean(erroresCampos.vacuna)} aria-describedby={erroresCampos.vacuna ? "v-vacuna-error" : undefined}>
                  <option value="">Seleccionar…</option>
                  {catalogo.map((v) => <option key={idVacuna(v)} value={idVacuna(v)}>{v.nombre}</option>)}
                </SelectField>
                {erroresCampos.vacuna && <p id="v-vacuna-error" className="err-campo">{erroresCampos.vacuna}</p>}
              </div>
              <div className="campo">
                <label htmlFor="v-fecha">Fecha de aplicación</label>
                <input id="v-fecha" type="date" className="ctl" max={hoyISO()} value={fecha}
                  onChange={(e) => { setFecha(e.target.value); setErroresCampos((x) => ({ ...x, fecha: "" })); }}
                  aria-invalid={Boolean(erroresCampos.fecha)} aria-describedby={erroresCampos.fecha ? "v-fecha-error" : undefined} />
                {erroresCampos.fecha && <p id="v-fecha-error" className="err-campo">{erroresCampos.fecha}</p>}
              </div>
              <button className="btn btn-claro" type="submit" disabled={enviando}>{enviando ? "Guardando..." : "Registrar vacunación"}</button>
            </div>
          </form>

          <div style={{ marginTop: 14 }}>
            {mostrarNueva ? (
              <form className="form-linea linea-nv" onSubmit={agregarAlCatalogo} noValidate>
                <div className="campo">
                  <label htmlFor="nv-nombre">Nombre de la nueva vacuna</label>
                  <input id="nv-nombre" className="ctl" maxLength={150} placeholder="Ej.: Leptospirosis" autoFocus
                    value={nombreNueva} onChange={(e) => setNombreNueva(e.target.value)} />
                </div>
                <button className="btn btn-claro" type="submit" disabled={creando}>{creando ? "Agregando..." : "Agregar al catálogo"}</button>
                <button className="btn btn-oscuro" type="button" onClick={() => setMostrarNueva(false)}>Cancelar</button>
              </form>
            ) : (
              <button type="button" className="btn-texto" onClick={() => setMostrarNueva(true)}>
                ¿No está en la lista? Agregar vacuna al catálogo
              </button>
            )}
          </div>

          {error && <AlertMessage>{error}</AlertMessage>}
          {ok && <AlertMessage type="success">{ok}</AlertMessage>}

          <div style={{ marginTop: 26 }}>
            <div className="bloque-cab">
              <h3 className="subtitulo mt-0">Historial de vacunación</h3>
              {aplicaciones.length > 0 && (
                <div className="herramientas" style={{ margin: 0, flex: "0 1 320px" }}>
                  <SearchField id="q-vacuna" label="Buscar en el historial" placeholder="Buscar vacuna o fecha"
                    value={busqueda} onChange={setBusqueda} />
                </div>
              )}
            </div>
            {aplicaciones.length === 0 ? (
              <EmptyState title="Sin vacunas registradas" description="Cuando registres una aplicación, su nombre y fecha aparecerán aquí." />
            ) : filtradas.length === 0 ? (
              <EmptyState title="No hay coincidencias en el historial" description="Prueba con otro nombre de vacuna o fecha." />
            ) : (
              <div className="tabla-caja">
                <table className="compacta">
                  <thead><tr><th>Vacuna</th><th>Fecha de aplicación</th><th><span className="sr">Acciones</span></th></tr></thead>
                  <tbody>
                    {filtradas.map((a) => (
                      <tr key={a.id}>
                        <td>{a.nombre}</td>
                        <td>{formatFechaLarga(dia(a.fecha))}</td>
                        <td>
                          {porEliminar === a.id ? (
                            <span className="fila-acciones">
                              <button type="button" className="btn btn-peligro btn-sm" onClick={() => borrar(a)}>Eliminar</button>
                              <button type="button" className="btn btn-oscuro btn-sm" onClick={() => setPorEliminar(null)}>No</button>
                            </span>
                          ) : (
                            <button type="button" className="btn-icono" onClick={() => setPorEliminar(a.id)}
                              aria-label={`Eliminar aplicación de ${a.nombre} del ${formatFecha(dia(a.fecha))}`}>
                              <Icon name="trash" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
