// ==========================================================
// GENERADOR DE ESTRUCTURA
// ----------------------------------------------------------
// Fuente ÚNICA de verdad: a partir de los parámetros arma todas las
// piezas con su largo y su posición en el espacio.
//   - El presupuesto usa los LARGOS.
//   - El visor 3D usa las POSICIONES.
// Como los dos leen la misma lista, lo que se ve es lo que se cotiza.
//
// Cada pieza lineal es un "segmento": { desde: [x,y,z], hasta: [x,y,z], largo }.
// Así una viga inclinada de techo y una correa horizontal se tratan igual.
// Coordenadas y nombres de lados: ver motor/geometria.js.
// ==========================================================

import { ALTURA_PISO_2, LADOS } from './constantes.js';
import {
  geometriaLados, alturaEn, alturasPared, puntoSobreLado, luzTecho, ladoOpuesto,
} from './geometria.js';
import { inicioAbertura } from './validacion.js';

const EPSILON = 0.01; // 1 cm: margen para no duplicar piezas en bordes
const LARGO_MINIMO = 0.05; // piezas más cortas que 5 cm no se fabrican

// ---------------- Utilidades ----------------

/** Pieza lineal entre dos puntos 3D. */
function segmento(desde, hasta) {
  const largo = Math.hypot(hasta[0] - desde[0], hasta[1] - desde[1], hasta[2] - desde[2]);
  return { desde, hasta, largo: Number(largo.toFixed(4)) };
}

/** Dirección "hacia adentro" de la planta desde un lado (perpendicular a la pared). */
function haciaAdentro(geoLado) {
  return [geoLado.direccion[1], -geoLado.direccion[0]];
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
 * Columnas (verticales) de cada pared según su separación, más las que
 * sostienen el borde libre del entrepiso. Las esquinas compartidas entre
 * dos paredes se cuentan una sola vez.
 */
function generarColumnas(params, lados) {
  const porPosicion = new Map();
  const agregar = (x, z) => {
    const clave = `${x.toFixed(3)}|${z.toFixed(3)}`;
    if (!porPosicion.has(clave)) porPosicion.set(clave, { x, z, largo: alturaEn(x, z, params) });
  };

  LADOS.forEach((lado) => {
    const geo = lados[lado];
    repartir(geo.largo, params.paredes[lado].separacionVerticales).forEach((d) =>
      agregar(...puntoSobreLado(geo, d))
    );
  });

  // Borde libre del entrepiso: misma separación que la pared donde se apoya.
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

  return [...porPosicion.values()].map((c) => ({ ...c, largo: Number(c.largo.toFixed(4)) }));
}

// ---------------- Marcos (vigas perimetrales) ----------------

function generarMarcos(params, lados) {
  const { elevacion } = params;
  const marcos = [];

  LADOS.forEach((lado) => {
    const { p1, p2 } = lados[lado];
    // Marco del piso (a nivel del piso del loft).
    marcos.push(segmento([p1[0], elevacion, p1[1]], [p2[0], elevacion, p2[1]]));
    // Solera superior: sigue la pendiente del techo.
    const [h1, h2] = alturasPared(lados[lado], params);
    marcos.push(segmento([p1[0], elevacion + h1, p1[1]], [p2[0], elevacion + h2, p2[1]]));
  });

  // Marco del entrepiso (rectángulo apoyado contra su lado).
  const rect = rectanguloEntrepiso(params, lados);
  if (rect) {
    const { esquinas, y } = rect;
    for (let i = 0; i < 4; i++) {
      const a = esquinas[i];
      const b = esquinas[(i + 1) % 4];
      marcos.push(segmento([a[0], y, a[1]], [b[0], y, b[1]]));
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
 */
function entramadoPiso(rect, separacion, separacionTransversales, y) {
  // Elegir el sentido: los tirantes van paralelos al lado corto.
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
  const tirantes = posicionesTirantes.map((a) => segmento(punto(a, 0), punto(a, luz)));

  // Transversales: tramos cortos entre tirantes consecutivos (y los marcos).
  const transversales = [];
  if (separacionTransversales > 0) {
    const apoyos = [0, ...posicionesTirantes, largoReparto];
    interiores(luz, separacionTransversales).forEach((b) => {
      for (let i = 0; i < apoyos.length - 1; i++) {
        transversales.push(segmento(punto(apoyos[i], b), punto(apoyos[i + 1], b)));
      }
    });
  }
  return { tirantes, transversales };
}

// ---------------- Paredes: horizontales (correas) ----------------

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
      // Tramo [a, b] (desde la esquina izquierda) donde la pared supera h.
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
      correas.push(segmento([x1, y, z1], [x2, y, z2]));
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
    segmento(puntoTecho(d, 0), puntoTecho(d, luz))
  );

  // Separación horizontal equivalente a la separación sobre la pendiente.
  const pasoHorizontal = params.separacionCorreasTecho / factorPendiente;
  const posiciones = [0, ...interiores(luz, pasoHorizontal), luz];
  const ALTO_VIGA = 0.1; // las correas apoyan arriba de las vigas
  const correas = posiciones.map((s) =>
    segmento(puntoTecho(0, s, ALTO_VIGA), puntoTecho(bajo.largo, s, ALTO_VIGA))
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
    panel: params.panelTecho, // tipo de panel del techo
    superficie: bajo.largo * luz * factorPendiente,
    ladoAlto: ladoOpuesto(params.caidaTecho),
  };
}

// ---------------- Aberturas ----------------

/**
 * Refuerzos del vano de cada abertura (van con el perfil de columnas):
 *   - dintel arriba (ancho) y 2 jambas laterales (alto)
 *   - alféizar abajo (ancho) solo si la abertura no arranca del piso
 */
export function piezasRefuerzoAbertura({ ancho, alto, alturaAntepecho }) {
  const piezas = [ancho, alto, alto];
  if (alturaAntepecho > 0) piezas.push(ancho);
  return piezas;
}

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
      panel: params.paredes[lado].panel, // tipo de panel de esta pared
      superficieBruta: bruta,
      superficieAberturas: huecos,
      superficieNeta: Math.max(0, bruta - huecos),
      // Contorno para el 3D: abajo-izq, abajo-der, arriba-der, arriba-izq.
      esquinas: [
        [geo.p1[0], y, geo.p1[1]],
        [geo.p2[0], y, geo.p2[1]],
        [geo.p2[0], y + h2, geo.p2[1]],
        [geo.p1[0], y + h1, geo.p1[1]],
      ],
    };
  });
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

  return {
    pilotines: generarPilotines(params),
    columnas: generarColumnas(params, lados),
    marcos: generarMarcos(params, lados),
    piso: entramadoPiso(planta, params.separacionPiso, params.separacionTransversalesPiso, params.elevacion),
    piso2: entrepiso
      ? entramadoPiso(entrepiso, params.separacionPiso2, params.separacionTransversalesPiso2, entrepiso.y)
      : { tirantes: [], transversales: [] },
    correas: generarCorreasPared(params, lados),
    techo,
    refuerzosAberturas: aberturas.flatMap(piezasRefuerzoAbertura),
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
}
