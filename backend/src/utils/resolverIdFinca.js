const pool = require("../config/db");

// Resuelve el id_finca a partir del id de un animal que viene en req.params[nombreParam]
function porAnimalEnParam(nombreParam) {
  return async function (req) {
    const idAnimal = req.params[nombreParam];
    const result = await pool.query("SELECT * FROM fn_obtener_animal($1)", [idAnimal]);
    return result.rows[0]?.id_finca || null;
  };
}

// Resuelve el id_finca a partir de id_animal que viene en el body (ej. al aplicar una vacuna)
async function porAnimalEnBody(req) {
  const result = await pool.query("SELECT * FROM fn_obtener_animal($1)", [req.body.id_animal]);
  return result.rows[0]?.id_finca || null;
}

// Resuelve el id_finca a partir del id de una aplicación de vacuna (para poder eliminarla)
async function porAplicacionVacunaEnParam(req) {
  const result = await pool.query(
    "SELECT id_finca FROM vista_vacunas_animal WHERE id_animal_vacunas = $1",
    [req.params.id]
  );
  return result.rows[0]?.id_finca || null;
}

async function porCensoEnParam(req) {
  const result = await pool.query("SELECT id_finca FROM censo WHERE id_censo = $1", [req.params.id]);
  return result.rows[0]?.id_finca || null;
}

module.exports = { porAnimalEnParam, porAnimalEnBody, porAplicacionVacunaEnParam, porCensoEnParam };