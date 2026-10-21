import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { eliminarAnimal, obtenerAnimal } from "../../services/animalesService.js";
import { extraerError } from "../../utils/errores.js";
import VacunasAnimal from "../../components/vacunas/VacunasAnimal.jsx";
import "../../components/animales/animales.css";

const fecha = (v) => (v ? String(v).slice(0, 10) : "—");

export default function AnimalDetalle() {
  const { id, idAnimal } = useParams();
  const navigate = useNavigate();
  const [resultado, setResultado] = useState({ idAnimal: null, animal: null, error: "" });
  const [errorOperacion, setErrorOperacion] = useState("");
  const [eliminando, setEliminando] = useState(false);
  const cargando = String(resultado.idAnimal) !== String(idAnimal);
  const animal = cargando ? null : resultado.animal;
  const error = cargando ? "" : resultado.error;

  useEffect(() => {
    let vigente = true;
    obtenerAnimal(idAnimal)
      .then((datos) => {
        if (vigente) setResultado({ idAnimal, animal: datos, error: "" });
      })
      .catch((err) => {
        if (vigente) {
          setResultado({
            idAnimal,
            animal: null,
            error: err.response?.status === 404 ? "Animal no encontrado." : extraerError(err),
          });
        }
      });
    return () => { vigente = false; };
  }, [idAnimal]);

  const borrar = async () => {
    if (!window.confirm(`¿Eliminar el animal ${animal.numero_animal}? Esta acción no se puede deshacer.`)) return;
    setEliminando(true);
    setErrorOperacion("");
    try {
      await eliminarAnimal(idAnimal);
      navigate(`/fincas/${id}`, { replace: true });
    } catch (err) {
      setErrorOperacion(extraerError(err));
      setEliminando(false);
    }
  };

  return (
    <div className="bc-livestock-page">
      <Link to={`/fincas/${id}`} className="bc-back">← Volver a la finca</Link>

      {cargando && <p className="bc-empty">Cargando animal...</p>}
      {error && <div className="bc-alert-error mt-3" role="alert">{error}</div>}
      {errorOperacion && <div className="bc-alert-error mt-3" role="alert">{errorOperacion}</div>}

      {animal && (
        <>
          <div className="bc-page-head mt-3">
            <div>
              <span className="bc-module-eyebrow">Ficha del bovino</span>
              <h1>Animal {animal.numero_animal}</h1>
              <p className="bc-animal-section-subtitle">Información de identificación, salud y vacunación.</p>
            </div>
            <div className="bc-animal-detail-actions">
              <Link to={`/fincas/${id}/animales/${idAnimal}/editar`} className="bc-btn bc-btn-outline">
                Editar
              </Link>
              <button className="bc-btn bc-btn-danger" onClick={borrar} disabled={eliminando}>
                {eliminando ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>

          <div className="row g-4 bc-animal-record">
            {animal.imagen_url && (
              <div className="col-12 col-lg-5">
                <img src={animal.imagen_url} alt={`Animal ${animal.numero_animal}`} className="bc-photo" />
              </div>
            )}
            <div className={animal.imagen_url ? "col-12 col-lg-7" : "col-12"}>
              <div className="bc-card bc-animal-record-card">
                <div className="bc-animal-record-card__head">
                  <div><span className="bc-module-eyebrow">Datos registrados</span><h2>Información del animal</h2></div>
                  {animal.estado_general && <span className="bc-animal-status">{animal.estado_general}</span>}
                </div>
                <dl className="bc-dl">
                  <dt>Sexo</dt><dd>{animal.sexo || "Sin registrar"}</dd>
                  <dt>Fecha de nacimiento</dt><dd>{fecha(animal.fecha_nacimiento)}</dd>
                  <dt>Peso</dt><dd>{animal.peso != null ? `${animal.peso} kg` : "—"}</dd>
                  <dt>Estado reproductivo</dt><dd>{animal.estado_reproductivo || "—"}</dd>
                  <dt>Enfermedad</dt><dd>{animal.enfermedad || "—"}</dd>
                </dl>
              </div>
            </div>
          </div>

          <VacunasAnimal idAnimal={idAnimal} />
        </>
      )}
    </div>
  );
}