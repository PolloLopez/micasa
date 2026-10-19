// ==========================================================
// MEDICIÓN EN EL 3D (v1.16: botón "📏 Medir")
// ----------------------------------------------------------
// El herrero toca dos cosas en el 3D y ve la distancia.
//   - Si toca un hierro, el punto se "pega" al eje de la pieza (el
//     centro del caño): así se mide de eje a eje, como en un plano.
//   - Si toca dos piezas VERTICALES (ej. dos columnas), la medida
//     principal es la horizontal entre sus ejes (la separación), sin
//     importar a qué altura tocó cada una.
//   - Si no, la principal es la distancia en línea recta.
// Funciones puras: se testean sin navegador.
// ==========================================================

const esVerticalPieza = (p) => Boolean(p) && Math.hypot(p.hasta[0] - p.desde[0], p.hasta[2] - p.desde[2]) < 1e-6;

/** Punto del eje de la pieza (segmento desde-hasta) más cercano a `punto`. */
export function puntoMasCercanoEnPieza(pieza, punto) {
  const d = pieza.hasta.map((v, i) => v - pieza.desde[i]);
  const largo2 = d[0] ** 2 + d[1] ** 2 + d[2] ** 2;
  if (largo2 === 0) return [...pieza.desde];
  const t = Math.min(1, Math.max(0, ((punto[0] - pieza.desde[0]) * d[0] + (punto[1] - pieza.desde[1]) * d[1] + (punto[2] - pieza.desde[2]) * d[2]) / largo2));
  return pieza.desde.map((v, i) => v + d[i] * t);
}

/**
 * Distancias entre dos puntos.
 * @param piezaA, piezaB piezas tocadas (o null si se tocó un panel, una abertura…)
 * @returns {{ principal, total, horizontal, vertical, entreEjes }}
 */
export function medirEntre(a, b, piezaA = null, piezaB = null) {
  const horizontal = Math.hypot(b[0] - a[0], b[2] - a[2]);
  const vertical = Math.abs(b[1] - a[1]);
  const total = Math.hypot(horizontal, vertical);
  const entreEjes = esVerticalPieza(piezaA) && esVerticalPieza(piezaB);
  return { principal: entreEjes ? horizontal : total, total, horizontal, vertical, entreEjes };
}
