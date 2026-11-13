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

import { useEffect, useMemo, useRef, useState } from 'react';
import { piezaResaltada } from './motor/resaltado.js';
import * as THREE from 'three';
import { hayDialogoAbierto } from './componentes/useDialogo.js';
import { useEstadoGuardado } from './hooks/useEstadoGuardado.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { LADOS } from './motor/constantes.js';
import { CAPAS, AYUDAS, GRUPOS_LEYENDA, CAPAS_TERRENO, CAPAS_MESADAS, CAPAS_MUEBLES, CAPAS_TABIQUES, COLORES_INICIALES, capaDelProyecto } from './capas.js';
import SelectorColor from './componentes/SelectorColor.jsx';
import { losaGruesa, dibujarMueble, dibujarMuebleEn, materialDeColor } from './interiores3d.js';
import { ubicarMueble, choquesDelMueble, avisoDeChoques } from './motor/interiores.js';
import { posicionAbertura, listarPiezas } from './motor/estructura.js';
import { geometriaLados, nombreDePared } from './motor/geometria.js';
import { describirPieza } from './descripcionPiezas.js';
import { seccionDesdePerfil } from './motor/canos.js';
import { coloresPorPerfil, perfilDePieza } from './motor/coloresPerfil.js';
import { INSUMO } from './motor/constantes.js';
import EditorPieza from './componentes/EditorPieza.jsx';
import { FilaAbertura } from './componentes/AberturasDePared.jsx';
import { juntasDePano, pedazosDePared } from './motor/revestimientos.js';
import { medirEntre, puntoMasCercanoEnPieza } from './motor/medicion.js';
import { cotasGenerales } from './motor/cotas3d.js';
import { vistasFijas, vistasPorPartes } from './motor/vistasFijas.js';
import { accionPorAltura, ladosQueTapan, lugarParaUsar, puertasTapadas, textoDePuertaTapada } from './motor/recorrido.js';
import { carasDelTabique } from './motor/tabiques.js';
import { crearPersonasEnEscena } from './personas3d.js';
import { implantacion } from './motor/terreno.js';
import { moduloActivo } from './modulos.js';
import { dibujarTerreno, vaciarTerreno, encuadreTerreno, PARTES_TERRENO } from './terreno3d.js';
import { posicionDelSol, salidaYPuesta, diaDelAnio, direccionDelSol, aberturasConSol, completarSol } from './motor/sol.js';
import PanelSol from './componentes/PanelSol.jsx';

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
  mesada: { capa: 'mesadas', seccion: 0.035 }, // v1.38
  tabique: { capa: 'tabiques', seccion: 0.04 }, // v1.41
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
  mesada: INSUMO.ESTRUCTURA_MESADA, // v1.38: con el grosor del caño elegido
  tabique: INSUMO.ESTRUCTURA_TABIQUE, // v1.41
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
  // v1.42.1: tirantes de madera y machimbre (colores fijos de madera; el machimbre deja ver la estructura).
  materiales.madera = new THREE.MeshStandardMaterial({ color: '#b7791f', roughness: 0.85 });
  materiales.machimbre = new THREE.MeshStandardMaterial({ color: '#d6a35c', roughness: 0.8 });
  transparente(materiales.machimbre, 0.6);
  // v1.55: un material por color de perfil ("Color por perfil"); se crean cuando hacen falta.
  materiales.porPerfil = new Map();
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
  { clave: 'terreno', nombre: 'Terreno' }, // v1.34.3: el lote, la calle y lo que hay en el terreno
];

