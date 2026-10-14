// ==========================================================
// UTILIDADES DE PIEZAS (segmentos 3D)
// Las comparten estructura.js y escalera.js.
// ==========================================================

/** Metros -> centímetros enteros (para armar ids estables). */
export const cm = (metros) => Math.round(metros * 100);

/** Pieza lineal entre dos puntos 3D, con id, tipo y grupos (ver estructura.js). */
export function pieza(id, tipo, grupos, desde, hasta) {
  const largo = Math.hypot(hasta[0] - desde[0], hasta[1] - desde[1], hasta[2] - desde[2]);
  return { id, tipo, grupos, desde, hasta, largo: Number(largo.toFixed(4)) };
}

/**
 * Cruz de San Andrés entre dos parantes A y B: dos diagonales
 * (abajo de A -> arriba de B y abajo de B -> arriba de A).
 */
export function cruz(idBase, tipo, grupos, abajoA, arribaA, abajoB, arribaB) {
  return [
    pieza(`${idBase}:a`, tipo, grupos, abajoA, arribaB),
    pieza(`${idBase}:b`, tipo, grupos, abajoB, arribaA),
  ];
}

/** Dirección "hacia adentro" de la planta desde un lado (perpendicular a la pared). */
export function haciaAdentro(geoLado) {
  return [geoLado.direccion[1], -geoLado.direccion[0]];
}
