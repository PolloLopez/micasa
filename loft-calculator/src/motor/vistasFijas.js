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

/**
 * v1.44: vistas "por partes" para el PDF (pedido de Leandro): cada piso desde arriba sin lo que lo tapa, y el adentro
 * visto desde cada lado, sacando la pared de ese lado.
 * @returns {{ clave, titulo, desde, arriba, ocultar: Object<string, false> }[]} `ocultar`: partes que no se dibujan
 */
export function vistasPorPartes(params) {
  const lados = geometriaLados(params);
  const frente = params.ladoFrente ?? 'A';
  const afueraFrente = afueraDe(lados[frente]);
  const haciaElFondo = sinMenosCero(afueraFrente.map((v) => -v));
  const arriba = [0, 1, 0];
  const vistas = [{ clave: 'plantaBaja', titulo: 'Planta baja desde arriba (sin techo ni entrepiso)', desde: arriba, arriba: haciaElFondo,
    ocultar: { techo: false, piso2: false, escalera: false } }];
  if (params.anchoEntrepiso > 0) {
    vistas.push({ clave: 'entrepiso', titulo: 'Entrepiso desde arriba (sin techo)', desde: arriba, arriba: haciaElFondo, ocultar: { techo: false } });
  }
  [0, 1, 2, 3].map((i) => LADOS[(LADOS.indexOf(frente) + i) % 4]).forEach((lado) => {
    vistas.push({ clave: `interior${lado}`, titulo: `Desde ${nombreLado(lado, frente).toLowerCase()} (${lado}), sin esa pared`,
      desde: afueraDe(lados[lado]), arriba, ocultar: { [lado]: false } });
  });
  return vistas;
}
