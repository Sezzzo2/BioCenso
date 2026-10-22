const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const errorHandler = require("./src/middlewares/errorHandler");
const pool = require("./src/config/db");
const cloudinary = require("./src/config/cloudinary");
const fincaRoutes = require("./src/routes/fincaRoutes");
const animalRoutes = require("./src/routes/animalRoutes");
const authRoutes = require("./src/routes/authRoutes");
const vacunaRoutes = require("./src/routes/vacunaRoutes");
const axios = require("axios");
const censoRoutes = require("./src/routes/censoRoutes");
const dashboardRoutes = require("./src/routes/dashboardRoutes");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./src/config/swagger");
const app = express();

if (process.env.TRUST_PROXY === "true") {
  app.set("trust proxy", 1);
}

app.use(helmet());

// CORS: acepta una lista de orígenes separados por comas en FRONTEND_ORIGIN
const allowedOrigins = (process.env.FRONTEND_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((origen) => origen.trim());

app.use(
  cors({
    origin: function (origin, callback) {
      // Sin "origin" = peticiones sin navegador (Postman, curl, apps móviles) — se permiten.
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error("Origen no permitido por CORS"));
    },
    credentials: true,
  })
);

if (process.env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

// 100kb es más que suficiente: ningún endpoint de este sistema recibe JSON grande
// (las imágenes van por multipart/form-data, no por este parser).
app.use(express.json({ limit: "100kb" }));

// Rate limiting global (protección general contra abuso/DoS básico)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiadas solicitudes, intenta de nuevo más tarde" },
  skip: (req) =>
    req.method === "POST" &&
    (req.path === "/api/auth/login" || req.path === "/api/auth/registro"),
});
app.use(limiter);

// En planes gratuitos los servicios se duermen sin uso. La página llama a /health al
// abrirse; aquí se despierta también el servicio de IA (como mucho una vez cada 5 min)
// para que el primer censo no espere dos arranques en frío seguidos.
let ultimoDespertarIA = 0;
app.get("/health", (req, res) => {
  if (process.env.NODE_ENV === "production" && Date.now() - ultimoDespertarIA > 5 * 60 * 1000) {
    ultimoDespertarIA = Date.now();
    axios
      .get(`${process.env.AI_SERVICE_URL || "http://localhost:8000"}/health`, { timeout: 90000 })
      .catch(() => {});
  }
  res.json({ estado: "ok", mensaje: "API BioCenso funcionando" });
});

app.get("/health/db", async (req, res, next) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({ estado: "ok", hora_servidor: result.rows[0].now });
  } catch (error) {
    next(error);
  }
});

app.get("/health/cloudinary", async (req, res) => {
  const configuracion = cloudinary.diagnostico();
  try {
    await cloudinary.api.ping();
    res.json({ estado: "ok", configuracion });
  } catch (error) {
    // El mensaje de Cloudinary ("Invalid api_key", "Unknown cloud_name"...) no contiene las claves
    res.status(502).json({
      estado: "error",
      configuracion,
      motivo: error?.error?.message || error?.message || "Cloudinary no respondió",
    });
  }
});

app.get("/health/ai-service", async (req, res, next) => {
  try {
    const respuesta = await axios.get(
      `${process.env.AI_SERVICE_URL || "http://localhost:8000"}/health`,
      { timeout: 5000 }
    );
    res.json({ estado: "ok", ai_service: respuesta.data });
  } catch (error) {
    next(error);
  }
});

app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    swaggerOptions: { persistAuthorization: true },
  })
);

app.get("/api-docs.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerSpec);
});

app.use("/api/auth", authRoutes);
app.use("/api/fincas", fincaRoutes);
app.use("/api/animales", animalRoutes);
app.use("/api/vacunas", vacunaRoutes);
app.use("/api/censos", censoRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use(errorHandler);

module.exports = app;