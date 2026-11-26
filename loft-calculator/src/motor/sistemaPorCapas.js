// ==========================================================
// REVESTIMIENTO POR CAPAS (v1.102)
// ----------------------------------------------------------
// Pedido de Leandro (26/11): "por costos estoy evaluando hacer el
// revestimiento en chapa trapezoidal sin aislante, una manta de lana de
// vidrio de 5 cm y placas de fenólico [por dentro], en las paredes; el techo
// con los paneles sándwich… que incluya lana de vidrio, maderas y tacos para
// sostenerla, así comparo, y también la mano de obra del revestimiento".
//
// Un revestimiento "por capas" es un revestimiento exterior común (la chapa)
// que además:
//   - va con un revestimiento INTERIOR (el fenólico): las paredes sin interior
//     elegido lo llevan solo (ver generarEstructura);
//   - tiene CAPAS: materiales que se estiman con sus m² (base 'rev:<id>', ver
//     consumibles.js): lana, membrana, listones de madera, tacos…;
//   - tiene su MANO DE OBRA por m² de pared (para Comparar revestimientos).
// Acá está el "armado de fábrica" para no cargar todo a mano. Los rendimientos
// son orientativos: se cambian en cada capa.
// ==========================================================

import { REVESTIMIENTO_POR_DEFECTO } from './revestimientos.js';
import { baseDeRevestimiento } from './consumibles.js';

const SEPARACION_LISTONES = 0.6; // m entre listones (clavaderas) de madera
const LARGO_LISTON = 3.05; // m (largo comercial de un listón)
const FIJACION_CADA = 0.4; // m: un taco / tornillo cada 40 cm de listón
const MERMA = 1.05; // 5 % de solapes y recortes

/** Un id que no esté en el catálogo: prefijo-1, prefijo-2… */
function idLibre(usados, prefijo) {
  let n = 1;
  while (usados.has(`${prefijo}-${n}`)) n++;
  usados.add(`${prefijo}-${n}`);
  return `${prefijo}-${n}`;
}

/**
 * Las capas de fábrica (cada una por m² de pared revestida, ya con la merma).
 * @returns {{ nombre, perfil, unidad, coeficiente, ayuda }[]}
 */
export function capasDeFabrica() {
  const metrosDeListon = 1 / SEPARACION_LISTONES; // m de listón por m² de pared
  return [
    { nombre: 'Lana de vidrio', perfil: 'Manta 50 mm con aluminio (rollo 1,20 × 12 m = 14,4 m²)', unidad: 'rollo',
      coeficiente: Number((MERMA / 14.4).toFixed(4)), ayuda: 'un rollo cada 14,4 m², + 5 %; el aluminio va hacia adentro' },
    { nombre: 'Membrana hidrófuga', perfil: 'Barrera de agua y viento respirable (rollo 1,5 × 50 m = 75 m²)', unidad: 'rollo',
      coeficiente: Number((1.1 / 75).toFixed(4)), ayuda: 'un rollo cada 75 m², + 10 % de solapes; va detrás de la chapa' },
    { nombre: 'Listones de madera', perfil: `Clavaderas 2" × 1" de ${LARGO_LISTON.toString().replace('.', ',')} m, cada ${SEPARACION_LISTONES * 100} cm`, unidad: 'u',
      coeficiente: Number(((metrosDeListon * MERMA) / LARGO_LISTON).toFixed(4)), ayuda: `listones cada ${SEPARACION_LISTONES * 100} cm: sostienen la lana y el fenólico` },
    { nombre: 'Tacos y fijaciones', perfil: 'Para fijar los listones (uno cada 40 cm)', unidad: 'u',
      coeficiente: Number((metrosDeListon / FIJACION_CADA).toFixed(4)), ayuda: 'uno cada 40 cm de listón' },
  ];
}

/** Una capa nueva (accesorio estimado con los m² del revestimiento). */
export const capaNueva = (id, idRevestimiento, datos = {}) => ({
  id, categoria: 'accesorio', nombre: 'Capa nueva', perfil: '', unidad: 'u', cantidad: 0, largoBarra: null, precio: 0, precios: {},
  modo: 'estimado', base: baseDeRevestimiento(idRevestimiento), coeficiente: 0, parte: 'revestimiento', ...datos,
});

/**
 * El sistema de fábrica: chapa trapezoidal (por fuera) + fenólico (por dentro) + lana, membrana, listones y tacos.
 * Sin precios (se cargan en cada proveedor). La chapa se cobra por m² con 1 m útil: el precio por m² es el de un metro
 * de chapa.
 * @returns {object[]} los renglones nuevos del catálogo
 */
export function sistemaChapaLanaFenolico(catalogo = []) {
  const usados = new Set(catalogo.map((i) => i.id));
  const idChapa = idLibre(usados, 'panel-chapa');
  const idFenolico = idLibre(usados, 'panel-fenolico');
  const fenolico = {
    ...REVESTIMIENTO_POR_DEFECTO, id: idFenolico, categoria: 'panel', nombre: 'Placa fenólica (interior)', perfil: 'Fenólico 18 mm 1,22 × 2,44',
    unidad: 'placa', largoBarra: null, precio: 0, precios: {}, color: '#7c4a2d', colorInterior: '#a16207',
    venta: 'estandar', anchoPlaca: 1.22, largoPlaca: 2.44, espesor: 18, ubicacion: 'cara',
  };
  const chapa = {
    ...REVESTIMIENTO_POR_DEFECTO, id: idChapa, categoria: 'panel', nombre: 'Chapa trapezoidal + lana + fenólico', perfil: 'Chapa C25 T101 sin aislante',
    unidad: 'm²', largoBarra: null, precio: 0, precios: {}, color: '#94a3b8', colorInterior: '#94a3b8',
    venta: 'medida', anchoUtil: 1, anchoTotal: 1.1, largoMaximo: 12, solape: 0.2, espesor: 25, ubicacion: 'cara', cobro: 'm2',
    interior: idFenolico, manoDeObraM2: 0,
  };
  const capas = capasDeFabrica().map(({ ayuda: _a, ...c }) => capaNueva(idLibre(usados, 'acc'), idChapa, c)); // eslint-disable-line no-unused-vars
  return [chapa, fenolico, ...capas];
}
