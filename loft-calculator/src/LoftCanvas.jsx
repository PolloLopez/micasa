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
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { LADOS } from './motor/constantes.js';
import { CAPAS, CAPAS_GRADA, CAPAS_MONTAJE, CAPAS_SOLO_PROYECTOS_SUELTOS } from './capas.js';
import { posicionAbertura, listarPiezas } from './motor/estructura.js';
import { geometriaLados, nombreLado } from './motor/geometria.js';
import { describirPieza } from './descripcionPiezas.js';
import { seccionDesdePerfil } from './motor/canos.js';
import { INSUMO } from './motor/constantes.js';
import EditorPieza from './componentes/EditorPieza.jsx';

// Capa y sección (grosor en el 3D) de cada tipo de pieza.
const ESTILO_PIEZA = {
  columna: { capa: 'columnas', seccion: 0.1 },
  dintel: { capa: 'columnas', seccion: 0.08 },
  jamba: { capa: 'columnas', seccion: 0.08 },
  alfeizar: { capa: 'columnas', seccion: 0.08 },
  'marco-piso': { capa: 'marcos', seccion: 0.12 },
  solera: { capa: 'marcos', seccion: 0.12 },
  'marco-piso2': { capa: 'marcos', seccion: 0.12 },
  'viga-cierre': { capa: 'marcos', seccion: 0.12 },
  piso: { capa: 'piso', seccion: 0.08 },
  piso2: { capa: 'piso2', seccion: 0.08 },
  'transv-piso': { capa: 'transversales', seccion: 0.09 },
  'transv-piso2': { capa: 'transversales', seccion: 0.09 },
  horizontal: { capa: 'correas', seccion: 0.04 },
  'viga-techo': { capa: 'techo', seccion: 0.1 },
  'correa-techo': { capa: 'techo', seccion: 0.05 },
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
  'viga-cierre': INSUMO.VIGA_CIERRE,
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
  return ESTILO_PIEZA[p.tipo]?.capa;
};
const ESPESOR_ESCALON = 0.05; // madera de 2"


const COLOR_SELECCION = '#facc15';
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
  // Pieza seleccionada: amarillo que brilla.
  materiales.seleccion = new THREE.MeshStandardMaterial({ color: COLOR_SELECCION, emissive: COLOR_SELECCION, emissiveIntensity: 0.6 });
  return materiales;
}

