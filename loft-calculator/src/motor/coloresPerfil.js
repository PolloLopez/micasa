// ==========================================================
// COLOR POR PERFIL (v1.55)
// ----------------------------------------------------------
// Pedido de Leandro (12/11): "el mismo caño 80x80x2 lo veo en distintos
// colores". El 3D pinta cada pieza según su función (columna, viga,
// tirante…). Con "Color por perfil" se pinta según el caño o perfil del
// que está hecha: todas las piezas del mismo perfil, del mismo color, con
// una leyenda que dice cuántas piezas y cuántos metros hay de cada uno.
// El perfil de cada pieza es el mismo con el que se compra (compraDePieza:
// el elegido a mano, el de su pared o el de su tipo), así coincide con la
// lista de materiales.
// ==========================================================

import { compraDePieza } from './resaltado.js';
import { nombrePerfil } from './perfiles.js';

/** Colores bien distintos entre sí (se leen sobre el fondo oscuro del 3D y en el PDF). */
export const PALETA_PERFILES = [
  '#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#06b6d4',
  '#ec4899', '#84cc16', '#f97316', '#14b8a6', '#eab308', '#6366f1',
];
export const COLOR_SIN_PERFIL = '#94a3b8';
export const SIN_PERFIL = 'Sin perfil en el catálogo';

/** El nombre del perfil con el que se compra una pieza (ej. "Caño cuadrado 80x80x2") o SIN_PERFIL. */
export function perfilDePieza(p, catalogo = []) {
  const { perfil: id } = compraDePieza(p, catalogo ?? []);
  const hierro = id && catalogo.find((i) => i.id === id && i.categoria === 'hierro');
  return hierro ? nombrePerfil(hierro) : SIN_PERFIL;
}

/**
 * Un color por perfil, ordenados por nombre (así un perfil conserva su color aunque cambien las cantidades).
 * Las piezas de madera no cuentan (se ven de madera).
 * @returns {{ perfil, color, piezas, metros }[]}
 */
export function coloresPorPerfil(piezas, catalogo = []) {
  const grupos = new Map();
  piezas.filter((p) => !p.madera).forEach((p) => {
    const perfil = perfilDePieza(p, catalogo);
    const g = grupos.get(perfil) ?? { perfil, piezas: 0, metros: 0 };
    g.piezas += 1;
    g.metros += p.largo ?? 0;
    grupos.set(perfil, g);
  });
  const nombres = [...grupos.keys()].filter((n) => n !== SIN_PERFIL)
    .sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));
  const lista = nombres.map((n, i) => ({ ...grupos.get(n), color: PALETA_PERFILES[i % PALETA_PERFILES.length] }));
  if (grupos.has(SIN_PERFIL)) lista.push({ ...grupos.get(SIN_PERFIL), color: COLOR_SIN_PERFIL });
  return lista;
}
