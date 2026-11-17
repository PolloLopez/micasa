// ==========================================================
// COMPRAS HECHAS Y CONTRATISTAS (v1.69)
// ----------------------------------------------------------
// Pedido de Leandro: "quiero ir ingresando las compras que ya realicé
// (x bolsas de cemento para los pilotines, los fierros que ya compré) y que
// vaya descontando del total; marcar lo que ya está pago, qué contratista lo
// realizó y agrupar lo que hacen los distintos contratistas".
// Eligió: compras por material de la lista Y tickets sueltos; el presupuesto
// muestra total, gastado y lo que falta; una lista de contratistas; una
// compra queda pagada entera al cargarla (si no, se marca lo que falta).
//
// Se guarda en params.seguimiento:
//   compras:      [{ id, fecha, proveedor, nota, pagada, faltaPagar, renglones }]
//     renglón:    { id, material, nombre, cantidad, unidad, monto, para }
//                 material = la clave de la lista de materiales (perfil o insumo), '' = ticket suelto
//   contratistas: [{ id, nombre, oficio, telefono }]  (cada rubro elige uno: rubro.contratista = id)
// ==========================================================

import { hoy } from './seguimiento.js';

const siguienteId = (lista) => Math.max(0, ...lista.map((x) => x.id)) + 1;

export function compraNueva(compras, fecha = hoy()) {
  return { id: siguienteId(compras), fecha, proveedor: '', nota: '', pagada: true, faltaPagar: 0, renglones: [] };
}

/**
 * Un renglón de una compra.
 * @param material de la lista de materiales ({ clave, nombre, unidad, precio }) o null para un ticket suelto
 */
export function renglonNuevo(renglones, material = null) {
  return {
    id: siguienteId(renglones), material: material?.clave ?? '', nombre: material?.nombre ?? '',
    cantidad: material ? 1 : 0, unidad: material?.unidad ?? '', monto: material ? Math.round(material.precio ?? 0) : 0, para: '',
  };
}

export const contratistaNuevo = (contratistas, nombre = '') => ({ id: siguienteId(contratistas), nombre: nombre || `Contratista ${contratistas.length + 1}`, oficio: '', telefono: '' });

/** Total de una compra y lo que se pagó de ella. */
export function cuentasDeCompra(c) {
  const total = c.renglones.reduce((a, r) => a + r.monto, 0);
  const falta = c.pagada ? 0 : Math.min(total, c.faltaPagar);
  return { total, pagado: total - falta, falta };
}

/** Lo comprado de cada material de la lista (por su clave): cantidad y plata. */
export function compradoPorMaterial(compras = []) {
  const por = new Map();
  compras.forEach((c) => c.renglones.filter((r) => r.material).forEach((r) => {
    const x = por.get(r.material) ?? { cantidad: 0, monto: 0 };
    x.cantidad = Math.round((x.cantidad + r.cantidad) * 100) / 100;
    x.monto += r.monto;
    por.set(r.material, x);
  }));
  return por;
}

/**
 * La lista de materiales con lo ya comprado: cada material dice cuánto se compró y cuánto falta (y su plata a los
 * precios del presupuesto). Lo que se compró de más no resta de otros materiales.
 * @returns materiales [{ ...m, comprado, faltaCantidad, faltaMonto }]
 */
export function materialesConCompras(materiales, compras = []) {
  const por = compradoPorMaterial(compras);
  return materiales.map((m) => {
    const comprado = por.get(m.clave)?.cantidad ?? 0;
    const faltaCantidad = Math.max(0, Math.round((m.cantidad - comprado) * 100) / 100);
    const unitario = m.cantidad > 0 ? m.subtotal / m.cantidad : m.precio ?? 0;
    return { ...m, comprado, faltaCantidad, faltaMonto: Math.round(faltaCantidad * unitario) };
  });
}

/**
 * Total, gastado y lo que falta (de materiales).
 *   gastado = todo lo comprado (lo pagado y lo que se debe de esas compras)
 *   falta   = lo que falta comprar a los precios del presupuesto (material por material), menos los tickets sueltos
 *             (plata que no se sabe a qué material fue: se descuenta del total)
 * @param totalMateriales el total de materiales del presupuesto
 */
