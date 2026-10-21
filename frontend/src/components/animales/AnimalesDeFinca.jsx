import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { listarAnimalesDeFinca } from "../../services/animalesService.js";
import { extraerError } from "../../utils/errores.js";
import Icon from "../ui/Icon.jsx";
import "./animales.css";

const compararTexto = (valor) => String(valor ?? "").toLocaleLowerCase("es");

export default function AnimalesDeFinca({ idFinca }) {
  const [resultado, setResultado] = useState({ idFinca: null, animales: [], error: "" });
  const [busqueda, setBusqueda] = useState("");
  const [sexoFiltro, setSexoFiltro] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("");
  const cargando = String(resultado.idFinca) !== String(idFinca);
  const animales = useMemo(
    () => cargando ? [] : resultado.animales,
    [cargando, resultado.animales]
  );
  const error = cargando ? "" : resultado.error;

  useEffect(() => {
    let vigente = true;
    listarAnimalesDeFinca(idFinca)
      .then((lista) => {
        if (vigente) setResultado({ idFinca, animales: lista, error: "" });
      })
      .catch((err) => {
        if (vigente) setResultado({ idFinca, animales: [], error: extraerError(err) });
      });
    return () => { vigente = false; };
  }, [idFinca]);

  const sexos = useMemo(
    () => [...new Set(animales.map((animal) => animal.sexo).filter(Boolean))].sort(),
    [animales]
  );
  const estados = useMemo(
    () => [...new Set(animales.map((animal) => animal.estado_general).filter(Boolean))].sort(),
    [animales]
  );
  const animalesFiltrados = useMemo(() => {
    const termino = compararTexto(busqueda.trim());
    return animales.filter((animal) => {
      const coincideBusqueda = !termino || [
        animal.numero_animal,
        animal.id_animal,
        animal.sexo,
        animal.estado_general,
        animal.estado_reproductivo,
        animal.enfermedad,
      ].some((valor) => compararTexto(valor).includes(termino));
      return coincideBusqueda
        && (!sexoFiltro || animal.sexo === sexoFiltro)
        && (!estadoFiltro || animal.estado_general === estadoFiltro);
    });
  }, [animales, busqueda, sexoFiltro, estadoFiltro]);

  const machos = animales.filter((animal) => compararTexto(animal.sexo) === "macho").length;
  const hembras = animales.filter((animal) => compararTexto(animal.sexo) === "hembra").length;

  const limpiarFiltros = () => {
    setBusqueda("");
    setSexoFiltro("");
    setEstadoFiltro("");
  };

  return (
    <section className="bc-animals-module" aria-labelledby="animals-title">
      <div className="bc-section-head bc-module-heading">
        <div>
          <span className="bc-module-eyebrow">Inventario de ganado</span>
          <h2 id="animals-title">Gestión de animales</h2>
          <p className="bc-animal-section-subtitle">
            Consulta y administra los bovinos registrados en esta finca.
          </p>
        </div>
        <Link to={`/fincas/${idFinca}/animales/nuevo`} className="bc-btn bc-btn-primary">
          <Icon name="plus" size={18} />
          Registrar animal
        </Link>
      </div>

      {!cargando && !error && animales.length > 0 && (
        <div className="bc-animal-summary" aria-label="Resumen del ganado">
          <article className="bc-animal-stat">
            <span className="bc-animal-stat__icon" aria-hidden="true">Σ</span>
            <div><span>Total de animales</span><strong>{animales.length}</strong></div>
          </article>
          <article className="bc-animal-stat">
            <span className="bc-animal-stat__icon" aria-hidden="true">♂</span>
            <div><span>Machos</span><strong>{machos}</strong></div>
          </article>
          <article className="bc-animal-stat">
            <span className="bc-animal-stat__icon" aria-hidden="true">♀</span>
            <div><span>Hembras</span><strong>{hembras}</strong></div>
          </article>
        </div>
      )}

      {cargando && (
        <div className="bc-module-feedback" role="status" aria-live="polite">
          <span className="bc-loading-dot" aria-hidden="true" />
          Cargando animales...
        </div>
      )}
      {error && <div className="bc-alert-error" role="alert">{error}</div>}

      {!cargando && !error && animales.length === 0 && (
        <div className="bc-card bc-animal-empty">
          <span className="bc-animal-empty__icon" aria-hidden="true">＋</span>
          <h3>Esta finca aún no tiene animales</h3>
          <p>Registra el primer bovino para comenzar a organizar su información y seguimiento.</p>
          <Link to={`/fincas/${idFinca}/animales/nuevo`} className="bc-btn bc-btn-primary">
            Registrar el primer animal
          </Link>
        </div>
      )}

      {!cargando && !error && animales.length > 0 && (
        <>
          <div className="bc-animal-toolbar">
            <label className="bc-animal-search" htmlFor="animal-search">
              <Icon name="search" size={19} />
              <span className="visually-hidden">Buscar animales</span>
              <input
                id="animal-search"
                type="search"
                placeholder="Buscar por número, sexo o estado..."
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
              />
            </label>
            <div className="bc-animal-filters">
              <label>
                <span className="visually-hidden">Filtrar por sexo</span>
                <select
                  className="bc-input"
                  value={sexoFiltro}
                  onChange={(event) => setSexoFiltro(event.target.value)}
                >
                  <option value="">Todos los sexos</option>
                  {sexos.map((sexo) => <option key={sexo} value={sexo}>{sexo}</option>)}
                </select>
              </label>
              <label>
                <span className="visually-hidden">Filtrar por estado general</span>
                <select
                  className="bc-input"
                  value={estadoFiltro}
                  onChange={(event) => setEstadoFiltro(event.target.value)}
                >
                  <option value="">Todos los estados</option>
                  {estados.map((estado) => <option key={estado} value={estado}>{estado}</option>)}
                </select>
              </label>
            </div>
          </div>

          <div className="bc-card bc-animal-table-card">
            {animalesFiltrados.length > 0 ? (
              <>
                <div className="bc-animal-table-caption" aria-live="polite">
                  Mostrando <strong>{animalesFiltrados.length}</strong> de {animales.length} animales
                </div>
                <div className="bc-table-wrap">
                  <table className="bc-table bc-animal-table">
                    <thead>
                      <tr>
                        <th scope="col">Animal</th>
                        <th scope="col">Sexo</th>
                        <th scope="col">Peso</th>
                        <th scope="col">Estado general</th>
                        <th scope="col"><span className="visually-hidden">Acciones</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {animalesFiltrados.map((animal) => (
                        <tr key={animal.id_animal}>
                          <td>
                            <div className="bc-animal-identity">
                              {animal.imagen_url
                                ? <img src={animal.imagen_url} alt="" className="bc-thumb" />
                                : <span className="bc-thumb-ph" aria-hidden="true">B</span>}
                              <div>
                                <Link
                                  to={`/fincas/${idFinca}/animales/${animal.id_animal}`}
                                  className="bc-rowlink"
                                >
                                  {animal.numero_animal || `Animal ${animal.id_animal}`}
                                </Link>
                                <span className="bc-animal-id">ID #{animal.id_animal}</span>
                              </div>
                            </div>
                          </td>
                          <td>
                            {animal.sexo
                              ? <span className="bc-animal-sex">{animal.sexo}</span>
                              : <span className="bc-animal-muted">Sin especificar</span>}
                          </td>
                          <td>
                            {animal.peso != null
                              ? <span className="bc-animal-weight">{animal.peso} <small>kg</small></span>
                              : <span className="bc-animal-muted">Sin registrar</span>}
                          </td>
                          <td>
                            {animal.estado_general
                              ? <span className="bc-animal-status">{animal.estado_general}</span>
                              : <span className="bc-animal-muted">Sin registrar</span>}
                          </td>
                          <td className="bc-animal-action-cell">
                            <Link
                              to={`/fincas/${idFinca}/animales/${animal.id_animal}`}
                              className="bc-animal-detail-link"
                              aria-label={`Ver ficha del animal ${animal.numero_animal || animal.id_animal}`}
                            >
                              Ver ficha <span aria-hidden="true">→</span>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="bc-animal-no-results" role="status">
                <h3>No encontramos animales con esos filtros</h3>
                <p>Prueba con otro término o limpia los filtros para ver el inventario completo.</p>
                <button type="button" className="bc-btn bc-btn-outline" onClick={limpiarFiltros}>
                  Limpiar búsqueda y filtros
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
