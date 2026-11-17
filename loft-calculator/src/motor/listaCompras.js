// ==========================================================
// LISTA DE COMPRAS (v1.72)
// ----------------------------------------------------------
// Pedido de Leandro: "necesito ver los materiales en lista para marcar
// comprados, ver cantidades. A cada proveedor debo eliminar / agregarle
// productos. Por rubro. En el presupuesto también marcar si fue comprado, y
// registrar si lo retiré y no fue abonado".
// Eligió: la lista en el Presupuesto y en Obra; el proveedor se cambia en
// cada renglón ("Se lo compro a…"); al marcar "retirado" o "pagado" se crea
// sola la compra (Compras hechas); se puede marcar una parte de la cantidad.
//
// Un renglón de la lista = un renglón del presupuesto (Columnas, Soleras,
// Cemento…), con su material, su proveedor (el del plan de compra o el
// elegido a mano), su parte de la obra y lo ya retirado / pagado (de las
// compras que lo nombran: renglón de compra con `renglon` = id del renglón).
// ==========================================================

import { precioEn, NINGUNO } from './proveedores.js';
import { parteDeItem, PARTES_FIJAS } from './partesObra.js';
import { cuentasDeCompra } from './compras.js';
import { hoy } from './seguimiento.js';

export const PROPIO = 'propio'; // instalaciones y extras: tienen su propio precio (no van por proveedor)

const redondo = (n) => Math.round(n * 100) / 100;

/** Nombre del material de un renglón ("Caño estructural 80x80x2.0", "Cemento — Cemento portland bolsa 50 kg"). */
const nombreMaterial = (i) => (i.perfilId ? i.perfil : i.perfil ? `${i.nombre} — ${i.perfil}` : i.nombre);

/**
 * Los renglones de la lista de compras.
 * @param items         los del presupuesto de la estructura (calcularPresupuesto)
 * @param plan          el plan de compra (planDeCompra) o null (un solo proveedor)
 * @param asignaciones  { [idRenglón]: idProveedor | NINGUNO } (elegido a mano)
 * @param otros         renglones con precio propio: los materiales de cada instalación y los extras
 * @returns {object[]}  { id, nombre, material, clave, cantidad, unidad, precio, subtotal, proveedor, aMano, parte, parteNombre,
 *                        retirado, sinPagar, pagado, falta, terminada }
 */
export function filasDeLaLista({ items = [], plan = null, catalogo = [], proveedores = [], asignaciones = {}, pago = 'efectivo',
  estructura = null, compras = [], terminadas = [], otros = [], partes = [] }) {
  const delPlan = new Map((plan?.compras ?? []).flatMap((c) => c.renglones.map((r) => [r.id, c.proveedor.id])));
  const nombreParte = (clave) => partes.find((p) => p.clave === clave)?.nombre ?? PARTES_FIJAS.find((p) => p.clave === clave)?.nombre ?? 'Otros';
  const comprado = porRenglon(compras);
  const terminadasSet = new Set(terminadas);
  const fila = (i, { proveedor, aMano, precio }) => {
    const parte = parteDeItem(i, estructura) ?? 'otros';
    const c = comprado.get(i.id) ?? { retirado: 0, sinPagar: 0 };
    const terminada = terminadasSet.has(parte);
    return {
      id: i.id, nombre: i.nombre, material: nombreMaterial(i), clave: i.perfilId ?? i.id,
      cantidad: i.cantidad, unidad: i.unidad, largoBarra: i.perfilId ? i.largoBarra : null,
      precio, subtotal: precio === null ? 0 : Math.round(i.cantidad * precio),
      proveedor, aMano, parte, parteNombre: nombreParte(parte),
      retirado: c.retirado, sinPagar: c.sinPagar, pagado: redondo(c.retirado - c.sinPagar),
      falta: terminada ? 0 : Math.max(0, redondo(i.cantidad - c.retirado)), terminada,
    };
  };
  const materialDe = (i) => catalogo.find((m) => m.id === (i.perfilId ?? i.id));
  const filas = items.filter((i) => i.cantidad > 0 && i.categoria !== 'flete').map((i) => {
    const aMano = asignaciones?.[i.id] ?? null;
    const proveedor = aMano ?? delPlan.get(i.id) ?? (proveedores.length === 1 ? proveedores[0].id : null);
    const p = proveedores.find((x) => x.id === proveedor);
    const material = materialDe(i);
    const precio = proveedor === NINGUNO ? null : p && material ? precioEn(material, p, pago) : i.precio ?? null;
    return fila(i, { proveedor, aMano, precio });
  });
  return [...filas, ...otros.filter((o) => o.cantidad > 0).map((o) => fila(o, { proveedor: PROPIO, aMano: null, precio: o.precio ?? 0 }))];
}

