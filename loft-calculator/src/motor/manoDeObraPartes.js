// ==========================================================
// PRESUPUESTOS DE MANO DE OBRA POR PARTE (v1.79)
// ----------------------------------------------------------
// Pedido de Leandro (20/11): "comparar presupuestos de corralones y dos
// albañiles… en tapial, agregar materiales y precio por proveedor, y precio
// de mano de obra. Así sencillo". Eligió: cada albañil cotiza las partes que
// hace con un monto; al elegir uno pasa al presupuesto y al seguimiento.
//
// Se guardan en params.seguimiento.cotizaciones:
//   { id, parte: 'oc:tapial', quien: 'José', contratista: id|null, monto, elegida }
// Al elegir una:
//   - el cierre del Presupuesto tiene la mano de obra de esa parte como un
//     segmento "monto total" (el que ya había con ese nombre, o uno nuevo);
//   - el seguimiento tiene su trabajo (rubro) con ese contratista y unido a la parte.
// ==========================================================

import { completarCierre, segmentoNuevo } from './cierre.js';
import { rubroNuevo } from './seguimiento.js';

/** El segmento de fábrica que corresponde a cada parte (si existe, se usa ese en vez de crear otro). */
const SEGMENTO_DE_PARTE = { pilotines: 'Pilotines', paredes: 'Estructura', revestimiento: 'Revestimiento', tabiques: 'Tabiques', 'oc:tapial': 'Tapial' };
const segmentoDeParte = (clave) => SEGMENTO_DE_PARTE[clave] ?? (/^oc:(pozo|camara)/.test(clave) ? 'Pozo séptico' : null);
// Sin mayúsculas ni tildes, para comparar nombres ("Pozo séptico" = "pozo septico").
const norma = (t) => String(t ?? '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export const cotizacionNueva = (cotizaciones = [], parte) => ({
  id: Math.max(0, ...cotizaciones.map((c) => c.id)) + 1, parte, quien: '', contratista: null, monto: 0, elegida: false,
});

/**
 * Las de una parte, en el orden en que se cargaron (no se reordenan mientras escribís); `masBarata` marca la de
 * menor monto (si hay más de una con monto).
 */
export function cotizacionesDeLaParte(cotizaciones = [], clave) {
  const delaParte = cotizaciones.filter((c) => c.parte === clave).sort((a, b) => a.id - b.id);
  const conMonto = delaParte.filter((c) => c.monto > 0);
  const minimo = conMonto.length > 1 ? Math.min(...conMonto.map((c) => c.monto)) : null;
  return delaParte.map((c) => ({ ...c, masBarata: minimo !== null && c.monto === minimo }));
}

/** Nombre de quien cotiza (el contratista de la lista o lo escrito). */
export const nombreDeCotizacion = (c, contratistas = []) => contratistas.find((x) => x.id === c.contratista)?.nombre || c.quien || 'Sin nombre';

/**
 * Elegir una cotización: los cambios para el cierre y el seguimiento.
 * @returns {{ cotizaciones, segmentos, rubros }} lo nuevo de seguimiento.cotizaciones, cierre.segmentos y seguimiento.rubros
 */
export function elegirCotizacion({ seguimiento = {}, cierre, cotizacion, parteNombre }) {
  const cotizaciones = (seguimiento.cotizaciones ?? []).map((c) => (c.parte === cotizacion.parte ? { ...c, elegida: c.id === cotizacion.id } : c));
  const segmentos = [...completarCierre(cierre).segmentos];
  const porNombre = norma(segmentoDeParte(cotizacion.parte) ?? parteNombre);
  let i = segmentos.findIndex((s) => s.parte === cotizacion.parte);
  if (i < 0) i = segmentos.findIndex((s) => !s.parte && norma(s.nombre) === porNombre);
  // v1.79: si Leandro renombró el segmento ("Pozo séptico-Jose", "Pilotines+Pilar") se lo reconoce igual por
  // contener el nombre; si no, se crearía uno nuevo y esa mano de obra se sumaría dos veces.
  if (i < 0 && porNombre) i = segmentos.findIndex((s) => !s.parte && norma(s.nombre).includes(porNombre));
  const base = i >= 0 ? segmentos[i] : segmentoNuevo(segmentos);
  const segmento = { ...base, nombre: (i >= 0 ? base.nombre : parteNombre).slice(0, 40), modo: 'global', valor: cotizacion.monto, parte: cotizacion.parte };
  if (i >= 0) segmentos[i] = segmento; else segmentos.push(segmento);

  const contratistas = seguimiento.contratistas ?? [];
  const quien = nombreDeCotizacion(cotizacion, contratistas);
  const origen = `manoDeObra:${segmento.id}`;
  const rubros = [...(seguimiento.rubros ?? [])];
  const j = rubros.findIndex((r) => r.origen === origen);
  const datos = { quien, contratista: cotizacion.contratista ?? null, parteObra: cotizacion.parte, contratado: null };
  if (j >= 0) rubros[j] = { ...rubros[j], ...datos };
  else rubros.push({ ...rubroNuevo(rubros, { nombre: `Mano de obra — ${segmento.nombre}`, origen, quien }), ...datos });
  return { cotizaciones, segmentos, rubros };
}

const texto = (t, n) => typeof t === 'string' && t.length <= n;
export function errorDeCotizacion(c) {
  if (!c || !Number.isInteger(c.id) || !texto(c.parte, 60) || !texto(c.quien, 60)) return 'Presupuesto de mano de obra inválido';
  if (!(c.contratista === null || c.contratista === undefined || Number.isInteger(c.contratista))) return 'Contratista inválido';
  if (!(Number.isFinite(c.monto) && c.monto >= 0 && c.monto <= 1e12)) return 'Monto inválido';
  if (c.elegida !== undefined && typeof c.elegida !== 'boolean') return 'Elegida: valor inválido';
  return null;
}
