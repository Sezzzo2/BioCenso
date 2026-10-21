import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { listarFincas } from "../../services/fincaService.js";
import { crearCenso, idDeCenso } from "../../services/censoService.js";
import { extraerError } from "../../utils/errores.js";

// PROVISIONAL: iguala el límite al del backend (multer)
const MAX_MB = 200;

function mensajeDeError(err) {
  if (err.code === "ERR_CANCELED") return "Subida cancelada.";
  if (err.code === "ECONNABORTED") {
    return "La operación tardó demasiado. Prueba con un archivo más corto o más liviano.";
  }
  if (!err.response) {
    return "No se pudo conectar con el servidor. Verifica que el backend esté en ejecución.";
  }
  switch (err.response.status) {
    case 404: return "La finca no existe o no te pertenece.";
    case 413: return "El archivo supera el tamaño que acepta el servidor.";
    case 502: return "El servicio de inteligencia artificial no respondió. Verifica que esté en ejecución e inténtalo de nuevo.";
    default: return extraerError(err); // el 422 trae el motivo (formato no permitido, etc.)
  }
}

export default function CensoNuevo() {
  const [params] = useSearchParams();
  const [fincas, setFincas] = useState([]);
  const [cargandoFincas, setCargandoFincas] = useState(true);
  const [idFinca, setIdFinca] = useState(params.get("finca") ?? "");
  const [nota, setNota] = useState("");
  const [archivo, setArchivo] = useState(null);
  const [preview, setPreview] = useState(null);

  const [fase, setFase] = useState("inicial"); // inicial | subiendo | analizando | listo
  const [progreso, setProgreso] = useState(0);
  const [error, setError] = useState("");
  const [resultado, setResultado] = useState(null);
  const controlador = useRef(null);
  const inputArchivo = useRef(null);

  useEffect(() => {
    listarFincas()
      .then((lista) => {
        setFincas(lista);
        if (!params.get("finca") && lista.length === 1) setIdFinca(String(lista[0].id_finca));
      })
      .catch((err) => setError(extraerError(err)))
      .finally(() => setCargandoFincas(false));
  }, [params]);

  // Vista previa del archivo elegido
  useEffect(() => {
    if (!archivo) { setPreview(null); return; }
    const url = URL.createObjectURL(archivo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [archivo]);

  const elegirArchivo = (e) => {
    const f = e.target.files?.[0];
    setError("");
    if (!f) return setArchivo(null);
    if (!f.type.startsWith("video/") && !f.type.startsWith("image/")) {
      e.target.value = "";
      return setError("El archivo debe ser un video o una imagen.");
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      e.target.value = "";
      return setError(`El archivo supera los ${MAX_MB} MB.`);
    }
    setArchivo(f);
  };

  const enviar = async (e) => {
    e.preventDefault();
    setError("");
    if (!idFinca) return setError("Selecciona la finca del censo.");
    if (!archivo) return setError("Selecciona el video del dron.");

    controlador.current = new AbortController();
    setProgreso(0);
    setFase("subiendo");
    try {
      const data = await crearCenso({
        idFinca, nota, archivo,
        signal: controlador.current.signal,
        onProgress: (p) => {
          setProgreso(p);
          if (p >= 100) setFase("analizando"); // ya se subió: el servidor está procesando
        },
      });
      setResultado(data);
      setFase("listo");
    } catch (err) {
      setError(mensajeDeError(err));
      setFase("inicial");
    }
  };

  const cancelar = () => controlador.current?.abort();

  const reiniciar = () => {
    setArchivo(null); setNota(""); setResultado(null); setProgreso(0);
    setError(""); setFase("inicial");
    if (inputArchivo.current) inputArchivo.current.value = "";
  };

  const ocupado = fase === "subiendo" || fase === "analizando";
  const volverA = idFinca ? `/fincas/${idFinca}` : "/fincas";

  /* ---------- Resultado ---------- */
  if (fase === "listo") {
    return (
      <>
        {idDeCenso(resultado) && (
          <Link to={`/fincas/${idFinca}/censos/${idDeCenso(resultado)}`} className="bc-btn bc-btn-outline">
            Ver detalle
          </Link>
        )}
        <Link to={volverA} className="bc-back">← Volver a la finca</Link>
        <div className="bc-page-head mt-3"><h1>Censo registrado</h1></div>

        <div className="bc-alert-ok">
          El censo se procesó y se guardó{idDeCenso(resultado) ? ` (n.º ${idDeCenso(resultado)})` : ""}.
        </div>
        <div className="bc-demo-note">
          Resultado de demostración: el análisis lo hace un servicio simulado, porque el modelo real
          todavía no está entrenado.
        </div>

        <div className="bc-form-actions mb-4">
          <Link to={volverA} className="bc-btn bc-btn-primary">Ir a la finca</Link>
          <button className="bc-btn bc-btn-outline" onClick={reiniciar}>Registrar otro censo</button>
        </div>

      </>
    );
  }

  /* ---------- Formulario ---------- */
  return (
    <>
      <Link to={volverA} className="bc-back">← Volver</Link>
      <div className="bc-page-head mt-3"><h1>Nuevo censo</h1></div>

      <div className="bc-demo-note">
        El conteo se genera con un servicio de IA simulado (modelo en desarrollo): los resultados
        son de demostración.
      </div>

      <form className="bc-card bc-form-narrow" onSubmit={enviar} noValidate>
        {error && <div className="bc-alert-error" role="alert">{error}</div>}

        <div className="bc-field">
          <label htmlFor="finca">Finca</label>
          <select id="finca" className="bc-input" value={idFinca} disabled={ocupado || cargandoFincas}
            onChange={(e) => setIdFinca(e.target.value)}>
            <option value="">{cargandoFincas ? "Cargando..." : "Seleccionar..."}</option>
            {fincas.map((f) => (
              <option key={f.id_finca} value={f.id_finca}>{f.nombre}</option>
            ))}
          </select>
        </div>

        <div className="bc-field">
          <label htmlFor="archivo">Video del dron (máx. {MAX_MB} MB)</label>
          <input id="archivo" ref={inputArchivo} type="file" accept="video/*,image/*"
            className="bc-input" disabled={ocupado} onChange={elegirArchivo} />
          {preview && archivo?.type.startsWith("video/") && (
            <video src={preview} controls muted className="bc-media" />
          )}
          {preview && archivo?.type.startsWith("image/") && (
            <img src={preview} alt="Vista previa" className="bc-media" />
          )}
          {archivo && (
            <p className="bc-progress-label">
              {archivo.name} · {(archivo.size / (1024 * 1024)).toFixed(1)} MB
            </p>
          )}
        </div>

        <div className="bc-field">
          <label htmlFor="nota">Nota (opcional)</label>
          <textarea id="nota" className="bc-input" maxLength={300} disabled={ocupado}
            placeholder="Ej.: potrero norte, vuelo de la mañana"
            value={nota} onChange={(e) => setNota(e.target.value)} />
        </div>

        {ocupado && (
          <div className="mb-3">
            <div className={`bc-progress ${fase === "analizando" ? "indeterminate" : ""}`}>
              <div style={{ width: `${progreso}%` }} />
            </div>
            <p className="bc-progress-label">
              {fase === "subiendo"
                ? `Subiendo archivo... ${progreso}%`
                : "Archivo subido. Analizando con la IA, esto puede tardar unos minutos..."}
            </p>
          </div>
        )}

        <div className="bc-form-actions">
          {!ocupado && (
            <>
              <button type="submit" className="bc-btn bc-btn-primary">Procesar censo</button>
              <Link to={volverA} className="bc-btn bc-btn-outline">Cancelar</Link>
            </>
          )}
          {fase === "subiendo" && (
            <button type="button" className="bc-btn bc-btn-danger" onClick={cancelar}>
              Cancelar subida
            </button>
          )}
        </div>
      </form>
    </>
  );
}