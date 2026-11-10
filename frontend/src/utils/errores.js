// Mensaje para la persona a partir de un error de axios (o de cualquier Error)
export function extraerError(error) {
  // Se acabó el tiempo de espera
  if (error?.code === "ECONNABORTED") {
    return "El servidor tardó demasiado en responder. Inténtalo de nuevo en un momento.";
  }
  // Sin respuesta: el servidor está despertando, caído o falló la conexión
  if (!error?.response) {
    // Errores propios de la página (no de red) ya traen un mensaje en español
    if (error?.message && !error?.isAxiosError && !/network|failed to fetch/i.test(error.message)) {
      return error.message;
    }
    return "No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo en un momento.";
  }

  const { status, data } = error.response;

  if (status === 429) {
    return "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.";
  }
  if (status === 401) {
    return "Correo o contraseña incorrectos.";
  }

  // express-validator suele devolver una lista de errores
  const lista = data?.errores || data?.errors;
  if (Array.isArray(lista) && lista.length > 0) {
    return lista
      .map((e) => e.msg || e.mensaje || e.message || String(e))
      .join(" · ");
  }

  const texto = data?.mensaje || data?.message || data?.error;
  if (typeof texto === "string" && texto) return texto;
  if (status >= 500) return "El servidor tuvo un problema. Inténtalo de nuevo en unos minutos.";
  return "Ocurrió un error inesperado. Inténtalo de nuevo.";
}