export function resumenDeCompras(materiales, compras = [], totalMateriales = 0) {
  const conCompras = materialesConCompras(materiales, compras);
  const cuentas = compras.map(cuentasDeCompra);
  const gastado = cuentas.reduce((a, c) => a + c.total, 0);
  const deuda = cuentas.reduce((a, c) => a + c.falta, 0);
  const sueltos = compras.reduce((a, c) => a + c.renglones.filter((r) => !r.material).reduce((b, r) => b + r.monto, 0), 0);
  const compradoDeLista = materiales.length > 0 ? conCompras.reduce((a, m) => a + (m.subtotal - m.faltaMonto), 0) : 0;
  // Lo que falta: el total menos lo que ya está comprado de la lista (a precio del presupuesto) y los tickets.
  const falta = Math.max(0, Math.round(totalMateriales - compradoDeLista - sueltos));
  return { gastado, deuda, pagado: gastado - deuda, falta, sueltos, compras: compras.length, materiales: conCompras };
}

// ---------- contratistas ----------

/**
 * Los trabajos (rubros) de cada contratista, con lo contratado, lo pagado y lo que falta. Los rubros sin contratista
 * que no son de materiales quedan en "Sin asignar".
 * @param cuentasDe (rubro) => { contratado, pagado, saldo } (cuentasDelRubro)
 */
export function trabajosPorContratista(seguimiento, cuentasDe) {
  const contratistas = seguimiento?.contratistas ?? [];
  const rubros = (seguimiento?.rubros ?? []).filter((r) => !esDeMateriales(r));
  const grupo = (c, lista) => {
    const cuentas = lista.map((r) => ({ rubro: r, ...cuentasDe(r) }));
    const suma = (k) => cuentas.reduce((a, x) => a + x[k], 0);
    return { contratista: c, trabajos: cuentas, contratado: suma('contratado'), pagado: suma('pagado'), falta: suma('saldo') };
  };
  const grupos = contratistas.map((c) => grupo(c, rubros.filter((r) => r.contratista === c.id)));
  const sinAsignar = rubros.filter((r) => !contratistas.some((c) => c.id === r.contratista));
  if (sinAsignar.length) grupos.push(grupo(null, sinAsignar));
  return grupos;
}

/** ¿Es un rubro de materiales (de un proveedor o de una instalación)? Esos no son trabajos de un contratista. */
export const esDeMateriales = (r) => r.origen === 'materiales' || r.origen.startsWith('proveedor:') || r.origen.startsWith('instalacion:');

/**
 * Para los proyectos de antes: una lista de contratistas armada con los nombres de "Quién" de los trabajos
 * (no de los de materiales), y cada trabajo apuntando al suyo.
 */
export function contratistasDesdeQuien(rubros) {
  const contratistas = [];
  const conContratista = rubros.map((r) => {
    if (r.contratista != null || esDeMateriales(r) || !(r.quien ?? '').trim()) return { contratista: null, ...r };
    const nombre = r.quien.trim();
    let c = contratistas.find((x) => x.nombre.toLowerCase() === nombre.toLowerCase());
    if (!c) { c = contratistaNuevo(contratistas, nombre); contratistas.push(c); }
    return { ...r, contratista: c.id };
  });
  return { contratistas, rubros: conContratista };
}

// ---------- validación ----------

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const monto = (n) => Number.isFinite(n) && n >= 0 && n <= 1e13;
const texto = (t, n) => typeof t === 'string' && t.length <= n;

/** Error de una compra (o null). */
export function errorDeCompra(c) {
  if (!c || typeof c.fecha !== 'string' || !FECHA.test(c.fecha)) return 'Fecha inválida';
  if (!texto(c.proveedor, 60) || !texto(c.nota, 120)) return 'Texto demasiado largo';
  if (typeof c.pagada !== 'boolean' || !monto(c.faltaPagar)) return 'Lo que falta pagar no puede ser negativo';
  if (!Array.isArray(c.renglones)) return 'Renglones inválidos';
  const malo = c.renglones.find((r) => !texto(r.material, 80) || !texto(r.nombre, 80) || !texto(r.unidad, 20) || !texto(r.para, 60)
    || !(Number.isFinite(r.cantidad) && r.cantidad >= 0 && r.cantidad <= 1e6) || !monto(r.monto));
  return malo ? 'Revisá los renglones: cantidad y monto no negativos' : null;
}

export function errorDeContratista(c) {
  if (!c || !texto(c.nombre, 60) || !texto(c.oficio, 60) || !texto(c.telefono, 40)) return 'Texto demasiado largo';
  return null;
}
