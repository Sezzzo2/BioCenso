import { useEffect } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const TITULOS = { "/": "BioCenso · Censo de ganado con dron", "/login": "Iniciar sesión · BioCenso", "/registro": "Crear cuenta · BioCenso" };

// Marco de la portada pública, el login y el registro: barra superior, sin la barra lateral de la app
export default function PublicLayout() {
  const { autenticado } = useAuth();
  const { pathname } = useLocation();
  const enPortada = pathname === "/";

  useEffect(() => {
    document.title = TITULOS[pathname] ?? "BioCenso";
  }, [pathname]);

  return (
    <>
      <a className="salto" href="#contenido">Saltar al contenido</a>
      <div className="paisaje" aria-hidden="true" />
      <header className="barra-publica">
        <Link className="marca-publica" to="/" aria-label="BioCenso, portada"><b>BIO</b>CENSO</Link>
        <nav className="enlaces-publicos" aria-label="Portada">
          {enPortada && (
            <>
              <a className="enlace-sec" href="#como-funciona">Cómo funciona</a>
              <a className="enlace-sec" href="#comparacion">Comparación</a>
            </>
          )}
          {autenticado ? (
            <Link className="btn btn-brote btn-sm" to="/inicio">Ir a mi panel</Link>
          ) : (
            <>
              {pathname !== "/login" && <Link className="btn btn-oscuro btn-sm" to="/login">Iniciar sesión</Link>}
              {pathname !== "/registro" && <Link className="btn btn-brote btn-sm" to="/registro">Crear cuenta</Link>}
            </>
          )}
        </nav>
      </header>
      <main className="principal principal-publica" id="contenido" tabIndex={-1}>
        <div className="pagina" key={pathname}>
          <Outlet />
        </div>
      </main>
    </>
  );
}
