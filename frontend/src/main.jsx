import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./styles/biocenso.css";
import { AuthProvider } from "./context/AuthContext.jsx";
import App from "./App.jsx";

// El backend gratuito se duerme sin uso: se despierta en cuanto se abre la página,
// mientras la persona lee o inicia sesión.
if (import.meta.env.VITE_USE_BACKEND === "true" && import.meta.env.VITE_API_URL) {
  fetch(import.meta.env.VITE_API_URL.replace(/\/api\/?$/, "") + "/health").catch(() => {});
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);