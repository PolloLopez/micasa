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

export const ESTADOS_RUBRO = [
  ['pendiente', 'Pendiente'], ['contratado', 'Contratado'], ['enCurso', 'En curso'], ['terminado', 'Terminado'],
];
export const MEDIOS_PAGO = [['efectivo', 'Efectivo'], ['transferencia', 'Transferencia'], ['tarjeta', 'Tarjeta'], ['cheque', 'Cheque'], ['otro', 'Otro']];

export const SEGUIMIENTO_INICIAL = { rubros: [] };

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
  };
}

export function pagoNuevo(pagos, monto = 0, fecha = hoy()) {
  return { id: siguienteId(pagos), fecha, monto, medio: 'transferencia', nota: '' };
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
  if (mo) partes.push({ origen: 'manoDeObra', nombre: 'Mano de obra', quien: '', monto: mo.monto });
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
  };
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
    terminados: rubros.filter((r) => r.estado === 'terminado').length,
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
  const malo = r.pagos.find((p) => !fechaValida(p.fecha) || p.fecha === '' || !monto(p.monto)
    || !MEDIOS_PAGO.some(([m]) => m === p.medio) || !textoHasta(p.nota, 120));
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
  return { ...s, rubros: s.rubros.map((r) => ({ ...rubroNuevo([], {}), ...r, pagos: Array.isArray(r.pagos) ? r.pagos : [] })) };
}

/**
 * v1.50: el seguimiento listo para el PDF y el Excel: el resumen y cada rubro con sus cuentas y sus pagos.
 * @returns {{ resumen, rubros: { nombre, quien, estado, presupuestado, contratado, pagado, falta, deMas, fechaContrato, fechaFin, detalle, pagos }[] }}
 */
export function informeDeSeguimiento(seguimiento, partes = []) {
  const rubros = (seguimiento?.rubros ?? []).map((r) => {
    const c = cuentasDelRubro(r, partes);
    return {
      nombre: r.nombre, quien: r.quien, estado: ESTADOS_RUBRO.find(([e]) => e === r.estado)?.[1] ?? r.estado,
      presupuestado: c.presupuestado, contratado: c.contratado, pagado: c.pagado, falta: c.saldo, deMas: c.deMas,
      fechaContrato: r.fechaContrato, fechaFin: r.fechaFin, detalle: r.detalle,
      pagos: [...r.pagos].sort((a, b) => a.fecha.localeCompare(b.fecha))
        .map((p) => ({ ...p, medio: MEDIOS_PAGO.find(([m]) => m === p.medio)?.[1] ?? p.medio })),
    };
  });
  return { resumen: resumenSeguimiento(seguimiento, partes), rubros };
}

/** 'AAAA-MM-DD' → 'DD/MM/AAAA' (vacío si no hay fecha). */
export const fechaLegible = (f) => (f ? f.split('-').reverse().join('/') : '');
