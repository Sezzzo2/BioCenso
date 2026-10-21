import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Icon from "../../components/ui/Icon.jsx";
import {
  ActionButton, AlertMessage, EmptyState, FilterSelect, LoadingState, PageHeader, SearchField, StatCard,
} from "../../components/ui/SharedUI.jsx";
import { listarFincas } from "../../services/fincaService.js";
import { extraerError } from "../../utils/errores.js";

const normalizarTexto = (valor = "") =>
  String(valor).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es");

export default function Fincas() {
  const location = useLocation();
  const [fincas, setFincas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [departamento, setDepartamento] = useState("");

  useEffect(() => {
    let vigente = true;
    listarFincas()
      .then((lista) => {
        if (vigente) setFincas(lista);
      })
      .catch((err) => {
        if (vigente) setError(extraerError(err));
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => { vigente = false; };
  }, []);

  const departamentos = useMemo(
    () => [...new Set(fincas.map((f) => f.departamento).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, "es")),
    [fincas]
  );

  const fincasFiltradas = useMemo(() => {
    const termino = normalizarTexto(busqueda.trim());
    return fincas.filter((finca) => {
      const coincideBusqueda = !termino || [
        finca.nombre, finca.municipio, finca.departamento, finca.direccion,
      ].some((campo) => normalizarTexto(campo).includes(termino));
      const coincideDepartamento = !departamento || finca.departamento === departamento;
      return coincideBusqueda && coincideDepartamento;
    });
  }, [busqueda, departamento, fincas]);

  const municipios = new Set(fincas.map((f) => f.municipio).filter(Boolean)).size;

  return (
    <div className="bc-farms-page">
      <PageHeader
        eyebrow="Administración de propiedades"
        title="Gestión de fincas"
        description="Consulta y organiza las fincas asociadas a tu cuenta."
        action={<Link to="/fincas/nueva" className="bc-btn bc-btn-primary"><Icon name="plus" size={18} /> Registrar finca</Link>}
      />

      {location.state?.mensaje && <AlertMessage type="success">{location.state.mensaje}</AlertMessage>}
      {error && <AlertMessage>{error}</AlertMessage>}

      <section className="bc-farms-summary" aria-label="Resumen de fincas">
        <StatCard icon="home" label="Fincas registradas" value={cargando ? "—" : fincas.length} />
        <StatCard icon="mapPin" label="Municipios cubiertos" value={cargando ? "—" : municipios} />
      </section>

      <section className="bc-farms-list" aria-labelledby="fincas-list-title">
        <div className="bc-farms-list__heading">
          <div>
            <h2 id="fincas-list-title">Tus fincas</h2>
            {!cargando && !error && (
              <p>{fincas.length} {fincas.length === 1 ? "propiedad registrada" : "propiedades registradas"}</p>
            )}
          </div>
        </div>

        <div className="bc-farms-toolbar">
          <SearchField
            label="Buscar finca por nombre o ubicación"
            placeholder="Buscar por finca o ubicación..."
            value={busqueda}
            onChange={setBusqueda}
          />
          <FilterSelect
            label="Filtrar por departamento"
            value={departamento}
            onChange={setDepartamento}
            options={departamentos}
            defaultLabel="Todos los departamentos"
          />
        </div>

        {cargando && <LoadingState>Cargando fincas...</LoadingState>}
        {!cargando && !error && fincas.length === 0 && (
          <EmptyState
            title="Aún no tienes fincas"
            description="Registra tu primera finca para comenzar a organizar bovinos y censos."
            action={<Link to="/fincas/nueva" className="bc-btn bc-btn-primary">Registrar mi primera finca</Link>}
          />
        )}

        {!cargando && !error && fincas.length > 0 && fincasFiltradas.length === 0 && (
          <EmptyState
            icon={null}
            title="No encontramos fincas con esos criterios"
            description="Prueba con otro nombre, municipio o departamento."
            action={
              <ActionButton variant="outline" onClick={() => { setBusqueda(""); setDepartamento(""); }}>
                Limpiar filtros
              </ActionButton>
            }
          />
        )}

        {!cargando && !error && fincasFiltradas.length > 0 && (
          <div className="row g-3">
            {fincasFiltradas.map((f) => (
              <div className="col-12 col-md-6 col-xl-4" key={f.id_finca}>
                <Link to={`/fincas/${f.id_finca}`} className="bc-card bc-finca-card">
                  <span className="bc-finca-card__icon"><Icon name="mountain" size={21} /></span>
                  <span className="bc-finca-card__content">
                    <h3>{f.nombre}</h3>
                    <span className="bc-finca-card__location">
                      <Icon name="mapPin" size={15} />
                      {[f.municipio, f.departamento].filter(Boolean).join(", ") || "Ubicación sin registrar"}
                    </span>
                    {f.direccion && <span className="bc-finca-card__address">{f.direccion}</span>}
                  </span>
                  <span className="bc-finca-card__arrow" aria-hidden="true">→</span>
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
