// ==========================================================
// GENERADOR DE ESTRUCTURA
// ----------------------------------------------------------
// Fuente ÚNICA de verdad: a partir de los parámetros arma la lista
// de piezas con su largo y su posición en el espacio.
//   - El cálculo de materiales usa los LARGOS.
//   - El visor 3D usa las POSICIONES.
// Como los dos leen la misma lista, lo que se ve es lo que se cotiza.
//
// Sistema de coordenadas (igual que Three.js):
//   x = a lo largo del frente, z = a lo largo de la profundidad,
//   y = altura. El origen (0,0,0) es el centro de la planta a nivel
//   del suelo. El piso del loft está en y = elevacion.
// ==========================================================

import { ALTURA_PISO_ALTILLO, FACTOR_PENDIENTE_TECHO } from './constantes.js';
import { largoDePared } from './validacion.js';

const EPSILON = 0.01; // 1 cm: margen para no duplicar piezas en bordes

/** Pilotines distribuidos en grilla bajo la planta. */
function generarPilotines({ frente, profundidad, filasPilotines, pilotinesPorFila }) {
  const pilotines = [];
  for (let i = 0; i < filasPilotines; i++) {
    for (let j = 0; j < pilotinesPorFila; j++) {
      pilotines.push({
        x: -frente / 2 + (frente / (filasPilotines - 1)) * i,
        z: -profundidad / 2 + (profundidad / (pilotinesPorFila - 1)) * j,
      });
    }
  }
  return pilotines;
}

/**
 * Columnas: en las dos paredes largas (frente y fondo) y, en las filas
 * intermedias, sobre las paredes laterales y la línea del altillo.
 */
function generarColumnas({ frente, profundidad, altura, anchoMezzanine, distanciaColumnas }) {
  const colsLargo = Math.max(2, Math.ceil(frente / distanciaColumnas) + 1);
  const colsAncho = Math.max(2, Math.ceil(profundidad / distanciaColumnas) + 1);
  const columnas = [];

  for (let i = 0; i < colsLargo; i++) {
    const x = -frente / 2 + (frente / (colsLargo - 1)) * i;
    columnas.push({ x, z: -profundidad / 2, largo: altura });
    columnas.push({ x, z: profundidad / 2, largo: altura });
  }

  // Filas intermedias (sin las esquinas, que ya están arriba).
  const xsIntermedias = [-frente / 2, frente / 2];
  if (anchoMezzanine > 0 && anchoMezzanine < frente - EPSILON) {
    xsIntermedias.push(-frente / 2 + anchoMezzanine);
  }
  for (let j = 1; j < colsAncho - 1; j++) {
    const z = -profundidad / 2 + (profundidad / (colsAncho - 1)) * j;
    xsIntermedias.forEach((x) => columnas.push({ x, z, largo: altura }));
  }
  return columnas;
}

/**
 * Pieza lineal horizontal. `eje` indica en qué dirección es larga:
 * 'x' (paralela al frente) o 'z' (paralela a la profundidad).
 */
function pieza(eje, largo, x, y, z) {
  return { eje, largo, x, y, z };
}

/** Rectángulo de 4 vigas (marco perimetral) a una altura dada. */
function marcoRectangular(xIzq, ancho, profundidad, y) {
  const xCentro = xIzq + ancho / 2;
  return [
    pieza('x', ancho, xCentro, y, -profundidad / 2),
    pieza('x', ancho, xCentro, y, profundidad / 2),
    pieza('z', profundidad, xIzq, y, 0),
    pieza('z', profundidad, xIzq + ancho, y, 0),
  ];
}

/** Marcos: piso, solera superior y (si hay) altillo. */
function generarMarcos({ frente, profundidad, altura, elevacion, anchoMezzanine }) {
  const marcos = [
    ...marcoRectangular(-frente / 2, frente, profundidad, elevacion),
    ...marcoRectangular(-frente / 2, frente, profundidad, elevacion + altura),
  ];
  if (anchoMezzanine > 0) {
    marcos.push(
      ...marcoRectangular(-frente / 2, anchoMezzanine, profundidad, elevacion + ALTURA_PISO_ALTILLO)
    );
  }
  return marcos;
}

