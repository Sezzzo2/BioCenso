-- Esquema de la base de datos de BioCenso (solo estructura, sin datos).
-- Extraído del respaldo de la base de desarrollo (PostgreSQL 18).
-- Uso: ejecutar completo sobre una base vacía (local o Railway).

SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;

CREATE TABLE public.animal (
    id_animal integer NOT NULL,
    id_finca integer NOT NULL,
    numero_animal character varying(100) NOT NULL,
    fecha_nacimiento date,
    peso numeric(10,2),
    sexo character varying(20) NOT NULL,
    estado_reproductivo character varying(50),
    estado_general character varying(50) DEFAULT 'Sano'::character varying,
    enfermedad character varying(255),
    imagen_url character varying(255),
    creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizado_en timestamp without time zone DEFAULT now() NOT NULL
);

CREATE FUNCTION public.fn_actualizar_animal(p_id_animal integer, p_numero_animal character varying, p_imagen_url character varying, p_fecha_nacimiento date, p_peso numeric, p_sexo character varying, p_estado_reproductivo character varying, p_estado_general character varying, p_enfermedad character varying) RETURNS SETOF public.animal
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  UPDATE animal SET
    numero_animal = p_numero_animal,
    imagen_url = p_imagen_url,
    fecha_nacimiento = p_fecha_nacimiento,
    peso = p_peso,
    sexo = p_sexo,
    estado_reproductivo = p_estado_reproductivo,
    estado_general = p_estado_general,
    enfermedad = p_enfermedad
  WHERE id_animal = p_id_animal
  RETURNING *;
END;
$$;

CREATE TABLE public.censo (
    id_censo integer NOT NULL,
    id_finca integer NOT NULL,
    nota character varying(500),
    fecha_procesamiento timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    estado character varying(50) NOT NULL,
    tiempo_procesamiento numeric(10,2),
    conteo_manual integer
);

CREATE FUNCTION public.fn_actualizar_conteo_manual(p_id_censo integer, p_conteo_manual integer) RETURNS SETOF public.censo
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  UPDATE censo SET conteo_manual = p_conteo_manual
  WHERE id_censo = p_id_censo
  RETURNING *;
END;
$$;

CREATE FUNCTION public.fn_actualizar_estado_censo(p_id_censo integer, p_estado character varying, p_tiempo_procesamiento numeric) RETURNS SETOF public.censo
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  UPDATE censo SET estado = p_estado, tiempo_procesamiento = p_tiempo_procesamiento
  WHERE id_censo = p_id_censo
  RETURNING *;
END;
$$;

