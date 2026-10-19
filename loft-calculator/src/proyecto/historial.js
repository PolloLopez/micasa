// ==========================================================
// HISTORIAL PARA DESHACER / REHACER (v1.18: Ctrl+Z / Ctrl+Y)
// ----------------------------------------------------------
// Guarda "fotos" del proyecto (medidas, aberturas y catálogo) antes de
// cada cambio. Deshacer vuelve a la foto anterior; rehacer, a la que se
// deshizo. Funciones puras: reciben un historial y devuelven otro nuevo
// (no modifican el que reciben), así se testean sin React.
//
//   historial = { pasado: [foto…], futuro: [foto…], ultimoCambio: ms }
//
// Escribir en un campo genera un cambio por tecla: los cambios seguidos
// (menos de AGRUPAR_MS entre uno y otro) se juntan en un solo paso, así
// Ctrl+Z deshace "lo que escribí" y no letra por letra.
// ==========================================================

export const MAXIMO_PASOS = 50;
export const AGRUPAR_MS = 800;

export const historialVacio = () => ({ pasado: [], futuro: [], ultimoCambio: 0 });

/**
 * Anota que el proyecto cambió: `anterior` es la foto de ANTES del cambio.
 * @param ahora momento del cambio (ms), para agrupar los cambios seguidos
 */
export function registrarCambio(historial, anterior, ahora) {
  const seguido = historial.pasado.length > 0 && ahora - historial.ultimoCambio < AGRUPAR_MS;
  // Cambio seguido: ya está guardada la foto de antes de empezar a escribir.
  const pasado = seguido ? historial.pasado : [...historial.pasado, anterior].slice(-MAXIMO_PASOS);
  return { pasado, futuro: [], ultimoCambio: ahora };
}

/**
 * Deshacer: devuelve la foto a la que hay que volver y el historial nuevo.
 * @param actual foto del proyecto como está ahora (pasa a "futuro" para rehacer)
 * @returns {{ foto, historial } | null} null si no hay nada para deshacer
 */
export function deshacer(historial, actual) {
  if (historial.pasado.length === 0) return null;
  const foto = historial.pasado[historial.pasado.length - 1];
  return {
    foto,
    historial: { pasado: historial.pasado.slice(0, -1), futuro: [actual, ...historial.futuro], ultimoCambio: 0 },
  };
}

/** Rehacer: lo contrario de deshacer. @returns {{ foto, historial } | null} */
export function rehacer(historial, actual) {
  if (historial.futuro.length === 0) return null;
  const [foto, ...resto] = historial.futuro;
  return {
    foto,
    historial: { pasado: [...historial.pasado, actual].slice(-MAXIMO_PASOS), futuro: resto, ultimoCambio: 0 },
  };
}
