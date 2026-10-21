import api from "./api.js";

const CAMPO_ID_ANIMAL = "id_animal";
const CAMPO_ID_VACUNA = "id_vacunas";
const CAMPO_FECHA = "fecha_vacunacion";

const normalizarLista = (data) =>
  Array.isArray(data) ? data : data?.vacunas ?? data?.aplicaciones ?? data?.data ?? [];

// Id de una vacuna del catálogo
export const idVacuna = (v) => v.id_vacunas ?? v.id_vacuna ?? v.id;

// Convierte una fila de "vacunas aplicadas" a una forma estable para la UI
const normalizarAplicacion = (a) => ({
  id: a.id_animal_vacunas ?? a.id_aplicacion ?? a.id_animal_vacuna ?? a.id_registro ?? a.id,
  nombre: a.nombre ?? a.nombre_vacuna ?? a.vacuna ?? "—",
  fecha: a.fecha_vacunacion ?? a.fecha_aplicacion ?? a.fecha ?? null,
});

// ---- Catálogo (compartido entre usuarios) ----
export const listarVacunas = () =>
  api.get("/vacunas").then((r) => normalizarLista(r.data));

export const crearVacuna = (nombre) =>
  api.post("/vacunas", { nombre: nombre.trim() }).then((r) => r.data);

// ---- Aplicaciones a un animal ----
export const aplicarVacuna = ({ idAnimal, idVacuna: idV, fecha }) =>
  api
    .post("/vacunas/aplicar", {
      [CAMPO_ID_ANIMAL]: Number(idAnimal),
      [CAMPO_ID_VACUNA]: Number(idV),
      [CAMPO_FECHA]: fecha,
    })
    .then((r) => r.data);

export const listarVacunasDeAnimal = (idAnimal) =>
  api
    .get(`/vacunas/animal/${idAnimal}`)
    .then((r) => normalizarLista(r.data).map(normalizarAplicacion));

export const eliminarAplicacion = (id) =>
  api.delete(`/vacunas/aplicacion/${id}`);