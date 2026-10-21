import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import Icon from "../components/ui/Icon.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import "./MainLayout.css";

const TITULOS = [
  [/^\/dashboard$/, "Panel general"],
  [/^\/usuario$/, "Perfil de usuario"],
  [/^\/fincas\/nueva$/, "Registrar finca"],
  [/^\/fincas\/\d+\/animales\/nuevo$/, "Registrar bovino"],
  [/^\/fincas\/\d+\/animales\/\d+\/editar$/, "Editar bovino"],
  [/^\/fincas\/\d+\/animales\/\d+$/, "Detalle del bovino"],
  [/^\/fincas\/\d+\/censos\/\d+$/, "Detalle del censo"],
  [/^\/fincas\/\d+\/dashboard$/, "Panel de finca"],
  [/^\/fincas\/\d+$/, "Detalle de finca"],
  [/^\/fincas$/, "Gestión de fincas"],
  [/^\/censos\/nuevo$/, "Registrar censo"],
];

function contextoPagina(pathname) {
  const coincidencia = TITULOS.find(([expresion]) => expresion.test(pathname));
  const titulo = coincidencia?.[1] ?? "BioCenso";

  if (pathname === "/dashboard") {
    return { titulo, migas: [{ texto: "Panel general" }] };
  }
  if (pathname === "/usuario") {
    return { titulo, migas: [{ texto: "Panel general", ruta: "/dashboard" }, { texto: "Perfil" }] };
  }
  if (/^\/fincas\/[^/]+\/animales\//.test(pathname)) {
    return {
      titulo,
      migas: [
        { texto: "Panel general", ruta: "/dashboard" },
        { texto: "Fincas", ruta: "/fincas" },
        { texto: "Finca", ruta: pathname.split("/")[2] ? `/fincas/${pathname.split("/")[2]}` : "/fincas" },
        { texto: "Bovino" },
      ],
    };
  }
  if (/^\/fincas\/[^/]+\/censos\/[^/]+$/.test(pathname)) {
    const idFinca = pathname.split("/")[2];
    return {
      titulo,
      migas: [
        { texto: "Panel general", ruta: "/dashboard" },
        { texto: "Fincas", ruta: "/fincas" },
        { texto: "Finca", ruta: `/fincas/${idFinca}` },
        { texto: "Censo" },
      ],
    };
  }
  if (/^\/fincas\/[^/]+\/dashboard$/.test(pathname)) {
    const idFinca = pathname.split("/")[2];
    return {
      titulo,
      migas: [
        { texto: "Panel general", ruta: "/dashboard" },
        { texto: "Fincas", ruta: "/fincas" },
        { texto: "Finca", ruta: `/fincas/${idFinca}` },
        { texto: "Panel de finca" },
      ],
    };
  }
  if (pathname === "/fincas/nueva") {
    return {
      titulo,
      migas: [
        { texto: "Panel general", ruta: "/dashboard" },
        { texto: "Fincas", ruta: "/fincas" },
        { texto: "Registrar finca" },
      ],
    };
  }
  if (/^\/fincas\/[^/]+$/.test(pathname)) {
    return {
      titulo,
      migas: [
        { texto: "Panel general", ruta: "/dashboard" },
        { texto: "Fincas", ruta: "/fincas" },
        { texto: "Detalle de finca" },
      ],
    };
  }
  if (pathname === "/fincas") {
    return {
      titulo,
      migas: [{ texto: "Panel general", ruta: "/dashboard" }, { texto: "Fincas" }],
    };
  }
  if (pathname === "/censos/nuevo") {
    return {
      titulo,
      migas: [{ texto: "Panel general", ruta: "/dashboard" }, { texto: "Nuevo censo" }],
    };
  }
  return { titulo, migas: [{ texto: titulo }] };
}

function inicialesDe(usuario) {
  const nombre = usuario?.nombre || usuario?.correo || "Usuario";
  return nombre.split(/[ @._-]+/).filter(Boolean).slice(0, 2).map((parte) => parte[0]).join("").toUpperCase();
}

