const fs = require("fs");
const axios = require("axios");
const FormData = require("form-data");
const pool = require("../config/db");

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

// Motivo legible de un fallo del servicio de IA (sin datos internos ni claves)
function motivoIA(error) {
  if (error.code === "ECONNABORTED") return "la IA tardó demasiado en responder";
  const detalle = error.response?.data?.detail;
  if (typeof detalle === "string" && detalle.length < 200) return detalle;
  if (error.response?.status === 401) return "el servicio de IA rechazó el token del backend";
  if (!error.response) return "no se pudo conectar con el servicio de IA";
  return `el servicio de IA respondió ${error.response.status}`;
}
// Incluye despertar el servicio de IA (plan gratis), subir un video grande a Gemini,
// esperar a que lo procese y generar la respuesta
const AI_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS) || 600000;

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
    // 2. Reenviar el archivo al servicio de IA leyéndolo del disco por partes
    const formData = new FormData();
    formData.append("imagen", fs.createReadStream(req.file.path), {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
      knownLength: req.file.size,
    });

    const respuestaIA = await axios.post(`${AI_SERVICE_URL}/predict`, formData, {
      headers: { ...formData.getHeaders(), "X-Servicio-Token": process.env.AI_SERVICE_TOKEN || "" },
      timeout: AI_TIMEOUT_MS,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });

    const { count, peso_estimado_promedio, processing_time, captura, modelo_gemini } = respuestaIA.data;

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

    // La captura (fotograma con recuadros y pesos) no se guarda: se muestra al terminar el censo
    res.status(201).json({
      censo: censoFinal.rows[0],
      deteccion: deteccion.rows[0],
      captura: captura ?? null,
      modelo_gemini: modelo_gemini ?? null,
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

// Marca las reses sobre el fotograma que el navegador extrajo del video del censo.
// No se guarda nada: el recuadro solo se muestra en el resultado.
async function detectarCaptura(req, res) {
  if (!req.file) {
    return res.status(422).json({
      errores: [{ campo: "fotograma", mensaje: "Debes adjuntar la imagen del fotograma" }],
    });
  }
  try {
    const formData = new FormData();
    formData.append("fotograma", req.file.buffer, {
      filename: "fotograma.jpg",
      contentType: req.file.mimetype,
    });
    const respuesta = await axios.post(`${AI_SERVICE_URL}/detectar`, formData, {
      headers: { ...formData.getHeaders(), "X-Servicio-Token": process.env.AI_SERVICE_TOKEN || "" },
      timeout: 180000,
    });
    res.json({
      animales: Array.isArray(respuesta.data?.animales) ? respuesta.data.animales : [],
      modelo_gemini: respuesta.data?.modelo_gemini ?? null,
    });
  } catch (error) {
    const motivo = motivoIA(error);
    console.error("Captura del censo", req.params.id, "falló:", motivo);
    const err = new Error();
    err.status = 502;
    err.publicMessage = `No se pudieron marcar las reses: ${motivo}.`;
    throw err;
  }
}

module.exports = { crearCenso, listarCensosPorFinca, obtenerCenso, actualizarConteoManual, detectarCaptura };