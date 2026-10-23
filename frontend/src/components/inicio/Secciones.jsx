import Icon from "../ui/Icon.jsx";

// Secciones informativas compartidas por la portada pública y el inicio de la app

const PASOS = [
  ["Vuela sobre el potrero", "Graba tu finca con el dron a unos 30 a 50 metros de altura y con luz suave."],
  ["Sube el video", "En Censo elige la finca, la fecha del vuelo y el archivo del video."],
  ["Recibe el conteo", "El modelo de visión por computadora detecta cada bovino y suma el total. El resultado queda guardado en tu historial."],
  ["Compara con tu registro", "En Fincas registra cada animal y revisa si el conteo del dron coincide con tu inventario."],
];

const CONSEJOS = [
  ["altura", "Altura de vuelo", "Entre 30 y 50 metros: los animales se ven completos y con buen detalle."],
  ["recorrido", "Recorrido", "Avanza en líneas paralelas y no pases dos veces por la misma zona, así no se cuenta dos veces a un animal."],
  ["sun", "Luz", "Graba a primera hora o con cielo nublado para evitar sombras fuertes."],
  ["video", "Formato del video", "Sube el archivo en MP4 o MOV, tal como sale del dron."],
];

const COMPARACION = [
  ["Método", "Recorrido a pie o a caballo", "Video aéreo con dron"],
  ["Tiempo de la jornada", "Depende del tamaño del potrero", "Depende de la duración del vuelo"],
  ["Registro de resultados", "Cuaderno u hojas sueltas", "Base de datos centralizada"],
  ["Peso del hato", "Báscula o cálculo a ojo", "Peso estimado por res y total"],
  ["Historial de censos", "Difícil de consultar", "Gráficas de evolución"],
];

export function ComoFunciona() {
  return (
    <section className="seccion" id="como-funciona" aria-labelledby="t-como">
      <h2 id="t-como">¿Cómo funciona?</h2>
      <ol className="panel pasos">
        {PASOS.map(([titulo, texto], i) => (
          <li className="paso" key={titulo}>
            <span className="paso-num">{i + 1}</span>
            <h3>{titulo}</h3>
            <p>{texto}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function BuenConteo() {
  return (
    <section className="seccion" id="consejos" aria-labelledby="t-consejos">
      <h2 id="t-consejos">Para un buen conteo</h2>
      <div className="panel consejos">
        {CONSEJOS.map(([icono, titulo, texto]) => (
          <div className="consejo" key={titulo}>
            <h3><Icon name={icono} />{titulo}</h3>
            <p>{texto}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function Comparacion() {
  return (
    <section className="seccion comparacion" id="comparacion" aria-labelledby="t-comp">
      <h2 id="t-comp">Conteo manual vs. BioCenso</h2>
      <div className="tabla-caja" style={{ marginTop: 22 }}>
        <table>
          <thead><tr><th>Criterio</th><th>Conteo manual</th><th className="bc">BioCenso</th></tr></thead>
          <tbody>
            {COMPARACION.map(([criterio, manual, bc]) => (
              <tr key={criterio}><td>{criterio}</td><td>{manual}</td><td className="bc">{bc}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function Pie() {
  return <footer className="pie">BioCenso · Trabajo de grado · Universidad Cooperativa de Colombia, Villavicencio</footer>;
}
