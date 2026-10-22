import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { eliminarAnimal, obtenerAnimal } from "../../services/animalesService.js";
import { obtenerFinca } from "../../services/fincaService.js";
import { extraerError } from "../../utils/errores.js";
import { formatFechaLarga } from "../../utils/format.js";
import Icon from "../../components/ui/Icon.jsx";
import { AlertMessage, ButtonLink, LoadingState, PageHeader } from "../../components/ui/SharedUI.jsx";
import VacunasAnimal from "../../components/vacunas/VacunasAnimal.jsx";

function EstadoGeneral({ estado }) {
  if (!estado) return "Sin registrar";
  const clase = estado === "Sano" ? "ok" : estado === "Enfermo" ? "err" : "espera";
  return <span className={`estado ${clase}`}>{estado}</span>;
}

export default function AnimalDetalle() {
  const { id, idAnimal } = useParams();
  const navigate = useNavigate();
  const [resultado, setResultado] = useState({ idAnimal: null, animal: null, error: "" });
  const [errorOperacion, setErrorOperacion] = useState("");
  const [confirmando, setConfirmando] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const botonNo = useRef(null);
  const cargando = String(resultado.idAnimal) !== String(idAnimal);
  const animal = cargando ? null : resultado.animal;
  const error = cargando ? "" : resultado.error;

  useEffect(() => {
    let vigente = true;
    Promise.all([obtenerAnimal(idAnimal), obtenerFinca(id).catch(() => null)])
      .then(([datos, finca]) => {
        if (vigente) setResultado({ idAnimal, animal: { ...datos, nombre_finca: datos.nombre_finca ?? finca?.nombre }, error: "" });
      })
      .catch((err) => {
        if (vigente) {
          setResultado({ idAnimal, animal: null,
            error: err.response?.status === 404 ? "Bovino no encontrado." : extraerError(err) });
        }
      });
    return () => { vigente = false; };
  }, [id, idAnimal]);

  useEffect(() => { if (confirmando) botonNo.current?.focus(); }, [confirmando]);

  const borrar = async () => {
    setEliminando(true);
    setErrorOperacion("");
    try {
      await eliminarAnimal(idAnimal);
      navigate(`/fincas/${id}`, { replace: true, state: { mensaje: `El bovino ${animal.numero_animal} se eliminó.` } });
    } catch (err) {
      setErrorOperacion(extraerError(err));
      setEliminando(false);
      setConfirmando(false);
    }
  };

  if (cargando) return <LoadingState>Cargando bovino...</LoadingState>;
  if (error) {
    return (
      <div className="panel panel-solido vacio-bloque" style={{ marginTop: 40 }}>
        <h3>{error}</h3>
        <p>Puede que se haya eliminado o que no pertenezca a tu cuenta.</p>
        <ButtonLink to={`/fincas/${id}`}>Volver a la finca</ButtonLink>
      </div>
    );
  }

  const acciones = confirmando ? (
    <span className="confirmar">
      ¿Eliminar este bovino y sus vacunas?
      <button type="button" className="btn btn-peligro btn-sm" onClick={borrar} disabled={eliminando}>
        {eliminando ? "Eliminando..." : "Sí, eliminar"}
      </button>
      <button type="button" className="btn btn-oscuro btn-sm" ref={botonNo} onClick={() => setConfirmando(false)} disabled={eliminando}>No</button>
    </span>
  ) : (
    <>
      <ButtonLink to={`/fincas/${id}/animales/${idAnimal}/editar`} variant="outline"><Icon name="edit" />Editar</ButtonLink>
      <button type="button" className="btn btn-oscuro btn-peligro-borde" onClick={() => setConfirmando(true)}>
        <Icon name="trash" />Eliminar
      </button>
    </>
  );

  return (
    <>
      <PageHeader
        migas={[
          { texto: "Fincas", ruta: "/fincas" },
          { texto: animal.nombre_finca || "Finca", ruta: `/fincas/${id}` },
          { texto: animal.numero_animal },
        ]}
        title={`Bovino ${animal.numero_animal}`}
        description="Información de identificación, salud y vacunación."
        action={acciones}
      />
      {errorOperacion && <AlertMessage>{errorOperacion}</AlertMessage>}

      <section className="panel panel-solido panel-pad bloque">
        <div className="ficha-grid">
          {animal.imagen_url
            ? <img className="foto" src={animal.imagen_url} alt={`Foto del bovino ${animal.numero_animal}`} />
            : <div className="foto" role="img" aria-label="Sin foto"><Icon name="vaca" /></div>}
          <dl className="dl">
            <dt>Sexo</dt><dd>{animal.sexo || "Sin registrar"}</dd>
            <dt>Fecha de nacimiento</dt><dd>{animal.fecha_nacimiento ? formatFechaLarga(animal.fecha_nacimiento) : "Sin registrar"}</dd>
            <dt>Peso</dt><dd>{animal.peso != null ? `${Number(animal.peso)} kg` : "Sin registrar"}</dd>
            <dt>Estado reproductivo</dt><dd>{animal.estado_reproductivo || "—"}</dd>
            <dt>Estado general</dt><dd><EstadoGeneral estado={animal.estado_general} /></dd>
            <dt>Enfermedad</dt><dd>{animal.enfermedad || "—"}</dd>
          </dl>
        </div>
      </section>

      <VacunasAnimal idAnimal={idAnimal} />
    </>
  );
}
