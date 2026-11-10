-- Altura de vuelo del dron (metros sobre el terreno) de cada censo. Es opcional y sirve
-- para dar escala a la IA: con ella se mide mejor el tamaño, y por tanto el peso, de cada res.
-- Se puede ejecutar varias veces sin error.

ALTER TABLE public.censo ADD COLUMN IF NOT EXISTS altura_vuelo_m numeric(5,1);

-- La versión anterior (5 parámetros) se reemplaza por la de 6. La migración 001 la vuelve a
-- crear cada vez que se ejecuta el script, por eso se elimina aquí de nuevo.
DROP FUNCTION IF EXISTS public.fn_crear_censo(integer, character varying, character varying, date, character varying);

CREATE OR REPLACE FUNCTION public.fn_crear_censo(
  p_id_finca integer,
  p_nota character varying,
  p_estado character varying DEFAULT 'Procesando'::character varying,
  p_fecha_vuelo date DEFAULT NULL,
  p_nombre_archivo character varying DEFAULT NULL,
  p_altura_vuelo_m numeric DEFAULT NULL
) RETURNS public.censo
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_censo censo;
BEGIN
  INSERT INTO censo (id_finca, nota, estado, fecha_vuelo, nombre_archivo, altura_vuelo_m)
  VALUES (p_id_finca, p_nota, p_estado, p_fecha_vuelo, p_nombre_archivo, p_altura_vuelo_m)
  RETURNING * INTO v_censo;

  RETURN v_censo;
END;
$$;

-- Pesos reales que el ganadero registró en la finca, por sexo: calibran la estimación de la IA
CREATE OR REPLACE FUNCTION public.fn_pesos_registrados_finca(p_id_finca integer)
RETURNS TABLE (sexo character varying, cantidad integer, promedio numeric, minimo numeric, maximo numeric)
    LANGUAGE sql
    AS $$
  SELECT a.sexo, COUNT(*)::integer, ROUND(AVG(a.peso)), MIN(a.peso), MAX(a.peso)
  FROM animal a
  WHERE a.id_finca = p_id_finca
    AND a.peso IS NOT NULL
    AND COALESCE(a.estado_general, '') <> 'Muerto'
  GROUP BY a.sexo;
$$;

-- Deja el peso promedio del censo igual al de la tabla de bovinos guardada con la captura
CREATE OR REPLACE FUNCTION public.fn_actualizar_peso_deteccion(p_id_censo integer, p_peso numeric)
RETURNS void
    LANGUAGE sql
    AS $$
  UPDATE deteccion SET peso_estimado = p_peso WHERE id_censo = p_id_censo;
$$;
