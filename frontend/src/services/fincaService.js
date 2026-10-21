import api from "./api";
import { guardarDB, leerDB, siguienteId } from "./localStore";

const normalizarLista = (data) =>
  Array.isArray(data) ? data : data?.fincas ?? data?.data ?? [];

const normalizarItem = (data) => data?.finca ?? data?.data ?? data;

export const listarFincas = async () => {
  try {
    const r = await api.get("/fincas");
    return normalizarLista(r.data);
  } catch (err) {
    if (err.response) throw err;
    return leerDB().fincas;
  }
};

export const obtenerFinca = async (id) => {
  try {
    const r = await api.get(`/fincas/${id}`);
    return normalizarItem(r.data);
  } catch (err) {
    if (err.response) throw err;
    const finca = leerDB().fincas.find((f) => String(f.id_finca) === String(id));
    if (!finca) {
      const error404 = new Error("Finca no encontrada");
      error404.response = { status: 404 };
      throw error404;
    }
    return finca;
  }
};

export const crearFinca = async (datos) => {
  try {
    const r = await api.post("/fincas", datos);
    return normalizarItem(r.data);
  } catch (err) {
    if (err.response) throw err;
    const db = leerDB();
    const nueva = {
      id_finca: siguienteId(db.fincas, "id_finca"),
      nombre: datos.nombre,
      municipio: datos.municipio,
      departamento: datos.departamento,
      direccion: datos.direccion || "",
    };
    db.fincas.push(nueva);
    guardarDB(db);
    return nueva;
  }
};
