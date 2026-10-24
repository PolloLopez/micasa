// ==========================================================
// GENERADOR DE ESTRUCTURA
// ----------------------------------------------------------
// Fuente ÚNICA de verdad: a partir de los parámetros arma todas las
// piezas con su largo y su posición en el espacio.
//   - El presupuesto usa los LARGOS.
//   - El visor 3D usa las POSICIONES.
// Como los dos leen la misma lista, lo que se ve es lo que se cotiza.
//
// Cada pieza es un "segmento" con:
//   id      identificador estable (sale del tipo y la posición, en cm).
//           Sirve para eliminar piezas a mano (params.piezasEliminadas)
//           y para editarlas (params.piezasEditadas, ver edicionPiezas.js).
//   tipo    'columna', 'solera', 'horizontal', 'dintel', ...
//   grupos  a qué panel pertenece: 'A'..'D' (paredes), 'techo', 'piso',
//           'piso2' o 'interior'. Ocultar un panel oculta sus piezas.
//   desde, hasta, largo
// Coordenadas y nombres de lados: ver motor/geometria.js.
// ==========================================================

import { ALTURA_PISO_2, LADOS } from './constantes.js';
import {
  geometriaLados, alturaEn, alturasPared, puntoSobreLado, luzTecho, ladoOpuesto, tramoEntrepiso,
} from './geometria.js';
import { inicioAbertura } from './validacion.js';
import { CAMPOS_CON_CANTIDAD, cantidadDe, separacionDe } from './cantidades.js';
import { cm, pieza, haciaAdentro, cruz } from './segmentos.js';
import { generarEscalera } from './escalera.js';
import { generarGrada } from './grada.js';
import { generarMontaje } from './montaje.js';
import { aplicarEdicion } from './edicionPiezas.js';
import { piezasDeAgregadas } from './piezasAgregadas.js';

const EPSILON = 0.01; // 1 cm: margen para no duplicar piezas en bordes
const LARGO_MINIMO = 0.05; // piezas más cortas que 5 cm no se fabrican
const MARGEN_JAMBA = 0.1; // jamba a menos de 10 cm de una columna => la columna hace de jamba
const MARGEN_VANO = MARGEN_JAMBA; // columna más adentro del vano que eso => se corta (si no, hace de jamba)

/** Nombre legible de cada tipo de pieza (para la UI). */
export const NOMBRE_TIPO_PIEZA = {
  columna: 'Columna',
  'marco-piso': 'Borde de piso', // v1.28: antes "Marco de piso" (mismo renglón que Bordes de piso)
  solera: 'Solera superior',
  'marco-piso2': 'Borde de piso 2',
  'viga-cierre': 'Viga de cierre del entrepiso',
  piso: 'Estructura de piso',
  piso2: 'Estructura de piso 2',
  'transv-piso': 'Transversal de piso',
  'transv-piso2': 'Transversal de piso 2',
  horizontal: 'Horizontal (faja)',
  'viga-techo': 'Viga de techo',
  'correa-techo': 'Correa de techo',
  'borde-techo': 'Borde de techo',
  dintel: 'Dintel',
  jamba: 'Jamba',
  alfeizar: 'Travesaño de antepecho',
  travesano: 'Travesaño de abertura', // v1.28: de la abertura a la columna, arriba y abajo
  montante: 'Montante',
  'montante-dintel': 'Montante de dintel',
  'montante-antepecho': 'Montante de antepecho',
  zanca: 'Zanca de escalera',
  'marco-descanso': 'Marco del descanso',
  'apoyo-escalon': 'Apoyo de escalón',
  'columna-escalera': 'Parante de escalera',
  riostra: 'Riostra',
  'grada-zanca': 'Zanca de grada',
  'grada-apoyo': 'Apoyo de fila',
  'grada-parante': 'Parante de grada',
  'grada-viga': 'Viga longitudinal',
  'mont-pata': 'Pata',
  'mont-marco': 'Marco',
  'mont-travesano': 'Travesaño',
};

// ---------------- Utilidades ----------------

/** Distancia de un punto (x, z) a lo largo de una pared, desde su esquina izquierda. */
function distanciaSobreLado(geo, x, z) {
  return (x - geo.p1[0]) * geo.direccion[0] + (z - geo.p1[1]) * geo.direccion[1];
}

/** true si el punto (x, z) está sobre la línea de esa pared (entre sus esquinas). */
function estaSobreLado(geo, x, z) {
  const d = distanciaSobreLado(geo, x, z);
  const [px, pz] = puntoSobreLado(geo, d);
  return Math.hypot(px - x, pz - z) < 1e-6 && d > -1e-6 && d < geo.largo + 1e-6;
}

/** Posiciones repartidas parejo de 0 a `largo`, con separación máxima `separacion`. */
function repartir(largo, separacion) {
  const tramos = Math.max(1, Math.ceil(largo / separacion - EPSILON));
  return Array.from({ length: tramos + 1 }, (_, i) => (largo * i) / tramos);
}

// Por medida o por cantidad (v1.27): ver cantidades.js.

/** Posiciones interiores cada `separacion` (sin los extremos 0 y `largo`). */
function interiores(largo, separacion) {
  const posiciones = [];
  for (let i = 1; i * separacion < largo - EPSILON; i++) posiciones.push(i * separacion);
  return posiciones;
}

