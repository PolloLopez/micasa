// ==========================================================
// ARMADO EN OBRA (v1.83): qué fierros ya están puestos y con qué medida
// ----------------------------------------------------------
// Pedido de Leandro (23/11, ya empezó a construir): "necesito marcar qué
// fierros fueron ya instalados y confirmar medidas".
//
// Se guarda en params.avancePiezas, por id de pieza (el mismo del 3D y de
// la hoja de corte):
//   { [idPieza]: { instalada: true, verificada: true, medidaReal: 2.43 } }
//     instalada  = la pieza ya está puesta
//     verificada = se midió en obra y está bien
//     medidaReal = lo que midió en obra cuando NO coincidía (la pieza queda
//                  de esa medida: la aplica el motor al final de todo, después
//                  de las uniones; ver aplicarMedidasReales en estructura.js)
//
// Se marca tocando la pieza en el 3D, en la lista de Obra → Armado (por
// pared o zona, y por tipo) o de a grupos ("toda la pared A").
// ==========================================================

import { NOMBRE_TIPO_PIEZA } from './estructura.js';
import { LARGO_MINIMO_EDITADA } from './edicionPiezas.js';

/** Las zonas de la obra, en el orden de la lista (las paredes van con su nombre). */
const ZONAS = [
  ['A', 'Pared A'], ['B', 'Pared B'], ['C', 'Pared C'], ['D', 'Pared D'],
  ['piso', 'Piso (planta baja)'], ['entrepiso', 'Entrepiso'], ['piso2', 'Piso 2'], ['techo', 'Techo'],
  ['escalera', 'Escalera'], ['mesada', 'Mesadas'], ['tabique', 'Tabiques'],
];

/** Deja solo lo válido (los proyectos de antes: vacío). */
export function normalizarAvance(avance) {
  if (!avance || typeof avance !== 'object' || Array.isArray(avance)) return {};
  return Object.fromEntries(Object.entries(avance).slice(0, 5000)
    .filter(([id, v]) => typeof id === 'string' && id.length <= 80 && v && typeof v === 'object')
    .map(([id, v]) => [id, {
      ...(v.instalada === true ? { instalada: true } : {}),
      ...(v.verificada === true ? { verificada: true } : {}),
      ...(Number.isFinite(v.medidaReal) && v.medidaReal > 0 && v.medidaReal <= 30 ? { medidaReal: v.medidaReal } : {}),
    }])
    .filter(([, v]) => Object.keys(v).length > 0));
}

/**
 * Marca (o desmarca) un campo en varias piezas a la vez: una sola, un tipo, una pared entera.
 * @param campo 'instalada' o 'verificada'
 */
export function marcarPiezas(avance, ids, campo, valor) {
  const nuevo = { ...avance };
  ids.forEach((id) => {
    const { [campo]: _anterior, ...resto } = nuevo[id] ?? {}; // eslint-disable-line no-unused-vars
    const pieza = valor ? { ...resto, [campo]: true } : resto;
    if (Object.keys(pieza).length) nuevo[id] = pieza; else delete nuevo[id];
  });
  return nuevo;
}

/** De qué zona es una pieza (su pared, el piso, el techo…). */
export function zonaDePieza(p) {
  if (p.nivel === 'piso2') return p.grupos?.includes('mesada') ? 'mesada' : p.grupos?.includes('tabique') ? 'tabique' : 'piso2';
  const g = p.grupos ?? [];
  return ZONAS.map(([z]) => z).find((z) => g.includes(z)) ?? g[0] ?? 'otras';
}

/**
 * Las piezas para la lista de Obra → Armado: por zona (pared, piso, techo…) y dentro, por tipo (columnas, vigas…),
 * con cuántas están puestas y verificadas en cada grupo.
 * @param nombreZona (clave) => nombre para mostrar (las paredes con su nombre: "Frente (A)")
 */
export function gruposDeArmado(piezas, avance = {}, nombreZona = (z) => ZONAS.find(([c]) => c === z)?.[1] ?? z) {
  const porZona = new Map();
  piezas.forEach((p) => {
    const zona = zonaDePieza(p);
    if (!porZona.has(zona)) porZona.set(zona, new Map());
    const porTipo = porZona.get(zona);
    const tipo = NOMBRE_TIPO_PIEZA[p.tipo] ?? p.tipo;
    if (!porTipo.has(tipo)) porTipo.set(tipo, []);
    porTipo.get(tipo).push(p);
  });
  const contar = (lista) => ({
    total: lista.length,
    instaladas: lista.filter((p) => avance[p.id]?.instalada).length,
    verificadas: lista.filter((p) => avance[p.id]?.verificada).length,
  });
  const orden = (z) => { const i = ZONAS.findIndex(([c]) => c === z); return i < 0 ? 99 : i; };
  return [...porZona.entries()].sort((a, b) => orden(a[0]) - orden(b[0])).map(([zona, porTipo]) => {
    const tipos = [...porTipo.entries()].map(([nombre, lista]) => ({ nombre, piezas: lista, ...contar(lista) }));
    return { zona, nombre: nombreZona(zona), tipos, ...contar(tipos.flatMap((t) => t.piezas)) };
  });
}

/** Cuánto está armado: piezas, metros y %. */
export function resumenDeArmado(piezas, avance = {}) {
  const puestas = piezas.filter((p) => avance[p.id]?.instalada);
  const metros = (lista) => lista.reduce((a, p) => a + p.largo, 0);
  return {
    total: piezas.length,
    instaladas: puestas.length,
    verificadas: piezas.filter((p) => avance[p.id]?.verificada).length,
    porcentaje: piezas.length ? Math.round((puestas.length / piezas.length) * 100) : 0,
    metros: metros(piezas),
    metrosInstalados: metros(puestas),
  };
}

/** v1.83: la medida real tiene que ser una pieza que se pueda fabricar (de 5 cm a 30 m). */
export function errorDeMedidaReal(medida) {
  if (!(Number.isFinite(medida) && medida >= LARGO_MINIMO_EDITADA)) return `Mínimo ${LARGO_MINIMO_EDITADA * 100} cm`;
  if (medida > 30) return 'Máximo 30 m';
  return null;
}
