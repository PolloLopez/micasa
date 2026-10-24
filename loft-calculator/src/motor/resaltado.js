// ==========================================================
// RESALTAR EN EL 3D (v1.27)
// ----------------------------------------------------------
// Al pasar el mouse (o fijar con 👁) un perfil de la lista, un renglón del
// presupuesto o una parte de la obra (una pared, el piso, el techo…), el 3D
// pinta las piezas que le corresponden. Acá está la regla, sin Three.js:
//
//   { tipo: 'perfil',  id: 'perfil-3' }   piezas hechas con ese perfil
//   { tipo: 'renglon', id: 'columna' }    piezas que suman a ese renglón
//                                         (también 'columna@perfil-3', los por pared)
//   { tipo: 'grupo',   id: 'A' | 'piso' | 'piso2' | 'techo' | 'escalera' | … }
//                      (o una lista: id: ['piso', 'piso2'])
//
// Mismo criterio que el presupuesto (calcularRenglones): primero el perfil
// elegido a mano, después el de su pared, después el de su tipo.
// ==========================================================

import { INSUMO } from './constantes.js';
import { insumoDePieza } from './piezasAgregadas.js';

/** Renglón de origen de una pieza ("columna", "columna-esquina", "montante"…). */
const renglonBase = (p) => (p.insumo ?? (p.esquina ? INSUMO.COLUMNA_ESQUINA : insumoDePieza(p)));

/**
 * Renglón del presupuesto y perfil de la lista con los que se compra una pieza.
 * @param catalogo  catálogo (con o sin resolver: alcanza con que los usos tengan perfilId)
 * @returns {{ renglon: string|null, perfil: string|null }}
 */
export function compraDePieza(p, catalogo) {
  const base = renglonBase(p);
  const uso = base ? catalogo.find((i) => i.id === base) : null;
  const perfilDelUso = uso?.categoria === 'hierro' ? uso.id : uso?.perfilId ?? null;
  // Pared con perfil propio (v1.22): la pieza va al renglón "Columnas (lado B)" con ese perfil.
  const deLaPared = !p.insumo && p.perfilPared && p.perfilPared !== perfilDelUso
    && catalogo.some((i) => i.categoria === 'hierro' && i.id === p.perfilPared);
  if (deLaPared) return { renglon: `${base}@${p.perfilPared}`, perfil: p.perfilPared };
  return { renglon: base, perfil: perfilDelUso };
}

/** ¿La pieza va resaltada con este criterio? (null = nada resaltado) */
export function piezaResaltada(p, criterio, catalogo) {
  if (!criterio) return false;
  if (criterio.tipo === 'grupo') {
    // El marco de piso de una pared está en el grupo 'piso': se la reconoce por el id.
    const grupos = Array.isArray(criterio.id) ? criterio.id : [criterio.id];
    return grupos.some((g) => p.grupos.includes(g) || p.id === `marco-piso:${g}`);
  }
  const compra = compraDePieza(p, catalogo);
  if (criterio.tipo === 'perfil') return compra.perfil === criterio.id;
  if (criterio.tipo === 'renglon') return compra.renglon === criterio.id;
  return false;
}

/** Cuántas piezas resalta un criterio (para el cartel "12 piezas resaltadas"). */
export const contarResaltadas = (piezas, criterio, catalogo) =>
  (criterio ? piezas.filter((p) => piezaResaltada(p, criterio, catalogo)).length : 0);

/** Mismo criterio (para no redibujar el 3D si no cambió). */
export const mismoCriterio = (a, b) => a === b
  || (Boolean(a) && Boolean(b) && a.tipo === b.tipo && String(a.id) === String(b.id));
