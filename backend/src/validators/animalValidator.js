const { body, param } = require("express-validator");

const SEXOS_VALIDOS = ["Macho", "Hembra"];
const ESTADOS_GENERALES_VALIDOS = ["Sano", "Enfermo", "En observación", "Muerto"];

// Campos que aplican tanto a crear como a actualizar (todo excepto id_finca,
// que solo se define al crear y nunca cambia después).
const camposComunesAnimal = [
  body("numero_animal")
    .trim()
    .notEmpty().withMessage("numero_animal es obligatorio")
    .isLength({ max: 30 }).withMessage("numero_animal no puede superar 30 caracteres")
    .matches(/^[A-Za-z0-9\-]+$/).withMessage("numero_animal solo admite letras, números y guiones"),
  body("sexo")
    .notEmpty().withMessage("El sexo es obligatorio")
    .isIn(SEXOS_VALIDOS).withMessage(`El sexo debe ser uno de: ${SEXOS_VALIDOS.join(", ")}`),
  body("fecha_nacimiento")
    .optional({ values: "falsy" })
    .isISO8601().withMessage("fecha_nacimiento debe tener formato YYYY-MM-DD")
    .custom((value) => new Date(value) <= new Date())
    .withMessage("fecha_nacimiento no puede ser una fecha futura"),
  body("peso")
    .optional({ values: "falsy" })
    .isFloat({ min: 0.1, max: 2000 }).withMessage("peso debe estar entre 0.1 y 2000 kg"),
  body("estado_reproductivo")
    .optional({ values: "falsy" })
    .trim()
    .isLength({ max: 50 })
    .escape(),
  body("estado_general")
    .optional({ values: "falsy" })
    .isIn(ESTADOS_GENERALES_VALIDOS)
    .withMessage(`estado_general debe ser uno de: ${ESTADOS_GENERALES_VALIDOS.join(", ")}`),
  body("enfermedad")
    .optional({ values: "falsy" })
    .trim()
    .isLength({ max: 255 })
    .escape(),
];

const crearAnimalValidator = [
  body("id_finca")
    .notEmpty().withMessage("id_finca es obligatorio")
    .isInt({ min: 1 }).withMessage("id_finca debe ser un entero positivo"),
  ...camposComunesAnimal,
];

// Al actualizar NO se exige id_finca: un animal no cambia de finca vía este endpoint.
const actualizarAnimalValidator = [...camposComunesAnimal];

const idAnimalParamValidator = [
  param("id").isInt({ min: 1 }).withMessage("El id del animal debe ser un entero positivo"),
];

const idFincaParamValidator = [
  param("id_finca").isInt({ min: 1 }).withMessage("El id de la finca debe ser un entero positivo"),
];

module.exports = {
  crearAnimalValidator,
  actualizarAnimalValidator,
  idAnimalParamValidator,
  idFincaParamValidator,
};