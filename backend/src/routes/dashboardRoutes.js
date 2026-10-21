const express = require("express");
const router = express.Router();
const validate = require("../middlewares/validate");
const verificarToken = require("../middlewares/verificarToken");
const verificarAccesoFinca = require("../middlewares/verificarAccesoFinca");
const { idFincaParamValidator } = require("../validators/dashboardValidator");
const {
  obtenerDashboard,
  obtenerEvolucion,
  obtenerResumenVacunacion,
} = require("../controllers/dashboardController");

/**
 * @openapi
 * /api/dashboard/vacunacion:
 *   get:
 *     tags: [Dashboard]
 *     summary: Obtener el resumen de vacunación de las fincas accesibles
 *     description: Los conteos y la última aplicación usan los registros existentes. Las próximas dosis y las vencidas se devuelven como null mientras no existan fechas programadas o intervalos de refuerzo.
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Resumen real de aplicaciones y disponibilidad del cálculo de vencimientos
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/DashboardVacunacion' }
 *       401:
 *         description: Token no proporcionado, inválido o expirado
 */
router.get("/vacunacion", verificarToken, obtenerResumenVacunacion);

/**
 * @openapi
 * /api/dashboard/finca/{id_finca}:
 *   get:
 *     tags: [Dashboard]
 *     summary: Resumen agregado de una finca (totales, último censo, precisión)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id_finca
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Resumen del dashboard
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/DashboardResumen' }
 *       404:
 *         description: La finca no existe o no pertenece al usuario
 */
router.get(
  "/finca/:id_finca",
  verificarToken,
  idFincaParamValidator,
  validate,
  verificarAccesoFinca((req) => Number(req.params.id_finca)),
  obtenerDashboard
);

/**
 * @openapi
 * /api/dashboard/finca/{id_finca}/evolucion:
 *   get:
 *     tags: [Dashboard]
 *     summary: Serie de tiempo de los censos completados (para gráficas del frontend)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id_finca
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Lista de puntos (fecha, cantidad detectada, conteo manual)
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/EvolucionPunto' }
 *       404:
 *         description: La finca no existe o no pertenece al usuario
 */
router.get(
  "/finca/:id_finca/evolucion",
  verificarToken,
  idFincaParamValidator,
  validate,
  verificarAccesoFinca((req) => Number(req.params.id_finca)),
  obtenerEvolucion
);

module.exports = router;