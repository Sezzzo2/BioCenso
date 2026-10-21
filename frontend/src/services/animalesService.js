import api from "./api.js";

const normalizarLista = (data) =>
  Array.isArray(data) ? data : data?.animales ?? data?.data ?? [];
const normalizarItem = (data) => data?.animal ?? data?.data ?? data;

// Quita campos vacíos y convierte el peso a número
const limpiar = (form) => {
  const datos = {};
  for (const [k, v] of Object.entries(form)) {
    const valor = typeof v === "string" ? v.trim() : v;
    if (valor !== "" && valor != null) datos[k] = valor;
  }
  if (datos.peso !== undefined) datos.peso = Number(datos.peso);
  return datos;
};

const aFormData = (datos, imagen, extra = {}) => {
  const fd = new FormData();
  Object.entries({ ...extra, ...datos }).forEach(([k, v]) => fd.append(k, v));
  if (imagen) fd.append("imagen", imagen);
  return fd;
};

export const listarAnimalesDeFinca = (idFinca) =>
  api.get(`/animales/finca/${idFinca}`).then((r) => normalizarLista(r.data));

export const obtenerAnimal = (id) =>
  api.get(`/animales/${id}`).then((r) => normalizarItem(r.data));

export const crearAnimal = (idFinca, form, imagen) =>
  api
    .post("/animales", aFormData(limpiar(form), imagen, { id_finca: idFinca }))
    .then((r) => normalizarItem(r.data));

// Sin foto nueva: JSON. Con foto nueva: multipart.
export const actualizarAnimal = (id, form, imagen) => {
  const datos = limpiar(form);
  const cuerpo = imagen ? aFormData(datos, imagen) : datos;
  return api.put(`/animales/${id}`, cuerpo).then((r) => normalizarItem(r.data));
};

export const eliminarAnimal = (id) => api.delete(`/animales/${id}`);