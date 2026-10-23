const multer = require("multer");

const TIPOS_PERMITIDOS = ["image/jpeg", "image/png", "image/webp"];

// El fotograma lo genera el navegador (JPG de unos cientos de KB): basta con memoria
const uploadFotograma = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
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
