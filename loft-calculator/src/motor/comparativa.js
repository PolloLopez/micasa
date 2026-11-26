// ==========================================================
// COMPARATIVA DE REVESTIMIENTOS (v1.59)
// ----------------------------------------------------------
// Pedido de Leandro (12/11): comparar materiales para que el herrero elija
// el que va a usar (ej. panel de 50 mm contra uno de 10 mm). Para cada tipo
// de panel del catálogo se arma la obra con ESE panel en todas las paredes
// (por fuera) y se calcula el presupuesto completo: así la diferencia
// incluye todo lo que cambia (las tiras o placas, los recortes, las juntas).
// El techo y los revestimientos interiores quedan como están (v1.102: salvo el interior que va con el panel).
// ==========================================================

import { generarEstructura } from './estructura.js';
import { calcularPresupuesto, tiposDePanel } from './presupuesto.js';
import { LADOS } from './constantes.js';
import { baseDeRevestimiento } from './consumibles.js';

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
 * v1.102 (Leandro: "chapa trapezoidal sin aislante, manta de lana de vidrio y placas de fenólico… para calcular y
 * comparar, también la mano de obra del revestimiento"): cada revestimiento lleva sus CAPAS (los materiales que se
 * estiman con sus m²: lana, membrana, listones, tacos) y su interior (el fenólico), que entran solos al total porque
 * se calcula la obra entera con él. Además, la mano de obra de colocarlo ($ por m² de pared) y el total con ella.
 * Los revestimientos que solo van como interior de otro (el fenólico) no se prueban por fuera.
 * @param opciones las mismas de calcularPresupuesto (proveedor, pago, excedente…)
 * @returns {{ id, nombre, perfil, espesor, cantidad, unidad, precio, total, m2, manoDeObra, totalConManoDeObra,
 *   capas: { nombre, cantidad, unidad, subtotal }[], diferencia, actual, sinPrecio }[]}  ordenado por el total con mano de obra
 */
export function compararRevestimientos(params, aberturas, catalogo, opciones = {}) {
  const actuales = new Set(LADOS.map((l) => params.paredes[l].panel));
  const tipos = tiposDePanel(catalogo);
  const soloInterior = new Set(tipos.map((t) => t.interior).filter(Boolean));
  const cuentas = (p, tipo) => {
    const estructura = generarEstructura(p, aberturas, catalogo);
    const { items, total } = calcularPresupuesto(estructura, catalogo, opciones);
    const m2 = estructura.superficies?.murosNetos ?? 0;
    const manoDeObra = Math.round(m2 * (tipo?.manoDeObraM2 ?? 0));
    return { items, total, m2, manoDeObra };
  };
  // Lo de ahora (con la mano de obra del revestimiento de cada pared: si son todas iguales, la de ese).
  const tipoActual = actuales.size === 1 ? tipos.find((t) => actuales.has(t.id)) : null;
  const ahora = cuentas(params, tipoActual);
  const totalActual = ahora.total + ahora.manoDeObra;
  return tipos.filter((tipo) => !soloInterior.has(tipo.id) || actuales.has(tipo.id)).map((tipo) => {
    const { items, total, m2, manoDeObra } = cuentas(conPanelEnParedes(params, tipo.id), tipo);
    const item = items.find((i) => i.id === tipo.id);
    // Sus capas: los materiales que se estiman con sus m² y su revestimiento interior.
    const base = baseDeRevestimiento(tipo.id);
    const capas = items.filter((i) => i.base === base && i.cantidad > 0)
      .concat(tipo.interior ? items.filter((i) => i.id === tipo.interior && i.cantidad > 0) : [])
      .map((i) => ({ nombre: i.nombre, cantidad: i.cantidad, unidad: i.unidad, subtotal: Math.round(i.subtotal ?? (i.cantidad * (i.precio ?? 0))) }));
    return {
      id: tipo.id, nombre: tipo.nombre, perfil: tipo.perfil, espesor: espesorDelPanel(tipo),
      cantidad: item?.cantidad ?? 0, unidad: item?.unidad ?? '', precio: item?.precio ?? 0, total,
      m2, manoDeObra, totalConManoDeObra: total + manoDeObra, capas,
      diferencia: total + manoDeObra - totalActual, actual: actuales.size === 1 && actuales.has(tipo.id), sinPrecio: !(item?.precio > 0),
    };
  }).sort((a, b) => a.totalConManoDeObra - b.totalConManoDeObra);
}
