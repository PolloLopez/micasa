// ==========================================================
// VISOR 3D (Three.js)
// ----------------------------------------------------------
// Dibuja la estructura que arma motor/estructura.js.
//
// Para no perder memoria (memory leak) se separa en efectos:
//   1. Montaje: crea UNA sola vez escena, cámara, renderer, controles
//      y el "clic para seleccionar" (raycaster).
//   2. Modelo: cuando cambian los datos, borra el grupo anterior
//      liberando geometrías y texturas (dispose) y dibuja el nuevo.
//   3. Colores y 4. rotación: solo cambian propiedades, no redibujan.
//
// Visibilidad de cada pieza = su CAPA (tipo de pieza) está prendida
// Y todos sus GRUPOS (pared, techo, piso) están visibles.
// ==========================================================

import { useEffect, useRef, useState } from 'react';
import { piezaResaltada } from './motor/resaltado.js';
import * as THREE from 'three';
import { hayDialogoAbierto } from './componentes/useDialogo.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { LADOS } from './motor/constantes.js';
import { CAPAS, AYUDAS, GRUPOS_LEYENDA, capaDelProyecto } from './capas.js';
import { posicionAbertura, listarPiezas } from './motor/estructura.js';
import { geometriaLados, nombreLado } from './motor/geometria.js';
import { describirPieza } from './descripcionPiezas.js';
import { seccionDesdePerfil } from './motor/canos.js';
import { INSUMO } from './motor/constantes.js';
import EditorPieza from './componentes/EditorPieza.jsx';
import { FilaAbertura } from './componentes/AberturasDePared.jsx';
import { juntasDePano, pedazosDePared } from './motor/revestimientos.js';
import { medirEntre, puntoMasCercanoEnPieza } from './motor/medicion.js';
import { cotasGenerales } from './motor/cotas3d.js';
import { vistasFijas } from './motor/vistasFijas.js';
import { implantacion } from './motor/terreno.js';
import { moduloActivo } from './modulos.js';
import { dibujarTerreno, vaciarTerreno, encuadreTerreno } from './terreno3d.js';

// Capa y sección (grosor en el 3D) de cada tipo de pieza.
const ESTILO_PIEZA = {
  columna: { capa: 'columnas', seccion: 0.1 },
  'columna-entrepiso': { capa: 'columnas', seccion: 0.1 }, // v1.28
  dintel: { capa: 'columnas', seccion: 0.08 },
  jamba: { capa: 'columnas', seccion: 0.08 },
  alfeizar: { capa: 'columnas', seccion: 0.08 },
  travesano: { capa: 'columnas', seccion: 0.06 }, // v1.28
  montante: { capa: 'columnas', seccion: 0.05 },
  'montante-dintel': { capa: 'columnas', seccion: 0.05 },
  'montante-antepecho': { capa: 'columnas', seccion: 0.05 },
  'marco-piso': { capa: 'marcos', seccion: 0.12 },
  solera: { capa: 'marcos', seccion: 0.12 },
  'marco-piso2': { capa: 'marcos', seccion: 0.12 },
  'viga-cierre': { capa: 'marcos', seccion: 0.12 },
  'viga-apoyo': { capa: 'marcos', seccion: 0.12 }, // v1.28
  piso: { capa: 'piso', seccion: 0.08 },
  piso2: { capa: 'piso2', seccion: 0.08 },
  'transv-piso': { capa: 'transversales', seccion: 0.09 },
  'transv-piso2': { capa: 'transversales', seccion: 0.09 },
  horizontal: { capa: 'correas', seccion: 0.04 },
  'viga-techo': { capa: 'techo', seccion: 0.1 },
  'correa-techo': { capa: 'techo', seccion: 0.05 },
  'borde-techo': { capa: 'techo', seccion: 0.1 }, // v1.28
  zanca: { capa: 'escalera', seccion: 0.12 },
  'marco-descanso': { capa: 'escalera', seccion: 0.1 },
  'apoyo-escalon': { capa: 'escalera', seccion: 0.04 },
  'columna-escalera': { capa: 'escalera', seccion: 0.08 },
  riostra: { capa: 'escalera', seccion: 0.035 }, // en una grada va en la capa "grada" (ver capaDe)
  'grada-zanca': { capa: 'grada', seccion: 0.1 },
  'grada-apoyo': { capa: 'grada', seccion: 0.06 },
  'grada-parante': { capa: 'grada', seccion: 0.07 },
  'grada-viga': { capa: 'grada', seccion: 0.06 },
  'grada-union': { capa: 'grada', seccion: 0.04 },
  'mont-pata': { capa: 'montaje', seccion: 0.06 },
  'mont-marco': { capa: 'montaje', seccion: 0.05 },
  'mont-travesano': { capa: 'montaje', seccion: 0.045 },
};

/**
 * Renglón del catálogo de cada tipo de pieza de escalera, grada y montaje: el
 * 3D dibuja la barra con el grosor del caño elegido ahí (si se puede leer).
 * Las piezas del loft mantienen su grosor fijo (para que el modelo se lea claro).
 */
const INSUMO_POR_TIPO = {
  'viga-cierre': INSUMO.VIGA_CIERRE, 'viga-apoyo': INSUMO.VIGA_CIERRE, 'columna-entrepiso': INSUMO.COLUMNA_ENTREPISO,
  zanca: INSUMO.ZANCA, 'apoyo-escalon': INSUMO.APOYO_ESCALON, 'columna-escalera': INSUMO.COLUMNA_ESCALERA,
  riostra: INSUMO.RIOSTRA,
  'grada-zanca': INSUMO.GRADA_ZANCA, 'grada-parante': INSUMO.GRADA_PARANTE, 'grada-apoyo': INSUMO.GRADA_APOYO,
  'grada-viga': INSUMO.GRADA_VIGA, 'grada-union': INSUMO.GRADA_UNION,
  'mont-pata': INSUMO.MONTAJE_PATA, 'mont-marco': INSUMO.MONTAJE_MARCO, 'mont-travesano': INSUMO.MONTAJE_MARCO,
};

/** Grosor con el que se dibuja una pieza: el de su caño (catálogo) o el fijo de su tipo. */
function seccionDe(p, catalogo, estilo) {
  const id = p.insumo ?? INSUMO_POR_TIPO[p.tipo];
  const perfil = id && catalogo?.find((i) => i.id === id)?.perfil;
  return seccionDesdePerfil(perfil) ?? estilo.seccion;
}

/** Capa de una pieza: la de su tipo, salvo las riostras de la grada. */
const capaDe = (p) => {
  if (p.tipo === 'riostra' && p.grupos.includes('grada')) return 'grada';
  if (p.tipo === 'riostra' && p.grupos.includes('montaje')) return 'montaje';
  if (p.tipo === 'riostra' && LADOS.some((l) => p.grupos.includes(l))) return 'columnas'; // riostras de pared (v1.17)
  return ESTILO_PIEZA[p.tipo]?.capa;
};
const ESPESOR_ESCALON = 0.05; // madera de 2"
// Media sección de los perfiles de pared en el dibujo (marcos de 12 cm): un revestimiento
// "sobre la estructura" se dibuja por fuera de esto para tapar los marcos (v1.15).
const MEDIA_SECCION_PARED = 0.06;


const COLOR_SELECCION = '#facc15';
const COLOR_RESALTADO = '#f472b6'; // v1.27: rosa, distinto de la selección (amarilla) y de las capas
const COLOR_JUNTAS = '#fde047'; // juntas de paneles: amarillo claro, se ve sobre paneles claros y oscuros
const COLOR_MEDIDA = '#facc15';
const COLOR_MEDIDA_FIJA = '#fb923c'; // v1.28: medidas fijadas (naranja, distinta de la que se está tomando)
const COLOR_COTAS = '#64748b'; // v1.28: cotas generales (gris: se leen en pantalla oscura y en el PDF blanco)
const MAXIMO_MEDIDAS_FIJAS = 20;
const MOVIMIENTO_MAXIMO_CLIC = 5; // px: si el mouse se movió más, fue un arrastre (orbitar)

/**
 * Crea los materiales una sola vez, con los colores elegidos.
 * Los colores después se actualizan sin recrear nada (efecto 3).
 */
function crearMateriales(colores) {
  const materiales = {};
  Object.keys(CAPAS).forEach((clave) => {
    materiales[clave] = new THREE.MeshStandardMaterial({ color: colores[clave] });
  });
  const transparente = (material, opacity) => {
    material.transparent = true;
    material.opacity = opacity;
    material.depthWrite = false;
    material.side = THREE.DoubleSide;
  };
  transparente(materiales.osb, 0.45); // deja ver la estructura de piso y las transversales
  transparente(materiales.paneles, 0.16);
  transparente(materiales.aberturas, 0.7);
  transparente(materiales.chapa, 0.55); // se ve la estructura a través de los tanques
  // Juntas de los paneles (v1.24: con opacidad regulable desde la leyenda).
  materiales.juntas = new THREE.LineBasicMaterial({ color: COLOR_JUNTAS, transparent: true, opacity: 1 });
  // Pieza seleccionada: amarillo que brilla.
  materiales.seleccion = new THREE.MeshStandardMaterial({ color: COLOR_SELECCION, emissive: COLOR_SELECCION, emissiveIntensity: 0.6 });
  // Piezas resaltadas (v1.27): rosa que brilla y se ve A TRAVÉS de todo (depthTest apagado),
  // así una columna tapada por los paneles o por otra pared igual se ve.
  materiales.resaltado = new THREE.MeshStandardMaterial({
    color: COLOR_RESALTADO, emissive: COLOR_RESALTADO, emissiveIntensity: 0.7, depthTest: false, transparent: true, opacity: 0.95,
  });
  return materiales;
}

