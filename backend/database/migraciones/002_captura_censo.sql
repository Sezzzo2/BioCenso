-- Guarda la captura de cada censo: la imagen con los recuadros (en Cloudinary) y la tabla
-- de pesos. Una fila por censo con todos los bovinos en "pesos", sin un id por animal:
--   [{"n": 1, "peso_kg": 450}, {"n": 2, "peso_kg": 380}, ...]
-- Se puede ejecutar varias veces sin error.

CREATE TABLE IF NOT EXISTS public.captura_censo (
  id_captura serial PRIMARY KEY,
  id_censo integer NOT NULL UNIQUE REFERENCES public.censo (id_censo) ON DELETE CASCADE,
  imagen_url character varying(500) NOT NULL,
  segundo numeric(8,2),
  modelo character varying(80),
  pesos jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(pesos) = 'array'),
  fecha_creacion timestamp without time zone NOT NULL DEFAULT now()
);

-- Crea o reemplaza la captura del censo (al reintentarla queda solo la última)
CREATE OR REPLACE FUNCTION public.fn_guardar_captura_censo(
  p_id_censo integer,
  p_imagen_url character varying,
  p_segundo numeric,
  p_modelo character varying,
  p_pesos jsonb
) RETURNS public.captura_censo
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_captura captura_censo;
BEGIN
  INSERT INTO captura_censo (id_censo, imagen_url, segundo, modelo, pesos)
  VALUES (p_id_censo, p_imagen_url, p_segundo, p_modelo, p_pesos)
  ON CONFLICT (id_censo) DO UPDATE
    SET imagen_url = EXCLUDED.imagen_url,
        segundo = EXCLUDED.segundo,
        modelo = EXCLUDED.modelo,
        pesos = EXCLUDED.pesos,
        fecha_creacion = now()
  RETURNING * INTO v_captura;

  RETURN v_captura;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_obtener_captura_censo(p_id_censo integer)
RETURNS SETOF public.captura_censo
    LANGUAGE sql
    AS $$
  SELECT * FROM captura_censo WHERE id_censo = p_id_censo;
$$;
