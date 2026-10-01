// ==========================================================
// VISOR 3D (Three.js)
// ----------------------------------------------------------
// Dibuja la estructura que arma motor/estructura.js.
//
// Para no perder memoria (memory leak) se separa en 3 efectos:
//   1. Montaje: crea UNA sola vez escena, cámara, renderer y controles.
//   2. Modelo: cuando cambian los datos, borra el grupo anterior
//      liberando geometrías y texturas (dispose) y dibuja el nuevo.
//   3. Rotación: solo prende/apaga el auto-giro.
// ==========================================================

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { LADOS } from './motor/constantes.js';
import { posicionAbertura } from './motor/estructura.js';
import { geometriaLados, nombreLado } from './motor/geometria.js';

// Capas: nombre visible y color (también se usan en la leyenda).
const CAPAS = {
  pilotines: { nombre: 'Pilotines', color: 0x94a3b8 },
  columnas: { nombre: 'Columnas', color: 0xef4444 },
  marcos: { nombre: 'Marcos', color: 0x3b82f6 },
  piso: { nombre: 'Piso', color: 0x06b6d4 },
  piso2: { nombre: 'Piso 2', color: 0x22d3ee },
  transversales: { nombre: 'Transversales', color: 0xa855f7 },
  correas: { nombre: 'Horizontales', color: 0xeab308 },
  techo: { nombre: 'Techo', color: 0xf97316 },
  osb: { nombre: 'OSB', color: 0xd97706 },
  paneles: { nombre: 'Paneles', color: 0x10b981 },
};
const COLOR_ABERTURAS = 0x38bdf8;

/** Crea los materiales una sola vez. */
function crearMateriales() {
  const solido = (color) => new THREE.MeshStandardMaterial({ color });
  const transparente = (color, opacity) =>
    new THREE.MeshStandardMaterial({ color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide });
  const materiales = {};
  Object.entries(CAPAS).forEach(([clave, { color }]) => {
    materiales[clave] = solido(color);
  });
  materiales.osb = new THREE.MeshStandardMaterial({ color: CAPAS.osb.color, side: THREE.DoubleSide });
  materiales.paneles = transparente(CAPAS.paneles.color, 0.16);
  materiales.aberturas = transparente(COLOR_ABERTURAS, 0.7);
  return materiales;
}

