// Datos de prueba en memoria. Se usan mientras VITE_USE_MOCKS no sea "false".
// Permiten navegar todo el frontend sin depender del backend.

const razas = ["Brahman", "Cebú", "Normando", "Holstein", "Angus", "Simmental"];

function generarAnimales(fincaId, prefijo, cantidad) {
  return Array.from({ length: cantidad }, (_, i) => ({
    id: `${fincaId}-${i + 1}`,
    fincaId,
    codigo: `${prefijo}-${String(i + 1).padStart(3, "0")}`,
    nombre: "",
    raza: razas[i % razas.length],
    sexo: i % 3 === 0 ? "Macho" : "Hembra",
    fechaNacimiento: `20${20 + (i % 5)}-0${(i % 9) + 1}-1${i % 9}`,
  }));
}

export const db = {
  fincas: [
    { id: "1", nombre: "La Vitrina", ubicacion: "Potrero principal", areaHa: 35 },
    { id: "2", nombre: "El Reposo", ubicacion: "Potrero norte", areaHa: 12 },
  ],
  animales: [...generarAnimales("1", "LV", 46), ...generarAnimales("2", "ER", 15)],
  censos: [
    {
      id: "c5",
      fincaId: "1",
      fechaVuelo: "2026-09-12",
      video: { nombre: "DJI_0412.MP4", duracionSeg: 402 },
      bovinosContados: 48,
      estado: "completado",
    },
    {
      id: "c4",
      fincaId: "1",
      fechaVuelo: "2026-08-29",
      video: { nombre: "DJI_0398.MP4", duracionSeg: 358 },
      bovinosContados: 47,
      estado: "completado",
    },
    {
      id: "c3",
      fincaId: "2",
      fechaVuelo: "2026-08-15",
      video: { nombre: "potrero_norte.mp4", duracionSeg: 490 },
      bovinosContados: 15,
      estado: "completado",
    },
    {
      id: "c2",
      fincaId: "1",
      fechaVuelo: "2026-07-30",
      video: { nombre: "DJI_0371.MP4", duracionSeg: 375 },
      bovinosContados: 46,
      estado: "completado",
    },
    {
      id: "c1",
      fincaId: "2",
      fechaVuelo: "2026-07-11",
      video: { nombre: "vuelo_julio.mov", duracionSeg: null },
      bovinosContados: null,
      estado: "error",
    },
  ],
};

export const esperar = (ms = 350) => new Promise((r) => setTimeout(r, ms));

export const nuevoId = () => Math.random().toString(36).slice(2, 9);
