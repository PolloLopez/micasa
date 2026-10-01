// ==========================================================
// OPTIMIZADOR DE CORTES 1D
// ----------------------------------------------------------
// Problema: tengo una lista de piezas (ej. 4,50 m, 4,50 m, 0,90 m...)
// y barras comerciales de largo fijo (ej. 6 m). ¿Cuántas barras compro?
//
// Algoritmo "First Fit Decreasing" (FFD = primer ajuste decreciente):
//   1. Ordeno las piezas de mayor a menor.
//   2. Cada pieza va a la primera barra donde entre.
//   3. Si no entra en ninguna, abro una barra nueva.
// No siempre da el óptimo matemático, pero queda muy cerca y es simple.
// ==========================================================

import { MERMA_POR_CORTE } from './constantes.js';

const TOLERANCIA = 1e-9; // evita errores de redondeo de punto flotante

/**
 * Divide una pieza más larga que la barra en tramos que sí entran.
 * Ej: correa de 7,50 m con barras de 6 m => [6, 1.5] (va empalmada).
 */
export function dividirPiezaLarga(largoPieza, largoBarra) {
  const tramos = [];
  let restante = largoPieza;
  while (restante > largoBarra + TOLERANCIA) {
    tramos.push(largoBarra);
    restante -= largoBarra;
  }
  if (restante > TOLERANCIA) tramos.push(Number(restante.toFixed(4)));
  return tramos;
}

/**
 * Calcula cuántas barras hacen falta y cómo cortar cada una.
 * @param {number[]} piezas - largos en metros
 * @param {number} largoBarra - largo comercial de la barra en metros
 * @param {number} merma - material perdido por cada corte
 * @returns {{barras, totalBarras, metrosNetos, metrosDesperdicio, porcentajeDesperdicio, piezasEmpalmadas}}
 */
export function optimizarCortes(piezas, largoBarra, merma = MERMA_POR_CORTE) {
  const vacio = {
    barras: [],
    totalBarras: 0,
    metrosNetos: 0,
    metrosDesperdicio: 0,
    porcentajeDesperdicio: 0,
    piezasEmpalmadas: 0,
  };
  if (!Array.isArray(piezas) || piezas.length === 0 || !(largoBarra > 0)) return vacio;

  // 1) Piezas más largas que la barra se parten en tramos (empalme).
  let piezasEmpalmadas = 0;
  const piezasCortables = [];
  piezas
    .filter((p) => p > 0)
    .forEach((p) => {
      if (p > largoBarra + TOLERANCIA) {
        piezasEmpalmadas++;
        piezasCortables.push(...dividirPiezaLarga(p, largoBarra));
      } else {
        piezasCortables.push(p);
      }
    });

  // 2) First Fit Decreasing.
  const ordenadas = [...piezasCortables].sort((a, b) => b - a);
  const barras = [];
  ordenadas.forEach((pieza) => {
    const barraLibre = barras.find(
      (b) => b.usado + merma + pieza <= largoBarra + TOLERANCIA
    );
    if (barraLibre) {
      // Cada pieza adicional en la barra suma un corte (merma).
      barraLibre.piezas.push(pieza);
      barraLibre.usado += merma + pieza;
    } else {
      barras.push({ numero: barras.length + 1, piezas: [pieza], usado: pieza });
    }
  });

  // 3) Resumen.
  const metrosComprados = barras.length * largoBarra;
  const metrosNetos = piezasCortables.reduce((acc, p) => acc + p, 0);
  const metrosDesperdicio = metrosComprados - metrosNetos;

  return {
    barras,
    totalBarras: barras.length,
    metrosNetos,
    metrosDesperdicio,
    porcentajeDesperdicio: metrosComprados > 0 ? (metrosDesperdicio / metrosComprados) * 100 : 0,
    piezasEmpalmadas,
  };
}
