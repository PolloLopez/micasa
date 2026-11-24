// ==========================================================
// EDICIÓN DE PIEZAS SUELTAS
// ----------------------------------------------------------
// Además de eliminar una pieza, el herrero puede:
//   - RECORTARLA: sacarle metros desde un extremo o el otro (v1.83: o ALARGARLA: recorte negativo)
//     (ej. la columna del altillo termina en el piso 2 y no sigue al techo);
//   - MOVERLA: correrla en X (hacia la pared B), en Z (hacia la pared A)
//     o subirla (Y). Valores negativos = para el otro lado;
//   - CAMBIARLE EL PERFIL: que se cotice con otro renglón del catálogo
//     (ej. una columna más gruesa = "Columnas de escalera").
//
// Las ediciones se guardan en params.piezasEditadas = { [idPieza]: edición }
// y se aplican en el motor (estructura.js), así el 3D y el presupuesto
// ven la pieza ya editada. Igual que las eliminaciones, se reconocen por
// el id de la pieza (tipo + posición).
// ==========================================================

import { INSUMO } from './constantes.js';
import { pieza } from './segmentos.js';

/** Una pieza no puede quedar más corta que esto (no se fabrica). */
export const LARGO_MINIMO_EDITADA = 0.05;
/** v1.83 (Leandro: "no puedo estirar las piezas, solo acortar"): cuánto se puede alargar cada punta (recorte negativo). */
export const ALARGAR_MAXIMO = 3;
/** Movimiento máximo por eje (más que eso, conviene cambiar los parámetros). */
export const MOVER_MAXIMO = 5;

/** Edición "sin cambios" (todos los campos posibles). */
export const EDICION_VACIA = {
  recorteInicio: 0, // metros que se sacan desde el extremo `desde`
  recorteFin: 0, // metros que se sacan desde el extremo `hasta`
  moverX: 0, // + hacia la pared B, - hacia la D
  moverY: 0, // + sube, - baja
  moverZ: 0, // + hacia la pared A, - hacia la C
  perfil: null, // id de insumo del catálogo, o null = el de siempre
  // v1.72 (Leandro: "en Perfil de esta pieza debe mostrarme los tipos de materiales que tengo, no la lista de dónde lo
  // uso"): el perfil de la lista (Caño 80x80x2.0…). La pieza sigue en su renglón pero se compra con ese perfil
  // (renglón aparte "Columnas (editada a mano)", como el perfil propio de una pared).
  perfilLista: null,
};

/** Renglones de perfil a los que se puede pasar una pieza de una construcción. */
export const PERFILES_CONSTRUCCION = [
  INSUMO.COLUMNA, INSUMO.COLUMNA_ESQUINA, INSUMO.COLUMNA_ENTREPISO, INSUMO.MONTANTE, INSUMO.MARCO_ABERTURA, INSUMO.MARCO, INSUMO.BORDE_PISO, INSUMO.BORDE_PISO_2, INSUMO.VIGA_CIERRE, INSUMO.PISO, INSUMO.TRANSVERSAL_PISO, INSUMO.PISO_2, INSUMO.TRANSVERSAL_PISO_2,
  INSUMO.CORREA, INSUMO.VIGA_TECHO, INSUMO.CORREA_TECHO, INSUMO.BORDE_TECHO, INSUMO.ZANCA, INSUMO.APOYO_ESCALON, INSUMO.COLUMNA_ESCALERA,
  INSUMO.RIOSTRA,
];
/** Renglones de perfil a los que se puede pasar una pieza de una grada. */
export const PERFILES_GRADA = [INSUMO.GRADA_ZANCA, INSUMO.GRADA_PARANTE, INSUMO.GRADA_APOYO, INSUMO.GRADA_VIGA, INSUMO.RIOSTRA];
/** Renglones de perfil a los que se puede pasar una pieza de un montaje. */
export const PERFILES_MONTAJE = [INSUMO.MONTAJE_PATA, INSUMO.MONTAJE_MARCO, INSUMO.RIOSTRA];
/** Todos (para validar lo guardado). */
export const PERFILES_ASIGNABLES = [
  ...PERFILES_CONSTRUCCION,
  ...PERFILES_GRADA.filter((id) => id !== INSUMO.RIOSTRA),
  ...PERFILES_MONTAJE.filter((id) => id !== INSUMO.RIOSTRA),
];

const esNumero = (n) => typeof n === 'number' && Number.isFinite(n);

/**
 * Revisa la forma de una edición (sin conocer la pieza).
 * @returns {string|null} el problema, o null si está bien
 */
export function revisarEdicion(edicion) {
  if (!edicion || typeof edicion !== 'object' || Array.isArray(edicion)) return 'Edición inválida';
  const campos = { ...EDICION_VACIA, ...edicion };
  if (Object.keys(edicion).some((c) => !(c in EDICION_VACIA))) return 'Edición con datos desconocidos';
  for (const c of ['recorteInicio', 'recorteFin']) {
    if (!esNumero(campos[c]) || campos[c] < -ALARGAR_MAXIMO || campos[c] > 30) return `Se acorta hasta 30 m o se alarga hasta ${ALARGAR_MAXIMO} m por punta`;
  }
  for (const c of ['moverX', 'moverY', 'moverZ']) {
    if (!esNumero(campos[c]) || Math.abs(campos[c]) > MOVER_MAXIMO) return `Se puede mover hasta ${MOVER_MAXIMO} m por eje`;
  }
  if (campos.perfil !== null && !PERFILES_ASIGNABLES.includes(campos.perfil)) return 'Perfil inválido';
  if (campos.perfilLista !== null && !(typeof campos.perfilLista === 'string' && campos.perfilLista.length <= 60)) return 'Perfil inválido';
  return null;
}