const enlaces = [
  { ruta: "/dashboard", texto: "Panel general", icono: "dashboard" },
  { ruta: "/fincas", texto: "Fincas", icono: "home" },
  { ruta: "/censos/nuevo", texto: "Nuevo censo", icono: "scan" },
];

export default function MainLayout() {
  const { usuario, cerrarSesion } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [rutaMenuAbierto, setRutaMenuAbierto] = useState(null);
  const abierto = rutaMenuAbierto === pathname;
  const { titulo, migas } = contextoPagina(pathname);
  const iniciales = inicialesDe(usuario);
  const nombre = usuario?.nombre || usuario?.correo || "Cuenta";

  useEffect(() => {
    document.title = `${titulo} · BioCenso`;
  }, [titulo]);

  useEffect(() => {
    if (!abierto) return undefined;
    const alTeclear = (evento) => {
      if (evento.key === "Escape") setRutaMenuAbierto(null);
    };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [abierto]);

  const salir = () => {
    setRutaMenuAbierto(null);
    cerrarSesion();
    navigate("/", { replace: true });
  };

  return (
    <div className="bc-private-shell">
      <a href="#contenido" className="bc-skip">Saltar al contenido</a>
      {abierto && (
        <button
          className="bc-mobile-backdrop"
          type="button"
          aria-label="Cerrar menú"
          onClick={() => setRutaMenuAbierto(null)}
        />
      )}

      <aside id="navegacion-lateral" className={`bc-private-sidebar ${abierto ? "is-open" : ""}`} aria-label="Navegación de BioCenso">
        <Link to="/dashboard" className="bc-private-brand" onClick={() => setRutaMenuAbierto(null)}>
          <span className="bc-private-brand__mark" aria-hidden="true">B</span>
          <span>Bio<strong>Censo</strong></span>
        </Link>

        <div className="bc-private-nav-label">GESTIÓN</div>
        <nav className="bc-private-nav" aria-label="Módulos">
          {enlaces.map(({ ruta, texto, icono }) => (
            <NavLink
              key={ruta}
              to={ruta}
              end={ruta === "/dashboard" || ruta === "/fincas"}
              className={({ isActive }) => `bc-private-nav__link${isActive ? " is-active" : ""}`}
              onClick={() => setRutaMenuAbierto(null)}
            >
              <Icon name={icono} size={19} />
              <span>{texto}</span>
            </NavLink>
          ))}
        </nav>

        <div className="bc-private-sidebar__bottom">
          <NavLink
            to="/usuario"
            className={({ isActive }) => `bc-private-nav__link${isActive ? " is-active" : ""}`}
            onClick={() => setRutaMenuAbierto(null)}
          >
            <Icon name="user" size={19} />
            <span>Perfil de usuario</span>
          </NavLink>
          <button type="button" className="bc-private-logout" onClick={salir}>
            <Icon name="logout" size={19} />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      <div className="bc-private-main">
        <header className="bc-private-topbar">
          <button
            type="button"
            className="bc-private-menu-toggle"
            aria-label={abierto ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={abierto}
            aria-controls="navegacion-lateral"
            onClick={() => setRutaMenuAbierto(abierto ? null : pathname)}
          >
            <Icon name={abierto ? "x" : "menu"} size={21} />
          </button>
          <div className="bc-private-topbar__context">
            <strong>{titulo}</strong>
            <nav className="bc-breadcrumbs" aria-label="Ruta de navegación">
              {migas.map((miga, index) => (
                <span key={`${miga.texto}-${index}`}>
                  {index > 0 && <span className="bc-breadcrumbs__separator" aria-hidden="true">/</span>}
                  {miga.ruta ? <Link to={miga.ruta} onClick={() => setRutaMenuAbierto(null)}>{miga.texto}</Link> : <span aria-current="page">{miga.texto}</span>}
                </span>
              ))}
            </nav>
          </div>
          <Link to="/usuario" className="bc-private-account" aria-label={`Ver perfil de ${nombre}`}>
            <span className="bc-private-account__avatar">{iniciales}</span>
            <span className="bc-private-account__name">{nombre}</span>
          </Link>
        </header>
        <main id="contenido" tabIndex={-1} className="bc-container bc-page">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
