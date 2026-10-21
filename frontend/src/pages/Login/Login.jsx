import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { extraerError } from "../../utils/errores.js";
import Icon from "../../components/ui/Icon.jsx";

export default function Login() {
  const { iniciarSesion, autenticado } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const destino = location.state?.from?.pathname || "/fincas";

  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  // Si ya hay sesión, no tiene sentido mostrar el login
  if (autenticado) return <Navigate to={destino} replace />;

  const manejarEnvio = async (e) => {
    e.preventDefault();
    setError("");

    if (!correo.trim() || !contrasena) {
      setError("Ingresa tu correo y tu contraseña.");
      return;
    }
    if (!e.currentTarget.elements.correo.checkValidity()) {
      setError("Ingresa un correo electrónico válido.");
      return;
    }

    setEnviando(true);
    try {
      await iniciarSesion(correo.trim(), contrasena);
      navigate(destino, { replace: true });
    } catch (err) {
      setError(extraerError(err));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="bc-login-page">
      <header className="bc-login-nav">
        <Link to="/" className="bc-login-brand" aria-label="BioCenso, ir al inicio">
          <span className="bc-login-brand__mark" aria-hidden="true">B</span>
          <span>Bio<strong>Censo</strong></span>
        </Link>
        <p>Gestión pecuaria, con información clara.</p>
      </header>

      <main className="bc-login">
        <section className="bc-login-showcase" aria-labelledby="login-showcase-title">
          <span className="bc-login-eyebrow">Tu operación, en un solo lugar</span>
          <h1 id="login-showcase-title">
            Conoce mejor tu finca. <span>Cuida mejor tu ganado.</span>
          </h1>
          <p className="bc-login-showcase__copy">
            Organiza tus fincas, lleva el registro de cada bovino y consulta la
            información de censos y vacunación desde una sola plataforma.
          </p>

          <ul className="bc-login-highlights">
            <li><Icon name="mapPin" size={19} /> Información de tus fincas</li>
            <li><Icon name="history" size={19} /> Historial y seguimiento del ganado</li>
            <li><Icon name="check" size={19} /> Censos y vacunaciones organizados</li>
          </ul>

          <div className="bc-login-illustration" aria-hidden="true">
            <span className="bc-login-illustration__sun" />
            <span className="bc-login-illustration__horizon" />
            <span className="bc-login-illustration__field bc-login-illustration__field--one" />
            <span className="bc-login-illustration__field bc-login-illustration__field--two" />
            <span className="bc-login-illustration__field bc-login-illustration__field--three" />
            <span className="bc-login-illustration__label">BioCenso · Gestión responsable</span>
          </div>
        </section>

        <section className="bc-login-form-panel" aria-labelledby="login-title">
          <div className="bc-login-card">
            <span className="bc-login-card__icon" aria-hidden="true">
              <Icon name="user" size={22} />
            </span>
            <span className="bc-login-card__eyebrow">Bienvenido de nuevo</span>
            <h2 id="login-title">Iniciar sesión</h2>
            <p className="bc-login-card__intro">Ingresa tus credenciales para continuar.</p>

            {error && <div className="bc-alert-error" role="alert">{error}</div>}

            <form onSubmit={manejarEnvio} noValidate aria-busy={enviando}>
              <div className="bc-field">
                <label htmlFor="correo">Correo electrónico</label>
                <input
                  id="correo"
                  name="correo"
                  type="email"
                  className="bc-input"
                  autoComplete="email"
                  placeholder="nombre@ejemplo.com"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  required
                />
              </div>
              <div className="bc-field">
                <label htmlFor="contrasena">Contraseña</label>
                <input
                  id="contrasena"
                  name="contrasena"
                  type="password"
                  className="bc-input"
                  autoComplete="current-password"
                  placeholder="Ingresa tu contraseña"
                  value={contrasena}
                  onChange={(e) => setContrasena(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="bc-btn bc-btn-primary bc-login-submit" disabled={enviando}>
                {enviando && <span className="bc-login-spinner" aria-hidden="true" />}
                {enviando ? "Verificando acceso..." : "Ingresar a BioCenso"}
              </button>
            </form>

            <p className="bc-auth-alt">
              ¿No tienes cuenta? <Link to="/registro">Crear una cuenta</Link>
            </p>
            <p className="bc-login-security">
              <Icon name="check" size={15} /> Fincas, bovinos, censos y vacunas en un solo lugar.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}