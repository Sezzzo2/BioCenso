import Icon from "../ui/Icon.jsx";

// Secciones de la portada pública que explican el sistema por dentro

const ETAPAS = [
  {
    titulo: "Subes el video del vuelo",
    texto: "Eliges la finca y la fecha del vuelo y cargas el video en MP4 o MOV (hasta 200 MB) o una foto aérea. El archivo solo se usa para el análisis y se borra al terminar.",
  },
  {
    titulo: "La IA recorre todo el video",
    texto: "Un modelo de visión por computadora revisa el vuelo de principio a fin, cuenta cada res aunque esté echada, en grupo o en sombra, y clasifica cada una como vaca, toro, novillo, novilla o ternero.",
  },
  {
    titulo: "Estima el peso de cada animal",
    texto: "Según su tamaño y su tipo, asigna un peso aproximado a cada bovino tomando como referencia el ganado de la Orinoquía (Brahman, cebú y sus cruces). Con eso calcula el promedio y el peso total del hato.",
  },
  {
    titulo: "Marca los animales en una captura",
    texto: "Elige el fotograma donde mejor se ven las reses y dibuja un recuadro numerado sobre cada una, con su peso. El número es el mismo de la tabla de pesos.",
  },
  {
    titulo: "Todo queda en la ficha del censo",
    texto: "Total contado, diferencia con los bovinos registrados en tu finca, la captura y la tabla con el peso de cada animal. Puedes anotar tu propio conteo manual para comparar.",
  },
];

const EJEMPLO = [
  [1, "Vaca", 468, "Captura"],
  [2, "Vaca", 452, "Captura"],
  [3, "Novillo", 395, "Captura"],
  [4, "Ternero", 210, "Video · 24 s"],
];

export function RecorridoDelVideo() {
  return (
    <section className="seccion" id="por-dentro" aria-labelledby="t-por-dentro">
      <h2 id="t-por-dentro">Qué pasa con tu video</h2>
      <p className="bajada seccion-bajada">
        Desde que lo subes hasta que ves el resultado pasan unos minutos. Esto es lo que hace BioCenso en ese tiempo.
      </p>
      <div className="recorrido">
        <ol className="recorrido-etapas">
          {ETAPAS.map((e, i) => (
            <li key={e.titulo}>
              <span className="recorrido-num" aria-hidden="true">{i + 1}</span>
              <div>
                <h3>{e.titulo}</h3>
                <p>{e.texto}</p>
              </div>
            </li>
          ))}
        </ol>

        <figure className="panel panel-solido ejemplo" aria-labelledby="t-ejemplo">
          <figcaption id="t-ejemplo">Así se ve un resultado <span>Ejemplo ilustrativo</span></figcaption>
          <dl className="ejemplo-cifras">
            <div><dt>Bovinos contados</dt><dd>17</dd></div>
            <div><dt>Peso promedio</dt><dd>443 <small>kg</small></dd></div>
            <div><dt>Peso total</dt><dd>7.529 <small>kg</small></dd></div>
          </dl>
          <p className="ejemplo-frase">El dron vio 2 bovinos más de los que tienes registrados.</p>
          <table className="ejemplo-tabla">
            <thead><tr><th scope="col">N.º</th><th scope="col">Tipo</th><th scope="col" className="num">Peso</th><th scope="col">Visto en</th></tr></thead>
            <tbody>
              {EJEMPLO.map(([n, tipo, peso, visto]) => (
                <tr key={n}>
                  <td><span className={`bovino-num${visto === "Captura" ? " en-imagen" : ""}`}>{n}</span></td>
                  <td>{tipo}</td>
                  <td className="num">{peso} kg</td>
                  <td className="bovino-origen">{visto}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="ejemplo-mas">… y el resto de los bovinos contados en el vuelo.</p>
        </figure>
      </div>
    </section>
  );
}

const FUNCIONES = [
  ["mapPin", "Fincas", "Registra cada finca con su municipio y departamento. Cada censo y cada bovino quedan asociados a una finca."],
  ["vaca", "Bovinos", "Lleva el registro de cada animal: número, sexo, fecha de nacimiento, peso, estado general y una foto."],
  ["check", "Vacunas", "Anota las vacunas aplicadas a cada bovino y consulta el resumen de vacunación de todas tus fincas."],
  ["escaner", "Censos", "Sube el video de cada vuelo y guarda el conteo, los pesos y la captura en el historial de la finca."],
  ["barras", "Panel de la finca", "Gráficas de la evolución de los censos y comparación entre lo contado y lo registrado."],
  ["user", "Tu información es tuya", "Cada cuenta solo ve sus propias fincas, bovinos y censos."],
];

export function QueIncluye() {
  return (
    <section className="seccion" id="funciones" aria-labelledby="t-funciones">
      <h2 id="t-funciones">Todo lo de tu finca en un lugar</h2>
      <ul className="panel funciones">
        {FUNCIONES.map(([icono, titulo, texto]) => (
          <li key={titulo}>
            <Icon name={icono} />
            <div>
              <h3>{titulo}</h3>
              <p>{texto}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

const PREGUNTAS = [
  ["¿Qué tan exacto es el conteo?",
    "Es una estimación hecha por inteligencia artificial. Funciona mejor con vuelos a 10 a 20 metros, buena luz y sin pasar dos veces por la misma zona. Para medir qué tan cerca estuvo, registra tu conteo manual en la ficha del censo y BioCenso te muestra la diferencia."],
  ["¿Los pesos son reales?",
    "Son aproximados: se calculan por el tamaño y el tipo de cada animal visto desde el aire. Sirven para tener una idea del peso del hato, no reemplazan la báscula."],
  ["¿Qué video necesito?",
    "El archivo tal como sale del dron, en MP4 o MOV y de hasta 200 MB. También puedes subir una foto aérea en JPG, PNG o WEBP."],
  ["¿Cuánto tarda el análisis?",
    "Normalmente unos minutos; depende del tamaño del video. Si la IA está muy ocupada, BioCenso vuelve a intentarlo solo."],
  ["¿Quién puede ver mis datos?",
    "Solo tú. Cada cuenta ve únicamente sus fincas, bovinos y censos, y el video se borra después del análisis."],
  ["¿Tiene costo?",
    "No. BioCenso es un trabajo de grado de la Universidad Cooperativa de Colombia, sede Villavicencio."],
];

export function PreguntasFrecuentes() {
  return (
    <section className="seccion" id="preguntas" aria-labelledby="t-preguntas">
      <h2 id="t-preguntas">Preguntas frecuentes</h2>
      <div className="panel panel-solido preguntas">
        {PREGUNTAS.map(([pregunta, respuesta]) => (
          <details key={pregunta}>
            <summary>{pregunta}<Icon name="chevronDown" /></summary>
            <p>{respuesta}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
