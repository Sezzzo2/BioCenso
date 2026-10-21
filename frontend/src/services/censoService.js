import api from "./api.js";

/* CONTRATO: confírmalo contra Swagger */
const CAMPO_ARCHIVO = "imagen"; // si ahora es "video", cámbialo aquí
const TIMEOUT_MS = 10 * 60 * 1000; // subir + analizar puede tardar varios minutos
const normalizarLista = (data) =>
  Array.isArray(data) ? data : data?.censos ?? data?.data ?? [];

export const listarCensosDeFinca = (idFinca) =>
  api.get(`/censos/finca/${idFinca}`).then((r) => normalizarLista(r.data));

export const obtenerCenso = (id) =>
  api.get(`/censos/${id}`).then((r) => r.data);
export const idDeCenso = (data) =>
  data?.censo?.id_censo ?? data?.id_censo ?? data?.id ?? null;

export const crearCenso = ({ idFinca, nota, archivo, onProgress, signal }) => {
  const fd = new FormData();
  // Los campos de texto van antes que el archivo
  fd.append("id_finca", idFinca);
  if (nota?.trim()) fd.append("nota", nota.trim());
  fd.append(CAMPO_ARCHIVO, archivo);

  return api
    .post("/censos", fd, {
      timeout: TIMEOUT_MS, // anula los 15 s por defecto de api.js
      signal,
      onUploadProgress: (e) => {
        if (e.total) onProgress?.(Math.round((e.loaded * 100) / e.total));
      },
    })
    .then((r) => r.data);
};

/* CONTRATO PROVISIONAL: confirma el body del PATCH en Swagger */
const CAMPO_CONTEO_MANUAL = "conteo_manual";

export const registrarConteoManual = (id, valor) =>
  api
    .patch(`/censos/${id}/conteo-manual`, { [CAMPO_CONTEO_MANUAL]: Number(valor) })
    .then((r) => r.data);
