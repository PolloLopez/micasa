// ==========================================================
// COMPARATIVA DE REVESTIMIENTOS (v1.59)
// ----------------------------------------------------------
// Pedido de Leandro (12/11): comparar materiales para que el herrero elija
// el que va a usar (ej. panel de 50 mm contra uno de 10 mm). Para cada tipo
// de panel del catálogo se arma la obra con ESE panel en todas las paredes
// (por fuera) y se calcula el presupuesto completo: así la diferencia
// incluye todo lo que cambia (las tiras o placas, los recortes, las juntas).
// El techo y los revestimientos interiores quedan como están.
// ==========================================================

import { generarEstructura } from './estructura.js';
import { calcularPresupuesto, tiposDePanel } from './presupuesto.js';
import { LADOS } from './constantes.js';

/** El espesor que dice el nombre del panel ("Panel PUR 50 mm" → 50), o null. */
export const espesorDelPanel = (tipo) => {
  const m = String(tipo.perfil ?? tipo.nombre ?? '').match(/(\d+(?:[.,]\d+)?)\s*mm/i);
  return m ? Number(m[1].replace(',', '.')) : null;
};

/** Los params con el mismo panel exterior en las 4 paredes. */
export const conPanelEnParedes = (params, idPanel) => ({
  ...params, paredes: Object.fromEntries(LADOS.map((l) => [l, { ...params.paredes[l], panel: idPanel }])),
});

/**
 * Cada tipo de panel con lo que costaría la obra si todas las paredes fueran de él.
 * @param opciones las mismas de calcularPresupuesto (proveedor, pago, excedente…)
 * @returns {{ id, nombre, perfil, espesor, cantidad, unidad, precio, total, diferencia, actual, sinPrecio }[]}  ordenado por total
 */
export function compararRevestimientos(params, aberturas, catalogo, opciones = {}) {
  const actuales = new Set(LADOS.map((l) => params.paredes[l].panel));
  const totalActual = calcularPresupuesto(generarEstructura(params, aberturas, catalogo), catalogo, opciones).total;
  return tiposDePanel(catalogo).map((tipo) => {
    const p = conPanelEnParedes(params, tipo.id);
    const { items, total } = calcularPresupuesto(generarEstructura(p, aberturas, catalogo), catalogo, opciones);
    const item = items.find((i) => i.id === tipo.id);
    return {
      id: tipo.id, nombre: tipo.nombre, perfil: tipo.perfil, espesor: espesorDelPanel(tipo),
      cantidad: item?.cantidad ?? 0, unidad: item?.unidad ?? '', precio: item?.precio ?? 0, total,
      diferencia: total - totalActual, actual: actuales.size === 1 && actuales.has(tipo.id), sinPrecio: !(item?.precio > 0),
    };
  }).sort((a, b) => a.total - b.total);
}
