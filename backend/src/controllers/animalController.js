const pool = require("../config/db");

async function crearAnimal(req, res) {
  const {
    id_finca,
    numero_animal,
    fecha_nacimiento,
    peso,
    sexo,
    estado_reproductivo,
    estado_general,
    enfermedad,
  } = req.body;

  const imagen_url = req.file ? req.file.path : null;

  const result = await pool.query(
    "SELECT * FROM fn_crear_animal($1,$2,$3,$4,$5,$6,$7,$8,$9)",
    [
      id_finca,
      numero_animal,
      imagen_url,
      fecha_nacimiento || null,
      peso || null,
      sexo,
      estado_reproductivo || null,
      estado_general || null,
      enfermedad || null,
    ]
  );

  res.status(201).json(result.rows[0]);
}

async function listarAnimalesPorFinca(req, res) {
  const { id_finca } = req.params;

  // Usa la VIEW en vez de una función: es una lectura simple con join,
  // el caso de uso clásico para una vista.
  const result = await pool.query(
    "SELECT * FROM vista_animales_completa WHERE id_finca = $1 ORDER BY creado_en DESC",
    [id_finca]
  );

  res.json(result.rows);
}

async function obtenerAnimal(req, res) {
  const { id } = req.params;

  const result = await pool.query("SELECT * FROM fn_obtener_animal($1)", [id]);

  if (result.rows.length === 0) {
    return res.status(404).json({ error: "Animal no encontrado" });
  }
  res.json(result.rows[0]);
}

async function actualizarAnimal(req, res) {
  const { id } = req.params;
  const {
    numero_animal,
    fecha_nacimiento,
    peso,
    sexo,
    estado_reproductivo,
    estado_general,
    enfermedad,
  } = req.body;

  const imagen_url = req.file ? req.file.path : req.body.imagen_url || null;

  const result = await pool.query(
    "SELECT * FROM fn_actualizar_animal($1,$2,$3,$4,$5,$6,$7,$8,$9)",
    [
      id,
      numero_animal,
      imagen_url,
      fecha_nacimiento || null,
      peso || null,
      sexo,
      estado_reproductivo || null,
      estado_general,
      enfermedad || null,
    ]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: "Animal no encontrado" });
  }
  res.json(result.rows[0]);
}

async function eliminarAnimal(req, res) {
  const { id } = req.params;

  // CALL en vez de SELECT porque es un PROCEDURE, no una FUNCTION.
  // El segundo parámetro (NULL) es el placeholder del OUT parameter p_eliminado.
  const result = await pool.query("CALL sp_eliminar_animal($1, NULL)", [id]);
  const eliminado = result.rows[0]?.p_eliminado;

  if (!eliminado) {
    return res.status(404).json({ error: "Animal no encontrado" });
  }
  res.json({ mensaje: "Animal eliminado correctamente" });
}

module.exports = {
  crearAnimal,
  listarAnimalesPorFinca,
  obtenerAnimal,
  actualizarAnimal,
  eliminarAnimal,
};