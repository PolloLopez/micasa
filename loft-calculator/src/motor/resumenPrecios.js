// ==========================================================
// RESUMEN DE PRECIOS (v1.65), para la pestaña Materiales
// ----------------------------------------------------------
// Pedido de Leandro: "el tab materiales podría mejorarse, agregando
// materiales y proveedores desde ahí, que sean expansibles". Con todo
// plegado, cada renglón tiene que decir en una línea lo que importa:
//
//   Caño 80x80x2.0 · sin precio en Vastek · desde $ 90.300 en gramabi.com
//   centrosider.com.ar · 14 de 22 precios cargados
//
// Acá están esas cuentas (sin React, para poder testearlas).
// ==========================================================

import { precioEn, MAS_BARATO } from './proveedores.js';

/** Un precio así es casi seguro un error de tipeo (ej. 11.111.111.111.111). */
export const PRECIO_SOSPECHOSO = 1_000_000_000;

const pesos = (n) => n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

/**
 * Los precios de un material en todos los proveedores, del más barato al más caro.
 * @returns {{ proveedor, precio }[]}  solo los proveedores que lo venden
 */
export function preciosOrdenados(item, proveedores, pago = 'efectivo') {
  return proveedores
    .map((proveedor) => ({ proveedor, precio: precioEn(item, proveedor, pago) }))
    .filter((o) => o.precio !== null)
    .sort((a, b) => a.precio - b.precio);
}

/**
 * Texto corto del precio para el encabezado plegado de un material.
 * @param idElegido  el proveedor elegido en el Presupuesto (o MAS_BARATO)
 * @returns {{ texto: string, falta: boolean, sospechoso: boolean }}
 *   falta: el proveedor elegido no lo tiene (el presupuesto lo cuenta en $ 0)
 */
export function textoDePrecio(item, proveedores, idElegido, pago = 'efectivo') {
  const opciones = preciosOrdenados(item, proveedores, pago);
  const sospechoso = opciones.some((o) => o.precio >= PRECIO_SOSPECHOSO);
  if (opciones.length === 0) return { texto: 'sin precio', falta: true, sospechoso };
  const masBarato = opciones[0];
  if (idElegido === MAS_BARATO) {
    return { texto: `${pesos(masBarato.precio)} en ${masBarato.proveedor.nombre}`, falta: false, sospechoso };
  }
  const elegido = proveedores.find((p) => p.id === idElegido) ?? proveedores[0];
  const enElegido = opciones.find((o) => o.proveedor.id === elegido?.id);
  if (!enElegido) {
    return { texto: `sin precio en ${elegido?.nombre ?? 'el proveedor elegido'} · desde ${pesos(masBarato.precio)} en ${masBarato.proveedor.nombre}`, falta: true, sospechoso };
  }
  const extra = masBarato.proveedor.id !== elegido.id ? ` (más barato: ${pesos(masBarato.precio)} en ${masBarato.proveedor.nombre})` : '';
  return { texto: `${pesos(enElegido.precio)} en ${elegido.nombre}${extra}`, falta: false, sospechoso };
}

/**
 * Cuántos de los materiales de la obra tienen precio en un proveedor (para su encabezado plegado).
 * @param materiales  renglones del catálogo que usa esta obra
 * @returns {{ cargados, total, sospechosos }}
 */
export function preciosCargados(proveedor, materiales) {
  const conPrecio = materiales.filter((m) => precioEn(m, proveedor, 'efectivo') !== null);
  return {
    cargados: conPrecio.length,
    total: materiales.length,
    sospechosos: conPrecio.filter((m) => precioEn(m, proveedor, 'efectivo') >= PRECIO_SOSPECHOSO).length,
  };
}