/** Controles de opacidad de la leyenda. */
const OPACIDADES = [
  { clave: 'paneles', nombre: 'Paneles' },
  { clave: 'osb', nombre: 'OSB' },
  { clave: 'hierros', nombre: 'Hierros' },
  { clave: 'juntas', nombre: 'Juntas' }, // v1.24: líneas de unión de los paneles
];

/** Capas de hierro (todas menos superficies y madera): comparten la opacidad "Hierros". */
const CAPAS_SUPERFICIE = ['paneles', 'osb', 'aberturas', 'chapa', 'escalones'];
const CAPAS_HIERRO = Object.keys(CAPAS).filter((c) => !CAPAS_SUPERFICIE.includes(c));

/** Opacidad de un material: 1 = sólido (tapa lo de atrás); menos = se ve a través. */
function aplicarOpacidad(material, opacidad) {
  const transparente = opacidad < 0.999;
  material.opacity = opacidad;
  material.transparent = transparente;
  material.depthWrite = !transparente; // sólido: escribe profundidad y tapa bien lo que está detrás
  material.needsUpdate = true;
}

/** Material de UNA cara de un tipo de panel (exterior = FrontSide, interior = BackSide). */
function materialPanel(color, opacidad, lado) {
  const material = new THREE.MeshStandardMaterial({ color, side: lado });
  aplicarOpacidad(material, opacidad);
  return material;
}

/**
 * Panel con dos caras: la de afuera con el color exterior y la de adentro con el interior.
 * `haciaAfuera` es un vector que apunta al exterior; si el orden de las esquinas deja la
 * cara "de frente" mirando hacia adentro, se invierte.
 */
function panelDosCaras(esquinas, materiales, haciaAfuera) {
  const [a, b, c] = esquinas;
  const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const normal = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  const mira = normal[0] * haciaAfuera[0] + normal[1] * haciaAfuera[1] + normal[2] * haciaAfuera[2];
  const ordenadas = mira >= 0 ? esquinas : [...esquinas].reverse();
  const panel = new THREE.Group();
  panel.add(cuadrilatero(ordenadas, materiales.exterior), cuadrilatero(ordenadas, materiales.interior));
  return panel;
}

/**
 * Panel de pared con los huecos de las aberturas recortados (v1.24).
 * `esquinas` = [abajo p1, abajo p2, arriba p2, arriba p1] ya corridas y estiradas;
 * `corrimientoP1` = cuánto se estiró la punta 1 (los huecos se miden desde la punta 1 original).
 */
function panelConHuecos(esquinas, huecos, corrimientoP1, materiales, haciaAfuera) {
  const [o, p2, a2, a1] = esquinas;
  const largo = Math.hypot(p2[0] - o[0], p2[2] - o[2]) || 1;
  const u = [(p2[0] - o[0]) / largo, 0, (p2[2] - o[2]) / largo];
  const hA = a1[1] - o[1];
  const hB = a2[1] - p2[1];
  const altoEn = (x) => hA + ((hB - hA) * x) / largo;
  const locales = huecos.map((h) => ({ ...h, desde: h.desde + corrimientoP1, hasta: h.hasta + corrimientoP1 }));
  const a3d = ([x, y]) => [o[0] + u[0] * x, o[1] + y, o[2] + u[2] * x];
  // Normal de (u, arriba) = u × (0,1,0) = (-u.z, 0, u.x): si no mira hacia afuera, se dan vuelta los triángulos.
  const alReves = -u[2] * haciaAfuera[0] + u[0] * haciaAfuera[2] < 0;
  const vertices = [];
  pedazosDePared(largo, altoEn, locales).forEach(([q0, q1, q2, q3]) => {
    const [v0, v1, v2, v3] = [q0, q1, q2, q3].map(a3d);
    const tri = alReves ? [v0, v2, v1, v0, v3, v2] : [v0, v1, v2, v0, v2, v3];
    vertices.push(...tri.flat());
  });
  const geometria = new THREE.BufferGeometry();
  geometria.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometria.computeVertexNormals();
  if (!materiales.exterior) return new THREE.Mesh(geometria, materiales); // material genérico (dos caras)
  const panel = new THREE.Group();
  panel.add(new THREE.Mesh(geometria, materiales.exterior), new THREE.Mesh(geometria, materiales.interior));
  return panel;
}

/** Un tramo [a, b] menos los cortes [[c0, c1], …]: lo que queda (para las juntas que cruzan un hueco). */
function restarTramos([a, b], cortes) {
  let quedan = [[a, b]];
  cortes.forEach(([c0, c1]) => {
    quedan = quedan.flatMap(([x0, x1]) => [[x0, Math.min(x1, c0)], [Math.max(x0, c1), x1]].filter(([p, q]) => q - p > 1e-3));
  });
  return quedan;
}

/** Barra entre dos puntos 3D (vertical, horizontal o inclinada). */
function barra({ desde, hasta, largo }, seccion, material) {
  const centro = [(desde[0] + hasta[0]) / 2, (desde[1] + hasta[1]) / 2, (desde[2] + hasta[2]) / 2];
  const esVertical = Math.hypot(hasta[0] - desde[0], hasta[2] - desde[2]) < 1e-6;
  const malla = esVertical
    ? new THREE.Mesh(new THREE.BoxGeometry(seccion, largo, seccion), material)
    : new THREE.Mesh(new THREE.BoxGeometry(seccion, seccion, largo), material);
  malla.position.set(...centro);
  if (!esVertical) malla.lookAt(...hasta); // orienta el eje largo (z local) hacia el punto final
  return malla;
}

/** Superficie de 4 esquinas (pared, techo, placa). */
function cuadrilatero(esquinas, material) {
  const [a, b, c, d] = esquinas;
  const geometria = new THREE.BufferGeometry();
  geometria.setAttribute('position', new THREE.Float32BufferAttribute([...a, ...b, ...c, ...a, ...c, ...d], 3));
  geometria.computeVertexNormals();
  return new THREE.Mesh(geometria, material);
}

/** Cartel chico (número de abertura, medida): mismo estilo, a la medida del texto. */
function cartelChico(texto, fondo = 'rgba(30,41,59,0.9)') {
  const lienzo = document.createElement('canvas');
  const ctx = lienzo.getContext('2d');
  ctx.font = 'bold 44px system-ui, sans-serif';
  lienzo.width = Math.ceil(ctx.measureText(texto).width) + 32;
  lienzo.height = 64;
  ctx.fillStyle = fondo;
  ctx.fillRect(0, 0, lienzo.width, lienzo.height);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 44px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(texto, lienzo.width / 2, 34);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(lienzo), depthTest: false }));
  const alto = 0.3;
  sprite.scale.set((alto * lienzo.width) / lienzo.height, alto, 1);
  sprite.renderOrder = 999;
  return sprite;
}

/** Líneas sueltas (pares de puntos) en un solo objeto: juntas de paneles, línea de medida. */
function lineas(pares, colorOMaterial, encima = false) {
  const geometria = new THREE.BufferGeometry();
  geometria.setAttribute('position', new THREE.Float32BufferAttribute(pares.flat(2), 3));
  // v1.24: se puede pasar un material compartido (el de las juntas, con su opacidad regulable).
  const compartido = colorOMaterial instanceof THREE.Material;
  const material = compartido ? colorOMaterial : new THREE.LineBasicMaterial({ color: colorOMaterial, depthTest: !encima });
  const objeto = new THREE.LineSegments(geometria, material);
  objeto.userData.materialCompartido = compartido; // no se libera al redibujar
  if (encima) objeto.renderOrder = 998;
  return objeto;
}

/** Cartel de texto que siempre mira a la cámara (sprite). */
function cartel(texto, esFrente) {
  const lienzo = document.createElement('canvas');
  lienzo.width = 512;
  lienzo.height = 96;
  const ctx = lienzo.getContext('2d');
  ctx.fillStyle = esFrente ? 'rgba(2,132,199,0.9)' : 'rgba(30,41,59,0.85)';
  ctx.fillRect(0, 0, 512, 96);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 44px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(texto, 256, 50);
  const material = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(lienzo), depthTest: false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(2.4, 0.45, 1);
  sprite.renderOrder = 999; // se dibuja último: nunca queda tapado por paneles transparentes
  return sprite;
}

