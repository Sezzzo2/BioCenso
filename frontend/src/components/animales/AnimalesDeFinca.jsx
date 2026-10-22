import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Icon from "../ui/Icon.jsx";
import { ButtonLink, EmptyState, FilterSelect, SearchField } from "../ui/SharedUI.jsx";
import { parseFecha } from "../../utils/format.js";

const compararTexto = (valor) => String(valor ?? "").toLocaleLowerCase("es");

function edad(iso) {
  const nacimiento = parseFecha(iso);
  if (!nacimiento) return null;
  const hoy = new Date();
  const meses = (hoy.getFullYear() - nacimiento.getFullYear()) * 12 + (hoy.getMonth() - nacimiento.getMonth());
  if (meses < 24) return `${Math.max(0, meses)} ${meses === 1 ? "mes" : "meses"}`;
  const anios = Math.floor(meses / 12);
  return `${anios} ${anios === 1 ? "año" : "años"}`;
}

function EstadoGeneral({ estado }) {
  if (!estado) return <span className="tenue">Sin registrar</span>;
  const clase = estado === "Sano" ? "ok" : estado === "Enfermo" ? "err" : "espera";
  return <span className={`estado ${clase}`}>{estado}</span>;
}

// Inventario de bovinos de una finca con búsqueda y filtros (los datos los carga la página)
export default function AnimalesDeFinca({ idFinca, animales }) {
  const [busqueda, setBusqueda] = useState("");
  const [sexoFiltro, setSexoFiltro] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("");

  const sexos = useMemo(() => [...new Set(animales.map((a) => a.sexo).filter(Boolean))].sort(), [animales]);
  const estados = useMemo(() => [...new Set(animales.map((a) => a.estado_general).filter(Boolean))].sort(), [animales]);

  const filtrados = useMemo(() => {
    const termino = compararTexto(busqueda.trim());
    return animales.filter((a) =>
      (!termino || [a.numero_animal, a.id_animal, a.sexo, a.estado_general, a.estado_reproductivo, a.enfermedad]
        .some((v) => compararTexto(v).includes(termino)))
      && (!sexoFiltro || a.sexo === sexoFiltro)
      && (!estadoFiltro || a.estado_general === estadoFiltro));
  }, [animales, busqueda, sexoFiltro, estadoFiltro]);

  const limpiar = () => { setBusqueda(""); setSexoFiltro(""); setEstadoFiltro(""); };
  const nuevo = `/fincas/${idFinca}/animales/nuevo`;

  return (
    <section className="panel panel-solido panel-pad bloque" aria-labelledby="t-animales">
      <div className="bloque-cab">
        <div><h2 id="t-animales">Bovinos registrados</h2><p>Inventario de ganado de la finca.</p></div>
        <ButtonLink to={nuevo} variant="light" size="small"><Icon name="plus" />Registrar bovino</ButtonLink>
      </div>

      {animales.length === 0 ? (
        <EmptyState
          title="Esta finca aún no tiene bovinos"
          description="Registra el primer bovino para comenzar a organizar su información y seguimiento."
          action={<ButtonLink to={nuevo}>Registrar bovino</ButtonLink>}
        />
      ) : (
        <>
          <div className="herramientas">
            <SearchField id="q-animal" label="Buscar bovinos" placeholder="Buscar por número, sexo o estado"
              value={busqueda} onChange={setBusqueda} />
            <FilterSelect id="fs-sexo" label="Filtrar por sexo" value={sexoFiltro} onChange={setSexoFiltro}
              options={sexos} defaultLabel="Todos los sexos" />
            <FilterSelect id="fs-estado" label="Filtrar por estado general" value={estadoFiltro} onChange={setEstadoFiltro}
              options={estados} defaultLabel="Todos los estados" />
          </div>

          {filtrados.length === 0 ? (
            <EmptyState
              title="No encontramos bovinos con esos filtros"
              description="Prueba con otro término o limpia los filtros para ver el inventario completo."
              action={<button type="button" className="btn btn-oscuro btn-sm" onClick={limpiar}>Limpiar filtros</button>}
            />
          ) : (
            <>
              <p className="pista" style={{ marginBottom: 8 }} aria-live="polite">
                Mostrando {filtrados.length} de {animales.length} bovinos
              </p>
              <div className="tabla-caja" style={{ maxHeight: 560, overflow: "auto" }}>
                <table>
                  <thead>
                    <tr>
                      <th>Bovino</th><th>Sexo</th><th>Edad</th><th className="num">Peso</th>
                      <th>Estado reproductivo</th><th>Estado general</th><th><span className="sr">Acciones</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtrados.map((a) => {
                      const ruta = `/fincas/${idFinca}/animales/${a.id_animal}`;
                      return (
                        <tr key={a.id_animal}>
                          <td>
                            <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
                              {a.imagen_url
                                ? <img src={a.imagen_url} alt="" className="miniatura" />
                                : <span className="miniatura" aria-hidden="true"><Icon name="vaca" /></span>}
                              <Link className="fila-link" to={ruta}>{a.numero_animal || `Bovino ${a.id_animal}`}</Link>
                            </span>
                          </td>
                          <td>{a.sexo || <span className="tenue">Sin registrar</span>}</td>
                          <td>{edad(a.fecha_nacimiento) ?? <span className="tenue">Sin registrar</span>}</td>
                          <td className="num">{a.peso != null ? `${Number(a.peso)} kg` : "—"}</td>
                          <td>{a.estado_reproductivo || <span className="tenue">Sin especificar</span>}</td>
                          <td><EstadoGeneral estado={a.estado_general} /></td>
                          <td><Link className="btn-tabla" to={ruta} aria-label={`Ver ficha del bovino ${a.numero_animal || a.id_animal}`}>Ver ficha</Link></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}
