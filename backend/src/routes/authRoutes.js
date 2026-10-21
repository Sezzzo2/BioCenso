const express = require("express");
const router = express.Router();
const validate = require("../middlewares/validate");
const verificarToken = require("../middlewares/verificarToken");
const {
  registrarValidator,
  loginValidator,
  actualizarPerfilValidator,
} = require("../validators/authValidator");
const { registrar, login, perfil, actualizarPerfil } = require("../controllers/authController");

/**
 * @openapi
 * /api/auth/registro:
 *   post:
 *     tags: [Autenticación]
 *     summary: Registrar un nuevo usuario
 *     description: El rol siempre se asigna como "Ganadero" en el servidor, sin importar lo que envíe el cliente (previene escalamiento de privilegios).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegistroInput'
 *     responses:
 *       201:
 *         description: Usuario creado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Usuario'
 *       409:
 *         description: El correo ya está registrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorSimple'
 *       422:
 *         description: Error de validación
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorValidacion'
 */
router.post("/registro", registrarValidator, validate, registrar);

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags: [Autenticación]
 *     summary: Iniciar sesión
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginInput'
 *     responses:
 *       200:
 *         description: Login exitoso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       401:
 *         description: Credenciales inválidas (mensaje genérico, no revela si el correo existe)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorSimple'
 *       422:
 *         description: Error de validación
 */
router.post("/login", loginValidator, validate, login);

/**
 * @openapi
 * /api/auth/perfil:
 *   get:
 *     tags: [Autenticación]
 *     summary: Obtener los datos del usuario autenticado (a partir del token)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Datos actuales del usuario autenticado
 *       401:
 *         description: Token no proporcionado, inválido o expirado
 *       404:
 *         description: Usuario no encontrado
 */
router.get("/perfil", verificarToken, perfil);

/**
 * @openapi
 * /api/auth/perfil:
 *   put:
 *     tags: [Autenticación]
 *     summary: Actualizar los datos del usuario autenticado
 *     description: Solo actualiza nombre, apellido y correo. El rol y los privilegios nunca se modifican desde el perfil.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nombre, apellido, correo]
 *             properties:
 *               nombre: { type: string, maxLength: 100 }
 *               apellido: { type: string, maxLength: 100 }
 *               correo: { type: string, format: email }
 *     responses:
 *       200:
 *         description: Perfil actualizado
 *       401:
 *         description: Token no proporcionado, inválido o expirado
 *       409:
 *         description: El correo ya está registrado
 *       422:
 *         description: Error de validación
 */
router.put("/perfil", verificarToken, actualizarPerfilValidator, validate, actualizarPerfil);

module.exports = router;