/** Capas de hierro (todas menos superficies y madera): comparten la opacidad "Hierros". */
const CAPAS_SUPERFICIE = ['paneles', 'osb', 'aberturas', 'chapa', 'escalones', 'zapatas', 'tapasMesada', 'muebles', 'placasTabiques']; // zapatas: hormigón, no hierro
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
  const { params, estructura: e, aberturas, capas, gruposVisibles, seleccionada, catalogo, aberturaSeleccionada, medida, resaltado, medidasFijas = [],
    perfiles = null, opacidadHierros = 1 } = opciones;
  // v1.55: con "Color por perfil", cada pieza del color de su caño (el mismo perfil, el mismo color).
  const colorDePerfil = perfiles ? new Map(perfiles.map((x) => [x.perfil, x.color])) : null;
  const materialDePerfil = (p) => {
    const color = colorDePerfil.get(perfilDePieza(p, catalogo));
    if (!color) return null;
    if (!materiales.porPerfil.has(color)) {
      const m = new THREE.MeshStandardMaterial({ color });
      aplicarOpacidad(m, opacidadHierros);
      materiales.porPerfil.set(color, m);
    }
    return materiales.porPerfil.get(color);
  };
  const { elevacion } = params;
  const grupoVisible = (g) => gruposVisibles[g] !== false; // 'interior' no tiene interruptor
  // v1.45: a lo que es de una pared (o del techo) se le anota cuál, para ocultarlo cuando tapa la vista
  // (ver ladosQueTapan). `desde` = cuántos objetos había antes de dibujar esa parte.
  const marcar = (desde, lados) => {
    for (let i = desde; i < grupo.children.length; i++) grupo.children[i].userData.ladosPared = lados;
  };
  const DE_PARED = new Set([...LADOS, 'techo']);

  // Piezas de hierro: una malla cada una, con su id para poder seleccionarla.
  listarPiezas(e).forEach((p) => {
    const estilo = ESTILO_PIEZA[p.tipo];
    const capa = capaDe(p);
    if (!estilo || !capas[capa] || !p.grupos.every(grupoVisible)) return;
    if (p.nivel === 'piso2' && !grupoVisible('piso2')) return; // v1.44: mesadas y tabiques del piso 2 van con él
    const elegida = p.id === seleccionada;
    const resaltada = !elegida && piezaResaltada(p, resaltado, catalogo); // v1.27
    // v1.42.1: los tirantes de madera, de madera (y un poco más gruesos).
    const material = elegida ? materiales.seleccion : resaltada ? materiales.resaltado : p.madera ? materiales.madera
      : (colorDePerfil && materialDePerfil(p)) || materiales[capa];
    const seccion = p.madera ? 0.1 : seccionDe(p, catalogo, estilo);
    const malla = barra(p, elegida ? seccion * 1.6 : resaltada ? seccion * 1.3 : seccion, material);
    if (resaltada) malla.renderOrder = 997; // después de los paneles transparentes
    malla.userData.idPieza = p.id;
    malla.userData.pieza = p; // para medir de eje a eje (ver medicion.js)
    if (!p.nivel && p.grupos.length > 0 && p.grupos.every((g) => DE_PARED.has(g))) malla.userData.ladosPared = p.grupos;
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

  // v1.35: con zapata, el pilotín arranca bajo tierra, arriba de la zapata.
  const baseZapata = e.zapata ? -e.zapata.profundidad + e.zapata.alto : 0;
  if (capas.pilotines) {
    e.pilotines.forEach(({ x, z }) => {
      const alto = Math.max(elevacion - baseZapata, 0.01);
      // v1.36: redondo (diámetro) o cuadrado (lado).
      const medida = e.pilotin?.medida ?? 0.3;
      const forma = e.pilotin?.forma === 'cuadrado'
        ? new THREE.BoxGeometry(medida, alto, medida)
        : new THREE.CylinderGeometry(medida / 2, medida / 2, alto, 16);
      const p = new THREE.Mesh(forma, materiales.pilotines);
      p.position.set(x, baseZapata + alto / 2, z);
      grupo.add(p);
    });
  }
  if (capas.zapatas && e.zapata) {
    const { lado, alto, profundidad } = e.zapata;
    e.pilotines.forEach(({ x, z }) => {
      const zapata = new THREE.Mesh(new THREE.BoxGeometry(lado, alto, lado), materiales.zapatas);
      zapata.position.set(x, -profundidad + alto / 2, z);
      grupo.add(zapata);
    });
  }

  if (capas.osb) {
    const { largo, ancho } = params;
    const y = elevacion + 0.07;
    // v1.42.1: con machimbre, la cubierta se ve de madera (la capa OSB la prende y apaga igual).
    const cubierta = (nivel) => (e.cubiertas?.[nivel] === 'machimbre' ? materiales.machimbre : materiales.osb);
    if (grupoVisible('piso')) {
      grupo.add(cuadrilatero([[-largo / 2, y, -ancho / 2], [largo / 2, y, -ancho / 2], [largo / 2, y, ancho / 2], [-largo / 2, y, ancho / 2]], cubierta('piso')));
    }
    if (e.entrepiso && grupoVisible('piso2')) {
      const y2 = e.entrepiso.y + 0.07;
      grupo.add(cuadrilatero(e.entrepiso.esquinas.map(([x, z]) => [x, y2, z]), cubierta('piso2')));
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
      const antes = grupo.children.length;
      // Afuera = desde el centro de la planta hacia el centro de la pared (horizontal).
      const centro = pared.esquinas.reduce((acc, p) => [acc[0] + p[0] / 4, 0, acc[2] + p[2] / 4], [0, 0, 0]);
      const afuera = corrimientoDe(pared.panel);
      dibujar(estirar(pared.esquinas, afuera), pared.panel, centro, afuera, pared.huecos, afuera);
      // Revestimiento interior: su cara "exterior" (color principal) mira hacia adentro del ambiente.
      if (pared.panelInterior) {
        const adentro = corrimientoDe(pared.panelInterior) || 0.01;
        dibujar(estirar(pared.esquinas, -adentro), pared.panelInterior, centro.map((c) => -c), adentro, pared.huecos, -adentro);
      }
      marcar(antes, [pared.lado]);
    });
    if (grupoVisible('techo')) {
      const antes = grupo.children.length;
      const tipoTecho = materialesPanel.get(e.techo.panel)?.tipo;
      // Las esquinas del techo ya están arriba de las correas; embutido baja entre las vigas.
      dibujar(e.techo.esquinas, e.techo.panel, [0, 1, 0], tipoTecho?.ubicacion === 'eje' ? -0.13 : (tipoTecho?.espesor ?? 50) / 2000);
      marcar(antes, ['techo']);
    }
  }

  // v1.38: mesadas (tapa, placas del revestimiento y estantes) y muebles.
  if (capas.tapasMesada && grupoVisible('mesada')) {
    (e.mesadas ?? []).filter((m) => m.nivel !== 'piso2' || grupoVisible('piso2')).forEach((m) => {
      const { tapas, placas, estantes, bachas, espesorTapa } = m.dibujo;
      // v1.38.2: cada mesada puede tener su color de tapa y de estantes ('' = el de la capa).
      const matTapa = m.colorTapa ? materialDeColor(m.colorTapa, { metal: 0.1, aspereza: 0.35 }) : materiales.tapasMesada;
      const matEstantes = m.colorEstantes ? materialDeColor(m.colorEstantes) : materiales.escalones;
      if (espesorTapa > 0) tapas.forEach((tapa) => grupo.add(losaGruesa(tapa, espesorTapa, matTapa)));
      estantes.forEach((esq) => grupo.add(losaGruesa(esq, 0.018, matEstantes, false)));
      // v1.40: bachas (acero oscuro sobre la tapa; la doble con su división) y su grifo.
      bachas.forEach((b) => {
        const matBacha = materialDeColor('#334155', { metal: 0.7, aspereza: 0.25 });
        if (b.doble) {
          const [a, bb, c, d] = b.esquinas;
          const medio = (p, q, t) => p.map((v, i) => v + (q[i] - v) * t);
          grupo.add(losaGruesa([a, medio(a, bb, 0.48), medio(d, c, 0.48), d], 0.006, matBacha, false));
          grupo.add(losaGruesa([medio(a, bb, 0.52), bb, c, medio(d, c, 0.52)], 0.006, matBacha, false));
        } else {
          grupo.add(losaGruesa(b.esquinas, 0.006, matBacha, false));
        }
        const grifo = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.25, 12), materialDeColor('#cbd5e1', { metal: 0.8, aspereza: 0.25 }));
        grifo.position.set(b.grifo[0], b.grifo[1] + 0.125, b.grifo[2]);
        grupo.add(grifo);
      });
      if (!m.panel) return; // sin revestimiento: se ve la estructura
      const mats = materialesPanel.get(m.panel);
      // Cada placa corrida 1 cm hacia afuera de los perfiles, con su cara de color mirando afuera.
      placas.forEach(({ esquinas, afuera }) => {
        const movidas = esquinas.map((q) => [q[0] + afuera[0] * 0.01, q[1], q[2] + afuera[2] * 0.01]);
        grupo.add(mats ? panelDosCaras(movidas, mats, afuera) : cuadrilatero(movidas, materiales.paneles));
      });
    });
  }
  // v1.41: tabiques: placas de cada cara (con el hueco de la puerta) y la puerta (de abrir o granero con su riel).
  if (capas.placasTabiques && grupoVisible('tabique')) {
    const tapadas = [...puertasTapadas(params, 'piso'), ...(params.anchoEntrepiso > 0 ? puertasTapadas(params, 'piso2') : [])];
    (e.tabiques ?? []).filter((t) => t.nivel !== 'piso2' || grupoVisible('piso2')).forEach((t) => {
      const { esquinas, normal, huecos, puerta } = t.dibujo;
      [['revestimientoA', -1], ['revestimientoB', 1]].forEach(([campo, signo]) => {
        const idPanel = t.dibujo[campo];
        if (!idPanel) return;
        const afuera = normal.map((c) => c * signo);
        const corrida = esquinas.map((q) => [q[0] + afuera[0] * 0.045, q[1], q[2] + afuera[2] * 0.045]); // afuera de los montantes
        const mats = materialesPanel.get(idPanel) ?? materiales.paneles;
        grupo.add(huecos.length ? panelConHuecos(corrida, huecos, 0, mats, afuera) : (mats.exterior ? panelDosCaras(corrida, mats, afuera) : cuadrilatero(corrida, mats)));
      });
      if (!puerta) return;
      const [a, b, , d] = puerta.esquinas;
      const ancho = Math.hypot(b[0] - a[0], b[2] - a[2]);
      const alto = d[1] - a[1];
      const giro = Math.atan2(-puerta.direccion[2], puerta.direccion[0]);
      const hoja = new THREE.Mesh(new THREE.BoxGeometry(ancho + (puerta.tipo === 'granero' ? 0.1 : -0.01), alto + (puerta.tipo === 'granero' ? 0.04 : -0.01), 0.04), materiales.placasTabiques);
      // De abrir: en el vano. Granero: del lado elegido, por fuera de la placa, colgada de su riel.
      const corre = puerta.tipo === 'granero' ? puerta.cara * 0.09 : 0;
      // v1.47.1: la hoja cuelga de un "pivote" (la bisagra, o el centro si es corrediza) para poder abrirla cuando
      // pasa una persona. De abrir: la bisagra en el arranque del vano (a) y la hoja gira hacia la cara elegida.
      const pivote = new THREE.Group();
      pivote.rotation.y = giro;
      // v1.51: el sentido elegido: +1 = bisagra en el arranque del vano (a) / corre hacia la punta; -1 = al revés.
      const sentido = puerta.sentido ?? 1;
      if (puerta.tipo === 'granero') {
        pivote.position.set((a[0] + b[0]) / 2 + normal[0] * corre, a[1], (a[2] + b[2]) / 2 + normal[2] * corre);
        hoja.position.set(0, alto / 2, 0);
      } else {
        const bisagra = sentido > 0 ? a : b;
        pivote.position.set(bisagra[0], bisagra[1], bisagra[2]);
        hoja.position.set((sentido * ancho) / 2, alto / 2, 0);
      }
      pivote.add(hoja);
      // Hacia qué lado gira: el que lleva la punta de la hoja hacia la cara elegida (normal x cara).
      const puntaAlGirar = [-Math.sin(giro) * sentido, -Math.cos(giro) * sentido]; // cómo se mueve la punta al sumar giro
      const signo = Math.sign(puntaAlGirar[0] * normal[0] * (puerta.cara || 1) + puntaAlGirar[1] * normal[2] * (puerta.cara || 1)) || 1;
      // v1.51.1: el barrido de la puerta de abrir en el piso (celeste; rojo si algo la traba), para ver hacia dónde abre.
      if (puerta.tipo !== 'granero') {
        const bisagra = sentido > 0 ? a : b;
        const v1 = [puerta.direccion[0] * sentido, puerta.direccion[2] * sentido]; // la hoja cerrada
        const v2 = [normal[0] * (puerta.cara || 1), normal[2] * (puerta.cara || 1)]; // la hoja abierta
        const puntos = [];
        for (let k = 0; k <= 12; k++) {
          const ang = (k / 12) * (Math.PI / 2);
          puntos.push([bisagra[0] + (v1[0] * Math.cos(ang) + v2[0] * Math.sin(ang)) * ancho, bisagra[2] + (v1[1] * Math.cos(ang) + v2[1] * Math.sin(ang)) * ancho]);
        }
        const posiciones = [];
        for (let k = 0; k < 12; k++) posiciones.push(bisagra[0], a[1] + 0.012, bisagra[2], puntos[k][0], a[1] + 0.012, puntos[k][1], puntos[k + 1][0], a[1] + 0.012, puntos[k + 1][1]);
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(posiciones, 3));
        const trabada = tapadas.some((x) => x.tabique === t.nombre);
        const barrido = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: trabada ? '#ef4444' : '#38bdf8', transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false }));
        barrido.userData.sinSombra = true;
        grupo.add(barrido);
      }
      pivote.userData.puertaTabique = {
        abiertaFija: Boolean(puerta.mostrarAbierta), // v1.51.1: "mostrarla abierta" (queda abierta siempre)
        id: `tabique:${t.id}`, tipo: puerta.tipo, giro, signo, ancho, base: pivote.position.clone(),
        direccion: [puerta.direccion[0] * sentido, puerta.direccion[2] * sentido], // la corrediza corre para este lado
        centro: [(a[0] + b[0]) / 2, (a[2] + b[2]) / 2], nivel: t.nivel ?? 'piso',
      };
      grupo.add(pivote);
      if (puerta.tipo === 'granero') {
        const riel = new THREE.Mesh(new THREE.BoxGeometry(ancho * 2 + 0.1, 0.03, 0.03), materialDeColor('#1f2937', { metal: 0.7, aspereza: 0.3 }));
        // El riel sigue para el lado al que corre la puerta (v1.51: según su sentido).
        const s = puerta.sentido ?? 1;
        riel.position.set((a[0] + b[0]) / 2 + s * puerta.direccion[0] * ancho / 2 + normal[0] * corre, a[1] + alto + 0.06, (a[2] + b[2]) / 2 + s * puerta.direccion[2] * ancho / 2 + normal[2] * corre);
        riel.rotation.y = giro;
        grupo.add(riel);
      }
    });
  }
  if (capas.etiquetasTabiques && (capas.tabiques || capas.placasTabiques) && grupoVisible('tabique')) {
    (e.tabiques ?? []).filter((t) => t.mostrarEtiqueta && t.nombre.trim()).forEach((t) => {
      const cartelito = cartelChico(t.nombre.trim(), 'rgba(2,132,199,0.9)');
      cartelito.position.set(t.dibujo.centroArriba[0], t.dibujo.centroArriba[1] + 0.3, t.dibujo.centroArriba[2]);
      grupo.add(cartelito);
    });
  }
  // v1.40: los electrodomésticos de los huecos de las mesadas (van con la capa Muebles).
  if (capas.muebles !== false && moduloActivo('muebles') && grupoVisible('mesada')) {
    (e.mesadas ?? []).filter((m) => m.nivel !== 'piso2' || grupoVisible('piso2'))
      .forEach((m) => m.electros.forEach((el) => grupo.add(dibujarMuebleEn(el, el.centro, el.angulo, el.y))));
  }
  if (capas.muebles && moduloActivo('muebles') && params.tipoProyecto === 'construccion') {
    (params.muebles ?? []).filter((m) => m.nivel !== 'piso2' || grupoVisible('piso2')).forEach((mueble) => grupo.add(dibujarMueble(params, mueble)));
  }
  // v1.38.1: carteles con el nombre (como paredes y aberturas): por capa "Etiquetas" y por cada uno en su ficha.
  if (capas.etiquetasMesadas && (capas.mesadas || capas.tapasMesada) && grupoVisible('mesada')) {
    (e.mesadas ?? []).filter((m) => m.mostrarEtiqueta && m.nombre.trim()).forEach((m) => {
      const t = m.dibujo.tapas[0]; // arriba de la primera tapa, en el medio
      const cartelito = cartelChico(m.nombre.trim(), 'rgba(124,58,237,0.9)');
      cartelito.position.set((t[0][0] + t[2][0]) / 2, t[0][1] + 0.3, (t[0][2] + t[2][2]) / 2);
      grupo.add(cartelito);
    });
  }
  if (capas.etiquetasMuebles && capas.muebles && moduloActivo('muebles') && params.tipoProyecto === 'construccion') {
    (params.muebles ?? []).filter((m) => m.mostrarEtiqueta !== false && m.nombre.trim()).forEach((m) => {
      const { centro, y } = ubicarMueble(params, m);
      const cartelito = cartelChico(m.nombre.trim(), 'rgba(161,98,7,0.9)');
      cartelito.position.set(centro[0], y + m.alto + 0.3, centro[1]);
      grupo.add(cartelito);
    });
  }

  // Juntas de los paneles (v1.16): dónde termina cada tira o placa, para acomodar las aberturas.
  if (capas.paneles && capas.juntas) {
    const paresDe = {}; // v1.45: las juntas de cada pared aparte (para ocultarlas con su pared)
    e.paredes.filter((pared) => grupoVisible(pared.lado)).forEach((pared) => {
      const pares = (paresDe[pared.lado] = []);
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
      const pares = (paresDe.techo = []);
      const tipo = materialesPanel.get(e.techo.panel)?.tipo;
      const { verticales, horizontales } = juntasDePano({ largo: e.techo.largo, h1: e.techo.largoFaldon, h2: e.techo.largoFaldon }, tipo);
      const [t0, t1, , t3] = e.techo.esquinas;
      const arriba = (tipo?.ubicacion === 'eje' ? -0.13 : (tipo?.espesor ?? 50) / 2000) + 0.01;
      const punto = (x, h) => [0, 1, 2].map((i) => t0[i] + (t1[i] - t0[i]) * (x / e.techo.largo)
        + (t3[i] - t0[i]) * (h / e.techo.largoFaldon) + (i === 1 ? arriba : 0));
      verticales.forEach((x) => pares.push([punto(x, 0), punto(x, e.techo.largoFaldon)]));
      horizontales.forEach((h) => pares.push([punto(0, h), punto(e.techo.largo, h)]));
    }
    Object.entries(paresDe).filter(([, pares]) => pares.length > 0).forEach(([lado, pares]) => {
      const l = lineas(pares, materiales.juntas);
      l.userData.ladosPared = [lado];
      grupo.add(l);
    });
  }

  if (capas.aberturas) {
    const lados = geometriaLados(params);
    aberturas.forEach((op, i) => {
      if (!grupoVisible(op.lado)) return;
      const antes = grupo.children.length;
      const { x, y, z, rotacionY } = posicionAbertura(op, params);
      const elegida = op.id === aberturaSeleccionada;
      const malla = new THREE.Mesh(new THREE.BoxGeometry(op.ancho, op.alto, elegida ? 0.2 : 0.14),
        elegida ? materiales.seleccion : materiales.aberturas);
      malla.position.set(x, y, z);
      malla.rotation.y = rotacionY;
      malla.userData.idAbertura = op.id; // se puede seleccionar con un clic (v1.16)
      malla.userData.direccionPared = lados[op.lado].direccion; // v1.49: para arrastrarla a lo largo de su pared
      grupo.add(malla);
      // Número de la abertura (el mismo de la lista: #1, #2…) y su etiqueta, un poco afuera de la pared.
      if (capas.etiquetasAberturas && op.mostrarEtiqueta !== false) {
        const geo = lados[op.lado];
        const texto = op.etiqueta?.trim() ? `#${i + 1} ${op.etiqueta.trim()}` : `#${i + 1}`;
        const cartelito = cartelChico(texto, elegida ? 'rgba(202,138,4,0.95)' : 'rgba(2,132,199,0.9)');
        cartelito.position.set(x - geo.direccion[1] * 0.35, y + op.alto / 2 + 0.2, z + geo.direccion[0] * 0.35);
        grupo.add(cartelito);
      }
      marcar(antes, [op.lado]);
      // v1.49: la abertura en sí queda a la vista aunque su pared se oculte con "Ver adentro" (se ve dónde está y se
      // puede tocar para moverla); solo su cartel se oculta con la pared.
      delete malla.userData.ladosPared;
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
    if (!pared.mostrarEtiqueta || !capas.etiquetasParedes) return; // v1.33.1: se pueden sacar todas
    const geo = lados[lado];
    const afuera = [-geo.direccion[1], geo.direccion[0]];
    const texto = pared.etiqueta.trim() || `${nombreDePared(lado, params)} (${lado})`;
    const sprite = cartel(texto, lado === params.ladoFrente);
    sprite.position.set(
      (geo.p1[0] + geo.p2[0]) / 2 + afuera[0] * 1.3,
      0.35,
      (geo.p1[1] + geo.p2[1]) / 2 + afuera[1] * 1.3
    );
    sprite.userData.ladosPared = [lado];
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

/** v1.49: capa de Three.js de lo que "Ver adentro" oculta (la cámara mira solo la 0; el sol, las dos). */
const CAPA_OCULTA = 1;

/**
 * v1.47.1: las puertas de los tabiques dibujadas (sus pivotes): se le pasan a las personas (para abrirlas al pasar)
 * y se guardan para moverlas en cada cuadro.
 */
function juntarPuertas(visor) {
  visor.puertasDibujadas = visor.grupo.children.filter((o) => o.userData.puertaTabique);
  visor.personas.definirPuertas(visor.puertasDibujadas.map((o) => o.userData.puertaTabique));
}

/** Abre cada puerta lo que dicen las personas: la de abrir gira sobre su bisagra; la granero corre por su riel. */
function moverPuertasDibujadas(visor) {
  (visor.puertasDibujadas ?? []).forEach((pivote) => {
    const d = pivote.userData.puertaTabique;
    const a = d.abiertaFija ? 1 : visor.personas.apertura(d.id);
    if (d.tipo === 'granero') {
      pivote.position.set(d.base.x + d.direccion[0] * d.ancho * a, d.base.y, d.base.z + d.direccion[1] * d.ancho * a);
    } else {
      pivote.rotation.y = d.giro + d.signo * a * 1.45; // hasta unos 83°
    }
  });
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
  onActualizarAbertura, onQuitarAbertura, onPegarAbertura, onDuplicarPieza, onMoverAbertura = null,
  resaltado = null, cartelResaltado = null, onSoltarResaltado, onElegir, onMoverMueble, onGirarMueble,
  pedidoVerTerreno = 0, // v1.32: cada vez que cambia, la cámara muestra todo el lote
  onCambiarParam = null, // v1.37: (ruta, valor) para el norte desde el panel del sol
}) {
  const lienzoRef = useRef(null);
  const visorRef = useRef(null); // { grupo, controles, camara, materiales, ... }
  const coloresRef = useRef(colores); // colores iniciales para el montaje
  const [autoRotar, setAutoRotar] = useState(false);
  const [seleccionada, setSeleccionada] = useState(null); // id de la pieza seleccionada
  const [editandoId, setEditandoId] = useState(null); // pieza con el formulario de edición abierto
  const [aberturaSeleccionada, setAberturaSeleccionada] = useState(null); // id de la abertura tocada (v1.16)
  // v1.49: mover la abertura elegida (como los muebles: recién con "✥ Mover").
  const [moviendoAbertura, setMoviendoAbertura] = useState(false);
  const [avisoAbertura, setAvisoAbertura] = useState(null);
  const aberturaRef = useRef({ id: null, moviendo: false });
  aberturaRef.current = { id: aberturaSeleccionada, moviendo: moviendoAbertura && aberturaSeleccionada !== null };
  const moverAberturaRef = useRef(null);
  moverAberturaRef.current = (id, du, dv) => setAvisoAbertura(onMoverAbertura?.(id, du, dv) ?? null);
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
  const [muebleElegido, setMuebleElegido] = useState(null); // v1.42.1: el mueble tocado en el 3D (abre su ficha)
  // v1.44: vista realista: paneles sólidos, sombras, reflejos suaves, colores de cámara y sin las ayudas de dibujo.
  const [realista, setRealista] = useEstadoGuardado('vistaRealista', false, (v) => typeof v === 'boolean');
  // v1.44: los manejadores del montaje leen lo último por refs (el efecto de montaje corre una sola vez).
  const muebleElegidoRef = useRef(null);
  muebleElegidoRef.current = muebleElegido;
  const moverMuebleRef = useRef(onMoverMueble);
  moverMuebleRef.current = onMoverMueble;
  // v1.45: el mueble se mueve solo después de apretar "✥ Mover" (tocarlo solo abre su ficha: antes se corría sin querer).
  const [moviendoMueble, setMoviendoMueble] = useState(false);
  const moviendoRef = useRef(false);
  moviendoRef.current = moviendoMueble && muebleElegido !== null;
  // v1.45: personas. La elegida camina hasta lo que toques; "manejar" = con el teclado; "primera" = ver con sus ojos.
  const [personaElegida, setPersonaElegida] = useState(null);
  const [modoPersona, setModoPersona] = useState(null); // null | 'manejar' | 'primera'
  const [avisoPersona, setAvisoPersona] = useState(null);
  const personaRef = useRef({ id: null, modo: null });
  personaRef.current = { id: personaElegida, modo: modoPersona };
  // v1.45: las paredes que quedan entre la cámara y la casa se ocultan (como en Los Sims), recordado en este navegador.
  const [verAdentro, setVerAdentro] = useEstadoGuardado('ocultarParedesQueTapan', true, (v) => typeof v === 'boolean');
  const verAdentroRef = useRef(verAdentro);
  verAdentroRef.current = verAdentro;
  const [gruposVisibles, setGruposVisibles] = useState({ A: true, B: true, C: true, D: true, techo: true, piso: true, piso2: true, escalera: true, grada: true });
  const [capas, setCapas] = useState(() => ({
    ...Object.fromEntries(Object.keys(CAPAS).map((clave) => [clave, true])),
    juntas: true, // líneas de las tiras/placas de los paneles (v1.16)
    bajoTierra: true, // v1.45.1: lo enterrado (pilotines y zapatas bajo el suelo)
    etiquetasAberturas: true, // número de cada abertura (v1.16)
    etiquetasParedes: true, // v1.33.1: Frente, Lateral…
    etiquetasMesadas: true, // v1.38.1
    etiquetasTabiques: true, // v1.41
    etiquetasMuebles: true,
    etiquetasTerreno: true, // v1.33.1: línea municipal, calle, N, pozo…
    cotas: false, // v1.28: largo, ancho y altos (en el PDF se pueden pedir aunque estén apagadas)
    medidasFijas: true, // v1.28: las medidas fijadas con 📌
    ...Object.fromEntries(CAPAS_TERRENO.map((c) => [c, true])), // v1.34.3: cada parte del terreno
  }));

  // v1.44: redibujar el modelo con partes ocultas (para las fotos por partes). null = como está en pantalla.
  const redibujarRef = useRef(null);
  redibujarRef.current = (ocultar) => {
    const visor = visorRef.current;
    if (!visor || !estructura) return;
    vaciarGrupo(visor.grupo);
    visor.corte.version += 1; // v1.45: hay que volver a ver qué paredes tapan
    const limpio = ocultar !== null;
    dibujarModelo(visor.grupo, visor.materiales, visor.materialesPanel, {
      params, estructura, aberturas, capas: capasVista, gruposVisibles: limpio ? { ...gruposVisibles, ...ocultar } : gruposVisibles,
      seleccionada: limpio ? null : seleccionada, catalogo, aberturaSeleccionada: limpio ? null : aberturaSeleccionada,
      medida: limpio ? null : medida, resaltado: limpio ? null : resaltado, medidasFijas: limpio ? [] : medidasFijas,
      perfiles: perfilesVista, opacidadHierros: opacidadesVista.hierros,
    });
    juntarPuertas(visor);
  };

  // v1.44: lo que se dibuja de verdad: en la vista realista, sin ayudas (juntas, cotas, etiquetas, medidas) y todo sólido.
  const capasVista = useMemo(() => (realista
    ? { ...capas, juntas: false, cotas: false, medidasFijas: false, etiquetasParedes: false, etiquetasAberturas: false,
      etiquetasTerreno: false, etiquetasMesadas: false, etiquetasTabiques: false, etiquetasMuebles: false }
    : capas), [realista, capas]);
  const opacidadesVista = useMemo(() => (realista ? { ...opacidades, paneles: 1, osb: 1, hierros: 1 } : opacidades), [realista, opacidades]);
  // v1.55: "Color por perfil": la lista de perfiles en uso con su color (también es la leyenda). null = color por función.
  const [colorPorPerfil, setColorPorPerfil] = useEstadoGuardado('colorPorPerfil', false, (v) => typeof v === 'boolean');
  const perfilesVista = useMemo(() => (colorPorPerfil && estructura ? coloresPorPerfil(listarPiezas(estructura), catalogo) : null),
    [colorPorPerfil, estructura, catalogo]);

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
    // v1.40.1: la rueda acerca hacia donde está el mouse (no siempre al centro) y el doble clic elige el punto
    // alrededor del cual se gira (antes giraba siempre alrededor del medio de la obra).
    controles.zoomToCursor = true;

    const ambiente = new THREE.AmbientLight(0xffffff, 0.85);
    escena.add(ambiente);
    // v1.44: luz de cielo (arriba celeste, abajo tierra) para la vista realista; apagada en la vista de siempre.
    const cielo = new THREE.HemisphereLight(0xdbeafe, 0x6b5b45, 0);
    escena.add(cielo);
    const luz = new THREE.DirectionalLight(0xffffff, 1);
    luz.position.set(10, 20, 10);
    escena.add(luz);
    // v1.37: el sol (con sombras), apagado hasta que se abre "☀ Sol". Y un piso invisible que solo recibe sombras.
    const sol = new THREE.DirectionalLight(0xfff4e0, 2.2);
    sol.castShadow = true;
    sol.shadow.camera.layers.enable(CAPA_OCULTA); // v1.49: las paredes ocultas por "Ver adentro" siguen dando sombra
    sol.shadow.mapSize.set(2048, 2048);
    sol.shadow.bias = -0.0005;
    sol.visible = false;
    escena.add(sol, sol.target);
    // Piso claro (sobre el fondo oscuro una sombra negra no se vería). Con terreno, recibe el lote.
    const pisoSombras = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({ color: '#94a3b8' }));
    pisoSombras.rotation.x = -Math.PI / 2;
    pisoSombras.position.y = -0.01;
    pisoSombras.receiveShadow = true;
    pisoSombras.visible = false;
    escena.add(pisoSombras);
    // Sombras prendidas desde el arranque: prenderlas después obliga a recompilar todos los materiales.
    // Mientras el sol está apagado no hay ninguna luz que tire sombra, así que no cuestan nada.
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const grilla = new THREE.GridHelper(30, 30, 0x475569, 0x1e293b);
    escena.add(grilla);

    const grupo = new THREE.Group();
    escena.add(grupo);
    const grupoCotas = new THREE.Group(); // v1.28: cotas generales, aparte (ver dibujarCotas)
    escena.add(grupoCotas);
    const grupoTerreno = new THREE.Group(); // v1.32: terreno, aparte (no entra en el encuadre de las vistas fijas)
    escena.add(grupoTerreno);
    const materiales = crearMateriales(coloresRef.current);

    // v1.45: personas, teclado y primera persona.
    const personas = crearPersonasEnEscena(escena);
    const teclas = new Set(); // teclas apretadas ahora (para caminar con el teclado)
    const primera = { yaw: 0, pitch: 0, mirando: null, guardada: null }; // hacia dónde mira y la cámara de antes
    const corte = { version: 0, aplicado: '' }; // qué paredes están ocultas ahora

    /**
     * Oculta lo de las paredes (y el techo) que quedan entre la cámara y la casa; `ninguna` = mostrar todo.
     * En primera persona (`sinCarteles`) no se oculta ninguna pared pero sí los carteles de afuera (tapaban la vista).
     */
    const aplicarCorte = (ninguna = false, sinCarteles = false) => {
      const tapan = ninguna || !verAdentroRef.current || !paramsRef.current || paramsRef.current.tipoProyecto !== 'construccion'
        ? new Set() : ladosQueTapan(paramsRef.current, camara.position.toArray());
      const clave = `${corte.version}|${[...tapan].sort().join('')}|${sinCarteles}`;
      if (clave === corte.aplicado) return;
      corte.aplicado = clave;
      // v1.49.0: lo que tapa no se apaga (visible = false): pasa a la "capa" 1, que la cámara no dibuja pero el sol sí
      // usa para las sombras. Así, con "Ver adentro", la luz sigue entrando solo por las aberturas.
      grupo.children.forEach((o) => {
        const lados = o.userData.ladosPared;
        if (!lados) return;
        const oculto = lados.every((l) => tapan.has(l)) || (sinCarteles && o.isSprite);
        o.traverse((x) => x.layers.set(oculto ? CAPA_OCULTA : 0));
      });
    };

    /** Dirección en la planta según las teclas (W/S adelante y atrás, A/D a los costados) mirando hacia `rumbo`. */
    const avanceDeTeclas = (rumbo) => {
      const adelante = (teclas.has('w') || teclas.has('arrowup') ? 1 : 0) - (teclas.has('s') || teclas.has('arrowdown') ? 1 : 0);
      const costado = (teclas.has('d') || teclas.has('arrowright') ? 1 : 0) - (teclas.has('a') || teclas.has('arrowleft') ? 1 : 0);
      if (!adelante && !costado) return null;
      const f = [Math.sin(rumbo), Math.cos(rumbo)]; // hacia donde mira
      const d = [-f[1], f[0]]; // su derecha (girando de +z hacia −x)
      const v = [f[0] * adelante + d[0] * costado, f[1] * adelante + d[1] * costado];
      const n = Math.hypot(...v);
      return [v[0] / n, v[1] / n];
    };

    const reloj = new THREE.Clock();
    let idCuadro;
    const animar = () => {
      idCuadro = requestAnimationFrame(animar);
      const dt = Math.min(reloj.getDelta(), 0.1);
      const { id, modo } = personaRef.current;
      let control = null;
      if (id !== null && modo === 'primera') {
        control = { id, avance: avanceDeTeclas(primera.yaw), rumbo: primera.yaw, correr: teclas.has('shift'), agachada: teclas.has('c') };
      } else if (id !== null && modo === 'manejar') {
        // En tercera persona, "adelante" es hacia donde mira la cámara.
        const mira = new THREE.Vector3();
        camara.getWorldDirection(mira);
        control = { id, avance: avanceDeTeclas(Math.atan2(mira.x, mira.z)), correr: teclas.has('shift'), agachada: teclas.has('c') };
      }
      const antes = id !== null ? personas.estado(id) : null;
      personas.actualizar(dt, control);
      if (visorRef.current) moverPuertasDibujadas(visorRef.current);
      const ahora = id !== null ? personas.estado(id) : null;
      if (ahora && modo === 'primera') {
        // La cámara en sus ojos, mirando hacia donde se arrastró el mouse.
        camara.position.set(ahora.x, ahora.y + ahora.ojos, ahora.z);
        const cp = Math.cos(primera.pitch);
        camara.lookAt(ahora.x + Math.sin(primera.yaw) * cp, ahora.y + ahora.ojos + Math.sin(primera.pitch), ahora.z + Math.cos(primera.yaw) * cp);
      } else {
        if (ahora && antes && modo === 'manejar') {
          // La cámara la acompaña (se corre lo mismo que ella).
          const d = new THREE.Vector3(ahora.x - antes.x, 0, ahora.z - antes.z);
          camara.position.add(d);
          controles.target.add(d);
        }
        controles.update();
      }
      aplicarCorte(modo === 'primera', modo === 'primera');
      renderer.render(escena, camara);
    };
    animar();

    const alTeclaAbajo = (ev) => {
      if (hayDialogoAbierto() || ev.target.closest?.('input, select, textarea')) return;
      const k = ev.key.toLowerCase();
      const { id, modo } = personaRef.current;
      if (id !== null && modo && ['w', 'a', 's', 'd', 'c', 'shift', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
        ev.preventDefault();
        teclas.add(k);
      }
    };
    const alTeclaArriba = (ev) => teclas.delete(ev.key.toLowerCase());
    const alPerderFoco = () => teclas.clear();
    window.addEventListener('keydown', alTeclaAbajo);
    window.addEventListener('keyup', alTeclaArriba);
    window.addEventListener('blur', alPerderFoco);

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
    // v1.44: arrastrar el mueble elegido sobre su piso. Mientras se arrastra se mueve solo el dibujo; al soltar se
    // guarda (App convierte lo movido en distancias a las paredes).
    let arrastre = null;
    const puntoEnPantalla = (ev) => {
      const caja = renderer.domElement.getBoundingClientRect();
      return new THREE.Vector2(((ev.clientX - caja.left) / caja.width) * 2 - 1, -((ev.clientY - caja.top) / caja.height) * 2 + 1);
    };
    const grupoDeMueble = (obj) => { for (let o = obj; o; o = o.parent) if (o.userData?.idMueble !== undefined) return o; return null; };
    const alApretar = (ev) => {
      inicioClic = [ev.clientX, ev.clientY];
      if (personaRef.current.modo === 'primera') { // en primera persona, arrastrar = mirar alrededor
        primera.mirando = [ev.clientX, ev.clientY];
        renderer.domElement.setPointerCapture?.(ev.pointerId);
        return;
      }
      // v1.49: arrastrar la abertura elegida a lo largo de su pared (y hacia arriba o abajo, las ventanas).
      if (aberturaRef.current.moviendo && ev.button === 0) {
        rayo.setFromCamera(puntoEnPantalla(ev), camara);
        const toque = rayo.intersectObjects(grupo.children, true).find((i) => i.object.userData.idAbertura === aberturaRef.current.id);
        if (!toque) return;
        const malla = toque.object;
        const [dx, dz] = malla.userData.direccionPared;
        const normal = new THREE.Vector3(-dz, 0, dx); // perpendicular a la pared
        const plano = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, toque.point);
        const inicio = toque.point.clone();
        arrastre = { tipo: 'abertura', malla, plano, inicio, desde: malla.position.clone(), direccion: [dx, dz], du: 0, dv: 0 };
        controles.enabled = false;
        renderer.domElement.setPointerCapture?.(ev.pointerId);
        return;
      }
      const elegido = muebleElegidoRef.current;
      if (elegido === null || ev.button !== 0 || !moviendoRef.current) return;
      rayo.setFromCamera(puntoEnPantalla(ev), camara);
      const toque = rayo.intersectObjects(grupo.children, true).find((i) => i.object.isMesh && grupoDeMueble(i.object)?.userData.idMueble === elegido);
      if (!toque) return;
      const grupoMueble = grupoDeMueble(toque.object);
      const plano = new THREE.Plane(new THREE.Vector3(0, 1, 0), -grupoMueble.position.y);
      const inicio = new THREE.Vector3();
      if (!rayo.ray.intersectPlane(plano, inicio)) return;
      arrastre = { grupoMueble, plano, inicio, desde: grupoMueble.position.clone(), dx: 0, dz: 0 };
      controles.enabled = false; // mientras se arrastra el mueble, la cámara no gira
      renderer.domElement.setPointerCapture?.(ev.pointerId);
    };
    const alMover = (ev) => {
      if (primera.mirando) {
        primera.yaw -= (ev.clientX - primera.mirando[0]) * 0.005;
        primera.pitch = Math.max(-1.3, Math.min(1.3, primera.pitch - (ev.clientY - primera.mirando[1]) * 0.005));
        primera.mirando = [ev.clientX, ev.clientY];
        return;
      }
      if (!arrastre) return;
      rayo.setFromCamera(puntoEnPantalla(ev), camara);
      const ahora = new THREE.Vector3();
      if (!rayo.ray.intersectPlane(arrastre.plano, ahora)) return;
      if (arrastre.tipo === 'abertura') {
        const d = ahora.clone().sub(arrastre.inicio);
        const [dx, dz] = arrastre.direccion;
        arrastre.du = Math.round((d.x * dx + d.z * dz) * 100) / 100; // de a 1 cm, a lo largo de la pared
        arrastre.dv = Math.round(d.y * 100) / 100;
        arrastre.malla.position.set(arrastre.desde.x + dx * arrastre.du, arrastre.desde.y + arrastre.dv, arrastre.desde.z + dz * arrastre.du);
        return;
      }
      arrastre.dx = Math.round((ahora.x - arrastre.inicio.x) * 100) / 100; // de a 1 cm
      arrastre.dz = Math.round((ahora.z - arrastre.inicio.z) * 100) / 100;
      arrastre.grupoMueble.position.set(arrastre.desde.x + arrastre.dx, arrastre.desde.y, arrastre.desde.z + arrastre.dz);
    };
    const alSoltar = (ev) => {
      if (primera.mirando) { primera.mirando = null; inicioClic = null; return; }
      if (arrastre?.tipo === 'abertura') {
        const { du, dv } = arrastre;
        arrastre = null;
        controles.enabled = true;
        inicioClic = null;
        if (Math.abs(du) + Math.abs(dv) > 0) moverAberturaRef.current?.(aberturaRef.current.id, du, dv);
        setMoviendoAbertura(false);
        return;
      }
      if (arrastre) {
        const { dx, dz } = arrastre;
        arrastre = null;
        controles.enabled = true;
        inicioClic = null;
        if (Math.abs(dx) + Math.abs(dz) > 0) moverMuebleRef.current?.(muebleElegidoRef.current, dx, dz);
        setMoviendoMueble(false); // v1.45: al soltarlo queda quieto otra vez
        return;
      }
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

      // v1.45: tocar una persona la elige; con una elegida, tocar el piso o algo la manda ahí.
      const tocadaPersona = rayo.intersectObject(personas.grupo, true).find((i) => i.object.isMesh && i.object.visible);
      const idPersona = tocadaPersona ? personas.idDe(tocadaPersona.object) : null;
      if (idPersona !== null) {
        setPersonaElegida(idPersona);
        setMuebleElegido(null);
        setSeleccionada(null);
        setAberturaSeleccionada(null);
        return;
      }
      const { id: personaActual } = personaRef.current;
      if (personaActual !== null) {
        const est = personas.estado(personaActual);
        const visibles = tocados.filter((i) => i.object.visible && i.object.parent?.visible !== false);
        let punto = visibles[0]?.point ?? null;
        if (!punto) {
          punto = new THREE.Vector3();
          if (!rayo.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -est.y), punto)) return;
        }
        // v1.49: si se tocó una cama, un sillón, una silla, el inodoro o la ducha, va y lo usa (se sienta, se acuesta…).
        let idMueble = null;
        for (let o = visibles[0]?.object; o; o = o.parent) if (o.userData?.idMueble !== undefined) { idMueble = o.userData.idMueble; break; }
        const mueble = idMueble !== null ? (paramsRef.current.muebles ?? []).find((m) => m.id === idMueble) : null;
        const uso = mueble && (mueble.nivel ?? 'piso') === est.nivel ? lugarParaUsar(paramsRef.current, mueble) : null;
        // v1.50: si no llega, va lo más cerca que puede y dice por qué (por ejemplo, una puerta tapada por la mesada).
        // v1.51.1: en palabras claras: a qué no llega, cuánto le faltó y qué traba cada puerta (de qué lado y cuánto lugar deja).
        const explicar = (r, destino) => {
          if (r === true) return null;
          const tabiques = paramsRef.current.tabiques ?? [];
          const tapadas = puertasTapadas(paramsRef.current, est.nivel).map((x) => {
            const t = tabiques.find((tb) => tb.nombre === x.tabique);
            return `No pasa por la puerta de ${x.tabique}. ${textoDePuertaTapada(x, t ? carasDelTabique(t) : undefined)}`;
          });
          const falta = r ? ` Se quedó a ${r.falta.toFixed(2).replace('.', ',')} m.` : '';
          return `No puede llegar ${destino}.${falta}${tapadas.length ? ` ${tapadas.join(' ')}` : ' Algo le corta el paso (muebles, mesadas o tabiques sin puerta).'}`;
        };
        if (uso) {
          setAvisoPersona(explicar(personas.ordenar(personaActual, uso.acercarse, { uso }), `a ${mueble.nombre || 'ese mueble'}`));
          return;
        }
        const accion = visibles[0] ? accionPorAltura(punto.y - est.y, est.altura) : null;
        setAvisoPersona(explicar(personas.ordenar(personaActual, [punto.x, punto.z], { accion, mirarA: [punto.x, punto.z] }), mueble ? `a ${mueble.nombre}` : 'ahí'));
        return;
      }

      // v1.42.1: también los muebles (el id está en el grupo del mueble, no en cada caja).
      const idMuebleDe = (obj) => { for (let o = obj; o; o = o.parent) if (o.userData?.idMueble !== undefined) return o.userData.idMueble; return null; };
      const tocado = tocados.find((i) => i.object.userData.idPieza || i.object.userData.idAbertura || idMuebleDe(i.object) !== null);
      setSeleccionada(tocado?.object.userData.idPieza ?? null);
      setAberturaSeleccionada(tocado?.object.userData.idAbertura ?? null);
      setMuebleElegido(tocado && !tocado.object.userData.idPieza && !tocado.object.userData.idAbertura ? idMuebleDe(tocado.object) : null);
    };
    renderer.domElement.addEventListener('pointerdown', alApretar);
    renderer.domElement.addEventListener('pointermove', alMover);
    renderer.domElement.addEventListener('pointerup', alSoltar);

    // v1.40.1: doble clic sobre algo = girar alrededor de ese punto (el centro se corre suave, en ~0,3 s).
    let animacionCentro = null;
    const alDobleClic = (ev) => {
      const caja = renderer.domElement.getBoundingClientRect();
      const punto = new THREE.Vector2(((ev.clientX - caja.left) / caja.width) * 2 - 1, -((ev.clientY - caja.top) / caja.height) * 2 + 1);
      rayo.setFromCamera(punto, camara);
      const tocado = rayo.intersectObjects(grupo.children, true).find((i) => i.object.isMesh);
      if (!tocado) return;
      // Los dos clics del doble clic no son para seleccionar: se deshace la selección que hicieron.
      setSeleccionada(null);
      setAberturaSeleccionada(null);
      const desde = controles.target.clone();
      const hasta = tocado.point.clone();
      const inicio = performance.now();
      cancelAnimationFrame(animacionCentro);
      const paso = () => {
        const t = Math.min(1, (performance.now() - inicio) / 300);
        const nuevo = desde.clone().lerp(hasta, t);
        camara.position.add(nuevo.clone().sub(controles.target)); // la cámara acompaña: no salta la vista
        controles.target.copy(nuevo);
        controles.update();
        if (t < 1) animacionCentro = requestAnimationFrame(paso);
      };
      paso();
    };
    renderer.domElement.addEventListener('dblclick', alDobleClic);

    // v1.28: fotos para el PDF, con fondo blanco y sin grilla: la vista actual y, si se piden,
    // las vistas fijas (frente, lateral, arriba) con cámara ortográfica. Se dibuja y se lee en el
    // mismo momento (WebGL borra el lienzo después de mostrarlo).
    const capturar = ({ conCotas = false, conVistasFijas = false, conVistasPartes = false } = {}) => {
      const fondo = escena.background;
      const cotasVisibles = grupoCotas.visible;
      escena.background = new THREE.Color(0xffffff);
      const grillaVisible = grilla.visible; // v1.32: con terreno la grilla ya está apagada
      grilla.visible = false;
      if (conCotas) grupoCotas.visible = true;
      const personasVisibles = personas.grupo.visible;
      // Cada foto se recorta al dibujo (sin el blanco de alrededor): en el PDF la obra sale más grande.
      const foto = (cam) => { renderer.render(escena, cam); return recortarBlanco(renderer.domElement); };
      // La vista actual con la misma forma que en pantalla, pero de al menos 1200 px de ancho
      // (en el celular el visor es chico y la foto salía borrosa).
      const tamanio = renderer.getSize(new THREE.Vector2());
      if (tamanio.x > 0 && tamanio.x < 1200) renderer.setSize(1200, Math.round(1200 / camara.aspect), false);
      const fotos = { actual: foto(camara), fijas: [] };
      renderer.setSize(tamanio.x, tamanio.y, false);
      // v1.45: las vistas fijas y por partes van sin personas y con todas las paredes (las que tapan se ven igual).
      personas.grupo.visible = false;
      aplicarCorte(true);
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
      // v1.44: por partes: se redibuja el modelo sin lo que tapa (techo, entrepiso o la pared de adelante) y se saca
      // la foto; al final se vuelve a dibujar como estaba.
      fotos.partes = [];
      if (conVistasPartes && redibujarRef.current) {
        const [ancho, alto] = [1200, 800];
        renderer.setSize(ancho, alto, false);
        vistasPorPartes(paramsRef.current).forEach((v) => {
          redibujarRef.current(v.ocultar);
          const caja = new THREE.Box3().setFromObject(grupo);
          fotos.partes.push({ clave: v.clave, titulo: v.titulo, imagen: foto(camaraOrtografica(caja, v, ancho / alto)) });
        });
        redibujarRef.current(null);
        renderer.setSize(tamanio.x, tamanio.y, false);
      }
      escena.background = fondo;
      grilla.visible = grillaVisible;
      grupoCotas.visible = cotasVisibles;
      personas.grupo.visible = personasVisibles;
      corte.aplicado = ''; // el próximo cuadro vuelve a ocultar las que tapan
      return {
        ...fotos,
        medidas: medidasFijasRef.current.map((m) => ({ nombre: m.nombre, texto: textoMedida(m.resultado) })),
      };
    };
    if (capturaRef) capturaRef.current = capturar;

    const materialesPanel = new Map();
    visorRef.current = { grupo, grupoCotas, grupoTerreno, grilla, controles, camara, materiales, materialesPanel, frente: null, renderer, ambiente, luz, sol, pisoSombras, escena, cielo, entorno: null, personas, primera, corte };

    return () => {
      cancelAnimationFrame(idCuadro);
      if (capturaRef) capturaRef.current = null;
      vaciarGrupo(grupoCotas);
      vaciarTerreno(grupoTerreno);
      renderer.domElement.removeEventListener('pointerdown', alApretar);
      renderer.domElement.removeEventListener('pointermove', alMover);
      renderer.domElement.removeEventListener('pointerup', alSoltar);
      renderer.domElement.removeEventListener('dblclick', alDobleClic);
      window.removeEventListener('keydown', alTeclaAbajo);
      window.removeEventListener('keyup', alTeclaArriba);
      window.removeEventListener('blur', alPerderFoco);
      personas.liberar();
      cancelAnimationFrame(animacionCentro);
      observador.disconnect();
      controles.dispose();
      vaciarGrupo(grupo);
      Object.values(materiales).forEach((m) => m.dispose());
      materialesPanel.forEach((m) => { m.exterior.dispose(); m.interior.dispose(); });
      grilla.geometry.dispose();
      pisoSombras.geometry.dispose();
      pisoSombras.material.dispose();
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
      exterior: materialPanel(p.color, opacidadesVista.paneles, THREE.FrontSide),
      interior: materialPanel(p.colorInterior ?? p.color, opacidadesVista.paneles, THREE.BackSide),
      tipo: p, // ubicación y espesor (v1.15): dónde se dibuja respecto de la estructura
    }));
    dibujarModelo(visor.grupo, visor.materiales, visor.materialesPanel,
      { params, estructura, aberturas, capas: capasVista, gruposVisibles, seleccionada, catalogo, aberturaSeleccionada, medida, resaltado, medidasFijas,
        perfiles: perfilesVista, opacidadHierros: opacidadesVista.hierros });
    visor.corte.version += 1; // v1.45: hay que volver a ver qué paredes tapan
    juntarPuertas(visor);
    // Se reacomoda la cámara si cambia el frente o el tipo de proyecto (construcción / grada).
    const encuadre = `${params.tipoProyecto}:${params.ladoFrente}`;
    if (visor.frente !== encuadre) {
      mirarAlFrente(visor.camara, visor.controles, medidasVista(params, estructura));
      visor.frente = encuadre;
    }
  }, [params, estructura, aberturas, capasVista, paneles, gruposVisibles, seleccionada, opacidadesVista.paneles, catalogo, aberturaSeleccionada, medida, resaltado, medidasFijas, perfilesVista, opacidadesVista.hierros]);

  // 2a) v1.45.1: "Lo enterrado" apagado = se corta todo lo que está debajo del suelo (un plano de corte en y = 0,
  // un poquito más abajo para no cortar el piso que recibe las sombras, que está a −1 cm).
  useEffect(() => {
    const visor = visorRef.current;
    if (!visor) return;
    visor.renderer.clippingPlanes = capas.bajoTierra === false ? [new THREE.Plane(new THREE.Vector3(0, 1, 0), 0.015)] : [];
  }, [capas.bajoTierra]);

  // 2b) COTAS GENERALES (v1.28): aparte del modelo; se ven si la capa está prendida.
  useEffect(() => {
    const visor = visorRef.current;
    if (!visor) return;
    dibujarCotas(visor.grupoCotas, params, estructura);
    visor.grupoCotas.visible = Boolean(capas.cotas);
  }, [params, estructura, capas.cotas]);

  // 2c) TERRENO (v1.32): el lote y lo que hay en él. Con terreno, la grilla se apaga (el lote hace de piso).
  const obraConTerreno = moduloActivo('terreno') && params.tipoProyecto === 'construccion' && params.terreno?.activo;
  const conTerreno = obraConTerreno && CAPAS_TERRENO.some((c) => capas[c]);
  // Qué partes se ven: { lote: true, calle: false, … } (la capa terrenoLote es la parte 'lote').
  const partesTerreno = Object.fromEntries(PARTES_TERRENO.map((parte, i) => [parte, capas[CAPAS_TERRENO[i]] !== false]));
  const clavePartes = JSON.stringify(partesTerreno);
  useEffect(() => {
    const visor = visorRef.current;
    if (!visor) return;
    vaciarTerreno(visor.grupoTerreno);
    if (conTerreno) {
      dibujarTerreno(visor.grupoTerreno, implantacion(params), params.terreno.retiros,
        { etiquetas: capas.etiquetasTerreno, partes: partesTerreno, opacidad: opacidades.terreno ?? 0.9 });
    }
    visor.grilla.visible = !conTerreno && !realista; // v1.44: la vista realista no lleva grilla
  // Solo lo que cambia el terreno (no todo params: redibujar el lote en cada cambio de la estructura no hace falta).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conTerreno, params.terreno, params.ladoFrente, params.largo, params.ancho, capas.etiquetasTerreno, clavePartes, opacidades.terreno]);

  /** Cámara para ver todo el lote: desde la calle, en diagonal y alto. */
  const verTerreno = () => {
    const visor = visorRef.current;
    if (!visor || !obraConTerreno) return;
    const { centro, haciaCalle, tamanio } = encuadreTerreno(implantacion(params));
    const d = (tamanio * 0.9 + 6) / Math.sqrt(Math.min(1, visor.camara.aspect)); // pantalla angosta (celular): más lejos
    visor.camara.position.set(centro[0] + haciaCalle[0] * d - haciaCalle[1] * d * 0.35, d * 0.75, centro[1] + haciaCalle[1] * d + haciaCalle[0] * d * 0.35);
    visor.controles.target.set(centro[0], 0, centro[1]);
    visor.controles.update();
  };
  const verTerrenoRef = useRef(verTerreno);
  verTerrenoRef.current = verTerreno;
  useEffect(() => { if (pedidoVerTerreno > 0) verTerrenoRef.current(); }, [pedidoVerTerreno]);

  // ---------- v1.37: SOL ----------
  // Se abre con "☀ Sol": luz del sol del día y la hora elegidos, con sombras. Es de la sesión (no se guarda en
  // el proyecto); el lugar (latitud, longitud, huso) y el norte sí son del proyecto.
  const moduloSol = moduloActivo('sol') && params.tipoProyecto === 'construccion';
  // v1.38: la leyenda muestra Interiores solo si la obra tiene mesadas o muebles.
  const hayMesadas = params.tipoProyecto === 'construccion' && (params.mesadas?.length ?? 0) > 0;
  const hayTabiques = params.tipoProyecto === 'construccion' && (params.tabiques?.length ?? 0) > 0; // v1.41
  const hayMuebles = moduloActivo('muebles') && params.tipoProyecto === 'construccion'
    && ((params.muebles?.length ?? 0) > 0 || (params.mesadas ?? []).some((m) => (m.huecos ?? []).some((h) => h.electro))); // v1.40: o electros en huecos
  const hoy = new Date();
  const [sol, setSol] = useState(() => ({
    activo: false,
    fecha: `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`,
    hora: 10,
    animando: false,
    intensidad: 1.5, // v1.38: qué tanto pega el sol (1 = el de antes; Leandro lo quería más fuerte)
  }));
  const cambiarSol = (cambios) => setSol((prev) => ({ ...prev, ...cambios }));
  const lugar = completarSol(params.sol);
  const dia = diaDelAnio(sol.fecha);
  const horario = salidaYPuesta(lugar, dia);
  const posSol = posicionDelSol(lugar, dia, sol.hora);
  const norte = implantacion(params).norte;
  const haciaSol = direccionDelSol(posSol, norte);
  const infoSol = { ...posSol, ...horario, aberturas: aberturasConSol(params, aberturas, haciaSol) };
  const solPrendido = moduloSol && sol.activo;

  // Luz del sol y sombras.
  useEffect(() => {
    const visor = visorRef.current;
    if (!visor) return;
    const { ambiente, luz, sol: luzSol, pisoSombras, cielo } = visor;
    luz.visible = !solPrendido && !realista;
    luzSol.visible = (solPrendido && posSol.altura > 0) || (realista && !solPrendido);
    pisoSombras.visible = (solPrendido || realista) && !conTerreno; // con terreno, el lote recibe las sombras
    cielo.intensity = realista ? 0.9 : 0;
    if (!solPrendido && realista) {
      // v1.44: vista realista sin el módulo de sol: un sol fijo de media tarde, desde adelante a la derecha.
      ambiente.intensity = 0.25;
      luzSol.intensity = 2.4;
      luzSol.color.set(0xfff1dc);
      const tamanio = Math.max(params.largo, params.ancho) + 10;
      const frente = geometriaLados(params)[params.ladoFrente];
      const afuera = [-frente.direccion[1], frente.direccion[0]];
      const hacia = new THREE.Vector3(afuera[0] * 0.6 + frente.direccion[0] * 0.5, 0.75, afuera[1] * 0.6 + frente.direccion[1] * 0.5).normalize();
      luzSol.position.copy(hacia.multiplyScalar(tamanio * 1.5));
      luzSol.target.position.set(0, 0, 0);
      const cam = luzSol.shadow.camera;
      cam.left = -tamanio; cam.right = tamanio; cam.top = tamanio; cam.bottom = -tamanio;
      cam.near = 0.5; cam.far = tamanio * 4;
      cam.updateProjectionMatrix();
      return;
    }
    if (!solPrendido) {
      ambiente.intensity = 0.85;
      return;
    }
    const alto = Math.max(0, Math.sin((posSol.altura * Math.PI) / 180));
    ambiente.intensity = posSol.altura > 0 ? 0.35 + 0.3 * alto : 0.18; // de noche, casi a oscuras
    // v1.38: intensidad elegible; al amanecer y al atardecer el sol pega menos y más cálido.
    luzSol.intensity = 2.2 * sol.intensidad * (0.45 + 0.55 * alto);
    luzSol.color.setHSL(0.11, 1, 0.5 + 0.45 * Math.min(1, alto * 2.5));
    const tamanio = Math.max(params.largo, params.ancho, conTerreno ? Math.max(params.terreno.frente, params.terreno.fondo) : 0) + 10;
    const lejos = tamanio * 1.5;
    luzSol.position.set(haciaSol[0] * lejos, haciaSol[1] * lejos, haciaSol[2] * lejos);
    luzSol.target.position.set(0, 0, 0);
    const cam = luzSol.shadow.camera;
    cam.left = -tamanio; cam.right = tamanio; cam.top = tamanio; cam.bottom = -tamanio;
    cam.near = 0.5; cam.far = lejos * 2.5;
    cam.updateProjectionMatrix();
  }, [solPrendido, realista, posSol.altura, haciaSol[0], haciaSol[1], haciaSol[2], conTerreno, params.largo, params.ancho, params.ladoFrente, params.terreno, sol.intensidad]); // eslint-disable-line react-hooks/exhaustive-deps

  // v1.44: la vista realista: colores de cámara (tone mapping), reflejos de un cuarto neutro, cielo claro, sin grilla y
  // hierros con algo de brillo metálico. Al salir, todo vuelve a como estaba.
  useEffect(() => {
    const visor = visorRef.current;
    if (!visor) return;
    const { renderer, escena, materiales: mats, grilla } = visor;
    if (realista && !visor.entorno) {
      const pmrem = new THREE.PMREMGenerator(renderer);
      visor.entorno = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      pmrem.dispose();
    }
    renderer.toneMapping = realista ? THREE.ACESFilmicToneMapping : THREE.NoToneMapping;
    renderer.toneMappingExposure = 1;
    escena.environment = realista ? visor.entorno : null;
    escena.background = new THREE.Color(realista ? 0xcfe2f3 : 0x0f172a);
    grilla.visible = !realista && !conTerreno;
    CAPAS_HIERRO.forEach((capa) => {
      if (!mats[capa]) return;
      mats[capa].metalness = realista ? 0.55 : 0;
      mats[capa].roughness = realista ? 0.45 : 1;
    });
  }, [realista, conTerreno]);

  // Qué tira sombra y qué la recibe (después de cada redibujo). Las aberturas no tiran: por ahí entra el sol.
  useEffect(() => {
    const visor = visorRef.current;
    if (!visor) return;
    [visor.grupo, visor.grupoTerreno].forEach((g) => g.traverse((obj) => {
      if (!obj.isMesh) return;
      obj.castShadow = (solPrendido || realista) && !obj.userData.idAbertura && !obj.userData.sinSombra;
      obj.receiveShadow = solPrendido || realista;
    }));
  });

  // ▶ Día: la hora avanza sola de la salida a la puesta (y vuelve a empezar).
  useEffect(() => {
    if (!sol.animando || !solPrendido) return undefined;
    const id = setInterval(() => setSol((prev) => {
      const siguiente = prev.hora + 0.1;
      return { ...prev, hora: siguiente > horario.puesta ? horario.salida : siguiente };
    }), 120);
    return () => clearInterval(id);
  }, [sol.animando, solPrendido, horario.salida, horario.puesta]);

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
        setAvisoVisor(`Copiado: ${abertura ? `abertura #${aberturas.indexOf(abertura) + 1}` : describirPieza(pieza, params)}. Ctrl+V para pegar.`);
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
  }, [aberturas, aberturaSeleccionada, seleccionada, estructura, params, onPegarAbertura, onDuplicarPieza]);

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
    const opacidades = opacidadesVista; // v1.44: en la vista realista, todo sólido
    aplicarOpacidad(visor.materiales.osb, opacidades.osb);
    aplicarOpacidad(visor.materiales.machimbre, opacidades.osb); // v1.42.1: el machimbre sigue a la opacidad del OSB
    aplicarOpacidad(visor.materiales.paneles, opacidades.paneles);
    CAPAS_HIERRO.forEach((capa) => aplicarOpacidad(visor.materiales[capa], opacidades.hierros));
    visor.materiales.porPerfil.forEach((m) => aplicarOpacidad(m, opacidades.hierros)); // v1.55
    aplicarOpacidad(visor.materiales.juntas, opacidades.juntas ?? 1);
  }, [opacidadesVista]);

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
  // v1.34.2: el panel de capas arranca CERRADO (tapaba el 3D) y recuerda cómo lo dejaste en este navegador.
  const [capasAbiertas, setCapasAbiertas] = useEstadoGuardado('capasAbiertas', false, (v) => typeof v === 'boolean');
  // v1.38.2: qué sección de capas se ve (Estructura, Superficies…), recordada en este navegador.
  const [seccionCapas, setSeccionCapas] = useEstadoGuardado('seccionCapas', 'Estructura', (v) => typeof v === 'string');
  // Esc lo cierra (salvo que se esté escribiendo en un campo o haya un diálogo abierto).
  useEffect(() => {
    if (!capasAbiertas) return undefined;
    const alTeclear = (ev) => {
      if (ev.key !== 'Escape' || hayDialogoAbierto() || ev.target.closest?.('input, select, textarea')) return;
      setCapasAbiertas(false);
    };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [capasAbiertas, setCapasAbiertas]);

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
    const titulo = capa?.titulo ?? (capa?.colorPorTipo ? 'Superficies; el color es el de cada tipo de panel' : AYUDAS[clave]?.titulo);
    return (
      <span key={clave} className={`capa${capas[clave] ? '' : ' apagada'}`}>
        <input type="checkbox" checked={capas[clave]} onChange={() => alternarCapa(clave)} aria-label={`Mostrar ${nombre}`} />
        {conColor && (
          <SelectorColor valor={colores[clave]} porDefecto={COLORES_INICIALES[clave]} nombre={nombre}
            onCambio={(c) => onCambiarColor(clave, c)} onRestablecer={() => onCambiarColor(clave, COLORES_INICIALES[clave])} />
        )}
        <span onClick={() => alternarCapa(clave)} title={titulo}>{nombre}</span>
      </span>
    );
  };
  const partes = esGrada ? [{ clave: 'grada', nombre: 'Grada' }]
    : esMontaje ? params.montaje.componentes.map((c) => ({ clave: `comp:${c.id}`, nombre: c.nombre || 'Componente' }))
    : [
    ...ordenDesdeFrente.map((lado) => ({ clave: lado, nombre: nombreDePared(lado, params) })),
    { clave: 'techo', nombre: 'Techo' },
    { clave: 'piso', nombre: 'Piso' },
    { clave: 'piso2', nombre: 'Piso 2' },
    ...(estructura?.escalera ? [{ clave: 'escalera', nombre: 'Escalera' }] : []),
  ];
  /** "todo / nada" de las partes (paredes, techo, pisos…). */
  const ponerPartes = (valor) => setGruposVisibles((prev) => ({ ...prev, ...Object.fromEntries(partes.map((p) => [p.clave, valor])) }));

  // v1.38.2: secciones de la leyenda (una visible a la vez). Cada una: título, contenido y "todo / nada".
  const secciones = [
    ...GRUPOS_LEYENDA.map(({ titulo, capas: clavesGrupo }) => {
      // Terreno solo con el módulo prendido y la obra con terreno; Interiores solo si hay mesadas o muebles.
      const visibles = clavesGrupo.filter((clave) => capaDelProyecto(clave, tipoProyecto)
        && (!(CAPAS_TERRENO.includes(clave) || clave === 'etiquetasTerreno') || obraConTerreno)
        && (!CAPAS_MESADAS.includes(clave) || hayMesadas)
        && (!CAPAS_MUEBLES.includes(clave) || hayMuebles)
        && (!CAPAS_TABIQUES.includes(clave) || hayTabiques));
      return visibles.length === 0 ? null
        : { titulo, contenido: visibles.map((clave) => casillaCapa(clave)), todoNada: (valor) => ponerCapas(visibles, valor) };
    }).filter(Boolean),
    {
      titulo: 'Opacidad',
      // Grada y montaje no tienen paneles ni OSB: solo la opacidad de los hierros.
      contenido: OPACIDADES.filter(({ clave }) => (clave === 'terreno' ? obraConTerreno : clave === 'hierros' || (!esGrada && !esMontaje)))
        .map(({ clave, nombre }) => (
          <label key={clave} className="capa control-opacidad">
            {nombre}
            <input type="range" min="0.05" max="1" step="0.05" value={opacidades[clave] ?? 1}
              aria-label={`Opacidad de ${nombre}`} onChange={(e) => onCambiarOpacidad(clave, Number(e.target.value))} />
            <span className="valor-opacidad">{Math.round((opacidades[clave] ?? 1) * 100)} %</span>
          </label>
        )),
    },
    {
      // Partes completas: ocultar una oculta su panel Y sus hierros.
      titulo: 'Partes',
      contenido: partes.map(({ clave, nombre }) => (
        <span key={clave} className="capa">
          <input type="checkbox" checked={gruposVisibles[clave] !== false} onChange={() => alternarGrupo(clave)}
            aria-label={`Mostrar ${nombre} completo`} />
          <span onClick={() => alternarGrupo(clave)}>{nombre}</span>
        </span>
      )),
      todoNada: (valor) => ponerPartes(valor),
    },
  ];
  const seccion = secciones.find((x) => x.titulo === seccionCapas) ?? secciones[0];

  // ---------- v1.45: PERSONAS ----------
  const esConstruccion = params.tipoProyecto === 'construccion';
  const listaPersonas = esConstruccion ? (params.personas ?? []) : [];
  // Con cada cambio de la obra o de las personas, se rehace el mapa de por dónde se camina.
  useEffect(() => {
    const visor = visorRef.current;
    if (!visor || !estructura) return;
    visor.personas.sincronizar(listaPersonas, params, estructura);
  }, [listaPersonas, params, estructura]); // eslint-disable-line react-hooks/exhaustive-deps
  // La elegida puede desaparecer (se quitó de la lista).
  const personaDelPanel = personaElegida === 'visitante' ? { id: 'visitante', nombre: 'Visitante (1,70 m)' }
    : listaPersonas.find((p) => p.id === personaElegida) ?? null;
  const personaExiste = personaDelPanel !== null;
  useEffect(() => {
    if (personaElegida !== null && !personaExiste) { setPersonaElegida(null); setModoPersona(null); }
  }, [personaElegida, personaExiste]);
  useEffect(() => { visorRef.current?.personas.elegir(personaElegida); setAvisoPersona(null); }, [personaElegida]);
  // Primera persona: la cámara va a sus ojos (la de antes se guarda para volver) y el mouse mira alrededor.
  useEffect(() => {
    const visor = visorRef.current;
    if (!visor || modoPersona !== 'primera' || personaElegida === null) return undefined;
    const { camara, controles, primera, personas } = visor;
    primera.guardada = { posicion: camara.position.clone(), centro: controles.target.clone() };
    primera.yaw = personas.estado(personaElegida)?.rumbo ?? 0;
    primera.pitch = 0;
    controles.enabled = false;
    personas.mostrar(personaElegida, false);
    const fovAntes = camara.fov;
    camara.fov = 70; // a la altura de los ojos, más angular (como se ve un ambiente de verdad)
    camara.updateProjectionMatrix();
    return () => {
      personas.mostrar(personaElegida, true);
      camara.fov = fovAntes;
      camara.updateProjectionMatrix();
      camara.position.copy(primera.guardada.posicion);
      controles.target.copy(primera.guardada.centro);
      controles.enabled = true;
      controles.update();
    };
  }, [modoPersona, personaElegida]);
  // Esc: primero deja de manejarla (o sale de sus ojos); otro Esc la suelta.
  useEffect(() => {
    if (personaElegida === null) return undefined;
    const alTeclear = (ev) => {
      if (ev.key !== 'Escape' || hayDialogoAbierto() || ev.target.closest?.('input, select, textarea')) return;
      if (modoPersona) setModoPersona(null); else setPersonaElegida(null);
    };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [personaElegida, modoPersona]);
  /** "👁 Primera persona": con la elegida, o la primera de la lista, o un visitante invisible. */
  const entrarEnPrimeraPersona = () => {
    const visor = visorRef.current;
    if (!visor) return;
    const id = personaElegida ?? listaPersonas[0]?.id ?? visor.personas.asegurarVisitante();
    setMuebleElegido(null);
    setSeleccionada(null);
    setAberturaSeleccionada(null);
    setPersonaElegida(id);
    setModoPersona('primera');
  };

  // v1.49: la abertura elegida: con "✥ Mover", las flechas la corren (← → por la pared mirándola desde afuera,
  // ↑ ↓ el antepecho), de a 1 cm (Shift: 10 cm). Esc deja de moverla.
  useEffect(() => { setMoviendoAbertura(false); setAvisoAbertura(null); }, [aberturaSeleccionada]);
  useEffect(() => {
    if (!moviendoAbertura || aberturaSeleccionada === null) return undefined;
    const alTeclear = (ev) => {
      if (hayDialogoAbierto() || ev.target.closest?.('input, select, textarea')) return;
      if (ev.key === 'Escape') { ev.stopPropagation(); setMoviendoAbertura(false); return; }
      const paso = ev.shiftKey ? 0.1 : 0.01;
      const [du, dv] = { ArrowRight: [paso, 0], ArrowLeft: [-paso, 0], ArrowUp: [0, paso], ArrowDown: [0, -paso] }[ev.key] ?? [0, 0];
      if (!du && !dv) return;
      ev.preventDefault();
      moverAberturaRef.current?.(aberturaSeleccionada, du, dv);
    };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [moviendoAbertura, aberturaSeleccionada]);

  // Al elegir otro mueble (o soltarlo) deja de estar en "mover".
  useEffect(() => { setMoviendoMueble(false); }, [muebleElegido]);

  // La pieza seleccionada puede desaparecer (se eliminó o cambió una medida).
  // v1.44: con un mueble elegido, las flechas lo corren (mirando el frente: → hacia la derecha, ↑ hacia el fondo) y R lo gira.
  // v1.45: solo después de apretar "✥ Mover".
  useEffect(() => {
    if (muebleElegido === null) return undefined;
    const alTeclear = (ev) => {
      if (hayDialogoAbierto() || ev.target.closest?.('input, select, textarea')) return;
      if (ev.key === 'Escape') {
        if (moviendoMueble) setMoviendoMueble(false); else setMuebleElegido(null);
        return;
      }
      if (!moviendoMueble) return;
      const frente = geometriaLados(params)[params.ladoFrente];
      const derecha = frente.direccion;
      const adentro = [frente.direccion[1], -frente.direccion[0]];
      const paso = ev.shiftKey ? 0.1 : 0.01;
      const hacia = { ArrowRight: derecha, ArrowLeft: derecha.map((c) => -c), ArrowUp: adentro, ArrowDown: adentro.map((c) => -c) }[ev.key];
      if (hacia) {
        ev.preventDefault();
        onMoverMueble?.(muebleElegido, hacia[0] * paso, hacia[1] * paso);
      } else if (ev.key === 'r' || ev.key === 'R') {
        onGirarMueble?.(muebleElegido, ev.shiftKey ? -1 : 1);
      }
    };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [muebleElegido, moviendoMueble, params, onMoverMueble, onGirarMueble]);

  const piezaSeleccionada = seleccionada ? listarPiezas(estructura).find((p) => p.id === seleccionada) : null;
  const muebleDelPanel = muebleElegido !== null ? (params.muebles ?? []).find((m) => m.id === muebleElegido) ?? null : null;
  const aberturaElegida = aberturaSeleccionada ? aberturas.find((op) => op.id === aberturaSeleccionada) : null;
  // v1.42.1: le avisa a App qué se eligió, para abrir su tarjeta (y cerrarla al soltarlo).
  const elegidoRef = useRef(onElegir);
  elegidoRef.current = onElegir;
  const claveElegido = piezaSeleccionada ? `p:${piezaSeleccionada.id}` : aberturaElegida ? `a:${aberturaElegida.id}` : muebleElegido !== null ? `m:${muebleElegido}` : '';
  useEffect(() => {
    elegidoRef.current?.(piezaSeleccionada ? { pieza: piezaSeleccionada } : aberturaElegida ? { abertura: aberturaElegida }
      : muebleElegido !== null ? { mueble: muebleElegido } : null);
  }, [claveElegido]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="canvas-box">
      <div className="lienzo" ref={lienzoRef} />
      {solPrendido && (
        <PanelSol estado={sol} onCambiar={cambiarSol} info={infoSol} onCerrar={() => cambiarSol({ activo: false, animando: false })}
          sinTerreno={!obraConTerreno} orientacion={params.terreno?.orientacion ?? 0}
          onOrientacion={(g) => onCambiarParam?.('terreno.orientacion', g)} />
      )}
      <div className="canvas-controls no-print">
        <button className="btn-ctrl" onClick={() => setAutoRotar((v) => !v)}>
          {autoRotar ? '⏸ Pausar giro' : '▶ Girar'}
        </button>
        <button className="btn-ctrl" onClick={() => visorRef.current && mirarAlFrente(visorRef.current.camara, visorRef.current.controles, medidasVista(params, estructura))}>
          Ver frente
        </button>
        {conTerreno && <button className="btn-ctrl" onClick={verTerreno}>Ver terreno</button>}
        {moduloSol && (
          <button className={`btn-ctrl${sol.activo ? ' activo' : ''}`} aria-pressed={sol.activo}
            onClick={() => cambiarSol({ activo: !sol.activo, animando: false })} title="Luz del sol del día y la hora que elijas, con sombras">
            ☀ Sol
          </button>
        )}
        <button className={`btn-ctrl${realista ? ' activo' : ''}`} aria-pressed={realista} onClick={() => setRealista((v) => !v)}
          title="Paneles sólidos, sombras y reflejos, sin las ayudas de dibujo (juntas, cotas, etiquetas)">
          ✨ Realista
        </button>
        <button className={`btn-ctrl${colorPorPerfil ? ' activo' : ''}`} aria-pressed={colorPorPerfil} onClick={() => setColorPorPerfil((v) => !v)}
          title="Pinta cada pieza del color de su caño o perfil (el mismo perfil, el mismo color), en vez de por columna, viga, tirante…">
          🎨 Color por perfil
        </button>
        {esConstruccion && (<>
          <button className={`btn-ctrl${verAdentro ? ' activo' : ''}`} aria-pressed={verAdentro} onClick={() => setVerAdentro((v) => !v)}
            title="Las paredes (y el techo) que quedan entre vos y la casa se ocultan solas mientras girás, para ver adentro">
            🏠 Ver adentro
          </button>
          <button className={`btn-ctrl${modoPersona === 'primera' ? ' activo' : ''}`} aria-pressed={modoPersona === 'primera'}
            onClick={() => (modoPersona === 'primera' ? setModoPersona(null) : entrarEnPrimeraPersona())}
            title="Recorrer la casa a la altura de los ojos: arrastrá para mirar, WASD para caminar">
            👁 Primera persona
          </button>
        </>)}
        <button className={`btn-ctrl${midiendo ? ' activo' : ''}`} aria-pressed={midiendo}
          onClick={() => { setMidiendo((v) => !v); setSeleccionada(null); setAberturaSeleccionada(null); }}>
          📏 {midiendo ? 'Terminar de medir' : 'Medir'}
        </button>
        <span className="ctrl-tip">
          {avisoVisor ?? (midiendo
            ? 'Tocá dos hierros o dos puntos. Entre dos columnas mide de eje a eje. Esc para salir.'
            : modoPersona === 'primera'
              ? 'Arrastrá para mirar · W A S D o flechas para caminar · Shift corre · C agacharse · Esc para salir'
              : 'Arrastrá para girar · botón derecho para mover · rueda para acercar al mouse · doble clic: girar alrededor de ese punto · clic en un hierro o una abertura para seleccionarlo · Ctrl+C / Ctrl+V')}
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
              unidad={unidad} onActualizar={onActualizarAbertura} conAcciones={false}
              perfiles={catalogo?.filter((i) => i.categoria === 'hierro') ?? null}
              perfilGeneral={catalogo?.find((i) => i.id === INSUMO.MARCO_ABERTURA)?.perfil ?? ''} />
          </ul>
          {moviendoAbertura && <p className="nota">Arrastrala por la pared o usá las flechas: ← → por la pared (vista desde afuera), ↑ ↓ el antepecho; 1 cm (Shift: 10 cm). Esc: listo.</p>}
          {avisoAbertura && <p className="error" role="alert">{avisoAbertura}</p>}
          <div className="seleccion-acciones">
            {onMoverAbertura && (
              <button type="button" className={`btn-ctrl${moviendoAbertura ? ' activo' : ''}`} aria-pressed={moviendoAbertura}
                onClick={() => setMoviendoAbertura((v) => !v)} title="Recién con esto se puede arrastrar (así no se mueve sin querer)">
                {moviendoAbertura ? '✓ Listo' : '✥ Mover'}
              </button>
            )}
            <button className="btn-ctrl" title="Crea una igual al lado (Ctrl+C y Ctrl+V hace lo mismo)"
              onClick={() => { const nueva = onPegarAbertura(aberturaElegida); if (nueva) setAberturaSeleccionada(nueva.id); }}>Duplicar</button>
            <button className="btn-del-texto eliminar-aparte"
              onClick={() => { onQuitarAbertura(aberturaElegida.id); setAberturaSeleccionada(null); }}>Eliminar abertura</button>
          </div>
        </div>
      )}

      {/* v1.44: mueble elegido: se arrastra con el mouse, flechas para correrlo, R o los botones para girarlo. */}
      {muebleDelPanel && (
        <div className="seleccion no-print" role="dialog" aria-label="Mueble elegido">
          <div className="seleccion-cabecera">
            <div><strong>Mueble:</strong> {muebleDelPanel.nombre}
              {moviendoMueble ? ' · arrastralo o usá las flechas: 1 cm (Shift: 10 cm) · R: girar · Esc: listo' : ' · su ficha está abierta para editarlo'}</div>
            <button type="button" className="btn-cerrar" onClick={() => setMuebleElegido(null)} aria-label="Soltar el mueble">✕</button>
          </div>
          {/* v1.49: si se sale por una pared o choca con algo, se avisa acá también (y su contorno se ve rojo). */}
          {avisoDeChoques(choquesDelMueble(params, muebleDelPanel)) && (
            <p className="error" role="alert">{avisoDeChoques(choquesDelMueble(params, muebleDelPanel))}</p>
          )}
          <div className="seleccion-acciones">
            <button type="button" className={`btn-ctrl${moviendoMueble ? ' activo' : ''}`} aria-pressed={moviendoMueble}
              onClick={() => setMoviendoMueble((v) => !v)} title="Recién con esto se puede arrastrar (así no se mueve sin querer)">
              {moviendoMueble ? '✓ Listo' : '✥ Mover'}
            </button>
            <button type="button" className="btn-ctrl" onClick={() => onGirarMueble?.(muebleDelPanel.id, -1)}>↺ Girar 90°</button>
            <button type="button" className="btn-ctrl" onClick={() => onGirarMueble?.(muebleDelPanel.id, 1)}>↻ Girar 90°</button>
          </div>
        </div>
      )}

      {/* v1.45: persona elegida: camina hasta lo que toques, o se maneja con el teclado, o se ve con sus ojos. */}
      {personaDelPanel && (
        <div className="seleccion no-print" role="dialog" aria-label="Persona elegida">
          <div className="seleccion-cabecera">
            <div><strong>{personaDelPanel.nombre}</strong>
              {modoPersona === 'manejar' ? ' · W A S D o flechas para caminar · Shift corre · C agacharse · Esc: dejar de manejar'
                : modoPersona === 'primera' ? ' · viendo con sus ojos'
                : ' · tocá el piso y camina hasta ahí; tocá algo y va a buscarlo (se agacha o se estira según la altura); tocá la cama, un sillón, una silla o el inodoro y se acuesta o se sienta'}</div>
            <button type="button" className="btn-cerrar" onClick={() => { setPersonaElegida(null); setModoPersona(null); }} aria-label="Soltar a la persona">✕</button>
          </div>
          {avisoPersona && <p className="error" role="alert">{avisoPersona}</p>}
          <div className="seleccion-acciones">
            {personaDelPanel.id !== 'visitante' && (
              <button type="button" className={`btn-ctrl${modoPersona === 'manejar' ? ' activo' : ''}`} aria-pressed={modoPersona === 'manejar'}
                onClick={() => setModoPersona((m) => (m === 'manejar' ? null : 'manejar'))}>🎮 Manejar con el teclado</button>
            )}
            <button type="button" className={`btn-ctrl${modoPersona === 'primera' ? ' activo' : ''}`} aria-pressed={modoPersona === 'primera'}
              onClick={() => setModoPersona((m) => (m === 'primera' ? null : 'primera'))}>👁 Ver con sus ojos</button>
          </div>
        </div>
      )}

      {piezaSeleccionada && (
        <div className="seleccion no-print" role="dialog" aria-label="Pieza seleccionada">
          <div className="seleccion-cabecera">
            <div>
              <strong>Seleccionada:</strong> {describirPieza(piezaSeleccionada, params)}
              {piezaSeleccionada.editada && <span className="marca-editada"> · editada</span>}
            </div>
            <button type="button" className="btn-cerrar" onClick={() => { setSeleccionada(null); setEditandoId(null); }}
              aria-label="Cerrar" title="Cerrar (Esc)">✕</button>
          </div>
          {editandoId === piezaSeleccionada.id && (
            <EditorPieza pieza={piezaSeleccionada} edicion={params.piezasEditadas[piezaSeleccionada.id]}
              catalogo={catalogo} unidad={unidad} ladoFrente={params.ladoFrente} paredes={params.paredes}
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

      {/* v1.55: leyenda del color por perfil: cada caño con su color, cuántas piezas y cuántos metros. */}
      {perfilesVista && perfilesVista.length > 0 && (
        <ul className="leyenda-perfiles no-print" aria-label="Colores por perfil">
          {perfilesVista.map((x) => (
            <li key={x.perfil}><span className="muestra-color" style={{ background: x.color }} />
              {x.perfil} <small>· {x.piezas} {x.piezas === 1 ? 'pieza' : 'piezas'} · {x.metros.toFixed(1).replace('.', ',')} m</small></li>
          ))}
        </ul>
      )}

      {/* v1.38.2: capas en pestañas (una sección a la vez, a la izquierda): antes todas juntas tapaban el 3D. */}
      <div className={`capas no-print${capasAbiertas ? '' : ' plegada'}`} role="group" aria-label="Capas visibles">
        <button type="button" className="btn-ctrl btn-capas" aria-expanded={capasAbiertas}
          onClick={() => setCapasAbiertas((v) => !v)}>
          {capasAbiertas ? '▾ Capas' : '▸ Capas'}
        </button>
        {capasAbiertas && (<>
          <div className="pestanas-capas" role="tablist" aria-label="Secciones de capas">
            {secciones.map(({ titulo }) => (
              <button key={titulo} type="button" role="tab" aria-selected={titulo === seccion.titulo}
                className={`chip-capas${titulo === seccion.titulo ? ' activa' : ''}`} onClick={() => setSeccionCapas(titulo)}>
                {titulo}
              </button>
            ))}
          </div>
          <div className="contenido-capas" role="group" aria-label={seccion.titulo}>
            {seccion.todoNada && (
              <span className="todo-nada">
                <button type="button" className="btn-mini" onClick={() => seccion.todoNada(true)} aria-label={`Mostrar todo ${seccion.titulo}`}>todo</button>
                <button type="button" className="btn-mini" onClick={() => seccion.todoNada(false)} aria-label={`Ocultar todo ${seccion.titulo}`}>nada</button>
              </span>
            )}
            {seccion.contenido}
          </div>
        </>)}
      </div>
    </div>
  );
}