CREATE TABLE public.animal_vacunas (
    id_animal_vacunas integer NOT NULL,
    id_animal integer NOT NULL,
    id_vacunas integer NOT NULL,
    fecha_vacunacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE FUNCTION public.fn_aplicar_vacuna(p_id_animal integer, p_id_vacunas integer, p_fecha_vacunacion timestamp without time zone DEFAULT now()) RETURNS public.animal_vacunas
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_aplicacion animal_vacunas;
BEGIN
  INSERT INTO animal_vacunas (id_animal, id_vacunas, fecha_vacunacion)
  VALUES (p_id_animal, p_id_vacunas, p_fecha_vacunacion)
  RETURNING * INTO v_aplicacion;

  RETURN v_aplicacion;
END;
$$;

CREATE FUNCTION public.fn_crear_animal(p_id_finca integer, p_numero_animal character varying, p_imagen_url character varying, p_fecha_nacimiento date, p_peso numeric, p_sexo character varying, p_estado_reproductivo character varying, p_estado_general character varying, p_enfermedad character varying) RETURNS public.animal
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_animal animal;
BEGIN
  INSERT INTO animal (
    id_finca, numero_animal, imagen_url, fecha_nacimiento,
    peso, sexo, estado_reproductivo, estado_general, enfermedad
  )
  VALUES (
    p_id_finca, p_numero_animal, p_imagen_url, p_fecha_nacimiento,
    p_peso, p_sexo, p_estado_reproductivo,
    COALESCE(p_estado_general, 'Sano'), p_enfermedad
  )
  RETURNING * INTO v_animal;

  RETURN v_animal;
END;
$$;

CREATE FUNCTION public.fn_crear_censo(p_id_finca integer, p_nota character varying, p_estado character varying DEFAULT 'Procesando'::character varying) RETURNS public.censo
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_censo censo;
BEGIN
  INSERT INTO censo (id_finca, nota, estado)
  VALUES (p_id_finca, p_nota, p_estado)
  RETURNING * INTO v_censo;

  RETURN v_censo;
END;
$$;

CREATE TABLE public.deteccion (
    id_deteccion integer NOT NULL,
    id_censo integer NOT NULL,
    cantidad_animales numeric(10,2) NOT NULL,
    peso_estimado numeric(10,2) NOT NULL
);

CREATE FUNCTION public.fn_crear_deteccion(p_id_censo integer, p_cantidad_animales numeric, p_peso_estimado numeric) RETURNS public.deteccion
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_deteccion deteccion;
BEGIN
  INSERT INTO deteccion (id_censo, cantidad_animales, peso_estimado)
  VALUES (p_id_censo, p_cantidad_animales, p_peso_estimado)
  RETURNING * INTO v_deteccion;

  RETURN v_deteccion;
END;
$$;

CREATE TABLE public.finca (
    id_finca integer NOT NULL,
    id_usuario integer NOT NULL,
    nombre character varying(150) NOT NULL,
    municipio character varying(100) NOT NULL,
    departamento character varying(100) NOT NULL,
    direccion character varying(200),
    estado boolean DEFAULT true NOT NULL,
    creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizado_en timestamp without time zone DEFAULT now() NOT NULL
);

CREATE FUNCTION public.fn_crear_finca(p_id_usuario integer, p_nombre character varying, p_municipio character varying, p_departamento character varying, p_direccion character varying DEFAULT NULL::character varying) RETURNS public.finca
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_finca finca;
BEGIN
  INSERT INTO finca (id_usuario, nombre, municipio, departamento, direccion)
  VALUES (p_id_usuario, p_nombre, p_municipio, p_departamento, p_direccion)
  RETURNING * INTO v_finca;

  RETURN v_finca;
END;
$$;

CREATE TABLE public.usuario (
    id_usuario integer NOT NULL,
    nombre character varying(100) NOT NULL,
    apellido character varying(100) NOT NULL,
    correo character varying(150) NOT NULL,
    contrasena character varying(255) NOT NULL,
    rol character varying(50) NOT NULL,
    fecha_registro timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    estado boolean DEFAULT true NOT NULL
);

CREATE FUNCTION public.fn_crear_usuario(p_nombre character varying, p_apellido character varying, p_correo character varying, p_contrasena_hash character varying, p_rol character varying DEFAULT 'Ganadero'::character varying) RETURNS public.usuario
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_usuario usuario;
BEGIN
  INSERT INTO usuario (nombre, apellido, correo, contrasena, rol)
  VALUES (p_nombre, p_apellido, p_correo, p_contrasena_hash, p_rol)
  RETURNING * INTO v_usuario;

  RETURN v_usuario;
END;
$$;

CREATE TABLE public.vacunas (
    id_vacunas integer NOT NULL,
    nombre character varying(150) NOT NULL
);

CREATE FUNCTION public.fn_crear_vacuna(p_nombre character varying) RETURNS public.vacunas
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_vacuna vacunas;
BEGIN
  INSERT INTO vacunas (nombre) VALUES (p_nombre)
  RETURNING * INTO v_vacuna;

  RETURN v_vacuna;
END;
$$;

CREATE FUNCTION public.fn_dashboard_finca(p_id_finca integer) RETURNS TABLE(total_bovinos_registrados bigint, numero_censos bigint, tiempo_promedio_procesamiento numeric, id_ultimo_censo integer, fecha_ultimo_censo timestamp without time zone, cantidad_detectada_ultimo_censo numeric, conteo_manual_ultimo_censo integer, diferencia_ultimo_censo numeric, porcentaje_precision_ultimo_censo numeric)
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_ultimo_censo censo;
  v_cantidad_detectada NUMERIC;
BEGIN
  SELECT COUNT(*) INTO total_bovinos_registrados FROM animal WHERE id_finca = p_id_finca;

  SELECT COUNT(*) INTO numero_censos FROM censo WHERE id_finca = p_id_finca AND estado = 'Completado';

  SELECT AVG(tiempo_procesamiento) INTO tiempo_promedio_procesamiento
  FROM censo WHERE id_finca = p_id_finca AND estado = 'Completado';

  SELECT * INTO v_ultimo_censo
  FROM censo
  WHERE id_finca = p_id_finca AND estado = 'Completado'
  ORDER BY fecha_procesamiento DESC
  LIMIT 1;

  IF v_ultimo_censo.id_censo IS NOT NULL THEN
    id_ultimo_censo := v_ultimo_censo.id_censo;
    fecha_ultimo_censo := v_ultimo_censo.fecha_procesamiento;
    conteo_manual_ultimo_censo := v_ultimo_censo.conteo_manual;

    SELECT d.cantidad_animales INTO v_cantidad_detectada
    FROM deteccion d WHERE d.id_censo = v_ultimo_censo.id_censo;

    cantidad_detectada_ultimo_censo := v_cantidad_detectada;

    IF v_ultimo_censo.conteo_manual IS NOT NULL AND v_ultimo_censo.conteo_manual > 0 THEN
      diferencia_ultimo_censo := ABS(v_cantidad_detectada - v_ultimo_censo.conteo_manual);
      porcentaje_precision_ultimo_censo := 100 - (diferencia_ultimo_censo / v_ultimo_censo.conteo_manual * 100);
    END IF;
  END IF;

  RETURN NEXT;
END;
$$;

CREATE FUNCTION public.fn_evolucion_censos_finca(p_id_finca integer) RETURNS TABLE(id_censo integer, fecha_procesamiento timestamp without time zone, cantidad_animales numeric, conteo_manual integer)
    LANGUAGE sql
    AS $$
  SELECT c.id_censo, c.fecha_procesamiento, d.cantidad_animales, c.conteo_manual
  FROM censo c
  LEFT JOIN deteccion d ON d.id_censo = c.id_censo
  WHERE c.id_finca = p_id_finca AND c.estado = 'Completado'
  ORDER BY c.fecha_procesamiento ASC;
$$;

CREATE FUNCTION public.fn_listar_censos_finca(p_id_finca integer) RETURNS SETOF public.censo
    LANGUAGE sql
    AS $$
  SELECT * FROM censo WHERE id_finca = p_id_finca ORDER BY fecha_procesamiento DESC;
$$;

CREATE FUNCTION public.fn_listar_fincas(p_id_usuario integer DEFAULT NULL::integer) RETURNS SETOF public.finca
    LANGUAGE sql
    AS $$
  SELECT *
  FROM finca
  WHERE estado = TRUE
    AND (p_id_usuario IS NULL OR id_usuario = p_id_usuario)
  ORDER BY creado_en DESC;
$$;

CREATE FUNCTION public.fn_listar_fincas_usuario(p_id_usuario integer) RETURNS SETOF public.finca
    LANGUAGE sql
    AS $$
  SELECT DISTINCT f.*
  FROM finca f
  LEFT JOIN usuario_finca uf ON uf.id_finca = f.id_finca
  WHERE f.estado = TRUE
    AND (f.id_usuario = p_id_usuario OR uf.id_usuario = p_id_usuario)
  ORDER BY f.creado_en DESC;
$$;

CREATE FUNCTION public.fn_listar_vacunas() RETURNS SETOF public.vacunas
    LANGUAGE sql
    AS $$
  SELECT * FROM vacunas ORDER BY nombre ASC;
$$;

CREATE FUNCTION public.fn_obtener_animal(p_id_animal integer) RETURNS SETOF public.animal
    LANGUAGE sql
    AS $$
  SELECT * FROM animal WHERE id_animal = p_id_animal;
$$;

CREATE FUNCTION public.fn_obtener_finca(p_id_finca integer) RETURNS SETOF public.finca
    LANGUAGE sql
    AS $$
  SELECT * FROM finca WHERE id_finca = p_id_finca;
$$;

CREATE FUNCTION public.fn_obtener_usuario_por_correo(p_correo character varying) RETURNS SETOF public.usuario
    LANGUAGE sql
    AS $$
  SELECT * FROM usuario WHERE correo = p_correo;
$$;

CREATE FUNCTION public.fn_usuario_tiene_acceso_finca(p_id_usuario integer, p_id_finca integer) RETURNS boolean
    LANGUAGE sql
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM finca f
    WHERE f.id_finca = p_id_finca
      AND (
        f.id_usuario = p_id_usuario
        OR EXISTS (
          SELECT 1 FROM usuario_finca uf
          WHERE uf.id_finca = p_id_finca AND uf.id_usuario = p_id_usuario
        )
      )
  );
