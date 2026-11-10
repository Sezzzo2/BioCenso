import { createContext, useContext, useEffect, useState } from "react";
import * as authService from "../services/authService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(() => Boolean(localStorage.getItem("bc_token")));
  // true cuando hay sesión guardada pero el servidor no respondió (dormido, sin red, saturado)
  const [sinConexion, setSinConexion] = useState(false);
  const [intento, setIntento] = useState(0);

  // Al abrir la app, si hay token guardado, recupera el perfil
  useEffect(() => {
    if (!localStorage.getItem("bc_token")) return;
    authService
      .obtenerPerfil()
      .then((data) => {
        setUsuario(data.usuario ?? data);
        setSinConexion(false);
      })
      .catch((err) => {
        // Solo un 401 significa que la sesión ya no sirve (api.js borra el token). Un fallo
        // de red o del servidor no debe cerrar la sesión: se ofrece reintentar.
        if (err?.response?.status !== 401) setSinConexion(true);
      })
      .finally(() => setCargando(false));
  }, [intento]);

  const reintentarSesion = () => {
    setCargando(true);
    setIntento((n) => n + 1);
  };

  const iniciarSesion = async (correo, contrasena) => {
    const data = await authService.login(correo, contrasena);
    localStorage.setItem("bc_token", data.token);
    setUsuario(data.usuario);
    setSinConexion(false);
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
    setSinConexion(false);
  };

  return (
    <AuthContext.Provider
      value={{
        usuario,
        cargando,
        sinConexion,
        reintentarSesion,
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