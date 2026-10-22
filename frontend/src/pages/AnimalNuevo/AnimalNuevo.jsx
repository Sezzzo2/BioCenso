import { useNavigate, useParams } from "react-router-dom";
import AnimalForm from "../../components/animales/AnimalForm.jsx";
import { PageHeader } from "../../components/ui/SharedUI.jsx";
import { crearAnimal } from "../../services/animalesService.js";

export default function AnimalNuevo() {
  const { id } = useParams(); // id de la finca
  const navigate = useNavigate();

  const guardar = async (form, imagen) => {
    const animal = await crearAnimal(id, form, imagen);
    navigate(animal?.id_animal ? `/fincas/${id}/animales/${animal.id_animal}` : `/fincas/${id}`, { replace: true });
  };

  return (
    <>
      <PageHeader
        migas={[{ texto: "Fincas", ruta: "/fincas" }, { texto: "Finca", ruta: `/fincas/${id}` }, { texto: "Registrar bovino" }]}
        title="Registrar bovino"
        description="Completa los datos principales. Los campos opcionales puedes agregarlos ahora o más adelante."
      />
      <AnimalForm textoBoton="Registrar bovino" cancelarA={`/fincas/${id}`} onSubmit={guardar} />
    </>
  );
}
