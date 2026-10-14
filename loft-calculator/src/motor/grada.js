// ==========================================================
// GRADA PARA ESPECTADORES (proyecto propio, params.tipoProyecto = 'grada')
// ----------------------------------------------------------
// Filas de asientos escalonadas sobre el piso. La fila 1 (la más baja)
// queda adelante, del lado A (z+); las filas suben hacia atrás (lado C).
// Reusa la idea del tramo de escalera, con medidas de grada y varios
// apoyos a lo largo de la fila.
//
// Estructura (en planta, x a lo largo de la fila; z de adelante hacia atrás).
// La grada puede ir en MÓDULOS a lo largo que se atornillan entre sí
// (desmontable): cada módulo tiene sus pórticos en las puntas.
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
  unionParantes: true, // caño bajo que une los parantes (en cada pórtico y a lo largo)
  alturaUnion: 0.15,
  tipoTablones: 'separados', // 'separados' | 'mismoMaterial' | 'unico'
  anchoAsiento: 0.3,
  anchoPie: 0.3,
  anchoTablon: 0.25, // solo 'unico'
  tablonesPorFila: 3, // solo 'unico'
  respaldo: true, // tabla de respaldo arriba de cada contrahuella
  anchoRespaldo: 0.15,
  modulos: 1, // bloques a lo largo que se atornillan entre sí (1 = una sola pieza)
  filasAtornillables: false, // tablones atornillados (desmontables) en vez de fijos
};

/** Separación entre los dos pórticos que se enfrentan en la unión de dos módulos. */
export const JUNTA_MODULOS = 0.02;

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

/**
 * Módulos a lo largo: cada uno con su inicio, fin y sus pórticos. En cada unión
 * los dos módulos dejan una junta de 2 cm (cada pórtico de punta se corre 1 cm).
 */
