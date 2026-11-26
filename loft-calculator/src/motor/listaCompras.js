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

import { precioEn, NINGUNO, A_FUTURO } from './proveedores.js';
import { parteDeItem, PARTES_FIJAS } from './partesObra.js';
import { cuentasDeCompra } from './compras.js';
import { cantidadPedida } from './proveedores.js';
import { hoy } from './seguimiento.js';

export const NOTA_LISTA = 'Desde la lista de compras'; // v1.74: así se reconocen las compras anotadas desde la lista (para deshacer)
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
    // v1.93: a futuro, el precio más barato que se conozca (para saber cuánto sería, aunque no entre al total).
    const masBarato = () => {
      const precios = material ? proveedores.map((x) => precioEn(material, x, pago)).filter((v) => v !== null && v > 0) : [];
      return precios.length ? Math.min(...precios) : i.precio ?? null;
    };
    const precio = proveedor === NINGUNO ? null : proveedor === A_FUTURO ? masBarato() : p && material ? precioEn(material, p, pago) : i.precio ?? null;
    return fila(i, { proveedor, aMano, precio });
  });
  // v1.100: un extra o una instalación de una parte a futuro va con lo de a futuro (las de toda una instalación: "inst:agua").
  const otroAFuturo = (o) => asignaciones?.[o.id] === A_FUTURO || asignaciones?.[String(o.id).split(':').slice(0, 2).join(':')] === A_FUTURO;
  const todas = [...filas, ...otros.filter((o) => o.cantidad > 0)
    .map((o) => fila(o, { proveedor: otroAFuturo(o) ? A_FUTURO : PROPIO, aMano: null, precio: o.precio ?? 0 }))];
  return repartirPorMaterial(todas, compras);
}

/**
 * v1.92 (Leandro: "cargué 12 perfiles que compré, debería recalcular en los que cargué y los necesarios para ver si
 * realmente siguen faltando"). Antes lo comprado contaba solo en el renglón donde se marcó: 12 barras de 80×80 marcadas
 * en "Columnas" no servían para las soleras ni los bordes, y lo comprado para un renglón que ya no existe (ej. "Marcos de
 * aberturas", que pasó a otro perfil) no contaba en ninguno. Ahora lo comprado es de un MATERIAL (el mismo perfil de la
 * lista): primero cubre su propio renglón y lo que sobra (o lo que no tiene renglón) cubre los demás renglones de ese
 * material, en orden. `deOtros` = cuánto de lo retirado de una fila vino de compras anotadas en otro renglón.
 */
export function repartirPorMaterial(filas, compras = []) {
  const total = new Map(); // clave -> cantidad comprada de ese material (en cualquier renglón o sin renglón)
  compras.forEach((c) => c.renglones.filter((r) => r.material).forEach((r) => total.set(r.material, redondo((total.get(r.material) ?? 0) + r.cantidad))));
  const porClave = new Map();
  filas.forEach((f) => porClave.set(f.clave, [...(porClave.get(f.clave) ?? []), f]));
  const nuevas = new Map();
  porClave.forEach((lista, clave) => {
    const comprado = total.get(clave) ?? 0;
    // Lo propio de cada renglón (lo anotado en él, hasta lo que lleva).
    const propio = lista.map((f) => Math.min(f.retirado, f.cantidad));
    let libre = redondo(comprado - propio.reduce((a, x) => a + x, 0));
    lista.forEach((f, i) => {
      const extra = f.terminada ? 0 : Math.max(0, Math.min(libre, redondo(f.cantidad - propio[i])));
      libre = redondo(libre - extra);
      const retirado = redondo(propio[i] + extra);
      nuevas.set(f, { ...f, retirado, deOtros: extra, pagado: redondo(retirado - f.sinPagar),
        falta: f.terminada ? 0 : Math.max(0, redondo(f.cantidad - retirado)) });
    });
  });
  return filas.map((f) => nuevas.get(f) ?? f);
}

/**
 * v1.92: cuánto lleva la obra de cada material, cuánto se compró y cuánto falta (o sobra), sumando todos sus renglones.
 * Solo los materiales con más de un renglón o con algo comprado (los demás ya se ven en su fila).
 * @returns {{ clave, material, unidad, largoBarra, lleva, comprado, falta, sobra, renglones }[]}
 */
export function resumenPorMaterial(filas, compras = []) {
  const comprado = new Map();
  compras.forEach((c) => c.renglones.filter((r) => r.material).forEach((r) => comprado.set(r.material, redondo((comprado.get(r.material) ?? 0) + r.cantidad))));
  const por = new Map();
  filas.forEach((f) => {
    const m = por.get(f.clave) ?? { clave: f.clave, material: f.material, unidad: f.unidad, largoBarra: f.largoBarra, lleva: 0, falta: 0, renglones: 0 };
    m.lleva = redondo(m.lleva + f.cantidad);
    m.falta = redondo(m.falta + f.falta);
    m.renglones += 1;
    por.set(f.clave, m);
  });
  return [...por.values()].map((m) => {
    const c = comprado.get(m.clave) ?? 0;
    return { ...m, comprado: c, sobra: Math.max(0, redondo(c - m.lleva)) };
  }).filter((m) => m.renglones > 1 || m.comprado > 0);
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
    : id === A_FUTURO ? 'A futuro (todavía no: no entra en el total)'
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
  const orden = (g) => (g.proveedor === NINGUNO ? 4 : g.proveedor === A_FUTURO ? 3 : g.proveedor === PROPIO ? 2 : g.proveedor ? 0 : 1);
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
    id, fecha, proveedor: nombreProveedor, nota: NOTA_LISTA, pagada, faltaPagar: pagada ? 0 : monto,
    renglones: [{ id: 1, material: fila.clave, renglon: fila.id, nombre: fila.material, cantidad, unidad: fila.unidad, monto, para: fila.parteNombre }],
  };
}

