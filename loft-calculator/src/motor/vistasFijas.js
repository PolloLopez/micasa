// ==========================================================
// VISTAS FIJAS DEL 3D PARA IMPRIMIR (v1.28)
// ----------------------------------------------------------
// Además de la vista que el usuario dejó en pantalla, el PDF lleva tres
// vistas que siempre salen iguales (cámara ortográfica: sin perspectiva,
// las medidas se leen a escala):
//   frente   mirando el lado del frente desde afuera
//   lateral  mirando el lateral derecho desde afuera
//   arriba   desde arriba, con el frente abajo (como las plantas)
// Acá solo se calcula hacia dónde mira cada una; LoftCanvas saca la foto.
// ==========================================================

import { LADOS } from './constantes.js';
import { geometriaLados, nombreLado } from './geometria.js';

/** Vector "hacia afuera" de un lado, en 3D (x, y, z). */
const sinMenosCero = (v) => v.map((c) => c + 0); // -0 + 0 = 0 (más prolijo para comparar)
const afueraDe = (geo) => sinMenosCero([-geo.direccion[1], 0, geo.direccion[0]]);

/**
 * @returns {{ clave, titulo, desde: number[], arriba: number[] }[]}
 *   `desde`: dirección (unitaria) desde el centro hacia la cámara; `arriba`: qué queda arriba en la foto
 */
export function vistasFijas(params) {
  const lados = geometriaLados(params);
  const frente = params.ladoFrente ?? 'A';
  const derecho = LADOS[(LADOS.indexOf(frente) + 1) % 4];
  const afueraFrente = afueraDe(lados[frente]);
  return [
    { clave: 'frente', titulo: `${nombreLado(frente, frente)} (${frente})`, desde: afueraFrente, arriba: [0, 1, 0] },
    { clave: 'lateral', titulo: `${nombreLado(derecho, frente)} (${derecho})`, desde: afueraDe(lados[derecho]), arriba: [0, 1, 0] },
    // Desde arriba: el frente queda abajo en la foto, así que "arriba" apunta hacia el fondo.
    { clave: 'arriba', titulo: 'Desde arriba', desde: [0, 1, 0], arriba: sinMenosCero(afueraFrente.map((v) => -v)) },
  ];
}
