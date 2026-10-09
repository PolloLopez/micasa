// ==========================================================
// Descripción legible de una pieza para la pantalla:
// "Columna · Frente y Lateral izquierdo · 4,95 m"
// Los nombres de las paredes dependen de cuál es el frente.
// ==========================================================

import { NOMBRE_TIPO_PIEZA } from './motor/estructura.js';
import { nombreLado } from './motor/geometria.js';

const NOMBRE_GRUPO = { techo: 'Techo', piso: 'Piso', piso2: 'Piso 2', interior: 'Borde del entrepiso' };

/** Nombre de un grupo (pared, techo, piso...). */
export function nombreGrupo(grupo, ladoFrente) {
  return NOMBRE_GRUPO[grupo] ?? nombreLado(grupo, ladoFrente);
}

/** Texto completo de una pieza. */
export function describirPieza(pieza, ladoFrente) {
  const tipo = NOMBRE_TIPO_PIEZA[pieza.tipo] ?? pieza.tipo;
  const donde = pieza.grupos.map((g) => nombreGrupo(g, ladoFrente)).join(' y ');
  return `${tipo} · ${donde} · ${pieza.largo.toFixed(2)} m`;
}
