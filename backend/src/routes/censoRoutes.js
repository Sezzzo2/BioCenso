const fs = require("fs");
const express = require("express");
const router = express.Router();
const validate = require("../middlewares/validate");
const verificarToken = require("../middlewares/verificarToken");
const verificarAccesoFinca = require("../middlewares/verificarAccesoFinca");
const uploadCensoArchivo = require("../middlewares/uploadCensoArchivo");
const { porCensoEnParam } = require("../utils/resolverIdFinca");
const {
  crearCensoValidator,
  idFincaParamValidator,
  idCensoParamValidator,
  actualizarConteoManualValidator,
} = require("../validators/censoValidator");
const {
  crearCenso,
  listarCensosPorFinca,
  obtenerCenso,
  actualizarConteoManual,
} = require("../controllers/censoController");

/**
 * @openapi
 * /api/censos:
 *   post:
 *     tags: [Censos]
 *     summary: Crear un censo (envía el archivo al servicio de IA y guarda el resultado)
 *     description: >
 *       El análisis lo realiza actualmente un microservicio Python mock (ver /ai-service)
 *       que simula la respuesta de YOLOv26s, ya que el modelo real aún no está entrenado.
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [id_finca, imagen]
 *             properties:
 *               id_finca: { type: integer }
 *               nota: { type: string }
 *               imagen: { type: string, format: binary }
 *     responses:
 *       201:
 *         description: Censo procesado y guardado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/CensoCreado' }
 *       404:
 *         description: La finca no existe o no pertenece al usuario
 *       422:
 *         description: Error de validación (falta el archivo, formato no permitido, etc.)
 *       502:
 *         description: El servicio de inteligencia artificial no respondió correctamente
 */
router.post(
  "/",
  verificarToken,
  uploadCensoArchivo.single("imagen"),
  // El video queda en un temporal del disco: se borra al responder, haya éxito o error
  (req, res, next) => {
    res.on("close", () => {
      if (req.file?.path) fs.promises.unlink(req.file.path).catch(() => {});
    });
    next();
  },
  crearCensoValidator,
  validate,
  verificarAccesoFinca((req) => Number(req.body.id_finca)),
  crearCenso
);

/**
 * @openapi
 * /api/censos/finca/{id_finca}:
 *   get:
 *     tags: [Censos]
 *     summary: Listar los censos de una finca
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id_finca
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Lista de censos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Censo' }
 *       404:
 *         description: La finca no existe o no pertenece al usuario
 */
router.get(
  "/finca/:id_finca",
  verificarToken,
  idFincaParamValidator,
  validate,
  verificarAccesoFinca((req) => Number(req.params.id_finca)),
  listarCensosPorFinca
);

/**
 * @openapi
 * /api/censos/{id}:
 *   get:
 *     tags: [Censos]
 *     summary: Obtener el detalle de un censo (censo + detección + finca)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Detalle del censo
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/CensoCompleto' }
 *       404:
 *         description: No existe o no pertenece al usuario
 */
router.get("/:id", verificarToken, idCensoParamValidator, validate, verificarAccesoFinca(porCensoEnParam), obtenerCenso);

/**
 * @openapi
 * /api/censos/{id}/conteo-manual:
 *   patch:
 *     tags: [Censos]
 *     summary: Registrar o actualizar el conteo manual de un censo
 *     description: Necesario para que el dashboard calcule la diferencia y el % de precisión frente al conteo automático.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [conteo_manual]
 *             properties:
 *               conteo_manual: { type: integer, minimum: 0 }
 *     responses:
 *       200:
 *         description: Censo actualizado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Censo' }
 *       404:
 *         description: No existe o no pertenece al usuario
 *       422:
 *         description: Error de validación
 */
router.patch(
  "/:id/conteo-manual",
  verificarToken,
  idCensoParamValidator,
  actualizarConteoManualValidator,
  validate,
  verificarAccesoFinca(porCensoEnParam),
  actualizarConteoManual
);

module.exports = router;