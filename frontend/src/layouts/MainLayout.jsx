import { useEffect } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import Icon from "../components/ui/Icon.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const TITULOS = [
  [/^\/inicio$/, "Inicio"],
  [/^\/censos/, "Censo"],
  [/^\/fincas\/[^/]+\/censos\//, "Censo"],
  [/^\/fincas/, "Fincas"],
  [/^\/usuario$/, "Usuario"],
];

function inicialesDe(usuario) {
  const partes = [usuario?.nombre, usuario?.apellido].filter(Boolean);
  const texto = partes.length ? partes.map((p) => p[0]).join("") : (usuario?.correo || "U")[0];
  return texto.slice(0, 2).toUpperCase();
}

// Marco común de todas las páginas: barra lateral (abajo en móvil) sobre la foto del potrero
export default function MainLayout() {
  const { usuario, autenticado, cerrarSesion } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const titulo = TITULOS.find(([re]) => re.test(pathname))?.[1] ?? "BioCenso";
    document.title = `${titulo} · BioCenso`;
  }, [pathname]);

  const salir = () => {
    cerrarSesion();
    navigate("/", { replace: true });
  };

  // Censo resalta también en las fichas de censo de una finca
  const enCenso = pathname.startsWith("/censos") || /^\/fincas\/[^/]+\/censos\//.test(pathname);

  return (
    <>
      <a className="salto" href="#contenido">Saltar al contenido</a>
      <div className="paisaje" aria-hidden="true" />
      <div className="app">
        <aside className="lateral" aria-label="Navegación principal">
          <Link className="marca" to="/inicio" aria-label="BioCenso, inicio"><b>BIO</b><span>CENSO</span></Link>
          <ul className="nav">
            <li><NavLink to="/inicio" end><Icon name="home" />Inicio</NavLink></li>
            <li>
              <Link to="/censos" aria-current={enCenso ? "page" : undefined}>
                <Icon name="escaner" />Censo
              </Link>
            </li>
            <li>
              <Link to="/fincas" aria-current={!enCenso && pathname.startsWith("/fincas") ? "page" : undefined}>
                <Icon name="mapPin" />Fincas
              </Link>
            </li>
          </ul>
          <div className="nav-usuario">
            {autenticado ? (
              <>
                <NavLink to="/usuario">
                  <span className="avatar" aria-hidden="true">{inicialesDe(usuario)}</span>Usuario
                </NavLink>
                <button className="nav-salir" type="button" onClick={salir}>
                  <Icon name="logout" />Cerrar sesión
                </button>
              </>
            ) : (
              <Link to="/login" aria-current={pathname === "/login" || pathname === "/registro" ? "page" : undefined}>
                <span className="avatar" aria-hidden="true"><Icon name="user" size={18} /></span>Iniciar sesión
              </Link>
            )}
          </div>
        </aside>

        <main className="principal" id="contenido" tabIndex={-1}>
          <div className="barra-sup">
            <Link className="marca-movil" to="/inicio"><b>BIO</b>CENSO</Link>
            <a className="contacto" href="mailto:contacto@biocenso.co">contacto</a>
          </div>
          <div className="pagina" key={pathname}>
            <Outlet />
          </div>
        </main>
      </div>
    </>
  );
}
