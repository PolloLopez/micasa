// ==========================================================
// GEOMETRÍA DE LA PLANTA Y DEL TECHO
// ----------------------------------------------------------
// Sistema de coordenadas (igual que Three.js):
//   x = eje del "largo", z = eje del "ancho", y = altura.
//   Origen (0,0,0): centro de la planta a nivel del suelo.
//
// Los 4 lados tienen nombre FIJO (A, B, C, D) y se recorren en orden:
//
//            C (z = -ancho/2)
//        ┌─────────────────┐
//   D    │                 │   B
// (x=-)  │                 │ (x=+)
//        └─────────────────┘
//            A (z = +ancho/2)
//
// Cada lado va de p1 a p2 "de izquierda a derecha visto desde AFUERA".
// Así "medir desde la esquina izquierda" significa lo mismo en todas
// las paredes. El nombre (frente/fondo/laterales) sale de cuál se elige
// como frente; la geometría no cambia.
// ==========================================================

import { LADOS } from './constantes.js';

/** Esquinas y dirección de cada lado. */
export function geometriaLados({ largo, ancho }) {
  const x = largo / 2;
  const z = ancho / 2;
  const lados = {
    A: { p1: [-x, z], p2: [x, z] },
    B: { p1: [x, z], p2: [x, -z] },
    C: { p1: [x, -z], p2: [-x, -z] },
    D: { p1: [-x, -z], p2: [-x, z] },
  };
  Object.values(lados).forEach((lado) => {
    const dx = lado.p2[0] - lado.p1[0];
    const dz = lado.p2[1] - lado.p1[1];
    lado.largo = Math.hypot(dx, dz);
    lado.direccion = [dx / lado.largo, dz / lado.largo];
  });
  return lados;
}

/** Largo de la pared de un lado. */
export function largoLado(lado, { largo, ancho }) {
  return lado === 'A' || lado === 'C' ? largo : ancho;
}

/** El lado de enfrente. */
export function ladoOpuesto(lado) {
  return LADOS[(LADOS.indexOf(lado) + 2) % 4];
}

/**
 * Nombre de cada lado según cuál es el frente.
 * "Derecha" e "izquierda" = mirando la casa parado frente al frente.
 */
export function nombreLado(lado, ladoFrente) {
  const nombres = ['Frente', 'Lateral derecho', 'Fondo', 'Lateral izquierdo'];
  const posicion = (LADOS.indexOf(lado) - LADOS.indexOf(ladoFrente) + 4) % 4;
  return nombres[posicion];
}

/** Punto (x, z) a una distancia `d` de p1 sobre un lado. */
export function puntoSobreLado(geoLado, d) {
  return [geoLado.p1[0] + geoLado.direccion[0] * d, geoLado.p1[1] + geoLado.direccion[1] * d];
}

// ---------------- Techo a una agua ----------------

/**
 * Distancia horizontal desde la pared baja (la del lado hacia donde
 * cae el agua) hasta el punto (x, z).
 */
function distanciaDesdeLadoBajo(x, z, { largo, ancho, caidaTecho }) {
  switch (caidaTecho) {
    case 'A': return ancho / 2 - z;
    case 'C': return z + ancho / 2;
    case 'B': return largo / 2 - x;
    default: return x + largo / 2; // D
  }
}

/** Distancia horizontal que cubre la pendiente (de pared baja a pared alta). */
export function luzTecho({ largo, ancho, caidaTecho }) {
  return caidaTecho === 'A' || caidaTecho === 'C' ? ancho : largo;
}

/**
 * Altura de la estructura (sobre el piso del loft) en el punto (x, z).
 * `altura` es la del lado bajo; sube según la pendiente en %.
 */
export function alturaEn(x, z, params) {
  const pendiente = params.pendienteTecho / 100;
  return params.altura + distanciaDesdeLadoBajo(x, z, params) * pendiente;
}

/** Altura más alta de la estructura (lado alto del techo). */
export function alturaMaxima(params) {
  return params.altura + luzTecho(params) * (params.pendienteTecho / 100);
}

/** Alturas de la pared en sus dos esquinas (p1 y p2). */
export function alturasPared(geoLado, params) {
  return [alturaEn(...geoLado.p1, params), alturaEn(...geoLado.p2, params)];
}