/** Controles de opacidad de la leyenda. */
const OPACIDADES = [
  { clave: 'paneles', nombre: 'Paneles' },
  { clave: 'osb', nombre: 'OSB' },
  { clave: 'hierros', nombre: 'Hierros' },
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
  const { params, estructura: e, aberturas, capas, gruposVisibles, seleccionada, catalogo } = opciones;
  const { elevacion } = params;
  const grupoVisible = (g) => gruposVisibles[g] !== false; // 'interior' no tiene interruptor

  // Piezas de hierro: una malla cada una, con su id para poder seleccionarla.
  listarPiezas(e).forEach((p) => {
    const estilo = ESTILO_PIEZA[p.tipo];
    const capa = capaDe(p);
    if (!estilo || !capas[capa] || !p.grupos.every(grupoVisible)) return;
    const material = p.id === seleccionada ? materiales.seleccion : materiales[capa];
    const seccion = seccionDe(p, catalogo, estilo);
    const malla = barra(p, p.id === seleccionada ? seccion * 1.6 : seccion, material);
    malla.userData.idPieza = p.id;
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
    // Cada panel con su color exterior e interior; si el tipo no existe, el material genérico.
    const dibujar = (esquinas, idPanel, haciaAfuera) => {
      const mats = materialesPanel.get(idPanel);
      grupo.add(mats ? panelDosCaras(esquinas, mats, haciaAfuera) : cuadrilatero(esquinas, materiales.paneles));
    };
    e.paredes.filter((pared) => grupoVisible(pared.lado)).forEach((pared) => {
      // Afuera = desde el centro de la planta hacia el centro de la pared.
      const centro = pared.esquinas.reduce((acc, p) => [acc[0] + p[0] / 4, 0, acc[2] + p[2] / 4], [0, 0, 0]);
      dibujar(pared.esquinas, pared.panel, centro);
    });
    if (grupoVisible('techo')) dibujar(e.techo.esquinas, e.techo.panel, [0, 1, 0]);
  }

  if (capas.aberturas) {
    aberturas.filter((op) => grupoVisible(op.lado)).forEach((op) => {
      const { x, y, z, rotacionY } = posicionAbertura(op, params);
      const malla = new THREE.Mesh(new THREE.BoxGeometry(op.ancho, op.alto, 0.14), materiales.aberturas);
      malla.position.set(x, y, z);
      malla.rotation.y = rotacionY;
      grupo.add(malla);
    });
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

/** Libera la memoria de GPU del grupo (geometrías, texturas de carteles) y lo vacía. */
function vaciarGrupo(grupo) {
  grupo.traverse((obj) => {
    obj.geometry?.dispose();
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
  opacidades, onCambiarOpacidad, imagenImpresionRef,
}) {
  const lienzoRef = useRef(null);
  const visorRef = useRef(null); // { grupo, controles, camara, materiales, ... }
  const coloresRef = useRef(colores); // colores iniciales para el montaje
  const [autoRotar, setAutoRotar] = useState(false);
  const [seleccionada, setSeleccionada] = useState(null); // id de la pieza seleccionada
  const [editandoId, setEditandoId] = useState(null); // pieza con el formulario de edición abierto
  // Partes visibles: cada pared, el techo y los pisos (con sus hierros).
  const [gruposVisibles, setGruposVisibles] = useState({ A: true, B: true, C: true, D: true, techo: true, piso: true, piso2: true, escalera: true, grada: true });
  const [capas, setCapas] = useState(() =>
    Object.fromEntries(Object.keys(CAPAS).map((clave) => [clave, true]))
  );

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
      const tocada = rayo.intersectObjects(grupo.children, false).find((i) => i.object.userData.idPieza);
      setSeleccionada(tocada ? tocada.object.userData.idPieza : null);
    };
    renderer.domElement.addEventListener('pointerdown', alApretar);
    renderer.domElement.addEventListener('pointerup', alSoltar);

    // Al imprimir (botón o Ctrl+P): foto de la vista actual con fondo blanco para el PDF.
    // Se dibuja y se lee en el mismo momento (WebGL borra el lienzo después de mostrarlo).
    const alImprimir = () => {
      const imagen = imagenImpresionRef?.current;
      if (!imagen) return;
      const fondo = escena.background;
      escena.background = new THREE.Color(0xffffff);
      grilla.visible = false;
      renderer.render(escena, camara);
      imagen.src = renderer.domElement.toDataURL('image/png');
      escena.background = fondo;
      grilla.visible = true;
    };
    window.addEventListener('beforeprint', alImprimir);

    const materialesPanel = new Map();
    visorRef.current = { grupo, controles, camara, materiales, materialesPanel, frente: null };

    return () => {
      cancelAnimationFrame(idCuadro);
      window.removeEventListener('beforeprint', alImprimir);
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
    // Se monta una sola vez; imagenImpresionRef es un ref (no cambia entre renders).
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
    }));
    dibujarModelo(visor.grupo, visor.materiales, visor.materialesPanel,
      { params, estructura, aberturas, capas, gruposVisibles, seleccionada, catalogo });
    // Se reacomoda la cámara si cambia el frente o el tipo de proyecto (construcción / grada).
    const encuadre = `${params.tipoProyecto}:${params.ladoFrente}`;
    if (visor.frente !== encuadre) {
      mirarAlFrente(visor.camara, visor.controles, medidasVista(params, estructura));
      visor.frente = encuadre;
    }
  }, [params, estructura, aberturas, capas, paneles, gruposVisibles, seleccionada, opacidades.paneles, catalogo]);

  // 3b) OPACIDAD de OSB, hierros y paneles genéricos: se cambia el material (no se redibuja).
  useEffect(() => {
    const visor = visorRef.current;
    if (!visor) return;
    aplicarOpacidad(visor.materiales.osb, opacidades.osb);
    aplicarOpacidad(visor.materiales.paneles, opacidades.paneles);
    CAPAS_HIERRO.forEach((capa) => aplicarOpacidad(visor.materiales[capa], opacidades.hierros));
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
  // Un grupo que nunca se tocó está visible (undefined): el primer clic lo oculta.
  const alternarGrupo = (clave) => setGruposVisibles((prev) => ({ ...prev, [clave]: prev[clave] === false }));

  // Partes que se pueden ocultar (con sus hierros): paredes desde el frente, techo y pisos.
  const ordenDesdeFrente = [0, 1, 2, 3].map((i) => LADOS[(LADOS.indexOf(params.ladoFrente) + i) % 4]);
  const esGrada = Boolean(estructura?.grada);
  const esMontaje = Boolean(estructura?.montaje);
  const partes = esGrada ? [{ clave: 'grada', nombre: 'Grada' }]
    : esMontaje ? params.montaje.componentes.map((c) => ({ clave: `comp:${c.id}`, nombre: c.nombre || 'Componente' }))
    : [
    ...ordenDesdeFrente.map((lado) => ({ clave: lado, nombre: nombreLado(lado, params.ladoFrente) })),
    { clave: 'techo', nombre: 'Techo' },
    { clave: 'piso', nombre: 'Piso' },
    { clave: 'piso2', nombre: 'Piso 2' },
    ...(estructura?.escalera ? [{ clave: 'escalera', nombre: 'Escalera' }] : []),
  ];

  // La pieza seleccionada puede desaparecer (se eliminó o cambió una medida).
  const piezaSeleccionada = seleccionada ? listarPiezas(estructura).find((p) => p.id === seleccionada) : null;

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
        <span className="ctrl-tip">Arrastrá para orbitar · rueda para zoom · clic en un hierro para seleccionarlo</span>
      </div>

      {piezaSeleccionada && (
        <div className="seleccion no-print" role="dialog" aria-label="Pieza seleccionada">
          <div>
            <strong>Seleccionada:</strong> {describirPieza(piezaSeleccionada, params.ladoFrente)}
            {piezaSeleccionada.editada && <span className="marca-editada"> · editada</span>}
          </div>
          {editandoId === piezaSeleccionada.id && (
            <EditorPieza pieza={piezaSeleccionada} edicion={params.piezasEditadas[piezaSeleccionada.id]}
              catalogo={catalogo} unidad={unidad} ladoFrente={params.ladoFrente}
              alturaPiso2={estructura.entrepiso ? estructura.entrepiso.y : null} onEditar={onEditarPieza} />
          )}
          <div className="seleccion-acciones">
            {editandoId !== piezaSeleccionada.id && (
              <button className="btn-ctrl" onClick={() => setEditandoId(piezaSeleccionada.id)}>Editar (recortar, mover, perfil)</button>
            )}
            <button className="btn-del-texto" onClick={() => { onEliminarPieza(piezaSeleccionada.id); setSeleccionada(null); }}>
              Eliminar pieza
            </button>
            <button className="btn-ctrl" onClick={() => { setSeleccionada(null); setEditandoId(null); }}>Cerrar</button>
          </div>
        </div>
      )}

      <div className={`capas no-print${capasAbiertas ? '' : ' plegada'}`} role="group" aria-label="Capas visibles">
        <button type="button" className="btn-ctrl btn-capas" aria-expanded={capasAbiertas}
          onClick={() => setCapasAbiertas((v) => !v)}>
          {capasAbiertas ? '▾ Capas' : '▸ Capas y colores'}
        </button>
        {capasAbiertas && (<>
        {Object.entries(CAPAS)
          // Cada tipo de proyecto muestra solo las capas que tienen piezas.
          .filter(([clave, { colorPorTipo }]) => !colorPorTipo && (esGrada ? CAPAS_GRADA.includes(clave)
            : esMontaje ? CAPAS_MONTAJE.includes(clave) : !CAPAS_SOLO_PROYECTOS_SUELTOS.includes(clave)))
          .map(([clave, { nombre }]) => (
            <span key={clave} className="capa">
              <input type="checkbox" checked={capas[clave]} onChange={() => alternarCapa(clave)}
                aria-label={`Mostrar ${nombre}`} />
              <input type="color" className="muestra" value={colores[clave]}
                onChange={(e) => onCambiarColor(clave, e.target.value)} aria-label={`Color de ${nombre}`}
                title={`Cambiar color de ${nombre}`} />
              <span onClick={() => alternarCapa(clave)}>{nombre}</span>
            </span>
          ))}
        {!esGrada && !esMontaje && (
          <span className="capa">
            <input type="checkbox" checked={capas.paneles} onChange={() => alternarCapa('paneles')}
              aria-label="Mostrar paneles" />
            <span onClick={() => alternarCapa('paneles')} title="Superficies; el color es el de cada tipo de panel">Paneles</span>
          </span>
        )}
        {/* Opacidad: de "se ve a través" a sólido, para ver cómo queda cerrada. */}
        <span className="capas-paneles capas-opacidad">
          <span className="capa"><strong>Opacidad:</strong></span>
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
          <span className="capa"><strong>Mostrar:</strong></span>
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
