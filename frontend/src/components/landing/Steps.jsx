const PASOS = [
  { n: "01", titulo: "Crea tu cuenta", texto: "Regístrate e inicia sesión para proteger los datos de tu finca." },
  { n: "02", titulo: "Sube el video del dron", texto: "Carga la grabación del recorrido aéreo de tu potrero." },
  { n: "03", titulo: "La IA detecta y cuenta", texto: "El modelo identifica a cada bovino y estima su ubicación y peso aproximado." },
  { n: "04", titulo: "Consulta los resultados", texto: "Revisa el conteo, el mapa y la evolución de tus censos en el panel." },
];

export default function Steps() {
  return (
    <section id="como-funciona" className="bc-section bc-steps">
      <div className="bc-container">
        <p className="bc-eyebrow">Cómo funciona</p>
        <h2 className="bc-title" style={{ fontSize: "2.2rem" }}>Cuatro pasos, sin recorrer el potrero</h2>
        <div className="row g-4 mt-3">
          {PASOS.map((p) => (
            <div className="col-12 col-md-6 col-lg-3" key={p.n}>
              <div className="bc-step-card">
                <div className="bc-step-num">{p.n}</div>
                <h3>{p.titulo}</h3>
                <p>{p.texto}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}