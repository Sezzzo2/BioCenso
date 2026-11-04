// El tutorial se marca como pendiente al crear la cuenta y se abre en la primera visita a la app
const CLAVE = "bc_tutorial_pendiente";
export const EVENTO_TUTORIAL = "biocenso:abrir-tutorial";

export function marcarTutorialPendiente() {
  try { localStorage.setItem(CLAVE, "1"); } catch { /* sin almacenamiento: no se muestra solo */ }
}

export function tutorialPendiente() {
  try { return localStorage.getItem(CLAVE) === "1"; } catch { return false; }
}

export function quitarTutorialPendiente() {
  try { localStorage.removeItem(CLAVE); } catch { /* nada que limpiar */ }
}

export const abrirTutorial = () => window.dispatchEvent(new Event(EVENTO_TUTORIAL));
