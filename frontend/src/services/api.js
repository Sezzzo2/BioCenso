import axios from "axios";

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


api.interceptors.response.use(
  (res) => res,
  (error) => {
    const url = error.config?.url || "";
    const esAuth = url.includes("/auth/login") || url.includes("/auth/registro");
    if (error.response?.status === 401 && !esAuth) {
      localStorage.removeItem("bc_token");
      sessionStorage.setItem("bc_aviso", "Tu sesión expiró. Inicia sesión de nuevo.");
      if (window.location.pathname !== "/login") window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);


export default api;