/**
 * Revisa una edición contra la pieza original (lo que se ve en el formulario).
 * @returns {string|null}
 */
export function revisarEdicionDePieza(original, edicion) {
  const problema = revisarEdicion(edicion);
  if (problema) return problema;
  const { recorteInicio, recorteFin } = { ...EDICION_VACIA, ...edicion };
  const queda = original.largo - recorteInicio - recorteFin;
  if (queda < LARGO_MINIMO_EDITADA - 1e-9) {
    return `La pieza mide ${original.largo.toFixed(2)} m: con esos recortes queda en ${Math.max(queda, 0).toFixed(2)} m (mínimo ${LARGO_MINIMO_EDITADA * 100} cm)`;
  }
  return null;
}

/** ¿La edición no cambia nada? (para no guardar ediciones vacías). */
export function esEdicionVacia(edicion) {
  const e = { ...EDICION_VACIA, ...edicion };
  return e.recorteInicio === 0 && e.recorteFin === 0 && e.moverX === 0 && e.moverY === 0 && e.moverZ === 0 && e.perfil === null && e.perfilLista === null;
}

/** v1.88: lo que dice QUÉ es una pieza (no dónde está): se conserva al editarla. */
const CAMPOS_QUE_SE_CONSERVAN = ['insumo', 'agregada', 'esquina', 'madera', 'nivel', 'mesada', 'tabique', 'apoyado', 'largoEje'];

/**
 * Pieza con la edición aplicada. Si la edición la dejaría demasiado corta
 * (por ej. porque cambió una medida), se aplica solo el movimiento y el
 * perfil, y se marca `recorteIgnorado` para avisar.
 */
export function aplicarEdicion(original, edicion) {
  const e = { ...EDICION_VACIA, ...edicion };
  const { desde, hasta, largo } = original;
  const direccion = [0, 1, 2].map((i) => (hasta[i] - desde[i]) / largo);
  const recortesValidos = largo - e.recorteInicio - e.recorteFin >= LARGO_MINIMO_EDITADA - 1e-9;
  const inicio = recortesValidos ? e.recorteInicio : 0;
  const fin = recortesValidos ? e.recorteFin : 0;
  const mover = [e.moverX, e.moverY, e.moverZ];
  const nuevoDesde = desde.map((v, i) => v + direccion[i] * inicio + mover[i]);
  const nuevoHasta = hasta.map((v, i) => v - direccion[i] * fin + mover[i]);
  // v1.88 (Leandro: "Borde de piso 7,58 m… no está unida"): antes la pieza editada se armaba de cero y perdía lo que
  // dice qué es: el renglón de una pieza AGREGADA (`insumo`), si es de madera, de esquina, de qué piso… Así, 12 de
  // sus 13 piezas agregadas (las había movido) no entraban en el presupuesto ni en la hoja de corte. Ahora se conservan.
  const deLaOriginal = Object.fromEntries(CAMPOS_QUE_SE_CONSERVAN.filter((c) => original[c] !== undefined).map((c) => [c, original[c]]));
  // El renglón: el elegido en la edición o el que tenía (el de una agregada). Si además se eligió un perfil de la
  // lista (perfilPared, 'editada a mano'), ese perfil manda dentro de su renglón (ver compraDePieza y presupuesto).
  const insumo = e.perfil || original.insumo;
  delete deLaOriginal.insumo;
  return {
    ...deLaOriginal,
    ...pieza(original.id, original.tipo, original.grupos, nuevoDesde, nuevoHasta),
    editada: true,
    original: { desde, hasta, largo }, // para el formulario: los recortes se miden sobre la pieza original
    ...(insumo ? { insumo } : {}),
    ...(e.perfilLista ? { perfilPared: e.perfilLista, ladoPared: 'editada a mano' } : {}), // v1.72
    ...(recortesValidos ? {} : { recorteIgnorado: true }),
  };
}

/** ¿Es una pieza vertical? (para hablar de "arriba" y "abajo" en la UI) */
export function esVertical(p) {
  return Math.abs(p.hasta[1] - p.desde[1]) > 0.99 * p.largo;
}

/**
 * v1.60: cómo quedó en la estructura una pieza editada a mano. Si después las uniones la cortaron en tramos
 * ("piso:240" → "piso:240~1", "piso:240~2", por ejemplo al cambiar cómo se arman tirantes y transversales), suma
 * los tramos. null si ya no está. (Antes se buscaba solo el id entero y la pantalla se caía.)
 * @returns {{ largo, tramos, insumo, recorteIgnorado } | null}
 */
export function piezaEditadaEnLaEstructura(piezas, id) {
  const entera = piezas.find((p) => p.id === id);
  if (entera) return { largo: entera.largo, tramos: 1, insumo: entera.insumo, recorteIgnorado: entera.recorteIgnorado, pieza: entera };
  const tramos = piezas.filter((p) => p.id.startsWith(`${id}~`));
  if (tramos.length === 0) return null;
  return {
    largo: tramos.reduce((a, p) => a + p.largo, 0), tramos: tramos.length,
    insumo: tramos[0].insumo, recorteIgnorado: tramos.some((p) => p.recorteIgnorado),
    pieza: tramos[0], // v1.88: para saber con qué perfil quedó
  };
}
