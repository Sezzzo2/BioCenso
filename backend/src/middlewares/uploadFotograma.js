const multer = require("multer");

const TIPOS_PERMITIDOS = ["image/jpeg", "image/png", "image/webp"];

// El fotograma lo genera el navegador (JPG de unos cientos de KB): basta con memoria
const uploadFotograma = multer({
  storage: multer.memoryStorage(),
  // fieldSize: la tabla de bovinos viaja como texto con una miniatura por res (hasta ~1000 reses)
  limits: { fileSize: 10 * 1024 * 1024, fieldSize: 40 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    if (!TIPOS_PERMITIDOS.includes(file.mimetype)) {
      const error = new Error("El fotograma debe ser una imagen JPG, PNG o WEBP");
      error.status = 422;
      error.publicMessage = error.message;
      return cb(error);
    }
    cb(null, true);
  },
});

module.exports = uploadFotograma;