/** Barra entre dos puntos 3D (sirve para piezas horizontales o inclinadas). */
function barra({ desde, hasta, largo }, seccion, material) {
  const malla = new THREE.Mesh(new THREE.BoxGeometry(seccion, seccion, largo), material);
  malla.position.set((desde[0] + hasta[0]) / 2, (desde[1] + hasta[1]) / 2, (desde[2] + hasta[2]) / 2);
  malla.lookAt(...hasta); // orienta el eje largo (z local) hacia el punto final
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
function dibujarModelo(grupo, materiales, { params, estructura, aberturas, capas }) {
  const e = estructura;
  const { elevacion } = params;
  const agregarBarras = (piezas, seccion, material) => piezas.forEach((p) => grupo.add(barra(p, seccion, material)));

  if (capas.pilotines) {
    e.pilotines.forEach(({ x, z }) => {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, elevacion || 0.01, 16), materiales.pilotines);
      p.position.set(x, elevacion / 2, z);
      grupo.add(p);
    });
  }

  if (capas.columnas) {
    e.columnas.forEach(({ x, z, largo }) => {
      const c = new THREE.Mesh(new THREE.BoxGeometry(0.1, largo, 0.1), materiales.columnas);
      c.position.set(x, elevacion + largo / 2, z);
      grupo.add(c);
    });
  }

  if (capas.marcos) agregarBarras(e.marcos, 0.12, materiales.marcos);
  if (capas.piso) agregarBarras(e.piso.tirantes, 0.08, materiales.piso);
  if (capas.piso2) agregarBarras(e.piso2.tirantes, 0.08, materiales.piso2);
  if (capas.transversales) agregarBarras([...e.piso.transversales, ...e.piso2.transversales], 0.06, materiales.transversales);
  if (capas.correas) agregarBarras(e.correas, 0.04, materiales.correas);
  if (capas.techo) {
    agregarBarras(e.techo.vigas, 0.1, materiales.techo);
    agregarBarras(e.techo.correas, 0.05, materiales.techo);
  }

  if (capas.osb) {
    const { largo, ancho } = params;
    const y = elevacion + 0.07;
    grupo.add(cuadrilatero([[-largo / 2, y, -ancho / 2], [largo / 2, y, -ancho / 2], [largo / 2, y, ancho / 2], [-largo / 2, y, ancho / 2]], materiales.osb));
    if (e.entrepiso) {
      const y2 = e.entrepiso.y + 0.07;
      grupo.add(cuadrilatero(e.entrepiso.esquinas.map(([x, z]) => [x, y2, z]), materiales.osb));
    }
  }

  if (capas.paneles) {
    e.paredes.forEach((pared) => grupo.add(cuadrilatero(pared.esquinas, materiales.paneles)));
    grupo.add(cuadrilatero(e.techo.esquinas, materiales.paneles));
  }

  // Aberturas: siempre visibles, para ubicarlas aunque se oculten los paneles.
  aberturas.forEach((op) => {
    const { x, y, z, rotacionY } = posicionAbertura(op, params);
    const malla = new THREE.Mesh(new THREE.BoxGeometry(op.ancho, op.alto, 0.14), materiales.aberturas);
    malla.position.set(x, y, z);
    malla.rotation.y = rotacionY;
    grupo.add(malla);
  });

  // Carteles con el nombre de cada lado, un poco afuera de la pared.
  const lados = geometriaLados(params);
  LADOS.forEach((lado) => {
    const geo = lados[lado];
    const afuera = [-geo.direccion[1], geo.direccion[0]];
    const sprite = cartel(`${nombreLado(lado, params.ladoFrente)} (${lado})`, lado === params.ladoFrente);
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

export default function LoftCanvas({ params, estructura, aberturas }) {
  const lienzoRef = useRef(null);
  const visorRef = useRef(null); // { grupo, controles, camara, materiales, frente }
  const [autoRotar, setAutoRotar] = useState(false);
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
    const materiales = crearMateriales();

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

    visorRef.current = { grupo, controles, camara, materiales, frente: null };

    return () => {
      cancelAnimationFrame(idCuadro);
      observador.disconnect();
      controles.dispose();
      vaciarGrupo(grupo);
      Object.values(materiales).forEach((m) => m.dispose());
      grilla.geometry.dispose();
      grilla.material.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      visorRef.current = null;
    };
  }, []);

  // 2) MODELO: se redibuja cuando cambian datos o capas.
  useEffect(() => {
    const visor = visorRef.current;
    if (!visor || !estructura) return;
    vaciarGrupo(visor.grupo);
    dibujarModelo(visor.grupo, visor.materiales, { params, estructura, aberturas, capas });
    // Si cambió el frente (o es la primera vez), la cámara se pone de frente.
    if (visor.frente !== params.ladoFrente) {
      mirarAlFrente(visor.camara, visor.controles, params);
      visor.frente = params.ladoFrente;
    }
  }, [params, estructura, aberturas, capas]);

  // 3) ROTACIÓN automática.
  useEffect(() => {
    if (visorRef.current) visorRef.current.controles.autoRotate = autoRotar;
  }, [autoRotar]);

  const alternarCapa = (clave) => setCapas((prev) => ({ ...prev, [clave]: !prev[clave] }));
  const colorCss = (hex) => `#${hex.toString(16).padStart(6, '0')}`;

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
        <span className="ctrl-tip">Arrastrá para orbitar · rueda para zoom</span>
      </div>
      <div className="capas no-print" role="group" aria-label="Capas visibles">
        {Object.entries(CAPAS).map(([clave, { nombre, color }]) => (
          <label key={clave} className="capa">
            <input type="checkbox" checked={capas[clave]} onChange={() => alternarCapa(clave)} />
            <span className="muestra" style={{ background: colorCss(color) }} />
            {nombre}
          </label>
        ))}
      </div>
    </div>
  );
}
