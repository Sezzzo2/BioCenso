import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "../ui/Icon.jsx";
import { EVENTO_TUTORIAL, quitarTutorialPendiente, tutorialPendiente } from "./tutorial.js";

const PASOS = [
  {
    icono: "vaca",
    titulo: "Bienvenido a BioCenso",
    texto: "BioCenso cuenta tu ganado a partir del video de un vuelo de dron y estima el peso de cada animal. Te mostramos en un minuto cómo usarlo.",
    puntos: ["Registras tu finca y tus bovinos.", "Subes el video del vuelo.", "Recibes el conteo, los pesos y una captura con cada animal numerado."],
  },
  {
    icono: "mapPin",
    titulo: "1. Registra tu finca",
    donde: "Menú Fincas → Registrar finca",
    texto: "Escribe el nombre de la finca, el municipio y el departamento. Todo lo demás (bovinos, vacunas y censos) queda guardado dentro de su finca.",
  },
  {
    icono: "plus",
    titulo: "2. Registra tus bovinos",
    donde: "Fincas → tu finca → Registrar bovino",
    texto: "Agrega cada animal con su número, sexo y, si quieres, fecha de nacimiento, peso y foto. También puedes anotar sus vacunas. Así BioCenso compara el conteo del dron con tu inventario.",
  },
  {
    icono: "arrowUp",
    titulo: "3. Sube el video del dron",
    donde: "Menú Censo → Iniciar conteo",
    texto: "Elige la finca y la fecha del vuelo y carga el video en MP4 o MOV, de hasta 200 MB. El análisis tarda unos minutos.",
    puntos: ["Vuela a 10–20 metros de altura.", "Graba con luz suave, temprano o con cielo nublado.", "No pases dos veces por la misma zona."],
  },
  {
    icono: "escaner",
    titulo: "4. Revisa el resultado",
    donde: "Censo → historial → Ver ficha del censo",
    texto: "Verás cuántos bovinos contó la IA, la diferencia con tu registro, una captura con cada animal numerado y la tabla con el tipo y el peso de cada uno. Todo queda guardado en la ficha del censo.",
    puntos: ["Anota tu propio conteo manual para comparar.", "En el panel de la finca ves la evolución de tus censos."],
  },
];

// Recorrido de bienvenida: se abre solo después de crear la cuenta y luego desde Inicio
export default function Tutorial() {
  const dialogo = useRef(null);
  const navigate = useNavigate();
  const [paso, setPaso] = useState(0);

  useEffect(() => {
    const abrir = () => {
      setPaso(0);
      if (!dialogo.current?.open) dialogo.current?.showModal();
    };
    if (tutorialPendiente()) abrir();
    window.addEventListener(EVENTO_TUTORIAL, abrir);
    return () => window.removeEventListener(EVENTO_TUTORIAL, abrir);
  }, []);

  const cerrar = () => dialogo.current?.close();
  const ultimo = paso === PASOS.length - 1;
  const actual = PASOS[paso];

  return (
    <dialog ref={dialogo} className="tutorial" aria-labelledby="t-tutorial" onClose={quitarTutorialPendiente}>
      <div className="tutorial-cuerpo" key={paso}>
        <span className="tutorial-icono" aria-hidden="true"><Icon name={actual.icono} size={30} /></span>
        <h2 id="t-tutorial">{actual.titulo}</h2>
        {actual.donde && <p className="tutorial-donde"><Icon name="arrowRight" size={15} />{actual.donde}</p>}
        <p className="tutorial-texto">{actual.texto}</p>
        {actual.puntos && (
          <ul className="tutorial-puntos">
            {actual.puntos.map((p) => <li key={p}><Icon name="check" size={16} strokeWidth={2.6} />{p}</li>)}
          </ul>
        )}
      </div>

      <div className="tutorial-pie">
        <ol className="tutorial-avance" aria-label={`Paso ${paso + 1} de ${PASOS.length}`}>
          {PASOS.map((p, i) => (
            <li key={p.titulo}>
              <button type="button" className={i === paso ? "actual" : ""} aria-current={i === paso ? "step" : undefined}
                aria-label={`Ir al paso ${i + 1}: ${p.titulo}`} onClick={() => setPaso(i)} />
            </li>
          ))}
        </ol>
        <div className="tutorial-acciones">
          {paso > 0 ? (
            <button type="button" className="btn btn-oscuro btn-sm" onClick={() => setPaso(paso - 1)}>Anterior</button>
          ) : (
            <button type="button" className="btn-texto" onClick={cerrar}>Saltar tutorial</button>
          )}
          {ultimo ? (
            <button type="button" className="btn btn-brote btn-sm" onClick={() => { cerrar(); navigate("/fincas/nueva"); }}>
              Registrar mi primera finca
            </button>
          ) : (
            <button type="button" className="btn btn-brote btn-sm" onClick={() => setPaso(paso + 1)} autoFocus={paso === 0}>
              Siguiente
            </button>
          )}
        </div>
      </div>
      <button type="button" className="tutorial-cerrar" aria-label="Cerrar tutorial" onClick={cerrar}>
        <Icon name="x" size={20} />
      </button>
    </dialog>
  );
}
