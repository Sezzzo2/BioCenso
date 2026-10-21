import { createContext, useContext, useEffect, useState } from "react";
import * as authService from "../services/authService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);

  // Al abrir la app, si hay token guardado, recupera el perfil
  useEffect(() => {
    const token = localStorage.getItem("bc_token");
    if (!token) {
      setCargando(false);
      return;
    }
    authService
      .obtenerPerfil()
      .then((data) => setUsuario(data.usuario ?? data))
      .catch(() => localStorage.removeItem("bc_token"))
      .finally(() => setCargando(false));
  }, []);

  const iniciarSesion = async (correo, contrasena) => {
    const data = await authService.login(correo, contrasena);
    localStorage.setItem("bc_token", data.token);
    setUsuario(data.usuario);
  };

  const registrarse = async (datos) => {
    await authService.registro(datos);
    await iniciarSesion(datos.correo, datos.contrasena);
  };

  const actualizarPerfil = async (datos) => {
    const resultado = await authService.actualizarPerfil(datos);
    const perfilActualizado = resultado.usuario ?? resultado;
    setUsuario(perfilActualizado);
    return perfilActualizado;
  };

  const cerrarSesion = () => {
    localStorage.removeItem("bc_token");
    setUsuario(null);
  };

  return (
    <AuthContext.Provider
      value={{
        usuario,
        cargando,
        autenticado: !!usuario,
        iniciarSesion,
        registrarse,
        actualizarPerfil,
        cerrarSesion,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
};