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
    // v1.39: vidrio de la puerta del lavarropas y del horno; loza de la bacha; metal del grifo.
    materialesMuebles.vidrio = new THREE.MeshStandardMaterial({ color: '#334155', metalness: 0.3, roughness: 0.15 });
    materialesMuebles.loza = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.25 });
    materialesMuebles.metal = new THREE.MeshStandardMaterial({ color: '#94a3b8', metalness: 0.8, roughness: 0.3 });
  }
  return materialesMuebles;
}

// v1.38.2: materiales de colores propios (muebles, tapas, estantes), creados una vez por color y brillo.
const porColor = new Map();
/** Material de un color elegido a mano. @param base { metal, aspereza } (de MATERIALES_MUEBLE) */
export function materialDeColor(color, base = { metal: 0, aspereza: 0.7 }) {
  const clave = `${color}|${base.metal}|${base.aspereza}`;
  if (!porColor.has(clave)) porColor.set(clave, new THREE.MeshStandardMaterial({ color, metalness: base.metal, roughness: base.aspereza }));
  return porColor.get(clave);
}

/**
 * Cajas de cada forma, en coordenadas del mueble: x = ancho (centrado), y = alto (desde el piso),
 * z = profundidad (centrada; +z es el FRENTE del mueble). Cada caja: [ancho, alto, prof, x, y, z, material].
 * v1.39: también cilindros: ['cil', radio, largo, eje ('y' parado | 'z' mirando al frente), x, y, z, material].
 * @param opciones { cargaFrontal } (lavarropas)
 */
function cajasDe(forma, ancho, alto, prof, mat, opciones = {}) {
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
    case 'cocina': {
      // Cuerpo, 4 hornallas arriba (2 x 2), puerta del horno con vidrio y la franja de perillas.
      const r = Math.min(ancho, prof) * 0.13;
      const hornallas = [-1, 1].flatMap((sx) => [-1, 1].map((sz) =>
        ['cil', r, 0.015, 'y', sx * ancho * 0.24, alto + 0.0075, sz * prof * 0.22, m.detalle]));
      return [
        [ancho, alto, prof, 0, alto / 2, 0, mat],
        ...hornallas,
        [ancho * 0.8, alto * 0.42, 0.01, 0, alto * 0.38, prof / 2 + 0.005, m.vidrio],
        [ancho * 0.9, Math.min(0.05, alto / 10), 0.01, 0, alto * 0.86, prof / 2 + 0.005, m.detalle],
      ];
    }
    case 'lavarropas': {
      // Carga frontal: la puerta redonda al frente; carga superior: la tapa redonda arriba.
      const r = Math.min(ancho, alto) * 0.3;
      const puerta = opciones.cargaFrontal !== false
        ? [['cil', r * 1.12, 0.012, 'z', 0, alto * 0.45, prof / 2 + 0.006, m.metal], ['cil', r, 0.02, 'z', 0, alto * 0.45, prof / 2 + 0.01, m.vidrio]]
        : [['cil', Math.min(ancho, prof) * 0.33, 0.012, 'y', 0, alto + 0.006, 0.02, m.vidrio]];
      return [
        [ancho, alto, prof, 0, alto / 2, 0, mat],
        ...puerta,
        [ancho * 0.9, Math.min(0.06, alto / 10), 0.01, 0, alto * 0.9, prof / 2 + 0.005, m.detalle],
      ];
    }
    case 'vanitory': {
      // Mueble bajo mesada, tapa con la bacha encastrada y el grifo atrás.
      const tapa = 0.03;
      const rBacha = Math.min(ancho * 0.32, prof * 0.32);
      return [
        [ancho, alto - tapa, prof, 0, (alto - tapa) / 2, 0, mat],
        [0.01, (alto - tapa) * 0.9, 0.01, 0, (alto - tapa) / 2, prof / 2 + 0.005, m.detalle], // dos puertas
        [ancho + 0.02, tapa, prof + 0.02, 0, alto - tapa / 2, 0.01, m.loza],
        ['cil', rBacha, 0.012, 'y', 0, alto + 0.002, 0.03, m.vidrio], // el hueco de la bacha (oscuro)
        ['cil', 0.015, 0.18, 'y', 0, alto + 0.09, -prof / 2 + 0.06, m.metal], // grifo
      ];
    }
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
  return dibujarMuebleEn(mueble, centro, angulo, y);
}

/**
 * v1.40: un mueble en un lugar dado (centro [x, z], ángulo y altura del piso). Lo usan los muebles sueltos y los
 * electrodomésticos de los huecos de las mesadas. `mueble`: { tipo, ancho, profundidad, alto, material, color?, cargaFrontal? }
 */
export function dibujarMuebleEn(mueble, centro, angulo, y) {
  const forma = TIPOS_MUEBLE[mueble.tipo]?.forma ?? 'caja';
  // v1.38.2: con color propio, el mismo brillo de su material pero de ese color.
  const base = MATERIALES_MUEBLE[mueble.material] ?? MATERIALES_MUEBLE.madera;
  const mat = mueble.color ? materialDeColor(mueble.color, base) : (materiales()[mueble.material] ?? materiales().madera);
  const grupo = new THREE.Group();
  cajasDe(forma, mueble.ancho, mueble.alto, mueble.profundidad, mat, mueble).forEach((pieza) => {
    if (pieza[0] === 'cil') {
      const [, radio, largo, eje, x, yy, z, material] = pieza;
      const cilindro = new THREE.Mesh(new THREE.CylinderGeometry(radio, radio, largo, 24), material);
      if (eje === 'z') cilindro.rotation.x = Math.PI / 2; // de parado a mirando al frente
      cilindro.position.set(x, yy, z);
      grupo.add(cilindro);
      return;
    }
    const [a, h, p, x, yy, z, material] = pieza;
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
