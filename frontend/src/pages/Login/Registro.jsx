import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { extraerError } from "../../utils/errores.js";

const REGLA_CONTRASENA = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
const CAMPOS_REQUERIDOS = ["nombre", "apellido", "correo", "contrasena", "confirmar"];

export default function Registro() {
  const { registrarse, autenticado } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    nombre: "", apellido: "", correo: "", contrasena: "", confirmar: "",
  });
  const [error, setError] = useState("");
  const [erroresCampo, setErroresCampo] = useState({});
  const [enviando, setEnviando] = useState(false);

  if (autenticado) return <Navigate to="/fincas" replace />;

  const cambiar = (e) => {
    const { name, value } = e.target;
    setForm((actual) => ({ ...actual, [name]: value }));
    setErroresCampo((actual) => ({ ...actual, [name]: "" }));
    setError("");
  };

  const manejarEnvio = async (e) => {
    e.preventDefault();
    setError("");
    const nuevosErrores = {};

    for (const campo of CAMPOS_REQUERIDOS) {
      if (!form[campo].trim()) nuevosErrores[campo] = "Este campo es obligatorio.";
    }
    if (form.correo.trim() && !e.currentTarget.elements.correo.checkValidity()) {
      nuevosErrores.correo = "Ingresa un correo electrónico válido.";
    }
    if (form.contrasena && !REGLA_CONTRASENA.test(form.contrasena)) {
      nuevosErrores.contrasena = "Usa al menos 8 caracteres, una mayúscula, una minúscula y un número.";
    }
    if (form.confirmar && form.contrasena !== form.confirmar) {
      nuevosErrores.confirmar = "Las contraseñas no coinciden.";
    }

    setErroresCampo(nuevosErrores);
    if (Object.keys(nuevosErrores).length > 0) {
      setError("Revisa los campos señalados para continuar.");
      return;
    }

    setEnviando(true);
    try {
      await registrarse({
        nombre: form.nombre.trim(),
        apellido: form.apellido.trim(),
        correo: form.correo.trim(),
        contrasena: form.contrasena,
      });
      navigate("/fincas", {
        replace: true,
        state: { mensaje: "Tu cuenta fue creada correctamente. Ya puedes gestionar tus fincas." },
      });
    } catch (err) {
      setError(extraerError(err));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="bc-login-page bc-register-page">
      <header className="bc-login-nav">
        <Link to="/" className="bc-login-brand" aria-label="BioCenso, ir al inicio">
          <span className="bc-login-brand__mark" aria-hidden="true">B</span>
          <span>Bio<strong>Censo</strong></span>
        </Link>
        <p>Gestión pecuaria, con información clara.</p>
      </header>

      <main className="bc-register">
        <section className="bc-register-intro">
          <span className="bc-login-eyebrow">Empieza con BioCenso</span>
          <h1>Un registro ordenado para una gestión más sencilla.</h1>
          <p>
            Crea tu cuenta para organizar la información de tus fincas, bovinos,
            censos y vacunas.
          </p>
          <div className="bc-register-role-note">
            <span aria-hidden="true">✓</span>
            Las cuentas nuevas se crean con el rol Ganadero.
          </div>
        </section>

        <section className="bc-register-form-panel" aria-labelledby="registro-title">
          <form className="bc-register-card" onSubmit={manejarEnvio} noValidate aria-busy={enviando}>
            <span className="bc-login-card__eyebrow">Registro de usuario</span>
            <h2 id="registro-title">Crear cuenta</h2>
            <p className="bc-login-card__intro">Completa tus datos para comenzar.</p>
            {error && <div className="bc-alert-error" role="alert">{error}</div>}

            <fieldset className="bc-register-group">
              <legend>Información personal</legend>
              <div className="row g-3">
                <div className="col-12 col-sm-6 bc-field">
                  <label htmlFor="nombre">Nombre <span aria-hidden="true">*</span></label>
                  <input id="nombre" name="nombre" className="bc-input" autoComplete="given-name"
                    placeholder="Ej. María" value={form.nombre} onChange={cambiar} required
                    aria-invalid={Boolean(erroresCampo.nombre)}
                    aria-describedby={erroresCampo.nombre ? "nombre-error" : undefined} />
                  {erroresCampo.nombre && <p id="nombre-error" className="bc-field-error">{erroresCampo.nombre}</p>}
                </div>
                <div className="col-12 col-sm-6 bc-field">
                  <label htmlFor="apellido">Apellido <span aria-hidden="true">*</span></label>
                  <input id="apellido" name="apellido" className="bc-input" autoComplete="family-name"
                    placeholder="Ej. Rodríguez" value={form.apellido} onChange={cambiar} required
                    aria-invalid={Boolean(erroresCampo.apellido)}
                    aria-describedby={erroresCampo.apellido ? "apellido-error" : undefined} />
                  {erroresCampo.apellido && <p id="apellido-error" className="bc-field-error">{erroresCampo.apellido}</p>}
                </div>
              </div>
              <div className="bc-field">
                <label htmlFor="correo">Correo electrónico <span aria-hidden="true">*</span></label>
                <input id="correo" name="correo" type="email" className="bc-input" autoComplete="email"
                  placeholder="nombre@ejemplo.com" value={form.correo} onChange={cambiar} required
                  aria-invalid={Boolean(erroresCampo.correo)}
                  aria-describedby={erroresCampo.correo ? "correo-error" : undefined} />
                {erroresCampo.correo && <p id="correo-error" className="bc-field-error">{erroresCampo.correo}</p>}
              </div>
            </fieldset>

            <fieldset className="bc-register-group">
              <legend>Seguridad de la cuenta</legend>
              <div className="bc-field">
                <label htmlFor="contrasena">Contraseña <span aria-hidden="true">*</span></label>
                <input id="contrasena" name="contrasena" type="password" className="bc-input"
                  autoComplete="new-password" placeholder="Crea una contraseña segura"
                  value={form.contrasena} onChange={cambiar} required
                  aria-invalid={Boolean(erroresCampo.contrasena)}
                  aria-describedby={erroresCampo.contrasena ? "contrasena-error contrasena-ayuda" : "contrasena-ayuda"} />
                {erroresCampo.contrasena && <p id="contrasena-error" className="bc-field-error">{erroresCampo.contrasena}</p>}
                <p id="contrasena-ayuda" className="bc-field-hint">Mínimo 8 caracteres, con mayúscula, minúscula y número.</p>
              </div>
              <div className="bc-field">
                <label htmlFor="confirmar">Confirmar contraseña <span aria-hidden="true">*</span></label>
                <input id="confirmar" name="confirmar" type="password" className="bc-input"
                  autoComplete="new-password" placeholder="Escribe de nuevo tu contraseña"
                  value={form.confirmar} onChange={cambiar} required
                  aria-invalid={Boolean(erroresCampo.confirmar)}
                  aria-describedby={erroresCampo.confirmar ? "confirmar-error" : undefined} />
                {erroresCampo.confirmar && <p id="confirmar-error" className="bc-field-error">{erroresCampo.confirmar}</p>}
              </div>
            </fieldset>

            <button type="submit" className="bc-btn bc-btn-primary bc-login-submit" disabled={enviando}>
              {enviando && <span className="bc-login-spinner" aria-hidden="true" />}
              {enviando ? "Creando cuenta..." : "Crear cuenta"}
            </button>

            <p className="bc-auth-alt">
              ¿Ya tienes cuenta? <Link to="/login">Volver al inicio de sesión</Link>
            </p>
          </form>
        </section>
      </main>
    </div>
  );
}