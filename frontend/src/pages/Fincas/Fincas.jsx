import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Icon from "../../components/ui/Icon.jsx";
import { AlertMessage, FilterSelect, LoadingState, SearchField } from "../../components/ui/SharedUI.jsx";
import { useDatosCuenta } from "../../hooks/useDatosCuenta.js";
import { esCompletado, fechaDeCenso, signo } from "../../utils/censos.js";
import { formatFecha } from "../../utils/format.js";

const normalizarTexto = (valor = "") =>
  String(valor).normalize("NFD").replace(/[̀-ͯ]/g, "").toLocaleLowerCase("es");

export default function Fincas() {
  const location = useLocation();
  const { cargando, error, fincas, censos } = useDatosCuenta();
  const [busqueda, setBusqueda] = useState("");
  const [departamento, setDepartamento] = useState("");

  const departamentos = useMemo(
    () => [...new Set(fincas.map((f) => f.departamento).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es")),
    [fincas]
  );

  const fincasFiltradas = useMemo(() => {
    const termino = normalizarTexto(busqueda.trim());
    return fincas.filter((finca) =>
      (!termino || [finca.nombre, finca.municipio, finca.departamento, finca.direccion]
        .some((campo) => normalizarTexto(campo).includes(termino)))
      && (!departamento || finca.departamento === departamento));
  }, [busqueda, departamento, fincas]);

  return (
    <>
      <h1 className="titulo-vista">Fincas</h1>
      <p className="bajada">Elige una finca para llevar el control de sus bovinos.</p>

      {location.state?.mensaje && <AlertMessage type="success">{location.state.mensaje}</AlertMessage>}
      {error && <AlertMessage>{error}</AlertMessage>}

      {fincas.length > 1 && (
        <div className="herramientas" style={{ marginTop: 22, maxWidth: 720 }}>
          <SearchField id="q-finca" label="Buscar finca" placeholder="Buscar por nombre o municipio"
            value={busqueda} onChange={setBusqueda} />
          <FilterSelect id="dep-finca" label="Filtrar por departamento" value={departamento} onChange={setDepartamento}
            options={departamentos} defaultLabel="Todos los departamentos" />
        </div>
      )}

      {cargando ? <LoadingState>Cargando fincas...</LoadingState> : (
        <div className="fincas">
          {fincasFiltradas.map((f) => {
            const ultimo = censos.find((c) => String(c.id_finca) === String(f.id_finca) && esCompletado(c));
            const conteo = ultimo?.cantidad_animales ?? null;
            return (
              <Link className="finca" to={`/fincas/${f.id_finca}`} key={f.id_finca}>
                <div className="finca-marco">
                  <div>
                    <h3>{f.nombre}</h3>
                    <p className="lugar"><Icon name="mapPin" />{[f.municipio, f.departamento].filter(Boolean).join(", ") || "Sin ubicación"}</p>
                  </div>
                  <dl className="finca-cifras">
                    <div><dt>Registrados</dt><dd>{f.registrados}</dd></div>
                    <div><dt>Último conteo</dt><dd>{conteo ?? "—"}</dd></div>
                  </dl>
                  <p className="finca-pie">
                    {ultimo
                      ? <>Vuelo del <b>{formatFecha(fechaDeCenso(ultimo))}</b> · diferencia <b>{signo(conteo != null ? conteo - f.registrados : null)}</b></>
                      : "Sin censos todavía"}
                  </p>
                </div>
              </Link>
            );
          })}

          {fincas.length > 0 && fincasFiltradas.length === 0 && (
            <div className="finca" style={{ cursor: "default" }}>
              <div className="finca-marco" style={{ justifyContent: "center", textAlign: "center" }}>
                <strong style={{ color: "var(--crema)" }}>Ninguna finca coincide</strong>
                <p className="sub">Prueba con otro nombre, municipio o departamento.</p>
                <button type="button" className="btn-texto" onClick={() => { setBusqueda(""); setDepartamento(""); }}>
                  Limpiar filtros
                </button>
              </div>
            </div>
          )}

          <Link className="finca finca-nueva" to="/fincas/nueva">
            <div className="finca-marco">
              <span className="zona-ico"><Icon name="plus" strokeWidth={2.4} /></span>
              <strong>{fincas.length ? "Agregar finca" : "Registra tu primera finca"}</strong>
              <p>{fincas.length ? "Registra otra finca para censar sus potreros." : "Con una finca registrada ya puedes subir censos y registrar bovinos."}</p>
            </div>
          </Link>
        </div>
      )}
    </>
  );
}
