const multer = require("multer");

const TIPOS_PERMITIDOS = ["image/jpeg", "image/png", "image/webp", "video/mp4"];
const TAMANO_MAXIMO = 20 * 1024 * 1024; // 20 MB (puede ser un video corto)

function fileFilter(req, file, cb) {
  if (!TIPOS_PERMITIDOS.includes(file.mimetype)) {
    const error = new Error("Formato no permitido (solo JPG, PNG, WEBP o MP4)");
    error.status = 422;
    return cb(error);
  }
  cb(null, true);
}

// memoryStorage: el archivo se mantiene en RAM solo para reenviarlo al
// servicio de IA, no se persiste en Cloudinary en esta fase.
const uploadCensoArchivo = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: TAMANO_MAXIMO },
});

module.exports = uploadCensoArchivo;