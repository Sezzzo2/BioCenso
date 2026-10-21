import api from "./api.js";

/* CONTRATO PROVISIONAL: confirma las rutas en Swagger */
const rutaResumen = (idFinca) => `/dashboard/finca/${idFinca}`;
const rutaEvolucion = (idFinca) => `/dashboard/finca/${idFinca}/evolucion`;

const comoObjeto = (data) =>
  Array.isArray(data) ? data[0] ?? null : data?.resumen ?? data?.data ?? data;
const comoLista = (data) =>
  Array.isArray(data) ? data : data?.evolucion ?? data?.data ?? [];

export const obtenerResumen = (idFinca) =>
  api.get(rutaResumen(idFinca)).then((r) => comoObjeto(r.data));

export const obtenerEvolucion = (idFinca) =>
  api.get(rutaEvolucion(idFinca)).then((r) => comoLista(r.data));

export const obtenerResumenVacunacion = () =>
  api.get("/dashboard/vacunacion").then((r) => r.data);