export function modulosGrada(grada) {
  const { largoFila: L, modulos: m } = grada;
  const largoModulo = L / m;
  return Array.from({ length: m }, (_, i) => {
    const inicio = -L / 2 + i * largoModulo + (i > 0 ? JUNTA_MODULOS / 2 : 0);
    const fin = -L / 2 + (i + 1) * largoModulo - (i < m - 1 ? JUNTA_MODULOS / 2 : 0);
    const xs = posicionesPorticos(fin - inicio, grada.separacionPorticos).map((x) => x + (inicio + fin) / 2);
    return { numero: i, inicio, fin, largo: fin - inicio, xs };
  });
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

/** Líneas de fila que llevan parante (la del fondo siempre). */
function lineasConParante(grada) {
  if (grada.parantesCadaFilas === 0) return [];
  return Array.from({ length: grada.filas + 1 }, (_, j) => j)
    .filter((j) => j % grada.parantesCadaFilas === 0 || j === grada.filas);
}

/**
 * Arma la grada. Precondición: params.grada validado.
 * @returns {{ piezas, tablones, resumen, medidas, fijaciones }}
 */
export function generarGrada(grada) {
  const { filas: n, huella: h, contrahuella: C } = grada;
  const grupos = ['grada'];
  const piezas = [];
  const medidas = medidasGrada(grada);
  const zAdelante = medidas.profundidad / 2;
  const zFila = (j) => zAdelante - j * h; // línea de fila j (0 = frente, n = fondo)
  const yFila = (i) => i * C - ESPESOR_TABLON; // altura de los perfiles de la fila i (bajo el tablón)
  const modulos = modulosGrada(grada);
  const varios = modulos.length > 1;
  const sufijo = (m) => (varios ? `:m${m}` : ''); // con un solo módulo los ids quedan como antes
  const lineas = lineasConParante(grada);
  const add = (id, tipo, desde, hasta) => piezas.push(pieza(id, tipo, grupos, desde, hasta));
  let k = 0; // número global de pórtico
  let vano = 0; // número global de vano (para las riostras)

  modulos.forEach((mod) => {
    const primerPortico = k;
    mod.xs.forEach((x) => {
      const p = (y, z) => [x, y, z];
      // Zanca: del pie de adelante al tope de atrás (pasa por el borde de atrás de cada fila).
      add(`grada-zanca:${k}`, 'grada-zanca', p(0, zAdelante), p(yFila(n), zFila(n)));
      // Apoyo de cada fila: horizontal de adelante hacia atrás.
      for (let i = 1; i <= n; i++) add(`grada-apoyo:${k}:${i}`, 'grada-apoyo', p(yFila(i), zFila(i - 1)), p(yFila(i), zFila(i)));
      // Parantes en las líneas de fila: la línea j sostiene el frente de la fila j+1
      // (la del fondo sostiene el final de la última fila).
      lineas.forEach((j) => add(`grada-parante:${k}:${j}`, 'grada-parante', p(0, zFila(j)), p(yFila(Math.min(j + 1, n)), zFila(j))));
      // Unión de los parantes de este pórtico: caño bajo de adelante hacia atrás.
      if (grada.unionParantes && lineas.length > 1) {
        add(`grada-union:${k}`, 'grada-union', p(grada.alturaUnion, zFila(lineas[0])), p(grada.alturaUnion, zFila(lineas[lineas.length - 1])));
      }
      k++;
    });
    const [x0, x1] = [mod.xs[0], mod.xs[mod.xs.length - 1]];
    // Unión a lo largo: en cada línea de parantes, de un pórtico de punta al otro del módulo.
    if (grada.unionParantes) {
      lineas.forEach((j) => add(`grada-union-largo:${j}${sufijo(mod.numero)}`, 'grada-union', [x0, grada.alturaUnion, zFila(j)], [x1, grada.alturaUnion, zFila(j)]));
    }
    // Vigas longitudinales por fila, a lo largo del módulo.
    const posicionesVigas = { 0: [], 1: [0.5], 2: [0.2, 0.8], 3: [0.1, 0.5, 0.9] }[grada.vigasPorFila];
    for (let i = 1; i <= n; i++) {
      posicionesVigas.forEach((t, v) => {
        const z = zFila(i - 1) - t * h;
        add(`grada-viga:${i}:${v}${sufijo(mod.numero)}`, 'grada-viga', [x0, yFila(i), z], [x1, yFila(i), z]);
      });
    }
    // Riostras en cruz atrás: en los vanos de las puntas de CADA módulo (así cada módulo se sostiene solo) o en todos.
    const vanosModulo = mod.xs.length - 1;
    for (let v = 0; v < vanosModulo; v++, vano++) {
      const conRiostra = grada.riostras === 'todos' || (grada.riostras === 'extremos' && (v === 0 || v === vanosModulo - 1));
      if (!conRiostra) continue;
      const z = zFila(n);
      const arriba = yFila(n) - 0.05;
      const [xa, xb] = [mod.xs[v], mod.xs[v + 1]];
      piezas.push(...cruz(`grada-riostra:${vano}`, 'riostra', grupos, [xa, 0.05, z], [xa, arriba, z], [xb, 0.05, z], [xb, arriba, z]));
    }
    mod.porticos = k - primerPortico;
  });

  const tablones = armarTablones(grada, zFila, modulos);
  const fijaciones = contarFijaciones(grada, modulos, tablones, lineas);
  const porticos = k;

  return {
    piezas,
    tablones,
    tipoTablones: grada.tipoTablones,
    medidas,
    fijaciones,
    resumen: {
      ...medidas, porticos, filas: n, modulos: modulos.length, largoModulo: modulos[0].largo,
      avisos: avisosGrada(grada, medidas),
    },
  };
}

/**
 * Bulones para unir módulos (2 por parante y 2 por zanca en cada unión de dos
 * pórticos) y tornillos de tablones si las filas son atornillables (2 por
 * tablón en cada pórtico que cruza).
 */
function contarFijaciones(grada, modulos, tablones, lineas) {
  const uniones = modulos.length - 1;
  const bulonesModulos = uniones * 2 * (lineas.length + 1);
  const tornillosTablones = grada.filasAtornillables
    ? modulos.reduce((acc, mod) => acc + tablones.filter((t) => t.modulo === mod.numero).length * mod.xs.length * 2, 0)
    : 0;
  return { bulonesModulos, tornillosTablones };
}

/**
 * Tablones de madera de cada fila (ver los tres modos arriba), uno por módulo.
 * Cada tablón: { id, tipo: 'asiento' | 'pie' | 'tablon' | 'respaldo', centro, largo, ancho, modulo, vertical? }.
 * El respaldo es una tabla parada arriba de cada contrahuella (entre la fila i y la i+1).
 */
function armarTablones(grada, zFila, modulos) {
  const { filas: n, contrahuella: C, huella: h } = grada;
  const tablones = [];
  const varios = modulos.length > 1;
  modulos.forEach((mod) => {
    const sufijo = varios ? `:m${mod.numero}` : '';
    const x = (mod.inicio + mod.fin) / 2;
    const tablon = (id, tipo, y, z, ancho, extra = {}) =>
      tablones.push({ id: `${id}${sufijo}`, tipo, centro: [x, y, z], largo: mod.largo, ancho, modulo: mod.numero, ...extra });
    for (let i = 1; i <= n; i++) {
      const y = i * C - ESPESOR_TABLON;
      const adelante = zFila(i - 1);
      if (grada.tipoTablones === 'unico') {
        // N tablones iguales: el primero al ras de adelante, el último al ras de atrás, el resto parejo.
        const k = grada.tablonesPorFila;
        const paso = k > 1 ? (h - grada.anchoTablon) / (k - 1) : 0;
        for (let t = 0; t < k; t++) tablon(`tablon:${i}:${t}`, 'tablon', y, adelante - grada.anchoTablon / 2 - t * paso, grada.anchoTablon);
      } else {
        tablon(`asiento:${i}`, 'asiento', y, adelante - grada.anchoAsiento / 2, grada.anchoAsiento);
        tablon(`pie:${i}`, 'pie', y, zFila(i) + grada.anchoPie / 2, grada.anchoPie);
      }
      // Respaldo: arriba de la contrahuella que sube a la fila siguiente (pegado a ella, del lado de adelante).
      if (grada.respaldo && i < n) {
        const arriba = (i + 1) * C - ESPESOR_TABLON;
        tablon(`respaldo:${i}`, 'respaldo', arriba - grada.anchoRespaldo / 2, zFila(i) + 0.0125, grada.anchoRespaldo, { vertical: true });
      }
    }
  });
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
  if (grada.modulos > 1 && grada.riostras === 'no') {
    avisos.push('Grada en módulos sin riostras: cada módulo suelto se puede mover de costado. Conviene riostrar las puntas.');
  }
  return avisos;
}
