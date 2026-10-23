import { Navigate, Route, Routes } from "react-router-dom";
import Landing from "./pages/Landing/Landing.jsx";
import Inicio from "./pages/Inicio/Inicio.jsx";
import Login from "./pages/Login/Login.jsx";
import Registro from "./pages/Login/Registro.jsx";
import Fincas from "./pages/Fincas/Fincas.jsx";
import FincaNueva from "./pages/Fincas/FincaNueva.jsx";
import FincaDetalle from "./pages/Fincas/FincaDetalle.jsx";
import AnimalNuevo from "./pages/AnimalNuevo/AnimalNuevo.jsx";
import AnimalDetalle from "./pages/AnimalDetalle/AnimalDetalle.jsx";
import AnimalEditar from "./pages/AnimalEditar/AnimalEditar.jsx";
import RutaProtegida from "./routes/RutaProtegida.jsx";
import MainLayout from "./layouts/MainLayout.jsx";
import PublicLayout from "./layouts/PublicLayout.jsx";
import Censo from "./pages/CensoNuevo/CensoNuevo.jsx";
import CensoDetalle from "./pages/CensoDetalle/CensoDetalle.jsx";
import Dashboard from "./pages/Dashboard/Dashboard.jsx";
import Usuario from "./pages/Usuario/Usuario.jsx";

export default function App() {
  return (
    <Routes>
      {/* Portada pública, separada de la app */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Registro />} />
      </Route>

      {/* App: solo con sesión */}
      <Route element={<RutaProtegida />}>
        <Route element={<MainLayout />}>
          <Route path="/inicio" element={<Inicio />} />
          <Route path="/censos" element={<Censo />} />
          <Route path="/censos/nuevo" element={<Censo />} />
          <Route path="/fincas" element={<Fincas />} />
          <Route path="/fincas/nueva" element={<FincaNueva />} />
          <Route path="/fincas/:id" element={<FincaDetalle />} />
          <Route path="/fincas/:id/dashboard" element={<Dashboard />} />
          <Route path="/fincas/:id/animales/nuevo" element={<AnimalNuevo />} />
          <Route path="/fincas/:id/animales/:idAnimal" element={<AnimalDetalle />} />
          <Route path="/fincas/:id/animales/:idAnimal/editar" element={<AnimalEditar />} />
          <Route path="/fincas/:id/censos/:idCenso" element={<CensoDetalle />} />
          <Route path="/usuario" element={<Usuario />} />
        </Route>
      </Route>

      {/* El panel general ahora vive en Inicio */}
      <Route path="/dashboard" element={<Navigate to="/inicio" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
