// ==========================================================
// SEGUIMIENTO DE LA OBRA (v1.47)
// ----------------------------------------------------------
// Pedido de Leandro (11/11): registrar lo que ya está pagado (en partes o
// todo), lo contratado y lo terminado. Decisión: un seguimiento simple
// guardado con el proyecto (params.seguimiento), no un sistema contable.
//
// La obra se divide en RUBROS (materiales de un proveedor, la mano de obra,
// un contrato, cualquier otra cosa). Cada rubro tiene:
//   - quién (proveedor o contratista) y un detalle
//   - estado: pendiente → contratado → en curso → terminado (con fechas)
//   - monto contratado (si se cerró un precio distinto del presupuestado)
//   - pagos: fecha, monto, medio y nota (tantos como haga falta)
// Lo presupuestado de los rubros que salen del presupuesto (`origen`) no se
// guarda: se toma del presupuesto de ese momento (si cambian las medidas o
// los precios, se actualiza solo). Los rubros a mano guardan el suyo.
// ==========================================================

import { estadoDeCuotas, errorDelPlan, textoDeCuotas, mesDe, informeDeFinanzas } from './finanzas.js';

export const ESTADOS_RUBRO = [
  ['pendiente', 'Pendiente'], ['contratado', 'Contratado'], ['enCurso', 'En curso'], ['terminado', 'Terminado'],
];
export const MEDIOS_PAGO = [['efectivo', 'Efectivo'], ['transferencia', 'Transferencia'], ['tarjeta', 'Tarjeta'], ['cheque', 'Cheque'], ['otro', 'Otro']];

export const SEGUIMIENTO_INICIAL = { rubros: [] };

/**
 * v1.54 (pedido de Leandro): el "checklist" de cada rubro. La etapa sale sola del avance (que se carga a mano, en %)
 * y de lo pagado; no se elige.
 */
export const ETAPAS_RUBRO = [
  ['presupuestado', 'Presupuestado'],
  ['enProceso', 'En proceso'],
  ['finalizadoFaltaPagar', 'Finalizado, falta pagar'],
  ['finalizadoPagado', 'Finalizado y pagado'],
  ['pagadoSinFinalizar', 'Pagado sin finalizar'],
];
export const nombreEtapa = (e) => ETAPAS_RUBRO.find(([v]) => v === e)?.[1] ?? e;

/** El estado viejo (v1.47) que corresponde a un avance, para los proyectos y el PDF de antes. */
export const estadoSegunAvance = (avance, estado) => (avance >= 100 ? 'terminado' : avance > 0 ? 'enCurso' : estado === 'terminado' || estado === 'enCurso' ? 'contratado' : estado);

/** Fecha de hoy como 'AAAA-MM-DD' (la del navegador, no la UTC). */
export function hoy(fecha = new Date()) {
  const dos = (n) => String(n).padStart(2, '0');
  return `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}`;
}

const siguienteId = (lista) => Math.max(0, ...lista.map((x) => x.id)) + 1;

/** Rubro nuevo cargado a mano (o desde el presupuesto, con su `origen`). */
export function rubroNuevo(rubros, { nombre, origen = '', quien = '' } = {}) {
  return {
    id: siguienteId(rubros), nombre: nombre ?? `Rubro ${rubros.length + 1}`, origen, quien, detalle: '',
    estado: 'pendiente', presupuestado: 0, contratado: null, fechaContrato: '', fechaFin: '', pagos: [],
    avance: 0, // v1.54: % hecho (a mano)
    cuotas: null, // v1.54: plan de cuotas (ver finanzas.js) o null si se paga suelto
  };
}

export function pagoNuevo(pagos, monto = 0, fecha = hoy()) {
  // v1.54: `cuota` (a qué cuota va, si el rubro tiene plan) y `acreedor` (si lo pagó otro por vos: se lo debés).
  return { id: siguienteId(pagos), fecha, monto, medio: 'transferencia', nota: '', cuota: null, acreedor: null };
}

/**
 * Lo que el presupuesto dice de cada parte: un renglón por proveedor (con su flete) o uno solo de materiales,
 * y la mano de obra si se cargó en el cierre.
 * @param compras   plan de compra por proveedor ([{ proveedor: { id, nombre }, total }]) o [] si hay un solo proveedor
 * @param materiales total de materiales (con un solo proveedor)
 * @param cierre    resultado de cerrarPresupuesto
 * @returns {{ origen, nombre, quien, monto }[]}
 */
export function partesDelPresupuesto({ compras = [], materiales = 0, cierre = null, nombreProveedor = '' }) {
  const partes = compras.length > 0
    ? compras.map((c) => ({ origen: `proveedor:${c.proveedor.id}`, nombre: `Materiales — ${c.proveedor.nombre}`, quien: c.proveedor.nombre, monto: c.total }))
    : [{ origen: 'materiales', nombre: 'Materiales', quien: nombreProveedor, monto: materiales }];
  const mo = cierre?.renglones?.find((r) => r.clave === 'manoDeObra');
  if (mo) partes.push({ origen: 'manoDeObra', nombre: mo.concepto ?? 'Mano de obra', quien: '', monto: mo.monto });
  // v1.53: un rubro por cada segmento de mano de obra con monto (pilotines, electricista…).
  (cierre?.renglones ?? []).filter((r) => r.clave.startsWith('mo:'))
    .forEach((r) => partes.push({ origen: `manoDeObra:${r.clave.slice(3)}`, nombre: r.concepto, quien: '', monto: r.monto }));
  return partes.map((p) => ({ ...p, monto: Math.round(p.monto) }));
}

