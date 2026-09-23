import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export default function LoftCanvas({ params, layers }) {
  const mountRef = useRef(null);
  const controlsRef = useRef(null);
  const [isRotating, setIsRotating] = useState(true);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;
    const w = container.clientWidth, h = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a);

    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
    camera.position.set(12, 8, 14);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    container.appendChild(renderer.domElement);

    // Habilitar OrbitControls para rotación táctil y con mouse
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = isRotating;
    controls.autoRotateSpeed = 2.0;
    controlsRef.current = controls;

    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const dl = new THREE.DirectionalLight(0xffffff, 1.0);
    dl.position.set(10, 20, 10);
    scene.add(dl);

    scene.add(new THREE.GridHelper(20, 20, 0x475569, 0x1e293b));

    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    // Materiales
    const matPil = new THREE.MeshStandardMaterial({ color: 0x94a3b8 });
    const matCol = new THREE.MeshStandardMaterial({ color: 0xef4444 });
    const matBeam = new THREE.MeshStandardMaterial({ color: 0x3b82f6 });
    const matTrans = new THREE.MeshStandardMaterial({ color: 0x06b6d4 });
    const matCor = new THREE.MeshStandardMaterial({ color: 0xeab308 });
    const matOsb = new THREE.MeshStandardMaterial({ color: 0xd97706 });
    const matPur = new THREE.MeshStandardMaterial({ color: 0x10b981, transparent: true, opacity: 0.3 });

    const { 
      frente, profundidad, altura, elevacion, anchoMezzanine, 
      filasPilotines, pilotinesPorFila,
      distanciaColumnas, pasoTirantesPiso, pasoTirantesAltillo, separacionCorreas
    } = params;

    // Pilotines
    if (layers.pilotines) {
      for (let i = 0; i < filasPilotines; i++) {
        for (let j = 0; j < pilotinesPorFila; j++) {
          const x = -frente/2 + (frente / Math.max(1, filasPilotines - 1)) * i;
          const z = -profundidad/2 + (profundidad / Math.max(1, pilotinesPorFila - 1)) * j;
          const p = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, elevacion, 16), matPil);
          p.position.set(x, elevacion / 2, z);
          rootGroup.add(p);
        }
      }
    }

    // Columnas
    if (layers.columnas) {
      const numColsLargo = Math.max(2, Math.ceil(frente / distanciaColumnas) + 1);
      const numColsAncho = Math.max(2, Math.ceil(profundidad / distanciaColumnas) + 1);

      for (let i = 0; i < numColsLargo; i++) {
        const x = -frente/2 + (frente / (numColsLargo - 1)) * i;
        [-profundidad/2, profundidad/2].forEach(z => {
          const c = new THREE.Mesh(new THREE.BoxGeometry(0.1, altura, 0.1), matCol);
          c.position.set(x, elevacion + altura / 2, z);
          rootGroup.add(c);
        });
      }
      for (let j = 1; j < numColsAncho - 1; j++) {
        const z = -profundidad/2 + (profundidad / (numColsAncho - 1)) * j;
        [-frente/2, frente/2, -frente/2 + anchoMezzanine].forEach(x => {
          const c = new THREE.Mesh(new THREE.BoxGeometry(0.1, altura, 0.1), matCol);
          c.position.set(x, elevacion + altura / 2, z);
          rootGroup.add(c);
        });
      }
    }

    // Estructura de Pisos / Entrepisos (Vigas Marco + Tirantes Transversales)
    if (layers.estructuras) {
      // Marco PB
      const vigoBase = new THREE.Mesh(new THREE.BoxGeometry(frente, 0.12, profundidad), matBeam);
      vigoBase.position.set(0, elevacion, 0);
      rootGroup.add(vigoBase);

      // Tirantes Transversales PB
      const cantTirantesPiso = Math.floor(frente / pasoTirantesPiso);
      for (let i = 0; i <= cantTirantesPiso; i++) {
        const x = -frente/2 + (i * pasoTirantesPiso);
        if (x <= frente/2) {
          const tPiso = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.10, profundidad - 0.1), matTrans);
          tPiso.position.set(x, elevacion, 0);
          rootGroup.add(tPiso);
        }
      }

      // Marco Altillo
      const vigoAltillo = new THREE.Mesh(new THREE.BoxGeometry(anchoMezzanine, 0.12, profundidad), matBeam);
      vigoAltillo.position.set(-frente/2 + anchoMezzanine/2, elevacion + 2.30, 0);
      rootGroup.add(vigoAltillo);

      // Tirantes Transversales Altillo
      const cantTirantesAltillo = Math.floor(anchoMezzanine / pasoTirantesAltillo);
      for (let i = 0; i <= cantTirantesAltillo; i++) {
        const x = -frente/2 + (i * pasoTirantesAltillo);
        if (x <= -frente/2 + anchoMezzanine) {
          const tAlt = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.10, profundidad - 0.1), matTrans);
          tAlt.position.set(x, elevacion + 2.30, 0);
          rootGroup.add(tAlt);
        }
      }
    }

    // Correas / Fajas
    if (layers.fajas) {
      const cantFajas = Math.floor(altura / separacionCorreas);
      for (let k = 1; k <= cantFajas; k++) {
        const yPos = elevacion + k * separacionCorreas;
        if (yPos < elevacion + altura) {
          const fFrente = new THREE.Mesh(new THREE.BoxGeometry(frente, 0.04, 0.04), matCor);
          fFrente.position.set(0, yPos, profundidad/2);
          rootGroup.add(fFrente);

          const fFondo = new THREE.Mesh(new THREE.BoxGeometry(frente, 0.04, 0.04), matCor);
          fFondo.position.set(0, yPos, -profundidad/2);
          rootGroup.add(fFondo);
        }
      }
    }

    // Placas de Piso
    if (layers.osb) {
      const osbPiso = new THREE.Mesh(new THREE.BoxGeometry(frente, 0.02, profundidad), matOsb);
      osbPiso.position.set(0, elevacion + 0.06, 0);
      rootGroup.add(osbPiso);

      const osbAlt = new THREE.Mesh(new THREE.BoxGeometry(anchoMezzanine, 0.02, profundidad), matOsb);
      osbAlt.position.set(-frente/2 + anchoMezzanine/2, elevacion + 2.36, 0);
      rootGroup.add(osbAlt);
    }

    // Revestimientos Muros
    if (layers.pur) {
      const pur = new THREE.Mesh(new THREE.BoxGeometry(frente, altura, profundidad), matPur);
      pur.position.set(0, elevacion + altura / 2, 0);
      rootGroup.add(pur);
    }

    let id;
    const animate = () => {
      id = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(id);
      controls.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, [params, layers, isRotating]);

  const toggleAutoRotate = () => {
    setIsRotating(!isRotating);
    if (controlsRef.current) controlsRef.current.autoRotate = !isRotating;
  };

  return (
    <div className="canvas-box" ref={mountRef}>
      <div className="canvas-controls">
        <button className="btn-ctrl" onClick={toggleAutoRotate}>
          {isRotating ? '⏸️ Pausar Rotación' : '▶️ Rotar'}
        </button>
        <span className="ctrl-tip">💡 Usá el mouse/touch para orbitar y hacer Zoom</span>
      </div>
    </div>
  );
}