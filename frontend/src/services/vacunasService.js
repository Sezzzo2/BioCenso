import api from "./api.js";
import { guardarDB, leerDB, siguienteId } from "./localStore.js";

const CAMPO_ID_ANIMAL = "id_animal";
const CAMPO_ID_VACUNA = "id_vacunas";
const CAMPO_FECHA = "fecha_vacunacion";

const normalizarLista = (data) =>
  Array.isArray(data) ? data : data?.vacunas ?? data?.aplicaciones ?? data?.data ?? [];

export const idVacuna = (v) => v.id_vacunas ?? v.id_vacuna ?? v.id;

const normalizarAplicacion = (a) => ({
  id: a.id_animal_vacunas ?? a.id_aplicacion ?? a.id_animal_vacuna ?? a.id_registro ?? a.id,
  nombre: a.nombre ?? a.nombre_vacuna ?? a.vacuna ?? "—",
  fecha: a.fecha_vacunacion ?? a.fecha_aplicacion ?? a.fecha ?? null,
});

export const listarVacunas = async () => {
  try {
    const r = await api.get("/vacunas");
    return normalizarLista(r.data);
  } catch (err) {
    if (err.response) throw err;
    return leerDB().vacunas;
  }
};

export const crearVacuna = async (nombre) => {
  try {
    const r = await api.post("/vacunas", { nombre: nombre.trim() });
    return r.data;
  } catch (err) {
    if (err.response) throw err;
    const db = leerDB();
    const nueva = {
      id_vacunas: siguienteId(db.vacunas, "id_vacunas"),
      nombre: nombre.trim(),
    };
    db.vacunas.push(nueva);
    guardarDB(db);
    return nueva;
  }
};

export const aplicarVacuna = async ({ idAnimal, idVacuna: idV, fecha }) => {
  try {
    const r = await api.post("/vacunas/aplicar", {
      [CAMPO_ID_ANIMAL]: Number(idAnimal),
      [CAMPO_ID_VACUNA]: Number(idV),
      [CAMPO_FECHA]: fecha,
    });
    return r.data;
  } catch (err) {
    if (err.response) throw err;
    const db = leerDB();
    const vac = db.vacunas.find((v) => String(idVacuna(v)) === String(idV));
    const nueva = {
      id_animal_vacunas: siguienteId(db.aplicaciones, "id_animal_vacunas"),
      id_animal: Number(idAnimal),
      id_vacunas: Number(idV),
      nombre: vac?.nombre || "Vacuna",
      fecha_vacunacion: fecha,
    };
    db.aplicaciones.push(nueva);
    guardarDB(db);
    return nueva;
  }
};

export const listarVacunasDeAnimal = async (idAnimal) => {
  try {
    const r = await api.get(`/vacunas/animal/${idAnimal}`);
    return normalizarLista(r.data).map(normalizarAplicacion);
  } catch (err) {
    if (err.response) throw err;
    return leerDB()
      .aplicaciones.filter((a) => String(a.id_animal) === String(idAnimal))
      .map(normalizarAplicacion);
  }
};

export const eliminarAplicacion = async (id) => {
  try {
    return await api.delete(`/vacunas/aplicacion/${id}`);
  } catch (err) {
    if (err.response) throw err;
    const db = leerDB();
    db.aplicaciones = db.aplicaciones.filter(
      (a) => String(a.id_animal_vacunas) !== String(id)
    );
    guardarDB(db);
    return { ok: true };
  }
};
