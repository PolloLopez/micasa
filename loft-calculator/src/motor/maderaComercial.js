// ==========================================================
// TIRANTES DE MADERA POR LARGO COMERCIAL (v1.77)
// ----------------------------------------------------------
// Pendiente (desde v1.43): "tirantes de madera por metro: comprarlos por largo
// comercial con el optimizador". La madera se vende en largos fijos (en pies):
// 3,05 m (10'), 3,66 m (12'), 4,27 m (14') y 4,88 m (16'). Antes se pedían
// los metros justos (la suma de los tirantes), y en el aserradero te venden
// tablas enteras: siempre faltaba.
//
// Cómo se elige (sin sobreingeniería, dos ideas y se queda con la que menos
// metros compra):
//   A) cada tirante con la tabla más corta que le alcanza (si es más largo que
//      la más larga, va empalmado en las que hagan falta);
//   B) todo de un mismo largo, cortando varios tirantes de cada tabla con el
//      optimizador de cortes (el mismo del hierro), probando cada largo.
// ==========================================================

import { optimizarCortes } from './optimizadorCortes.js';

/** Largos que se consiguen (m). */
export const LARGOS_MADERA = [3.05, 3.66, 4.27, 4.88];
const MERMA_SIERRA = 0.005; // lo que se lleva la sierra en cada corte

const redondo = (n) => Math.round(n * 100) / 100;
const resumen = (porLargo, netos) => {
  const tablas = [...porLargo.entries()].filter(([, n]) => n > 0).sort((a, b) => a[0] - b[0]).map(([largo, cantidad]) => ({ largo, cantidad }));
  const metros = redondo(tablas.reduce((a, t) => a + t.largo * t.cantidad, 0));
  return { tablas, metros, sobra: redondo(Math.max(0, metros - netos)) };
};

/** Idea A: cada tirante con la tabla más corta que le alcanza (los muy largos, empalmados). */
function unaTablaPorTirante(largos, comerciales) {
  const porLargo = new Map();
  const mayor = comerciales[comerciales.length - 1];
  largos.forEach((l) => {
    const n = Math.ceil(l / mayor - 1e-9); // tablas que hacen falta (1 si entra en la más larga)
    const largo = comerciales.find((c) => c * n >= l - 1e-9) ?? mayor;
    porLargo.set(largo, (porLargo.get(largo) ?? 0) + n);
  });
  return porLargo;
}

/**
 * Las tablas que hay que comprar para cortar los tirantes.
 * @param largos      largos de los tirantes (m)
 * @param comerciales largos que se venden (m), de menor a mayor
 * @returns {{ tablas: {largo, cantidad}[], metros, sobra, detalle }}
 */
export function tablasDeMadera(largos, comerciales = LARGOS_MADERA) {
  const piezas = largos.filter((l) => l > 0);
  const lista = [...comerciales].filter((c) => c > 0).sort((a, b) => a - b);
  if (!piezas.length || !lista.length) return { tablas: [], metros: 0, sobra: 0, detalle: 'no lleva' };
  const netos = piezas.reduce((a, l) => a + l, 0);
  const opciones = [resumen(unaTablaPorTirante(piezas, lista), netos)];
  lista.forEach((c) => {
    const r = optimizarCortes(piezas, c, { merma: MERMA_SIERRA });
    opciones.push(resumen(new Map([[c, r.totalBarras]]), netos));
  });
  const mejor = opciones.reduce((a, b) => (b.metros < a.metros - 1e-9 ? b : a));
  const n = (v) => v.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const detalle = `${mejor.tablas.map((t) => `${t.cantidad} de ${n(t.largo)} m`).join(' + ')} (${piezas.length} tirantes, sobran ${n(mejor.sobra)} m)`;
  return { ...mejor, detalle };
}
