require("dotenv").config();
const { v2: cloudinary } = require("cloudinary");

// 1) Qué variables ve realmente el proceso (sin mostrar los valores)
for (const k of ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET", "CLOUDINARY_URL"]) {
  const v = process.env[k];
  console.log(k, v ? `definida (${v.length} caracteres)` : "NO DEFINIDA");
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

(async () => {
  try {
    // 2) Valida las credenciales
    console.log("PING:", await cloudinary.api.ping());

    // 3) Sube una imagen mínima de prueba
    const png =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
    const r = await cloudinary.uploader.upload(png, { folder: "biocenso-prueba" });
    console.log("SUBIDA OK:", r.secure_url);
  } catch (e) {
    console.error("FALLÓ:", e?.message || e, "| http_code:", e?.http_code);
  }
})();