// ==========================================================
// FINANZAS DE LA OBRA (v1.54)
// ----------------------------------------------------------
// Pedido de Leandro (12/11): el terreno lo paga en cuotas en otra moneda
// (dólares); la cuota inicial y las primeras se las prestaron, así que hay
// que registrar a quién le debe. También dejar previsto un crédito.
//
// Decisiones (respuestas del 12/11):
//   - Cada compromiso guarda su moneda (ARS o USD) y NO se convierte: los
//     dólares se suman con dólares y los pesos con pesos.
//   - Cuotas iguales y mensuales; "semestralmente se paga doble": se eligen los
//     meses del año en que la cuota es doble (de fábrica junio y diciembre).
//   - Un pago puede decir "lo pagó X" (un acreedor): eso es plata que le
//     debés a X. A X le devolvés con "devoluciones". La deuda con X es lo que
//     pagó por vos menos lo que le devolviste (por moneda).
//
// params.finanzas = { compromisos: [...], acreedores: [...] }
// Un compromiso es el terreno, un crédito u otra compra en cuotas:
//   { id, tipo: 'compra'|'credito', nombre, moneda, total, anticipo,
//     cuotas: { cantidad, monto, inicio: 'AAAA-MM', mesesDobles: [6, 12] } | null,
//     pagos: [{ id, fecha, monto, cuota: 0 = anticipo | N, acreedor: id|null, nota }] }
// Las cuotas de los rubros de la obra usan el mismo plan (ver seguimiento.js).
// ==========================================================

import { hoy } from './seguimiento.js';

export const MONEDAS = [['ARS', 'Pesos'], ['USD', 'Dólares']];
export const TIPOS_COMPROMISO = [['compra', 'Compra en cuotas (ej. el terreno)'], ['credito', 'Crédito (préstamo que tomás)']];
export const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export const FINANZAS_INICIALES = { compromisos: [], acreedores: [] };

const siguienteId = (lista) => Math.max(0, ...lista.map((x) => x.id)) + 1;

/** 'AAAA-MM' de hoy (o de la fecha dada). */
export const mesDe = (fecha = hoy()) => fecha.slice(0, 7);

