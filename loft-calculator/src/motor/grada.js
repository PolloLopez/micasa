// ==========================================================
// GRADA PARA ESPECTADORES (proyecto propio, params.tipoProyecto = 'grada')
// ----------------------------------------------------------
// Filas de asientos escalonadas sobre el piso. La fila 1 (la más baja)
// queda adelante, del lado A (z+); las filas suben hacia atrás (lado C).
// Reusa la idea del tramo de escalera, con medidas de grada y varios
// apoyos a lo largo de la fila.
//
// Estructura (en planta, x a lo largo de la fila; z de adelante hacia atrás):
//   - PÓRTICOS cada `separacionPorticos` a lo largo de la fila. Cada uno lleva:
//       · zanca inclinada: del pie de adelante al tope de atrás;
//       · apoyos de fila: un perfil horizontal por fila (de adelante a atrás),
//         donde se atornillan los tablones;
//       · parantes: verticales en las líneas de fila (cada `parantesCadaFilas`
//         filas; 0 = sin parantes, todo lo carga la zanca).
//   - VIGAS LONGITUDINALES: por fila, unen los pórticos a lo largo.
//   - RIOSTRAS EN CRUZ: atrás (plano más alto), entre pórticos, para que la
//     grada no se mueva de costado: ninguna, en los vanos de los extremos o
//     en todos.
//   - TABLONES (madera), según `tipoTablones`:
//       · 'separados': asiento adelante y pie atrás, cada uno con su ancho y su
//         renglón en el presupuesto;
//       · 'mismoMaterial': igual que separados, pero los dos son el mismo tablón
//         (un solo renglón "Tablones de grada");
//       · 'unico': N tablones iguales repartidos en la profundidad de la fila,
//         que sirven de asiento y de pie (tribuna simple).
//     Se sienta en el borde de la fila y se apoyan los pies en la fila de abajo.
// ==========================================================

import { pieza, cruz } from './segmentos.js';

export const ESPESOR_TABLON = 0.05; // los perfiles van debajo de la madera
const PERSONA_POR_METRO = 1 / 0.45; // 45 cm de asiento por persona (para estimar capacidad)

/** Grada de ejemplo: 6 filas de 6 m. */
export const GRADA_INICIAL = {
  filas: 6,
  largoFila: 6,
  huella: 0.75, // profundidad de cada fila
  contrahuella: 0.4, // altura de cada fila
  separacionPorticos: 1.5,
  parantesCadaFilas: 1, // 0 = sin parantes
  vigasPorFila: 2,
  riostras: 'extremos', // 'no' | 'extremos' | 'todos'
  tipoTablones: 'separados', // 'separados' | 'mismoMaterial' | 'unico'
  anchoAsiento: 0.3,
  anchoPie: 0.3,
  anchoTablon: 0.25, // solo 'unico'
  tablonesPorFila: 3, // solo 'unico'
};

/** Opciones de tablones (para la pantalla). */
export const TIPOS_TABLONES = [
  ['separados', 'Asiento y pie separados'],
  ['mismoMaterial', 'Asiento y pie del mismo tablón'],
  ['unico', 'Un solo tipo de tablón por fila'],
];

/** Posiciones de los pórticos a lo largo de la fila (x), repartidas parejo. */
export function posicionesPorticos(largoFila, separacion) {
  const vanos = Math.max(1, Math.ceil(largoFila / separacion - 1e-9));
  return Array.from({ length: vanos + 1 }, (_, k) => -largoFila / 2 + (largoFila * k) / vanos);
}

/** Medidas generales de la grada. */
export function medidasGrada(grada) {
  const { filas, huella, contrahuella, largoFila } = grada;
  return {
    alturaTotal: filas * contrahuella,
    profundidad: filas * huella,
    largo: largoFila,
    capacidad: Math.floor(largoFila * PERSONA_POR_METRO) * filas,
  };
}

/**
 * Arma la grada. Precondición: params.grada validado.
 * @returns {{ piezas, tablones, resumen, medidas }}
 */
