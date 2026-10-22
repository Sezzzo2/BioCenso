require("dotenv").config();

// En producción no se arranca sin las variables mínimas: un JWT_SECRET vacío
// permitiría firmar tokens con una clave conocida.
if (process.env.NODE_ENV === "production") {
  const faltantes = ["JWT_SECRET", "FRONTEND_ORIGIN", "AI_SERVICE_URL"].filter((v) => !process.env[v]);
  if (!process.env.DATABASE_URL && !process.env.DB_HOST) faltantes.push("DATABASE_URL");
  if (faltantes.length) {
    console.error(`Faltan variables de entorno: ${faltantes.join(", ")}`);
    process.exit(1);
  }
  if (process.env.JWT_SECRET.length < 32) {
    console.error("JWT_SECRET debe tener al menos 32 caracteres en producción");
    process.exit(1);
  }
}

const app = require("./app");

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
