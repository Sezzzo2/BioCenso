function errorHandler(err, req, res, next) {
  console.error("ERROR:", err);
  console.error("MENSAJE:", err?.message, "| CODIGO:", err?.http_code || err?.code);
  console.error(err);

  if (err.message === "Origen no permitido por CORS") {
    return res.status(403).json({ error: "Origen no permitido" });
  }

  // Fallos de Cloudinary al guardar la foto de un bovino (credenciales, red, cuota)
  if (err.http_code || err.error?.http_code || /cloudinary|api_key|cloud_name|signature/i.test(err.message || "")) {
    return res.status(502).json({
      error: "No se pudo guardar la foto. Inténtalo de nuevo o registra el bovino sin foto y agrégala después.",
    });
  }

  if (err.message === "Formato de imagen no permitido (solo JPG, PNG o WEBP)") {
    return res.status(422).json({ error: err.message });
  }

  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ error: "El archivo supera el tamaño máximo permitido (5 MB para fotos, 20 MB para censos)" });
  }

  if (err.type === "entity.too.large") {
    return res.status(413).json({ error: "El cuerpo de la solicitud es demasiado grande" });
  }

  if (err.code === "23505") {
    return res.status(409).json({ error: "El registro ya existe (violación de unicidad)" });
  }

  if (err.code === "23503") {
    return res.status(400).json({ error: "Referencia inválida: el recurso relacionado no existe" });
  }

  res.status(err.status || 500).json({
    error: err.publicMessage || "Error interno del servidor",
  });
}

module.exports = errorHandler;