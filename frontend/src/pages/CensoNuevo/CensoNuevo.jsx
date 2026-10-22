import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import Icon from "../../components/ui/Icon.jsx";
import StatusBadge from "../../components/ui/StatusBadge.jsx";
import { AlertMessage, ButtonLink, LoadingState, SelectField } from "../../components/ui/SharedUI.jsx";
import { useDatosCuenta } from "../../hooks/useDatosCuenta.js";
import { crearCenso, idDeCenso } from "../../services/censoService.js";
import { fechaDeCenso, fraseRegistro, signo } from "../../utils/censos.js";
import { extraerError } from "../../utils/errores.js";
import { formatFecha, formatFechaLarga, formatTamano, hoyISO } from "../../utils/format.js";

const CON_BACKEND = import.meta.env.VITE_USE_BACKEND === "true";
// El backend acepta hasta 20 MB (JPG, PNG, WEBP o MP4)
const MAX_MB = CON_BACKEND ? 20 : 200;
const TIPOS = ["video/mp4", "image/jpeg", "image/png", "image/webp"];

function mensajeDeError(err) {
  if (err?.name === "AbortError" || err?.name === "CanceledError" || err?.code === "ERR_CANCELED") return "";
  if (err?.code === "ECONNABORTED") {
    return "El análisis tardó demasiado. Prueba con un video más corto o vuelve a intentarlo en un momento.";
  }
  if (!err?.response) return err?.message || "No se pudo completar el análisis del video.";
  switch (err.response.status) {
    case 404: return "La finca no existe o no te pertenece.";
    case 413: return `El archivo supera los ${MAX_MB} MB que acepta el servidor.`;
    case 502:
    case 503: return "El servicio de inteligencia artificial no respondió. Inténtalo de nuevo en unos minutos.";
    default: return extraerError(err);
  }
}

