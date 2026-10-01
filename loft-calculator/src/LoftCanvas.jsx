// ==========================================================
// VISOR 3D (Three.js)
// ----------------------------------------------------------
// Dibuja la estructura que arma motor/estructura.js.
//
// Para no perder memoria (memory leak) se separa en 3 efectos:
//   1. Montaje: crea UNA sola vez escena, cámara, renderer y controles.
//   2. Modelo: cuando cambian los datos, borra el grupo anterior
//      liberando geometrías (dispose) y dibuja el nuevo.
//   3. Rotación: solo prende/apaga el auto-giro.
// Antes se recreaba todo (incluido el contexto WebGL) en cada tecla,
// y el navegador terminaba avisando "Too many active WebGL contexts".
// ==========================================================

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ALTURA_PISO_ALTILLO } from './motor/constantes.js';
import { posicionAbertura } from './motor/estructura.js';

// Colores por tipo de pieza (también se usan en la leyenda).
const COLORES = {
  pilotines: 0x94a3b8,
  columnas: 0xef4444,
  marcos: 0x3b82f6,
  tirantes: 0x06b6d4,
  correas: 0xeab308,
  osb: 0xd97706,
  pur: 0x10b981,
  aberturas: 0x38bdf8,
};

const NOMBRES_CAPAS = {
  pilotines: 'Pilotines',
  columnas: 'Columnas',
  marcos: 'Marcos',
  tirantes: 'Tirantes',
  correas: 'Correas',
  osb: 'OSB',
  pur: 'PUR',
};

/** Crea los materiales una sola vez. */
function crearMateriales() {
  const transparente = (color, opacity) =>
    new THREE.MeshStandardMaterial({ color, transparent: true, opacity, depthWrite: false });
  return {
    pilotines: new THREE.MeshStandardMaterial({ color: COLORES.pilotines }),
    columnas: new THREE.MeshStandardMaterial({ color: COLORES.columnas }),
    marcos: new THREE.MeshStandardMaterial({ color: COLORES.marcos }),
    tirantes: new THREE.MeshStandardMaterial({ color: COLORES.tirantes }),
    correas: new THREE.MeshStandardMaterial({ color: COLORES.correas }),
    osb: new THREE.MeshStandardMaterial({ color: COLORES.osb }),
    pur: transparente(COLORES.pur, 0.18),
    aberturas: transparente(COLORES.aberturas, 0.7),
  };
}

/** Caja posicionada en (x, y, z). */
function caja(ancho, alto, profundo, material, x, y, z) {
  const malla = new THREE.Mesh(new THREE.BoxGeometry(ancho, alto, profundo), material);
  malla.position.set(x, y, z);
  return malla;
}

/** Pieza lineal horizontal (marco, tirante, correa) según su eje. */
function piezaLineal({ eje, largo, x, y, z }, seccion, material) {
  return eje === 'x'
    ? caja(largo, seccion, seccion, material, x, y, z)
    : caja(seccion, seccion, largo, material, x, y, z);
}

/** Arma todas las mallas del modelo dentro de `grupo`. */
function dibujarModelo(grupo, materiales, { params, estructura, aberturas, capas }) {
  const { frente, profundidad, altura, elevacion, anchoMezzanine } = params;

  if (capas.pilotines) {
    estructura.pilotines.forEach(({ x, z }) => {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, elevacion || 0.01, 16), materiales.pilotines);
      p.position.set(x, elevacion / 2, z);
      grupo.add(p);
    });
  }

  if (capas.columnas) {
    estructura.columnas.forEach(({ x, z, largo }) =>
      grupo.add(caja(0.1, largo, 0.1, materiales.columnas, x, elevacion + largo / 2, z))
    );
  }

  if (capas.marcos) estructura.marcos.forEach((m) => grupo.add(piezaLineal(m, 0.12, materiales.marcos)));
  if (capas.tirantes) estructura.tirantes.forEach((t) => grupo.add(piezaLineal(t, 0.08, materiales.tirantes)));
  if (capas.correas) estructura.correas.forEach((c) => grupo.add(piezaLineal(c, 0.04, materiales.correas)));

  if (capas.osb) {
    grupo.add(caja(frente, 0.02, profundidad, materiales.osb, 0, elevacion + 0.07, 0));
    if (anchoMezzanine > 0) {
      const yAltillo = elevacion + ALTURA_PISO_ALTILLO + 0.07;
      grupo.add(caja(anchoMezzanine, 0.02, profundidad, materiales.osb, -frente / 2 + anchoMezzanine / 2, yAltillo, 0));
    }
  }

  if (capas.pur) {
    grupo.add(caja(frente, altura, profundidad, materiales.pur, 0, elevacion + altura / 2, 0));
    grupo.add(caja(frente, 0.05, profundidad, materiales.pur, 0, elevacion + altura + 0.1, 0)); // techo
  }

  // Aberturas: siempre visibles, para ubicarlas aunque se oculte el PUR.
  aberturas.forEach((op) => {
    const { x, y, z, rotacionY } = posicionAbertura(op, params);
    const malla = new THREE.Mesh(new THREE.BoxGeometry(op.ancho, op.alto, 0.14), materiales.aberturas);
    malla.position.set(x, y, z);
    malla.rotation.y = rotacionY;
    grupo.add(malla);
  });
}

