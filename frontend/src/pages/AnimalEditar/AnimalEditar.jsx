import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AnimalForm from "../../components/animales/AnimalForm.jsx";
import { AlertMessage, LoadingState, PageHeader } from "../../components/ui/SharedUI.jsx";
import { actualizarAnimal, obtenerAnimal } from "../../services/animalesService.js";
import { extraerError } from "../../utils/errores.js";

export default function AnimalEditar() {
  const { id, idAnimal } = useParams();
  const navigate = useNavigate();
  const [animal, setAnimal] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    obtenerAnimal(idAnimal)
      .then(setAnimal)
      .catch((err) => setError(err.response?.status === 404 ? "Bovino no encontrado." : extraerError(err)))
      .finally(() => setCargando(false));
  }, [idAnimal]);

  const guardar = async (form, imagen) => {
    await actualizarAnimal(idAnimal, form, imagen);
    navigate(`/fincas/${id}/animales/${idAnimal}`, { replace: true });
  };

  const volver = `/fincas/${id}/animales/${idAnimal}`;

  return (
    <>
      <PageHeader
        migas={[
          { texto: "Fincas", ruta: "/fincas" },
          { texto: "Finca", ruta: `/fincas/${id}` },
          { texto: animal?.numero_animal || "Bovino", ruta: volver },
          { texto: "Editar" },
        ]}
        title={animal ? `Editar bovino ${animal.numero_animal}` : "Editar bovino"}
        description="Actualiza la información de la ficha del bovino."
      />
      {cargando && <LoadingState>Cargando bovino...</LoadingState>}
      {error && <AlertMessage>{error}</AlertMessage>}
      {animal && (
        <AnimalForm inicial={animal} imagenActual={animal.imagen_url} textoBoton="Guardar cambios"
          cancelarA={volver} onSubmit={guardar} />
      )}
    </>
  );
}
