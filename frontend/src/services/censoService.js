import api from "./api.js";
import { analizarArchivoConGemini } from "./geminiService.js";
import { guardarDB, leerDB, siguienteId } from "./localStore.js";

const USAR_BACKEND = import.meta.env.VITE_USE_BACKEND === "true";

const normalizarLista = (data) =>
  Array.isArray(data) ? data : data?.censos ?? data?.data ?? [];

function enriquecerCensoConLocal(censoRemoto) {
  if (!censoRemoto) return censoRemoto;
  const db = leerDB();
  const extra = db.censos.find(
    (c) => String(c.id_censo) === String(censoRemoto.id_censo)
  );
  const cantidad = Number(censoRemoto.cantidad_animales ?? extra?.cantidad_animales ?? 0);
  const pesoProm = Number(censoRemoto.peso_estimado ?? extra?.peso_estimado ?? 0);
  const pesoTotal =
    censoRemoto.peso_total_estimado ??
    extra?.peso_total_estimado ??
    Math.round(cantidad * pesoProm * 10) / 10;

  return {
    ...extra,
    ...censoRemoto,
    peso_total_estimado: pesoTotal,
  };
}

export const listarCensosDeFinca = async (idFinca) => {
  if (USAR_BACKEND) {
    const r = await api.get(`/censos/finca/${idFinca}`);
    return normalizarLista(r.data).map(enriquecerCensoConLocal);
  }
  return leerDB().censos.filter((c) => String(c.id_finca) === String(idFinca));
};

export const obtenerCenso = async (id) => {
  if (USAR_BACKEND) {
    const r = await api.get(`/censos/${id}`);
    return enriquecerCensoConLocal(r.data);
  }
  const censo = leerDB().censos.find((c) => String(c.id_censo) === String(id));
  if (!censo) {
    const e = new Error("Censo no encontrado");
    e.response = { status: 404 };
    throw e;
  }
  return censo;
};

export const idDeCenso = (data) =>
  data?.censo?.id_censo ?? data?.id_censo ?? data?.id ?? null;

export const crearCenso = async ({ idFinca, nota, archivo, onProgress, signal }) => {
  const analisis = await analizarArchivoConGemini(archivo, { onProgress, signal });

  const db = leerDB();
  const finca = db.fincas.find((f) => String(f.id_finca) === String(idFinca));
  const idNuevo = siguienteId(db.censos, "id_censo");

  const censoLocal = {
    id_censo: idNuevo,
    id_finca: Number(idFinca),
    nombre_finca: finca?.nombre || `Finca #${idFinca}`,
    fecha_procesamiento: new Date().toISOString(),
    estado: "Completado",
    tiempo_procesamiento: analisis.processing_time,
    nota: nota?.trim() || null,
    cantidad_animales: analisis.count,
    peso_estimado: analisis.peso_estimado_promedio,
    peso_promedio_minimo_kg: analisis.peso_promedio_minimo_kg,
    peso_promedio_maximo_kg: analisis.peso_promedio_maximo_kg,
    peso_total_estimado: analisis.peso_total_estimado,
    peso_total_minimo_kg: analisis.peso_total_minimo_kg,
    peso_total_maximo_kg: analisis.peso_total_maximo_kg,
    conteo_manual: null,
    modelo_ia: analisis.model,
  };

  db.censos.unshift(censoLocal);
  guardarDB(db);

  return {
    censo: censoLocal,
    deteccion: {
      cantidad_animales: analisis.count,
      peso_estimado: analisis.peso_estimado_promedio,
      peso_promedio_minimo_kg: analisis.peso_promedio_minimo_kg,
      peso_promedio_maximo_kg: analisis.peso_promedio_maximo_kg,
      peso_total_estimado: analisis.peso_total_estimado,
      peso_total_minimo_kg: analisis.peso_total_minimo_kg,
      peso_total_maximo_kg: analisis.peso_total_maximo_kg,
      model: analisis.model,
    },
  };
};

const CAMPO_CONTEO_MANUAL = "conteo_manual";

export const registrarConteoManual = async (id, valor) => {
  const num = Number(valor);
  if (USAR_BACKEND) {
    const r = await api.patch(`/censos/${id}/conteo-manual`, {
      [CAMPO_CONTEO_MANUAL]: num,
    });
    return r.data;
  }
  const db = leerDB();
  const idx = db.censos.findIndex((c) => String(c.id_censo) === String(id));
  if (idx === -1) {
    const e = new Error("Censo no encontrado");
    e.response = { status: 404 };
    throw e;
  }
  db.censos[idx].conteo_manual = num;
  guardarDB(db);
  return db.censos[idx];
};