/** Arma todas las mallas del modelo dentro de `grupo`. */
function dibujarModelo(grupo, materiales, materialesPanel, opciones) {
  const { params, estructura: e, aberturas, capas, gruposVisibles, seleccionada, catalogo, aberturaSeleccionada, medida, resaltado, medidasFijas = [] } = opciones;
  const { elevacion } = params;
  const grupoVisible = (g) => gruposVisibles[g] !== false; // 'interior' no tiene interruptor

  // Piezas de hierro: una malla cada una, con su id para poder seleccionarla.
  listarPiezas(e).forEach((p) => {
    const estilo = ESTILO_PIEZA[p.tipo];
    const capa = capaDe(p);
    if (!estilo || !capas[capa] || !p.grupos.every(grupoVisible)) return;
    const elegida = p.id === seleccionada;
    const resaltada = !elegida && piezaResaltada(p, resaltado, catalogo); // v1.27
    const material = elegida ? materiales.seleccion : resaltada ? materiales.resaltado : materiales[capa];
    const seccion = seccionDe(p, catalogo, estilo);
    const malla = barra(p, elegida ? seccion * 1.6 : resaltada ? seccion * 1.3 : seccion, material);
    if (resaltada) malla.renderOrder = 997; // después de los paneles transparentes
    malla.userData.idPieza = p.id;
    malla.userData.pieza = p; // para medir de eje a eje (ver medicion.js)
    grupo.add(malla);
  });

  // Escalones y piso del descanso (madera): cajas finas orientadas según el tramo.
  if (e.escalera && capas.escalones && grupoVisible('escalera')) {
    const tabla = ({ centro, direccion, ancho, largo }) => {
      const malla = new THREE.Mesh(new THREE.BoxGeometry(ancho, ESPESOR_ESCALON, largo), materiales.escalones);
      malla.position.set(centro[0], centro[1] + ESPESOR_ESCALON / 2, centro[2]);
      malla.rotation.y = Math.atan2(direccion[0], direccion[1]); // el largo (z local) va a lo largo del tramo
      grupo.add(malla);
    };
    e.escalera.escalones.forEach((s) => tabla({ ...s, largo: s.huella }));
    e.escalera.descansos.forEach((d) => tabla({ centro: d.centro, direccion: d.direccion, ancho: d.lado, largo: d.lado }));
  }

  // Tablones de la grada (asiento y pie): cajas a lo largo de cada fila.
  if (e.grada) {
    if (capas.escalones && grupoVisible('grada')) {
      e.grada.tablones.forEach((t) => {
        // Acostados (asiento, pie) o parados (respaldo sobre la contrahuella, 2,5 cm de espesor).
        const malla = t.vertical
          ? new THREE.Mesh(new THREE.BoxGeometry(t.largo, t.ancho, 0.025), materiales.escalones)
          : new THREE.Mesh(new THREE.BoxGeometry(t.largo, ESPESOR_ESCALON, t.ancho), materiales.escalones);
        malla.position.set(t.centro[0], t.vertical ? t.centro[1] : t.centro[1] + ESPESOR_ESCALON / 2, t.centro[2]);
        grupo.add(malla);
      });
    }
    return; // una grada no tiene pilotines, pisos, paneles, aberturas ni carteles de paredes
  }

  // Montaje: tapas de mesa (chapa o madera) y tanques (cilindros de chapa con sus tapas).
  if (e.montaje) {
    e.montaje.placas.filter((t) => grupoVisible(`comp:${t.id.split(':')[0]}`)).forEach((t) => {
      const capa = t.material === 'madera' ? 'escalones' : 'chapa';
      if (!capas[capa]) return;
      const [lx, lz] = t.rotacion === 90 ? [t.ancho, t.largo] : [t.largo, t.ancho];
      const malla = new THREE.Mesh(new THREE.BoxGeometry(lx, 0.02, lz), materiales[capa]);
      malla.position.set(...t.centro);
      grupo.add(malla);
    });
    if (capas.chapa) {
      e.montaje.cilindros.filter((c) => grupoVisible(c.grupo)).forEach((c) => grupo.add(cilindroDeChapa(c, materiales.chapa)));
    }
    return; // un montaje no tiene pilotines, pisos, paneles, aberturas ni carteles de paredes
  }

  if (capas.pilotines) {
    e.pilotines.forEach(({ x, z }) => {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, elevacion || 0.01, 16), materiales.pilotines);
      p.position.set(x, elevacion / 2, z);
      grupo.add(p);
    });
  }

  if (capas.osb) {
    const { largo, ancho } = params;
    const y = elevacion + 0.07;
    if (grupoVisible('piso')) {
      grupo.add(cuadrilatero([[-largo / 2, y, -ancho / 2], [largo / 2, y, -ancho / 2], [largo / 2, y, ancho / 2], [-largo / 2, y, ancho / 2]], materiales.osb));
    }
    if (e.entrepiso && grupoVisible('piso2')) {
      const y2 = e.entrepiso.y + 0.07;
      grupo.add(cuadrilatero(e.entrepiso.esquinas.map(([x, z]) => [x, y2, z]), materiales.osb));
    }
  }

  if (capas.paneles) {
    // Cada revestimiento con su color exterior e interior; si el tipo no existe, el material genérico.
    // `corrimiento`: cuánto se aleja del eje de la pared hacia `haciaAfuera` (v1.15, según su ubicación).
    const dibujar = (esquinas, idPanel, haciaAfuera, corrimiento = 0, huecos = null, estirado = 0) => {
      const mats = materialesPanel.get(idPanel);
      const n = Math.hypot(...haciaAfuera) || 1;
      const d = haciaAfuera.map((c) => (c / n) * corrimiento);
      const movidas = esquinas.map((p) => [p[0] + d[0], p[1] + d[1], p[2] + d[2]]);
      // v1.24: las paredes con aberturas se dibujan con los huecos recortados (se ven las ventanas).
      if (huecos?.length) grupo.add(panelConHuecos(movidas, huecos, estirado, mats ?? materiales.paneles, haciaAfuera));
      else grupo.add(mats ? panelDosCaras(movidas, mats, haciaAfuera) : cuadrilatero(movidas, materiales.paneles));
    };
    /** Distancia al eje: "sobre la estructura" = afuera de los perfiles (tapa los marcos); "embutido" = al eje. */
    const corrimientoDe = (idPanel) => {
      const tipo = materialesPanel.get(idPanel)?.tipo;
      return tipo?.ubicacion === 'eje' ? 0 : MEDIA_SECCION_PARED + (tipo?.espesor ?? 50) / 2000;
    };
    /**
     * Estira (o acorta, si `extra` < 0) el paño a lo largo de la pared en sus dos puntas:
     * corrido hacia afuera tiene que crecer para que las esquinas cierren; hacia adentro, achicarse.
     * Esquinas en orden [abajo p1, abajo p2, arriba p2, arriba p1] (ver generarParedes).
     */
    const estirar = (esquinas, extra) => {
      const [a, b] = esquinas;
      const largo = Math.hypot(b[0] - a[0], b[2] - a[2]) || 1;
      const dx = ((b[0] - a[0]) / largo) * extra;
      const dz = ((b[2] - a[2]) / largo) * extra;
      return esquinas.map((p, i) => (i === 0 || i === 3 ? [p[0] - dx, p[1], p[2] - dz] : [p[0] + dx, p[1], p[2] + dz]));
    };
    e.paredes.filter((pared) => grupoVisible(pared.lado)).forEach((pared) => {
      // Afuera = desde el centro de la planta hacia el centro de la pared (horizontal).
      const centro = pared.esquinas.reduce((acc, p) => [acc[0] + p[0] / 4, 0, acc[2] + p[2] / 4], [0, 0, 0]);
      const afuera = corrimientoDe(pared.panel);
      dibujar(estirar(pared.esquinas, afuera), pared.panel, centro, afuera, pared.huecos, afuera);
      // Revestimiento interior: su cara "exterior" (color principal) mira hacia adentro del ambiente.
      if (pared.panelInterior) {
        const adentro = corrimientoDe(pared.panelInterior) || 0.01;
        dibujar(estirar(pared.esquinas, -adentro), pared.panelInterior, centro.map((c) => -c), adentro, pared.huecos, -adentro);
      }
    });
    if (grupoVisible('techo')) {
      const tipoTecho = materialesPanel.get(e.techo.panel)?.tipo;
      // Las esquinas del techo ya están arriba de las correas; embutido baja entre las vigas.
      dibujar(e.techo.esquinas, e.techo.panel, [0, 1, 0], tipoTecho?.ubicacion === 'eje' ? -0.13 : (tipoTecho?.espesor ?? 50) / 2000);
    }
  }

  // Juntas de los paneles (v1.16): dónde termina cada tira o placa, para acomodar las aberturas.
  if (capas.paneles && capas.juntas) {
    const pares = [];
    e.paredes.filter((pared) => grupoVisible(pared.lado)).forEach((pared) => {
      const tipo = materialesPanel.get(pared.panel)?.tipo;
      const [h1, h2] = pared.alturas;
      const { verticales, horizontales } = juntasDePano({ largo: pared.largo, h1, h2 }, tipo);
      const [a, b] = pared.esquinas; // abajo p1, abajo p2
      const y0 = a[1];
      const dir = [(b[0] - a[0]) / pared.largo, (b[2] - a[2]) / pared.largo];
      const n = Math.hypot(a[0] + b[0], a[2] + b[2]) || 1; // afuera = del centro a la pared
      const fuera = (tipo?.ubicacion === 'eje' ? 0 : MEDIA_SECCION_PARED + (tipo?.espesor ?? 50) / 2000) + 0.01;
      const punto = (x, h) => [a[0] + dir[0] * x + ((a[0] + b[0]) / n) * fuera, y0 + h, a[2] + dir[1] * x + ((a[2] + b[2]) / n) * fuera];
      const altoEn = (x) => h1 + ((h2 - h1) * x) / pared.largo;
      const huecos = pared.huecos ?? [];
      // v1.24: las juntas no cruzan los huecos de las aberturas.
      verticales.forEach((x) => {
        const cortes = huecos.filter((hh) => hh.desde < x && hh.hasta > x).map((hh) => [hh.abajo, hh.arriba]);
        restarTramos([0, altoEn(x)], cortes).forEach(([y0, y1]) => pares.push([punto(x, y0), punto(x, y1)]));
      });
      horizontales.forEach((h) => {
        // En una pared inclinada la junta llega solo hasta donde la pared es más alta que h.
        let desde = 0;
        let hasta = pared.largo;
        if (Math.abs(h2 - h1) > 1e-9) {
          const cruce = ((h - h1) / (h2 - h1)) * pared.largo;
          if (h2 > h1) desde = Math.max(0, cruce); else hasta = Math.min(pared.largo, cruce);
        }
        const cortes = huecos.filter((hh) => hh.abajo < h && hh.arriba > h).map((hh) => [hh.desde, hh.hasta]);
        restarTramos([desde, hasta], cortes)
          .filter(([x0, x1]) => x1 - x0 > 0.05)
          .forEach(([x0, x1]) => pares.push([punto(x0, h), punto(x1, h)]));
      });
    });
    if (grupoVisible('techo') && e.techo.esquinas.length === 4) {
      const tipo = materialesPanel.get(e.techo.panel)?.tipo;
      const { verticales, horizontales } = juntasDePano({ largo: e.techo.largo, h1: e.techo.largoFaldon, h2: e.techo.largoFaldon }, tipo);
      const [t0, t1, , t3] = e.techo.esquinas;
      const arriba = (tipo?.ubicacion === 'eje' ? -0.13 : (tipo?.espesor ?? 50) / 2000) + 0.01;
      const punto = (x, h) => [0, 1, 2].map((i) => t0[i] + (t1[i] - t0[i]) * (x / e.techo.largo)
        + (t3[i] - t0[i]) * (h / e.techo.largoFaldon) + (i === 1 ? arriba : 0));
      verticales.forEach((x) => pares.push([punto(x, 0), punto(x, e.techo.largoFaldon)]));
      horizontales.forEach((h) => pares.push([punto(0, h), punto(e.techo.largo, h)]));
    }
    if (pares.length > 0) grupo.add(lineas(pares, materiales.juntas));
  }

  if (capas.aberturas) {
    const lados = geometriaLados(params);
    aberturas.forEach((op, i) => {
      if (!grupoVisible(op.lado)) return;
      const { x, y, z, rotacionY } = posicionAbertura(op, params);
      const elegida = op.id === aberturaSeleccionada;
      const malla = new THREE.Mesh(new THREE.BoxGeometry(op.ancho, op.alto, elegida ? 0.2 : 0.14),
        elegida ? materiales.seleccion : materiales.aberturas);
      malla.position.set(x, y, z);
      malla.rotation.y = rotacionY;
      malla.userData.idAbertura = op.id; // se puede seleccionar con un clic (v1.16)
      grupo.add(malla);
      // Número de la abertura (el mismo de la lista: #1, #2…) y su etiqueta, un poco afuera de la pared.
      if (capas.etiquetasAberturas && op.mostrarEtiqueta !== false) {
        const geo = lados[op.lado];
        const texto = op.etiqueta?.trim() ? `#${i + 1} ${op.etiqueta.trim()}` : `#${i + 1}`;
        const cartelito = cartelChico(texto, elegida ? 'rgba(202,138,4,0.95)' : 'rgba(2,132,199,0.9)');
        cartelito.position.set(x - geo.direccion[1] * 0.35, y + op.alto / 2 + 0.2, z + geo.direccion[0] * 0.35);
        grupo.add(cartelito);
      }
    });
  }

  // Medidas fijadas (v1.28): quedan dibujadas aunque se termine de medir; salen en el PDF.
  if (capas.medidasFijas !== false) {
    medidasFijas.forEach((m) => {
      grupo.add(lineas([[m.a, m.b]], COLOR_MEDIDA_FIJA, true));
      const texto = cartelChico(`${m.nombre} · ${m.resultado.principal.toFixed(2)} m`, 'rgba(234,88,12,0.95)');
      texto.position.set(...m.a.map((v, i) => (v + m.b[i]) / 2 + (i === 1 ? 0.25 : 0)));
      grupo.add(texto);
    });
  }

  // Medición (v1.16): puntos elegidos y la línea con su medida.
  if (medida?.a) {
    const marca = (q) => {
      const bolita = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), materiales.seleccion);
      bolita.position.set(...q);
      bolita.renderOrder = 998;
      grupo.add(bolita);
    };
    marca(medida.a);
    if (medida.b) {
      marca(medida.b);
      grupo.add(lineas([[medida.a, medida.b]], COLOR_MEDIDA, true));
      const texto = cartelChico(`${medida.resultado.principal.toFixed(2)} m`, 'rgba(202,138,4,0.95)');
      texto.position.set(...medida.a.map((v, i) => (v + medida.b[i]) / 2 + (i === 1 ? 0.25 : 0)));
      grupo.add(texto);
    }
  }

  // Carteles con el nombre de cada lado, un poco afuera de la pared.
  // Cada pared puede tener su propio texto (etiqueta) u ocultar el cartel.
  const lados = geometriaLados(params);
  LADOS.forEach((lado) => {
    const pared = params.paredes[lado];
    if (!pared.mostrarEtiqueta) return;
    const geo = lados[lado];
    const afuera = [-geo.direccion[1], geo.direccion[0]];
    const texto = pared.etiqueta.trim() || `${nombreLado(lado, params.ladoFrente)} (${lado})`;
    const sprite = cartel(texto, lado === params.ladoFrente);
    sprite.position.set(
      (geo.p1[0] + geo.p2[0]) / 2 + afuera[0] * 1.3,
      0.35,
      (geo.p1[1] + geo.p2[1]) / 2 + afuera[1] * 1.3
    );
    grupo.add(sprite);
  });
}