$$;

CREATE PROCEDURE public.sp_eliminar_animal(IN p_id_animal integer, OUT p_eliminado boolean)
    LANGUAGE plpgsql
    AS $$
BEGIN
  DELETE FROM animal WHERE id_animal = p_id_animal;
  p_eliminado := FOUND;
END;
$$;

CREATE PROCEDURE public.sp_eliminar_aplicacion_vacuna(IN p_id_animal_vacunas integer, OUT p_eliminado boolean)
    LANGUAGE plpgsql
    AS $$
BEGIN
  DELETE FROM animal_vacunas WHERE id_animal_vacunas = p_id_animal_vacunas;
  p_eliminado := FOUND;
END;
$$;

CREATE FUNCTION public.trg_fn_actualizar_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.actualizado_en = NOW();
  RETURN NEW;
END;
$$;

CREATE SEQUENCE public.animal_id_animal_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.animal_id_animal_seq OWNED BY public.animal.id_animal;

CREATE SEQUENCE public.animal_vacunas_id_animal_vacunas_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.animal_vacunas_id_animal_vacunas_seq OWNED BY public.animal_vacunas.id_animal_vacunas;

CREATE SEQUENCE public.censo_id_censo_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.censo_id_censo_seq OWNED BY public.censo.id_censo;

