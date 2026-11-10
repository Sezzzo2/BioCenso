-- Hasta ahora el backend guardaba los textos con entidades HTML (D'Angelo quedaba como
-- D&#x27;Angelo). Esta migración devuelve los caracteres originales una sola vez: la tabla
-- migracion_aplicada evita repetirla, para no tocar textos que alguien escriba después.

CREATE TABLE IF NOT EXISTS public.migracion_aplicada (
  nombre character varying(100) PRIMARY KEY,
  fecha timestamp without time zone NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION pg_temp.sin_escapar(t text) RETURNS text
    LANGUAGE sql IMMUTABLE
    AS $$
  -- &amp; va al final para no crear entidades nuevas al reemplazar las demás
  SELECT replace(replace(replace(replace(replace(replace(replace(replace(
    t, '&#x27;', ''''), '&quot;', '"'), '&lt;', '<'), '&gt;', '>'),
    '&#x2F;', '/'), '&#x5C;', '\'), '&#96;', '`'), '&amp;', '&');
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM migracion_aplicada WHERE nombre = '005_textos_sin_escapar') THEN
    RETURN;
  END IF;

  UPDATE usuario SET nombre = pg_temp.sin_escapar(nombre), apellido = pg_temp.sin_escapar(apellido)
    WHERE nombre LIKE '%&%' OR apellido LIKE '%&%';
  UPDATE finca SET nombre = pg_temp.sin_escapar(nombre), municipio = pg_temp.sin_escapar(municipio),
    departamento = pg_temp.sin_escapar(departamento), direccion = pg_temp.sin_escapar(direccion)
    WHERE nombre LIKE '%&%' OR municipio LIKE '%&%' OR departamento LIKE '%&%' OR direccion LIKE '%&%';
  UPDATE animal SET estado_reproductivo = pg_temp.sin_escapar(estado_reproductivo),
    enfermedad = pg_temp.sin_escapar(enfermedad)
    WHERE estado_reproductivo LIKE '%&%' OR enfermedad LIKE '%&%';
  UPDATE censo SET nota = pg_temp.sin_escapar(nota) WHERE nota LIKE '%&%';
  UPDATE vacunas SET nombre = pg_temp.sin_escapar(nombre) WHERE nombre LIKE '%&%';

  INSERT INTO migracion_aplicada (nombre) VALUES ('005_textos_sin_escapar');
END;
$$;
