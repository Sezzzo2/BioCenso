import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { extraerError } from "../../utils/errores.js";
import Icon from "../../components/ui/Icon.jsx";
import { AlertMessage, FormField } from "../../components/ui/SharedUI.jsx";

// Aviso que deja api.js cuando el token vence a mitad de la sesión
function leerAvisoSesion() {
  try {
    const aviso = sessionStorage.getItem("bc_aviso");
    if (aviso) sessionStorage.removeItem("bc_aviso");
    return aviso || "";
  } catch {
    return "";
  }
}

export default function Login() {
  const { iniciarSesion, autenticado } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const destino = location.state?.from?.pathname
    ? `${location.state.from.pathname}${location.state.from.search ?? ""}`
    : "/inicio";

  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [error, setError] = useState("");
  const [aviso] = useState(leerAvisoSesion);
  const [invalidos, setInvalidos] = useState([]);
  const [enviando, setEnviando] = useState(false);

  // Si ya hay sesión, no tiene sentido mostrar el login
  if (autenticado) return <Navigate to={destino} replace />;

  const manejarEnvio = async (e) => {
    e.preventDefault();
    setError("");
    const faltan = [!correo.trim() && "correo", !contrasena && "contrasena"].filter(Boolean);
    setInvalidos(faltan);
    if (faltan.length) {
      setError("Ingresa tu correo y tu contraseña.");
      document.getElementById(faltan[0])?.focus();
      return;
    }
    if (!e.currentTarget.elements.correo.checkValidity()) {
      setInvalidos(["correo"]);
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
    <div className="auth">
      <div>
        <h1>Conoce mejor tu finca. Cuida mejor tu ganado.</h1>
        <p className="bajada">Organiza tus fincas, lleva el registro de cada bovino y consulta censos y vacunación desde un solo lugar.</p>
        <ul>
          <li><Icon name="mapPin" />Información de tus fincas</li>
          <li><Icon name="history" />Historial y seguimiento del ganado</li>
          <li><Icon name="check" />Censos y vacunaciones organizados</li>
        </ul>
      </div>

      <form className="panel panel-solido auth-form" onSubmit={manejarEnvio} noValidate aria-busy={enviando}>
        <h2>Iniciar sesión</h2>
        <p className="sub">Ingresa tus datos para continuar.</p>
        {aviso && <AlertMessage type="warning" style={{ marginBottom: 16 }}>{aviso}</AlertMessage>}
        <FormField id="correo" label="Correo electrónico">
          <input id="correo" name="correo" type="email" className="ctl" autoComplete="email" placeholder="nombre@ejemplo.com"
            value={correo} onChange={(e) => setCorreo(e.target.value)} required aria-invalid={invalidos.includes("correo")} />
        </FormField>
        <FormField id="contrasena" label="Contraseña">
          <input id="contrasena" name="contrasena" type="password" className="ctl" autoComplete="current-password"
            placeholder="Tu contraseña" value={contrasena} onChange={(e) => setContrasena(e.target.value)} required
            aria-invalid={invalidos.includes("contrasena")} />
        </FormField>
        {error && <AlertMessage style={{ marginBottom: 14 }}>{error}</AlertMessage>}
        <button type="submit" className="btn btn-brote" disabled={enviando}>
          {enviando ? "Verificando acceso..." : "Ingresar a BioCenso"}
        </button>
        <p className="auth-alt">¿No tienes cuenta? <Link to="/registro">Crear una cuenta</Link></p>
      </form>
    </div>
  );
}