CREATE SEQUENCE public.deteccion_id_deteccion_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.deteccion_id_deteccion_seq OWNED BY public.deteccion.id_deteccion;

CREATE SEQUENCE public.finca_id_finca_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.finca_id_finca_seq OWNED BY public.finca.id_finca;

CREATE TABLE public.usuario_finca (
    id_usuario_finca integer NOT NULL,
    id_usuario integer NOT NULL,
    id_finca integer NOT NULL
);

CREATE SEQUENCE public.usuario_finca_id_usuario_finca_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.usuario_finca_id_usuario_finca_seq OWNED BY public.usuario_finca.id_usuario_finca;

CREATE SEQUENCE public.usuario_id_usuario_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.usuario_id_usuario_seq OWNED BY public.usuario.id_usuario;

CREATE SEQUENCE public.vacunas_id_vacunas_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.vacunas_id_vacunas_seq OWNED BY public.vacunas.id_vacunas;

CREATE VIEW public.vista_animales_completa AS
 SELECT a.id_animal,
    a.id_finca,
    a.numero_animal,
    a.imagen_url,
    a.fecha_nacimiento,
    a.peso,
    a.sexo,
    a.estado_reproductivo,
    a.estado_general,
    a.enfermedad,
    a.creado_en,
    a.actualizado_en,
    f.nombre AS nombre_finca,
    f.municipio,
    f.departamento
   FROM (public.animal a
     JOIN public.finca f ON ((f.id_finca = a.id_finca)));

CREATE VIEW public.vista_censo_completo AS
 SELECT c.id_censo,
    c.id_finca,
    c.nota,
    c.fecha_procesamiento,
    c.estado,
    c.tiempo_procesamiento,
    f.nombre AS nombre_finca,
    d.id_deteccion,
    d.cantidad_animales,
    d.peso_estimado
   FROM ((public.censo c
     JOIN public.finca f ON ((f.id_finca = c.id_finca)))
     LEFT JOIN public.deteccion d ON ((d.id_censo = c.id_censo)));

CREATE VIEW public.vista_vacunas_animal AS
 SELECT av.id_animal_vacunas,
    av.id_animal,
    av.fecha_vacunacion,
    v.id_vacunas,
    v.nombre AS nombre_vacuna,
    a.id_finca
   FROM ((public.animal_vacunas av
     JOIN public.vacunas v ON ((v.id_vacunas = av.id_vacunas)))
     JOIN public.animal a ON ((a.id_animal = av.id_animal)));

ALTER TABLE ONLY public.animal ALTER COLUMN id_animal SET DEFAULT nextval('public.animal_id_animal_seq'::regclass);

ALTER TABLE ONLY public.animal_vacunas ALTER COLUMN id_animal_vacunas SET DEFAULT nextval('public.animal_vacunas_id_animal_vacunas_seq'::regclass);

ALTER TABLE ONLY public.censo ALTER COLUMN id_censo SET DEFAULT nextval('public.censo_id_censo_seq'::regclass);

ALTER TABLE ONLY public.deteccion ALTER COLUMN id_deteccion SET DEFAULT nextval('public.deteccion_id_deteccion_seq'::regclass);

ALTER TABLE ONLY public.finca ALTER COLUMN id_finca SET DEFAULT nextval('public.finca_id_finca_seq'::regclass);

ALTER TABLE ONLY public.usuario ALTER COLUMN id_usuario SET DEFAULT nextval('public.usuario_id_usuario_seq'::regclass);

ALTER TABLE ONLY public.usuario_finca ALTER COLUMN id_usuario_finca SET DEFAULT nextval('public.usuario_finca_id_usuario_finca_seq'::regclass);

ALTER TABLE ONLY public.vacunas ALTER COLUMN id_vacunas SET DEFAULT nextval('public.vacunas_id_vacunas_seq'::regclass);

