import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { extraerError } from "../../utils/errores.js";
import Icon from "../../components/ui/Icon.jsx";
import { AlertMessage, FormField } from "../../components/ui/SharedUI.jsx";

const REGLA_CONTRASENA = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
const CAMPOS_REQUERIDOS = ["nombre", "apellido", "correo", "contrasena", "confirmar"];

export default function Registro() {
  const { registrarse, autenticado } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ nombre: "", apellido: "", correo: "", contrasena: "", confirmar: "" });
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
    const nuevos = {};
    for (const campo of CAMPOS_REQUERIDOS) {
      if (!form[campo].trim()) nuevos[campo] = "Este campo es obligatorio.";
    }
    if (form.correo.trim() && !e.currentTarget.elements.correo.checkValidity()) {
      nuevos.correo = "Ingresa un correo electrónico válido.";
    }
    if (form.contrasena && !REGLA_CONTRASENA.test(form.contrasena)) {
      nuevos.contrasena = "Usa al menos 8 caracteres, una mayúscula, una minúscula y un número.";
    }
    if (form.confirmar && form.contrasena !== form.confirmar) {
      nuevos.confirmar = "Las contraseñas no coinciden.";
    }
    setErroresCampo(nuevos);
    const primero = CAMPOS_REQUERIDOS.find((c) => nuevos[c]);
    if (primero) {
      setError("Revisa los campos señalados para continuar.");
      document.getElementById(primero)?.focus();
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
        state: { mensaje: "Tu cuenta fue creada. Ya puedes registrar tus fincas." },
      });
    } catch (err) {
      setError(extraerError(err));
    } finally {
      setEnviando(false);
    }
  };

  const campo = (name, label, props = {}) => (
    <FormField id={name} label={label} required hint={props.hint} error={erroresCampo[name]} className={props.className}>
      {({ describedBy }) => (
        <input id={name} name={name} type={props.type ?? "text"} className="ctl" autoComplete={props.autoComplete}
          placeholder={props.placeholder} value={form[name]} onChange={cambiar}
          aria-invalid={Boolean(erroresCampo[name])} aria-describedby={describedBy} />
      )}
    </FormField>
  );

  return (
    <div className="auth">
      <div>
        <h1>Un registro ordenado para una gestión más sencilla</h1>
        <p className="bajada">Crea tu cuenta para organizar la información de tus fincas, bovinos, censos y vacunas.</p>
        <ul>
          <li><Icon name="check" />Solo tú ves la información de tus fincas.</li>
          <li><Icon name="user" />Las cuentas nuevas se crean con el rol Ganadero.</li>
        </ul>
      </div>

      <form className="panel panel-solido auth-form" onSubmit={manejarEnvio} noValidate aria-busy={enviando}>
        <h2>Crear cuenta</h2>
        <p className="sub">Completa tus datos para comenzar.</p>
        <div className="rejilla">
          {campo("nombre", "Nombre", { autoComplete: "given-name", placeholder: "Ej.: María" })}
          {campo("apellido", "Apellido", { autoComplete: "family-name", placeholder: "Ej.: Rodríguez" })}
        </div>
        {campo("correo", "Correo electrónico", { type: "email", autoComplete: "email", placeholder: "nombre@ejemplo.com" })}
        {campo("contrasena", "Contraseña", {
          type: "password", autoComplete: "new-password", placeholder: "Crea una contraseña segura",
          hint: "Mínimo 8 caracteres, con mayúscula, minúscula y número.",
        })}
        {campo("confirmar", "Confirmar contraseña", { type: "password", autoComplete: "new-password", placeholder: "Escríbela de nuevo" })}
        {error && <AlertMessage style={{ marginBottom: 14 }}>{error}</AlertMessage>}
        <button type="submit" className="btn btn-brote" disabled={enviando}>{enviando ? "Creando cuenta..." : "Crear cuenta"}</button>
        <p className="auth-alt">¿Ya tienes cuenta? <Link to="/login">Iniciar sesión</Link></p>
      </form>
    </div>
  );
}
