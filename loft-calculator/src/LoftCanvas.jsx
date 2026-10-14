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
import { CAPAS } from './capas.js';
import { posicionAbertura, listarPiezas } from './motor/estructura.js';
import { geometriaLados, nombreLado } from './motor/geometria.js';
import { describirPieza } from './descripcionPiezas.js';
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
  // Pieza seleccionada: amarillo que brilla.
  materiales.seleccion = new THREE.MeshStandardMaterial({ color: COLOR_SELECCION, emissive: COLOR_SELECCION, emissiveIntensity: 0.6 });
  return materiales;
}

/** Material semitransparente para un tipo de panel. */
function materialPanel(color) {
  return new THREE.MeshStandardMaterial({
    color, transparent: true, opacity: 0.32, depthWrite: false, side: THREE.DoubleSide,
  });
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
  const { params, estructura: e, aberturas, capas, gruposVisibles, seleccionada } = opciones;
  const { elevacion } = params;
  const grupoVisible = (g) => gruposVisibles[g] !== false; // 'interior' no tiene interruptor

  // Piezas de hierro: una malla cada una, con su id para poder seleccionarla.
  listarPiezas(e).forEach((p) => {
    const estilo = ESTILO_PIEZA[p.tipo];
    if (!estilo || !capas[estilo.capa] || !p.grupos.every(grupoVisible)) return;
    const material = p.id === seleccionada ? materiales.seleccion : materiales[estilo.capa];
    const malla = barra(p, p.id === seleccionada ? estilo.seccion * 1.6 : estilo.seccion, material);
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
    const material = (id) => materialesPanel.get(id) ?? materiales.paneles;
    e.paredes
      .filter((pared) => grupoVisible(pared.lado))
      .forEach((pared) => grupo.add(cuadrilatero(pared.esquinas, material(pared.panel))));
    if (grupoVisible('techo')) grupo.add(cuadrilatero(e.techo.esquinas, material(e.techo.panel)));
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
}) {
  const lienzoRef = useRef(null);
  const visorRef = useRef(null); // { grupo, controles, camara, materiales, ... }
  const coloresRef = useRef(colores); // colores iniciales para el montaje
  const [autoRotar, setAutoRotar] = useState(false);
  const [seleccionada, setSeleccionada] = useState(null); // id de la pieza seleccionada
  const [editandoId, setEditandoId] = useState(null); // pieza con el formulario de edición abierto
  // Partes visibles: cada pared, el techo y los pisos (con sus hierros).
  const [gruposVisibles, setGruposVisibles] = useState({ A: true, B: true, C: true, D: true, techo: true, piso: true, piso2: true, escalera: true });
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

    const materialesPanel = new Map();
    visorRef.current = { grupo, controles, camara, materiales, materialesPanel, frente: null };

    return () => {
      cancelAnimationFrame(idCuadro);
      renderer.domElement.removeEventListener('pointerdown', alApretar);
      renderer.domElement.removeEventListener('pointerup', alSoltar);
      observador.disconnect();
      controles.dispose();
      vaciarGrupo(grupo);
      Object.values(materiales).forEach((m) => m.dispose());
      materialesPanel.forEach((m) => m.dispose());
      grilla.geometry.dispose();
      grilla.material.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      visorRef.current = null;
    };
  }, []);

  // 2) MODELO: se redibuja cuando cambian datos, capas, partes visibles o la selección.
  useEffect(() => {
    const visor = visorRef.current;
    if (!visor || !estructura) return;
    vaciarGrupo(visor.grupo);
    visor.materialesPanel.forEach((m) => m.dispose());
    visor.materialesPanel.clear();
    paneles.forEach((p) => visor.materialesPanel.set(p.id, materialPanel(p.color)));
    dibujarModelo(visor.grupo, visor.materiales, visor.materialesPanel,
      { params, estructura, aberturas, capas, gruposVisibles, seleccionada });
    if (visor.frente !== params.ladoFrente) {
      mirarAlFrente(visor.camara, visor.controles, params);
      visor.frente = params.ladoFrente;
    }
  }, [params, estructura, aberturas, capas, paneles, gruposVisibles, seleccionada]);

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
  const alternarGrupo = (clave) => setGruposVisibles((prev) => ({ ...prev, [clave]: !prev[clave] }));

  // Partes que se pueden ocultar (con sus hierros): paredes desde el frente, techo y pisos.
  const ordenDesdeFrente = [0, 1, 2, 3].map((i) => LADOS[(LADOS.indexOf(params.ladoFrente) + i) % 4]);
  const partes = [
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
        <button className="btn-ctrl" onClick={() => visorRef.current && mirarAlFrente(visorRef.current.camara, visorRef.current.controles, params)}>
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
          .filter(([, { colorPorTipo }]) => !colorPorTipo)
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
        <span className="capa">
          <input type="checkbox" checked={capas.paneles} onChange={() => alternarCapa('paneles')}
            aria-label="Mostrar paneles" />
          <span onClick={() => alternarCapa('paneles')} title="Superficies; el color es el de cada tipo de panel">Paneles</span>
        </span>
        {/* Partes completas: ocultar una oculta su panel Y sus hierros. */}
        <span className="capas-paneles">
          <span className="capa"><strong>Mostrar:</strong></span>
          {partes.map(({ clave, nombre }) => (
            <span key={clave} className="capa">
              <input type="checkbox" checked={gruposVisibles[clave]} onChange={() => alternarGrupo(clave)}
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
