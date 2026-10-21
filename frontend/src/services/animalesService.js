import api from "./api.js";
import { guardarDB, leerDB, siguienteId } from "./localStore.js";

const USAR_BACKEND = import.meta.env.VITE_USE_BACKEND === "true";

const normalizarLista = (data) =>
  Array.isArray(data) ? data : data?.animales ?? data?.data ?? [];
const normalizarItem = (data) => data?.animal ?? data?.data ?? data;

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

const leerImagenDataUrl = (archivo) =>
  new Promise((resolve) => {
    if (!archivo) return resolve(null);
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(archivo);
  });

export const listarAnimalesDeFinca = async (idFinca) => {
  if (USAR_BACKEND) {
    const r = await api.get(`/animales/finca/${idFinca}`);
    return normalizarLista(r.data);
  }
  return leerDB().animales.filter((a) => String(a.id_finca) === String(idFinca));
};

export const obtenerAnimal = async (id) => {
  if (USAR_BACKEND) {
    const r = await api.get(`/animales/${id}`);
    return normalizarItem(r.data);
  }
  const animal = leerDB().animales.find((a) => String(a.id_animal) === String(id));
  if (!animal) {
    const e = new Error("No encontrado");
    e.response = { status: 404 };
    throw e;
  }
  return animal;
};

export const crearAnimal = async (idFinca, form, imagen) => {
  const limpio = limpiar(form);
  if (USAR_BACKEND) {
    const r = await api.post("/animales", aFormData(limpio, imagen, { id_finca: idFinca }));
    return normalizarItem(r.data);
  }
  const db = leerDB();
  const imagen_url = await leerImagenDataUrl(imagen);
  const nuevo = {
    id_animal: siguienteId(db.animales, "id_animal"),
    id_finca: Number(idFinca),
    ...limpio,
    imagen_url,
  };
  db.animales.push(nuevo);
  guardarDB(db);
  return nuevo;
};

export const actualizarAnimal = async (id, form, imagen) => {
  const datos = limpiar(form);
  if (USAR_BACKEND) {
    const cuerpo = imagen ? aFormData(datos, imagen) : datos;
    const r = await api.put(`/animales/${id}`, cuerpo);
    return normalizarItem(r.data);
  }
  const db = leerDB();
  const idx = db.animales.findIndex((a) => String(a.id_animal) === String(id));
  if (idx === -1) {
    const e = new Error("No encontrado");
    e.response = { status: 404 };
    throw e;
  }
  const imagen_url = imagen ? await leerImagenDataUrl(imagen) : db.animales[idx].imagen_url;
  db.animales[idx] = {
    ...db.animales[idx],
    ...datos,
    imagen_url,
  };
  guardarDB(db);
  return db.animales[idx];
};

export const eliminarAnimal = async (id) => {
  if (USAR_BACKEND) {
    return await api.delete(`/animales/${id}`);
  }
  const db = leerDB();
  db.animales = db.animales.filter((a) => String(a.id_animal) !== String(id));
  guardarDB(db);
  return { ok: true };
};
