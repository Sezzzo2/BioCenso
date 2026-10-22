import { useCallback, useEffect, useState } from "react";
import { listarFincas } from "../services/fincaService.js";
import { listarCensosDeFinca } from "../services/censoService.js";
import { obtenerResumen } from "../services/dashboardService.js";
import { extraerError } from "../utils/errores.js";
import { ordenarCensos } from "../utils/censos.js";

// Fincas del usuario con su resumen (bovinos registrados) y todos sus censos.
// "censos" trae id_finca y nombre_finca en cada fila, ordenados del más reciente al más antiguo.
export function useDatosCuenta({ activo = true } = {}) {
  const [estado, setEstado] = useState({ cargando: activo, error: "", fincas: [], censos: [] });

  const cargar = useCallback(async () => {
    try {
      const fincas = await listarFincas();
      const porFinca = await Promise.all(fincas.map(async (finca) => {
        const [resumen, censos] = await Promise.all([
          obtenerResumen(finca.id_finca),
          listarCensosDeFinca(finca.id_finca),
        ]);
        return {
          finca: { ...finca, registrados: Number(resumen?.total_bovinos_registrados ?? 0) },
          censos: censos.map((c) => ({ ...c, id_finca: finca.id_finca, nombre_finca: finca.nombre })),
        };
      }));
      setEstado({
        cargando: false,
        error: "",
        fincas: porFinca.map((p) => p.finca),
        censos: ordenarCensos(porFinca.flatMap((p) => p.censos)),
      });
    } catch (err) {
      setEstado((e) => ({ ...e, cargando: false, error: extraerError(err) }));
    }
  }, []);

  useEffect(() => {
    if (activo) cargar();
  }, [activo, cargar]);

  return { ...estado, recargar: cargar };
}
