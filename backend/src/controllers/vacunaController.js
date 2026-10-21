const pool = require("../config/db");

async function crearVacuna(req, res) {
  const { nombre } = req.body;

  const result = await pool.query("SELECT * FROM fn_crear_vacuna($1)", [nombre]);
  res.status(201).json(result.rows[0]);
}

async function listarVacunas(req, res) {
  const result = await pool.query("SELECT * FROM fn_listar_vacunas()");
  res.json(result.rows);
}

async function aplicarVacuna(req, res) {
  const { id_animal, id_vacunas, fecha_vacunacion } = req.body;

  const result = await pool.query(
    "SELECT * FROM fn_aplicar_vacuna($1, $2, $3)",
    [id_animal, id_vacunas, fecha_vacunacion || new Date()]
  );

  res.status(201).json(result.rows[0]);
}

async function listarVacunasDeAnimal(req, res) {
  const { id_animal } = req.params;

  const result = await pool.query(
    "SELECT * FROM vista_vacunas_animal WHERE id_animal = $1 ORDER BY fecha_vacunacion DESC",
    [id_animal]
  );

  res.json(result.rows);
}

async function eliminarAplicacionVacuna(req, res) {
  const { id } = req.params;

  const result = await pool.query("CALL sp_eliminar_aplicacion_vacuna($1, NULL)", [id]);
  const eliminado = result.rows[0]?.p_eliminado;

  if (!eliminado) {
    return res.status(404).json({ error: "Aplicación de vacuna no encontrada" });
  }
  res.json({ mensaje: "Aplicación de vacuna eliminada correctamente" });
}

module.exports = {
  crearVacuna,
  listarVacunas,
  aplicarVacuna,
  listarVacunasDeAnimal,
  eliminarAplicacionVacuna,
};