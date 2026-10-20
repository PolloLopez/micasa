// ==========================================================
// CORTES COMPARTIDOS (v1.19.1)
// ----------------------------------------------------------
// Antes cada renglón del presupuesto (Columnas, Zanca…) calculaba sus
// barras por separado. Pero si dos renglones usan el MISMO hierro, en
// obra se cortan de la misma pila: las piezas chicas de uno entran en
// los sobrantes del otro.
//
// Acá se juntan los renglones que tienen:
//   - el mismo perfil (comparado "normalizado": 80x80x2 = 80 x 80 x 2.0),
//   - el mismo largo de barra y
//   - el mismo precio (si el precio es otro, puede ser otro proveedor
//     o un error: no se juntan y se avisa).
// Se optimizan todas las piezas juntas y las barras se reparten entre
// los renglones según los metros que usa cada uno. Si juntarlas no
// ahorra ninguna barra, cada renglón queda como estaba.
// ==========================================================

import { optimizarCortes } from './optimizadorCortes.js';

/**
 * Texto de perfil normalizado para comparar:
 *   "Caño estructural 80 x 80 x 2" y "caño estructural 80x80x2.0" dan lo mismo.
 * Minúsculas, sin acentos, coma decimal = punto, "×" o "*" = "x", sin espacios
 * alrededor de la "x" entre números y números sin ceros de más (2.0 -> 2, 1.60 -> 1.6).
 */
export function clavePerfil(texto) {
  return String(texto ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // saca acentos (Caño -> Cano)
    .toLowerCase()
    .replace(/(\d),(\d)/g, '$1.$2')
    .replace(/[×*]/g, 'x')
    .replace(/(\d)\s*x\s*(?=\d)/g, '$1x')
    .replace(/\d+(\.\d+)?/g, (n) => String(Number(n)))
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Reparte `total` barras enteras según los metros de cada renglón
 * (método del mayor resto: la suma da justo el total).
 * @returns {number[]} barras de cada renglón, en el mismo orden
 */
export function repartirBarras(total, metros) {
  const suma = metros.reduce((a, m) => a + m, 0);
  if (suma <= 0) return metros.map(() => 0);
  const exactas = metros.map((m) => (total * m) / suma);
  const enteras = exactas.map(Math.floor);
  let faltan = total - enteras.reduce((a, n) => a + n, 0);
  // Los que quedaron con más resto se llevan las barras que faltan.
  exactas
    .map((x, i) => ({ i, resto: x - Math.floor(x) }))
    .sort((a, b) => b.resto - a.resto)
    .forEach(({ i }) => {
      if (faltan > 0) { enteras[i]++; faltan--; }
    });
  return enteras;
}

const metrosDe = (item) => item.largosPiezas.reduce((a, l) => a + l, 0);
/** "Columnas, Zanca y marco de descanso": con coma, porque hay nombres que ya llevan "y". */
const nombres = (lista) => lista.map((i) => i.nombre).join(', ');

/**
 * Junta los renglones de perfil que usan el mismo hierro.
 * No modifica `items`: devuelve los renglones nuevos y los grupos para el diagrama.
 *
 * @param {object[]} items - renglones del presupuesto; los de perfil traen
 *   { id, nombre, perfil, largoBarra, largoReal, precio, cortes, largosPiezas }
 * @returns {{ items: object[], grupos: object[] }}
 *   grupo = { id, perfil, largoBarra, largoReal, renglones: [{id, nombre}], cortes, barrasSeparadas, compartido }
 */
export function compartirCortes(items) {
  const deCorte = items.filter((i) => i.cortes && i.largosPiezas?.length > 0);

  // 1) Agrupar por perfil + largo de barra + precio.
  const porClave = new Map();
  deCorte.forEach((item) => {
    const clave = `${clavePerfil(item.perfil)}|${item.largoBarra}|${item.precio}`;
    if (!porClave.has(clave)) porClave.set(clave, []);
    porClave.get(clave).push(item);
  });

  const cambios = new Map(); // id del renglón -> cambios a aplicar
  const grupos = [];

  porClave.forEach((renglones) => {
    const separadas = renglones.reduce((a, r) => a + r.cortes.totalBarras, 0);
    let juntos = null;
    if (renglones.length > 1) {
      const piezas = renglones.flatMap((r) => r.largosPiezas.map((largo) => ({ largo, origen: r.id })));
      juntos = optimizarCortes(piezas, renglones[0].largoReal);
      if (juntos.totalBarras >= separadas) juntos = null; // no ahorra: cada uno por su lado
    }

    if (!juntos) {
      renglones.forEach((r) => grupos.push({
        id: r.id, perfil: r.perfil, largoBarra: r.largoBarra, largoReal: r.largoReal,
        renglones: [{ id: r.id, nombre: r.nombre }], cortes: r.cortes, barrasSeparadas: r.cortes.totalBarras, compartido: false,
      }));
      return;
    }

    // 2) Barras compartidas: se reparten por metros usados.
    const barras = repartirBarras(juntos.totalBarras, renglones.map(metrosDe));
    renglones.forEach((r, i) => {
      const otros = renglones.filter((o) => o !== r);
      cambios.set(r.id, {
        cantidad: barras[i],
        cortes: juntos,
        grupoCortes: renglones[0].id,
        compartenCon: otros.map((o) => o.nombre),
        // Con 0 barras propias: todas sus piezas entran en lo que sobra de los otros renglones.
        detalle: barras[i] === 0
          ? `${r.largosPiezas.length} piezas · salen de los sobrantes de ${nombres(otros)}`
          : `${r.largosPiezas.length} piezas · comparte barras con ${nombres(otros)}`,
      });
    });
    grupos.push({
      id: renglones[0].id, perfil: renglones[0].perfil, largoBarra: renglones[0].largoBarra, largoReal: renglones[0].largoReal,
      renglones: renglones.map((r) => ({ id: r.id, nombre: r.nombre })), cortes: juntos, barrasSeparadas: separadas, compartido: true,
    });
  });

  // 3) Aviso: mismo perfil y largo, pero otro precio (no se juntan).
  deCorte.forEach((item) => {
    const mismos = deCorte.filter((o) => o !== item && o.largoBarra === item.largoBarra
      && clavePerfil(o.perfil) === clavePerfil(item.perfil) && o.precio !== item.precio);
    if (mismos.length === 0) return;
    const aviso = `mismo perfil que ${nombres(mismos)} con otro precio: no comparten barras`;
    const previo = cambios.get(item.id) ?? {};
    cambios.set(item.id, { ...previo, avisoPrecio: aviso, detalle: `${previo.detalle ?? item.detalle} · ${aviso}` });
  });

  return {
    items: items.map((i) => (cambios.has(i.id) ? { ...i, ...cambios.get(i.id) } : i)),
    grupos,
  };
}
