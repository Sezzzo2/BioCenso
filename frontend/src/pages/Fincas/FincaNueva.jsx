import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { crearFinca } from "../../services/fincaService.js";
import { extraerError } from "../../utils/errores.js";
import { AlertMessage, FormField, PageHeader } from "../../components/ui/SharedUI.jsx";

export default function FincaNueva() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ nombre: "", municipio: "", departamento: "", direccion: "" });
  const [error, setError] = useState("");
  const [faltantes, setFaltantes] = useState([]);
  const [enviando, setEnviando] = useState(false);

  const cambiar = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setFaltantes((f) => f.filter((c) => c !== e.target.name));
  };

  const manejarEnvio = async (e) => {
    e.preventDefault();
    setError("");
    const vacios = ["nombre", "municipio", "departamento"].filter((c) => !form[c].trim());
    setFaltantes(vacios);
    if (vacios.length) {
      setError("Nombre, municipio y departamento son obligatorios.");
      document.getElementById(vacios[0])?.focus();
      return;
    }

    // La dirección es opcional: solo se envía si tiene contenido
    const datos = {
      nombre: form.nombre.trim(),
      municipio: form.municipio.trim(),
      departamento: form.departamento.trim(),
    };
    if (form.direccion.trim()) datos.direccion = form.direccion.trim();

    setEnviando(true);
    try {
      const finca = await crearFinca(datos);
      navigate(finca?.id_finca ? `/fincas/${finca.id_finca}` : "/fincas", {
        replace: true,
        state: { mensaje: "La finca se registró correctamente." },
      });
    } catch (err) {
      setError(extraerError(err));
    } finally {
      setEnviando(false);
    }
  };

  const campo = (name, label, props = {}) => (
    <FormField id={name} label={label} required={props.required} className={props.className}>
      <input id={name} name={name} className="ctl" value={form[name]} onChange={cambiar}
        placeholder={props.placeholder} autoComplete={props.autoComplete} maxLength={props.maxLength}
        aria-invalid={faltantes.includes(name)} />
    </FormField>
  );

  return (
    <>
      <PageHeader
        migas={[{ texto: "Fincas", ruta: "/fincas" }, { texto: "Registrar finca" }]}
        title="Registrar finca"
        description="Ingresa los datos básicos de la propiedad ganadera."
      />
      <form className="panel panel-solido panel-pad bloque form" onSubmit={manejarEnvio} noValidate aria-busy={enviando}>
        <fieldset>
          <legend>Identificación</legend>
          <p>El nombre permite reconocer esta propiedad en tus registros.</p>
          {campo("nombre", "Nombre de la finca", { required: true, placeholder: "Ej.: La Vitrina", autoComplete: "organization", maxLength: 150 })}
        </fieldset>
        <fieldset>
          <legend>Ubicación</legend>
          <p>La ubicación ayuda a diferenciar y encontrar tus propiedades.</p>
          <div className="rejilla">
            {campo("municipio", "Municipio", { required: true, placeholder: "Ej.: Villavicencio", autoComplete: "address-level2", maxLength: 100 })}
            {campo("departamento", "Departamento", { required: true, placeholder: "Ej.: Meta", autoComplete: "address-level1", maxLength: 100 })}
            {campo("direccion", "Dirección o vereda (opcional)", { className: "ancho", placeholder: "Ej.: Vereda El Hachón", autoComplete: "street-address", maxLength: 200 })}
          </div>
        </fieldset>
        {error && <AlertMessage style={{ marginBottom: 16 }}>{error}</AlertMessage>}
        <div className="form-acciones">
          <button type="submit" className="btn btn-brote" disabled={enviando}>{enviando ? "Guardando..." : "Guardar finca"}</button>
          <Link to="/fincas" className="btn btn-oscuro">Cancelar</Link>
        </div>
      </form>
    </>
  );
}