/** Tramo [inicio, fin] (sobre la pared) y alturas del vano de una abertura. */
function vano(abertura, params) {
  const inicio = inicioAbertura(abertura, params);
  return {
    inicio,
    fin: inicio + abertura.ancho,
    abajo: abertura.alturaAntepecho,
    arriba: abertura.alturaAntepecho + abertura.alto,
  };
}

// ---------------- Fundación ----------------

function generarPilotines({ largo, ancho, filasPilotines, pilotinesPorFila }) {
  const pilotines = [];
  for (let i = 0; i < filasPilotines; i++) {
    for (let j = 0; j < pilotinesPorFila; j++) {
      pilotines.push({
        x: -largo / 2 + (largo / (filasPilotines - 1)) * i,
        z: -ancho / 2 + (ancho / (pilotinesPorFila - 1)) * j,
      });
    }
  }
  return pilotines;
}

// ---------------- Columnas ----------------

/**
 * Posiciones de columnas: las de cada pared según su separación, más las
 * del borde libre del entrepiso. Una esquina compartida es UNA columna.
 * Cada posición sabe sobre qué paredes está (lados).
 */
function posicionesDeColumnas(params, lados) {
  const porPosicion = new Map();
  const agregar = (x, z) => {
    const clave = `${cm(x)},${cm(z)}`;
    if (porPosicion.has(clave)) return;
    const sobre = LADOS.filter((l) => estaSobreLado(lados[l], x, z));
    porPosicion.set(clave, { x, z, clave, lados: sobre });
  };

  LADOS.forEach((lado) => {
    const geo = lados[lado];
    repartir(geo.largo, separacionDe(params, `paredes.${lado}.separacionVerticales`, geo.largo)).forEach((d) =>
      agregar(...puntoSobreLado(geo, d))
    );
  });

  // Borde libre del entrepiso: columnas en las puntas de cada borde libre y,
  // si se pide, intermedias cada `separacionColumnasEntrepiso` (0 = solo puntas).
  // Si un borde libre termina contra una pared, la columna de esa punta queda
  // sobre la pared (ahí apoya la viga de cierre).
  const rect = rectanguloEntrepiso(params, lados);
  if (rect) {
    bordesEntrepiso(rect, lados).filter((b) => b.libre).forEach(({ a, b }) => {
      const largo = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const separacion = separacionDe(params, 'separacionColumnasEntrepiso', largo); // v1.27: o por cantidad, en cada borde
      const puntos = separacion > 0 ? repartir(largo, separacion) : [0, largo];
      puntos.forEach((d) => agregar(a[0] + ((b[0] - a[0]) * d) / largo, a[1] + ((b[1] - a[1]) * d) / largo));
    });
  }
  return [...porPosicion.values()];
}

/**
 * Columnas como piezas verticales. Si una columna cae DENTRO del vano de
 * una abertura, se corta: queda el tramo de abajo (hasta el antepecho) y
 * el de arriba (desde el dintel). Las jambas y el dintel toman su lugar.
 */
function generarColumnas(params, lados, posiciones, aberturas) {
  const y0 = params.elevacion;
  const columnas = [];
  posiciones.forEach(({ x, z, clave, lados: sobre }) => {
    const alto = alturaEn(x, z, params);
    const grupos = sobre.length > 0 ? sobre : ['interior'];
    const base = { x, z };
    const vanoQueLaCorta = aberturas
      .filter((op) => sobre.includes(op.lado))
      .map((op) => ({ op, v: vano(op, params), d: distanciaSobreLado(lados[op.lado], x, z) }))
      .find(({ v, d }) => d > v.inicio + MARGEN_VANO && d < v.fin - MARGEN_VANO);

    if (!vanoQueLaCorta) {
      columnas.push({ ...pieza(`col:${clave}`, 'columna', grupos, [x, y0, z], [x, y0 + alto, z]), ...base });
      return;
    }
    const { v } = vanoQueLaCorta;
    if (v.abajo > LARGO_MINIMO) {
      columnas.push({ ...pieza(`col:${clave}:abajo`, 'columna', grupos, [x, y0, z], [x, y0 + v.abajo, z]), ...base });
    }
    if (alto - v.arriba > LARGO_MINIMO) {
      columnas.push({ ...pieza(`col:${clave}:arriba`, 'columna', grupos, [x, y0 + v.arriba, z], [x, y0 + alto, z]), ...base });
    }
  });
  return columnas;
}

// ---------------- Refuerzos de aberturas ----------------

/**
 * Refuerzos del vano de cada abertura (van con el perfil de columnas):
 *   - dintel arriba y alféizar abajo (si no arranca del piso);
 *   - jambas a cada lado, de piso a solera (v1.17), SALVO que ya haya
 *     una columna ahí (a menos de 10 cm): la columna hace de jamba.
 */
