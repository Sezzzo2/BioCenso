import axios from "axios";
import toast from "react-hot-toast";
import { extraerError } from "../utils/errores.js";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  // Un backend gratuito dormido tarda ~50 s en despertar
  timeout: 70000,
});

// Adjunta el token a cada petición
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("bc_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ¿Debe avisarse este error con un toast? No para cancelaciones, ni para las peticiones
// marcadas con `silencioso` (las que se reintentan solas o manejan el error a su manera).
function debeAvisar(error) {
  if (axios.isCancel(error) || error?.code === "ERR_CANCELED") return false;
  const silencioso = error.config?.silencioso;
  if (silencioso === true) return false;
  if (Array.isArray(silencioso) && silencioso.includes(error.response?.status)) return false;
  return true;
}

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const url = error.config?.url || "";
    const esAuth = url.includes("/auth/login") || url.includes("/auth/registro");
    if (error.response?.status === 401 && !esAuth) {
      // La sesión venció: login muestra su propio aviso, sin toast
      localStorage.removeItem("bc_token");
      sessionStorage.setItem("bc_aviso", "Tu sesión expiró. Inicia sesión de nuevo.");
      if (window.location.pathname !== "/login") window.location.href = "/login";
    } else if (debeAvisar(error)) {
      const mensaje = extraerError(error);
      // El mismo mensaje no se apila: se reemplaza el toast que ya está a la vista
      toast.error(mensaje, { id: mensaje });
    }
    return Promise.reject(error);
  }
);


export default api;
