import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { obtenerCenso, registrarConteoManual, listarCensosDeFinca } from "../../services/censoService.js";
import { fechaHora } from "../../utils/censos.js";
import { extraerError } from "../../utils/errores.js";
import StatusBadge from "../../components/ui/StatusBadge.jsx";
import { AlertMessage, LoadingState } from "../../components/ui/SharedUI.jsx";

export default function CensoDetalle() {
  const { id, idCenso } = useParams(); // id = finca
  const [resultado, setResultado] = useState({ idCenso: null, censo: null, error: "" });
  const cargando = String(resultado.idCenso) !== String(idCenso);
  const censo = cargando ? null : resultado.censo;
  const error = cargando ? "" : resultado.error;

  const [valor, setValor] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState("");
  const [ok, setOk] = useState("");

  const cargar = useCallback(async () => {
    const [detalle, lista] = await Promise.all([
      obtenerCenso(idCenso),
      listarCensosDeFinca(id),
    ]);
    if (String(detalle.id_finca) !== String(id)) {
      const e = new Error("no-pertenece");
      e.noEncontrado = true;
      throw e;
    }
    const fila = lista.find((c) => String(c.id_censo) === String(idCenso));
    return { ...detalle, conteo_manual: detalle.conteo_manual ?? fila?.conteo_manual ?? null };
  }, [id, idCenso]);

  useEffect(() => {
    let vigente = true;
    cargar()
      .then((c) => {
        if (!vigente) return;
        setResultado({ idCenso, censo: c, error: "" });
        setValor(c.conteo_manual != null ? String(c.conteo_manual) : "");
      })
      .catch((err) => {
        if (!vigente) return;
        setResultado({
          idCenso,
          censo: null,
          error: err.noEncontrado || err.response?.status === 404
            ? "Censo no encontrado."
            : extraerError(err),
        });
      });
    return () => { vigente = false; };
  }, [cargar, idCenso]);

  const guardar = async (e) => {
    e.preventDefault();
    setErrorForm("");
    setOk("");

    const texto = String(valor).trim();
    if (texto === "") return setErrorForm("Ingresa el número de animales contados.");
    const n = Number(texto);
    if (!Number.isInteger(n) || n < 0) {
      return setErrorForm("Debe ser un número entero, 0 o mayor.");
    }

    setGuardando(true);
    try {
      await registrarConteoManual(idCenso, n);
      const actualizado = await cargar();
      setResultado({ idCenso, censo: actualizado, error: "" });
      setValor(String(actualizado.conteo_manual ?? n));
      setOk("Conteo manual guardado.");
    } catch (err) {
      setErrorForm(extraerError(err));
    } finally {
      setGuardando(false);
    }
  };

  const ia = censo?.cantidad_animales;
  const manual = censo?.conteo_manual;
  const diferencia = manual != null && ia != null ? ia - manual : null;
  const pesoPromedio = censo?.peso_estimado;
  const pesoTotal =
    censo?.peso_total_estimado ??
    (ia != null && pesoPromedio != null ? Math.round(ia * pesoPromedio * 10) / 10 : null);

  let frase = "";
  if (diferencia === 0) frase = "El conteo de la IA coincide con el conteo manual.";
  else if (diferencia > 0) frase = `La IA contó ${diferencia} animal${diferencia === 1 ? "" : "es"} más que el conteo manual.`;
  else if (diferencia < 0) frase = `La IA contó ${Math.abs(diferencia)} animal${Math.abs(diferencia) === 1 ? "" : "es"} menos que el conteo manual.`;

  return (
    <div className="bc-census-record">
      <Link to={`/fincas/${id}`} className="bc-back">← Volver a la finca</Link>

      {cargando && <LoadingState>Cargando censo...</LoadingState>}
      {error && <AlertMessage className="mt-3">{error}</AlertMessage>}

      {censo && (
        <>
          <div className="bc-page-head mt-3">
            <div>
              <span className="bc-module-eyebrow">Detalle del censo</span>
              <h1>Censo n.º {censo.id_censo}</h1>
              <StatusBadge estado={censo.estado} />
              <span className="ms-2" style={{ color: "var(--bc-muted)", fontSize: ".9rem" }}>
                {censo.nombre_finca} · {fechaHora(censo.fecha_procesamiento)}
              </span>
              <p className="bc-page-description">Resultados del conteo y seguimiento de este registro.</p>
            </div>
          </div>

          {/* Resumen */}
          <section className="bc-card bc-census-count" aria-labelledby="censo-conteo-title">
            <div className="bc-census-count__main">
              <span className="bc-module-eyebrow">Resultado disponible</span>
              <h2 id="censo-conteo-title">Bovinos detectados en este censo</h2>
              <strong>
                {ia ?? "—"}{ia != null && <small> animales</small>}
                {pesoTotal != null && (
                  <span className="ms-3" style={{ fontSize: "0.75em", opacity: 0.9 }}>
                    · {pesoTotal.toLocaleString("es-CO")} <small>kg total</small>
                  </span>
                )}
              </strong>
              <p>
                {censo.observaciones ||
                  "Este es un conteo agregado del análisis; el censo no vincula bovinos individuales."}
              </p>
            </div>
            <Link to={`/fincas/${id}`} className="bc-btn bc-btn-outline">Ver finca y bovinos registrados</Link>
          </section>

          <div className="row g-3 mb-4">
            <div className="col-6 col-lg-3">
              <div className="bc-stat">
                <div className="bc-stat-label">Conteo de la IA</div>
                <div className="bc-stat-value bc-stat-green">{ia ?? "—"} <small>animales</small></div>
              </div>
            </div>
            <div className="col-6 col-lg-3">
              <div className="bc-stat">
                <div className="bc-stat-label">Peso estimado (promedio)</div>
                <div className="bc-stat-value">
                  {pesoPromedio ?? "—"} {pesoPromedio != null && <small>kg</small>}
                </div>
              </div>
            </div>
            <div className="col-6 col-lg-3">
              <div className="bc-stat">
                <div className="bc-stat-label">Peso total estimado</div>
                <div className="bc-stat-value bc-stat-green">
                  {pesoTotal != null ? pesoTotal.toLocaleString("es-CO") : "—"} {pesoTotal != null && <small>kg</small>}
                </div>
              </div>
            </div>
            <div className="col-6 col-lg-3">
              <div className="bc-stat">
                <div className="bc-stat-label">Conteo manual</div>
                <div className="bc-stat-value">
                  {manual ?? "—"} {manual != null && <small>animales</small>}
                </div>
                <div className="bc-stat-hint">
                  {diferencia == null
                    ? "Sin registrar"
                    : `Diferencia: ${diferencia > 0 ? `+${diferencia}` : diferencia}`}
                </div>
              </div>
            </div>
          </div>

          {/* Conteo manual */}
          <form className="bc-card bc-form-narrow mb-4" onSubmit={guardar} noValidate>
            <h2 className="bc-census-form-title">Conteo manual</h2>
            <p className="bc-sub" style={{ color: "var(--bc-muted)", fontSize: ".9rem" }}>
              Registra cuántos animales contaste tú en el mismo recorrido, para compararlo con el de la IA.
            </p>

            {errorForm && <AlertMessage>{errorForm}</AlertMessage>}
            {ok && <AlertMessage type="success">{ok}</AlertMessage>}
            {frase && <p style={{ color: "var(--bc-cream)" }}>{frase}</p>}

            <div className="bc-inline-form">
              <div className="bc-field">
                <label htmlFor="conteo">Animales contados</label>
                <input id="conteo" type="number" min="0" step="1" className="bc-input"
                       value={valor} onChange={(e) => setValor(e.target.value)} />
              </div>
              <button type="submit" className="bc-btn bc-btn-primary" disabled={guardando}>
                {guardando ? "Guardando..." : manual != null ? "Actualizar" : "Guardar"}
              </button>
            </div>
          </form>

          {/* Datos */}
          <div className="bc-card">
            <div className="bc-census-data-heading">
              <span className="bc-module-eyebrow">Datos registrados</span>
              <h2>Información del censo</h2>
            </div>
            <dl className="bc-dl">
              <dt>Finca</dt>
              <dd><Link to={`/fincas/${id}`} className="bc-rowlink">{censo.nombre_finca}</Link></dd>
              <dt>Fecha</dt><dd>{fechaHora(censo.fecha_procesamiento)}</dd>
              <dt>Estado</dt><dd>{censo.estado ?? "—"}</dd>
              <dt>Tiempo de análisis</dt>
              <dd>{censo.tiempo_procesamiento === 0 ? "menos de 1 s" : `${censo.tiempo_procesamiento} s`}</dd>
              <dt>Nota</dt><dd>{censo.nota || "—"}</dd>
            </dl>
          </div>
        </>
      )}
    </div>
  );
}