function generarRefuerzos(params, lados, posiciones, aberturas) {
  const y0 = params.elevacion;
  const piezas = [];
  aberturas.forEach((op) => {
    const geo = lados[op.lado];
    const v = vano(op, params);
    const punto = (d, h) => {
      const [x, z] = puntoSobreLado(geo, d);
      return [x, y0 + h, z];
    };
    const hayColumnaEn = (d) => posiciones.some(
      (c) => c.lados.includes(op.lado) && Math.abs(distanciaSobreLado(geo, c.x, c.z) - d) < MARGEN_JAMBA
    );
    const grupos = [op.lado];
    piezas.push(pieza(`ref:${op.id}:dintel`, 'dintel', grupos, punto(v.inicio, v.arriba), punto(v.fin, v.arriba)));
    if (v.abajo > 0) {
      piezas.push(pieza(`ref:${op.id}:alfeizar`, 'alfeizar', grupos, punto(v.inicio, v.abajo), punto(v.fin, v.abajo)));
    }
    // Jambas de piso a solera (v1.17): como una columna liviana a cada lado del vano.
    const altoPared = (d) => alturaEn(...puntoSobreLado(geo, d), params);
    if (!hayColumnaEn(v.inicio)) {
      piezas.push(pieza(`ref:${op.id}:jamba-izq`, 'jamba', grupos, punto(v.inicio, 0), punto(v.inicio, altoPared(v.inicio))));
    }
    if (!hayColumnaEn(v.fin)) {
      piezas.push(pieza(`ref:${op.id}:jamba-der`, 'jamba', grupos, punto(v.fin, 0), punto(v.fin, altoPared(v.fin))));
    }
    // v1.28: travesaños a la altura del dintel y del antepecho, de la abertura hasta la columna de
    // cada lado (pedido de Leandro: una pieza horizontal arriba y abajo de la ventana).
    if (op.travesanos === true) {
      const columnas = columnasDeLado(op.lado, lados, posiciones);
      const izquierda = Math.max(0, ...columnas.filter((c) => c <= v.inicio + EPSILON));
      const derecha = Math.min(geo.largo, ...columnas.filter((c) => c >= v.fin - EPSILON));
      const alturas = [['arriba', v.arriba], ...(v.abajo > 0 ? [['abajo', v.abajo]] : [])];
      alturas.forEach(([cual, h]) => {
        if (v.inicio - izquierda > LARGO_MINIMO) {
          piezas.push(pieza(`ref:${op.id}:trav-${cual}-izq`, 'travesano', grupos, punto(izquierda, h), punto(v.inicio, h)));
        }
        if (derecha - v.fin > LARGO_MINIMO) {
          piezas.push(pieza(`ref:${op.id}:trav-${cual}-der`, 'travesano', grupos, punto(v.fin, h), punto(derecha, h)));
        }
      });
    }
  });
  return piezas;
}

// ---------------- Montantes y riostras de pared (v1.17) ----------------

/** Distancias (sobre la pared, desde su esquina izquierda) de las columnas de un lado, ordenadas. */
function columnasDeLado(lado, lados, posiciones) {
  return posiciones
    .filter((c) => c.lados.includes(lado))
    .map((c) => distanciaSobreLado(lados[lado], c.x, c.z))
    .sort((a, b) => a - b);
}

/**
 * Montantes: verticales livianos entre columnas, cada `separacionMontantes`
 * de cada pared (0 = sin). Arrancan de cada columna. Si un montante cae
 * dentro de un vano se parte en "montante de antepecho" (abajo de la
 * ventana) y "montante de dintel" (arriba del vano, hasta la solera).
 * Cerca de una columna o de una jamba (10 cm) no se pone.
 */
function generarMontantes(params, lados, posiciones, aberturas) {
  const y0 = params.elevacion;
  const piezas = [];
  LADOS.forEach((lado) => {
    const separacion = params.paredes[lado].separacionMontantes ?? 0;
    const porVano = cantidadDe(params, `paredes.${lado}.separacionMontantes`); // v1.27: n montantes en cada vano
    if (porVano === 0 || (porVano === null && !(separacion > 0))) return;
    const geo = lados[lado];
    const vanos = aberturas.filter((op) => op.lado === lado).map((op) => vano(op, params));
    const columnas = columnasDeLado(lado, lados, posiciones);
    const ocupado = (d) => columnas.some((c) => Math.abs(c - d) < MARGEN_JAMBA)
      || vanos.some((v) => Math.abs(v.inicio - d) < MARGEN_JAMBA || Math.abs(v.fin - d) < MARGEN_JAMBA);
    for (let i = 0; i < columnas.length - 1; i++) {
      const paso = porVano ? (columnas[i + 1] - columnas[i]) / (porVano + 1) : separacion;
      for (let d = columnas[i] + paso; d < columnas[i + 1] - EPSILON; d += paso) {
        if (ocupado(d)) continue;
        const [x, z] = puntoSobreLado(geo, d);
        const alto = alturaEn(x, z, params);
        const id = `mont:${lado}:${cm(d)}`;
        const enVano = vanos.find((v) => d > v.inicio && d < v.fin);
        if (!enVano) {
          piezas.push(pieza(id, 'montante', [lado], [x, y0, z], [x, y0 + alto, z]));
          continue;
        }
        if (enVano.abajo > LARGO_MINIMO) {
          piezas.push(pieza(`${id}:abajo`, 'montante-antepecho', [lado], [x, y0, z], [x, y0 + enVano.abajo, z]));
        }
        if (alto - enVano.arriba > LARGO_MINIMO) {
          piezas.push(pieza(`${id}:arriba`, 'montante-dintel', [lado], [x, y0 + enVano.arriba, z], [x, y0 + alto, z]));
        }
      }
    }
  });
  return piezas;
}

