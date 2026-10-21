function errorHandler(err, req, res, next) {
  console.error("ERROR:", err);
  console.error("MENSAJE:", err?.message, "| CODIGO:", err?.http_code || err?.code);
  console.error(err);

  if (err.message === "Origen no permitido por CORS") {
    return res.status(403).json({ error: "Origen no permitido" });
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