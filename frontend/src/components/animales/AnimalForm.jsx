import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { extraerError } from "../../utils/errores.js";
import { hoyISO } from "../../utils/format.js";
import { SEXOS, ESTADOS_REPRODUCTIVOS, ESTADOS_GENERALES } from "../../utils/catalogos.js";
import { AlertMessage, FormField, SelectField } from "../ui/SharedUI.jsx";

const MAX_MB = 5;

export default function AnimalForm({ inicial = {}, imagenActual = null, textoBoton, cancelarA, onSubmit }) {
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

  useEffect(() => () => {
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
  }, []);

  const cambiar = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setFieldErrors((actuales) => ({ ...actuales, [e.target.name]: "" }));
  };

  const elegirImagen = (e) => {
    const archivo = e.target.files?.[0];
    setError("");
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    previewUrl.current = null;
    setPreview(null);
    setImagen(null);
    if (!archivo) return;
    if (!archivo.type.startsWith("image/")) {
      e.target.value = "";
      return setError("El archivo debe ser una imagen (PNG, JPG, WEBP...).");
    }
    if (archivo.size > MAX_MB * 1024 * 1024) {
      e.target.value = "";
      return setError(`La imagen supera los ${MAX_MB} MB.`);
    }
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
    const primero = Object.keys(errores)[0];
    if (primero) {
      document.getElementById(primero)?.focus();
      return;
    }

    setEnviando(true);
    try {
      await onSubmit(form, imagen);
    } catch (err) {
      setError(extraerError(err));
    } finally {
      setEnviando(false);
    }
  };

  const foto = preview || imagenActual;

  return (
    <form className="panel panel-solido panel-pad bloque form" onSubmit={manejarEnvio} noValidate aria-busy={enviando}>
      <fieldset>
        <legend>Datos de identificación</legend>
        <p>El número debe ser único dentro de la finca.</p>
        <div className="rejilla">
          <FormField id="numero_animal" label="Número del animal" required error={fieldErrors.numero_animal}>
            {({ describedBy }) => (
              <input id="numero_animal" name="numero_animal" className="ctl" placeholder="Ej.: LV-001" maxLength={100}
                value={form.numero_animal} onChange={cambiar} aria-required="true"
                aria-invalid={Boolean(fieldErrors.numero_animal)} aria-describedby={describedBy} />
            )}
          </FormField>
          <FormField id="sexo" label="Sexo" required error={fieldErrors.sexo}>
            {({ describedBy }) => (
              <SelectField id="sexo" name="sexo" value={form.sexo} onChange={cambiar} aria-required="true"
                aria-invalid={Boolean(fieldErrors.sexo)} aria-describedby={describedBy}>
                <option value="">Seleccionar…</option>
                {SEXOS.map((s) => <option key={s} value={s}>{s}</option>)}
              </SelectField>
            )}
          </FormField>
          <FormField id="fecha_nacimiento" label="Fecha de nacimiento (opcional)">
            <input id="fecha_nacimiento" name="fecha_nacimiento" type="date" className="ctl" max={hoyISO()}
              value={form.fecha_nacimiento} onChange={cambiar} />
          </FormField>
          <FormField id="peso" label="Peso en kg (opcional)" error={fieldErrors.peso}>
            {({ describedBy }) => (
              <input id="peso" name="peso" type="number" min="0" step="0.1" inputMode="decimal" className="ctl"
                placeholder="Ej.: 380" value={form.peso} onChange={cambiar}
                aria-invalid={Boolean(fieldErrors.peso)} aria-describedby={describedBy} />
            )}
          </FormField>
        </div>
      </fieldset>

      <fieldset>
        <legend>Salud y seguimiento <span className="tenue" style={{ fontWeight: 400, fontSize: ".9rem" }}>opcional</span></legend>
        <p>Estado actual del animal.</p>
        <div className="rejilla">
          <FormField id="estado_reproductivo" label="Estado reproductivo">
            <SelectField id="estado_reproductivo" name="estado_reproductivo" value={form.estado_reproductivo} onChange={cambiar}>
              <option value="">Seleccionar…</option>
              {ESTADOS_REPRODUCTIVOS.map((s) => <option key={s} value={s}>{s}</option>)}
            </SelectField>
          </FormField>
          <FormField id="estado_general" label="Estado general">
            <SelectField id="estado_general" name="estado_general" value={form.estado_general} onChange={cambiar}>
              <option value="">Seleccionar…</option>
              {ESTADOS_GENERALES.map((s) => <option key={s} value={s}>{s}</option>)}
            </SelectField>
          </FormField>
          <FormField id="enfermedad" label="Enfermedad" className="ancho">
            <input id="enfermedad" name="enfermedad" className="ctl" maxLength={255}
              placeholder="Indica una enfermedad si aplica" value={form.enfermedad} onChange={cambiar} />
          </FormField>
        </div>
      </fieldset>

      <fieldset>
        <legend>Fotografía <span className="tenue" style={{ fontWeight: 400, fontSize: ".9rem" }}>opcional</span></legend>
        <p>Una foto ayuda a reconocer al animal en el potrero (máx. {MAX_MB} MB).</p>
        <FormField id="imagen" label="Foto del animal">
          <input id="imagen" type="file" accept="image/*" className="ctl" onChange={elegirImagen} />
        </FormField>
        {foto && <img src={foto} alt={preview ? "Vista previa de la foto seleccionada" : "Foto actual del animal"} className="foto-prev" />}
      </fieldset>

      {error && <AlertMessage style={{ marginBottom: 16 }}>{error}</AlertMessage>}
      <div className="form-acciones">
        <button type="submit" className="btn btn-brote" disabled={enviando}>{enviando ? "Guardando..." : textoBoton}</button>
        <Link to={cancelarA} className="btn btn-oscuro">Cancelar</Link>
      </div>
    </form>
  );
}