/**
 * Riostras en cruz (cruz de San Andrés) en las paredes: entre dos columnas
 * seguidas, de piso a solera. `riostras` de cada pared: 'no', 'extremos'
 * (el primer y el último vano entre columnas) o 'todos'. Un vano entre
 * columnas que tiene una abertura no lleva cruz (la taparía).
 */
function generarRiostrasPared(params, lados, posiciones, aberturas) {
  const y0 = params.elevacion;
  const piezas = [];
  LADOS.forEach((lado) => {
    const modo = params.paredes[lado].riostras ?? 'no';
    if (modo === 'no') return;
    const geo = lados[lado];
    const columnas = columnasDeLado(lado, lados, posiciones);
    const vanos = aberturas.filter((op) => op.lado === lado).map((op) => vano(op, params));
    const tramos = columnas.slice(0, -1).map((d0, i) => [d0, columnas[i + 1]]);
    const elegidos = modo === 'todos' ? tramos : [...new Set([tramos[0], tramos[tramos.length - 1]])];
    elegidos.filter(Boolean).forEach(([d0, d1]) => {
      if (vanos.some((v) => v.inicio < d1 && v.fin > d0)) return;
      const [xa, za] = puntoSobreLado(geo, d0);
      const [xb, zb] = puntoSobreLado(geo, d1);
      piezas.push(...cruz(`rio:${lado}:${cm(d0)}`, 'riostra', [lado],
        [xa, y0, za], [xa, y0 + alturaEn(xa, za, params), za],
        [xb, y0, zb], [xb, y0 + alturaEn(xb, zb, params), zb]));
    });
  });
  return piezas;
}

// ---------------- Marcos (vigas perimetrales) ----------------

function generarMarcos(params, lados, rectEntrepiso) {
  const { elevacion } = params;
  const marcos = [];

  LADOS.forEach((lado) => {
    const { p1, p2 } = lados[lado];
    // Marco del piso (a nivel del piso del loft): es parte del piso.
    marcos.push(pieza(`marco-piso:${lado}`, 'marco-piso', ['piso'], [p1[0], elevacion, p1[1]], [p2[0], elevacion, p2[1]]));
    // Solera superior de la pared: sigue la pendiente del techo.
    const [h1, h2] = alturasPared(lados[lado], params);
    marcos.push(pieza(`solera:${lado}`, 'solera', [lado], [p1[0], elevacion + h1, p1[1]], [p2[0], elevacion + h2, p2[1]]));
  });

  if (rectEntrepiso) {
    const { y } = rectEntrepiso;
    // Los bordes contra una pared son marco; los bordes libres son viga de cierre
    // (renglón propio en el presupuesto: el perfil lo elige el herrero).
    // El id es el mismo en los dos casos para no romper piezas eliminadas/editadas.
    bordesEntrepiso(rectEntrepiso, lados).forEach(({ i, a, b, libre }) => {
      marcos.push(pieza(`marco-piso2:${i}`, libre ? 'viga-cierre' : 'marco-piso2', ['piso2'], [a[0], y, a[1]], [b[0], y, b[1]]));
    });
  }
  return marcos;
}

// ---------------- Pisos ----------------

/**
 * Rectángulo de la planta descripto por una esquina `origen`, dos
 * direcciones perpendiculares `u` y `v` y sus largos.
 */
function rectanguloPlanta({ largo, ancho }) {
  return { origen: [-largo / 2, -ancho / 2], u: [1, 0], largoU: largo, v: [0, 1], largoV: ancho };
}

/**
 * Rectángulo del entrepiso, o null si no hay entrepiso.
 * Se apoya en `ladoEntrepiso`, a lo largo del tramo que da tramoEntrepiso()
 * (todo el lado o una parte), y entra `anchoEntrepiso` hacia adentro.
 */
function rectanguloEntrepiso(params, lados) {
  if (!(params.anchoEntrepiso > 0)) return null;
  const geo = lados[params.ladoEntrepiso];
  const v = haciaAdentro(geo);
  const a = params.anchoEntrepiso;
  const { inicio, largo } = tramoEntrepiso(params);
  const origen = puntoSobreLado(geo, inicio);
  const fin = puntoSobreLado(geo, inicio + largo);
  const esquinas = [
    origen,
    fin,
    [fin[0] + v[0] * a, fin[1] + v[1] * a],
    [origen[0] + v[0] * a, origen[1] + v[1] * a],
  ];
  return {
    origen, u: geo.direccion, largoU: largo, v, largoV: a,
    esquinas, y: params.elevacion + ALTURA_PISO_2,
  };
}

/**
 * Los 4 bordes del entrepiso. `libre` = no está apoyado sobre una pared
 * (sus dos puntas no caen sobre la misma pared). El borde 0 es siempre el
 * que se apoya en `ladoEntrepiso`; el 2 es el de enfrente (donde llega la escalera).
 */
function bordesEntrepiso(rect, lados) {
  return rect.esquinas.map((a, i) => {
    const b = rect.esquinas[(i + 1) % 4];
    const sobrePared = LADOS.some((l) => estaSobreLado(lados[l], ...a) && estaSobreLado(lados[l], ...b));
    return { i, a, b, libre: !sobrePared };
  });
}

