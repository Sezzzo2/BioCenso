import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import AnimalForm from "../../components/animales/AnimalForm.jsx";
import { actualizarAnimal, obtenerAnimal } from "../../services/animalesService.js";
import { extraerError } from "../../utils/errores.js";
import "../../components/animales/animales.css";

export default function AnimalEditar() {
  const { id, idAnimal } = useParams();
  const navigate = useNavigate();
  const [animal, setAnimal] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    obtenerAnimal(idAnimal)
      .then(setAnimal)
      .catch((err) => {
        setError(err.response?.status === 404 ? "Animal no encontrado." : extraerError(err));
      })
      .finally(() => setCargando(false));
  }, [idAnimal]);

  const guardar = async (form, imagen) => {
    await actualizarAnimal(idAnimal, form, imagen);
    navigate(`/fincas/${id}/animales/${idAnimal}`, { replace: true });
  };

  const volver = `/fincas/${id}/animales/${idAnimal}`;

  return (
    <div className="bc-livestock-page">
      <Link to={volver} className="bc-back">← Volver al animal</Link>
      <div className="bc-page-head"><div><h1>Editar animal</h1><p className="bc-animal-section-subtitle">Actualiza la información de la ficha del bovino.</p></div></div>

      {cargando && <p className="bc-empty">Cargando animal...</p>}
      {error && <div className="bc-alert-error" role="alert">{error}</div>}

      {animal && (
        <AnimalForm
          inicial={animal}
          imagenActual={animal.imagen_url}
          textoBoton="Guardar cambios"
          cancelarA={volver}
          onSubmit={guardar}
        />
      )}
    </div>
  );
}