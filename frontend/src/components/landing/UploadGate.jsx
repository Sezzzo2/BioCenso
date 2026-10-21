import { Link } from "react-router-dom";

export default function UploadGate() {
  return (
    <section className="bc-section">
      <div className="bc-container">
        <div className="bc-gate">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
               strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="4" y="11" width="16" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
          <h2 className="bc-title" style={{ fontSize: "1.8rem" }}>Sube tu video de dron</h2>
          <p>Para cargar videos y generar censos necesitas iniciar sesión. Así mantenemos los datos de tu finca privados.</p>
          <div className="bc-gate-actions">
            <Link to="/login" className="bc-btn bc-btn-primary">Iniciar sesión</Link>
            <Link to="/registro" className="bc-btn bc-btn-outline">Crear cuenta</Link>
          </div>
        </div>
      </div>
    </section>
  );
}