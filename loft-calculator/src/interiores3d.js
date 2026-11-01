// ==========================================================
// INTERIORES EN EL 3D (v1.38): tapas de mesada y muebles
// ----------------------------------------------------------
// Las piezas de hierro de las mesadas las dibuja LoftCanvas como cualquier
// pieza (capa "Mesadas"). Acá van:
//   - losaGruesa: una placa horizontal con espesor (tapa, estantes);
//   - dibujarMueble: cada mueble armado con cajas simples según su FORMA
//     (cama, mesa, silla, sillón, placard, electrodoméstico, inodoro, caja),
//     con sus medidas cargadas y el color de su material.
// Los materiales de los muebles se crean UNA vez y se comparten (el modelo
// se redibuja seguido y vaciarGrupo solo libera las geometrías). Las sombras
// las prende LoftCanvas para todo el modelo cuando el sol está prendido.
// ==========================================================

import * as THREE from 'three';
import { MATERIALES_MUEBLE, TIPOS_MUEBLE, ubicarMueble } from './motor/interiores.js';

/**
 * Placa horizontal con espesor, a partir de sus 4 esquinas (a→b a lo largo, b→c a lo ancho).
 * @param arriba true = las esquinas son la cara de arriba (tapa); false = la de abajo (estante)
 */
export function losaGruesa(esquinas, espesor, material, arriba = true) {
  const [a, b, c] = esquinas;
  const largo = Math.hypot(b[0] - a[0], b[2] - a[2]);
  const ancho = Math.hypot(c[0] - b[0], c[2] - b[2]);
  const centro = esquinas.reduce((acc, p) => acc.map((v, i) => v + p[i] / 4), [0, 0, 0]);
  const malla = new THREE.Mesh(new THREE.BoxGeometry(largo, espesor, ancho), material);
  malla.position.set(centro[0], centro[1] + (arriba ? -espesor / 2 : espesor / 2), centro[2]);
  malla.rotation.y = Math.atan2(-(b[2] - a[2]), b[0] - a[0]); // el largo de la caja va de a hacia b
  return malla;
}

// Materiales compartidos de los muebles (uno por material, más los detalles).
let materialesMuebles = null;
function materiales() {
  if (!materialesMuebles) {
    materialesMuebles = Object.fromEntries(Object.entries(MATERIALES_MUEBLE).map(([clave, m]) => [clave,
      new THREE.MeshStandardMaterial({ color: m.color, metalness: m.metal, roughness: m.aspereza })]));
    materialesMuebles.colchon = new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 1 });
    materialesMuebles.detalle = new THREE.MeshStandardMaterial({ color: '#111827', roughness: 0.6 });
  }
  return materialesMuebles;
}

/**
 * Cajas de cada forma, en coordenadas del mueble: x = ancho (centrado), y = alto (desde el piso),
 * z = profundidad (centrada; +z es el FRENTE del mueble). Cada caja: [ancho, alto, prof, x, y, z, material].
 */
function cajasDe(forma, ancho, alto, prof, mat) {
  const m = materiales();
  const pata = Math.min(0.05, ancho / 6, prof / 6);
  const patas = (altoPatas) => [-1, 1].flatMap((sx) => [-1, 1].map((sz) =>
    [pata, altoPatas, pata, sx * (ancho / 2 - pata / 2), altoPatas / 2, sz * (prof / 2 - pata / 2), mat]));
  switch (forma) {
    case 'cama': {
      const base = alto * 0.55;
      const colchon = alto - base;
      return [
        [ancho, base, prof, 0, base / 2, 0, mat],
        [ancho - 0.04, colchon, prof - 0.06, 0, base + colchon / 2, 0.02, m.colchon],
        // Respaldo (cabecera) atrás, más alto que la cama.
        [ancho, alto + 0.45, 0.06, 0, (alto + 0.45) / 2, -prof / 2 + 0.03, mat],
      ];
    }
    case 'mesa': {
      const tapa = 0.04;
      return [[ancho, tapa, prof, 0, alto - tapa / 2, 0, mat], ...patas(alto - tapa)];
    }
    case 'silla': {
      const asiento = Math.min(0.46, alto * 0.5);
      return [
        [ancho, 0.04, prof, 0, asiento - 0.02, 0, mat],
        ...patas(asiento - 0.04),
        [ancho, alto - asiento, 0.04, 0, asiento + (alto - asiento) / 2, -prof / 2 + 0.02, mat], // respaldo
      ];
    }
    case 'sillon': {
      const asiento = Math.min(0.42, alto * 0.55);
      const brazo = Math.min(0.18, ancho / 6);
      const respaldo = Math.min(0.2, prof / 3);
      return [
        [ancho, asiento, prof, 0, asiento / 2, 0, mat],
        [ancho, alto - asiento, respaldo, 0, asiento + (alto - asiento) / 2, -prof / 2 + respaldo / 2, mat],
        [brazo, alto * 0.75 - asiento, prof, -ancho / 2 + brazo / 2, asiento + (alto * 0.75 - asiento) / 2, 0, mat],
        [brazo, alto * 0.75 - asiento, prof, ancho / 2 - brazo / 2, asiento + (alto * 0.75 - asiento) / 2, 0, mat],
      ];
    }
    case 'placard':
      // Cuerpo y la línea entre las dos puertas.
      return [[ancho, alto, prof, 0, alto / 2, 0, mat], [0.01, alto * 0.96, 0.01, 0, alto / 2, prof / 2 + 0.005, m.detalle]];
    case 'electro':
      // Cuerpo y una franja oscura arriba al frente (manija, panel de comandos o puerta).
      return [[ancho, alto, prof, 0, alto / 2, 0, mat], [ancho * 0.9, Math.min(0.06, alto / 8), 0.01, 0, alto * 0.88, prof / 2 + 0.005, m.detalle]];
    case 'inodoro': {
      const taza = Math.min(0.42, alto * 0.6);
      return [
        [ancho * 0.8, taza, prof * 0.7, 0, taza / 2, prof * 0.15, mat], // taza, hacia adelante
        [ancho, alto - taza + 0.05, prof * 0.28, 0, taza - 0.05 + (alto - taza + 0.05) / 2, -prof / 2 + prof * 0.14, mat], // mochila
      ];
    }
    default:
      return [[ancho, alto, prof, 0, alto / 2, 0, mat]];
  }
}

/** Un mueble armado y ubicado (Group con sus cajas). */
export function dibujarMueble(params, mueble) {
  const { centro, angulo, y } = ubicarMueble(params, mueble);
  const forma = TIPOS_MUEBLE[mueble.tipo]?.forma ?? 'caja';
  const mat = materiales()[mueble.material] ?? materiales().madera;
  const grupo = new THREE.Group();
  cajasDe(forma, mueble.ancho, mueble.alto, mueble.profundidad, mat).forEach(([a, h, p, x, yy, z, material]) => {
    if (!(a > 0 && h > 0 && p > 0)) return;
    const caja = new THREE.Mesh(new THREE.BoxGeometry(a, h, p), material);
    caja.position.set(x, yy, z);
    grupo.add(caja);
  });
  grupo.position.set(centro[0], y, centro[1]);
  grupo.rotation.y = angulo;
  grupo.userData.idMueble = mueble.id;
  return grupo;
}
