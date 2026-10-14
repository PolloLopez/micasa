// ==========================================================
// CAÑOS Y PERFILES COMUNES
// ----------------------------------------------------------
// Lista para elegir el caño de cada parte sin escribirlo a mano. Lo que
// se elige se guarda como texto en el perfil del renglón del catálogo
// (el mismo campo que se edita en el presupuesto), así hay una sola
// fuente de verdad. El 3D lee la medida de ese texto para dibujar la
// barra con su grosor.
// ==========================================================

export const CANOS_COMUNES = [
  'Caño estructural 30x30x1.6',
  'Caño estructural 40x40x1.6',
  'Caño estructural 40x40x2.0',
  'Caño estructural 50x50x1.6',
  'Caño estructural 50x50x2.0',
  'Caño estructural 60x40x1.6',
  'Caño estructural 60x40x2.0',
  'Caño estructural 60x60x2.0',
  'Caño estructural 80x40x2.0',
  'Caño estructural 80x80x2.0',
  'Caño estructural 100x50x2.0',
  'Caño estructural 100x100x2.0',
  'Caño estructural 120x60x2.0',
  'Ángulo 1" x 1/8"',
  'Ángulo 1 1/4" x 1/8"',
  'Ángulo 1 1/2" x 3/16"',
];

const PULGADA = 0.0254;

/** "1 1/4" -> 1.25 ; "2" -> 2 */
function pulgadas(texto) {
  const [entero, fraccion] = texto.trim().split(/\s+/);
  if (entero.includes('/')) {
    const [a, b] = entero.split('/').map(Number);
    return a / b;
  }
  if (!fraccion) return Number(entero);
  const [a, b] = fraccion.split('/').map(Number);
  return Number(entero) + a / b;
}

/**
 * Grosor (en metros) para dibujar una barra a partir del texto del perfil:
 * "Caño estructural 60x40x2.0" -> 0,06 ; 'Ángulo 1 1/4" x 1/8"' -> 0,032.
 * Si no se puede leer la medida, devuelve null (se usa el grosor de siempre).
 */
export function seccionDesdePerfil(texto) {
  if (typeof texto !== 'string') return null;
  const mm = texto.match(/(\d+(?:[.,]\d+)?)\s*x\s*(\d+(?:[.,]\d+)?)/i);
  if (mm) {
    const lado = Math.max(Number(mm[1].replace(',', '.')), Number(mm[2].replace(',', '.')));
    if (lado >= 10 && lado <= 400) return lado / 1000;
  }
  const inch = texto.match(/(\d+(?:\s+\d+\/\d+)?|\d+\/\d+)\s*"/);
  if (inch) {
    const lado = pulgadas(inch[1]) * PULGADA;
    if (lado > 0 && lado < 0.4) return Number(lado.toFixed(4));
  }
  return null;
}
