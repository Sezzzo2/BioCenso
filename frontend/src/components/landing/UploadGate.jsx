import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

// El análisis de videos requiere sesión: el archivo se envía al backend,
// que valida la finca del usuario antes de llamar al servicio de IA.
export default function UploadGate() {
  const { autenticado } = useAuth();

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
            Inicia sesión para analizar el video de tu finca: BioCenso contará las reses,
            estimará su peso y guardará el censo en tu historial.
          </p>

          <div className="bc-gate-actions mt-3">
            {autenticado ? (
              <Link to="/censos/nuevo" className="bc-btn bc-btn-primary">Registrar censo</Link>
            ) : (
              <>
                <Link to="/login" className="bc-btn bc-btn-primary">Iniciar sesión</Link>
                <Link to="/registro" className="bc-btn bc-btn-outline">Crear cuenta</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
