const express = require("express");
const router = express.Router();
const validate = require("../middlewares/validate");
const verificarToken = require("../middlewares/verificarToken");
const verificarAccesoFinca = require("../middlewares/verificarAccesoFinca");
const { crearFincaValidator, idFincaParamValidator } = require("../validators/fincaValidator");
const { crearFinca, listarFincas, obtenerFinca } = require("../controllers/fincaController");

/**
 * @openapi
 * /api/fincas:
 *   post:
 *     tags: [Fincas]
 *     summary: Crear una finca (el dueño es el usuario autenticado)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FincaInput'
 *     responses:
 *       201:
 *         description: Finca creada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Finca'
 *       401:
 *         description: No autenticado
 *       422:
 *         description: Error de validación
 *   get:
 *     tags: [Fincas]
 *     summary: Listar las fincas del usuario autenticado
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de fincas
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Finca'
 */
router.post("/", verificarToken, crearFincaValidator, validate, crearFinca);
router.get("/", verificarToken, listarFincas);

/**
 * @openapi
 * /api/fincas/{id}:
 *   get:
 *     tags: [Fincas]
 *     summary: Obtener una finca por id
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Finca encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Finca'
 *       404:
 *         description: No existe o no pertenece al usuario autenticado (mismo código en ambos casos, por seguridad)
 */
router.get(
  "/:id",
  verificarToken,
  idFincaParamValidator,
  validate,
  verificarAccesoFinca((req) => Number(req.params.id)),
  obtenerFinca
);

module.exports = router;