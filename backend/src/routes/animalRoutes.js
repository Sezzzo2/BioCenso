const express = require("express");
const router = express.Router();
const uploadAnimalImage = require("../middlewares/uploadAnimalImage");
const validate = require("../middlewares/validate");
const verificarToken = require("../middlewares/verificarToken");
const verificarAccesoFinca = require("../middlewares/verificarAccesoFinca");
const resolverIdFincaDeAnimal = require("../utils/resolverIdFincaDeAnimal");
const {
  crearAnimalValidator,
  actualizarAnimalValidator,
  idAnimalParamValidator,
  idFincaParamValidator,
} = require("../validators/animalValidator");
const {
  crearAnimal,
  listarAnimalesPorFinca,
  obtenerAnimal,
  actualizarAnimal,
  eliminarAnimal,
} = require("../controllers/animalController");

/**
 * @openapi
 * /api/animales:
 *   post:
 *     tags: [Animales]
 *     summary: Registrar un animal en una finca (con imagen opcional vía Cloudinary)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [id_finca, numero_animal, sexo]
 *             properties:
 *               id_finca: { type: integer }
 *               numero_animal: { type: string, example: "A-001" }
 *               sexo: { type: string, enum: [Macho, Hembra] }
 *               fecha_nacimiento: { type: string, format: date }
 *               peso: { type: number }
 *               estado_reproductivo: { type: string }
 *               estado_general: { type: string }
 *               enfermedad: { type: string }
 *               imagen: { type: string, format: binary }
 *     responses:
 *       201:
 *         description: Animal creado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Animal'
 *       404:
 *         description: La finca no existe o no pertenece al usuario
 *       409:
 *         description: Ya existe un animal con ese número en la finca
 *       422:
 *         description: Error de validación
 */
router.post(
  "/",
  verificarToken,
  uploadAnimalImage.single("imagen"),
  crearAnimalValidator,
  validate,
  verificarAccesoFinca((req) => Number(req.body.id_finca)),
  crearAnimal
);

/**
 * @openapi
 * /api/animales/finca/{id_finca}:
 *   get:
 *     tags: [Animales]
 *     summary: Listar los animales de una finca (incluye nombre de la finca)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id_finca
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Lista de animales
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Animal'
 *       404:
 *         description: La finca no existe o no pertenece al usuario
 */
router.get(
  "/finca/:id_finca",
  verificarToken,
  idFincaParamValidator,
  validate,
  verificarAccesoFinca((req) => Number(req.params.id_finca)),
  listarAnimalesPorFinca
);

/**
 * @openapi
 * /api/animales/{id}:
 *   get:
 *     tags: [Animales]
 *     summary: Obtener un animal por id
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Animal encontrado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Animal' }
 *       404:
 *         description: No existe o no pertenece a una finca del usuario
 *   put:
 *     tags: [Animales]
 *     summary: Actualizar un animal
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               numero_animal: { type: string }
 *               sexo: { type: string, enum: [Macho, Hembra] }
 *               fecha_nacimiento: { type: string, format: date }
 *               peso: { type: number }
 *               estado_reproductivo: { type: string }
 *               estado_general: { type: string }
 *               enfermedad: { type: string }
 *               imagen: { type: string, format: binary }
 *     responses:
 *       200:
 *         description: Animal actualizado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Animal' }
 *       404:
 *         description: No existe o no pertenece al usuario
 *       422:
 *         description: Error de validación
 *   delete:
 *     tags: [Animales]
 *     summary: Eliminar un animal
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
router.get("/:id", verificarToken, idAnimalParamValidator, validate, verificarAccesoFinca(resolverIdFincaDeAnimal), obtenerAnimal);
router.put(
  "/:id",
  verificarToken,
  uploadAnimalImage.single("imagen"),
  idAnimalParamValidator,
  actualizarAnimalValidator,
  validate,
  verificarAccesoFinca(resolverIdFincaDeAnimal),
  actualizarAnimal
);
router.delete("/:id", verificarToken, idAnimalParamValidator, validate, verificarAccesoFinca(resolverIdFincaDeAnimal), eliminarAnimal);

module.exports = router;