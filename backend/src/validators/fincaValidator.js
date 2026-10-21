const { body, param } = require("express-validator");

const crearFincaValidator = [
  body("nombre")
    .trim()
    .notEmpty().withMessage("El nombre de la finca es obligatorio")
    .isLength({ min: 2, max: 150 }).withMessage("El nombre debe tener entre 2 y 150 caracteres")
    .escape(),
  body("municipio")
    .trim()
    .notEmpty().withMessage("El municipio es obligatorio")
    .isLength({ max: 100 })
    .escape(),
  body("departamento")
    .trim()
    .notEmpty().withMessage("El departamento es obligatorio")
    .isLength({ max: 100 })
    .escape(),
  body("direccion")
    .optional({ values: "falsy" })
    .trim()
    .isLength({ max: 200 })
    .escape(),
];

const idFincaParamValidator = [
  param("id").isInt({ min: 1 }).withMessage("El id de la finca debe ser un entero positivo"),
];

module.exports = { crearFincaValidator, idFincaParamValidator };