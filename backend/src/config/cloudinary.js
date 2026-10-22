const cloudinary = require("cloudinary").v2;
require("dotenv").config();

// Al pegar las credenciales en un panel (Render, Railway) es fácil arrastrar espacios,
// saltos de línea o comillas; cualquiera de ellos hace que Cloudinary rechace la firma.
const limpiar = (valor) => String(valor ?? "").trim().replace(/^["']|["']$/g, "").trim();

const credenciales = {
  cloud_name: limpiar(process.env.CLOUDINARY_CLOUD_NAME),
  api_key: limpiar(process.env.CLOUDINARY_API_KEY),
  api_secret: limpiar(process.env.CLOUDINARY_API_SECRET),
};

cloudinary.config(credenciales);

// Estado de la configuración sin revelar valores (para /health/cloudinary)
cloudinary.diagnostico = () => ({
  cloud_name: credenciales.cloud_name ? "definida" : "falta",
  api_key: !credenciales.api_key ? "falta" : /^\d+$/.test(credenciales.api_key) ? "definida" : "formato inválido (debe ser solo números)",
  api_secret: credenciales.api_secret ? "definida" : "falta",
});

module.exports = cloudinary;
