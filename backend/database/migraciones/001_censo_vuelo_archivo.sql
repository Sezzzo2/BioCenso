-- Guarda la fecha del vuelo del dron y el nombre del archivo subido en cada censo,
-- y permite listar los censos de una finca con su conteo en una sola consulta.
-- Se puede ejecutar varias veces sin error.

ALTER TABLE public.censo ADD COLUMN IF NOT EXISTS fecha_vuelo date;
ALTER TABLE public.censo ADD COLUMN IF NOT EXISTS nombre_archivo character varying(255);

DROP FUNCTION IF EXISTS public.fn_crear_censo(integer, character varying, character varying);

CREATE OR REPLACE FUNCTION public.fn_crear_censo(
  p_id_finca integer,
  p_nota character varying,
  p_estado character varying DEFAULT 'Procesando'::character varying,
  p_fecha_vuelo date DEFAULT NULL,
  p_nombre_archivo character varying DEFAULT NULL
) RETURNS public.censo
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_censo censo;
BEGIN
  INSERT INTO censo (id_finca, nota, estado, fecha_vuelo, nombre_archivo)
  VALUES (p_id_finca, p_nota, p_estado, p_fecha_vuelo, p_nombre_archivo)
  RETURNING * INTO v_censo;

  RETURN v_censo;
END;
$$;

-- Las columnas nuevas van al final: CREATE OR REPLACE VIEW solo permite agregar al final
CREATE OR REPLACE VIEW public.vista_censo_completo AS
 SELECT c.id_censo,
    c.id_finca,
    c.nota,
    c.fecha_procesamiento,
    c.estado,
    c.tiempo_procesamiento,
    f.nombre AS nombre_finca,
    d.id_deteccion,
    d.cantidad_animales,
    d.peso_estimado,
    c.conteo_manual,
    c.fecha_vuelo,
    c.nombre_archivo
   FROM ((public.censo c
     JOIN public.finca f ON ((f.id_finca = c.id_finca)))
     LEFT JOIN public.deteccion d ON ((d.id_censo = c.id_censo)));

CREATE OR REPLACE FUNCTION public.fn_listar_censos_finca_completo(p_id_finca integer)
RETURNS SETOF public.vista_censo_completo
    LANGUAGE sql
    AS $$
  SELECT * FROM vista_censo_completo
  WHERE id_finca = p_id_finca
  ORDER BY COALESCE(fecha_vuelo, fecha_procesamiento::date) DESC, fecha_procesamiento DESC;
$$;