/**
 * Tirantes interiores entre los extremos del marco (los extremos ya
 * tienen viga de marco, por eso no se repiten).
 */
function tirantesEntre(xIzq, ancho, paso, profundidad, y) {
  const tirantes = [];
  // Contador entero (i) en vez de sumar `paso`: sumar decimales acumula error.
  for (let i = 1; i * paso < ancho - EPSILON; i++) {
    tirantes.push(pieza('z', profundidad, xIzq + i * paso, y, 0));
  }
  return tirantes;
}

function generarTirantes(p) {
  const piso = tirantesEntre(-p.frente / 2, p.frente, p.pasoTirantesPiso, p.profundidad, p.elevacion);
  const altillo =
    p.anchoMezzanine > 0
      ? tirantesEntre(
          -p.frente / 2,
          p.anchoMezzanine,
          p.pasoTirantesAltillo,
          p.profundidad,
          p.elevacion + ALTURA_PISO_ALTILLO
        )
      : [];
  return [...piso, ...altillo];
}

/** Correas (fajas) horizontales en las 4 paredes, cada `separacionCorreas`. */
function generarCorreas({ frente, profundidad, altura, elevacion, separacionCorreas }) {
  const correas = [];
  for (let k = 1; k * separacionCorreas < altura - EPSILON; k++) {
    const y = elevacion + k * separacionCorreas;
    correas.push(
      pieza('x', frente, 0, y, -profundidad / 2),
      pieza('x', frente, 0, y, profundidad / 2),
      pieza('z', profundidad, -frente / 2, y, 0),
      pieza('z', profundidad, frente / 2, y, 0)
    );
  }
  return correas;
}

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

/**
 * Centro y rotación de una abertura para dibujarla en su pared.
 * `ladoReferencia` dice desde qué esquina se mide `offsetHorizontal`.
 */
export function posicionAbertura(abertura, params) {
  const { frente, profundidad, elevacion } = params;
  const { pared, ladoReferencia, offsetHorizontal, ancho, alto, alturaAntepecho } = abertura;
  const largo = largoDePared(pared, params);
  const desdeIzquierda = offsetHorizontal + ancho / 2;
  const h = ladoReferencia === 'izquierda' ? -largo / 2 + desdeIzquierda : largo / 2 - desdeIzquierda;
  const y = elevacion + alturaAntepecho + alto / 2;

  switch (pared) {
    case 'frente':
      return { x: h, y, z: profundidad / 2, rotacionY: 0 };
    case 'fondo':
      return { x: h, y, z: -profundidad / 2, rotacionY: 0 };
    case 'izquierda':
      return { x: -frente / 2, y, z: h, rotacionY: Math.PI / 2 };
    default: // derecha
      return { x: frente / 2, y, z: h, rotacionY: Math.PI / 2 };
  }
}

/** Superficies (m²) para placas y paneles. */
function calcularSuperficies({ frente, profundidad, altura, anchoMezzanine }, aberturas) {
  const murosBrutos = (frente + profundidad) * 2 * altura;
  const aberturasTotal = aberturas.reduce((acc, op) => acc + op.ancho * op.alto, 0);
  return {
    pisoOsb: frente * profundidad,
    altilloOsb: anchoMezzanine * profundidad,
    murosBrutos,
    aberturas: aberturasTotal,
    murosNetos: Math.max(0, murosBrutos - aberturasTotal),
    techo: frente * profundidad * FACTOR_PENDIENTE_TECHO,
  };
}

/**
 * Punto de entrada: arma toda la estructura.
 * Precondición: params y aberturas ya validados.
 */
export function generarEstructura(params, aberturas) {
  return {
    pilotines: generarPilotines(params),
    columnas: generarColumnas(params),
    marcos: generarMarcos(params),
    tirantes: generarTirantes(params),
    correas: generarCorreas(params),
    refuerzosAberturas: aberturas.flatMap(piezasRefuerzoAbertura),
    superficies: calcularSuperficies(params, aberturas),
  };
}
