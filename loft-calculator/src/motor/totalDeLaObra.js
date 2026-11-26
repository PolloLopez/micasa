// ==========================================================
// EL TOTAL DE LA OBRA, DICHO ENTERO (v1.100)
// ----------------------------------------------------------
// Auditoría 26/11: la pestaña Presupuesto mostraba "$ 34,3 M" y Leandro lo
// leyó como "lo que falta" ("estoy lejísimos de eso"). Era el precio de TODA
// la obra (materiales + mano de obra y cierre), sin restar lo pagado y sin
// decir que 27 materiales no tienen precio. Además "a futuro" estaba en tres
// lugares (Fundación, Mano de obra y la Lista de compras) y nunca se usó.
//
// Acá van:
//   - las partes de la obra "a futuro" (una sola idea para todo): sus
//     materiales no entran al total ni a lo que falta, se ven aparte;
//   - el resumen: obra completa, ya pagado, falta, sin precio y a futuro.
// ==========================================================

import { A_FUTURO, NINGUNO } from './proveedores.js';
import { parteDeItem, OBRA_CIVIL } from './partesObra.js';

/** La parte del tapial (su obra civil se calcula aparte: ver obraCivil.tapial.aFuturo). */
export const PARTE_TAPIAL = 'oc:tapial';

/**
 * Las partes de la obra a futuro (claves de partesObra: 'escalera', 'oc:tapial', …).
 * El tapial se guarda en obraCivil.tapial.aFuturo (así su cemento, arena y ladrillos se sacan de la cuenta de obra
 * civil, que se calcula con la estructura); las demás, en seguimiento.aFuturo.
 * @returns {Set<string>}
 */
export function partesAFuturo(params) {
  const partes = new Set(params?.seguimiento?.aFuturo ?? []);
  if (params?.obraCivil?.tapial?.aFuturo) partes.add(PARTE_TAPIAL);
  return partes;
}

/**
 * Los cambios para poner (o sacar) una parte a futuro, para cambiarVarios: [[ruta, valor]].
 * Una sola función para los tres lugares desde donde se toca (Obra → Partes, la Lista de compras y Fundación).
 */
export function cambiosParteAFuturo(params, clave, aFuturo) {
  if (clave === PARTE_TAPIAL) return [['obraCivil.tapial.aFuturo', aFuturo]];
  const actuales = (params?.seguimiento?.aFuturo ?? []).filter((c) => c !== clave);
  return [['seguimiento.aFuturo', aFuturo ? [...actuales, clave] : actuales]];
}

/**
 * Las asignaciones de la lista de compras con los renglones de las partes a futuro puestos "a futuro". Un renglón
 * que se eligió a mano "no se lo compro a nadie" queda así (ya está fuera del total). Si no hay partes a futuro,
 * devuelve el mismo objeto (así los useMemo no recalculan).
 */
export function asignacionesConFuturo(asignaciones = {}, items = [], estructura = null, futuras = new Set()) {
  if (futuras.size === 0) return asignaciones;
  const nuevas = { ...asignaciones };
  items.forEach((i) => {
    if (nuevas[i.id] === NINGUNO) return;
    if (futuras.has(parteDeItem(i, estructura))) nuevas[i.id] = A_FUTURO;
  });
  return nuevas;
}

/** Lo que suman los renglones de las partes a futuro (para restarlo cuando el total no sale del plan de compra). */
export function subtotalAFuturo(items = [], estructura = null, futuras = new Set()) {
  if (futuras.size === 0) return 0;
  return items.filter((i) => futuras.has(parteDeItem(i, estructura))).reduce((a, i) => a + (i.subtotal ?? 0), 0);
}

/**
 * Cuánto saldría la obra civil del tapial a futuro (cemento, arena, ladrillos…), con el precio por unidad de cada
 * material en la obra. Los que no tienen precio se cuentan aparte.
 * @param materiales  estructura.obraCivil.aFuturo.materiales (o null)
 * @param precioDe    (clave del material) => precio por unidad, o null
 */
export function montoDeObraCivilAFuturo(materiales, precioDe) {
  if (!materiales) return { monto: 0, sinPrecio: 0 };
  let monto = 0;
  let sinPrecio = 0;
  Object.entries(OBRA_CIVIL).forEach(([clave, campo]) => {
    const cantidad = materiales[campo] ?? 0;
    if (!(cantidad > 0)) return;
    const precio = precioDe(clave);
    if (precio > 0) monto += cantidad * precio; else sinPrecio += 1;
  });
  return { monto: Math.round(monto), sinPrecio };
}

/** Los materiales sin precio, uno por material (varios renglones pueden ser del mismo caño). */
export function materialesSinPrecio(items = []) {
  return [...new Map(items.map((i) => [i.perfilId ?? i.id, i])).values()];
}

/**
 * El resumen de la plata de la obra.
 * @param precioObra   lo que cuesta toda la obra (materiales + mano de obra, imprevistos, ganancia, IVA)
 * @param materiales   la parte de materiales de ese precio
 * @param pagado       todo lo pagado (resumenSeguimiento: trabajos + compras)
 * @param compras      resumenDeCompras ({ falta, deuda, pagado })
 * @param sinPrecio    cuántos materiales no tienen precio (no están en ningún número)
 * @param aFuturo      { materiales, manoDeObra } en $ (no suman)
 * @returns {{ obra, materiales, manoDeObra, pagado, falta, faltaMateriales, faltaManoDeObra, sinPrecio, aFuturo, conAvance }}
 */
export function resumenDelTotal({ precioObra = 0, materiales = 0, pagado = 0, compras = null, sinPrecio = 0, aFuturo = {} }) {
  const manoDeObra = Math.max(0, precioObra - materiales);
  // Materiales: lo que falta comprar (ya descuenta las compras y las partes terminadas) + lo retirado sin pagar.
  const faltaMateriales = compras ? compras.falta + compras.deuda : materiales;
  // Mano de obra y cierre: lo presupuestado menos lo pagado que no fue de compras (los pagos a contratistas).
  const pagadoTrabajos = Math.max(0, pagado - (compras?.pagado ?? 0));
  const faltaManoDeObra = Math.max(0, manoDeObra - pagadoTrabajos);
  const futuro = { materiales: Math.round(aFuturo.materiales ?? 0), manoDeObra: Math.round(aFuturo.manoDeObra ?? 0) };
  return {
    obra: Math.round(precioObra), materiales: Math.round(materiales), manoDeObra: Math.round(manoDeObra), pagado: Math.round(pagado),
    falta: Math.round(faltaMateriales + faltaManoDeObra), faltaMateriales: Math.round(faltaMateriales), faltaManoDeObra: Math.round(faltaManoDeObra),
    sinPrecio, aFuturo: { ...futuro, total: futuro.materiales + futuro.manoDeObra }, conAvance: pagado > 0,
  };
}
