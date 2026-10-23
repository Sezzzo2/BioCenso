import { Link } from "react-router-dom";
import Icon from "../../components/ui/Icon.jsx";
import { ButtonLink } from "../../components/ui/SharedUI.jsx";
import { BuenConteo, ComoFunciona, Comparacion, Pie } from "../../components/inicio/Secciones.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import DetectionPreview from "../Inicio/DetectionPreview.jsx";

// Portada pública: presenta BioCenso a quien todavía no ha entrado a la app
export default function Landing() {
  const { autenticado } = useAuth();

  return (
    <>
      <div className="heroe heroe-portada">
        <div>
          <h1>Cuenta tu ganado con un video de dron</h1>
          <p className="bajada">
            Sube el video del vuelo y BioCenso detectará cada bovino, estimará su peso y comparará
            el total con el registro de tu finca.
          </p>
          <div className="heroe-acciones">
            {autenticado ? (
              <>
                <Link className="btn btn-brote" to="/inicio">
                  <span className="ico-circ"><Icon name="arrowRight" strokeWidth={2.4} /></span>Ir a mi panel
                </Link>
                <Link className="btn btn-oscuro" to="/censos">Subir video del censo</Link>
              </>
            ) : (
              <>
                <Link className="btn btn-brote" to="/registro">
                  <span className="ico-circ"><Icon name="arrowRight" strokeWidth={2.4} /></span>Crear cuenta gratis
                </Link>
                <Link className="btn btn-oscuro" to="/login">Iniciar sesión</Link>
              </>
            )}
          </div>
        </div>
        <DetectionPreview />
      </div>

      <ComoFunciona />
      <BuenConteo />
      <Comparacion />

      {!autenticado && (
        <section className="panel panel-solido llamado" aria-labelledby="t-llamado">
          <div>
            <h2 id="t-llamado">Lleva el registro de tu finca</h2>
            <p>Crea tu cuenta para subir tus censos, registrar cada bovino y llevar sus vacunas. Solo tú ves la información de tus fincas.</p>
          </div>
          <div className="acciones">
            <ButtonLink to="/registro">Crear cuenta</ButtonLink>
            <ButtonLink to="/login" variant="outline">Iniciar sesión</ButtonLink>
          </div>
        </section>
      )}

      <Pie />
    </>
  );
}
