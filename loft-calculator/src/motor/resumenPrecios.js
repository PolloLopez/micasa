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
import { CATALOGO_FIJO } from './presupuesto.js';

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

// ---------- fecha de los precios (v1.74) ----------
// Pedido (PENDIENTES): "precios sin fecha: con la inflación se vencen rápido; guardar cuándo se actualizó cada
// proveedor y avisar". Cada proveedor guarda `preciosAl` ('AAAA-MM-DD'): se pone sola al cargar o cambiar un precio
// suyo, o a mano con "Siguen iguales hoy".

/** Desde cuántos días un precio se considera viejo (con la inflación, un mes). */
export const DIAS_PRECIO_VIEJO = 30;

const esFecha = (f) => typeof f === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(f) && !Number.isNaN(Date.parse(f));
const dia = (f) => Date.UTC(...f.split('-').map((n, i) => Number(n) - (i === 1 ? 1 : 0)));

/**
 * Qué tan viejos son los precios de un proveedor.
 * @param hoyTexto 'AAAA-MM-DD' (hoy() de seguimiento.js; se pasa para poder testear)
 * @returns {{ fecha, dias, vieja, texto }} o null si no tiene fecha (los cargados antes de v1.74)
 */
export function antiguedadDePrecios(proveedor, hoyTexto) {
  const fecha = proveedor?.preciosAl;
  if (!esFecha(fecha) || !esFecha(hoyTexto)) return null;
  const dias = Math.max(0, Math.round((dia(hoyTexto) - dia(fecha)) / 86_400_000));
  const [, m, d] = fecha.split('-');
  const cuando = dias === 0 ? 'de hoy' : dias === 1 ? 'de ayer' : `del ${d}/${m} (hace ${dias} días)`;
  return { fecha, dias, vieja: dias > DIAS_PRECIO_VIEJO, texto: `precios ${cuando}` };
}

/** Los proveedores activos con precios viejos (para el aviso del Presupuesto). */
export const proveedoresConPreciosViejos = (proveedores = [], hoyTexto) =>
  proveedores.map((p) => ({ proveedor: p, antiguedad: antiguedadDePrecios(p, hoyTexto) })).filter((x) => x.antiguedad?.vieja);

/** ¿Es una fecha válida para guardar? (validación al abrir un proyecto) */
export const fechaDePreciosValida = esFecha;

// ---------- precios de ejemplo (v1.77.1) ----------
// Hasta la v1.77.0, un material que la app agregaba a un proyecto viejo (cemento, arena, soleras PGU, tornillos…)
// recibía su precio DE EJEMPLO en el primer proveedor, como si fuera real. Acá se reconocen los que quedaron
// guardados así, para avisar y poder borrarlos.
const EJEMPLO = new Map(CATALOGO_FIJO.map((i) => [i.id, i.precio]));

/**
 * ¿El precio de este material en este proveedor es el de ejemplo? (mismo número que el de fábrica, sin precio con
 * tarjeta y ningún otro proveedor lo tiene: así quedaban los que puso la app).
 */
export function esPrecioDeEjemplo(material, idProveedor) {
  const ejemplo = EJEMPLO.get(material?.id);
  const p = material?.precios?.[idProveedor];
  if (!(ejemplo > 0) || !p || p.efectivo !== ejemplo || (p.tarjeta !== null && p.tarjeta !== undefined)) return false;
  return Object.entries(material.precios).every(([id, otro]) => id === idProveedor || !(otro?.efectivo >= 0 || otro?.tarjeta >= 0));
}

/** Los materiales con precio de ejemplo en un proveedor. */
export const preciosDeEjemplo = (materiales = [], idProveedor) => materiales.filter((m) => esPrecioDeEjemplo(m, idProveedor));
