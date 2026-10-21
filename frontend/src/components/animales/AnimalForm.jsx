import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { extraerError } from "../../utils/errores.js";
import {
  SEXOS, ESTADOS_REPRODUCTIVOS, ESTADOS_GENERALES,
} from "../../utils/catalogos.js";
import "./animales.css";

const MAX_MB = 5;

export default function AnimalForm({
  inicial = {}, imagenActual = null, textoBoton, cancelarA, onSubmit,
}) {
  const [form, setForm] = useState({
    numero_animal: inicial.numero_animal ?? "",
    fecha_nacimiento: inicial.fecha_nacimiento ? String(inicial.fecha_nacimiento).slice(0, 10) : "",
    peso: inicial.peso ?? "",
    sexo: inicial.sexo ?? "",
    estado_reproductivo: inicial.estado_reproductivo ?? "",
    estado_general: inicial.estado_general ?? "",
    enfermedad: inicial.enfermedad ?? "",
  });
  const [imagen, setImagen] = useState(null);
  const [preview, setPreview] = useState(null);
  const previewUrl = useRef(null);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    };
  }, []);

  const cambiar = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setFieldErrors((actuales) => ({ ...actuales, [e.target.name]: "" }));
  };

  const elegirImagen = (e) => {
    const archivo = e.target.files?.[0];
    setError("");
    if (!archivo) {
      if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
      previewUrl.current = null;
      setPreview(null);
      setImagen(null);
      return;
    }
    if (!archivo.type.startsWith("image/")) {
      e.target.value = "";
      return setError("El archivo debe ser una imagen (PNG, JPG, WEBP...).");
    }
    if (archivo.size > MAX_MB * 1024 * 1024) {
      e.target.value = "";
      return setError(`La imagen supera los ${MAX_MB} MB.`);
    }
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    previewUrl.current = URL.createObjectURL(archivo);
    setPreview(previewUrl.current);
    setImagen(archivo);
  };

  const manejarEnvio = async (e) => {
    e.preventDefault();
    setError("");
    const errores = {};
    if (!form.numero_animal.trim()) errores.numero_animal = "El número del animal es obligatorio.";
    if (!form.sexo) errores.sexo = "Selecciona el sexo.";
    if (form.peso !== "" && (!Number.isFinite(Number(form.peso)) || Number(form.peso) <= 0)) {
      errores.peso = "El peso debe ser mayor que 0.";
    }
    setFieldErrors(errores);
    if (Object.keys(errores).length > 0) return;

    setEnviando(true);
    try {
      await onSubmit(form, imagen);
    } catch (err) {
      setError(extraerError(err));
    } finally {
      setEnviando(false);
    }
  };

  const hoy = new Date().toISOString().slice(0, 10);

  return (
    <form className="bc-card bc-animal-form" onSubmit={manejarEnvio} noValidate>
      {error && <div className="bc-alert-error" role="alert">{error}</div>}

      <div className="bc-animal-form__intro">
        <span className="bc-animal-form__eyebrow">Ficha del animal</span>
        <p>Completa los datos principales. Los campos opcionales puedes agregarlos ahora o más adelante.</p>
      </div>

      <section className="bc-animal-form__section" aria-labelledby="animal-datos-title">
        <h2 id="animal-datos-title">Datos de identificación</h2>
        <div className="row g-3">
          <div className="col-12 col-sm-6 bc-field">
            <label htmlFor="numero_animal">Número del animal</label>
            <input id="numero_animal" name="numero_animal" className="bc-input" placeholder="Ej. A-001"
                   value={form.numero_animal} onChange={cambiar} required aria-required="true"
                   aria-invalid={Boolean(fieldErrors.numero_animal)}
                   aria-describedby={fieldErrors.numero_animal ? "numero_animal-error" : undefined} />
            {fieldErrors.numero_animal && <p id="numero_animal-error" className="bc-animal-field-error">{fieldErrors.numero_animal}</p>}
          </div>
          <div className="col-12 col-sm-6 bc-field">
            <label htmlFor="sexo">Sexo</label>
            <select id="sexo" name="sexo" className="bc-input" value={form.sexo} onChange={cambiar}
                    required aria-required="true" aria-invalid={Boolean(fieldErrors.sexo)}
                    aria-describedby={fieldErrors.sexo ? "sexo-error" : undefined}>
              <option value="">Seleccionar...</option>
              {SEXOS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            {fieldErrors.sexo && <p id="sexo-error" className="bc-animal-field-error">{fieldErrors.sexo}</p>}
          </div>
          <div className="col-12 col-sm-6 bc-field">
            <label htmlFor="fecha_nacimiento">Fecha de nacimiento</label>
            <input id="fecha_nacimiento" name="fecha_nacimiento" type="date" className="bc-input"
                   max={hoy} value={form.fecha_nacimiento} onChange={cambiar} />
          </div>
          <div className="col-12 col-sm-6 bc-field">
            <label htmlFor="peso">Peso (kg)</label>
            <input id="peso" name="peso" type="number" min="0" step="0.1" className="bc-input"
                   value={form.peso} onChange={cambiar} aria-invalid={Boolean(fieldErrors.peso)}
                   aria-describedby={fieldErrors.peso ? "peso-error" : undefined} />
            {fieldErrors.peso && <p id="peso-error" className="bc-animal-field-error">{fieldErrors.peso}</p>}
          </div>
        </div>
      </section>

      <section className="bc-animal-form__section" aria-labelledby="animal-salud-title">
        <h2 id="animal-salud-title">Salud y seguimiento <span>Opcional</span></h2>
        <div className="row g-3">
          <div className="col-12 col-sm-6 bc-field">
            <label htmlFor="estado_reproductivo">Estado reproductivo</label>
            <input id="estado_reproductivo" name="estado_reproductivo" className="bc-input"
                   list="lista-reproductivo" value={form.estado_reproductivo} onChange={cambiar} />
            <datalist id="lista-reproductivo">
              {ESTADOS_REPRODUCTIVOS.map((s) => <option key={s} value={s} />)}
            </datalist>
          </div>
          <div className="col-12 col-sm-6 bc-field">
            <label htmlFor="estado_general">Estado general</label>
            <input id="estado_general" name="estado_general" className="bc-input"
                   list="lista-general" value={form.estado_general} onChange={cambiar} />
            <datalist id="lista-general">
              {ESTADOS_GENERALES.map((s) => <option key={s} value={s} />)}
            </datalist>
          </div>
          <div className="col-12 bc-field">
            <label htmlFor="enfermedad">Enfermedad</label>
            <input id="enfermedad" name="enfermedad" className="bc-input"
                   placeholder="Indica una enfermedad si aplica"
                   value={form.enfermedad} onChange={cambiar} />
          </div>
        </div>
      </section>

      <section className="bc-animal-form__section" aria-labelledby="animal-foto-title">
        <h2 id="animal-foto-title">Fotografía <span>Opcional</span></h2>
        <div className="bc-field">
          <label htmlFor="imagen">Foto del animal (máx. {MAX_MB} MB)</label>
          <input id="imagen" type="file" accept="image/*" className="bc-input" onChange={elegirImagen} />
          {preview && <img src={preview} alt="Vista previa de la foto seleccionada" className="bc-preview" />}
          {!preview && imagenActual && (
            <img src={imagenActual} alt="Foto actual del animal" className="bc-preview" />
          )}
        </div>
      </section>

      <div className="bc-form-actions bc-animal-form__actions">
        <button type="submit" className="bc-btn bc-btn-primary" disabled={enviando}>
          {enviando ? "Guardando..." : textoBoton}
        </button>
        <Link to={cancelarA} className="bc-btn bc-btn-outline">Cancelar</Link>
      </div>
    </form>
  );
}