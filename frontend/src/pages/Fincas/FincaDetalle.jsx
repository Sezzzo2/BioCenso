
import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { obtenerFinca } from "../../services/fincaService.js";
import { extraerError } from "../../utils/errores.js";
import AnimalesDeFinca from "../../components/animales/AnimalesDeFinca.jsx";
import CensosDeFinca from "../../components/censos/CensosDeFinca.jsx";
import "../../components/animales/animales.css";

export default function FincaDetalle() {
  const { id } = useParams();
  const location = useLocation();

  const [resultado, setResultado] = useState({
    id: null,
    finca: null,
    error: "",
  });

  const cargando = String(resultado.id) !== String(id);
  const finca = cargando ? null : resultado.finca;
  const error = cargando ? "" : resultado.error;

  useEffect(() => {
    let vigente = true;

    obtenerFinca(id)
      .then((datos) => {
        if (vigente) {
          setResultado({ id, finca: datos, error: "" });
        }
      })
      .catch((err) => {
        if (vigente) {
          setResultado({
            id,
            finca: null,
            error:
              err.response?.status === 404
                ? "Finca no encontrada."
                : extraerError(err),
          });
        }
      });

    return () => {
      vigente = false;
    };
  }, [id]);

  return (
    <div className="bc-livestock-page">
      <Link to="/fincas" className="bc-back">
        ← Volver a mis fincas
      </Link>
      {location.state?.mensaje && (
        <div className="bc-alert-ok mt-3" role="status">{location.state.mensaje}</div>
      )}

      {cargando && (
        <p className="bc-empty">Cargando finca...</p>
      )}

      {error && (
        <div className="bc-alert-error mt-3" role="alert">
          {error}
        </div>
      )}

      {finca && (
        <>
          {/* Encabezado de la finca y botón para crear un censo */}
          <div className="bc-page-head mt-3">
            <h1>{finca.nombre}</h1>
            <Link to={`/fincas/${id}/dashboard`} className="bc-btn bc-btn-outline">
              Ver panel
            </Link>
          </div>
          <div className="bc-card">
            <dl className="bc-dl">
              <dt>Municipio</dt>
              <dd>{finca.municipio}</dd>

              <dt>Departamento</dt>
              <dd>{finca.departamento}</dd>

              <dt>Dirección</dt>
              <dd>{finca.direccion || "—"}</dd>
            </dl>
          </div>

          <CensosDeFinca idFinca={id} />
          <AnimalesDeFinca idFinca={id} />
        </>
      )}
    </div>
  );
}
