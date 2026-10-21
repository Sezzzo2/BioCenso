const { body, param } = require("express-validator");

const crearCensoValidator = [
  body("id_finca")
    .notEmpty().withMessage("id_finca es obligatorio")
    .isInt({ min: 1 }).withMessage("id_finca debe ser un entero positivo"),
  body("nota")
    .optional({ values: "falsy" })
    .trim()
    .isLength({ max: 500 })
    .escape(),
];

const idFincaParamValidator = [
  param("id_finca").isInt({ min: 1 }).withMessage("El id de la finca debe ser un entero positivo"),
];

const idCensoParamValidator = [
  param("id").isInt({ min: 1 }).withMessage("El id del censo debe ser un entero positivo"),
];

const actualizarConteoManualValidator = [
  body("conteo_manual")
    .notEmpty().withMessage("conteo_manual es obligatorio")
    .isInt({ min: 0 }).withMessage("conteo_manual debe ser un entero mayor o igual a 0"),
];

module.exports = { crearCensoValidator, idFincaParamValidator, idCensoParamValidator, actualizarConteoManualValidator };