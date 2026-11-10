const { body, param } = require("express-validator");

const crearCensoValidator = [
  body("id_finca")
    .notEmpty().withMessage("Elige una finca")
    .isInt({ min: 1 }).withMessage("La finca elegida no es válida"),
  body("nota")
    .optional({ values: "falsy" })
    .trim()
    .isLength({ max: 500 }),
  body("fecha_vuelo")
    .optional({ values: "falsy" })
    .isISO8601({ strict: true }).withMessage("La fecha del vuelo no es válida")
    .custom((valor) => new Date(valor) <= new Date()).withMessage("La fecha del vuelo no puede ser futura"),
  // Altura del dron sobre el terreno: da la escala para estimar el tamaño de cada animal
  body("altura_vuelo")
    .optional({ values: "falsy" })
    .isFloat({ min: 5, max: 500 }).withMessage("La altura de vuelo debe estar entre 5 y 500 metros"),
];

const idFincaParamValidator = [
  param("id_finca").isInt({ min: 1 }).withMessage("El id de la finca debe ser un entero positivo"),
];

const idCensoParamValidator = [
  param("id").isInt({ min: 1 }).withMessage("El id del censo debe ser un entero positivo"),
];

const actualizarConteoManualValidator = [
  body("conteo_manual")
    .notEmpty().withMessage("Ingresa el número de animales contados")
    .isInt({ min: 0 }).withMessage("El conteo manual debe ser un número entero, 0 o mayor"),
];

module.exports = { crearCensoValidator, idFincaParamValidator, idCensoParamValidator, actualizarConteoManualValidator };