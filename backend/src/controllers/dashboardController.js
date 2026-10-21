const pool = require("../config/db");

async function obtenerDashboard(req, res) {
  const { id_finca } = req.params;

  const result = await pool.query("SELECT * FROM fn_dashboard_finca($1)", [id_finca]);
  res.json(result.rows[0]);
}

async function obtenerEvolucion(req, res) {
  const { id_finca } = req.params;

  const result = await pool.query("SELECT * FROM fn_evolucion_censos_finca($1)", [id_finca]);
  res.json(result.rows);
}

async function obtenerResumenVacunacion(req, res) {
  const parametros = [];
  let filtroAcceso = "";

  if (req.usuario.rol !== "Administrador") {
    parametros.push(req.usuario.id_usuario);
    filtroAcceso = `
      WHERE EXISTS (
        SELECT 1
        FROM finca f
        WHERE f.id_finca = v.id_finca
          AND f.id_usuario = $1
      )`;
  }

  const result = await pool.query(
    `SELECT
       COUNT(*)::integer AS total_aplicaciones,
       COUNT(DISTINCT v.id_animal)::integer AS animales_vacunados,
       MAX(v.fecha_vacunacion) AS ultima_vacunacion
     FROM vista_vacunas_animal v
     ${filtroAcceso}`,
    parametros
  );

  res.json({
    ...result.rows[0],
    proximas_dosis: null,
    vacunaciones_vencidas: null,
    calculo_programacion_disponible: false,
    mensaje_programacion:
      "No es posible calcular próximas dosis ni vencimientos: el registro actual no contiene " +
      "fechas programadas ni intervalos de refuerzo por vacuna.",
  });
}

module.exports = { obtenerDashboard, obtenerEvolucion, obtenerResumenVacunacion };