/** Agrega los rubros del presupuesto que todavía no están (no toca los que ya hay). */
export function rubrosDesdePresupuesto(rubros, partes) {
  const nuevos = [...rubros];
  partes.filter((p) => !rubros.some((r) => r.origen === p.origen)).forEach((p) => {
    nuevos.push(rubroNuevo(nuevos, { nombre: p.nombre, origen: p.origen, quien: p.quien }));
  });
  return nuevos;
}

/**
 * Cuentas de un rubro.
 * @returns {{ presupuestado, contratado, pagado, saldo, pagadoTodo, sinOrigen }}
 *   contratado = el monto cerrado o, si no se cargó, lo presupuestado; saldo = lo que falta pagar (nunca negativo;
 *   si se pagó de más, `deMas`). sinOrigen = venía del presupuesto y esa parte ya no está (ej. se quitó el proveedor).
 */
export function cuentasDelRubro(rubro, partes = []) {
  const parte = rubro.origen ? partes.find((p) => p.origen === rubro.origen) : null;
  const presupuestado = rubro.origen ? (parte?.monto ?? 0) : rubro.presupuestado;
  const contratado = rubro.contratado ?? presupuestado;
  const pagado = rubro.pagos.reduce((a, p) => a + p.monto, 0);
  return {
    presupuestado, contratado, pagado,
    saldo: Math.max(0, contratado - pagado), deMas: Math.max(0, pagado - contratado),
    pagadoTodo: contratado > 0 && pagado >= contratado, sinOrigen: Boolean(rubro.origen) && !parte,
    porcentajePagado: contratado > 0 ? Math.min(100, (pagado / contratado) * 100) : 0,
  };
}

/**
 * v1.54: la etapa del checklist según el avance y lo pagado.
 * @returns {{ etapa, texto }}  texto = "En proceso · 40 % hecho · 25 % pagado · 3 de 6 cuotas pagas"
 */
export function etapaDelRubro(rubro, cuentas, mesActual = mesDe()) {
  const avance = rubro.avance ?? (rubro.estado === 'terminado' ? 100 : 0); // los de antes, sin completar
  const pagadoTodo = cuentas.pagadoTodo;
  let etapa;
  if (avance >= 100) etapa = pagadoTodo ? 'finalizadoPagado' : 'finalizadoFaltaPagar';
  else if (pagadoTodo) etapa = 'pagadoSinFinalizar';
  else if (avance > 0 || cuentas.pagado > 0) etapa = 'enProceso';
  else etapa = 'presupuestado';
  const partes = [nombreEtapa(etapa)];
  if (etapa === 'enProceso' || etapa === 'pagadoSinFinalizar') partes.push(`${Math.round(avance)} % hecho`);
  if (etapa !== 'presupuestado' && etapa !== 'finalizadoPagado' && etapa !== 'pagadoSinFinalizar') partes.push(`${Math.round(cuentas.porcentajePagado)} % pagado`);
  const cuotas = rubro.cuotas ? estadoDeCuotas(rubro.cuotas, rubro.pagos, mesActual) : null;
  if (cuotas && cuotas.cuotas.length > 0 && !pagadoTodo) partes.push(textoDeCuotas(cuotas));
  return { etapa, texto: partes.join(' · '), cuotas };
}

/**
 * v1.54: el total de cada proveedor o contratista (por el nombre en "Quién", sin importar mayúsculas).
 * @returns {{ quien, rubros: string[], contratado, pagado, falta }[]}  ordenado por lo contratado
 */
export function totalesPorQuien(seguimiento, partes = []) {
  const grupos = new Map();
  (seguimiento?.rubros ?? []).forEach((r) => {
    const quien = (r.quien ?? '').trim() || 'Sin asignar';
    const clave = quien.toLowerCase();
    const c = cuentasDelRubro(r, partes);
    const g = grupos.get(clave) ?? { quien, rubros: [], contratado: 0, pagado: 0, falta: 0 };
    g.rubros.push(r.nombre);
    g.contratado += c.contratado;
    g.pagado += c.pagado;
    g.falta += c.saldo;
    grupos.set(clave, g);
  });
  return [...grupos.values()].sort((a, b) => b.contratado - a.contratado);
}

/** Totales de la obra: presupuestado, contratado, pagado, saldo y cuántos rubros terminados. */
export function resumenSeguimiento(seguimiento, partes = []) {
  const rubros = seguimiento?.rubros ?? [];
  const cuentas = rubros.map((r) => cuentasDelRubro(r, partes));
  const suma = (campo) => cuentas.reduce((a, c) => a + c[campo], 0);
  const contratado = suma('contratado');
  const pagado = suma('pagado');
  return {
    rubros: rubros.length,
    presupuestado: suma('presupuestado'), contratado, pagado, saldo: suma('saldo'),
    terminados: rubros.filter((r) => (r.avance ?? (r.estado === 'terminado' ? 100 : 0)) >= 100).length,
    porcentajePagado: contratado > 0 ? Math.min(100, (pagado / contratado) * 100) : 0,
  };
}

