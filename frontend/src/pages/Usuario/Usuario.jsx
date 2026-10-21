import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Icon from "../../components/ui/Icon.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { AlertMessage } from "../../components/ui/SharedUI.jsx";
import { extraerError } from "../../utils/errores.js";
import "./Usuario.css";

function inicialesDe(usuario) {
  const nombre = usuario?.nombre || usuario?.correo || "Usuario";
  return nombre
    .split(/[ @._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0])
    .join("")
    .toUpperCase();
}

function etiquetaRol(rol) {
  if (rol === "Administrador") return "Administrador";
  if (rol === "Ganadero") return "Ganadero";
  return rol || "No disponible";
}

export default function Usuario() {
  const { usuario, actualizarPerfil, cerrarSesion } = useAuth();
  const navigate = useNavigate();
  const nombre = usuario?.nombre || "Nombre no disponible en la sesión actual";
  const correo = usuario?.correo || "Correo no disponible";
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [formulario, setFormulario] = useState(() => ({
    nombre: usuario?.nombre ?? "",
    apellido: usuario?.apellido ?? "",
    correo: usuario?.correo ?? "",
  }));

  const salir = () => {
    cerrarSesion();
    navigate("/", { replace: true });
  };

  const cambiarCampo = (event) => {
    setFormulario((actual) => ({ ...actual, [event.target.name]: event.target.value }));
  };

  const guardarPerfil = async (event) => {
    event.preventDefault();
    setGuardando(true);
    setError("");
    setMensaje("");

    try {
      await actualizarPerfil(formulario);
      setEditando(false);
      setMensaje("Los datos del perfil se actualizaron correctamente.");
    } catch (err) {
      setError(extraerError(err));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="bc-profile-page">
      <header className="bc-page-head">
        <div>
          <span className="bc-module-eyebrow">Cuenta</span>
          <h1>Perfil de usuario</h1>
          <p className="bc-page-description">Consulta la información de tu cuenta y las opciones disponibles.</p>
        </div>
      </header>

      <section className="bc-card bc-profile-card" aria-labelledby="perfil-identidad">
        <div className="bc-profile-identity">
          <span className="bc-profile-avatar" aria-hidden="true">{inicialesDe(usuario)}</span>
          <div>
            <span className="bc-module-eyebrow">Información personal</span>
            <h2 id="perfil-identidad">{nombre}</h2>
            <p><Icon name="mail" size={17} /> {correo}</p>
          </div>
        </div>
        <span className="bc-profile-role">
          <Icon name="user" size={16} /> {etiquetaRol(usuario?.rol)}
        </span>
      </section>

      <div className="bc-profile-grid">
        <section className="bc-card bc-profile-section" aria-labelledby="perfil-datos-title">
          <span className="bc-module-eyebrow">Datos de la cuenta</span>
          <h2 id="perfil-datos-title">{editando ? "Editar información" : "Información registrada"}</h2>
          {error && <AlertMessage>{error}</AlertMessage>}
          {mensaje && <AlertMessage type="success">{mensaje}</AlertMessage>}
          {editando ? (
            <form className="bc-profile-form" onSubmit={guardarPerfil}>
              <label htmlFor="perfil-nombre">Nombre</label>
              <input id="perfil-nombre" name="nombre" value={formulario.nombre}
                onChange={cambiarCampo} maxLength={100} required />
              <label htmlFor="perfil-apellido">Apellido</label>
              <input id="perfil-apellido" name="apellido" value={formulario.apellido}
                onChange={cambiarCampo} maxLength={100} required />
              <label htmlFor="perfil-correo">Correo electrónico</label>
              <input id="perfil-correo" name="correo" type="email" value={formulario.correo}
                onChange={cambiarCampo} required />
              <div className="bc-profile-form-actions">
                <button type="submit" className="bc-btn bc-btn-primary" disabled={guardando}>
                  {guardando ? "Guardando..." : "Guardar cambios"}
                </button>
                <button type="button" className="bc-btn bc-btn-outline" disabled={guardando}
                  onClick={() => { setEditando(false); setError(""); }}>
                  Cancelar
                </button>
              </div>
            </form>
          ) : (
            <>
              <dl className="bc-profile-details">
                <div><dt>Nombre</dt><dd>{usuario?.nombre || "No disponible en la sesión actual"}</dd></div>
                <div><dt>Apellido</dt><dd>{usuario?.apellido || "No disponible en la sesión actual"}</dd></div>
                <div><dt>Correo electrónico</dt><dd>{correo}</dd></div>
                <div><dt>Rol asignado</dt><dd>{etiquetaRol(usuario?.rol)}</dd></div>
              </dl>
              <button type="button" className="bc-btn bc-btn-outline bc-profile-edit"
                onClick={() => { setEditando(true); setMensaje(""); }}>
                <Icon name="edit" size={17} /> Editar perfil
              </button>
            </>
          )}
          <p className="bc-profile-note">
            El rol se asigna y valida en el servidor. No es editable desde esta pantalla.
          </p>
        </section>

        <section className="bc-card bc-profile-section" aria-labelledby="perfil-seguridad-title">
          <span className="bc-module-eyebrow">Seguridad</span>
          <h2 id="perfil-seguridad-title">Opciones disponibles</h2>
          <div className="bc-profile-security">
            <span className="bc-profile-security__icon"><Icon name="check" size={19} /></span>
            <div>
              <strong>Sesión autenticada</strong>
              <p>BioCenso valida tu sesión mediante un token seguro.</p>
            </div>
          </div>
          <div className="bc-profile-security">
            <span className="bc-profile-security__icon"><Icon name="alert" size={19} /></span>
            <div>
              <strong>Cambio de contraseña</strong>
              <p>Esta opción no está disponible todavía en el servicio de cuenta.</p>
            </div>
          </div>
          <button type="button" className="bc-btn bc-btn-outline bc-profile-logout" onClick={salir}>
            <Icon name="logout" size={18} /> Cerrar sesión
          </button>
        </section>
      </div>

      <div className="bc-profile-backlink">
        <Link to="/dashboard">← Volver al panel general</Link>
      </div>
    </div>
  );
}
