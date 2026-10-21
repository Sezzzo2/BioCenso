const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");

const SALT_ROUNDS = 10;
// Hash "señuelo" para comparar tiempos cuando el correo no existe,
// y así no revelar por el tiempo de respuesta si el correo está registrado o no.
const HASH_SENUELO = "$2a$10$C6UzMDM.H6dfI/f/IKcEeO/9SLnAI6q4a8vqzKZ8cIH0oM3MOEIYm";

function omitirContrasena(usuario) {
    const { contrasena, ...resto } = usuario;
    return resto;
}

async function registrar(req, res) {
    const { nombre, apellido, correo, contrasena } = req.body;

    const hash = await bcrypt.hash(contrasena, SALT_ROUNDS);

    // El rol SIEMPRE se fija en el servidor como "Ganadero".
    // Nunca se lee req.body.rol — si el cliente lo manda, se ignora.
    // Esto evita que alguien se autoasigne "Administrador" al registrarse.
    const result = await pool.query(
        "SELECT * FROM fn_crear_usuario($1, $2, $3, $4, $5)",
        [nombre, apellido, correo, hash, "Ganadero"]
    );

    res.status(201).json(omitirContrasena(result.rows[0]));
}

async function login(req, res) {
    const { correo, contrasena } = req.body;

    const result = await pool.query(
        "SELECT * FROM fn_obtener_usuario_por_correo($1)",
        [correo]
    );

    if (result.rows.length === 0) {
        // Comparación señuelo: mantiene un tiempo de respuesta similar
        // al caso de contraseña incorrecta, para no filtrar por timing
        // si el correo existe o no.
        await bcrypt.compare(contrasena, HASH_SENUELO);
        return res.status(401).json({ error: "Credenciales inválidas" });
    }

    const usuario = result.rows[0];

    if (!usuario.estado) {
        return res.status(401).json({ error: "Credenciales inválidas" });
    }

    const coincide = await bcrypt.compare(contrasena, usuario.contrasena);
    if (!coincide) {
        return res.status(401).json({ error: "Credenciales inválidas" });
    }

    const token = jwt.sign(
        { id_usuario: usuario.id_usuario, correo: usuario.correo, rol: usuario.rol },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || "2h" }
    );

    res.json({ token, usuario: omitirContrasena(usuario) });
}

async function perfil(req, res) {
    const result = await pool.query(
        `SELECT id_usuario, nombre, apellido, correo, rol, fecha_registro, estado
         FROM usuario
         WHERE id_usuario = $1`,
        [req.usuario.id_usuario]
    );

    if (result.rows.length === 0) {
        return res.status(404).json({ error: "Usuario no encontrado" });
    }

    res.json({ usuario: result.rows[0] });
}

async function actualizarPerfil(req, res) {
    const { nombre, apellido, correo } = req.body;
    const result = await pool.query(
        `UPDATE usuario
         SET nombre = $1, apellido = $2, correo = $3
         WHERE id_usuario = $4
         RETURNING id_usuario, nombre, apellido, correo, rol, fecha_registro, estado`,
        [nombre, apellido, correo, req.usuario.id_usuario]
    );

    if (result.rows.length === 0) {
        return res.status(404).json({ error: "Usuario no encontrado" });
    }

    res.json({ usuario: result.rows[0] });
}

module.exports = { registrar, login, perfil, actualizarPerfil };