import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function RutaProtegida() {
  const { autenticado, cargando, sinConexion, reintentarSesion, cerrarSesion } = useAuth();
  const location = useLocation();

  if (cargando) {
    return <div className="cargando" role="status"><i aria-hidden="true" />Cargando...</div>;
  }
  // Hay sesión guardada pero el servidor no respondió: no se cierra la sesión por eso
  if (!autenticado && sinConexion) {
    return (
      <div className="panel panel-solido vacio-bloque" role="alert" style={{ margin: "60px auto", maxWidth: 520 }}>
        <h3>No pudimos conectar con el servidor</h3>
        <p>Puede estar despertando o tu conexión falló. Tu sesión sigue guardada.</p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginTop: 14 }}>
          <button type="button" className="btn btn-brote" onClick={reintentarSesion}>Reintentar</button>
          <button type="button" className="btn btn-oscuro" onClick={cerrarSesion}>Cerrar sesión</button>
        </div>
      </div>
    );
  }
  if (!autenticado) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <Outlet />;
}
