import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function RutaProtegida() {
  const { autenticado, cargando } = useAuth();
  const location = useLocation();

  if (cargando) {
    return <div className="bc-container py-5 text-center">Cargando...</div>;
  }
  if (!autenticado) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <Outlet />;
}