/**
 * Entramado de un piso: tirantes que cruzan la LUZ MÁS CORTA del
 * rectángulo (los extremos ya tienen viga de marco) y, si se pide,
 * filas de transversales entre tirantes para que no arqueen.
 * `nivel` es 'piso' o 'piso2' (tipo, grupo e id de las piezas).
 */
function entramadoPiso(rect, separacionCargada, transversalesCargada, y, nivel, params = {}) {
  const cruzanV = rect.largoV <= rect.largoU;
  const luz = cruzanV ? rect.largoV : rect.largoU; // largo de cada tirante
  const largoReparto = cruzanV ? rect.largoU : rect.largoV; // dónde se reparten
  const dirReparto = cruzanV ? rect.u : rect.v;
  const dirLuz = cruzanV ? rect.v : rect.u;
  // v1.27: las separaciones pueden venir por cantidad (repartidas en el largo de esta planta).
  const sufijo = nivel === 'piso2' ? '2' : '';
  const separacion = params.cantidades ? separacionDe(params, `separacionPiso${sufijo}`, largoReparto) : separacionCargada;
  const separacionTransversales = params.cantidades
    ? separacionDe(params, `separacionTransversalesPiso${sufijo}`, luz) : transversalesCargada;

  const punto = (a, b) => [
    rect.origen[0] + dirReparto[0] * a + dirLuz[0] * b,
    y,
    rect.origen[1] + dirReparto[1] * a + dirLuz[1] * b,
  ];

  const posicionesTirantes = interiores(largoReparto, separacion);
  const tirantes = posicionesTirantes.map((a) =>
    pieza(`${nivel}:${cm(a)}`, nivel, [nivel], punto(a, 0), punto(a, luz))
  );

  const transversales = [];
  if (separacionTransversales > 0) {
    const apoyos = [0, ...posicionesTirantes, largoReparto];
    interiores(luz, separacionTransversales).forEach((b) => {
      for (let i = 0; i < apoyos.length - 1; i++) {
        transversales.push(pieza(`transv-${nivel}:${cm(apoyos[i])},${cm(b)}`, `transv-${nivel}`, [nivel],
          punto(apoyos[i], b), punto(apoyos[i + 1], b)));
      }
    });
  }
  return { tirantes, transversales };
}

// ---------------- Paredes: horizontales ----------------

/**
 * Horizontales de cada pared cada `separacionHorizontales`.
 * Si la pared es inclinada arriba (paralela a la pendiente), las
 * horizontales altas solo cubren el tramo donde la pared llega.
 */
function generarCorreasPared(params, lados) {
  const correas = [];
  LADOS.forEach((lado) => {
    const geo = lados[lado];
    const [h1, h2] = alturasPared(geo, params);
    // v1.27: por cantidad, las n fajas se reparten parejo en el alto MAYOR de la pared
    // (en una pared inclinada, las de arriba son más cortas: llegan hasta la solera).
    const separacion = separacionDe(params, `paredes.${lado}.separacionHorizontales`, Math.max(h1, h2));
    for (let k = 1; k * separacion < Math.max(h1, h2) - EPSILON; k++) {
      const h = k * separacion;
      let a = 0;
      let b = geo.largo;
      if (Math.abs(h2 - h1) > 1e-9) {
        const cruce = ((h - h1) / (h2 - h1)) * geo.largo; // donde la solera pasa por h
        if (h2 > h1) a = Math.max(0, cruce);
        else b = Math.min(geo.largo, cruce);
      } else if (h >= h1 - EPSILON) {
        continue;
      }
      if (b - a < LARGO_MINIMO) continue;
      const [x1, z1] = puntoSobreLado(geo, a);
      const [x2, z2] = puntoSobreLado(geo, b);
      const y = params.elevacion + h;
      correas.push(pieza(`horiz:${lado}:${k}`, 'horizontal', [lado], [x1, y, z1], [x2, y, z2]));
    }
  });
  return correas;
}

// ---------------- Techo a una agua ----------------

/**
 * Vigas de techo: van del lado bajo al lado alto siguiendo la pendiente.
 * Correas de techo: perpendiculares a las vigas, paralelas al lado bajo;
 * su separación se mide sobre la pendiente.
 */
