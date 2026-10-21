const pool = require("../config/db");

// Dado el id de un animal (en la URL), resuelve a qué finca pertenece.
// Se usa en las rutas de animal que solo reciben el id del animal
// (obtener, actualizar, eliminar), para poder verificar acceso por finca.
async function resolverIdFincaDeAnimal(req) {
  const result = await pool.query("SELECT * FROM fn_obtener_animal($1)", [req.params.id]);
  return result.rows[0]?.id_finca || null;
}

module.exports = resolverIdFincaDeAnimal;