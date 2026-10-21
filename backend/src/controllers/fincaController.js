const pool = require("../config/db");

async function crearFinca(req, res) {
  const { nombre, municipio, departamento, direccion } = req.body;
  const id_usuario = req.usuario.id_usuario; // viene del JWT, nunca del body

  const result = await pool.query(
    "SELECT * FROM fn_crear_finca($1, $2, $3, $4, $5)",
    [id_usuario, nombre, municipio, departamento, direccion || null]
  );

  res.status(201).json(result.rows[0]);
}

async function listarFincas(req, res) {
  const { id_usuario, rol } = req.usuario;

  const result =
    rol === "Administrador"
      ? await pool.query("SELECT * FROM fn_listar_fincas(NULL)")
      : await pool.query("SELECT * FROM fn_listar_fincas_usuario($1)", [id_usuario]);

  res.json(result.rows);
}

async function obtenerFinca(req, res) {
  const { id } = req.params;

  const result = await pool.query("SELECT * FROM fn_obtener_finca($1)", [id]);
  if (result.rows.length === 0) {
    return res.status(404).json({ error: "Finca no encontrada" });
  }
  res.json(result.rows[0]);
}

module.exports = { crearFinca, listarFincas, obtenerFinca };