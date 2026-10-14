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
  geometriaLados, alturaEn, alturasPared, puntoSobreLado, luzTecho, ladoOpuesto,
} from './geometria.js';
import { inicioAbertura } from './validacion.js';
import { cm, pieza, haciaAdentro } from './segmentos.js';
import { generarEscalera } from './escalera.js';
import { aplicarEdicion } from './edicionPiezas.js';

const EPSILON = 0.01; // 1 cm: margen para no duplicar piezas en bordes
const LARGO_MINIMO = 0.05; // piezas más cortas que 5 cm no se fabrican
const MARGEN_JAMBA = 0.1; // jamba a menos de 10 cm de una columna => la columna hace de jamba
const MARGEN_VANO = MARGEN_JAMBA; // columna más adentro del vano que eso => se corta (si no, hace de jamba)

/** Nombre legible de cada tipo de pieza (para la UI). */
export const NOMBRE_TIPO_PIEZA = {
  columna: 'Columna',
  'marco-piso': 'Marco de piso',
  solera: 'Solera superior',
  'marco-piso2': 'Marco de piso 2',
  piso: 'Estructura de piso',
  piso2: 'Estructura de piso 2',
  'transv-piso': 'Transversal de piso',
  'transv-piso2': 'Transversal de piso 2',
  horizontal: 'Horizontal de pared',
  'viga-techo': 'Viga de techo',
  'correa-techo': 'Correa de techo',
  dintel: 'Dintel',
  jamba: 'Jamba',
  alfeizar: 'Alféizar',
  zanca: 'Zanca de escalera',
  'marco-descanso': 'Marco del descanso',
  'apoyo-escalon': 'Apoyo de escalón',
  'columna-escalera': 'Columna de escalera',
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
    repartir(geo.largo, params.paredes[lado].separacionVerticales).forEach((d) =>
      agregar(...puntoSobreLado(geo, d))
    );
  });

  const { ladoEntrepiso, anchoEntrepiso } = params;
  const geo = lados[ladoEntrepiso];
  const profundidadPlanta = lados[LADOS[(LADOS.indexOf(ladoEntrepiso) + 1) % 4]].largo;
  if (anchoEntrepiso > 0 && anchoEntrepiso < profundidadPlanta - EPSILON) {
    const [ax, az] = haciaAdentro(geo);
    repartir(geo.largo, params.paredes[ladoEntrepiso].separacionVerticales).forEach((d) => {
      const [x, z] = puntoSobreLado(geo, d);
      agregar(x + ax * anchoEntrepiso, z + az * anchoEntrepiso);
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
 *   - jambas a cada lado, SALVO que ya haya una columna ahí
 *     (a menos de 10 cm): la columna hace de jamba.
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
    if (!hayColumnaEn(v.inicio)) {
      piezas.push(pieza(`ref:${op.id}:jamba-izq`, 'jamba', grupos, punto(v.inicio, v.abajo), punto(v.inicio, v.arriba)));
    }
    if (!hayColumnaEn(v.fin)) {
      piezas.push(pieza(`ref:${op.id}:jamba-der`, 'jamba', grupos, punto(v.fin, v.abajo), punto(v.fin, v.arriba)));
    }
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
    const { esquinas, y } = rectEntrepiso;
    for (let i = 0; i < 4; i++) {
      const a = esquinas[i];
      const b = esquinas[(i + 1) % 4];
      marcos.push(pieza(`marco-piso2:${i}`, 'marco-piso2', ['piso2'], [a[0], y, a[1]], [b[0], y, b[1]]));
    }
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

/** Rectángulo del entrepiso, o null si no hay entrepiso. */
function rectanguloEntrepiso(params, lados) {
  if (!(params.anchoEntrepiso > 0)) return null;
  const geo = lados[params.ladoEntrepiso];
  const v = haciaAdentro(geo);
  const a = params.anchoEntrepiso;
  const esquinas = [
    geo.p1,
    geo.p2,
    [geo.p2[0] + v[0] * a, geo.p2[1] + v[1] * a],
    [geo.p1[0] + v[0] * a, geo.p1[1] + v[1] * a],
  ];
  return {
    origen: geo.p1, u: geo.direccion, largoU: geo.largo, v, largoV: a,
    esquinas, y: params.elevacion + ALTURA_PISO_2,
  };
}

/**
 * Entramado de un piso: tirantes que cruzan la LUZ MÁS CORTA del
 * rectángulo (los extremos ya tienen viga de marco) y, si se pide,
 * filas de transversales entre tirantes para que no arqueen.
 * `nivel` es 'piso' o 'piso2' (tipo, grupo e id de las piezas).
 */
function entramadoPiso(rect, separacion, separacionTransversales, y, nivel) {
  const cruzanV = rect.largoV <= rect.largoU;
  const luz = cruzanV ? rect.largoV : rect.largoU; // largo de cada tirante
  const largoReparto = cruzanV ? rect.largoU : rect.largoV; // dónde se reparten
  const dirReparto = cruzanV ? rect.u : rect.v;
  const dirLuz = cruzanV ? rect.v : rect.u;

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
    const separacion = params.paredes[lado].separacionHorizontales;
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

  const vigas = interiores(bajo.largo, params.separacionVigasTecho).map((d) =>
    pieza(`viga-techo:${cm(d)}`, 'viga-techo', ['techo'], puntoTecho(d, 0), puntoTecho(d, luz))
  );

  const pasoHorizontal = params.separacionCorreasTecho / factorPendiente;
  const posiciones = [0, ...interiores(luz, pasoHorizontal), luz];
  const ALTO_VIGA = 0.1; // las correas apoyan arriba de las vigas
  const correas = posiciones.map((s) =>
    pieza(`correa-techo:${cm(s)}`, 'correa-techo', ['techo'], puntoTecho(0, s, ALTO_VIGA), puntoTecho(bajo.largo, s, ALTO_VIGA))
  );

  const esquinas = [
    puntoTecho(0, 0, ALTO_VIGA + 0.03),
    puntoTecho(bajo.largo, 0, ALTO_VIGA + 0.03),
    puntoTecho(bajo.largo, luz, ALTO_VIGA + 0.03),
    puntoTecho(0, luz, ALTO_VIGA + 0.03),
  ];

  return {
    vigas,
    correas,
    esquinas,
    panel: params.panelTecho,
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
      panel: params.paredes[lado].panel,
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
    ...e.columnas, ...e.refuerzosAberturas, ...e.marcos,
    ...e.piso.tirantes, ...e.piso.transversales,
    ...e.piso2.tirantes, ...e.piso2.transversales,
    ...e.correas, ...e.techo.vigas, ...e.techo.correas,
    ...(e.escalera?.piezas ?? []),
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
    marcos: t(e.marcos),
    piso: { tirantes: t(e.piso.tirantes), transversales: t(e.piso.transversales) },
    piso2: { tirantes: t(e.piso2.tirantes), transversales: t(e.piso2.transversales) },
    correas: t(e.correas),
    techo: { ...e.techo, vigas: t(e.techo.vigas), correas: t(e.techo.correas) },
    escalera: e.escalera ? { ...e.escalera, piezas: t(e.escalera.piezas) } : null,
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

// ---------------- Punto de entrada ----------------

/**
 * Arma toda la estructura.
 * Precondición: params y aberturas ya validados.
 */
export function generarEstructura(params, aberturas) {
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
    marcos: generarMarcos(params, lados, entrepiso),
    piso: entramadoPiso(planta, params.separacionPiso, params.separacionTransversalesPiso, params.elevacion, 'piso'),
    piso2: entrepiso
      ? entramadoPiso(entrepiso, params.separacionPiso2, params.separacionTransversalesPiso2, entrepiso.y, 'piso2')
      : { tirantes: [], transversales: [] },
    correas: generarCorreasPared(params, lados),
    techo,
    escalera: params.escalera?.activa && entrepiso ? generarEscalera(params, lados, entrepiso) : null,
    paredes,
    entrepiso,
    superficies: {
      piso: planta.largoU * planta.largoV,
      piso2: entrepiso ? entrepiso.largoU * entrepiso.largoV : 0,
      murosNetos: paredes.reduce((acc, p) => acc + p.superficieNeta, 0),
      aberturas: paredes.reduce((acc, p) => acc + p.superficieAberturas, 0),
      techo: techo.superficie,
    },
  };
  return aplicarCambiosManuales(completa, new Set(params.piezasEliminadas ?? []), params.piezasEditadas ?? {});
}
