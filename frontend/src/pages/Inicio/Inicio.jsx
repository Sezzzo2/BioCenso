import Navbar from "../../components/landing/Navbar";
import Hero from "../../components/landing/Hero";
import Steps from "../../components/landing/Steps";
import UploadGate from "../../components/landing/UploadGate";
import ComparisonTable from "../../components/landing/ComparisonTable";

export default function Inicio() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Steps />
        <UploadGate />
        <ComparisonTable />
      </main>
      <footer className="bc-footer">
        BioCenso · Trabajo de grado · Universidad Cooperativa de Colombia, Villavicencio
      </footer>
    </>
  );
}