-- La referencia de pesos que recibe la IA se agrupa por tipo de animal (vaca, ternero,
-- novilla...), que se guarda en estado_reproductivo. Agrupar solo por sexo mezclaba terneras
-- con vacas y daba un promedio que no describía a ninguna de las dos.
-- Si un bovino no tiene tipo registrado se agrupa por su sexo, como antes.
-- Se puede ejecutar varias veces sin error.

DROP FUNCTION IF EXISTS public.fn_pesos_registrados_finca(integer);

CREATE FUNCTION public.fn_pesos_registrados_finca(p_id_finca integer)
RETURNS TABLE (grupo character varying, cantidad integer, promedio numeric, minimo numeric, maximo numeric)
    LANGUAGE sql
    AS $$
  SELECT COALESCE(
           CASE WHEN a.estado_reproductivo IN ('Vaca', 'Toro', 'Novillo', 'Novilla', 'Ternero', 'Ternera')
                THEN a.estado_reproductivo END,
           a.sexo)::character varying,
         COUNT(*)::integer, ROUND(AVG(a.peso)), MIN(a.peso), MAX(a.peso)
  FROM animal a
  WHERE a.id_finca = p_id_finca
    AND a.peso IS NOT NULL
    AND COALESCE(a.estado_general, '') <> 'Muerto'
  GROUP BY 1;
$$;