/** Libera la memoria de GPU de las geometrías del grupo y lo vacía. */
function vaciarGrupo(grupo) {
  grupo.traverse((obj) => obj.geometry?.dispose());
  grupo.clear();
}

export default function LoftCanvas({ params, estructura, aberturas }) {
  const lienzoRef = useRef(null);
  const visorRef = useRef(null); // { escena, grupo, controles, materiales, ... }
  const [autoRotar, setAutoRotar] = useState(false);
  const [capas, setCapas] = useState({
    pilotines: true, columnas: true, marcos: true, tirantes: true, correas: true, osb: true, pur: true,
  });

  // 1) MONTAJE: una sola vez.
  useEffect(() => {
    const contenedor = lienzoRef.current;
    const ancho = contenedor.clientWidth || 800;
    const alto = contenedor.clientHeight || 500;

    const escena = new THREE.Scene();
    escena.background = new THREE.Color(0x0f172a);

    const camara = new THREE.PerspectiveCamera(45, ancho / alto, 0.1, 1000);
    camara.position.set(12, 9, 15);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(ancho, alto);
    contenedor.appendChild(renderer.domElement);

    const controles = new OrbitControls(camara, renderer.domElement);
    controles.enableDamping = true; // movimiento suave
    controles.dampingFactor = 0.05;
    controles.autoRotateSpeed = 2;
    controles.target.set(0, 2, 0);

    escena.add(new THREE.AmbientLight(0xffffff, 0.85));
    const luz = new THREE.DirectionalLight(0xffffff, 1);
    luz.position.set(10, 20, 10);
    escena.add(luz);
    const grilla = new THREE.GridHelper(24, 24, 0x475569, 0x1e293b);
    escena.add(grilla);

    const grupo = new THREE.Group();
    escena.add(grupo);
    const materiales = crearMateriales();

    // Bucle de dibujo (~60 cuadros por segundo).
    let idCuadro;
    const animar = () => {
      idCuadro = requestAnimationFrame(animar);
      controles.update();
      renderer.render(escena, camara);
    };
    animar();

    // Ajustar el lienzo cuando cambia el tamaño del contenedor.
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

    visorRef.current = { grupo, controles, materiales };

    // Limpieza al desmontar: liberar TODO lo que ocupa memoria de GPU.
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
  }, [params, estructura, aberturas, capas]);

  // 3) ROTACIÓN automática.
  useEffect(() => {
    if (visorRef.current) visorRef.current.controles.autoRotate = autoRotar;
  }, [autoRotar]);

  const alternarCapa = (nombre) => setCapas((prev) => ({ ...prev, [nombre]: !prev[nombre] }));
  const colorCss = (hex) => `#${hex.toString(16).padStart(6, '0')}`;

  return (
    <div className="canvas-box">
      <div className="lienzo" ref={lienzoRef} />
      <div className="canvas-controls no-print">
        <button className="btn-ctrl" onClick={() => setAutoRotar((v) => !v)}>
          {autoRotar ? '⏸ Pausar giro' : '▶ Girar'}
        </button>
        <span className="ctrl-tip">Arrastrá para orbitar · rueda para zoom</span>
      </div>
      <div className="capas no-print" role="group" aria-label="Capas visibles">
        {Object.entries(NOMBRES_CAPAS).map(([clave, nombre]) => (
          <label key={clave} className="capa">
            <input type="checkbox" checked={capas[clave]} onChange={() => alternarCapa(clave)} />
            <span className="muestra" style={{ background: colorCss(COLORES[clave]) }} />
            {nombre}
          </label>
        ))}
      </div>
    </div>
  );
}
