// Crea las tablas, vistas y funciones de BioCenso en una base vacía (por ejemplo, Neon).
// Uso (PowerShell, desde la carpeta backend):
//   $env:DATABASE_URL="postgresql://..."; node scripts/crearEsquema.js
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("Define DATABASE_URL con la cadena de conexión de la base (Neon → Connect).");
    process.exit(1);
  }

  const esquema = fs.readFileSync(path.join(__dirname, "..", "database", "schema.sql"), "utf8");
  const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
  const cliente = new Client({ connectionString: url, ssl: local ? false : { rejectUnauthorized: false } });
  await cliente.connect();

  const { rows } = await cliente.query(
    "SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'usuario'"
  );
  if (rows[0].n > 0) {
    console.log("La base ya tiene el esquema de BioCenso; no se cambió nada.");
    await cliente.end();
    return;
  }

  await cliente.query("BEGIN");
  try {
    await cliente.query(esquema);
    await cliente.query("COMMIT");
  } catch (error) {
    await cliente.query("ROLLBACK");
    throw error;
  }

  const funciones = await cliente.query(
    "SELECT count(*)::int AS n FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public'"
  );
  console.log(`Esquema creado: ${funciones.rows[0].n} funciones y procedimientos.`);
  await cliente.end();
}

main().catch((error) => {
  console.error("No se pudo crear el esquema:", error.message);
  process.exit(1);
});
