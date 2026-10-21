const pool = require("../config/db");

function verificarAccesoFinca(obtenerIdFinca) {
  return async function (req, res, next) {
    try {
      const idFinca = await obtenerIdFinca(req);

      if (!idFinca) {
        return res.status(404).json({ error: "Recurso no encontrado" });
      }

      if (req.usuario.rol === "Administrador") {
        return next();
      }

      const result = await pool.query(
        "SELECT fn_usuario_tiene_acceso_finca($1, $2) AS tiene_acceso",
        [req.usuario.id_usuario, idFinca]
      );

      // 404 en ambos casos (no existe / no es tuya) a propósito:
      // no revelar a un usuario no autorizado si el recurso existe.
      if (!result.rows[0].tiene_acceso) {
        return res.status(404).json({ error: "Recurso no encontrado" });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

module.exports = verificarAccesoFinca;