/**
 * Tanque: envolvente abierta + tapas planas (discos). En vertical la tapa
 * "una" es la de abajo (tanque abierto arriba); en horizontal, la de un extremo.
 */
function cilindroDeChapa({ centro, eje, radio, largo, tapas }, material) {
  const tanque = new THREE.Group();
  tanque.add(new THREE.Mesh(new THREE.CylinderGeometry(radio, radio, largo, 40, 1, true), material));
  const extremos = { ninguna: [], una: [-1], dos: [-1, 1] }[tapas];
  extremos.forEach((lado) => {
    const tapa = new THREE.Mesh(new THREE.CircleGeometry(radio, 40), material);
    tapa.rotation.x = Math.PI / 2;
    tapa.position.y = (lado * largo) / 2;
    tanque.add(tapa);
  });
  // CylinderGeometry es vertical (eje y): se acuesta si el tanque es horizontal.
  if (eje === 'x') tanque.rotation.z = Math.PI / 2;
  if (eje === 'z') tanque.rotation.x = Math.PI / 2;
  tanque.position.set(...centro);
  return tanque;
}

/**
 * Cotas generales (v1.28): largo, ancho y altos (ver motor/cotas3d.js). Van en su propio
 * grupo para poder prenderlas solo para la foto del PDF sin redibujar todo el modelo.
 */
function dibujarCotas(grupo, params, estructura) {
  vaciarGrupo(grupo);
  if (!estructura?.paredes?.length) return; // grada y montaje: no tienen paredes
  cotasGenerales(params).forEach((c) => {
    grupo.add(lineas([[c.desde, c.hasta], ...c.ticks], COLOR_COTAS, true));
    const texto = cartelChico(c.texto, 'rgba(51,65,85,0.92)');
    texto.position.set(...c.desde.map((v, i) => (v + c.hasta[i]) / 2 + (i === 1 && c.desde[1] === c.hasta[1] ? 0.22 : 0)));
    grupo.add(texto);
  });
}

/**
 * Cámara ortográfica (sin perspectiva) que encuadra la caja mirando desde `vista.desde`,
 * con `vista.arriba` hacia arriba en la foto (v1.28, vistas fijas del PDF).
 */
