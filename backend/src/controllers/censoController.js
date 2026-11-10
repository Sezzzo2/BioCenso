const fs = require("fs");
const axios = require("axios");
const FormData = require("form-data");
const pool = require("../config/db");
const cloudinary = require("../config/cloudinary");

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

// Motivo legible de un fallo del servicio de IA para el usuario: sin proveedor, modelos ni
// códigos internos (esos van al registro con detalleIA)
const MOTIVOS_IA = {
  saturado: "la IA está saturada en este momento; intenta de nuevo en unos minutos",
  tiempo: "la IA tardó demasiado en responder; intenta de nuevo en unos minutos",
  cuota: "se alcanzó el límite de análisis de hoy; intenta de nuevo más tarde",
  rechazo: "la IA no pudo analizar esta imagen",
};
function motivoIA(error) {
  if (error.code === "ECONNABORTED") return MOTIVOS_IA.tiempo;
  if (!error.response) return "no se pudo conectar con el servicio de IA";
  const motivo = error.response.data?.detail?.motivo;
  if (MOTIVOS_IA[motivo]) return MOTIVOS_IA[motivo];
  if (error.response.status === 401) return "el servicio de IA rechazó la conexión del servidor";
  if (error.response.status === 504) return MOTIVOS_IA.tiempo;
  return "la IA no devolvió un resultado válido";
}
const detalleIA = (error) => JSON.stringify(error.response?.data?.detail ?? error.code ?? error.message);
// Incluye despertar el servicio de IA (plan gratis), subir un video grande a Gemini,
// esperar a que lo procese y generar la respuesta
const AI_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS) || 600000;

// Datos que dan escala a la IA para estimar el peso: la altura del vuelo y los pesos reales
// que el ganadero registró en la finca (solo números, sin nombres ni textos libres)
async function calibracionDe(idFinca, alturaVuelo) {
  const calibracion = {};
  const altura = Number(alturaVuelo);
  if (Number.isFinite(altura) && altura > 0) calibracion.altura_m = altura;
  try {
    const pesos = await pool.query("SELECT * FROM fn_pesos_registrados_finca($1)", [idFinca]);
    if (pesos.rows.length) calibracion.finca = pesos.rows;
  } catch (error) {
    // Sin calibración el censo sigue adelante: solo se pierde la referencia
    console.error("No se pudieron leer los pesos registrados de la finca", idFinca, error.message);
  }
  return JSON.stringify(calibracion);
}

async function crearCenso(req, res) {
  const { id_finca, nota, fecha_vuelo, altura_vuelo } = req.body;

  if (!req.file) {
    return res.status(422).json({
      errores: [{ campo: "imagen", mensaje: "Debes adjuntar una imagen o video del censo" }],
    });
  }

  // 1. Crear el censo en estado "Procesando" antes de llamar a la IA
  const censoInicial = await pool.query(
    "SELECT * FROM fn_crear_censo($1, $2, $3, $4, $5, $6)",
    [id_finca, nota || null, "Procesando", fecha_vuelo || null, req.file.originalname.slice(0, 255), altura_vuelo || null]
  );
  const idCenso = censoInicial.rows[0].id_censo;

  try {
    // 2. Reenviar el archivo al servicio de IA leyéndolo del disco por partes
    const formData = new FormData();
    formData.append("calibracion", await calibracionDe(id_finca, altura_vuelo));
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

    const { count, peso_estimado_promedio, processing_time, captura, reses, modelo_gemini } = respuestaIA.data;

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
      // Peso y categoría de cada res contada en el video (no solo las del fotograma)
      reses: Array.isArray(reses) ? reses : [],
    });
    // El modelo de IA usado solo queda en el registro del servidor, no se muestra al usuario
    console.log("Censo", idCenso, "analizado con", modelo_gemini ?? "modelo desconocido");
  } catch (error) {
    // Si la IA falla o no responde, el censo NO debe quedar "Procesando" para siempre
    await pool.query("SELECT * FROM fn_actualizar_estado_censo($1, $2, $3)", [
      idCenso,
      "Error",
      null,
    ]);

    console.error("Censo", idCenso, "falló:", detalleIA(error));
    const err = new Error();
    err.status = 502;
    err.publicMessage = `No se pudo analizar el censo: ${motivoIA(error)}.`;
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

  // La altura del vuelo no está en la vista (la migración 001 la recrea con sus columnas)
  const result = await pool.query(
    `SELECT v.*, c.altura_vuelo_m
     FROM vista_censo_completo v
     JOIN censo c ON c.id_censo = v.id_censo
     WHERE v.id_censo = $1`,
    [id]
  );
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
    const censo = await pool.query("SELECT id_finca, altura_vuelo_m FROM censo WHERE id_censo = $1", [req.params.id]);
    const formData = new FormData();
    formData.append("calibracion", await calibracionDe(censo.rows[0]?.id_finca, censo.rows[0]?.altura_vuelo_m));
    formData.append("fotograma", req.file.buffer, {
      filename: "fotograma.jpg",
      contentType: req.file.mimetype,
    });
    const respuesta = await axios.post(`${AI_SERVICE_URL}/detectar`, formData, {
      headers: { ...formData.getHeaders(), "X-Servicio-Token": process.env.AI_SERVICE_TOKEN || "" },
      timeout: 240000,
    });
    res.json({
      animales: Array.isArray(respuesta.data?.animales) ? respuesta.data.animales : [],
    });
    console.log("Captura del censo", req.params.id, "marcada con", respuesta.data?.modelo_gemini ?? "modelo desconocido");
  } catch (error) {
    const motivo = motivoIA(error);
    console.error("Captura del censo", req.params.id, "falló:", detalleIA(error));
    const err = new Error();
    err.status = 502;
    err.publicMessage = `No se pudieron marcar las reses: ${motivo}.`;
    // Saturación o demora: el navegador vuelve a intentarlo solo
    err.status = error.response?.status === 503 || error.code === "ECONNABORTED" ? 503 : 502;
    throw err;
  }
}

