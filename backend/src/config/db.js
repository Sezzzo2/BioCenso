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

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: databaseName,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

pool.on("error", (err) => {
  console.error("Error inesperado en el pool de PostgreSQL", err);
});

module.exports = pool;