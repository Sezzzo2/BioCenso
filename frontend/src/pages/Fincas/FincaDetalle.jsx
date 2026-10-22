import { useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { obtenerFinca } from "../../services/fincaService.js";
import { listarCensosDeFinca } from "../../services/censoService.js";
import { listarAnimalesDeFinca } from "../../services/animalesService.js";
import { extraerError } from "../../utils/errores.js";
import { esCompletado, fechaDeCenso, fraseRegistro, ordenarCensos, signo } from "../../utils/censos.js";
import { formatFecha } from "../../utils/format.js";
import Icon from "../../components/ui/Icon.jsx";
import { AlertMessage, ButtonLink, LoadingState, PageHeader, StatCard } from "../../components/ui/SharedUI.jsx";
import CensosDeFinca from "../../components/censos/CensosDeFinca.jsx";
import AnimalesDeFinca from "../../components/animales/AnimalesDeFinca.jsx";

export default function FincaDetalle() {
  const { id } = useParams();
  const location = useLocation();
  const [datos, setDatos] = useState({ id: null, finca: null, censos: [], animales: [], error: "" });
  const cargando = String(datos.id) !== String(id);

  useEffect(() => {
    let vigente = true;
    Promise.all([obtenerFinca(id), listarCensosDeFinca(id), listarAnimalesDeFinca(id)])
      .then(([finca, censos, animales]) => {
        if (vigente) setDatos({ id, finca, censos: ordenarCensos(censos), animales, error: "" });
      })
      .catch((err) => {
        if (vigente) {
          setDatos({
            id, finca: null, censos: [], animales: [],
            error: err.response?.status === 404 ? "Finca no encontrada." : extraerError(err),
          });
        }
      });
    return () => { vigente = false; };
  }, [id]);

  if (cargando) return <LoadingState>Cargando finca...</LoadingState>;
  if (datos.error) {
    return (
      <div className="panel panel-solido vacio-bloque" style={{ marginTop: 40 }}>
        <h3>{datos.error}</h3>
        <p>Puede que se haya eliminado o que no pertenezca a tu cuenta.</p>
        <ButtonLink to="/fincas">Volver a mis fincas</ButtonLink>
      </div>
    );
  }

  const { finca, censos, animales } = datos;
  const ultimo = censos.find(esCompletado);
  const conteo = ultimo?.cantidad_animales ?? null;
  const diferencia = conteo != null ? conteo - animales.length : null;
  const machos = animales.filter((a) => String(a.sexo).toLowerCase() === "macho").length;
  const lugar = [finca.municipio, finca.departamento].filter(Boolean).join(", ");

  return (
    <>
      <PageHeader
        migas={[{ texto: "Fincas", ruta: "/fincas" }, { texto: finca.nombre }]}
        title={finca.nombre}
        description={[lugar, finca.direccion].filter(Boolean).join(" · ")}
        action={<>
          <ButtonLink to={`/fincas/${id}/dashboard`} variant="outline"><Icon name="barras" />Ver panel</ButtonLink>
          <ButtonLink to={`/censos?finca=${id}`}>Nuevo censo</ButtonLink>
        </>}
      />

      {location.state?.mensaje && <AlertMessage type="success">{location.state.mensaje}</AlertMessage>}

      <section className="panel panel-pad bloque" aria-label="Resumen de la finca">
        <div className="cifras">
          <StatCard label="Registrados en la finca" value={animales.length}
            description={`${machos} machos · ${animales.length - machos} hembras`} />
          <StatCard label="Último conteo del dron" value={conteo ?? "—"}
            description={ultimo ? `Vuelo del ${formatFecha(fechaDeCenso(ultimo))}` : "Sin censos todavía"} />
          <StatCard label="Diferencia con el registro" value={signo(diferencia)}
            description={ultimo ? "Detectados − registrados" : null} />
          <StatCard label="Censos realizados" value={censos.length} />
        </div>
        {diferencia != null && <p className="frase">{fraseRegistro(diferencia)}</p>}
      </section>

      <CensosDeFinca idFinca={id} censos={censos} />
      <AnimalesDeFinca idFinca={id} animales={animales} />
    </>
  );
}