const CATEGORIAS = new Set(["vaca", "toro", "novillo", "novilla", "ternero"]);
// imagen: marcado en la captura · video: contado en otro momento del vuelo · promedio: sin peso propio
const ORIGENES = new Set(["imagen", "video", "promedio"]);

// Lee la tabla de bovinos contados que manda el navegador:
// [{ n, peso_kg, categoria?, origen?, segundo? }] con valores válidos
function leerPesos(texto) {
  let lista;
  try {
    lista = JSON.parse(texto ?? "[]");
  } catch {
    return null;
  }
  if (!Array.isArray(lista) || lista.length > 1000) return null;
  const pesos = [];
  for (const fila of lista) {
    const n = Number(fila?.n);
    const peso = fila?.peso_kg == null ? null : Number(fila.peso_kg);
    const segundo = fila?.segundo == null ? null : Number(fila.segundo);
    if (!Number.isInteger(n) || n < 1) return null;
    if (peso != null && !(Number.isFinite(peso) && peso >= 0 && peso <= 3000)) return null;
    if (segundo != null && !(Number.isFinite(segundo) && segundo >= 0)) return null;
    pesos.push({
      n,
      peso_kg: peso == null ? null : Math.round(peso),
      categoria: CATEGORIAS.has(fila?.categoria) ? fila.categoria : null,
      origen: ORIGENES.has(fila?.origen) ? fila.origen : null,
      segundo: segundo == null ? null : Math.round(segundo * 10) / 10,
    });
  }
  return pesos;
}

// Fuera de producción va a otra carpeta: los ids de una base local repiten los de producción
// y con overwrite reemplazarían sus capturas
const CARPETA_CAPTURAS = process.env.NODE_ENV === "production" ? "biocenso/censos" : "biocenso/censos-dev";

const subirACloudinary = (buffer, idCenso) =>
  new Promise((resolver, rechazar) => {
    cloudinary.uploader
      .upload_stream(
        // Un archivo por censo: al reintentar la captura se reemplaza la anterior
        { folder: CARPETA_CAPTURAS, public_id: `censo-${idCenso}`, overwrite: true, invalidate: true, resource_type: "image" },
        (error, resultado) => (error ? rechazar(error) : resolver(resultado))
      )
      .end(buffer);
  });

// Guarda en la ficha del censo la tabla de bovinos contados y, si llegó, la imagen con los
// recuadros. Sin imagen (la IA no pudo marcar el fotograma) se conserva la que hubiera.
async function guardarCaptura(req, res) {
  const { id } = req.params;
  const pesos = leerPesos(req.body.pesos);
  if (!pesos) {
    return res.status(422).json({ errores: [{ campo: "pesos", mensaje: "La tabla de pesos no es válida" }] });
  }
  const segundo = req.body.segundo == null || req.body.segundo === "" ? NaN : Number(req.body.segundo);

  let subida = null;
  try {
    if (req.file) subida = await subirACloudinary(req.file.buffer, id);
  } catch (error) {
    console.error("No se pudo subir la captura del censo", id, error.message);
    const err = new Error();
    err.status = 502;
    err.publicMessage = "No se pudo guardar la imagen de la captura. Intenta de nuevo.";
    throw err;
  }

  const result = await pool.query("SELECT * FROM fn_guardar_captura_censo($1, $2, $3, $4, $5)", [
    id,
    subida?.secure_url ?? null,
    Number.isFinite(segundo) ? segundo : null,
    null,
    JSON.stringify(pesos),
  ]);

  // El peso promedio del censo pasa a ser el de esta tabla, para que la ficha, el panel
  // y el historial muestren las mismas cifras
  const conPeso = pesos.filter((p) => p.peso_kg != null);
  if (conPeso.length) {
    const promedio = conPeso.reduce((s, p) => s + p.peso_kg, 0) / conPeso.length;
    await pool.query("SELECT fn_actualizar_peso_deteccion($1, $2)", [id, Math.round(promedio * 100) / 100]);
  }
  res.status(201).json(sinModelo(result.rows[0]));
}

// Las capturas antiguas guardaron el modelo de IA; no se envía al navegador
const sinModelo = ({ modelo, ...captura }) => captura; // eslint-disable-line no-unused-vars

async function obtenerCaptura(req, res) {
  const result = await pool.query("SELECT * FROM fn_obtener_captura_censo($1)", [req.params.id]);
  if (result.rows.length === 0) {
    return res.status(404).json({ error: "Este censo no tiene captura guardada" });
  }
  res.json(sinModelo(result.rows[0]));
}

module.exports = {
  crearCenso,
  listarCensosPorFinca,
  obtenerCenso,
  actualizarConteoManual,
  detectarCaptura,
  guardarCaptura,
  obtenerCaptura,
};