/** Suma meses a 'AAAA-MM'. */
export function sumarMeses(mes, n) {
  const [a, m] = mes.split('-').map(Number);
  const total = a * 12 + (m - 1) + n;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`;
}

/** 'AAAA-MM' → 'jun 2027'. */
export const mesLegible = (mes) => (mes ? `${MESES[Number(mes.slice(5, 7)) - 1].toLowerCase()} ${mes.slice(0, 4)}` : '');

export function planDeCuotasNuevo(monto = 0, inicio = sumarMeses(mesDe(), 1)) {
  return { cantidad: 12, monto, inicio, mesesDobles: [6, 12] };
}

/**
 * El calendario de cuotas: una por mes desde `inicio`; en los meses dobles vale el doble.
 * @returns {{ n, mes, monto, doble }[]}
 */
export function calendarioDeCuotas(plan) {
  if (!plan || !(plan.cantidad > 0)) return [];
  return Array.from({ length: plan.cantidad }, (_, i) => {
    const mes = sumarMeses(plan.inicio, i);
    const doble = (plan.mesesDobles ?? []).includes(Number(mes.slice(5, 7)));
    return { n: i + 1, mes, monto: plan.monto * (doble ? 2 : 1), doble };
  });
}

/**
 * Estado de las cuotas con los pagos (cada pago dice a qué cuota va; sin número, se reparte en orden).
 * @param mesActual 'AAAA-MM' (para saber cuáles ya vencieron)
 * @returns {{ cuotas: { n, mes, monto, doble, pagado, paga, vencida }[], pagas, impagas, vencidasImpagas, proxima, totalCuotas }}
 */
export function estadoDeCuotas(plan, pagos = [], mesActual = mesDe()) {
  const cuotas = calendarioDeCuotas(plan).map((c) => ({ ...c, pagado: 0 }));
  let suelto = 0;
  pagos.forEach((p) => {
    const c = cuotas.find((x) => x.n === p.cuota);
    if (c) c.pagado += p.monto;
    else if (p.cuota !== 0) suelto += p.monto; // sin número de cuota: se aplica a las primeras
  });
  cuotas.forEach((c) => {
    const falta = Math.max(0, c.monto - c.pagado);
    const usa = Math.min(falta, suelto);
    c.pagado += usa;
    suelto -= usa;
  });
  const conEstado = cuotas.map((c) => ({ ...c, paga: c.pagado >= c.monto - 0.5, vencida: c.mes <= mesActual }));
  const impagas = conEstado.filter((c) => !c.paga);
  return {
    cuotas: conEstado,
    pagas: conEstado.length - impagas.length,
    impagas: impagas.length,
    vencidasImpagas: impagas.filter((c) => c.vencida).length,
    proxima: impagas[0] ?? null,
    totalCuotas: conEstado.reduce((a, c) => a + c.monto, 0),
  };
}

/** Texto corto: "3 de 12 cuotas pagas · debés 2 (vencidas) · próxima jun 2027 USD 400 (doble)". */
export function textoDeCuotas(estado, moneda = 'ARS') {
  if (estado.cuotas.length === 0) return '';
  const partes = [`${estado.pagas} de ${estado.cuotas.length} cuotas pagas`];
  if (estado.vencidasImpagas > 0) partes.push(`⚠ ${estado.vencidasImpagas === 1 ? 'debés 1 cuota vencida' : `debés ${estado.vencidasImpagas} cuotas vencidas`}`);
  if (estado.proxima) partes.push(`próxima: cuota ${estado.proxima.n}, ${mesLegible(estado.proxima.mes)}, ${plata(estado.proxima.monto - estado.proxima.pagado, moneda)}${estado.proxima.doble ? ' (doble)' : ''}`);
  else partes.push('todas pagas ✓');
  return partes.join(' · ');
}

/** Plata con su moneda: "$ 1.000" o "USD 1.000". */
export function plata(n, moneda = 'ARS') {
  const numero = Math.round(n).toLocaleString('es-AR');
  return moneda === 'USD' ? `USD ${numero}` : `$ ${numero}`;
}

// ---------- compromisos (terreno, créditos) ----------

export function compromisoNuevo(compromisos, { tipo = 'compra', nombre, moneda = 'USD' } = {}) {
  return {
    id: siguienteId(compromisos), tipo, nombre: nombre ?? (tipo === 'credito' ? 'Crédito' : 'Terreno'), moneda,
    total: 0, anticipo: 0, cuotas: planDeCuotasNuevo(), pagos: [], nota: '',
  };
}

export function pagoDeCompromisoNuevo(pagos, { monto = 0, cuota = null, fecha = hoy() } = {}) {
  return { id: siguienteId(pagos), fecha, monto, cuota, acreedor: null, nota: '' };
}

/**
 * Cuentas de un compromiso: total (si no se cargó, anticipo + cuotas), pagado, falta y las cuotas.
 * @returns {{ total, pagado, falta, anticipoPagado, cuotas: estadoDeCuotas, prestado: { [acreedorId]: monto } }}
 */
export function cuentasDelCompromiso(c, mesActual = mesDe()) {
  const cuotas = estadoDeCuotas(c.cuotas, c.pagos, mesActual);
  const total = c.total > 0 ? c.total : c.anticipo + cuotas.totalCuotas;
  const pagado = c.pagos.reduce((a, p) => a + p.monto, 0);
  const anticipoPagado = c.pagos.filter((p) => p.cuota === 0).reduce((a, p) => a + p.monto, 0);
  const prestado = {};
  c.pagos.filter((p) => p.acreedor).forEach((p) => { prestado[p.acreedor] = (prestado[p.acreedor] ?? 0) + p.monto; });
  return { total, pagado, falta: Math.max(0, total - pagado), anticipoPagado, cuotas, prestado };
}

// ---------- acreedores ----------

export function acreedorNuevo(acreedores, nombre) {
  return { id: siguienteId(acreedores), nombre: nombre ?? `Acreedor ${acreedores.length + 1}`, nota: '', devoluciones: [] };
}

export function devolucionNueva(devoluciones, { monto = 0, moneda = 'USD', fecha = hoy() } = {}) {
  return { id: siguienteId(devoluciones), fecha, monto, moneda, nota: '' };
}

/**
 * Lo que le debés a cada acreedor, por moneda: lo que pagó por vos (pagos con "lo pagó X" en compromisos y en
 * rubros de la obra) menos lo que le devolviste.
 * @param rubros los rubros del seguimiento (sus pagos también pueden tener acreedor; son en pesos)
 * @returns {{ id, nombre, porMoneda: { [moneda]: { prestado, devuelto, debes } }, detalle: { que, fecha, monto, moneda }[] }[]}
 */
export function deudasConAcreedores(finanzas, rubros = []) {
  const f = completarFinanzas(finanzas);
  return f.acreedores.map((a) => {
    const porMoneda = {};
    const sumar = (moneda, campo, monto) => {
      porMoneda[moneda] ??= { prestado: 0, devuelto: 0, debes: 0 };
      porMoneda[moneda][campo] += monto;
    };
    const detalle = [];
    f.compromisos.forEach((c) => c.pagos.filter((p) => p.acreedor === a.id).forEach((p) => {
      sumar(c.moneda, 'prestado', p.monto);
      detalle.push({ que: `${c.nombre}${p.cuota === 0 ? ' — anticipo' : p.cuota ? ` — cuota ${p.cuota}` : ''}`, fecha: p.fecha, monto: p.monto, moneda: c.moneda });
    }));
    rubros.forEach((r) => (r.pagos ?? []).filter((p) => p.acreedor === a.id).forEach((p) => {
      sumar('ARS', 'prestado', p.monto);
      detalle.push({ que: r.nombre, fecha: p.fecha, monto: p.monto, moneda: 'ARS' });
    }));
    a.devoluciones.forEach((d) => sumar(d.moneda, 'devuelto', d.monto));
    Object.values(porMoneda).forEach((m) => { m.debes = Math.max(0, m.prestado - m.devuelto); });
    return { id: a.id, nombre: a.nombre, porMoneda, detalle: detalle.sort((x, y) => x.fecha.localeCompare(y.fecha)) };
  });
}

/** Totales por moneda de todos los compromisos (sin convertir). */
export function resumenDeFinanzas(finanzas, mesActual = mesDe()) {
  const f = completarFinanzas(finanzas);
  const porMoneda = {};
  f.compromisos.forEach((c) => {
    const k = cuentasDelCompromiso(c, mesActual);
    porMoneda[c.moneda] ??= { total: 0, pagado: 0, falta: 0, cuotasVencidas: 0 };
    porMoneda[c.moneda].total += k.total;
    porMoneda[c.moneda].pagado += k.pagado;
    porMoneda[c.moneda].falta += k.falta;
    porMoneda[c.moneda].cuotasVencidas += k.cuotas.vencidasImpagas;
  });
  return porMoneda;
}

// ---------- validación y proyectos de antes ----------

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const MES = /^\d{4}-\d{2}$/;
const monto = (n) => Number.isFinite(n) && n >= 0 && n <= 1e13;
const texto = (t, n) => typeof t === 'string' && t.length <= n;
const moneda = (m) => MONEDAS.some(([v]) => v === m);

/** Plan de cuotas válido (o null = sin cuotas). Devuelve el error o null. */
export function errorDelPlan(plan) {
  if (plan === null || plan === undefined) return null;
  if (!(Number.isInteger(plan.cantidad) && plan.cantidad >= 1 && plan.cantidad <= 600)) return 'Cuotas: de 1 a 600';
  if (!monto(plan.monto)) return 'El monto de la cuota no puede ser negativo';
  if (!MES.test(plan.inicio ?? '')) return 'Elegí el mes de la primera cuota';
  if (!Array.isArray(plan.mesesDobles) || plan.mesesDobles.some((m) => !(Number.isInteger(m) && m >= 1 && m <= 12))) return 'Meses dobles inválidos';
  return null;
}

function errorDelCompromiso(c) {
  if (!texto(c.nombre, 60) || c.nombre.trim() === '') return 'Poné un nombre (hasta 60 letras)';
  if (!TIPOS_COMPROMISO.some(([t]) => t === c.tipo)) return 'Tipo desconocido';
  if (!moneda(c.moneda)) return 'Moneda desconocida';
  if (!monto(c.total) || !monto(c.anticipo)) return 'Los montos no pueden ser negativos';
  if (!texto(c.nota ?? '', 300)) return 'Nota demasiado larga';
  const plan = errorDelPlan(c.cuotas);
  if (plan) return plan;
  if (!Array.isArray(c.pagos)) return 'Pagos inválidos';
  const malo = c.pagos.find((p) => !FECHA.test(p.fecha ?? '') || !monto(p.monto) || !texto(p.nota ?? '', 120)
    || !(p.cuota === null || (Number.isInteger(p.cuota) && p.cuota >= 0)) || !(p.acreedor === null || Number.isInteger(p.acreedor)));
  return malo ? 'Revisá los pagos: fecha, monto y cuota' : null;
}

function errorDelAcreedor(a) {
  if (!texto(a.nombre, 60) || a.nombre.trim() === '') return 'Poné un nombre (hasta 60 letras)';
  if (!texto(a.nota ?? '', 300) || !Array.isArray(a.devoluciones)) return 'Datos inválidos';
  const mala = a.devoluciones.find((d) => !FECHA.test(d.fecha ?? '') || !monto(d.monto) || !moneda(d.moneda) || !texto(d.nota ?? '', 120));
  return mala ? 'Revisá las devoluciones: fecha, monto y moneda' : null;
}

/** Errores por campo ({ 'finanzas.compromisos.0': 'texto' }); vacío si está todo bien. */
export function validarFinanzas(f) {
  if (!f || !Array.isArray(f.compromisos) || !Array.isArray(f.acreedores)) return { finanzas: 'Finanzas inválidas' };
  const errores = {};
  f.compromisos.forEach((c, i) => { const e = errorDelCompromiso(c ?? {}); if (e) errores[`finanzas.compromisos.${i}`] = e; });
  f.acreedores.forEach((a, i) => { const e = errorDelAcreedor(a ?? {}); if (e) errores[`finanzas.acreedores.${i}`] = e; });
  // Un pago no puede decir "lo pagó X" si X no existe.
  const ids = new Set(f.acreedores.map((a) => a.id));
  f.compromisos.forEach((c, i) => {
    if ((c.pagos ?? []).some((p) => p.acreedor !== null && !ids.has(p.acreedor))) errores[`finanzas.compromisos.${i}`] ??= 'Un pago tiene un acreedor que ya no está';
  });
  return errores;
}

/** Completa lo guardado (o lo crea en los proyectos de antes). */
export function completarFinanzas(f) {
  const base = f && typeof f === 'object' ? f : {};
  return {
    compromisos: (Array.isArray(base.compromisos) ? base.compromisos : []).map((c) => ({
      ...compromisoNuevo([], {}), ...c, pagos: Array.isArray(c.pagos) ? c.pagos.map((p) => ({ cuota: null, acreedor: null, nota: '', ...p })) : [],
    })),
    acreedores: (Array.isArray(base.acreedores) ? base.acreedores : []).map((a) => ({ nota: '', ...a, devoluciones: Array.isArray(a.devoluciones) ? a.devoluciones : [] })),
  };
}

/**
 * Para el PDF y el Excel: cada compromiso con sus cuentas (y el texto de las cuotas) y lo que le debés a cada acreedor.
 * @returns {{ compromisos: { nombre, tipo, moneda, total, pagado, falta, cuotas }[], acreedores: { nombre, debes: string }[] } | null}
 */
export function informeDeFinanzas(finanzas, rubros = [], mesActual = mesDe()) {
  const f = completarFinanzas(finanzas);
  if (f.compromisos.length === 0 && f.acreedores.length === 0) return null;
  return {
    compromisos: f.compromisos.map((c) => {
      const k = cuentasDelCompromiso(c, mesActual);
      return { nombre: c.nombre, tipo: c.tipo, moneda: c.moneda, total: k.total, pagado: k.pagado, falta: k.falta, cuotas: textoDeCuotas(k.cuotas, c.moneda) };
    }),
    acreedores: deudasConAcreedores(f, rubros).map((a) => ({
      nombre: a.nombre,
      debes: Object.entries(a.porMoneda).map(([m, x]) => plata(x.debes, m)).join(' + ') || 'nada',
    })),
  };
}
