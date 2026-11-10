import { Toaster } from "react-hot-toast";

// Contenedor de los avisos emergentes (toasts). Los errores de la API los lanza api.js;
// el estilo sale de biocenso.css (.toast-bc) para seguir los colores de la app.
export default function Avisos() {
  return (
    <Toaster
      position="top-center"
      gutter={10}
      containerStyle={{ top: 16 }}
      toastOptions={{
        className: "toast-bc",
        duration: 5000,
        error: {
          duration: 7000,
          className: "toast-bc toast-bc-error",
          iconTheme: { primary: "#ff8c80", secondary: "#1a2b22" },
        },
        success: {
          className: "toast-bc toast-bc-ok",
          iconTheme: { primary: "#86e05b", secondary: "#10230c" },
        },
      }}
    />
  );
}
