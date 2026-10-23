const os = require("os");
const multer = require("multer");

const TIPOS_PERMITIDOS = ["image/jpeg", "image/png", "image/webp", "video/mp4", "video/quicktime"];
// Un vuelo de dron pesa fácilmente más de 100 MB; CENSO_MAX_MB permite ajustarlo
const TAMANO_MAXIMO = (Number(process.env.CENSO_MAX_MB) || 200) * 1024 * 1024;

function fileFilter(req, file, cb) {
  if (!TIPOS_PERMITIDOS.includes(file.mimetype)) {
    const error = new Error("Formato no permitido (solo JPG, PNG, WEBP, MP4 o MOV)");
    error.status = 422;
    error.publicMessage = error.message;
    return cb(error);
  }
  cb(null, true);
}

// El archivo se guarda en un temporal del disco (no en RAM) solo mientras se reenvía
// al servicio de IA; el controlador lo borra al terminar.
const uploadCensoArchivo = multer({
  storage: multer.diskStorage({ destination: os.tmpdir() }),
  fileFilter,
  limits: { fileSize: TAMANO_MAXIMO },
});

uploadCensoArchivo.TAMANO_MAXIMO_MB = TAMANO_MAXIMO / 1024 / 1024;

module.exports = uploadCensoArchivo;