function generarTecho(params, lados) {
  const bajo = lados[params.caidaTecho];
  const [ax, az] = haciaAdentro(bajo); // de la pared baja hacia la alta
  const luz = luzTecho(params);
  const pendiente = params.pendienteTecho / 100;
  const factorPendiente = Math.sqrt(1 + pendiente * pendiente);
  const y0 = params.elevacion + params.altura;

  const puntoTecho = (d, s, extra = 0) => {
    const [x, z] = puntoSobreLado(bajo, d);
    return [x + ax * s, y0 + s * pendiente + extra, z + az * s];
  };

  const vigas = interiores(bajo.largo, separacionDe(params, 'separacionVigasTecho', bajo.largo)).map((d) =>
    pieza(`viga-techo:${cm(d)}`, 'viga-techo', ['techo'], puntoTecho(d, 0), puntoTecho(d, luz))
  );

  // Por cantidad (v1.27): las correas se reparten parejo a lo largo del faldón (luz horizontal).
  const pasoHorizontal = cantidadDe(params, 'separacionCorreasTecho') !== null
    ? separacionDe(params, 'separacionCorreasTecho', luz)
    : params.separacionCorreasTecho / factorPendiente;
  const posiciones = [0, ...interiores(luz, pasoHorizontal), luz];
  const ALTO_VIGA = 0.1; // las correas apoyan arriba de las vigas
  const todasLasCorreas = posiciones.map((s) =>
    pieza(`correa-techo:${cm(s)}`, 'correa-techo', ['techo'], puntoTecho(0, s, ALTO_VIGA), puntoTecho(bajo.largo, s, ALTO_VIGA))
  );

  // v1.28: marco perimetral (opcional; los proyectos de antes no lo tienen). Las correas de los dos
  // bordes pasan a ser "borde de techo" (mismo id: las ediciones guardadas siguen valiendo) y se
  // suman las vigas de las dos puntas. Así el borde y el interior pueden ir con perfiles distintos.
  const conBorde = params.techoConBorde === true;
  const esBorde = (i) => conBorde && (i === 0 || i === todasLasCorreas.length - 1);
  const correas = todasLasCorreas.filter((_, i) => !esBorde(i));
  const bordes = conBorde ? [
    ...todasLasCorreas.filter((_, i) => esBorde(i)).map((p) => ({ ...p, tipo: 'borde-techo' })),
    // Las de las puntas van a la altura de las correas (arriba de las soleras de las paredes de los
    // costados, que siguen la pendiente): así el marco queda en un plano y no repite la solera.
    ...[0, bajo.largo].map((d) => pieza(`borde-techo:${cm(d)}`, 'borde-techo', ['techo'], puntoTecho(d, 0, ALTO_VIGA), puntoTecho(d, luz, ALTO_VIGA))),
  ] : [];

  const esquinas = [
    puntoTecho(0, 0, ALTO_VIGA + 0.03),
    puntoTecho(bajo.largo, 0, ALTO_VIGA + 0.03),
    puntoTecho(bajo.largo, luz, ALTO_VIGA + 0.03),
    puntoTecho(0, luz, ALTO_VIGA + 0.03),
  ];

  return {
    vigas,
    correas,
    bordes,
    esquinas,
    panel: params.panelTecho,
    largo: bajo.largo, // a lo largo del lado bajo
    largoFaldon: luz * factorPendiente, // del lado bajo al alto, sobre la pendiente
    superficie: bajo.largo * luz * factorPendiente,
    ladoAlto: ladoOpuesto(params.caidaTecho),
  };
}

// ---------------- Aberturas (posición para el 3D) ----------------

/** Centro y rotación de una abertura para dibujarla en su pared. */
export function posicionAbertura(abertura, params) {
  const geo = geometriaLados(params)[abertura.lado];
  const centro = inicioAbertura(abertura, params) + abertura.ancho / 2;
  const [x, z] = puntoSobreLado(geo, centro);
  return {
    x,
    y: params.elevacion + abertura.alturaAntepecho + abertura.alto / 2,
    z,
    rotacionY: Math.atan2(-geo.direccion[1], geo.direccion[0]),
  };
}

// ---------------- Superficies y paneles ----------------

function generarParedes(params, lados, aberturas) {
  return LADOS.map((lado) => {
    const geo = lados[lado];
    const [h1, h2] = alturasPared(geo, params);
    const bruta = (geo.largo * (h1 + h2)) / 2; // trapecio
    const huecos = aberturas
      .filter((op) => op.lado === lado)
      .reduce((acc, op) => acc + op.ancho * op.alto, 0);
    const y = params.elevacion;
    return {
      lado,
      // v1.24: huecos de las aberturas en coordenadas de la pared: desde/hasta = distancia desde la
      // punta 1 (p1) a lo largo de la pared; abajo/arriba = altura desde el piso. Para descontar
      // tiras y placas y para recortar el panel en el 3D.
      huecos: aberturas.filter((op) => op.lado === lado).map((op) => {
        const v = vano(op, params);
        return { desde: v.inicio, hasta: v.fin, abajo: v.abajo, arriba: v.arriba };
      }),
      panel: params.paredes[lado].panel, // revestimiento exterior
      panelInterior: params.paredes[lado].panelInterior || null, // revestimiento interior (v1.15), null = sin
      largo: geo.largo,
      alturas: [h1, h2], // alto en cada punta (para contar tiras y placas)
      superficieBruta: bruta,
      superficieAberturas: huecos,
      superficieNeta: Math.max(0, bruta - huecos),
      esquinas: [
        [geo.p1[0], y, geo.p1[1]],
        [geo.p2[0], y, geo.p2[1]],
        [geo.p2[0], y + h2, geo.p2[1]],
        [geo.p1[0], y + h1, geo.p1[1]],
      ],
    };
  });
}

// ---------------- Listado y eliminación ----------------

/** Todas las piezas lineales de la estructura en una sola lista. */
export function listarPiezas(e) {
  return [
    ...e.columnas, ...e.refuerzosAberturas, ...(e.montantes ?? []), ...(e.riostrasParedes ?? []), ...e.marcos,
    ...e.piso.tirantes, ...e.piso.transversales,
    ...e.piso2.tirantes, ...e.piso2.transversales,
    ...e.correas, ...e.techo.vigas, ...e.techo.correas, ...(e.techo.bordes ?? []),
    ...(e.escalera?.piezas ?? []),
    ...(e.grada?.piezas ?? []),
    ...(e.montaje?.piezas ?? []),
    ...(e.agregadas ?? []), // v1.16: duplicadas a mano
  ];
}

