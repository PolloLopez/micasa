// ==========================================================
// TERRENO EN EL 3D (v1.32): el lote, la calle, los retiros, el pozo,
// árboles, construcciones, accesos y la flecha del norte.
// ----------------------------------------------------------
// Dibuja lo que calcula motor/terreno.js (implantacion) dentro de un grupo
// propio de Three.js, aparte de la estructura: así se prende y apaga solo,
// y no entra en el encuadre de las vistas fijas del PDF.
// Todo lo de acá crea sus propios materiales: vaciarTerreno los libera.
// ==========================================================

import * as THREE from 'three';
import { TIPOS_ELEMENTO } from './motor/terreno.js';

const COLOR_LOTE = '#365314'; // pasto oscuro: se distingue del fondo de la escena
const COLOR_CALLE = '#3f3f46';
const COLOR_LINEA_MUNICIPAL = '#f97316';
const COLOR_RETIRO = '#facc15';
const ANCHO_CALLE = 4; // m de calle dibujada delante de la línea municipal (solo referencia)

/** Superficie plana (4 esquinas en el piso, en orden) a una altura `y`. */
function losa(esquinas, y, color, opacidad = 1) {
  const geo = new THREE.BufferGeometry();
  const [a, b, c, d] = esquinas;
  geo.setAttribute('position', new THREE.Float32BufferAttribute([
    a[0], y, a[1], b[0], y, b[1], c[0], y, c[1],
    a[0], y, a[1], c[0], y, c[1], d[0], y, d[1],
  ], 3));
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide, transparent: opacidad < 1, opacity: opacidad });
  return new THREE.Mesh(geo, mat);
}

/** Línea (abierta o cerrada) sobre el piso. `discontinua` para los retiros. */
function polilinea(puntos, y, color, { cerrada = false, discontinua = false } = {}) {
  const lista = cerrada ? [...puntos, puntos[0]] : puntos;
  const geo = new THREE.BufferGeometry().setFromPoints(lista.map(([x, z]) => new THREE.Vector3(x, y, z)));
  const mat = discontinua
    ? new THREE.LineDashedMaterial({ color, dashSize: 0.4, gapSize: 0.25 })
    : new THREE.LineBasicMaterial({ color });
  const linea = new THREE.Line(geo, mat);
  if (discontinua) linea.computeLineDistances();
  return linea;
}

/** Cartel de texto que mira a la cámara. */
function rotulo(texto, color = 'rgba(30,41,59,0.85)', alto = 0.45) {
  const lienzo = document.createElement('canvas');
  const ctx = lienzo.getContext('2d');
  ctx.font = 'bold 44px system-ui, sans-serif';
  lienzo.width = Math.ceil(ctx.measureText(texto).width) + 32;
  lienzo.height = 64;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, lienzo.width, lienzo.height);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 44px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(texto, lienzo.width / 2, 34);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(lienzo), depthTest: false }));
  sprite.scale.set((alto * lienzo.width) / lienzo.height, alto, 1);
  sprite.renderOrder = 999;
  return sprite;
}

/** Las 4 esquinas en el 3D de un rectángulo del lote (u, v, ancho, largo). */
const esquinasDe = (aMundo, { u, v, ancho, largo }) => [aMundo(u, v), aMundo(u + ancho, v), aMundo(u + ancho, v + largo), aMundo(u, v + largo)];

