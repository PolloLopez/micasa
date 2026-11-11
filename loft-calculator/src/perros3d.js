// ==========================================================
// PERROS EN EL 3D (v1.47.1)
// ----------------------------------------------------------
// Pedido de Leandro: "también faltan los perros". Un perro simple, armado
// como las personas (cápsulas y esferas): cuerpo, cuatro patas que se
// mueven al caminar, cabeza con hocico y orejas, y la cola que se mueve.
// Su altura es la "altura a la cruz" (del piso a los hombros).
// Las poses: quieto, caminando y olfateando (la cabeza baja).
// El frente del perro es su +z, como las personas y los muebles.
// ==========================================================

import * as THREE from 'three';

export const PELAJE_DE_FABRICA = '#a16207';

const capsula = (radio, largo, material) => new THREE.Mesh(new THREE.CapsuleGeometry(radio, Math.max(0.001, largo - 2 * radio), 4, 10), material);

function articulacion(padre, [x, y, z]) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  padre.add(g);
  return g;
}

/** Arma el perro. @returns {{ raiz, juntas, medidas, materiales, anillo, esPerro: true }} */
export function crearPerro(perro) {
  const h = perro.altura; // a la cruz
  const largo = 1.3 * h; // del pecho a la cola
  const materiales = {
    pelo: new THREE.MeshStandardMaterial({ color: perro.colorRopa || PELAJE_DE_FABRICA, roughness: 0.95 }),
    oscuro: new THREE.MeshStandardMaterial({ color: '#1f2937', roughness: 0.6 }),
    anillo: new THREE.MeshBasicMaterial({ color: '#facc15', transparent: true, opacity: 0.9, depthTest: false }),
  };
  const raiz = new THREE.Group();
  raiz.userData.idPersona = perro.id;

  // Cuerpo acostado a lo largo (z), arriba de las patas.
  const altoPata = 0.62 * h;
  const radioCuerpo = 0.22 * h;
  const cuerpo = capsula(radioCuerpo, largo, materiales.pelo);
  cuerpo.rotation.x = Math.PI / 2;
  cuerpo.position.y = altoPata + radioCuerpo * 0.6;
  raiz.add(cuerpo);

  // Patas: cuatro "caderas" que giran sobre x (adelante y atrás).
  const pata = (x, z) => {
    const cadera = articulacion(raiz, [x, altoPata + radioCuerpo * 0.4, z]);
    const p = capsula(0.06 * h, altoPata + radioCuerpo * 0.4, materiales.pelo);
    p.position.y = -(altoPata + radioCuerpo * 0.4) / 2;
    cadera.add(p);
    return cadera;
  };
  const separacion = 0.13 * h;
  const patas = {
    delIzq: pata(separacion, largo * 0.36), delDer: pata(-separacion, largo * 0.36),
    traIzq: pata(separacion, -largo * 0.36), traDer: pata(-separacion, -largo * 0.36),
  };

  // Cuello y cabeza: el cuello gira sobre x (para olfatear, la cabeza baja).
  const cuello = articulacion(raiz, [0, cuerpo.position.y + radioCuerpo * 0.3, largo * 0.48]);
  const cabeza = new THREE.Mesh(new THREE.SphereGeometry(0.2 * h, 16, 12), materiales.pelo);
  cabeza.position.set(0, 0.22 * h, 0.12 * h);
  cuello.add(cabeza);
  const hocico = new THREE.Mesh(new THREE.BoxGeometry(0.16 * h, 0.13 * h, 0.22 * h), materiales.pelo);
  hocico.position.set(0, 0.17 * h, 0.32 * h);
  cuello.add(hocico);
  const nariz = new THREE.Mesh(new THREE.SphereGeometry(0.045 * h, 10, 8), materiales.oscuro);
  nariz.position.set(0, 0.2 * h, 0.44 * h);
  cuello.add(nariz);
  [-1, 1].forEach((lado) => {
    const oreja = new THREE.Mesh(new THREE.BoxGeometry(0.07 * h, 0.18 * h, 0.1 * h), materiales.oscuro);
    oreja.position.set(lado * 0.15 * h, 0.3 * h, 0.06 * h);
    oreja.rotation.z = lado * 0.35;
    cuello.add(oreja);
    const ojo = new THREE.Mesh(new THREE.SphereGeometry(0.03 * h, 8, 6), materiales.oscuro);
    ojo.position.set(lado * 0.08 * h, 0.3 * h, 0.27 * h);
    cuello.add(ojo);
  });

  // Cola: sale de atrás hacia arriba y se mueve de lado a lado.
  const base = articulacion(raiz, [0, cuerpo.position.y + radioCuerpo * 0.4, -largo * 0.5]);
  const cola = capsula(0.035 * h, 0.45 * h, materiales.pelo);
  cola.position.set(0, 0.2 * h, -0.08 * h);
  cola.rotation.x = -0.5;
  base.add(cola);

  const anillo = new THREE.Mesh(new THREE.RingGeometry(0.1 + 0.5 * h, 0.14 + 0.5 * h, 32), materiales.anillo);
  anillo.rotation.x = -Math.PI / 2;
  anillo.position.y = 0.01;
  anillo.renderOrder = 999;
  anillo.visible = false;
  raiz.add(anillo);

  raiz.traverse((o) => { if (o.isMesh && o !== anillo) o.castShadow = true; });
  return { raiz, materiales, anillo, esPerro: true, medidas: { H: h }, juntas: { ...patas, cuello, cola: base }, tiempo: 0 };
}

/**
 * Lleva al perro hacia su pose. `fase` = en qué parte del paso va; `dt` para que la cola se mueva siempre.
 * Al caminar se mueven en diagonal (delantera izquierda con trasera derecha), como caminan los perros.
 */
export function animarPerro(figura, pose, fase, dt, mezcla) {
  const j = figura.juntas;
  figura.tiempo += dt;
  const s = Math.sin(fase);
  const objetivo = pose === 'caminar'
    ? { delIzq: -0.5 * s, traDer: -0.5 * s, delDer: 0.5 * s, traIzq: 0.5 * s, cuello: 0.1 }
    : { delIzq: 0, traDer: 0, delDer: 0, traIzq: 0, cuello: pose === 'olfatear' ? 0.75 : 0 };
  Object.entries(objetivo).forEach(([k, v]) => { j[k].rotation.x += (v - j[k].rotation.x) * mezcla; });
  // La cola: más rápido cuando camina o olfatea (contento).
  const rapidez = pose === 'quieta' ? 6 : 14;
  j.cola.rotation.y = Math.sin(figura.tiempo * rapidez) * 0.5;
}

/** Altura de los ojos del perro (para verlo "con sus ojos"). */
export const ojosDelPerro = (figura) => figura.medidas.H * 1.15 - figura.juntas.cuello.rotation.x * 0.25 * figura.medidas.H;
