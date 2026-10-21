import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { crearFinca } from "../../services/fincaService.js";
import { extraerError } from "../../utils/errores.js";
import { FormField } from "../../components/ui/SharedUI.jsx";

export default function FincaNueva() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    nombre: "", municipio: "", departamento: "", direccion: "",
  });
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  const cambiar = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const manejarEnvio = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.nombre.trim() || !form.municipio.trim() || !form.departamento.trim()) {
      setError("Nombre, municipio y departamento son obligatorios.");
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

  return (
    <>
      <Link to="/fincas" className="bc-back">← Volver a mis fincas</Link>
      <div className="bc-page-head mt-3">
        <div>
          <span className="bc-module-eyebrow">Gestión de fincas</span>
          <h1>Registrar finca</h1>
          <p className="bc-page-description">Ingresa los datos básicos de la propiedad ganadera.</p>
        </div>
      </div>

      <form className="bc-card bc-form-narrow" onSubmit={manejarEnvio} noValidate>
        {error && <div className="bc-alert-error" role="alert">{error}</div>}

        <section className="bc-form-section" aria-labelledby="finca-identificacion-title">
          <h2 id="finca-identificacion-title">Identificación</h2>
          <p>El nombre permite reconocer esta propiedad en tus registros.</p>
          <FormField id="nombre" label="Nombre de la finca" required>
            <input id="nombre" name="nombre" className="bc-input" placeholder="Ej. La Vitrina"
                   autoComplete="organization" value={form.nombre} onChange={cambiar} required />
          </FormField>
        </section>
        <section className="bc-form-section" aria-labelledby="finca-ubicacion-title">
          <h2 id="finca-ubicacion-title">Ubicación</h2>
          <p>La ubicación ayuda a diferenciar y encontrar tus propiedades.</p>
          <div className="row g-3">
            <FormField id="municipio" label="Municipio" required className="col-12 col-sm-6">
              <input id="municipio" name="municipio" className="bc-input" placeholder="Ej. Villavicencio"
                     autoComplete="address-level2" value={form.municipio} onChange={cambiar} required />
            </FormField>
            <FormField id="departamento" label="Departamento" required className="col-12 col-sm-6">
              <input id="departamento" name="departamento" className="bc-input" placeholder="Ej. Meta"
                     autoComplete="address-level1" value={form.departamento} onChange={cambiar} required />
            </FormField>
          </div>
          <FormField id="direccion" label="Dirección o vereda" hint="Opcional">
            <input id="direccion" name="direccion" className="bc-input" placeholder="Ej. Vereda El Hachón"
                   autoComplete="street-address" value={form.direccion} onChange={cambiar} />
          </FormField>
        </section>

        <div className="bc-form-actions">
          <button type="submit" className="bc-btn bc-btn-primary" disabled={enviando}>
            {enviando ? "Guardando..." : "Guardar finca"}
          </button>
          <Link to="/fincas" className="bc-btn bc-btn-outline">Cancelar</Link>
        </div>
      </form>
    </>
  );
}