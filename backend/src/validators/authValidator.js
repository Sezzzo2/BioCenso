const { body } = require("express-validator");

const registrarValidator = [
  body("nombre")
    .trim()
    .notEmpty().withMessage("El nombre es obligatorio")
    .isLength({ max: 100 })
    .escape(),
  body("apellido")
    .trim()
    .notEmpty().withMessage("El apellido es obligatorio")
    .isLength({ max: 100 })
    .escape(),
  body("correo")
    .trim()
    .notEmpty().withMessage("El correo es obligatorio")
    .isEmail().withMessage("El correo no tiene un formato válido")
    .normalizeEmail(),
  body("contrasena")
    .notEmpty().withMessage("La contraseña es obligatoria")
    .isStrongPassword({
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 0,
    })
    .withMessage(
      "La contraseña debe tener mínimo 8 caracteres, con al menos una mayúscula, una minúscula y un número"
    ),
];

const loginValidator = [
  body("correo")
    .trim()
    .notEmpty().withMessage("El correo es obligatorio")
    .isEmail().withMessage("El correo no tiene un formato válido")
    .normalizeEmail(),
  body("contrasena").notEmpty().withMessage("La contraseña es obligatoria"),
];

const actualizarPerfilValidator = [
  body("nombre")
    .trim()
    .notEmpty().withMessage("El nombre es obligatorio")
    .isLength({ max: 100 }).withMessage("El nombre no puede superar 100 caracteres")
    .escape(),
  body("apellido")
    .trim()
    .notEmpty().withMessage("El apellido es obligatorio")
    .isLength({ max: 100 }).withMessage("El apellido no puede superar 100 caracteres")
    .escape(),
  body("correo")
    .trim()
    .notEmpty().withMessage("El correo es obligatorio")
    .isEmail().withMessage("El correo no tiene un formato válido")
    .normalizeEmail(),
];

module.exports = { registrarValidator, loginValidator, actualizarPerfilValidator };