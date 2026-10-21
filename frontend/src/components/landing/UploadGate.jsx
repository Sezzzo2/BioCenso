import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { analizarArchivoConGemini } from "../../services/geminiService.js";

export default function UploadGate() {
  const [archivo, setArchivo] = useState(null);
  const [preview, setPreview] = useState(null);
  const [analizando, setAnalizando] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [error, setError] = useState("");
  const [resultado, setResultado] = useState(null);
  const inputRef = useRef(null);

  const seleccionar = (e) => {
    const f = e.target.files?.[0];
    setError("");
    setResultado(null);
    if (!f) {
      setArchivo(null);
      setPreview(null);
      return;
    }
    if (!f.type.startsWith("video/") && !f.type.startsWith("image/")) {
      e.target.value = "";
      setError("Selecciona un archivo de video o imagen.");
      return;
    }
    setArchivo(f);
    setPreview(URL.createObjectURL(f));
  };

  const analizar = async () => {
    if (!archivo) return setError("Selecciona primero un video o imagen.");
    setError("");
    setAnalizando(true);
    setProgreso(0);
    try {
      const res = await analizarArchivoConGemini(archivo, {
        onProgress: (p) => setProgreso(p),
      });
      setResultado(res);
    } catch (err) {
      setError(err?.message || "No se pudo analizar el archivo en este momento.");
    } finally {
      setAnalizando(false);
    }
  };

  return (
    <section className="bc-section">
      <div className="bc-container">
        <div className="bc-gate" style={{ maxWidth: 720, margin: "0 auto" }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
               strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="4" y="11" width="16" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
          <h2 className="bc-title" style={{ fontSize: "1.8rem" }}>
            Sube tu video de dron
          </h2>
          <p>
            Analiza un video o imagen aérea para detectar cuántas reses hay y estimar su peso total,
            o inicia sesión para registrar y conservar los censos de tu finca.
          </p>

          <div style={{ width: "100%", maxWidth: 480, margin: "1rem auto", textAlign: "left" }}>
            <input
              ref={inputRef}
              type="file"
              accept="video/*,image/*"
              className="bc-input"
              disabled={analizando}
              onChange={seleccionar}
            />
            {preview && archivo?.type.startsWith("video/") && (
              <video src={preview} controls muted className="bc-media mt-2" style={{ width: "100%", borderRadius: 12 }} />
            )}
            {preview && archivo?.type.startsWith("image/") && (
              <img src={preview} alt="Vista previa" className="bc-media mt-2" style={{ width: "100%", borderRadius: 12 }} />
            )}
            {error && <div className="bc-alert-error mt-2">{error}</div>}

            {archivo && (
              <div className="mt-3" style={{ textAlign: "center" }}>
                <button
                  type="button"
                  className="bc-btn bc-btn-primary"
                  disabled={analizando}
                  onClick={analizar}
                >
                  {analizando
                    ? `Analizando video... ${progreso}%`
                    : "Procesar censo"}
                </button>
              </div>
            )}

            {resultado && (
              <div className="bc-card mt-3" style={{ textAlign: "left" }}>
                <span className="bc-module-eyebrow">Resultado del censo</span>
                <div className="row g-2 mt-1">
                  <div className="col-4">
                    <div className="bc-stat">
                      <div className="bc-stat-label">Reses</div>
                      <div className="bc-stat-value bc-stat-green">{resultado.count}</div>
                    </div>
                  </div>
                  <div className="col-4">
                    <div className="bc-stat">
                      <div className="bc-stat-label">Peso prom.</div>
                      <div className="bc-stat-value">{resultado.peso_estimado_promedio} <small>kg</small></div>
                    </div>
                  </div>
                  <div className="col-4">
                    <div className="bc-stat">
                      <div className="bc-stat-label">Peso total</div>
                      <div className="bc-stat-value bc-stat-green">
                        {resultado.peso_total_estimado?.toLocaleString("es-CO")} <small>kg</small>
                      </div>
                    </div>
                  </div>
                </div>
                {resultado.observaciones && (
                  <p className="mt-2 mb-0" style={{ fontSize: ".9rem" }}>{resultado.observaciones}</p>
                )}
              </div>
            )}
          </div>

          <div className="bc-gate-actions mt-3">
            <Link to="/login" className="bc-btn bc-btn-primary">Iniciar sesión</Link>
            <Link to="/registro" className="bc-btn bc-btn-outline">Crear cuenta</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