// ---------- validación y proyectos de antes ----------

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const fechaValida = (f) => f === '' || (typeof f === 'string' && FECHA.test(f));
const monto = (n) => Number.isFinite(n) && n >= 0 && n <= 1e13;
const textoHasta = (t, n) => typeof t === 'string' && t.length <= n;

function validarRubro(r) {
  if (!textoHasta(r.nombre, 60)) return 'El nombre puede tener hasta 60 letras';
  if (!textoHasta(r.quien, 60) || !textoHasta(r.detalle, 300) || typeof r.origen !== 'string') return 'Texto demasiado largo';
  if (!ESTADOS_RUBRO.some(([e]) => e === r.estado)) return 'Estado desconocido';
  if (!monto(r.presupuestado)) return 'Lo presupuestado no puede ser negativo';
  if (r.contratado !== null && !monto(r.contratado)) return 'El monto contratado no puede ser negativo';
  if (!fechaValida(r.fechaContrato) || !fechaValida(r.fechaFin)) return 'Fecha inválida';
  if (!Array.isArray(r.pagos)) return 'Pagos inválidos';
  if (r.avance !== undefined && !(Number.isFinite(r.avance) && r.avance >= 0 && r.avance <= 100)) return 'El avance va de 0 a 100 %';
  const plan = errorDelPlan(r.cuotas);
  if (plan) return plan;
  const malo = r.pagos.find((p) => !fechaValida(p.fecha) || p.fecha === '' || !monto(p.monto)
    || !MEDIOS_PAGO.some(([m]) => m === p.medio) || !textoHasta(p.nota, 120)
    || !(p.cuota == null || (Number.isInteger(p.cuota) && p.cuota >= 1)) || !(p.acreedor == null || Number.isInteger(p.acreedor)));
  return malo ? 'Revisá los pagos: fecha, monto (no negativo) y medio' : null;
}

/** Errores por campo ({ 'seguimiento.rubros.3': 'texto' }); vacío si está todo bien. */
export function validarSeguimiento(s) {
  if (!s || !Array.isArray(s.rubros)) return { seguimiento: 'Seguimiento inválido' };
  const errores = {};
  s.rubros.forEach((r, i) => {
    const e = validarRubro(r ?? {});
    if (e) errores[`seguimiento.rubros.${i}`] = e;
  });
  return errores;
}

export function completarSeguimiento(s) {
  if (!s || !Array.isArray(s.rubros)) return { ...SEGUIMIENTO_INICIAL, rubros: [] };
  return { ...s, rubros: s.rubros.map((r) => ({
    ...rubroNuevo([], {}), ...r,
    // v1.54: los de antes: terminado = 100 % hecho; el resto, 0 %.
    avance: Number.isFinite(r.avance) ? r.avance : r.estado === 'terminado' ? 100 : 0,
    pagos: Array.isArray(r.pagos) ? r.pagos.map((p) => ({ cuota: null, acreedor: null, ...p })) : [],
  })) };
}

/**
 * v1.50: el seguimiento listo para el PDF y el Excel: el resumen y cada rubro con sus cuentas y sus pagos.
 * @returns {{ resumen, rubros: { nombre, quien, estado, presupuestado, contratado, pagado, falta, deMas, fechaContrato, fechaFin, detalle, pagos }[] }}
 */
export function informeDeSeguimiento(seguimiento, partes = [], finanzas = null) {
  const rubros = (seguimiento?.rubros ?? []).map((r) => {
    const c = cuentasDelRubro(r, partes);
    const etapa = etapaDelRubro(r, c);
    return {
      nombre: r.nombre, quien: r.quien, estado: etapa.texto, etapa: etapa.etapa, avance: r.avance ?? 0,
      presupuestado: c.presupuestado, contratado: c.contratado, pagado: c.pagado, falta: c.saldo, deMas: c.deMas,
      fechaContrato: r.fechaContrato, fechaFin: r.fechaFin, detalle: r.detalle,
      pagos: [...r.pagos].sort((a, b) => a.fecha.localeCompare(b.fecha))
        .map((p) => ({ ...p, medio: MEDIOS_PAGO.find(([m]) => m === p.medio)?.[1] ?? p.medio })),
    };
  });
  // v1.54: el total por proveedor o contratista y las finanzas (terreno, créditos, acreedores).
  return { resumen: resumenSeguimiento(seguimiento, partes), rubros, porQuien: totalesPorQuien(seguimiento, partes),
    finanzas: informeDeFinanzas(finanzas, seguimiento?.rubros ?? []) };
}

/** 'AAAA-MM-DD' → 'DD/MM/AAAA' (vacío si no hay fecha). */
export const fechaLegible = (f) => (f ? f.split('-').reverse().join('/') : '');