function camaraOrtografica(caja, vista, aspecto) {
  const centro = caja.getCenter(new THREE.Vector3());
  const radio = caja.getSize(new THREE.Vector3()).length() || 10;
  const camara = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, radio * 4);
  camara.up.set(...vista.arriba);
  camara.position.copy(centro).addScaledVector(new THREE.Vector3(...vista.desde), radio * 2);
  camara.lookAt(centro);
  camara.updateMatrixWorld();
  // Se pasan las 8 esquinas de la caja a coordenadas de la cámara para ver cuánto ocupan.
  const vista2D = new THREE.Box3();
  [0, 1].forEach((i) => [0, 1].forEach((j) => [0, 1].forEach((k) => {
    const punto = new THREE.Vector3(i ? caja.max.x : caja.min.x, j ? caja.max.y : caja.min.y, k ? caja.max.z : caja.min.z);
    vista2D.expandByPoint(punto.applyMatrix4(camara.matrixWorldInverse));
  })));
  const margen = 1.08;
  let medioAncho = ((vista2D.max.x - vista2D.min.x) / 2) * margen;
  let medioAlto = ((vista2D.max.y - vista2D.min.y) / 2) * margen;
  if (medioAncho / medioAlto > aspecto) medioAlto = medioAncho / aspecto; else medioAncho = medioAlto * aspecto;
  const cx = (vista2D.max.x + vista2D.min.x) / 2;
  const cy = (vista2D.max.y + vista2D.min.y) / 2;
  Object.assign(camara, { left: cx - medioAncho, right: cx + medioAncho, top: cy + medioAlto, bottom: cy - medioAlto });
  camara.updateProjectionMatrix();
  return camara;
}

/**
 * Copia el lienzo recortando el blanco de alrededor (con un margen chico) y lo devuelve como imagen PNG.
 * Se llama justo después de dibujar (si no, WebGL ya borró el lienzo).
 */
