// ==========================================================
// LISTAS DE LOS PLANOS (v1.42): caños y perfiles, y aberturas
// ----------------------------------------------------------
// Pedido de Leandro (10/11): que la exportación de planos traiga también el
// tipo y la cantidad de caños, y las aberturas. Funciones puras: las usan el
// PDF (HojasImpresion) y el Excel (exportarExcel), así dicen lo mismo.
// ==========================================================

import { nombreLado } from '../motor/geometria.js';
import { INSUMO } from '../motor/constantes.js';
import { optimizarCortes } from '../motor/optimizadorCortes.js';

const redondear = (n, d = 2) => Number(n.toFixed(d));

/**
 * v1.42: de qué parte de la obra es cada renglón de perfil. Las paredes (columnas, fajas, soleras, montantes y los
 * marcos de las aberturas) van siempre: es lo que le interesa, por ejemplo, a quien cotiza los paneles exteriores.
 */
const PARTE_DE_INSUMO = {
  [INSUMO.PISO]: 'pisos', [INSUMO.TRANSVERSAL_PISO]: 'pisos', [INSUMO.BORDE_PISO]: 'pisos',
  [INSUMO.PISO_2]: 'entrepiso', [INSUMO.BORDE_PISO_2]: 'entrepiso', [INSUMO.TRANSVERSAL_PISO_2]: 'entrepiso', [INSUMO.VIGA_CIERRE]: 'entrepiso',
  [INSUMO.COLUMNA_ENTREPISO]: 'entrepiso', [INSUMO.ZANCA]: 'entrepiso', [INSUMO.APOYO_ESCALON]: 'entrepiso', [INSUMO.COLUMNA_ESCALERA]: 'entrepiso',
  [INSUMO.VIGA_TECHO]: 'techo', [INSUMO.CORREA_TECHO]: 'techo', [INSUMO.BORDE_TECHO]: 'techo',
  [INSUMO.ESTRUCTURA_MESADA]: 'interiores', [INSUMO.ESTRUCTURA_TABIQUE]: 'interiores',
};
export const parteDeRenglon = (item) => PARTE_DE_INSUMO[item.derivadoDe ?? String(item.id).split('@')[0]] ?? 'paredes';

/** Qué partes van, según las opciones de impresión (las paredes siempre). */
export const partesElegidas = (opciones = {}) => ({
  paredes: true,
  pisos: opciones.partePisos !== false,
  entrepiso: opciones.parteEntrepiso !== false,
  techo: opciones.parteTecho !== false,
  interiores: opciones.parteInteriores !== false,
});

/** Las plantas que van (piso → pisos, piso 2 → entrepiso, techo → techo). */
export const plantasElegidas = (plantas, opciones) => {
  const partes = partesElegidas(opciones);
  return plantas.filter((p) => partes[{ piso: 'pisos', piso2: 'entrepiso', techo: 'techo' }[p.nivel] ?? 'paredes']);
};

/**
 * Caños y perfiles de la obra (o de las partes elegidas).
 * @param items       renglones del presupuesto (los de perfil traen `largosPiezas`)
 * @param materiales  lista de materiales (barras juntas por perfil, ver listaDeMateriales)
 * @param opciones    opciones de impresión (partePisos, parteEntrepiso, parteTecho, parteInteriores)
 * @returns {{ compra: { perfil, ficha, barras, largoBarra, kilos }[], usos: { parte, perfil, piezas, metros }[] }}
 *   compra = cuántas barras de cada perfil (para comprar); usos = dónde va cada uno (piezas y metros).
 *   Con todas las partes, las barras son las de la lista de materiales (cortes compartidos); si se saca alguna, se
 *   vuelven a calcular los cortes solo con las piezas que quedan.
 */
export function listaDePerfiles(items, materiales, opciones = {}) {
  const partes = partesElegidas(opciones);
  const todas = Object.values(partes).every(Boolean);
  const deCorte = items.filter((i) => i.cortes && i.largosPiezas?.length > 0 && partes[parteDeRenglon(i)]);
  const usos = deCorte.map((i) => ({ parte: i.nombre, perfil: i.perfil ?? '', piezas: i.largosPiezas.length, metros: redondear(i.largosPiezas.reduce((a, l) => a + l, 0)) }));
  if (todas) {
    const compra = materiales
      .filter((m) => m.largoBarra && m.cantidad > 0)
      .map((m) => ({ perfil: m.nombre, ficha: m.ficha ?? '', barras: m.cantidad, largoBarra: m.largoBarra, kilos: m.kgPorBarra ? Math.round(m.kgPorBarra * m.cantidad) : null }));
    return { compra, usos };
  }
  // Por perfil y largo de barra, todas las piezas juntas y sus cortes de nuevo.
  const grupos = new Map();
  deCorte.forEach((i) => {
    const clave = `${i.perfil}|${i.largoBarra}`;
    if (!grupos.has(clave)) grupos.set(clave, { perfil: i.perfil ?? i.nombre, largoBarra: i.largoBarra, largoReal: i.largoReal ?? i.largoBarra, kgm: i.kgm ?? 0, piezas: [] });
    grupos.get(clave).piezas.push(...i.largosPiezas);
  });
  const material = (perfil) => materiales.find((m) => m.nombre === perfil);
  const compra = [...grupos.values()].map((g) => {
    const barras = optimizarCortes(g.piezas, g.largoReal).totalBarras;
    const kgPorBarra = material(g.perfil)?.kgPorBarra ?? (g.kgm ? g.kgm * g.largoBarra : 0);
    return { perfil: g.perfil, ficha: material(g.perfil)?.ficha ?? '', barras, largoBarra: g.largoBarra, kilos: kgPorBarra ? Math.round(kgPorBarra * barras) : null };
  });
  return { compra, usos };
}

const TIPO = { puerta: 'Puerta', ventana: 'Ventana' };

/**
 * Aberturas, como se cargan: número, tipo, pared, medidas y dónde está (desde qué esquina, vista desde afuera).
 * @returns {{ numero, tipo, etiqueta, pared, ancho, alto, antepecho, ubicacion }[]}
 */
export function listaDeAberturas(aberturas, params) {
  return aberturas.map((op, i) => ({
    numero: i + 1,
    tipo: TIPO[op.tipo] ?? op.tipo,
    etiqueta: op.etiqueta?.trim() ?? '',
    pared: `${nombreLado(op.lado, params.ladoFrente)} (${op.lado})`,
    ancho: op.ancho,
    alto: op.alto,
    antepecho: op.alturaAntepecho ?? 0,
    ubicacion: `a ${op.offsetHorizontal.toFixed(2)} m de la esquina ${op.ladoReferencia === 'derecha' ? 'derecha' : 'izquierda'}`,
  }));
}

/** Resumen de las aberturas para un renglón: "2 puertas · 3 ventanas". */
export function resumenDeAberturas(lista) {
  const cuenta = (tipo) => lista.filter((a) => a.tipo === tipo).length;
  const partes = [[cuenta('Puerta'), 'puerta', 'puertas'], [cuenta('Ventana'), 'ventana', 'ventanas']]
    .filter(([n]) => n > 0).map(([n, uno, varios]) => `${n} ${n === 1 ? uno : varios}`);
  return partes.join(' · ') || 'sin aberturas';
}
