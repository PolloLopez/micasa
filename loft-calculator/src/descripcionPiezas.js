// ==========================================================
// Descripción legible de una pieza para la pantalla:
// "Columna · Frente y Lateral izquierdo · 4,95 m"
// Los nombres de las paredes dependen de cuál es el frente.
// ==========================================================

import { NOMBRE_TIPO_PIEZA } from './motor/estructura.js';
import { nombreLado, nombreDePared } from './motor/geometria.js';

const NOMBRE_GRUPO = { techo: 'Techo', piso: 'Piso', piso2: 'Piso 2', interior: 'Borde del entrepiso', escalera: 'Escalera', grada: 'Grada' };

/**
 * Nombre de un grupo (pared, techo, piso...).
 * v1.52: `obra` puede ser el lado del frente ('A') o los params de la obra: con params, la pared usa su etiqueta.
 */
export function nombreGrupo(grupo, obra) {
  if (NOMBRE_GRUPO[grupo]) return NOMBRE_GRUPO[grupo];
  return typeof obra === 'object' ? nombreDePared(grupo, obra) : nombreLado(grupo, obra);
}

/** Texto completo de una pieza. */
export function describirPieza(pieza, ladoFrente) {
  const tipo = NOMBRE_TIPO_PIEZA[pieza.tipo] ?? pieza.tipo;
  // Piezas de un montaje: se nombran por su componente (ej. "Pata · Mesa de trabajo").
  if (pieza.componente !== undefined) return `${tipo} · ${pieza.componente || 'Componente'} · ${pieza.largo.toFixed(2)} m`;
  const donde = pieza.grupos.map((g) => nombreGrupo(g, ladoFrente)).join(' y ');
  return `${tipo} · ${donde} · ${pieza.largo.toFixed(2)} m`;
}

/**
 * v1.64: las características de una pieza, para verla antes de restaurarla o quitarla.
 * @param perfil  nombre del perfil con que se cotiza (ver perfilDePieza en coloresPerfil.js)
 * @returns string[]  ej. ["Caño 80x80x2", "2,45 m", "vertical", "de 0,00 a 2,45 m de altura"]
 */
export function detallesDePieza(pieza, perfil) {
  const m = (n) => `${n.toFixed(2).replace('.', ',')} m`;
  const { desde, hasta } = pieza;
  const detalles = [perfil, m(pieza.largo)];
  if (!desde || !hasta) return detalles;
  const horizontal = Math.hypot(hasta[0] - desde[0], hasta[2] - desde[2]);
  const subida = Math.abs(hasta[1] - desde[1]);
  detalles.push(horizontal < 1e-6 ? 'vertical' : subida < 1e-6 ? 'horizontal' : 'inclinada');
  const [abajo, arriba] = [Math.min(desde[1], hasta[1]), Math.max(desde[1], hasta[1])];
  const n = (x) => x.toFixed(2).replace('.', ',');
  detalles.push(subida < 1e-6 ? `a ${m(abajo)} de altura` : `de ${n(abajo)} a ${m(arriba)} de altura`);
  return detalles;
}
