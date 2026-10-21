const express = require("express");
const router = express.Router();
const validate = require("../middlewares/validate");
const verificarToken = require("../middlewares/verificarToken");
const verificarAccesoFinca = require("../middlewares/verificarAccesoFinca");
const {
  porAnimalEnParam,
  porAnimalEnBody,
  porAplicacionVacunaEnParam,
} = require("../utils/resolverIdFinca");
const {
  crearVacunaValidator,
  aplicarVacunaValidator,
  idAnimalParamValidator,
  idAplicacionParamValidator,
} = require("../validators/vacunaValidator");
const {
  crearVacuna,
  listarVacunas,
  aplicarVacuna,
  listarVacunasDeAnimal,
  eliminarAplicacionVacuna,
} = require("../controllers/vacunaController");

/**
 * @openapi
 * /api/vacunas:
 *   post:
 *     tags: [Vacunas]
 *     summary: Agregar un tipo de vacuna al catálogo compartido
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nombre]
 *             properties:
 *               nombre: { type: string, example: "Fiebre Aftosa" }
 *     responses:
 *       201:
 *         description: Vacuna creada
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Vacuna' }
 *       409:
 *         description: Ya existe una vacuna con ese nombre
 *       422:
 *         description: Error de validación
 *   get:
 *     tags: [Vacunas]
 *     summary: Listar el catálogo de vacunas
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Lista de vacunas
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Vacuna' }
 */
router.post("/", verificarToken, crearVacunaValidator, validate, crearVacuna);
router.get("/", verificarToken, listarVacunas);

/**
 * @openapi
 * /api/vacunas/aplicar:
 *   post:
 *     tags: [Vacunas]
 *     summary: Aplicar una vacuna a un animal
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [id_animal, id_vacunas]
 *             properties:
 *               id_animal: { type: integer }
 *               id_vacunas: { type: integer }
 *               fecha_vacunacion: { type: string, format: date }
 *     responses:
 *       201:
 *         description: Aplicación registrada
 *       404:
 *         description: El animal no existe o no pertenece al usuario
 *       422:
 *         description: Error de validación
 */
router.post(
  "/aplicar",
  verificarToken,
  aplicarVacunaValidator,
  validate,
  verificarAccesoFinca(porAnimalEnBody),
  aplicarVacuna
);

/**
 * @openapi
 * /api/vacunas/animal/{id_animal}:
 *   get:
 *     tags: [Vacunas]
 *     summary: Listar las vacunas aplicadas a un animal
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id_animal
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Historial de vacunación
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/AplicacionVacuna' }
 *       404:
 *         description: El animal no existe o no pertenece al usuario
 */
router.get(
  "/animal/:id_animal",
  verificarToken,
  idAnimalParamValidator,
  validate,
  verificarAccesoFinca(porAnimalEnParam("id_animal")),
  listarVacunasDeAnimal
);

/**
 * @openapi
 * /api/vacunas/aplicacion/{id}:
 *   delete:
 *     tags: [Vacunas]
 *     summary: Eliminar un registro de aplicación de vacuna
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Eliminado correctamente
 *       404:
 *         description: No existe o no pertenece al usuario
 */
router.delete(
  "/aplicacion/:id",
  verificarToken,
  idAplicacionParamValidator,
  validate,
  verificarAccesoFinca(porAplicacionVacunaEnParam),
  eliminarAplicacionVacuna
);

module.exports = router;