export function generarGrada(grada) {
  const { filas: n, huella: h, contrahuella: C, largoFila: L } = grada;
  const grupos = ['grada'];
  const piezas = [];
  const medidas = medidasGrada(grada);
  const zAdelante = medidas.profundidad / 2;
  const zFila = (j) => zAdelante - j * h; // línea de fila j (0 = frente, n = fondo)
  const yFila = (i) => i * C - ESPESOR_TABLON; // altura de los perfiles de la fila i (bajo el tablón)
  const xs = posicionesPorticos(L, grada.separacionPorticos);

  xs.forEach((x, k) => {
    const p = (y, z) => [x, y, z];
    // Zanca: del pie de adelante al tope de atrás (pasa por el borde de atrás de cada fila).
    piezas.push(pieza(`grada-zanca:${k}`, 'grada-zanca', grupos, p(0, zAdelante), p(yFila(n), zFila(n))));
    // Apoyo de cada fila: horizontal de adelante hacia atrás.
    for (let i = 1; i <= n; i++) {
      piezas.push(pieza(`grada-apoyo:${k}:${i}`, 'grada-apoyo', grupos, p(yFila(i), zFila(i - 1)), p(yFila(i), zFila(i))));
    }
    // Parantes en las líneas de fila: la línea j sostiene el frente de la fila j+1
    // (la última línea, el fondo, sostiene el final de la última fila).
    if (grada.parantesCadaFilas > 0) {
      for (let j = 0; j <= n; j++) {
        if (j % grada.parantesCadaFilas !== 0 && j !== n) continue; // el fondo siempre lleva
        const alto = yFila(Math.min(j + 1, n));
        piezas.push(pieza(`grada-parante:${k}:${j}`, 'grada-parante', grupos, p(0, zFila(j)), p(alto, zFila(j))));
      }
    }
  });

  // Vigas longitudinales por fila, de punta a punta.
  const posicionesVigas = { 0: [], 1: [0.5], 2: [0.2, 0.8], 3: [0.1, 0.5, 0.9] }[grada.vigasPorFila];
  for (let i = 1; i <= n; i++) {
    posicionesVigas.forEach((t, v) => {
      const z = zFila(i - 1) - t * h;
      piezas.push(pieza(`grada-viga:${i}:${v}`, 'grada-viga', grupos, [-L / 2, yFila(i), z], [L / 2, yFila(i), z]));
    });
  }

  // Riostras en cruz en el plano de atrás (el más alto), entre pórticos.
  const vanos = xs.length - 1;
  const conRiostra = (k) => grada.riostras === 'todos' || (grada.riostras === 'extremos' && (k === 0 || k === vanos - 1));
  for (let k = 0; k < vanos; k++) {
    if (!conRiostra(k)) continue;
    const z = zFila(n);
    const arriba = yFila(n) - 0.05;
    piezas.push(...cruz(`grada-riostra:${k}`, 'riostra', grupos, [xs[k], 0.05, z], [xs[k], arriba, z], [xs[k + 1], 0.05, z], [xs[k + 1], arriba, z]));
  }

  const tablones = armarTablones(grada, zFila);

  return {
    piezas,
    tablones,
    tipoTablones: grada.tipoTablones,
    medidas,
    resumen: { ...medidas, porticos: xs.length, filas: n, avisos: avisosGrada(grada, medidas) },
  };
}

/**
 * Tablones de madera de cada fila (ver los tres modos arriba).
 * Cada tablón: { id, tipo: 'asiento' | 'pie' | 'tablon', centro, largo, ancho }.
 */
function armarTablones(grada, zFila) {
  const { filas: n, contrahuella: C, largoFila: L, huella: h } = grada;
  const tablones = [];
  for (let i = 1; i <= n; i++) {
    const y = i * C - ESPESOR_TABLON;
    const adelante = zFila(i - 1);
    if (grada.tipoTablones === 'unico') {
      // N tablones iguales: el primero al ras de adelante, el último al ras de atrás, el resto parejo.
      const k = grada.tablonesPorFila;
      const paso = k > 1 ? (h - grada.anchoTablon) / (k - 1) : 0;
      for (let t = 0; t < k; t++) {
        const z = adelante - grada.anchoTablon / 2 - t * paso;
        tablones.push({ id: `tablon:${i}:${t}`, tipo: 'tablon', centro: [0, y, z], largo: L, ancho: grada.anchoTablon });
      }
    } else {
      tablones.push({ id: `asiento:${i}`, tipo: 'asiento', centro: [0, y, adelante - grada.anchoAsiento / 2], largo: L, ancho: grada.anchoAsiento });
      tablones.push({ id: `pie:${i}`, tipo: 'pie', centro: [0, y, zFila(i) + grada.anchoPie / 2], largo: L, ancho: grada.anchoPie });
    }
  }
  return tablones;
}

/** Recomendaciones (no bloquean). */
function avisosGrada(grada, medidas) {
  const avisos = [];
  if (grada.contrahuella < 0.35 - 1e-9 || grada.contrahuella > 0.45 + 1e-9) {
    avisos.push(`Altura de fila de ${(grada.contrahuella * 100).toFixed(0)} cm: lo cómodo para sentarse es entre 35 y 45 cm.`);
  }
  if (grada.huella < 0.7 - 1e-9) {
    avisos.push(`Fila de ${(grada.huella * 100).toFixed(0)} cm de profundidad: con menos de 70 cm queda poco lugar para las piernas.`);
  }
  if (medidas.alturaTotal > 1 + 1e-9) {
    avisos.push(`La grada mide ${medidas.alturaTotal.toFixed(2)} m de alto: lleva baranda atrás y a los costados (todavía no se calcula).`);
  }
  if (grada.parantesCadaFilas === 0) {
    avisos.push('Sin parantes: todo el peso lo cargan las zancas. Consultalo con el herrero.');
  }
  return avisos;
}
