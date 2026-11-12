// ==========================================================
// CIERRE DEL PRESUPUESTO (v1.46)
// ----------------------------------------------------------
// Revisión del 11/11: el total sumaba solo materiales y se leía como "lo que
// cuesta la obra". El cierre lo convierte en un precio, en este orden (el de
// cualquier cómputo y presupuesto):
//
//   Materiales                         (el total de siempre)
// + Mano de obra                       (monto, por m² cubierto, por kg de hierro o % de los materiales)
// = Costo directo
// + Imprevistos  x % del costo directo
// = Costo total
// + Ganancia     x % del costo total
// = Precio sin IVA
// + IVA          x % del precio (0, 10,5 % vivienda, 21 %, 27 %)
// = PRECIO DE LA OBRA
//
// De fábrica todo en 0: el total no cambia hasta que se cargue algo.
// Se guarda en el proyecto (params.cierre). Funciones puras: las usan la
// pantalla, el PDF y el Excel, así dicen lo mismo.
// ==========================================================

export const MODOS_MANO_DE_OBRA = [
  ['ninguna', 'Sin mano de obra'],
  ['global', 'Un monto total'],
  ['porM2', 'Por m² cubierto'],
  ['porKg', 'Por kg de hierro'],
  ['porcentaje', '% de los materiales'],
];

export const IVAS = [0, 10.5, 21, 27];

/**
 * v1.53 (pedido de Leandro): mano de obra por segmento (pilotines, estructura, revestimiento, tabiques, tapial,
 * pozo séptico, electricista, plomero…). Cada uno se cobra a su manera; las medidas salen de la obra.
 */
export const MODOS_SEGMENTO = [
  ['global', 'Un monto total'],
  ['porM2', 'Por m² cubierto'],
  ['porM2Revestimiento', 'Por m² de revestimiento'],
  ['porMetroTabique', 'Por metro de tabique'],
  ['porPilotin', 'Por pilotín'],
  ['porKg', 'Por kg de hierro'],
  ['porcentaje', '% de los materiales'],
];
/** Qué medida usa cada modo y cómo se dice. */
const MEDIDA_DE_MODO = {
  porM2: ['m2', 'm² cubiertos'], porM2Revestimiento: ['m2Revestimiento', 'm² de revestimiento'], porMetroTabique: ['mTabiques', 'm de tabique'],
  porPilotin: ['pilotines', 'pilotines'], porKg: ['kg', 'kg de hierro'],
};

export const SEGMENTOS_INICIALES = [
  ['Pilotines', 'porPilotin'], ['Estructura', 'porKg'], ['Revestimiento', 'porM2Revestimiento'], ['Tabiques', 'porMetroTabique'],
  ['Tapial', 'global'], ['Pozo séptico', 'global'], ['Electricista', 'global'], ['Plomero', 'global'],
].map(([nombre, modo], i) => ({ id: i + 1, nombre, modo, valor: 0 }));

export const CIERRE_INICIAL = { manoDeObra: { modo: 'ninguna', valor: 0 }, segmentos: SEGMENTOS_INICIALES, imprevistos: 0, ganancia: 0, iva: 0 };

/** Segmento nuevo (a mano). */
export function segmentoNuevo(segmentos) {
  return { id: Math.max(0, ...segmentos.map((x) => x.id)) + 1, nombre: `Segmento ${segmentos.length + 1}`, modo: 'global', valor: 0 };
}

/** Completa un cierre guardado (o lo crea en los proyectos de antes). */
export function completarCierre(c) {
  const base = c && typeof c === 'object' ? c : {};
  return {
    ...CIERRE_INICIAL, ...base,
    manoDeObra: { ...CIERRE_INICIAL.manoDeObra, ...(base.manoDeObra && typeof base.manoDeObra === 'object' ? base.manoDeObra : {}) },
    // v1.53: los de antes arrancan con los segmentos de fábrica en 0 (no cambia el total).
    segmentos: Array.isArray(base.segmentos) ? base.segmentos : SEGMENTOS_INICIALES,
  };
}

