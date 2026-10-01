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
import { CAPAS } from './capas.js';
import { posicionAbertura } from './motor/estructura.js';
import { geometriaLados, nombreLado } from './motor/geometria.js';

/**
 * Crea los materiales una sola vez, con los colores elegidos.
 * Los colores después se actualizan sin recrear nada (ver efecto 4).
 */
function crearMateriales(colores) {
  const materiales = {};
  Object.keys(CAPAS).forEach((clave) => {
    materiales[clave] = new THREE.MeshStandardMaterial({ color: colores[clave] });
  });
  // Superficies: transparentes para ver la estructura de atrás o de abajo.
  const transparente = (material, opacity) => {
    material.transparent = true;
    material.opacity = opacity;
    material.depthWrite = false;
    material.side = THREE.DoubleSide;
  };
  transparente(materiales.osb, 0.45); // deja ver la estructura de piso y las transversales
  transparente(materiales.paneles, 0.16);
  transparente(materiales.aberturas, 0.7);
  return materiales;
}

/** Material semitransparente para un tipo de panel. */
function materialPanel(color) {
  return new THREE.MeshStandardMaterial({
    color, transparent: true, opacity: 0.32, depthWrite: false, side: THREE.DoubleSide,
  });
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
function dibujarModelo(grupo, materiales, materialesPanel, { params, estructura, aberturas, capas }) {
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
  // Transversales un poco más gruesas que la estructura de piso para que se distingan.
  if (capas.transversales) agregarBarras([...e.piso.transversales, ...e.piso2.transversales], 0.09, materiales.transversales);
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
    // Cada pared y el techo con el color de su tipo de panel.
    const material = (id) => materialesPanel.get(id) ?? materiales.paneles;
    e.paredes.forEach((pared) => grupo.add(cuadrilatero(pared.esquinas, material(pared.panel))));
    grupo.add(cuadrilatero(e.techo.esquinas, material(e.techo.panel)));
  }

  if (capas.aberturas) aberturas.forEach((op) => {
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

export default function LoftCanvas({ params, estructura, aberturas, paneles, colores, onCambiarColor }) {
  const lienzoRef = useRef(null);
  const visorRef = useRef(null); // { grupo, controles, camara, materiales, frente }
  const coloresRef = useRef(colores); // colores iniciales para el montaje
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

    // Materiales de los tipos de panel: se recrean cuando cambia la lista (efecto 2).
    const materialesPanel = new Map();
    visorRef.current = { grupo, controles, camara, materiales, materialesPanel, frente: null };

    return () => {
      cancelAnimationFrame(idCuadro);
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

  // 2) MODELO: se redibuja cuando cambian datos o capas.
  useEffect(() => {
    const visor = visorRef.current;
    if (!visor || !estructura) return;
    vaciarGrupo(visor.grupo);
    // Un material por tipo de panel (se liberan los anteriores).
    visor.materialesPanel.forEach((m) => m.dispose());
    visor.materialesPanel.clear();
    paneles.forEach((p) => visor.materialesPanel.set(p.id, materialPanel(p.color)));
    dibujarModelo(visor.grupo, visor.materiales, visor.materialesPanel, { params, estructura, aberturas, capas });
    // Si cambió el frente (o es la primera vez), la cámara se pone de frente.
    if (visor.frente !== params.ladoFrente) {
      mirarAlFrente(visor.camara, visor.controles, params);
      visor.frente = params.ladoFrente;
    }
  }, [params, estructura, aberturas, capas, paneles]);

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

  const alternarCapa = (clave) => setCapas((prev) => ({ ...prev, [clave]: !prev[clave] }));

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
        {Object.entries(CAPAS).map(([clave, { nombre, colorPorTipo }]) => (
          <span key={clave} className="capa">
            <input type="checkbox" checked={capas[clave]} onChange={() => alternarCapa(clave)}
              aria-label={`Mostrar ${nombre}`} />
            {/* El cuadradito de color abre el selector de color del navegador.
                Los paneles usan el color de cada tipo (se cambia en "Tipos de panel"). */}
            {!colorPorTipo && (
              <input type="color" className="muestra" value={colores[clave]}
                onChange={(e) => onCambiarColor(clave, e.target.value)} aria-label={`Color de ${nombre}`}
                title={`Cambiar color de ${nombre}`} />
            )}
            <span onClick={() => alternarCapa(clave)}>{nombre}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
