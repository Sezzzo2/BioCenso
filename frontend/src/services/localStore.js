const STORAGE_KEY = "biocenso_local_db_v1";

const INITIAL_DB = {
  usuario: {
    id_usuario: 1,
    nombre: "Ganadero",
    apellido: "BioCenso",
    correo: "demo@biocenso.co",
    rol: "Ganadero",
  },
  fincas: [
    {
      id_finca: 1,
      nombre: "Finca La Vitrina",
      municipio: "Villavicencio",
      departamento: "Meta",
      direccion: "Sede Campus Villavicencio - Universidad Cooperativa de Colombia",
    },
    {
      id_finca: 2,
      nombre: "Hacienda El Recreo",
      municipio: "Acacías",
      departamento: "Meta",
      direccion: "Vereda San Nicolás Km 8",
    },
  ],
  animales: [
    {
      id_animal: 1,
      id_finca: 1,
      numero_animal: "LV-001",
      sexo: "Hembra",
      fecha_nacimiento: "2022-05-14",
      peso: 390,
      estado_general: "Sano",
      estado_reproductivo: "En producción",
      enfermedad: "",
      imagen_url: null,
    },
    {
      id_animal: 2,
      id_finca: 1,
      numero_animal: "LV-002",
      sexo: "Macho",
      fecha_nacimiento: "2021-11-20",
      peso: 460,
      estado_general: "Sano",
      estado_reproductivo: "Reproductor",
      enfermedad: "",
      imagen_url: null,
    },
    {
      id_animal: 3,
      id_finca: 1,
      numero_animal: "LV-003",
      sexo: "Hembra",
      fecha_nacimiento: "2023-02-10",
      peso: 345,
      estado_general: "Sano",
      estado_reproductivo: "Gestante",
      enfermedad: "",
      imagen_url: null,
    },
  ],
  vacunas: [
    { id_vacunas: 1, nombre: "Fiebre Aftosa" },
    { id_vacunas: 2, nombre: "Brucelosis Bovina" },
    { id_vacunas: 3, nombre: "Rabia Silvestre" },
    { id_vacunas: 4, nombre: "Carbón Sintomático" },
  ],
  aplicaciones: [
    {
      id_animal_vacunas: 1,
      id_animal: 1,
      id_vacunas: 1,
      nombre: "Fiebre Aftosa",
      fecha_vacunacion: "2026-08-15",
    },
    {
      id_animal_vacunas: 2,
      id_animal: 2,
      id_vacunas: 3,
      nombre: "Rabia Silvestre",
      fecha_vacunacion: "2026-09-02",
    },
  ],
  censos: [
    {
      id_censo: 1,
      id_finca: 1,
      nombre_finca: "Finca La Vitrina",
      fecha_procesamiento: "2026-10-10T14:20:00.000Z",
      estado: "Completado",
      tiempo_procesamiento: 3.4,
      nota: "Vuelo potrero central - mañana",
      cantidad_animales: 14,
      conteo_minimo: 14,
      conteo_maximo: 16,
      peso_estimado: 340,
      peso_promedio_minimo_kg: 340,
      peso_promedio_maximo_kg: 380,
      peso_total_estimado: 4760,
      peso_total_minimo_kg: 4760,
      peso_total_maximo_kg: 6080,
      observaciones:
        "Análisis con Gemini 3.8 Flash: se estimaron entre 14 y 16 bovinos con peso entre 340 y 380 kg/res. Se toma el rango menor (14 reses, 340 kg promedio, 4760 kg total).",
      conteo_manual: 15,
      modelo_ia: "gemini-3.8-flash",
    },
  ],
};

export function leerDB() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_DB));
      return structuredClone(INITIAL_DB);
    }
    const parsed = JSON.parse(raw);
    return {
      ...INITIAL_DB,
      ...parsed,
    };
  } catch {
    return structuredClone(INITIAL_DB);
  }
}

export function guardarDB(db) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    // Ignorar errores de cuota
  }
  return db;
}

export function siguienteId(lista, campoId) {
  if (!Array.isArray(lista) || lista.length === 0) return 1;
  return Math.max(0, ...lista.map((item) => Number(item[campoId]) || 0)) + 1;
}