/** Errores por campo ({ 'cierre.iva': 'texto' }); vacío si está todo bien. */
export function validarCierre(c) {
  const errores = {};
  const porcentaje = (campo) => {
    if (!(Number.isFinite(c?.[campo]) && c[campo] >= 0 && c[campo] <= 100)) errores[`cierre.${campo}`] = 'De 0 a 100 %';
  };
  const mo = c?.manoDeObra;
  if (!MODOS_MANO_DE_OBRA.some(([m]) => m === mo?.modo)) errores['cierre.manoDeObra.modo'] = 'Elegí cómo se cobra la mano de obra';
  if (!(Number.isFinite(mo?.valor) && mo.valor >= 0 && mo.valor <= 1e12)) errores['cierre.manoDeObra.valor'] = 'No puede ser negativo';
  if (mo?.modo === 'porcentaje' && mo.valor > 1000) errores['cierre.manoDeObra.valor'] = 'Hasta 1000 %';
  if (c?.segmentos !== undefined) {
    if (!Array.isArray(c.segmentos)) errores['cierre.segmentos'] = 'Lista inválida';
    else c.segmentos.forEach((x, i) => {
      if (!(typeof x?.nombre === 'string' && x.nombre.length <= 40)) errores[`cierre.segmentos.${i}`] = 'El nombre puede tener hasta 40 letras';
      else if (!MODOS_SEGMENTO.some(([m]) => m === x.modo)) errores[`cierre.segmentos.${i}`] = 'Elegí cómo se cobra';
      else if (!(Number.isFinite(x.valor) && x.valor >= 0 && x.valor <= 1e12)) errores[`cierre.segmentos.${i}`] = 'No puede ser negativo';
    });
  }
  porcentaje('imprevistos');
  porcentaje('ganancia');
  if (!IVAS.includes(c?.iva)) errores['cierre.iva'] = 'Elegí 0, 10,5, 21 o 27 %';
  return errores;
}

const pesosRedondos = (n) => Math.round(n);
const texto = (n, d = 2) => n.toLocaleString('es-AR', { maximumFractionDigits: d });
const enPesos = (n) => `$ ${Math.round(n).toLocaleString('es-AR')}`;

/**
 * Cuánto es una mano de obra y cómo se llegó (para el detalle del renglón).
 * @param medidas { m2, kg, m2Revestimiento, mTabiques, pilotines } de la obra
 */
export function manoDeObra({ modo, valor }, materiales, medidas = {}) {
  if (modo === 'global') return { monto: valor, detalle: 'monto total' };
  if (modo === 'porcentaje') return { monto: (materiales * valor) / 100, detalle: `${texto(valor)} % de los materiales` };
  const [medida, nombre] = MEDIDA_DE_MODO[modo] ?? [];
  if (!medida) return { monto: 0, detalle: '' };
  const cantidad = medidas[medida] ?? 0;
  const mostrada = medida === 'kg' || medida === 'pilotines' ? texto(Math.round(cantidad), 0) : texto(cantidad);
  return { monto: valor * cantidad, detalle: `${mostrada} ${nombre} x ${enPesos(valor)}` };
}

/**
 * @param materiales  total de materiales (el de la obra: con el plan de compra si hay varios proveedores)
 * @param cierre      params.cierre
 * @param medidas     { m2: m² cubiertos, kg: kilos de hierro } para la mano de obra por m² o por kg
 * @returns {{ renglones: { clave, concepto, detalle, monto, subtotal? }[], total: number, conCierre: boolean }}
 *   `subtotal: true` marca las líneas de "=" (costo directo, precio sin IVA…). Sin nada cargado, conCierre = false
 *   y el total es el de los materiales.
 */
export function cerrarPresupuesto(materiales, cierre, medidas = {}) {
  const c = completarCierre(cierre);
  const renglones = [{ clave: 'materiales', concepto: 'Materiales', detalle: '', monto: pesosRedondos(materiales) }];
  let acumulado = materiales;
  const sumar = (clave, concepto, detalle, monto) => {
    if (!(monto > 0)) return;
    renglones.push({ clave, concepto, detalle, monto: pesosRedondos(monto) });
    acumulado += monto;
  };
  const subtotal = (clave, concepto) => renglones.push({ clave, concepto, detalle: '', monto: pesosRedondos(acumulado), subtotal: true });

  const mo = manoDeObra(c.manoDeObra, materiales, medidas);
  sumar('manoDeObra', c.segmentos.some((x) => x.valor > 0) ? 'Mano de obra general' : 'Mano de obra', mo.detalle, mo.monto);
  // v1.53: cada segmento con su renglón (pilotines, estructura, electricista…).
  c.segmentos.forEach((x) => {
    const r = manoDeObra(x, materiales, medidas);
    sumar(`mo:${x.id}`, `Mano de obra — ${x.nombre}`, r.detalle, r.monto);
  });
  const conImprevistos = c.imprevistos > 0;
  if (conImprevistos && renglones.length > 1) subtotal('costoDirecto', 'Costo directo');
  sumar('imprevistos', 'Imprevistos', `${texto(c.imprevistos)} %`, (acumulado * c.imprevistos) / 100);
  if (c.ganancia > 0 && renglones.length > 1) subtotal('costo', 'Costo total');
  sumar('ganancia', 'Ganancia', `${texto(c.ganancia)} %`, (acumulado * c.ganancia) / 100);
  if (c.iva > 0 && renglones.length > 1) subtotal('sinIva', 'Precio sin IVA');
  sumar('iva', 'IVA', `${texto(c.iva, 1)} %`, (acumulado * c.iva) / 100);
  const total = pesosRedondos(acumulado);
  return { renglones, total, conCierre: renglones.length > 1 };
}
