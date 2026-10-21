export function extraerError(error) {
  // Sin respuesta: el backend está caído o hay un problema de red
  if (!error.response) {
    return "No se pudo conectar con el servidor. Verifica que el backend esté en ejecución.";
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

  return data?.mensaje || data?.message || data?.error || "Ocurrió un error inesperado.";
}