function recortarBlanco(lienzo) {
  const copia = document.createElement('canvas');
  copia.width = lienzo.width;
  copia.height = lienzo.height;
  const ctx = copia.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(lienzo, 0, 0);
  const { data, width, height } = ctx.getImageData(0, 0, copia.width, copia.height);
  let [x0, y0, x1, y1] = [width, height, -1, -1];
  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const i = (y * width + x) * 4;
      if (data[i] < 245 || data[i + 1] < 245 || data[i + 2] < 245) { // no es blanco
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return copia.toDataURL('image/png'); // todo blanco: va entera
  const margen = Math.round(Math.max(width, height) * 0.02);
  [x0, y0] = [Math.max(0, x0 - margen), Math.max(0, y0 - margen)];
  [x1, y1] = [Math.min(width - 1, x1 + margen), Math.min(height - 1, y1 + margen)];
  const recorte = document.createElement('canvas');
  recorte.width = x1 - x0 + 1;
  recorte.height = y1 - y0 + 1;
  recorte.getContext('2d').drawImage(copia, x0, y0, recorte.width, recorte.height, 0, 0, recorte.width, recorte.height);
  return recorte.toDataURL('image/png');
}

/** Texto de una medida: "2.50 m entre ejes (horizontal 2.50 · vertical 0.00)". */
const textoMedida = (r) => `${r.principal.toFixed(2)} m${r.entreEjes ? ' entre ejes' : ''} (horizontal ${r.horizontal.toFixed(2)} · vertical ${r.vertical.toFixed(2)})`;

/** Libera la memoria de GPU del grupo (geometrías, texturas de carteles) y lo vacía. */
function vaciarGrupo(grupo) {
  grupo.traverse((obj) => {
    obj.geometry?.dispose();
    if (obj.isLineSegments && !obj.userData.materialCompartido) obj.material.dispose();
    if (obj.isSprite) {
      obj.material.map?.dispose();
      obj.material.dispose();
    }
  });
  grupo.clear();
}

/**
 * Medidas que usa la cámara: las de la construcción o, en una grada, las de
 * la grada (largo de fila x profundidad x altura), mirando desde adelante (A).
 */
function medidasVista(params, estructura) {
  const m = estructura?.grada?.medidas ?? estructura?.montaje?.medidas;
  if (!m) return params;
  return { ...params, largo: m.largo, ancho: m.profundidad, altura: m.alturaTotal, ladoFrente: 'A' };
}

/** Ubica la cámara mirando el frente en diagonal. */
function mirarAlFrente(camara, controles, params) {
  const geo = geometriaLados(params)[params.ladoFrente];
  const afuera = [-geo.direccion[1], geo.direccion[0]];
  const centro = [(geo.p1[0] + geo.p2[0]) / 2, (geo.p1[1] + geo.p2[1]) / 2];
  const distancia = Math.max(params.largo, params.ancho) * 1.6 + 4;
  camara.position.set(
    centro[0] + afuera[0] * distancia + geo.direccion[0] * distancia * 0.6,
    params.altura + 4,
    centro[1] + afuera[1] * distancia + geo.direccion[1] * distancia * 0.6
  );
  controles.target.set(0, params.altura / 2, 0);
  controles.update();
}

export default function LoftCanvas({
  params, estructura, aberturas, paneles, colores, catalogo, unidad, onCambiarColor, onEliminarPieza, onEditarPieza,
  opacidades, onCambiarOpacidad, capturaRef, onMedidasFijas,
  onActualizarAbertura, onQuitarAbertura, onPegarAbertura, onDuplicarPieza,
  resaltado = null, cartelResaltado = null, onSoltarResaltado,
  pedidoVerTerreno = 0, // v1.32: cada vez que cambia, la cámara muestra todo el lote
}) {
  const lienzoRef = useRef(null);
  const visorRef = useRef(null); // { grupo, controles, camara, materiales, ... }
  const coloresRef = useRef(colores); // colores iniciales para el montaje
  const [autoRotar, setAutoRotar] = useState(false);
  const [seleccionada, setSeleccionada] = useState(null); // id de la pieza seleccionada
  const [editandoId, setEditandoId] = useState(null); // pieza con el formulario de edición abierto
  const [aberturaSeleccionada, setAberturaSeleccionada] = useState(null); // id de la abertura tocada (v1.16)
  // Medir (v1.16): modo activo y puntos tocados { a, piezaA, b, piezaB, resultado }.
  const [midiendo, setMidiendo] = useState(false);
  const [medida, setMedida] = useState(null);
  // v1.28: medidas que quedan fijas (📌) para verlas juntas y que salgan en el PDF. Son de esta sesión
  // (no se guardan en el proyecto: si cambian las medidas de la obra, quedarían viejas).
  const [medidasFijas, setMedidasFijas] = useState([]);
  const medidasFijasRef = useRef(medidasFijas);
  medidasFijasRef.current = medidasFijas;
  const paramsRef = useRef(params); // para las vistas fijas (la foto se saca fuera del render)
  paramsRef.current = params;
  const midiendoRef = useRef(false);
  const portapapelesRef = useRef(null); // lo copiado con Ctrl+C: { clase: 'abertura' | 'pieza', dato }
  const [avisoVisor, setAvisoVisor] = useState(null); // texto corto ("Copiado: …")
  // Partes visibles: cada pared, el techo y los pisos (con sus hierros).
  const [gruposVisibles, setGruposVisibles] = useState({ A: true, B: true, C: true, D: true, techo: true, piso: true, piso2: true, escalera: true, grada: true });
  const [capas, setCapas] = useState(() => ({
    ...Object.fromEntries(Object.keys(CAPAS).map((clave) => [clave, true])),
    juntas: true, // líneas de las tiras/placas de los paneles (v1.16)
    etiquetasAberturas: true, // número de cada abertura (v1.16)
    cotas: false, // v1.28: largo, ancho y altos (en el PDF se pueden pedir aunque estén apagadas)
    medidasFijas: true, // v1.28: las medidas fijadas con 📌
    terreno: true, // v1.32: el lote, la calle, el pozo, árboles… (si la obra tiene terreno)
  }));

  // 1) MONTAJE: una sola vez.
  useEffect(() => {
    const contenedor = lienzoRef.current;
    const ancho = contenedor.clientWidth || 800;
    const alto = contenedor.clientHeight || 500;

    const escena = new THREE.Scene();
    escena.background = new THREE.Color(0x0f172a);

    const camara = new THREE.PerspectiveCamera(45, ancho / alto, 0.1, 1000);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(ancho, alto);
    contenedor.appendChild(renderer.domElement);

    const controles = new OrbitControls(camara, renderer.domElement);
    controles.enableDamping = true; // movimiento suave
    controles.dampingFactor = 0.05;
    controles.autoRotateSpeed = 2;

    escena.add(new THREE.AmbientLight(0xffffff, 0.85));
    const luz = new THREE.DirectionalLight(0xffffff, 1);
    luz.position.set(10, 20, 10);
    escena.add(luz);
    const grilla = new THREE.GridHelper(30, 30, 0x475569, 0x1e293b);
    escena.add(grilla);

    const grupo = new THREE.Group();
    escena.add(grupo);
    const grupoCotas = new THREE.Group(); // v1.28: cotas generales, aparte (ver dibujarCotas)
    escena.add(grupoCotas);
    const grupoTerreno = new THREE.Group(); // v1.32: terreno, aparte (no entra en el encuadre de las vistas fijas)
    escena.add(grupoTerreno);
    const materiales = crearMateriales(coloresRef.current);

    let idCuadro;
    const animar = () => {
      idCuadro = requestAnimationFrame(animar);
      controles.update();
      renderer.render(escena, camara);
    };
    animar();

    const observador = new ResizeObserver(() => {
      const w = contenedor.clientWidth;
      const h = contenedor.clientHeight;
      if (w > 0 && h > 0) {
        camara.aspect = w / h;
        camara.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
    });
    observador.observe(contenedor);

    // Clic para seleccionar: se lanza un "rayo" desde la cámara por el punto
    // clickeado y se toma el primer hierro que toca (los paneles se ignoran).
    const rayo = new THREE.Raycaster();
    let inicioClic = null;
    const alApretar = (ev) => { inicioClic = [ev.clientX, ev.clientY]; };
    const alSoltar = (ev) => {
      if (!inicioClic) return;
      const movido = Math.hypot(ev.clientX - inicioClic[0], ev.clientY - inicioClic[1]);
      inicioClic = null;
      if (movido > MOVIMIENTO_MAXIMO_CLIC) return; // fue un arrastre para orbitar
      const caja = renderer.domElement.getBoundingClientRect();
      const punto = new THREE.Vector2(
        ((ev.clientX - caja.left) / caja.width) * 2 - 1,
        -((ev.clientY - caja.top) / caja.height) * 2 + 1
      );
      rayo.setFromCamera(punto, camara);
      // Recursivo: los paneles son grupos (dos caras). Solo mallas (no carteles ni líneas).
      const tocados = rayo.intersectObjects(grupo.children, true).filter((i) => i.object.isMesh);

      if (midiendoRef.current) {
        // Medir: el primer objeto tocado; si es un hierro, el punto va a su eje.
        const primero = tocados[0];
        if (!primero) return;
        const pieza = primero.object.userData.pieza ?? null;
        const q = pieza ? puntoMasCercanoEnPieza(pieza, primero.point.toArray()) : primero.point.toArray();
        setMedida((prev) => (!prev || prev.b
          ? { a: q, piezaA: pieza }
          : { ...prev, b: q, piezaB: pieza, resultado: medirEntre(prev.a, q, prev.piezaA, pieza) }));
        return;
      }

      const tocado = tocados.find((i) => i.object.userData.idPieza || i.object.userData.idAbertura);
      setSeleccionada(tocado?.object.userData.idPieza ?? null);
      setAberturaSeleccionada(tocado?.object.userData.idAbertura ?? null);
    };
    renderer.domElement.addEventListener('pointerdown', alApretar);
    renderer.domElement.addEventListener('pointerup', alSoltar);

    // v1.28: fotos para el PDF, con fondo blanco y sin grilla: la vista actual y, si se piden,
    // las vistas fijas (frente, lateral, arriba) con cámara ortográfica. Se dibuja y se lee en el
    // mismo momento (WebGL borra el lienzo después de mostrarlo).
    const capturar = ({ conCotas = false, conVistasFijas = false } = {}) => {
      const fondo = escena.background;
      const cotasVisibles = grupoCotas.visible;
      escena.background = new THREE.Color(0xffffff);
      const grillaVisible = grilla.visible; // v1.32: con terreno la grilla ya está apagada
      grilla.visible = false;
      if (conCotas) grupoCotas.visible = true;
      // Cada foto se recorta al dibujo (sin el blanco de alrededor): en el PDF la obra sale más grande.
      const foto = (cam) => { renderer.render(escena, cam); return recortarBlanco(renderer.domElement); };
      // La vista actual con la misma forma que en pantalla, pero de al menos 1200 px de ancho
      // (en el celular el visor es chico y la foto salía borrosa).
      const tamanio = renderer.getSize(new THREE.Vector2());
      if (tamanio.x > 0 && tamanio.x < 1200) renderer.setSize(1200, Math.round(1200 / camara.aspect), false);
      const fotos = { actual: foto(camara), fijas: [] };
      renderer.setSize(tamanio.x, tamanio.y, false);
      if (conVistasFijas) {
        const [ancho, alto] = [1200, 800]; // 3:2, igual para las tres
        renderer.setSize(ancho, alto, false);
        const caja = new THREE.Box3().setFromObject(grupo);
        if (grupoCotas.visible) caja.union(new THREE.Box3().setFromObject(grupoCotas));
        fotos.fijas = vistasFijas(paramsRef.current).map((v) => ({
          clave: v.clave, titulo: v.titulo, imagen: foto(camaraOrtografica(caja, v, ancho / alto)),
        }));
        renderer.setSize(tamanio.x, tamanio.y, false);
      }
      escena.background = fondo;
      grilla.visible = grillaVisible;
      grupoCotas.visible = cotasVisibles;
      return {
        ...fotos,
        medidas: medidasFijasRef.current.map((m) => ({ nombre: m.nombre, texto: textoMedida(m.resultado) })),
      };
    };
    if (capturaRef) capturaRef.current = capturar;

    const materialesPanel = new Map();
    visorRef.current = { grupo, grupoCotas, grupoTerreno, grilla, controles, camara, materiales, materialesPanel, frente: null };

    return () => {
      cancelAnimationFrame(idCuadro);
      if (capturaRef) capturaRef.current = null;
      vaciarGrupo(grupoCotas);
      vaciarTerreno(grupoTerreno);
      renderer.domElement.removeEventListener('pointerdown', alApretar);
      renderer.domElement.removeEventListener('pointerup', alSoltar);
      observador.disconnect();
      controles.dispose();
      vaciarGrupo(grupo);
      Object.values(materiales).forEach((m) => m.dispose());
      materialesPanel.forEach((m) => { m.exterior.dispose(); m.interior.dispose(); });
      grilla.geometry.dispose();
      grilla.material.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      visorRef.current = null;
    };
    // Se monta una sola vez; capturaRef es un ref (no cambia entre renders).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2) MODELO: se redibuja cuando cambian datos, capas, partes visibles o la selección.
  useEffect(() => {
    const visor = visorRef.current;
    if (!visor || !estructura) return;
    vaciarGrupo(visor.grupo);
    visor.materialesPanel.forEach((m) => { m.exterior.dispose(); m.interior.dispose(); });
    visor.materialesPanel.clear();
    paneles.forEach((p) => visor.materialesPanel.set(p.id, {
      exterior: materialPanel(p.color, opacidades.paneles, THREE.FrontSide),
      interior: materialPanel(p.colorInterior ?? p.color, opacidades.paneles, THREE.BackSide),
      tipo: p, // ubicación y espesor (v1.15): dónde se dibuja respecto de la estructura
    }));
    dibujarModelo(visor.grupo, visor.materiales, visor.materialesPanel,
      { params, estructura, aberturas, capas, gruposVisibles, seleccionada, catalogo, aberturaSeleccionada, medida, resaltado, medidasFijas });
    // Se reacomoda la cámara si cambia el frente o el tipo de proyecto (construcción / grada).
    const encuadre = `${params.tipoProyecto}:${params.ladoFrente}`;
    if (visor.frente !== encuadre) {
      mirarAlFrente(visor.camara, visor.controles, medidasVista(params, estructura));
      visor.frente = encuadre;
    }
  }, [params, estructura, aberturas, capas, paneles, gruposVisibles, seleccionada, opacidades.paneles, catalogo, aberturaSeleccionada, medida, resaltado, medidasFijas]);

  // 2b) COTAS GENERALES (v1.28): aparte del modelo; se ven si la capa está prendida.
  useEffect(() => {
    const visor = visorRef.current;
    if (!visor) return;
    dibujarCotas(visor.grupoCotas, params, estructura);
    visor.grupoCotas.visible = Boolean(capas.cotas);
  }, [params, estructura, capas.cotas]);

  // 2c) TERRENO (v1.32): el lote y lo que hay en él. Con terreno, la grilla se apaga (el lote hace de piso).
  const conTerreno = moduloActivo('terreno') && params.tipoProyecto === 'construccion' && params.terreno?.activo && capas.terreno;
  useEffect(() => {
    const visor = visorRef.current;
    if (!visor) return;
    vaciarTerreno(visor.grupoTerreno);
    if (conTerreno) dibujarTerreno(visor.grupoTerreno, implantacion(params), params.terreno.retiros);
    visor.grilla.visible = !conTerreno;
  // Solo lo que cambia el terreno (no todo params: redibujar el lote en cada cambio de la estructura no hace falta).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conTerreno, params.terreno, params.ladoFrente, params.largo, params.ancho]);

  /** Cámara para ver todo el lote: desde la calle, en diagonal y alto. */
  const verTerreno = () => {
    const visor = visorRef.current;
    if (!visor || !params.terreno?.activo) return;
    const { centro, haciaCalle, tamanio } = encuadreTerreno(implantacion(params));
    const d = (tamanio * 0.9 + 6) / Math.sqrt(Math.min(1, visor.camara.aspect)); // pantalla angosta (celular): más lejos
    visor.camara.position.set(centro[0] + haciaCalle[0] * d - haciaCalle[1] * d * 0.35, d * 0.75, centro[1] + haciaCalle[1] * d + haciaCalle[0] * d * 0.35);
    visor.controles.target.set(centro[0], 0, centro[1]);
    visor.controles.update();
  };
  const verTerrenoRef = useRef(verTerreno);
  verTerrenoRef.current = verTerreno;
  useEffect(() => { if (pedidoVerTerreno > 0) verTerrenoRef.current(); }, [pedidoVerTerreno]);

  // v1.28: App las necesita en texto (para el PDF y el Excel).
  useEffect(() => {
    onMedidasFijas?.(medidasFijas.map((m) => ({ nombre: m.nombre, texto: textoMedida(m.resultado) })));
  }, [medidasFijas, onMedidasFijas]);

  /** 📌 Deja fija la medida recién tomada (M1, M2…) y queda listo para medir otra. */
  const fijarMedida = () => {
    if (!medida?.resultado) return;
    setMedidasFijas((prev) => {
      const numero = Math.max(0, ...prev.map((m) => m.numero)) + 1;
      return [...prev, { ...medida, numero, nombre: `M${numero}` }].slice(-MAXIMO_MEDIDAS_FIJAS);
    });
    setMedida(null);
  };
  const quitarMedidaFija = (numero) => setMedidasFijas((prev) => prev.filter((m) => m.numero !== numero));

  // 5) MEDIR: el manejador del clic (creado una sola vez) lee el modo por un ref.
  useEffect(() => {
    midiendoRef.current = midiendo;
    if (!midiendo) setMedida(null);
  }, [midiendo]);

  // 6) TECLADO (v1.16): Ctrl+C / Ctrl+V copia y pega la abertura o la pieza seleccionada; Esc suelta todo.
  useEffect(() => {
    const alTeclear = (ev) => {
      const enCampo = ev.target.closest?.('input, textarea, select, [contenteditable="true"]');
      if (enCampo || hayDialogoAbierto()) return; // no pisar el copiar/pegar de los campos ni actuar debajo de un diálogo
      if (ev.key === 'Escape') {
        setMidiendo(false);
        setSeleccionada(null);
        setAberturaSeleccionada(null);
        setEditandoId(null);
        return;
      }
      if (!(ev.ctrlKey || ev.metaKey)) return;
      const tecla = ev.key.toLowerCase();
      if (tecla === 'c') {
        const abertura = aberturas.find((op) => op.id === aberturaSeleccionada);
        const pieza = seleccionada ? listarPiezas(estructura).find((p) => p.id === seleccionada) : null;
        if (abertura) portapapelesRef.current = { clase: 'abertura', dato: abertura };
        else if (pieza) portapapelesRef.current = { clase: 'pieza', dato: pieza };
        else return;
        setAvisoVisor(`Copiado: ${abertura ? `abertura #${aberturas.indexOf(abertura) + 1}` : describirPieza(pieza, params.ladoFrente)}. Ctrl+V para pegar.`);
      } else if (tecla === 'v' && portapapelesRef.current) {
        const { clase, dato } = portapapelesRef.current;
        if (clase === 'abertura') {
          const nueva = onPegarAbertura(dato);
          if (nueva) { setAberturaSeleccionada(nueva.id); setSeleccionada(null); }
        } else {
          const id = onDuplicarPieza(dato);
          if (id) { setSeleccionada(id); setEditandoId(id); setAberturaSeleccionada(null); }
        }
        setAvisoVisor('Pegado al lado del original: movelo a donde va.');
      } else {
        return;
      }
      ev.preventDefault();
    };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [aberturas, aberturaSeleccionada, seleccionada, estructura, params.ladoFrente, onPegarAbertura, onDuplicarPieza]);

  // El aviso corto se va solo a los 4 segundos.
  useEffect(() => {
    if (!avisoVisor) return undefined;
    const t = setTimeout(() => setAvisoVisor(null), 4000);
    return () => clearTimeout(t);
  }, [avisoVisor]);

  // 3b) OPACIDAD de OSB, hierros y paneles genéricos: se cambia el material (no se redibuja).
  useEffect(() => {
    const visor = visorRef.current;
    if (!visor) return;
    aplicarOpacidad(visor.materiales.osb, opacidades.osb);
    aplicarOpacidad(visor.materiales.paneles, opacidades.paneles);
    CAPAS_HIERRO.forEach((capa) => aplicarOpacidad(visor.materiales[capa], opacidades.hierros));
    aplicarOpacidad(visor.materiales.juntas, opacidades.juntas ?? 1);
  }, [opacidades]);

  // 3) COLORES: solo se cambia el color de cada material (no se redibuja).
  useEffect(() => {
    const visor = visorRef.current;
    if (!visor) return;
    Object.entries(colores).forEach(([clave, color]) => visor.materiales[clave]?.color.set(color));
  }, [colores]);

  // 4) ROTACIÓN automática.
  useEffect(() => {
    if (visorRef.current) visorRef.current.controles.autoRotate = autoRotar;
  }, [autoRotar]);

  // Leyenda de capas plegable: en pantallas chicas arranca plegada para no tapar el modelo.
  const [capasAbiertas, setCapasAbiertas] = useState(() => !window.matchMedia?.('(max-width: 1000px)').matches);

  const alternarCapa = (clave) => setCapas((prev) => ({ ...prev, [clave]: !prev[clave] }));
  /** "todo / nada" de un grupo de la leyenda. */
  const ponerCapas = (claves, valor) => setCapas((prev) => ({ ...prev, ...Object.fromEntries(claves.map((c) => [c, valor])) }));
  // Un grupo que nunca se tocó está visible (undefined): el primer clic lo oculta.
  const alternarGrupo = (clave) => setGruposVisibles((prev) => ({ ...prev, [clave]: prev[clave] === false }));

  // Partes que se pueden ocultar (con sus hierros): paredes desde el frente, techo y pisos.
  const ordenDesdeFrente = [0, 1, 2, 3].map((i) => LADOS[(LADOS.indexOf(params.ladoFrente) + i) % 4]);
  const esGrada = Boolean(estructura?.grada);
  const esMontaje = Boolean(estructura?.montaje);
  const tipoProyecto = esGrada ? 'grada' : esMontaje ? 'montaje' : 'construccion';

  /** Una casilla de la leyenda: capa con color (hierros, OSB…), paneles (color por tipo) o ayuda (sin color). */
  const casillaCapa = (clave) => {
    const capa = CAPAS[clave];
    const nombre = capa?.nombre ?? AYUDAS[clave].nombre;
    const conColor = capa && !capa.colorPorTipo;
    const titulo = capa?.colorPorTipo ? 'Superficies; el color es el de cada tipo de panel' : AYUDAS[clave]?.titulo;
    return (
      <span key={clave} className={`capa${capas[clave] ? '' : ' apagada'}`}>
        <input type="checkbox" checked={capas[clave]} onChange={() => alternarCapa(clave)} aria-label={`Mostrar ${nombre}`} />
        {conColor && (
          <input type="color" className="muestra" value={colores[clave]}
            onChange={(e) => onCambiarColor(clave, e.target.value)} aria-label={`Color de ${nombre}`}
            title={`Cambiar color de ${nombre}`} />
        )}
        <span onClick={() => alternarCapa(clave)} title={titulo}>{nombre}</span>
      </span>
    );
  };
  const partes = esGrada ? [{ clave: 'grada', nombre: 'Grada' }]
    : esMontaje ? params.montaje.componentes.map((c) => ({ clave: `comp:${c.id}`, nombre: c.nombre || 'Componente' }))
    : [
    ...ordenDesdeFrente.map((lado) => ({ clave: lado, nombre: nombreLado(lado, params.ladoFrente) })),
    { clave: 'techo', nombre: 'Techo' },
    { clave: 'piso', nombre: 'Piso' },
    { clave: 'piso2', nombre: 'Piso 2' },
    ...(estructura?.escalera ? [{ clave: 'escalera', nombre: 'Escalera' }] : []),
  ];
  /** "todo / nada" de las partes (paredes, techo, pisos…). */
  const ponerPartes = (valor) => setGruposVisibles((prev) => ({ ...prev, ...Object.fromEntries(partes.map((p) => [p.clave, valor])) }));

  // La pieza seleccionada puede desaparecer (se eliminó o cambió una medida).
  const piezaSeleccionada = seleccionada ? listarPiezas(estructura).find((p) => p.id === seleccionada) : null;
  const aberturaElegida = aberturaSeleccionada ? aberturas.find((op) => op.id === aberturaSeleccionada) : null;

  return (
    <div className="canvas-box">
      <div className="lienzo" ref={lienzoRef} />
      <div className="canvas-controls no-print">
        <button className="btn-ctrl" onClick={() => setAutoRotar((v) => !v)}>
          {autoRotar ? '⏸ Pausar giro' : '▶ Girar'}
        </button>
        <button className="btn-ctrl" onClick={() => visorRef.current && mirarAlFrente(visorRef.current.camara, visorRef.current.controles, medidasVista(params, estructura))}>
          Ver frente
        </button>
        {conTerreno && <button className="btn-ctrl" onClick={verTerreno}>Ver terreno</button>}
        <button className={`btn-ctrl${midiendo ? ' activo' : ''}`} aria-pressed={midiendo}
          onClick={() => { setMidiendo((v) => !v); setSeleccionada(null); setAberturaSeleccionada(null); }}>
          📏 {midiendo ? 'Terminar de medir' : 'Medir'}
        </button>
        <span className="ctrl-tip">
          {avisoVisor ?? (midiendo
            ? 'Tocá dos hierros o dos puntos. Entre dos columnas mide de eje a eje. Esc para salir.'
            : 'Arrastrá para orbitar · rueda para zoom · clic en un hierro o una abertura para seleccionarlo · Ctrl+C / Ctrl+V copia y pega')}
        </span>
        {/* v1.27: qué se está resaltando (al pasar el mouse o fijado con 👁). */}
        {cartelResaltado && (
          <div className="cartel-resaltado no-print" role="status">
            <span className="muestra-resaltado" aria-hidden="true" />
            <span>{cartelResaltado}</span>
            {onSoltarResaltado && <button type="button" className="btn-ctrl" onClick={onSoltarResaltado} aria-label="Dejar de resaltar">✕</button>}
          </div>
        )}
        {/* v1.28: medidas fijadas (📏 Medir → 📌 Fijar), cada una se puede quitar. */}
        {medidasFijas.length > 0 && (
          <div className="medidas-fijas no-print" role="group" aria-label="Medidas fijadas">
            <span className="titulo-medidas">📌 Medidas:</span>
            {medidasFijas.map((m) => (
              <span key={m.numero} className="chip-medida">
                {m.nombre} {m.resultado.principal.toFixed(2)} m
                <button type="button" onClick={() => quitarMedidaFija(m.numero)} aria-label={`Quitar la medida ${m.nombre}`}>✕</button>
              </span>
            ))}
            <button type="button" className="btn-ctrl" onClick={() => setMedidasFijas([])}>Borrar todas</button>
          </div>
        )}
      </div>

      {midiendo && medida?.resultado && (
        <div className="medida-resultado no-print" role="status">
          <strong>{medida.resultado.principal.toFixed(2)} m</strong>
          {medida.resultado.entreEjes ? ' entre ejes' : ''}
          {' · '}horizontal {medida.resultado.horizontal.toFixed(2)} m · vertical {medida.resultado.vertical.toFixed(2)} m
          {!medida.resultado.entreEjes && ` · en línea recta ${medida.resultado.total.toFixed(2)} m`}
          <button type="button" className="btn-ctrl btn-fijar" onClick={fijarMedida} title="Dejarla dibujada (sale en el PDF) y medir otra">📌 Fijar</button>
        </div>
      )}

      {aberturaElegida && (
        <div className="seleccion no-print" role="dialog" aria-label="Abertura seleccionada">
          {/* v1.27: cerrar arriba a la derecha (como cualquier ventana); las acciones, en el pie. */}
          <div className="seleccion-cabecera">
            <strong>Abertura seleccionada</strong>
            <button type="button" className="btn-cerrar" onClick={() => setAberturaSeleccionada(null)} aria-label="Cerrar" title="Cerrar (Esc)">✕</button>
          </div>
          <ul className="opening-list">
            <FilaAbertura abertura={aberturaElegida} numero={aberturas.indexOf(aberturaElegida) + 1} params={params}
              unidad={unidad} onActualizar={onActualizarAbertura} conAcciones={false} />
          </ul>
          <div className="seleccion-acciones">
            <button className="btn-ctrl" title="Crea una igual al lado (Ctrl+C y Ctrl+V hace lo mismo)"
              onClick={() => { const nueva = onPegarAbertura(aberturaElegida); if (nueva) setAberturaSeleccionada(nueva.id); }}>Duplicar</button>
            <button className="btn-del-texto eliminar-aparte"
              onClick={() => { onQuitarAbertura(aberturaElegida.id); setAberturaSeleccionada(null); }}>Eliminar abertura</button>
          </div>
        </div>
      )}

      {piezaSeleccionada && (
        <div className="seleccion no-print" role="dialog" aria-label="Pieza seleccionada">
          <div className="seleccion-cabecera">
            <div>
              <strong>Seleccionada:</strong> {describirPieza(piezaSeleccionada, params.ladoFrente)}
              {piezaSeleccionada.editada && <span className="marca-editada"> · editada</span>}
            </div>
            <button type="button" className="btn-cerrar" onClick={() => { setSeleccionada(null); setEditandoId(null); }}
              aria-label="Cerrar" title="Cerrar (Esc)">✕</button>
          </div>
          {editandoId === piezaSeleccionada.id && (
            <EditorPieza pieza={piezaSeleccionada} edicion={params.piezasEditadas[piezaSeleccionada.id]}
              catalogo={catalogo} unidad={unidad} ladoFrente={params.ladoFrente}
              alturaPiso2={estructura.entrepiso ? estructura.entrepiso.y : null} elevacion={params.elevacion ?? 0} onEditar={onEditarPieza} />
          )}
          <div className="seleccion-acciones">
            {editandoId !== piezaSeleccionada.id && (
              <button className="btn-ctrl" onClick={() => setEditandoId(piezaSeleccionada.id)}>Editar (recortar, mover, perfil)</button>
            )}
            <button className="btn-ctrl" title="Crea una igual al lado (Ctrl+C y Ctrl+V hace lo mismo)" onClick={() => {
              const id = onDuplicarPieza(piezaSeleccionada);
              if (id) { setSeleccionada(id); setEditandoId(id); }
            }}>Duplicar</button>
            {/* Eliminar va aparte, a la derecha del pie, para no tocarlo sin querer. */}
            <button className="btn-del-texto eliminar-aparte" onClick={() => { onEliminarPieza(piezaSeleccionada.id); setSeleccionada(null); }}>
              Eliminar pieza
            </button>
          </div>
        </div>
      )}

      <div className={`capas no-print${capasAbiertas ? '' : ' plegada'}`} role="group" aria-label="Capas visibles">
        <button type="button" className="btn-ctrl btn-capas" aria-expanded={capasAbiertas}
          onClick={() => setCapasAbiertas((v) => !v)}>
          {capasAbiertas ? '▾ Capas' : '▸ Capas y colores'}
        </button>
        {capasAbiertas && (<>
        {/* v1.19: capas agrupadas (Estructura · Superficies · Ayudas), cada grupo con "todo / nada". */}
        {GRUPOS_LEYENDA.map(({ titulo, capas: clavesGrupo }) => {
          // La capa Terreno solo si el módulo está prendido y la obra tiene terreno (v1.32).
          const visibles = clavesGrupo.filter((clave) => capaDelProyecto(clave, tipoProyecto)
            && (clave !== 'terreno' || (moduloActivo('terreno') && params.terreno?.activo)));
          if (visibles.length === 0) return null;
          return (
            <span key={titulo} className="capas-paneles grupo-capas" role="group" aria-label={titulo}>
              <strong className="titulo-grupo">{titulo}</strong>
              <button type="button" className="btn-mini" onClick={() => ponerCapas(visibles, true)}
                aria-label={`Mostrar todo ${titulo}`}>todo</button>
              <button type="button" className="btn-mini" onClick={() => ponerCapas(visibles, false)}
                aria-label={`Ocultar todo ${titulo}`}>nada</button>
              {visibles.map((clave) => casillaCapa(clave))}
            </span>
          );
        })}
        {/* Opacidad: de "se ve a través" a sólido, para ver cómo queda cerrada. */}
        <span className="capas-paneles capas-opacidad">
          <strong className="titulo-grupo">Opacidad</strong>
          {/* Grada y montaje no tienen paneles ni OSB: solo la opacidad de los hierros. */}
          {OPACIDADES.filter(({ clave }) => clave === 'hierros' || (!esGrada && !esMontaje))
            .map(({ clave, nombre }) => (
              <label key={clave} className="capa control-opacidad">
                {nombre}
                <input type="range" min="0.05" max="1" step="0.05" value={opacidades[clave]}
                  aria-label={`Opacidad de ${nombre}`} onChange={(e) => onCambiarOpacidad(clave, Number(e.target.value))} />
                <span className="valor-opacidad">{Math.round(opacidades[clave] * 100)} %</span>
              </label>
            ))}
        </span>
        {/* Partes completas: ocultar una oculta su panel Y sus hierros. */}
        <span className="capas-paneles">
          <strong className="titulo-grupo">Partes</strong>
          <button type="button" className="btn-mini" onClick={() => ponerPartes(true)} aria-label="Mostrar todas las partes">todo</button>
          <button type="button" className="btn-mini" onClick={() => ponerPartes(false)} aria-label="Ocultar todas las partes">nada</button>
          {partes.map(({ clave, nombre }) => (
            <span key={clave} className="capa">
              <input type="checkbox" checked={gruposVisibles[clave] !== false} onChange={() => alternarGrupo(clave)}
                aria-label={`Mostrar ${nombre} completo`} />
              <span onClick={() => alternarGrupo(clave)}>{nombre}</span>
            </span>
          ))}
        </span>
        </>)}
      </div>
    </div>
  );
}