export default function Censo() {
  const [params] = useSearchParams();
  const location = useLocation();
  const { cargando, error: errorCarga, fincas, censos, recargar } = useDatosCuenta();

  const [idFinca, setIdFinca] = useState(params.get("finca") ?? "");
  const [fecha, setFecha] = useState(hoyISO());
  const [nota, setNota] = useState("");
  const [archivo, setArchivo] = useState(null);
  const [sobre, setSobre] = useState(false);
  const [fase, setFase] = useState("inicial"); // inicial | subiendo | analizando
  const [progreso, setProgreso] = useState(0);
  const [error, setError] = useState("");
  const [resultado, setResultado] = useState(null);
  const [filtro, setFiltro] = useState("");
  const [resaltado, setResaltado] = useState(null);
  const controlador = useRef(null);
  const inputArchivo = useRef(null);
  const historialRef = useRef(null);
  const resultadoRef = useRef(null);

  const fincaElegida = idFinca || (fincas[0] ? String(fincas[0].id_finca) : "");
  const ocupado = fase !== "inicial";

  // "Ver historial" desde Inicio llega con #historial
  useEffect(() => {
    if (!cargando && location.hash === "#historial") {
      historialRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [cargando, location.hash]);

  useEffect(() => {
    if (resultado) resultadoRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [resultado]);

  const elegir = (f) => {
    setError("");
    if (!f) return;
    if (CON_BACKEND && !TIPOS.includes(f.type)) {
      setError("Formato no permitido: sube un video MP4 o una imagen JPG, PNG o WEBP.");
      return;
    }
    if (!f.type.startsWith("video/") && !f.type.startsWith("image/")) {
      setError("El archivo debe ser un video o una imagen.");
      return;
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      setError(`El archivo supera los ${MAX_MB} MB. Recorta el vuelo o expórtalo con menor calidad.`);
      return;
    }
    setArchivo(f);
  };

  const enviar = async (e) => {
    e.preventDefault();
    setError("");
    if (!fincaElegida) return setError("Elige la finca donde volaste el dron. Si no tienes una, regístrala en Fincas.");
    if (!fecha) return setError("Indica la fecha del vuelo.");
    if (fecha > hoyISO()) return setError("La fecha del vuelo no puede ser futura.");
    if (!archivo) return setError("Falta el video. Arrástralo al recuadro o haz click para elegirlo.");

    controlador.current = new AbortController();
    setResultado(null);
    setProgreso(0);
    setFase("subiendo");
    try {
      const data = await crearCenso({
        idFinca: fincaElegida,
        nota,
        fechaVuelo: fecha,
        archivo,
        signal: controlador.current.signal,
        onProgress: (p) => {
          setProgreso(p);
          if (p >= 100) setFase("analizando");
        },
      });
      const finca = fincas.find((f) => String(f.id_finca) === String(fincaElegida));
      setResultado({ data, finca, fecha, archivo: archivo.name });
      setResaltado(idDeCenso(data));
      setArchivo(null);
      setNota("");
      if (inputArchivo.current) inputArchivo.current.value = "";
      recargar();
    } catch (err) {
      const mensaje = mensajeDeError(err);
      setError(mensaje || "Cancelaste la subida. El video sigue seleccionado por si quieres intentarlo de nuevo.");
    } finally {
      setFase("inicial");
    }
  };

  const filas = censos.filter((c) => !filtro || String(c.id_finca) === filtro);

  return (
    <>
      <h1 className="titulo-vista">Censo</h1>
      <p className="bajada">Sube el video de tu vuelo y consulta los censos anteriores.</p>

      <form className="panel panel-solido nuevo" onSubmit={enviar} noValidate aria-busy={ocupado}>
        <h2>Nuevo censo</h2>
        {!cargando && fincas.length === 0 && !errorCarga && (
          <AlertMessage type="warning">
            Primero registra una finca para poder guardar censos. <Link className="enlace" to="/fincas/nueva">Registrar finca</Link>
          </AlertMessage>
        )}
        <div className="nuevo-grid">
          <div>
            <div className="campo">
              <label htmlFor="c-finca">Finca</label>
              <SelectField id="c-finca" value={fincaElegida} disabled={ocupado || cargando || !fincas.length}
                onChange={(e) => setIdFinca(e.target.value)}>
                {cargando && <option value="">Cargando...</option>}
                {!cargando && !fincas.length && <option value="">Sin fincas</option>}
                {fincas.map((f) => <option key={f.id_finca} value={f.id_finca}>{f.nombre}</option>)}
              </SelectField>
            </div>
            <div className="campo">
              <label htmlFor="c-fecha">Fecha del vuelo</label>
              <input id="c-fecha" type="date" className="ctl" value={fecha} max={hoyISO()} disabled={ocupado}
                onChange={(e) => setFecha(e.target.value)} />
            </div>
            <div className="campo">
              <label htmlFor="c-nota">Nota <span className="tenue">(opcional)</span></label>
              <textarea id="c-nota" className="ctl" maxLength={300} disabled={ocupado} value={nota}
                placeholder="Ej.: potrero norte, vuelo de la mañana" onChange={(e) => setNota(e.target.value)} />
            </div>
          </div>
          <div>
            <label
              className={`zona ${sobre ? "sobre" : ""} ${archivo ? "con-archivo" : ""}`}
              htmlFor="c-video"
              tabIndex={0}
              style={ocupado ? { pointerEvents: "none" } : undefined}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") { e.preventDefault(); inputArchivo.current?.click(); }
              }}
              onDragEnter={(e) => { e.preventDefault(); setSobre(true); }}
              onDragOver={(e) => { e.preventDefault(); setSobre(true); }}
              onDragLeave={(e) => { e.preventDefault(); setSobre(false); }}
              onDrop={(e) => { e.preventDefault(); setSobre(false); elegir(e.dataTransfer.files?.[0]); }}
            >
              <span className="zona-ico"><Icon name="arrowUp" strokeWidth={2.4} /></span>
              {archivo ? (
                <>
                  <strong><span className="archivo"><Icon name="archivo" />{archivo.name}</span></strong>
                  <em>{formatTamano(archivo.size)} · haz click para cambiarlo</em>
                </>
              ) : (
                <>
                  <strong>Arrastra el video aquí</strong>
                  <em>o haz click para elegirlo. Formato MP4 o foto aérea (máx. {MAX_MB} MB)</em>
                </>
              )}
            </label>
            <input id="c-video" ref={inputArchivo} type="file" hidden disabled={ocupado}
              accept={CON_BACKEND ? TIPOS.join(",") : "video/*,image/*"}
              onChange={(e) => { elegir(e.target.files?.[0]); e.target.value = ""; }} />
            <div className="zona-acciones">
              {ocupado && (
                <button type="button" className="btn btn-oscuro btn-sm" onClick={() => controlador.current?.abort()}>
                  Cancelar subida
                </button>
              )}
              <button type="submit" className="btn btn-claro btn-sm" disabled={ocupado || cargando}>Iniciar conteo</button>
            </div>
          </div>
        </div>

        {error && <AlertMessage>{error}</AlertMessage>}
        {ocupado && (
          <div className="progreso ver" aria-live="polite">
            <div className={`barra ${fase === "analizando" ? "analiza" : ""}`}>
              <i style={fase === "subiendo" ? { transform: `scaleX(${progreso / 100})` } : undefined} />
            </div>
            <p>
              {fase === "subiendo"
                ? `Subiendo video… ${progreso}%`
                : "Video subido. Detectando bovinos con la IA; puede tardar uno o dos minutos…"}
            </p>
          </div>
        )}
      </form>

      {resultado && (
        <section className="panel resultado ver" ref={resultadoRef} aria-live="polite">
          <Resultado {...resultado} onCerrar={() => setResultado(null)} />
        </section>
      )}

      <div className="cabecera" id="historial" ref={historialRef}>
        <h2 className="titulo-vista">Historial</h2>
        <div className="filtro">
          <label htmlFor="h-finca">Mostrar finca</label>
          <SelectField id="h-finca" value={filtro} onChange={(e) => { setFiltro(e.target.value); setResaltado(null); }}>
            <option value="">Todas las fincas</option>
            {fincas.map((f) => <option key={f.id_finca} value={f.id_finca}>{f.nombre}</option>)}
          </SelectField>
        </div>
      </div>
      {errorCarga && <AlertMessage>{errorCarga}</AlertMessage>}
      {cargando ? <LoadingState>Cargando censos...</LoadingState> : (
        <div className="tabla-caja">
          <table>
            <thead>
              <tr>
                <th>Fecha del vuelo</th><th>Finca</th><th>Video</th>
                <th className="num">Bovinos contados</th><th>Estado</th><th><span className="sr">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              {filas.length ? filas.map((c) => (
                <tr key={c.id_censo} className={String(c.id_censo) === String(resaltado) ? "resaltada" : undefined}>
                  <td>{formatFecha(fechaDeCenso(c))}</td>
                  <td>{c.nombre_finca}</td>
                  <td>{c.nombre_archivo || <span className="tenue">—</span>}{c.nota && <small>{c.nota}</small>}</td>
                  <td className="num">{c.cantidad_animales ?? "—"}</td>
                  <td><StatusBadge estado={c.estado} /></td>
                  <td><Link className="btn-tabla" to={`/fincas/${c.id_finca}/censos/${c.id_censo}`}>Ver resultado</Link></td>
                </tr>
              )) : (
                <tr><td colSpan={6} className="vacio">
                  {filtro ? "Esta finca todavía no tiene censos. Sube su primer video arriba." : "Todavía no hay censos. Sube tu primer video arriba."}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function Resultado({ data, finca, fecha, archivo, onCerrar }) {
  const det = data?.deteccion || data?.censo || {};
  const id = idDeCenso(data);
  const detectados = det.cantidad_animales ?? det.count ?? null;
  const peso = det.peso_estimado ?? det.peso_estimado_promedio ?? null;
  const total = detectados != null && peso != null ? Math.round(detectados * peso) : null;
  const diferencia = detectados != null && finca ? detectados - finca.registrados : null;

  return (
    <>
      <div className="resultado-top">
        <div>
          <h3>{id ? `Censo n.º ${id} registrado` : "Censo registrado"}</h3>
          <p className="meta">{finca?.nombre} · vuelo del {formatFechaLarga(fecha)} · {archivo}</p>
        </div>
        <div className="acciones" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {id && finca && <ButtonLink to={`/fincas/${finca.id_finca}/censos/${id}`} size="small">Ver ficha del censo</ButtonLink>}
          <button className="btn btn-oscuro btn-sm" type="button" onClick={onCerrar}>Cerrar</button>
        </div>
      </div>
      <div className="resultado-datos">
        <dl className="dato"><dt>Detectados en el video</dt><dd>{detectados ?? "—"}</dd></dl>
        <dl className="dato"><dt>Registrados en la finca</dt><dd>{finca?.registrados ?? "—"}</dd></dl>
        <dl className="dato"><dt>Diferencia</dt><dd className={diferencia === 0 ? "cero" : "pos"}>{signo(diferencia)}</dd></dl>
        <dl className="dato"><dt>Peso estimado por res</dt><dd>{peso ?? "—"}<small>kg</small></dd></dl>
      </div>
      <p className="frase">
        {fraseRegistro(diferencia)}
        {total != null && <> Peso total estimado: <b>{total.toLocaleString("es-CO")} kg</b>.</>}
      </p>
    </>
  );
}
