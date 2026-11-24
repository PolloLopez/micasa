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

/**
 * v1.62: el mismo caño se llama igual aunque esté cargado distinto: "rectangular 80x80" es el cuadrado 80x80, "2" es
 * "2.0" y el "x" con o sin espacios. Así el 80x80x2 tiene un solo color.
 */
export function normalizarNombrePerfil(texto) {
  return String(texto ?? '').trim()
    .replace(/\s*[x×]\s*/gi, 'x')
    // Solo los de 3 medidas (lado x lado x espesor); los perfiles C de 4 (con labio) quedan como están.
    .replace(/(?<![\dx.,])(\d+(?:[.,]\d+)?)x(\d+(?:[.,]\d+)?)x(\d+(?:[.,]\d+)?)(?![\dx.,])/g, (_, a, b, e) => `${a}x${b}x${Number(e.replace(',', '.')).toFixed(1)}`)
    .replace(/^Caño (cuadrado|rectangular)\b/i, 'Caño estructural');
}

/** El nombre del perfil con el que se compra una pieza (ej. "Caño estructural 80x80x2.0") o SIN_PERFIL. */
export function perfilDePieza(p, catalogo = []) {
  const lista = catalogo ?? [];
  const { perfil: id, renglon } = compraDePieza(p, lista);
  const hierro = id && lista.find((i) => i.id === id && i.categoria === 'hierro');
  if (hierro) return normalizarNombrePerfil(nombrePerfil(hierro));
  // v1.62: un uso sin perfil de la lista elegido, pero con su texto (ej. "Caño estructural 80x80x2.0"): ese nombre.
  const uso = renglon && lista.find((i) => i.id === String(renglon).split('@')[0]);
  return uso?.perfil?.trim() ? normalizarNombrePerfil(uso.perfil) : SIN_PERFIL;
}

/**
 * Un color por perfil, ordenados por nombre. Las piezas de madera no cuentan (se ven de madera).
 * v1.85 (Leandro: "no actualiza los colores de las piezas"): antes el color salía del lugar del perfil entre los que
 * se USAN, así que al dejar de usar uno (ej. pasar los tirantes a 80x80) los demás cambiaban de color. Ahora sale de su
 * lugar en la LISTA de perfiles (Materiales), que no cambia; y `propios` = { nombre: color } los elegidos por Leandro
 * en la leyenda del 3D mandan sobre todo.
 * @returns {{ perfil, color, piezas, metros }[]}
 */
export function coloresPorPerfil(piezas, catalogo = [], propios = {}) {
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
  // El lugar de cada perfil en la lista de perfiles (los que no están en la lista van después, por nombre).
  const deLaLista = [...new Set((catalogo ?? []).filter((i) => i.categoria === 'hierro').map((h) => normalizarNombrePerfil(nombrePerfil(h))))];
  const lugar = (n) => { const i = deLaLista.indexOf(n); return i >= 0 ? i : deLaLista.length + nombres.indexOf(n); };
  // Cada uno toma el color de su lugar; si ya lo tiene otro en uso (la lista es más larga que la paleta), el siguiente
  // libre: dos perfiles en uso nunca comparten color. Los elegidos a mano primero.
  const usados = new Set(nombres.map((n) => propios?.[n]).filter(Boolean));
  const colorDe = new Map();
  [...nombres].sort((x, y) => lugar(x) - lugar(y)).forEach((n) => {
    if (propios?.[n]) { colorDe.set(n, propios[n]); return; }
    let i = lugar(n);
    for (let k = 0; k < PALETA_PERFILES.length && usados.has(PALETA_PERFILES[i % PALETA_PERFILES.length]); k++) i++;
    const color = PALETA_PERFILES[i % PALETA_PERFILES.length];
    usados.add(color);
    colorDe.set(n, color);
  });
  const lista = nombres.map((n) => ({ ...grupos.get(n), color: colorDe.get(n) }));
  if (grupos.has(SIN_PERFIL)) lista.push({ ...grupos.get(SIN_PERFIL), color: COLOR_SIN_PERFIL });
  return lista;
}
