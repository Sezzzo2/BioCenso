-- La tabla de bovinos contados se guarda aunque no se haya podido marcar la imagen
-- (por ejemplo, si la IA estaba saturada). Al guardarla sin imagen se conserva la anterior.
-- Se puede ejecutar varias veces sin error.

ALTER TABLE public.captura_censo ALTER COLUMN imagen_url DROP NOT NULL;

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
    SET imagen_url = COALESCE(EXCLUDED.imagen_url, captura_censo.imagen_url),
        segundo = COALESCE(EXCLUDED.segundo, captura_censo.segundo),
        modelo = COALESCE(EXCLUDED.modelo, captura_censo.modelo),
        pesos = EXCLUDED.pesos,
        fecha_creacion = now()
  RETURNING * INTO v_captura;

  RETURN v_captura;
END;
$$;
