import api from "./api";

// Acepta un arreglo directo o un objeto envuelto ({ fincas: [...] }, { data: [...] })
const normalizarLista = (data) =>
  Array.isArray(data) ? data : data?.fincas ?? data?.data ?? [];

const normalizarItem = (data) => data?.finca ?? data?.data ?? data;

export const listarFincas = () =>
  api.get("/fincas").then((r) => normalizarLista(r.data));

export const obtenerFinca = (id) =>
  api.get(`/fincas/${id}`).then((r) => normalizarItem(r.data));

export const crearFinca = (datos) =>
  api.post("/fincas", datos).then((r) => normalizarItem(r.data));