/** Lo retirado de cada renglón (y cuánto de eso falta pagar), de las compras que lo nombran. */
export function porRenglon(compras = []) {
  const por = new Map();
  compras.forEach((c) => c.renglones.filter((r) => r.renglon).forEach((r) => {
    const x = por.get(r.renglon) ?? { retirado: 0, sinPagar: 0 };
    x.retirado = redondo(x.retirado + r.cantidad);
    if (!c.pagada && cuentasDeCompra(c).falta > 0) x.sinPagar = redondo(x.sinPagar + r.cantidad);
    por.set(r.renglon, x);
  }));
  return por;
}

/**
 * Los renglones agrupados por proveedor y, dentro, por parte de la obra (para la lista).
 * @returns {{ proveedor, nombre, total, falta, sinPagar, partes: { clave, nombre, filas }[] }[]}
 */
export function agruparLista(filas, proveedores = []) {
  const nombreProveedor = (id) => (id === NINGUNO ? 'No se compra (lo consigo yo / ya lo tengo)' : id === PROPIO ? 'Instalaciones y extras (precio propio)'
    : proveedores.find((p) => p.id === id)?.nombre ?? 'Sin proveedor (nadie lo vende)');
  const grupos = new Map();
  filas.forEach((f) => {
    const clave = f.proveedor ?? 'sin';
    const g = grupos.get(clave) ?? { proveedor: f.proveedor, nombre: nombreProveedor(f.proveedor), total: 0, falta: 0, sinPagar: 0, porParte: new Map() };
    g.total += f.subtotal;
    g.falta += f.precio ? Math.round(f.falta * f.precio) : 0;
    g.sinPagar += f.precio ? Math.round(f.sinPagar * f.precio) : 0;
    const p = g.porParte.get(f.parte) ?? { clave: f.parte, nombre: f.parteNombre, filas: [] };
    p.filas.push(f);
    g.porParte.set(f.parte, p);
    grupos.set(clave, g);
  });
  const orden = (g) => (g.proveedor === NINGUNO ? 3 : g.proveedor === PROPIO ? 2 : g.proveedor ? 0 : 1);
  return [...grupos.values()].sort((a, b) => orden(a) - orden(b) || b.total - a.total)
    .map(({ porParte, ...g }) => ({ ...g, partes: [...porParte.values()] }));
}

/**
 * La compra que se registra al marcar un renglón como retirado (sin pagar) o pagado.
 * @param cantidad  lo que se retiró (puede ser una parte)
 */
export function compraDesdeLista(compras, fila, cantidad, nombreProveedor, pagada, fecha = hoy()) {
  const id = Math.max(0, ...compras.map((c) => c.id)) + 1;
  const monto = Math.round(cantidad * (fila.precio ?? 0));
  return {
    id, fecha, proveedor: nombreProveedor, nota: 'Desde la lista de compras', pagada, faltaPagar: pagada ? 0 : monto,
    renglones: [{ id: 1, material: fila.clave, renglon: fila.id, nombre: fila.material, cantidad, unidad: fila.unidad, monto, para: fila.parteNombre }],
  };
}

/** Marca como pagadas las compras sin pagar de un renglón (lo retirado que se debía). */
export function pagarRetirado(compras, idRenglon) {
  return compras.map((c) => (!c.pagada && c.renglones.some((r) => r.renglon === idRenglon) ? { ...c, pagada: true, faltaPagar: 0 } : c));
}
