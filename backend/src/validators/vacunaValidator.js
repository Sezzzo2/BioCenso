const { body, param } = require("express-validator");

const crearVacunaValidator = [
  body("nombre")
    .trim()
    .notEmpty().withMessage("El nombre de la vacuna es obligatorio")
    .isLength({ min: 2, max: 80 }).withMessage("El nombre debe tener entre 2 y 80 caracteres")
    .escape(),
];

const aplicarVacunaValidator = [
  body("id_animal")
    .notEmpty().withMessage("id_animal es obligatorio")
    .isInt({ min: 1 }).withMessage("id_animal debe ser un entero positivo"),
  body("id_vacunas")
    .notEmpty().withMessage("id_vacunas es obligatorio")
    .isInt({ min: 1 }).withMessage("id_vacunas debe ser un entero positivo"),
  body("fecha_vacunacion")
    .optional({ values: "falsy" })
    .isISO8601().withMessage("fecha_vacunacion debe tener formato YYYY-MM-DD"),
];

const idAnimalParamValidator = [
  param("id_animal").isInt({ min: 1 }).withMessage("El id del animal debe ser un entero positivo"),
];

const idAplicacionParamValidator = [
  param("id").isInt({ min: 1 }).withMessage("El id de la aplicación debe ser un entero positivo"),
];

module.exports = {
  crearVacunaValidator,
  aplicarVacunaValidator,
  idAnimalParamValidator,
  idAplicacionParamValidator,
};