const axios = require("axios");
const FormData = require("form-data");
const pool = require("../config/db");

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";
// Analizar un video con Gemini puede tardar más de un minuto
// Incluye el tiempo de despertar el servicio de IA si estaba dormido (plan gratis)
const AI_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS) || 240000;

async function crearCenso(req, res) {
  const { id_finca, nota, fecha_vuelo } = req.body;

  if (!req.file) {
    return res.status(422).json({
      errores: [{ campo: "imagen", mensaje: "Debes adjuntar una imagen o video del censo" }],
    });
  }

  // 1. Crear el censo en estado "Procesando" antes de llamar a la IA
  const censoInicial = await pool.query(
    "SELECT * FROM fn_crear_censo($1, $2, $3, $4, $5)",
    [id_finca, nota || null, "Procesando", fecha_vuelo || null, req.file.originalname.slice(0, 255)]
  );
  const idCenso = censoInicial.rows[0].id_censo;

  try {
    // 2. Reenviar el archivo al microservicio de IA (mock por ahora)
    const formData = new FormData();
    formData.append("imagen", req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });

    const respuestaIA = await axios.post(`${AI_SERVICE_URL}/predict`, formData, {
      headers: { ...formData.getHeaders(), "X-Servicio-Token": process.env.AI_SERVICE_TOKEN || "" },
      timeout: AI_TIMEOUT_MS,
    });

    const { count, peso_estimado_promedio, processing_time } = respuestaIA.data;

    // 3. Guardar el resultado de la detección
    const deteccion = await pool.query(
      "SELECT * FROM fn_crear_deteccion($1, $2, $3)",
      [idCenso, count, peso_estimado_promedio]
    );

    // 4. Marcar el censo como completado
    const censoFinal = await pool.query(
      "SELECT * FROM fn_actualizar_estado_censo($1, $2, $3)",
      [idCenso, "Completado", processing_time]
    );

    res.status(201).json({
      censo: censoFinal.rows[0],
      deteccion: deteccion.rows[0],
    });
  } catch (error) {
    // Si la IA falla o no responde, el censo NO debe quedar "Procesando" para siempre
    await pool.query("SELECT * FROM fn_actualizar_estado_censo($1, $2, $3)", [
      idCenso,
      "Error",
      null,
    ]);

    const err = new Error();
    err.status = 502;
    err.publicMessage = "El servicio de inteligencia artificial no respondió correctamente";
    throw err;
  }
}

async function listarCensosPorFinca(req, res) {
  const { id_finca } = req.params;

  const result = await pool.query("SELECT * FROM fn_listar_censos_finca_completo($1)", [id_finca]);
  res.json(result.rows);
}

async function obtenerCenso(req, res) {
  const { id } = req.params;

  const result = await pool.query("SELECT * FROM vista_censo_completo WHERE id_censo = $1", [id]);
  if (result.rows.length === 0) {
    return res.status(404).json({ error: "Censo no encontrado" });
  }
  res.json(result.rows[0]);
}

async function actualizarConteoManual(req, res) {
  const { id } = req.params;
  const { conteo_manual } = req.body;

  const result = await pool.query("SELECT * FROM fn_actualizar_conteo_manual($1, $2)", [
    id,
    conteo_manual,
  ]);

  if (result.rows.length === 0) {
    return res.status(404).json({ error: "Censo no encontrado" });
  }
  res.json(result.rows[0]);
}

module.exports = { crearCenso, listarCensosPorFinca, obtenerCenso, actualizarConteoManual };