/** Un elemento del terreno en 3D (pozo, cámara, árbol, construcción, acceso, vereda). */
function dibujarElemento(el, aMundo, conEtiqueta = true) {
  const tipo = TIPOS_ELEMENTO[el.tipo];
  const g = new THREE.Group();
  const c = el.caja;
  const [cx, cz] = aMundo(c.u + c.ancho / 2, c.v + c.largo / 2);
  const material = (opacidad = 1) => new THREE.MeshStandardMaterial({ color: tipo.color, transparent: opacidad < 1, opacity: opacidad });

  if (el.tipo === 'arbol') {
    // Copa: esfera del diámetro cargado, con la parte de arriba a la altura del árbol (sin hundirse en el piso).
    const r = el.diametro / 2;
    const centroCopa = Math.max(el.alto - r, r * 0.6);
    const tronco = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, centroCopa, 8),
      new THREE.MeshStandardMaterial({ color: '#78350f' }));
    tronco.position.set(cx, centroCopa / 2, cz);
    const copa = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), material(0.75));
    copa.position.set(cx, centroCopa, cz);
    g.add(tronco, copa);
  } else if (tipo.forma === 'circulo') {
    // Pozo: un disco oscuro casi a ras del piso, con su tapa.
    const pozo = new THREE.Mesh(new THREE.CylinderGeometry(el.diametro / 2, el.diametro / 2, 0.08, 24), material());
    pozo.position.set(cx, 0.04, cz);
    g.add(pozo);
  } else if (el.tipo === 'construccion') {
    const caja = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material(0.7));
    const [p0, p1, , p3] = esquinasDe(aMundo, c);
    // El lote está alineado con los ejes: el ancho y el largo caen en x o en z según el frente.
    caja.scale.set(Math.abs(p1[0] - p0[0]) || Math.abs(p3[0] - p0[0]), Math.max(el.alto, 0.1), Math.abs(p3[1] - p0[1]) || Math.abs(p1[1] - p0[1]));
    caja.position.set(cx, Math.max(el.alto, 0.1) / 2, cz);
    g.add(caja);
  } else {
    // Cámara, acceso, vereda: una losa apenas sobre el piso.
    const alto = el.tipo === 'camara' ? 0.06 : 0.02;
    g.add(losa(esquinasDe(aMundo, c), alto, tipo.color));
  }
  if (conEtiqueta) {
    const etiqueta = rotulo(el.nombre || tipo.nombre, 'rgba(30,41,59,0.85)', 0.7); // grande: el lote se mira de lejos
    etiqueta.position.set(cx, Math.max(el.alto ?? 0, 0) + 0.8, cz);
    g.add(etiqueta);
  }
  return g;
}

/** Qué parte del terreno es cada tipo de elemento (para prenderlas y apagarlas en Capas, v1.34.3). */
const PARTE_DE_ELEMENTO = { pozo: 'pozos', camara: 'pozos', arbol: 'arboles', construccion: 'construcciones', acceso: 'accesos', vereda: 'accesos' };

/** Las partes del terreno que se pueden prender y apagar (claves de la capa: terreno + Parte). */
export const PARTES_TERRENO = ['lote', 'calle', 'retiros', 'pozos', 'arboles', 'construcciones', 'accesos', 'norte'];

/** Baja la opacidad de todo lo que se dibujó (multiplica la que ya tenía cada material). */
function aplicarOpacidadTerreno(grupo, factor) {
  if (factor >= 0.999) return;
  grupo.traverse((obj) => {
    if (!obj.material || obj.isSprite) return; // los carteles siempre se leen
    obj.material.opacity = (obj.material.transparent ? obj.material.opacity : 1) * factor;
    obj.material.transparent = true;
    obj.material.depthWrite = false;
  });
}

/**
 * Dibuja el terreno en `grupo`.
 * @param imp  resultado de implantacion(params)
 * @param retiros params.terreno.retiros (0 = no se dibuja)
 * @param opciones { etiquetas: bool (v1.33.1), partes: { lote, calle, … } (v1.34.3, todas por defecto), opacidad: 0..1 }
 */