/** Marca como pagadas las compras sin pagar de un renglón (lo retirado que se debía). */
export function pagarRetirado(compras, idRenglon) {
  return compras.map((c) => (!c.pagada && c.renglones.some((r) => r.renglon === idRenglon) ? { ...c, pagada: true, faltaPagar: 0 } : c));
}

// ---------- deshacer (v1.74) ----------
// Pedido (PENDIENTES v1.72): "deshacer una marca de la lista" (antes había que ir a Compras hechas y borrarla).

/** La última compra que se anotó desde la lista para ese renglón (la que "Deshacer" borra), o null. */
export function ultimaDesdeLista(compras = [], idRenglon) {
  const deLaLista = compras.filter((c) => c.nota === NOTA_LISTA && c.renglones.length === 1 && c.renglones[0].renglon === idRenglon);
  return deLaLista.reduce((ultima, c) => (!ultima || c.id > ultima.id ? c : ultima), null);
}

/** Las compras sin la última marca de ese renglón (si la compra se editó a mano y tiene más renglones, no se toca). */
export function deshacerMarca(compras = [], idRenglon) {
  const ultima = ultimaDesdeLista(compras, idRenglon);
  return ultima ? compras.filter((c) => c.id !== ultima.id) : compras;
}

// ---------- para el PDF y el Excel (v1.74) ----------
// Pedido (PENDIENTES v1.69 / v1.72): "las compras y la lista de compras en el PDF y el Excel" (para llevarla al corralón).

const num = (n) => n.toLocaleString('es-AR', { maximumFractionDigits: 2 });

/** El estado de un renglón en palabras (lo usan la pantalla, el PDF y el Excel). @returns [texto, clase] */
export function estadoDeFila(f) {
  if (f.terminada) return ['✓ parte terminada', 'ok'];
  if (f.sinPagar > 0) return [`retirado ${num(f.sinPagar)} sin pagar${f.falta > 0 ? ` · faltan ${num(f.falta)}` : ''}`, 'debe'];
  if (f.retirado > 0 && f.falta === 0) return ['✓ comprado y pagado', 'ok'];
  if (f.retirado > 0) return [`${num(f.retirado)} de ${num(f.cantidad)} · faltan ${num(f.falta)}`, 'parcial'];
  return ['falta', 'falta'];
}

/**
 * La lista de compras (por proveedor) y las compras hechas, listas para imprimir.
 * @param filas  filasDeLaLista(…)
 * @param soloFalta  true = solo lo que falta comprar o se debe (la lista para ir a comprar)
 */
export function informeDeCompras(filas = [], proveedores = [], compras = [], soloFalta = false) {
  const visibles = soloFalta ? filas.filter((f) => f.falta > 0 || f.sinPagar > 0) : filas;
  const grupos = agruparLista(visibles, proveedores).map((g) => ({
    nombre: g.nombre, total: g.total, falta: g.falta, sinPagar: g.sinPagar,
    filas: g.partes.flatMap((p) => p.filas.map((f) => ({
      material: f.material, uso: f.nombre, parte: p.nombre,
      cantidad: cantidadPedida({ cantidad: f.cantidad, unidad: f.unidad, largoBarra: f.largoBarra }),
      falta: f.falta, unidad: f.unidad, subtotal: f.subtotal, estado: estadoDeFila(f)[0],
    }))),
  }));
  const hechas = [...compras].sort((a, b) => a.fecha.localeCompare(b.fecha) || a.id - b.id).map((c) => {
    const cuentas = cuentasDeCompra(c);
    return {
      fecha: c.fecha, proveedor: c.proveedor || 'Sin proveedor', nota: c.nota ?? '',
      que: c.renglones.map((r) => (r.material ? `${num(r.cantidad)} ${r.unidad} ${r.nombre}` : r.nombre || 'ticket')).join(', '),
      total: cuentas.total, pagado: cuentas.pagado, falta: cuentas.falta,
    };
  });
  const totales = agruparLista(filas, proveedores).reduce((a, g) => ({ total: a.total + g.total, falta: a.falta + g.falta, sinPagar: a.sinPagar + g.sinPagar }),
    { total: 0, falta: 0, sinPagar: 0 });
  return { totales, grupos, compras: hechas, gastado: hechas.reduce((a, c) => a + c.pagado, 0), debe: hechas.reduce((a, c) => a + c.falta, 0) };
}
