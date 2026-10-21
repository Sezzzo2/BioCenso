const { param } = require("express-validator");

const idFincaParamValidator = [
  param("id_finca").isInt({ min: 1 }).withMessage("El id de la finca debe ser un entero positivo"),
];

module.exports = { idFincaParamValidator };