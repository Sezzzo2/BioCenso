import { Link, useNavigate, useParams } from "react-router-dom";
import AnimalForm from "../../components/animales/AnimalForm.jsx";
import { crearAnimal } from "../../services/animalesService.js";
import "../../components/animales/animales.css";

export default function AnimalNuevo() {
  const { id } = useParams(); // id de la finca
  const navigate = useNavigate();

  const guardar = async (form, imagen) => {
    const animal = await crearAnimal(id, form, imagen);
    navigate(
      animal?.id_animal ? `/fincas/${id}/animales/${animal.id_animal}` : `/fincas/${id}`,
      { replace: true }
    );
  };

  return (
    <div className="bc-livestock-page">
      <Link to={`/fincas/${id}`} className="bc-back">← Volver a la finca</Link>
      <div className="bc-page-head"><div><h1>Registrar animal</h1><p className="bc-animal-section-subtitle">Añade un bovino al inventario de esta finca.</p></div></div>
      <AnimalForm textoBoton="Guardar animal" cancelarA={`/fincas/${id}`} onSubmit={guardar} />
    </div>
  );
}