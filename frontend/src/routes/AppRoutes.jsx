import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import Inicio from "../pages/Inicio/Inicio";
import Censo from "../pages/Censo/Censo";
import ResultadoCenso from "../pages/Censo/ResultadoCenso";
import Fincas from "../pages/Fincas/Fincas";
import FincaDetalle from "../pages/Fincas/FincaDetalle";
import Usuario from "../pages/Usuario/Usuario";
import Login from "../pages/Login/Login";
import Registro from "../pages/Login/Registro";

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Registro />} />
          <Route path="/" element={<Inicio />} />
          <Route path="/censo" element={<Censo />} />
          <Route path="/censo/:id" element={<ResultadoCenso />} />
          <Route path="/fincas" element={<Fincas />} />
          <Route path="/fincas/:id" element={<FincaDetalle />} />
          <Route path="/usuario" element={<Usuario />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;