export function dibujarTerreno(grupo, imp, retiros = {}, { etiquetas: conEtiquetas = true, partes = {}, opacidad = 1 } = {}) {
  const { aMundo, lote, norte } = imp;
  const caja = { u: 0, v: 0, ancho: lote.frente, largo: lote.fondo };
  const ver = (parte) => partes[parte] !== false;

  // Lote (pasto) y su contorno.
  if (ver('lote')) {
    grupo.add(losa(esquinasDe(aMundo, caja), -0.02, COLOR_LOTE, 0.9));
    grupo.add(polilinea(esquinasDe(aMundo, caja), 0.005, '#a3e635', { cerrada: true }));
  }

  // Calle delante de la línea municipal y la línea municipal (naranja).
  if (ver('calle')) {
    grupo.add(losa(esquinasDe(aMundo, { u: -2, v: -ANCHO_CALLE, ancho: lote.frente + 4, largo: ANCHO_CALLE }), -0.03, COLOR_CALLE));
    grupo.add(polilinea([aMundo(0, 0), aMundo(lote.frente, 0)], 0.01, COLOR_LINEA_MUNICIPAL));
    if (conEtiquetas) {
      const lm = rotulo('Línea municipal', 'rgba(194,65,12,0.9)', 0.8);
      const [lx, lz] = aMundo(lote.frente / 2, -0.6);
      lm.position.set(lx, 0.3, lz);
      const calle = rotulo('Calle', 'rgba(63,63,70,0.9)', 0.8);
      const [kx, kz] = aMundo(lote.frente / 2, -ANCHO_CALLE + 0.8);
      calle.position.set(kx, 0.3, kz);
      grupo.add(lm, calle);
    }
  }

  // Retiros (líneas punteadas amarillas) donde el diseñador cargó uno.
  if (ver('retiros')) {
    if (retiros.frente > 0) grupo.add(polilinea([aMundo(0, retiros.frente), aMundo(lote.frente, retiros.frente)], 0.01, COLOR_RETIRO, { discontinua: true }));
    if (retiros.fondo > 0) grupo.add(polilinea([aMundo(0, lote.fondo - retiros.fondo), aMundo(lote.frente, lote.fondo - retiros.fondo)], 0.01, COLOR_RETIRO, { discontinua: true }));
    if (retiros.izquierda > 0) grupo.add(polilinea([aMundo(retiros.izquierda, 0), aMundo(retiros.izquierda, lote.fondo)], 0.01, COLOR_RETIRO, { discontinua: true }));
    if (retiros.derecha > 0) grupo.add(polilinea([aMundo(lote.frente - retiros.derecha, 0), aMundo(lote.frente - retiros.derecha, lote.fondo)], 0.01, COLOR_RETIRO, { discontinua: true }));
  }

  imp.elementos.filter((el) => ver(PARTE_DE_ELEMENTO[el.tipo] ?? 'accesos'))
    .forEach((el) => grupo.add(dibujarElemento(el, aMundo, conEtiquetas)));

  // Flecha del norte, afuera del lote junto a la esquina del frente derecho.
  if (ver('norte')) {
    const [ox, oz] = aMundo(lote.frente + 2, 1.5);
    const largo = 1.6;
    const punta = [ox + norte[0] * largo, oz + norte[1] * largo];
    const costado = [-norte[1] * 0.45, norte[0] * 0.45];
    const flecha = new THREE.BufferGeometry();
    flecha.setAttribute('position', new THREE.Float32BufferAttribute([
      punta[0], 0.03, punta[1], ox + costado[0], 0.03, oz + costado[1], ox - costado[0], 0.03, oz - costado[1],
    ], 3));
    flecha.computeVertexNormals();
    grupo.add(new THREE.Mesh(flecha, new THREE.MeshBasicMaterial({ color: '#ef4444', side: THREE.DoubleSide })));
    if (conEtiquetas) {
      const n = rotulo('N', 'rgba(185,28,28,0.95)', 0.9);
      n.position.set(punta[0] + norte[0] * 0.5, 0.4, punta[1] + norte[1] * 0.5);
      grupo.add(n);
    }
  }
  aplicarOpacidadTerreno(grupo, opacidad);
}

/** Libera todo lo del terreno (geometrías, materiales y texturas: acá nada es compartido). */
export function vaciarTerreno(grupo) {
  grupo.traverse((obj) => {
    obj.geometry?.dispose();
    if (obj.material) {
      obj.material.map?.dispose();
      obj.material.dispose();
    }
  });
  grupo.clear();
}

/** Centro y tamaño del lote en el 3D, y hacia dónde está la calle (para ubicar la cámara). */
export function encuadreTerreno(imp) {
  const { aMundo, lote } = imp;
  const centro = aMundo(lote.frente / 2, lote.fondo / 2);
  const calle = aMundo(lote.frente / 2, -1);
  const haciaCalle = [calle[0] - centro[0], calle[1] - centro[1]];
  const largo = Math.hypot(...haciaCalle);
  return { centro, haciaCalle: [haciaCalle[0] / largo, haciaCalle[1] / largo], tamanio: Math.max(lote.frente, lote.fondo) };
}