ALTER TABLE ONLY public.animal
    ADD CONSTRAINT animal_pkey PRIMARY KEY (id_animal);

ALTER TABLE ONLY public.animal_vacunas
    ADD CONSTRAINT animal_vacunas_pkey PRIMARY KEY (id_animal_vacunas);

ALTER TABLE ONLY public.censo
    ADD CONSTRAINT censo_pkey PRIMARY KEY (id_censo);

ALTER TABLE ONLY public.deteccion
    ADD CONSTRAINT deteccion_pkey PRIMARY KEY (id_deteccion);

ALTER TABLE ONLY public.finca
    ADD CONSTRAINT finca_pkey PRIMARY KEY (id_finca);

ALTER TABLE ONLY public.animal
    ADD CONSTRAINT uq_animal_finca_numero UNIQUE (id_finca, numero_animal);

ALTER TABLE ONLY public.usuario_finca
    ADD CONSTRAINT uq_usuario_finca UNIQUE (id_usuario, id_finca);

ALTER TABLE ONLY public.vacunas
    ADD CONSTRAINT uq_vacunas_nombre UNIQUE (nombre);

ALTER TABLE ONLY public.usuario
    ADD CONSTRAINT usuario_correo_key UNIQUE (correo);

ALTER TABLE ONLY public.usuario_finca
    ADD CONSTRAINT usuario_finca_pkey PRIMARY KEY (id_usuario_finca);

ALTER TABLE ONLY public.usuario
    ADD CONSTRAINT usuario_pkey PRIMARY KEY (id_usuario);

ALTER TABLE ONLY public.vacunas
    ADD CONSTRAINT vacunas_pkey PRIMARY KEY (id_vacunas);

CREATE INDEX idx_animal_finca ON public.animal USING btree (id_finca);

CREATE INDEX idx_animal_vacunas_animal ON public.animal_vacunas USING btree (id_animal);

CREATE INDEX idx_animal_vacunas_vacuna ON public.animal_vacunas USING btree (id_vacunas);

CREATE INDEX idx_censo_finca ON public.censo USING btree (id_finca);

CREATE INDEX idx_deteccion_censo ON public.deteccion USING btree (id_censo);

CREATE INDEX idx_finca_usuario ON public.finca USING btree (id_usuario);

CREATE INDEX idx_usuario_finca_finca ON public.usuario_finca USING btree (id_finca);

CREATE INDEX idx_usuario_finca_usuario ON public.usuario_finca USING btree (id_usuario);

CREATE TRIGGER trg_animal_actualizado BEFORE UPDATE ON public.animal FOR EACH ROW EXECUTE FUNCTION public.trg_fn_actualizar_timestamp();

CREATE TRIGGER trg_finca_actualizado BEFORE UPDATE ON public.finca FOR EACH ROW EXECUTE FUNCTION public.trg_fn_actualizar_timestamp();

ALTER TABLE ONLY public.animal
    ADD CONSTRAINT fk_animal_finca FOREIGN KEY (id_finca) REFERENCES public.finca(id_finca) ON DELETE CASCADE;

ALTER TABLE ONLY public.animal_vacunas
    ADD CONSTRAINT fk_animal_vacunas_animal FOREIGN KEY (id_animal) REFERENCES public.animal(id_animal) ON DELETE CASCADE;

ALTER TABLE ONLY public.animal_vacunas
    ADD CONSTRAINT fk_animal_vacunas_vacuna FOREIGN KEY (id_vacunas) REFERENCES public.vacunas(id_vacunas) ON DELETE CASCADE;

ALTER TABLE ONLY public.censo
    ADD CONSTRAINT fk_censo_finca FOREIGN KEY (id_finca) REFERENCES public.finca(id_finca) ON DELETE CASCADE;

ALTER TABLE ONLY public.deteccion
    ADD CONSTRAINT fk_deteccion_censo FOREIGN KEY (id_censo) REFERENCES public.censo(id_censo) ON DELETE CASCADE;

ALTER TABLE ONLY public.finca
    ADD CONSTRAINT fk_finca_usuario FOREIGN KEY (id_usuario) REFERENCES public.usuario(id_usuario);

ALTER TABLE ONLY public.usuario_finca
    ADD CONSTRAINT fk_usuario_finca_finca FOREIGN KEY (id_finca) REFERENCES public.finca(id_finca) ON DELETE CASCADE;

ALTER TABLE ONLY public.usuario_finca
    ADD CONSTRAINT fk_usuario_finca_usuario FOREIGN KEY (id_usuario) REFERENCES public.usuario(id_usuario) ON DELETE CASCADE;
