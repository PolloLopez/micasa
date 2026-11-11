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

export const CIERRE_INICIAL = { manoDeObra: { modo: 'ninguna', valor: 0 }, imprevistos: 0, ganancia: 0, iva: 0 };

/** Completa un cierre guardado (o lo crea en los proyectos de antes). */
export function completarCierre(c) {
  const base = c && typeof c === 'object' ? c : {};
  return {
    ...CIERRE_INICIAL, ...base,
    manoDeObra: { ...CIERRE_INICIAL.manoDeObra, ...(base.manoDeObra && typeof base.manoDeObra === 'object' ? base.manoDeObra : {}) },
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
  porcentaje('imprevistos');
  porcentaje('ganancia');
  if (!IVAS.includes(c?.iva)) errores['cierre.iva'] = 'Elegí 0, 10,5, 21 o 27 %';
  return errores;
}

const pesosRedondos = (n) => Math.round(n);
const texto = (n, d = 2) => n.toLocaleString('es-AR', { maximumFractionDigits: d });
const enPesos = (n) => `$ ${Math.round(n).toLocaleString('es-AR')}`;

/** Cuánto es la mano de obra y cómo se llegó (para el detalle del renglón). */
function manoDeObra({ modo, valor }, materiales, { m2 = 0, kg = 0 }) {
  if (modo === 'global') return { monto: valor, detalle: 'monto total' };
  if (modo === 'porM2') return { monto: valor * m2, detalle: `${texto(m2)} m² cubiertos x ${enPesos(valor)}` };
  if (modo === 'porKg') return { monto: valor * kg, detalle: `${texto(Math.round(kg), 0)} kg de hierro x ${enPesos(valor)}` };
  if (modo === 'porcentaje') return { monto: (materiales * valor) / 100, detalle: `${texto(valor)} % de los materiales` };
  return { monto: 0, detalle: '' };
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
  sumar('manoDeObra', 'Mano de obra', mo.detalle, mo.monto);
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
