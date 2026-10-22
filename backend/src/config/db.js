const { Pool, types } = require("pg");
require("dotenv").config();

types.setTypeParser(1700, (value) => (value === null ? null : parseFloat(value)));
types.setTypeParser(20, (value) => (value === null ? null : parseInt(value, 10)));

const esEntornoDePrueba = process.env.NODE_ENV === "test";
const databaseName = esEntornoDePrueba
  ? process.env.DB_NAME_TEST
  : process.env.DB_NAME;

if (esEntornoDePrueba && (!databaseName || databaseName === process.env.DB_NAME)) {
  throw new Error(
    "NODE_ENV=test pero DB_NAME_TEST no está configurado o es igual a DB_NAME. " +
    "Configura DB_NAME_TEST en el .env para evitar correr pruebas contra la base de datos real."
  );
}

// En la nube (Railway, Render...) la base llega como una sola URL en DATABASE_URL.
// En local se siguen usando DB_HOST, DB_PORT, etc. Las pruebas nunca usan DATABASE_URL.
const usarUrl = !esEntornoDePrueba && Boolean(process.env.DATABASE_URL);

// DB_SSL=true cuando la base exige conexión cifrada (por ejemplo, la URL pública de Railway).
const ssl = process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined;

const pool = new Pool(
  usarUrl
    ? { connectionString: process.env.DATABASE_URL, ssl }
    : {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: databaseName,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        ssl,
      }
);

pool.on("error", (err) => {
  console.error("Error inesperado en el pool de PostgreSQL", err);
});

module.exports = pool;
