const { validationResult } = require("express-validator");

function validate(req, res, next) {
  const errores = validationResult(req);

  if (!errores.isEmpty()) {
    return res.status(422).json({
      errores: errores.array().map((e) => ({ campo: e.path, mensaje: e.msg })),
    });
  }

  next();
}

module.exports = validate;