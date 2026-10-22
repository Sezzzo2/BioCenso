import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "../../components/ui/Icon.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { AlertMessage, FormField } from "../../components/ui/SharedUI.jsx";
import { extraerError } from "../../utils/errores.js";

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function inicialesDe(usuario) {
  const partes = [usuario?.nombre, usuario?.apellido].filter(Boolean);
  const texto = partes.length ? partes.map((p) => p[0]).join("") : (usuario?.correo || "U")[0];
  return texto.slice(0, 2).toUpperCase();
}

export default function Usuario() {
  const { usuario, actualizarPerfil, cerrarSesion } = useAuth();
  const navigate = useNavigate();
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

  const cambiarCampo = (event) => setFormulario((actual) => ({ ...actual, [event.target.name]: event.target.value }));

  const empezarEdicion = () => {
    setFormulario({ nombre: usuario?.nombre ?? "", apellido: usuario?.apellido ?? "", correo: usuario?.correo ?? "" });
    setMensaje("");
    setError("");
    setEditando(true);
  };

  const guardarPerfil = async (event) => {
    event.preventDefault();
    setError("");
    setMensaje("");
    const datos = {
      nombre: formulario.nombre.trim(),
      apellido: formulario.apellido.trim(),
      correo: formulario.correo.trim().toLowerCase(),
    };
    if (!datos.nombre || !datos.apellido || !datos.correo) return setError("Nombre, apellido y correo son obligatorios.");
    if (!CORREO.test(datos.correo)) return setError("Ingresa un correo electrónico válido.");

    setGuardando(true);
    try {
      await actualizarPerfil(datos);
      setEditando(false);
      setMensaje("Los datos del perfil se actualizaron correctamente.");
    } catch (err) {
      setError(extraerError(err));
    } finally {
      setGuardando(false);
    }
  };

  const nombreCompleto = [usuario?.nombre, usuario?.apellido].filter(Boolean).join(" ") || "Usuario";

  return (
    <>
      <h1 className="titulo-vista">Usuario</h1>
      <p className="bajada">Consulta la información de tu cuenta y las opciones disponibles.</p>

      <div className="dos-col">
        <section className="panel panel-solido perfil" style={{ margin: 0, maxWidth: "none" }} aria-labelledby="t-perfil">
          <div className="perfil-top">
            <span className="avatar" aria-hidden="true">{inicialesDe(usuario)}</span>
            <div><h2 id="t-perfil">{nombreCompleto}</h2><p className="texto-suave">{usuario?.correo}</p></div>
          </div>

          {editando ? (
            <form className="form" onSubmit={guardarPerfil} noValidate aria-busy={guardando} style={{ marginTop: 22 }}>
              <div className="rejilla">
                <FormField id="perfil-nombre" label="Nombre">
                  <input id="perfil-nombre" name="nombre" className="ctl" autoComplete="given-name" value={formulario.nombre} onChange={cambiarCampo} />
                </FormField>
                <FormField id="perfil-apellido" label="Apellido">
                  <input id="perfil-apellido" name="apellido" className="ctl" autoComplete="family-name" value={formulario.apellido} onChange={cambiarCampo} />
                </FormField>
                <FormField id="perfil-correo" label="Correo electrónico" className="ancho">
                  <input id="perfil-correo" name="correo" type="email" className="ctl" autoComplete="email" value={formulario.correo} onChange={cambiarCampo} />
                </FormField>
              </div>
              {error && <AlertMessage style={{ marginBottom: 14 }}>{error}</AlertMessage>}
              <div className="form-acciones">
                <button className="btn btn-brote" type="submit" disabled={guardando}>{guardando ? "Guardando..." : "Guardar cambios"}</button>
                <button className="btn btn-oscuro" type="button" disabled={guardando} onClick={() => { setEditando(false); setError(""); }}>Cancelar</button>
              </div>
            </form>
          ) : (
            <>
              <dl>
                <dt>Nombre</dt><dd>{usuario?.nombre || "—"}</dd>
                <dt>Apellido</dt><dd>{usuario?.apellido || "—"}</dd>
                <dt>Correo electrónico</dt><dd>{usuario?.correo || "—"}</dd>
                <dt>Rol asignado</dt><dd>{usuario?.rol || "No disponible"}</dd>
              </dl>
              {mensaje && <AlertMessage type="success">{mensaje}</AlertMessage>}
              <button className="btn btn-oscuro" style={{ marginTop: 24 }} type="button" onClick={empezarEdicion}>
                <Icon name="edit" />Editar información
              </button>
            </>
          )}
        </section>

        <section className="panel panel-solido perfil" style={{ margin: 0, maxWidth: "none" }} aria-labelledby="t-seguridad">
          <h2 id="t-seguridad">Seguridad</h2>
          <ul className="lista-enl" style={{ marginTop: 16 }}>
            <li>
              <div className="lista-item">
                <span className="ico"><Icon name="check" /></span>
                <span><strong>Sesión autenticada</strong><small>BioCenso valida tu sesión con un token seguro que vence a las pocas horas.</small></span>
              </div>
            </li>
            <li>
              <div className="lista-item">
                <span className="ico"><Icon name="user" /></span>
                <span><strong>Cambio de contraseña</strong><small>Esta opción todavía no está disponible en el servicio de cuenta.</small></span>
              </div>
            </li>
          </ul>
          <div className="form-acciones" style={{ marginTop: 22 }}>
            <button className="btn btn-brote" type="button" onClick={salir}><Icon name="logout" />Cerrar sesión</button>
          </div>
        </section>
      </div>
    </>
  );
}
