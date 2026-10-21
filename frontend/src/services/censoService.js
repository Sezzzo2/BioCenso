import api from "./api.js";
import { analizarArchivoConGemini } from "./geminiService.js";
import { guardarDB, leerDB, siguienteId } from "./localStore.js";

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
  try {
    const r = await api.get(`/censos/finca/${idFinca}`);
    return normalizarLista(r.data).map(enriquecerCensoConLocal);
  } catch (err) {
    if (err.response) throw err;
    return leerDB().censos.filter((c) => String(c.id_finca) === String(idFinca));
  }
};

export const obtenerCenso = async (id) => {
  try {
    const r = await api.get(`/censos/${id}`);
    return enriquecerCensoConLocal(r.data);
  } catch (err) {
    if (err.response) throw err;
    const censo = leerDB().censos.find((c) => String(c.id_censo) === String(id));
    if (!censo) {
      const e = new Error("Censo no encontrado");
      e.response = { status: 404 };
      throw e;
    }
    return censo;
  }
};

export const idDeCenso = (data) =>
  data?.censo?.id_censo ?? data?.id_censo ?? data?.id ?? null;

export const crearCenso = async ({ idFinca, nota, archivo, onProgress, signal }) => {
  // Analizamos directamente con Gemini 3.8 Flash (rango menor de reses y de peso)
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
    conteo_minimo: analisis.conteo_minimo,
    conteo_maximo: analisis.conteo_maximo,
    peso_estimado: analisis.peso_estimado_promedio,
    peso_promedio_minimo_kg: analisis.peso_promedio_minimo_kg,
    peso_promedio_maximo_kg: analisis.peso_promedio_maximo_kg,
    peso_total_estimado: analisis.peso_total_estimado,
    peso_total_minimo_kg: analisis.peso_total_minimo_kg,
    peso_total_maximo_kg: analisis.peso_total_maximo_kg,
    observaciones: analisis.observaciones,
    conteo_manual: null,
    modelo_ia: analisis.model,
  };

  db.censos.unshift(censoLocal);
  guardarDB(db);

  return {
    censo: censoLocal,
    deteccion: {
      cantidad_animales: analisis.count,
      conteo_minimo: analisis.conteo_minimo,
      conteo_maximo: analisis.conteo_maximo,
      peso_estimado: analisis.peso_estimado_promedio,
      peso_promedio_minimo_kg: analisis.peso_promedio_minimo_kg,
      peso_promedio_maximo_kg: analisis.peso_promedio_maximo_kg,
      peso_total_estimado: analisis.peso_total_estimado,
      peso_total_minimo_kg: analisis.peso_total_minimo_kg,
      peso_total_maximo_kg: analisis.peso_total_maximo_kg,
      observaciones: analisis.observaciones,
      model: analisis.model,
    },
  };
};

const CAMPO_CONTEO_MANUAL = "conteo_manual";

export const registrarConteoManual = async (id, valor) => {
  const num = Number(valor);
  try {
    const r = await api.patch(`/censos/${id}/conteo-manual`, {
      [CAMPO_CONTEO_MANUAL]: num,
    });
    return r.data;
  } catch (err) {
    if (err.response) throw err;
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
  }
};
