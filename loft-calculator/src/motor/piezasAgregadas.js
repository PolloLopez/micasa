// ==========================================================
// PIEZAS AGREGADAS A MANO (v1.16: "Duplicar" y copiar/pegar)
// ----------------------------------------------------------
// Además de eliminar y editar piezas, el herrero puede DUPLICAR una
// (ej. una columna extra al lado de otra). La copia se guarda en
// params.piezasAgregadas = [{ id, tipo, grupos, desde, hasta, insumo }]
// y viaja con el proyecto, igual que las eliminadas y editadas.
//
//   - id     'agr:<n>' (único; así se distingue de las del motor)
//   - insumo renglón del presupuesto donde se cotiza (el de la pieza
//            copiada): el presupuesto ya suma las piezas con `insumo`.
//   - una agregada se edita (recortar, mover, perfil) con el mismo
//     editor, porque piezasEditadas usa su id.
// ==========================================================

import { INSUMO, LADOS } from './constantes.js';
import { pieza } from './segmentos.js';

export const PREFIJO_AGREGADA = 'agr:';
export const MAXIMO_AGREGADAS = 300;
const CORRIMIENTO_COPIA = 0.5; // la copia aparece a 50 cm de la original

/** Renglón del presupuesto de cada tipo de pieza (el que usa el motor). */
export const INSUMO_DE_TIPO = {
  columna: INSUMO.COLUMNA,
  montante: INSUMO.MONTANTE, 'montante-dintel': INSUMO.MONTANTE, 'montante-antepecho': INSUMO.MONTANTE,
  dintel: INSUMO.MARCO_ABERTURA, jamba: INSUMO.MARCO_ABERTURA, alfeizar: INSUMO.MARCO_ABERTURA, travesano: INSUMO.MARCO_ABERTURA,
  'marco-piso': INSUMO.BORDE_PISO, solera: INSUMO.MARCO, 'marco-piso2': INSUMO.BORDE_PISO, // v1.28: borde de piso aparte
  'viga-cierre': INSUMO.VIGA_CIERRE,
  piso: INSUMO.PISO, 'transv-piso': INSUMO.TRANSVERSAL_PISO,
  piso2: INSUMO.PISO_2, 'transv-piso2': INSUMO.TRANSVERSAL_PISO_2,
  horizontal: INSUMO.CORREA, 'viga-techo': INSUMO.VIGA_TECHO, 'correa-techo': INSUMO.CORREA_TECHO, 'borde-techo': INSUMO.BORDE_TECHO,
  zanca: INSUMO.ZANCA, 'marco-descanso': INSUMO.ZANCA, 'apoyo-escalon': INSUMO.APOYO_ESCALON,
  'columna-escalera': INSUMO.COLUMNA_ESCALERA, riostra: INSUMO.RIOSTRA,
  'grada-zanca': INSUMO.GRADA_ZANCA, 'grada-parante': INSUMO.GRADA_PARANTE, 'grada-apoyo': INSUMO.GRADA_APOYO,
  'grada-viga': INSUMO.GRADA_VIGA, 'grada-union': INSUMO.GRADA_UNION,
  'mont-pata': INSUMO.MONTAJE_PATA, 'mont-marco': INSUMO.MONTAJE_MARCO, 'mont-travesano': INSUMO.MONTAJE_MARCO,
};

/** Renglón de una pieza: el que se le asignó a mano o el de su tipo. */
export const insumoDePieza = (p) => p.insumo ?? INSUMO_DE_TIPO[p.tipo] ?? null;

/** Id libre para una pieza nueva: agr:1, agr:2, … */
export function idNuevaAgregada(agregadas) {
  const usados = agregadas.map((p) => Number(p.id.slice(PREFIJO_AGREGADA.length))).filter(Number.isFinite);
  return `${PREFIJO_AGREGADA}${usados.length ? Math.max(...usados) + 1 : 1}`;
}

