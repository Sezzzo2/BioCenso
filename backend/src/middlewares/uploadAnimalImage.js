const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

const TIPOS_PERMITIDOS = ["image/jpeg", "image/png", "image/webp"];
const TAMANO_MAXIMO = 5 * 1024 * 1024; // 5 MB

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "biocenso/animales",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [{ width: 800, height: 800, crop: "limit" }],
  },
});

function fileFilter(req, file, cb) {
  if (!TIPOS_PERMITIDOS.includes(file.mimetype)) {
    return cb(new Error("Formato de imagen no permitido (solo JPG, PNG o WEBP)"));
  }
  cb(null, true);
}

const uploadAnimalImage = multer({
  storage,
  fileFilter,
  limits: { fileSize: TAMANO_MAXIMO },
});

module.exports = uploadAnimalImage;