/**
 * Aplica `cambiar` a cada pieza lineal de la estructura: devuelve la
 * pieza (igual o editada) o null para sacarla.
 */
function transformarPiezas(e, cambiar) {
  const t = (lista) => lista.map(cambiar).filter(Boolean);
  return {
    ...e,
    columnas: t(e.columnas),
    refuerzosAberturas: t(e.refuerzosAberturas),
    montantes: t(e.montantes ?? []),
    riostrasParedes: t(e.riostrasParedes ?? []),
    marcos: t(e.marcos),
    piso: { tirantes: t(e.piso.tirantes), transversales: t(e.piso.transversales) },
    piso2: { tirantes: t(e.piso2.tirantes), transversales: t(e.piso2.transversales) },
    correas: t(e.correas),
    techo: { ...e.techo, vigas: t(e.techo.vigas), correas: t(e.techo.correas), bordes: t(e.techo.bordes ?? []) },
    escalera: e.escalera ? { ...e.escalera, piezas: t(e.escalera.piezas) } : null,
    grada: e.grada ? { ...e.grada, piezas: t(e.grada.piezas) } : null,
    montaje: e.montaje ? { ...e.montaje, piezas: t(e.montaje.piezas) } : null,
    agregadas: t(e.agregadas ?? []),
  };
}

/**
 * Cambios hechos a mano: saca las piezas eliminadas y aplica las ediciones.
 * Informa qué piezas (originales) se encontraron, para listarlas en la UI.
 */
function aplicarCambiosManuales(e, idsEliminados, ediciones) {
  const todas = listarPiezas(e);
  const resultado = transformarPiezas(e, (p) => {
    if (idsEliminados.has(p.id)) return null;
    return ediciones[p.id] ? aplicarEdicion(p, ediciones[p.id]) : p;
  });
  return {
    ...resultado,
    eliminadasEncontradas: todas.filter((p) => idsEliminados.has(p.id)),
    editadasEncontradas: todas.filter((p) => ediciones[p.id] && !idsEliminados.has(p.id)),
  };
}

// ---------------- Grada y montaje (proyectos propios) ----------------

/**
 * Proyecto de grada o de montaje: no hay paredes, pisos ni techo.
 * Se devuelve la misma forma que una construcción (listas vacías) más la
 * parte propia (`grada` o `montaje`), para que el 3D, el presupuesto y la
 * edición de piezas funcionen igual.
 */
function generarEstructuraSuelta(params, propia) {
  const vacia = {
    pilotines: [], columnas: [], refuerzosAberturas: [], montantes: [], riostrasParedes: [], marcos: [],
    piso: { tirantes: [], transversales: [] }, piso2: { tirantes: [], transversales: [] },
    correas: [], techo: { vigas: [], correas: [], bordes: [], esquinas: [], superficie: 0 },
    escalera: null, paredes: [], entrepiso: null,
    superficies: { piso: 0, piso2: 0, murosNetos: 0, aberturas: 0, techo: 0 },
    grada: null,
    montaje: null,
    agregadas: piezasDeAgregadas(params.piezasAgregadas),
    ...propia,
  };
  return aplicarCambiosManuales(vacia, new Set(params.piezasEliminadas ?? []), params.piezasEditadas ?? {});
}

// ---------------- Punto de entrada ----------------

/**
 * Arma toda la estructura.
 * Precondición: params y aberturas ya validados.
 */
export function generarEstructura(params, aberturas) {
  if (params.tipoProyecto === 'grada') return generarEstructuraSuelta(params, { grada: generarGrada(params.grada) });
  if (params.tipoProyecto === 'montaje') return generarEstructuraSuelta(params, { montaje: generarMontaje(params.montaje) });
  const lados = geometriaLados(params);
  const planta = rectanguloPlanta(params);
  const entrepiso = rectanguloEntrepiso(params, lados);
  const paredes = generarParedes(params, lados, aberturas);
  const techo = generarTecho(params, lados);
  const posiciones = posicionesDeColumnas(params, lados);

  const completa = {
    pilotines: generarPilotines(params),
    columnas: generarColumnas(params, lados, posiciones, aberturas),
    refuerzosAberturas: generarRefuerzos(params, lados, posiciones, aberturas),
    montantes: generarMontantes(params, lados, posiciones, aberturas), // v1.17
    riostrasParedes: generarRiostrasPared(params, lados, posiciones, aberturas), // v1.17
    marcos: generarMarcos(params, lados, entrepiso),
    piso: entramadoPiso(planta, params.separacionPiso, params.separacionTransversalesPiso, params.elevacion, 'piso', params),
    piso2: entrepiso
      ? entramadoPiso(entrepiso, params.separacionPiso2, params.separacionTransversalesPiso2, entrepiso.y, 'piso2', params)
      : { tirantes: [], transversales: [] },
    correas: generarCorreasPared(params, lados),
    techo,
    escalera: params.escalera?.activa && entrepiso ? generarEscalera(params, lados, entrepiso) : null,
    paredes,
    entrepiso,
    agregadas: piezasDeAgregadas(params.piezasAgregadas), // v1.16: duplicadas a mano
    superficies: {
      piso: planta.largoU * planta.largoV,
      piso2: entrepiso ? entrepiso.largoU * entrepiso.largoV : 0,
      murosNetos: paredes.reduce((acc, p) => acc + p.superficieNeta, 0),
      aberturas: paredes.reduce((acc, p) => acc + p.superficieAberturas, 0),
      techo: techo.superficie,
    },
  };
  const conCambios = aplicarCambiosManuales(completa, new Set(params.piezasEliminadas ?? []), params.piezasEditadas ?? {});
  return marcarPerfilesDePared(conCambios, params);
}