/**
 * Hacia dónde se corre la copia:
 *   - vertical (columna, parante): a lo largo de su pared (o en x si no es de una pared),
 *     siempre hacia el centro, así una columna de esquina no se copia afuera de la casa;
 *   - horizontal de una pared (horizontal, solera): 50 cm más arriba;
 *   - horizontal suelta (tirante, viga): de costado, en el plano.
 */
function corrimiento(p) {
  const d = p.hasta.map((v, i) => v - p.desde[i]);
  const largoPlano = Math.hypot(d[0], d[2]);
  const lado = LADOS.find((l) => p.grupos.includes(l));
  if (largoPlano < 1e-6) {
    // Paredes A y C van en x; B y D en z. El signo lleva la copia hacia el centro (0).
    const haciaElCentro = (v) => (v > 1e-6 ? -CORRIMIENTO_COPIA : CORRIMIENTO_COPIA);
    return lado === 'B' || lado === 'D' ? [0, 0, haciaElCentro(p.desde[2])] : [haciaElCentro(p.desde[0]), 0, 0];
  }
  if (lado) return [0, CORRIMIENTO_COPIA, 0];
  return [(-d[2] / largoPlano) * CORRIMIENTO_COPIA, 0, (d[0] / largoPlano) * CORRIMIENTO_COPIA];
}

/**
 * Copia de una pieza (tal como se ve, ya editada) para guardar en params.piezasAgregadas.
 * @returns {{ id, tipo, grupos, desde, hasta, insumo }}
 */
export function duplicarPieza(p, agregadas) {
  const [dx, dy, dz] = corrimiento(p);
  const mover = (q) => [q[0] + dx, q[1] + dy, q[2] + dz].map((v) => Number(v.toFixed(4)));
  // Una columna de esquina (de dos paredes) copiada queda sobre UNA: la pared por la que se corrió.
  const vertical = Math.hypot(p.hasta[0] - p.desde[0], p.hasta[2] - p.desde[2]) < 1e-6;
  const lado = LADOS.find((l) => p.grupos.includes(l));
  return {
    id: idNuevaAgregada(agregadas),
    tipo: p.tipo,
    grupos: vertical && lado ? [lado] : [...p.grupos],
    desde: mover(p.desde),
    hasta: mover(p.hasta),
    insumo: insumoDePieza(p),
  };
}

/** Piezas del motor a partir de lo guardado (el `insumo` las manda a su renglón). */
export function piezasDeAgregadas(agregadas = []) {
  return agregadas.map((a) => ({ ...pieza(a.id, a.tipo, a.grupos, a.desde, a.hasta), insumo: a.insumo, agregada: true }));
}

/** Revisa lo guardado. @returns {string|null} error */
export function revisarAgregadas(agregadas, renglonesValidos) {
  if (!Array.isArray(agregadas)) return 'Lista de piezas agregadas inválida';
  if (agregadas.length > MAXIMO_AGREGADAS) return `Máximo ${MAXIMO_AGREGADAS} piezas agregadas`;
  const ids = new Set();
  const punto = (q) => Array.isArray(q) && q.length === 3 && q.every((v) => Number.isFinite(v) && Math.abs(v) < 1000);
  for (const a of agregadas) {
    if (!a || typeof a.id !== 'string' || !a.id.startsWith(PREFIJO_AGREGADA) || ids.has(a.id)) return 'Pieza agregada con id inválido';
    ids.add(a.id);
    if (typeof a.tipo !== 'string' || !Array.isArray(a.grupos) || !a.grupos.every((g) => typeof g === 'string')) return 'Pieza agregada inválida';
    if (!punto(a.desde) || !punto(a.hasta)) return 'Pieza agregada con posición inválida';
    if (Math.hypot(...a.hasta.map((v, i) => v - a.desde[i])) < 0.01) return 'Pieza agregada sin largo';
    if (!renglonesValidos.includes(a.insumo)) return 'Pieza agregada con un perfil que no existe';
  }
  return null;
}
