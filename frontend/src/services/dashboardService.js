import api from "./api.js";
import { leerDB } from "./localStore.js";

const USAR_BACKEND = import.meta.env.VITE_USE_BACKEND === "true";

const rutaResumen = (idFinca) => `/dashboard/finca/${idFinca}`;
const rutaEvolucion = (idFinca) => `/dashboard/finca/${idFinca}/evolucion`;

const comoObjeto = (data) =>
  Array.isArray(data) ? data[0] ?? null : data?.resumen ?? data?.data ?? data;
const comoLista = (data) =>
  Array.isArray(data) ? data : data?.evolucion ?? data?.data ?? [];

export const obtenerResumen = async (idFinca) => {
  if (USAR_BACKEND) {
    const r = await api.get(rutaResumen(idFinca));
    return comoObjeto(r.data);
  }
  const db = leerDB();
  const finca = db.fincas.find((f) => String(f.id_finca) === String(idFinca));
  if (!finca) {
    const e = new Error("Finca no encontrada");
    e.response = { status: 404 };
    throw e;
  }
  const animales = db.animales.filter((a) => String(a.id_finca) === String(idFinca));
  const censos = db.censos
    .filter((c) => String(c.id_finca) === String(idFinca))
    .sort((a, b) => new Date(b.fecha_procesamiento) - new Date(a.fecha_procesamiento));

  const ultimo = censos[0] || null;
  const tiempoProm =
    censos.length > 0
      ? Number(
          (
            censos.reduce((acc, c) => acc + (Number(c.tiempo_procesamiento) || 0), 0) /
            censos.length
          ).toFixed(2)
        )
      : null;

  const dif =
    ultimo && ultimo.conteo_manual != null && ultimo.cantidad_animales != null
      ? ultimo.cantidad_animales - ultimo.conteo_manual
      : null;

  return {
    id_finca: finca.id_finca,
    nombre_finca: finca.nombre,
    total_bovinos_registrados: animales.length,
    numero_censos: censos.length,
    tiempo_promedio_procesamiento: tiempoProm,
    id_ultimo_censo: ultimo?.id_censo ?? null,
    cantidad_detectada_ultimo_censo: ultimo?.cantidad_animales ?? null,
    peso_estimado_ultimo_censo: ultimo?.peso_estimado ?? null,
    peso_total_estimado_ultimo_censo: ultimo?.peso_total_estimado ?? null,
    fecha_ultimo_censo: ultimo?.fecha_procesamiento ?? null,
    conteo_manual_ultimo_censo: ultimo?.conteo_manual ?? null,
    diferencia_ultimo_censo: dif,
  };
};

export const obtenerEvolucion = async (idFinca) => {
  if (USAR_BACKEND) {
    const r = await api.get(rutaEvolucion(idFinca));
    return comoLista(r.data);
  }
  const db = leerDB();
  return db.censos
    .filter((c) => String(c.id_finca) === String(idFinca))
    .map((c) => ({
      id_censo: c.id_censo,
      fecha_procesamiento: c.fecha_procesamiento,
      cantidad_animales: c.cantidad_animales,
      conteo_manual: c.conteo_manual,
      peso_estimado: c.peso_estimado,
      peso_total_estimado: c.peso_total_estimado,
    }));
};

export const obtenerResumenVacunacion = async () => {
  if (USAR_BACKEND) {
    const r = await api.get("/dashboard/vacunacion");
    return r.data;
  }
  const db = leerDB();
  const animalesVacunados = new Set(db.aplicaciones.map((a) => a.id_animal)).size;
  return {
    total_aplicaciones: db.aplicaciones.length,
    animales_vacunados: animalesVacunados,
    proximas_dosis: "No calculable",
    vacunaciones_vencidas: "No calculable",
    mensaje_programacion: null,
  };
};
