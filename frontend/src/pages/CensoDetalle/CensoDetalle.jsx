import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { obtenerCenso, registrarConteoManual, listarCensosDeFinca } from "../../services/censoService.js";
import { obtenerResumen } from "../../services/dashboardService.js";
import { fechaDeCenso, fechaHora, fraseRegistro, signo } from "../../utils/censos.js";
import { formatFechaLarga } from "../../utils/format.js";
import { extraerError } from "../../utils/errores.js";
import StatusBadge from "../../components/ui/StatusBadge.jsx";
import { AlertMessage, ButtonLink, LoadingState, PageHeader, StatCard } from "../../components/ui/SharedUI.jsx";

function fraseManual(diferencia) {
  if (diferencia == null) return "";
  if (diferencia === 0) return "El conteo de la IA coincide con el conteo manual.";
  const n = Math.abs(diferencia);
  return `La IA contó ${n} animal${n === 1 ? "" : "es"} ${diferencia > 0 ? "más" : "menos"} que el conteo manual.`;
}

export default function CensoDetalle() {
  const { id, idCenso } = useParams(); // id = finca
  const [resultado, setResultado] = useState({ idCenso: null, censo: null, registrados: null, error: "" });
  const cargando = String(resultado.idCenso) !== String(idCenso);
  const censo = cargando ? null : resultado.censo;
  const error = cargando ? "" : resultado.error;

  const [valor, setValor] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState("");
  const [ok, setOk] = useState("");

  const cargar = useCallback(async () => {
    const [detalle, lista, resumen] = await Promise.all([
      obtenerCenso(idCenso),
      listarCensosDeFinca(id),
      obtenerResumen(id).catch(() => null),
    ]);
    if (String(detalle.id_finca) !== String(id)) {
      const e = new Error("no-pertenece");
      e.noEncontrado = true;
      throw e;
    }
    const fila = lista.find((c) => String(c.id_censo) === String(idCenso));
    return {
      censo: { ...fila, ...detalle, conteo_manual: detalle.conteo_manual ?? fila?.conteo_manual ?? null },
      registrados: resumen?.total_bovinos_registrados ?? null,
    };
  }, [id, idCenso]);

  useEffect(() => {
    let vigente = true;
    cargar()
      .then(({ censo: c, registrados }) => {
        if (!vigente) return;
        setResultado({ idCenso, censo: c, registrados, error: "" });
        setValor(c.conteo_manual != null ? String(c.conteo_manual) : "");
      })
      .catch((err) => {
        if (!vigente) return;
        setResultado({
          idCenso, censo: null, registrados: null,
          error: err.noEncontrado || err.response?.status === 404 ? "Censo no encontrado." : extraerError(err),
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
    if (!Number.isInteger(n) || n < 0) return setErrorForm("Debe ser un número entero, 0 o mayor.");

    setGuardando(true);
    try {
      await registrarConteoManual(idCenso, n);
      const actualizado = await cargar();
      setResultado({ idCenso, ...actualizado, error: "" });
      setValor(String(actualizado.censo.conteo_manual ?? n));
      setOk("Conteo manual guardado.");
    } catch (err) {
      setErrorForm(extraerError(err));
    } finally {
      setGuardando(false);
    }
  };

  const migas = [
    { texto: "Censo", ruta: "/censos" },
    { texto: censo?.nombre_finca || "Finca", ruta: `/fincas/${id}` },
    { texto: `Censo n.º ${idCenso}` },
  ];

  if (cargando) return <LoadingState>Cargando censo...</LoadingState>;
  if (error) {
    return (
      <div className="panel panel-solido vacio-bloque" style={{ marginTop: 40 }}>
        <h3>{error}</h3>
        <p>Puede que se haya eliminado o que no pertenezca a tu cuenta.</p>
        <ButtonLink to="/censos">Volver al historial</ButtonLink>
      </div>
    );
  }

  const completado = /complet/i.test(censo.estado ?? "");
  const ia = censo.cantidad_animales;
  const manual = censo.conteo_manual;
  const registrados = resultado.registrados;
  const difManual = manual != null && ia != null ? ia - manual : null;
  const difRegistro = ia != null && registrados != null ? ia - registrados : null;
  const peso = censo.peso_estimado;
  const pesoTotal = censo.peso_total_estimado ?? (ia != null && peso != null ? Math.round(ia * peso) : null);
  const fecha = fechaDeCenso(censo);

  return (
    <>
      <PageHeader
        migas={migas}
        title={`Censo n.º ${censo.id_censo}`}
        description={<>{censo.nombre_finca} · vuelo del {formatFechaLarga(fecha)} &nbsp;<StatusBadge estado={censo.estado} /></>}
        action={<>
          <ButtonLink to={`/fincas/${id}`} variant="outline">Ver finca y bovinos</ButtonLink>
          <ButtonLink to={`/fincas/${id}/dashboard`} variant="outline">Panel de la finca</ButtonLink>
        </>}
      />

      {!completado ? (
        <div className="panel panel-solido panel-pad bloque">
          <h2>{/proces/i.test(censo.estado ?? "") ? "Este censo se está procesando" : "No se pudo procesar este video"}</h2>
          <p className="sub">
            El servicio de IA no devolvió un resultado. Vuelve a subir el video desde Censo; si el archivo
            está dañado, expórtalo de nuevo desde el dron.
          </p>
          <ButtonLink to={`/censos?finca=${id}`} style={{ marginTop: 16 }}>Subir de nuevo</ButtonLink>
        </div>
      ) : (
        <>
          <section className="panel panel-pad bloque" aria-label="Resultados del conteo">
            <div className="cifras">
              <StatCard label="Conteo de la IA" value={ia ?? "—"} unit="animales"
                description={registrados != null ? `Registrados en la finca: ${registrados} (${signo(difRegistro)})` : null} />
              <StatCard label="Peso estimado por res" value={peso ?? "—"} unit="kg" />
              <StatCard label="Peso total estimado" value={pesoTotal != null ? pesoTotal.toLocaleString("es-CO") : "—"} unit="kg" />
              <StatCard label="Conteo manual" value={manual ?? "—"} unit={manual != null ? "animales" : undefined}
                description={difManual == null ? "Sin registrar" : `Diferencia IA − manual: ${signo(difManual)}`} />
            </div>
            {difRegistro != null && <p className="frase">{fraseRegistro(difRegistro)}</p>}
          </section>

          <form className="panel panel-solido panel-pad bloque" onSubmit={guardar} noValidate>
            <h2>Conteo manual</h2>
            <p className="sub">Registra cuántos animales contaste tú en el mismo recorrido, para compararlo con el de la IA.</p>
            {difManual != null && <p className="frase">{fraseManual(difManual)}</p>}
            <div className="form-linea linea-2">
              <div className="campo">
                <label htmlFor="conteo">Animales contados</label>
                <input id="conteo" type="number" min="0" step="1" inputMode="numeric" className="ctl"
                  value={valor} onChange={(e) => setValor(e.target.value)} aria-invalid={Boolean(errorForm)} />
              </div>
              <button type="submit" className="btn btn-claro" disabled={guardando}>
                {guardando ? "Guardando..." : manual != null ? "Actualizar" : "Guardar"}
              </button>
            </div>
            {errorForm && <AlertMessage>{errorForm}</AlertMessage>}
            {ok && <AlertMessage type="success">{ok}</AlertMessage>}
          </form>
        </>
      )}

      <section className="panel panel-solido panel-pad bloque">
        <h2>Información del censo</h2>
        <dl className="dl" style={{ marginTop: 16 }}>
          <dt>Finca</dt><dd><Link className="fila-link" to={`/fincas/${id}`}>{censo.nombre_finca}</Link></dd>
          <dt>Fecha del vuelo</dt><dd>{censo.fecha_vuelo ? formatFechaLarga(censo.fecha_vuelo) : "Sin registrar"}</dd>
          <dt>Procesado</dt><dd>{fechaHora(censo.fecha_procesamiento)}</dd>
          <dt>Archivo</dt><dd>{censo.nombre_archivo || "—"}</dd>
          <dt>Estado</dt><dd><StatusBadge estado={censo.estado} /></dd>
          <dt>Tiempo de análisis</dt>
          <dd>{censo.tiempo_procesamiento == null ? "—" : Number(censo.tiempo_procesamiento) < 1 ? "menos de 1 s" : `${Number(censo.tiempo_procesamiento).toFixed(1)} s`}</dd>
          <dt>Nota</dt><dd>{censo.nota || "—"}</dd>
        </dl>
      </section>
    </>
  );
}
