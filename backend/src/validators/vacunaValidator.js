const { body, param } = require("express-validator");

const crearVacunaValidator = [
  body("nombre")
    .trim()
    .notEmpty().withMessage("El nombre de la vacuna es obligatorio")
    .isLength({ min: 2, max: 80 }).withMessage("El nombre debe tener entre 2 y 80 caracteres"),
];

const aplicarVacunaValidator = [
  body("id_animal")
    .notEmpty().withMessage("Falta el bovino")
    .isInt({ min: 1 }).withMessage("El bovino no es válido"),
  body("id_vacunas")
    .notEmpty().withMessage("Selecciona una vacuna")
    .isInt({ min: 1 }).withMessage("La vacuna elegida no es válida"),
  body("fecha_vacunacion")
    .optional({ values: "falsy" })
    .isISO8601().withMessage("La fecha de vacunación no es válida")
    .custom((valor) => new Date(valor) <= new Date()).withMessage("La fecha de vacunación no puede ser futura"),
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