/**
 * v1.22: cada pieza de una pared sabe qué perfil le eligió esa pared.
 *   - columna de dos paredes (esquina)  -> `esquina: true` (va al renglón "Columnas de esquina");
 *   - columna, horizontal, montante, solera y marco de piso de UNA pared con perfil propio
 *     -> `perfilPared: <id del perfil>` (el presupuesto la cotiza con ese perfil).
 * Se marca DESPUÉS de las ediciones a mano (que rearman la pieza); las editadas conservan id y grupos.
 */
const CAMPO_DE_TIPO = {
  columna: 'perfilColumnas',
  horizontal: 'perfilHorizontales',
  montante: 'perfilMontantes', 'montante-dintel': 'perfilMontantes', 'montante-antepecho': 'perfilMontantes',
  solera: 'perfilMarcos', 'marco-piso': 'perfilMarcos',
};
function marcarPerfilesDePared(e, params) {
  return transformarPiezas(e, (p) => {
    const campo = CAMPO_DE_TIPO[p.tipo];
    if (!campo) return p;
    // El marco de piso está en el grupo 'piso'; su pared sale del id (marco-piso:A).
    const ladosDeLaPieza = p.tipo === 'marco-piso' ? [p.id.split(':')[1]] : p.grupos.filter((g) => LADOS.includes(g));
    if (p.tipo === 'columna' && ladosDeLaPieza.length >= 2) return { ...p, esquina: true };
    if (ladosDeLaPieza.length !== 1) return p;
    const perfil = params.paredes?.[ladosDeLaPieza[0]]?.[campo];
    return perfil ? { ...p, perfilPared: perfil, ladoPared: ladosDeLaPieza[0] } : p;
  });
}

// ---------------- Medida <-> cantidad, para la pantalla (v1.27) ----------------

/**
 * Lo que da un campo de separación con los datos actuales: cuántas piezas y cada cuánto.
 * Sirve para mostrar "= 4 columnas" al cargar por medida y "cada 2,50 m" al cargar por cantidad.
 * @returns {{ cantidad: number|null, separacion: number|null, porVano?: boolean }}
 *   null cuando depende de cada tramo (montantes, columnas del borde libre).
 */
export function infoSeparacion(params, ruta) {
  const campo = CAMPOS_CON_CANTIDAD[ruta];
  if (!campo || campo.modo === 'porVano' || ruta === 'separacionColumnasEntrepiso') {
    // Montantes (por vano) y columnas del borde libre (un largo por borde): no hay un único largo.
    return { cantidad: cantidadDe(params, ruta), separacion: null, porVano: campo?.modo === 'porVano' };
  }
  const largo = largoDeCampo(params, geometriaLados(params), ruta);
  if (!(largo > 0)) return { cantidad: null, separacion: null };
  if (ruta === 'separacionCorreasTecho') return infoCorreasTecho(params, largo);
  const separacion = separacionDe(params, ruta, largo);
  if (!(separacion > 0)) return { cantidad: 0, separacion: 0 };
  if (campo.modo === 'conExtremos') {
    // Columnas: repartir() las deja parejas, así que la separación real puede ser menor que la cargada.
    const cantidad = repartir(largo, separacion).length;
    return { cantidad, separacion: largo / (cantidad - 1) };
  }
  return { cantidad: interiores(largo, separacion).length, separacion };
}

/** Correas del techo: la medida va sobre la pendiente, el reparto sobre la luz horizontal. */
function infoCorreasTecho(params, luz) {
  const pendiente = params.pendienteTecho / 100;
  const factor = Math.sqrt(1 + pendiente * pendiente);
  const porCantidad = cantidadDe(params, 'separacionCorreasTecho') !== null;
  const paso = porCantidad ? separacionDe(params, 'separacionCorreasTecho', luz) : params.separacionCorreasTecho / factor;
  if (!(paso > 0)) return { cantidad: null, separacion: null };
  return { cantidad: interiores(luz, paso).length + 2, separacion: paso * factor };
}

/** Largo en el que se reparte cada campo (el mismo que usa el motor). */
function largoDeCampo(params, lados, ruta) {
  const [, lado, nombre] = ruta.split('.');
  if (nombre === 'separacionVerticales') return lados[lado].largo;
  if (nombre === 'separacionHorizontales') return Math.max(...alturasPared(lados[lado], params));
  if (ruta === 'separacionVigasTecho') return lados[params.caidaTecho].largo;
  if (ruta === 'separacionCorreasTecho') return luzTecho(params);
  const rect = ruta.endsWith('2') ? rectanguloEntrepiso(params, lados) : rectanguloPlanta(params);
  if (!rect) return 0;
  const cruzanV = rect.largoV <= rect.largoU;
  const reparto = cruzanV ? rect.largoU : rect.largoV;
  const luz = cruzanV ? rect.largoV : rect.largoU;
  return ruta.startsWith('separacionTransversales') ? luz : reparto;
}
