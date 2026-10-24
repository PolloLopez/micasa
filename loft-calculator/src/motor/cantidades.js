// ==========================================================
// SEPARACIONES POR MEDIDA O POR CANTIDAD (v1.27)
// ----------------------------------------------------------
// Cada separación se puede cargar como MEDIDA ("cada 0,60 m") o como
// CANTIDAD ("4 columnas"): params.cantidades = { <ruta del campo>: n }.
// Con cantidad, la separación sale de repartir parejo ese largo:
//   'conExtremos'  n cuenta las dos puntas (columnas de una pared, columnas
//                  del borde libre, correas del techo): largo / (n − 1)
//   'interiores'   n piezas entre las puntas (fajas, tirantes, transversales,
//                  vigas del techo): largo / (n + 1)
//   montantes      n por vano entre cada par de columnas (ver generarMontantes)
// Sin cantidad se usa la medida cargada, como siempre.
// ==========================================================

import { LADOS } from './constantes.js';

/** Rutas que aceptan cantidad, con cómo se cuenta. Los opcionales aceptan 0 (= sin). */
export const CAMPOS_CON_CANTIDAD = {
  separacionPiso: { modo: 'interiores', minimo: 1 },
  separacionTransversalesPiso: { modo: 'interiores', minimo: 0 },
  separacionPiso2: { modo: 'interiores', minimo: 1 },
  separacionTransversalesPiso2: { modo: 'interiores', minimo: 0 },
  separacionColumnasEntrepiso: { modo: 'conExtremos', minimo: 2 },
  separacionVigasTecho: { modo: 'interiores', minimo: 1 },
  separacionCorreasTecho: { modo: 'conExtremos', minimo: 2 },
  ...Object.fromEntries(LADOS.flatMap((l) => [
    [`paredes.${l}.separacionVerticales`, { modo: 'conExtremos', minimo: 2 }],
    [`paredes.${l}.separacionHorizontales`, { modo: 'interiores', minimo: 1 }],
    [`paredes.${l}.separacionMontantes`, { modo: 'porVano', minimo: 0 }],
  ])),
};
export const MAXIMO_CANTIDAD = 200;

/** Cantidad cargada para un campo (o null si se cargó por medida). */
export const cantidadDe = (params, ruta) => {
  const n = params.cantidades?.[ruta];
  return Number.isInteger(n) && n >= 0 ? n : null;
};

const valorEnRuta = (obj, ruta) => ruta.split('.').reduce((o, k) => o?.[k], obj);

/**
 * Separación a usar en un campo: la medida cargada o, si se cargó por cantidad,
 * la que reparte parejo `largo`. 0 = sin piezas (campos opcionales).
 */
export function separacionDe(params, ruta, largo) {
  const n = cantidadDe(params, ruta);
  if (n === null) return valorEnRuta(params, ruta);
  if (n === 0) return 0;
  return CAMPOS_CON_CANTIDAD[ruta]?.modo === 'conExtremos' ? largo / Math.max(1, n - 1) : largo / (n + 1);
}

