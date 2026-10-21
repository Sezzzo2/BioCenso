import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function Navbar() {
  const { autenticado } = useAuth();

  return (
    <header className="bc-nav">
      <div className="bc-container bc-nav-inner">
        <Link to="/" className="bc-brand">Bio<span>Censo</span></Link>
        <nav className="bc-nav-links">
          <a className="bc-link" href="#como-funciona">Cómo funciona</a>
          <a className="bc-link" href="#comparacion">Comparación</a>
          {autenticado ? (
            <Link className="bc-btn bc-btn-primary" to="/fincas">Mi panel</Link>
          ) : (
            <>
              <Link className="bc-link" to="/login">Iniciar sesión</Link>
              <Link className="bc-btn bc-btn-primary" to="/registro">Registrarse</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}