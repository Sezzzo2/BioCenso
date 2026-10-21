import { Link } from "react-router-dom";

export default function Hero() {
  return (
    <section className="bc-hero">
      <div className="bc-container">
        <p className="bc-eyebrow">Finca La Vitrina · Villavicencio</p>
        <h1 className="bc-title">
          Cuenta tu ganado <br /> desde el <span>aire</span>.
        </h1>
        <p className="bc-lead">
          BioCenso usa video de dron e inteligencia artificial para contar y
          ubicar a tus bovinos, y te permite llevar el registro de cada animal
          en un solo lugar.
        </p>
        <div className="bc-hero-actions">
          <Link to="/registro" className="bc-btn bc-btn-primary">Comenzar</Link>
          <a href="#como-funciona" className="bc-btn bc-btn-outline">Ver cómo funciona</a>
        </div>
      </div>
    </section>
  );
}