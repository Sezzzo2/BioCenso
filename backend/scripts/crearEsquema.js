// Crea las tablas, vistas y funciones de BioCenso en una base vacía (por ejemplo, Neon)
// y aplica las migraciones de database/migraciones. Se puede ejecutar varias veces:
// el esquema base solo se crea si falta y las migraciones no fallan si ya se aplicaron.
// Uso (PowerShell, desde la carpeta backend):
//   $env:DATABASE_URL="postgresql://..."; node scripts/crearEsquema.js
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const carpetaBase = path.join(__dirname, "..", "database");

async function enTransaccion(cliente, sql) {
  await cliente.query("BEGIN");
  try {
    await cliente.query(sql);
    await cliente.query("COMMIT");
  } catch (error) {
    await cliente.query("ROLLBACK");
    throw error;
  }
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("Define DATABASE_URL con la cadena de conexión de la base (Neon → Connect).");
    process.exit(1);
  }

  const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
  const cliente = new Client({ connectionString: url, ssl: local ? false : { rejectUnauthorized: false } });
  await cliente.connect();

  const { rows } = await cliente.query(
    "SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'usuario'"
  );
  if (rows[0].n > 0) {
    console.log("La base ya tiene el esquema base de BioCenso.");
  } else {
    await enTransaccion(cliente, fs.readFileSync(path.join(carpetaBase, "schema.sql"), "utf8"));
    console.log("Esquema base creado.");
  }

  const carpetaMigraciones = path.join(carpetaBase, "migraciones");
  const migraciones = fs.existsSync(carpetaMigraciones)
    ? fs.readdirSync(carpetaMigraciones).filter((f) => f.endsWith(".sql")).sort()
    : [];
  for (const archivo of migraciones) {
    await enTransaccion(cliente, fs.readFileSync(path.join(carpetaMigraciones, archivo), "utf8"));
    console.log(`Migración aplicada: ${archivo}`);
  }

  const funciones = await cliente.query(
    "SELECT count(*)::int AS n FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public'"
  );
  console.log(`Listo: ${funciones.rows[0].n} funciones y procedimientos.`);
  await cliente.end();
}

main().catch((error) => {
  console.error("No se pudo preparar la base:", error.message);
  process.exit(1);
});
