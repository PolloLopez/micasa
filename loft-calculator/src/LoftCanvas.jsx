import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export default function LoftCanvas({ params, layers }) {
  const mountRef = useRef(null);
  const [isRotating, setIsRotating] = useState(true);
  const rotationDirection = useRef(1);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rootGroupRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;
    const w = container.clientWidth, h = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
    camera.position.set(12, 8, 14);
    camera.lookAt(0, 2, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const dl = new THREE.DirectionalLight(0xffffff, 0.9);
    dl.position.set(10, 20, 10);
    scene.add(dl);

    scene.add(new THREE.GridHelper(20, 20, 0x475569, 0x1e293b));

    const rootGroup = new THREE.Group();
    scene.add(rootGroup);
    rootGroupRef.current = rootGroup;

    // Materiales con colores representativos
    const matPil = new THREE.MeshStandardMaterial({ color: 0x94a3b8 });
    const matCol = new THREE.MeshStandardMaterial({ color: 0xef4444 }); // Rojo: Columnas
    const matBeam = new THREE.MeshStandardMaterial({ color: 0x3b82f6 }); // Azul: Vigas Marcos
    const matTrans = new THREE.MeshStandardMaterial({ color: 0x06b6d4 }); // Celeste: Transversales
    const matCor = new THREE.MeshStandardMaterial({ color: 0xeab308 });  // Amarillo: Fajas
    const matOsb = new THREE.MeshStandardMaterial({ color: 0xd97706 });  // Madera: Fenólico / OSB
    const matPur = new THREE.MeshStandardMaterial({ color: 0x10b981, transparent: true, opacity: 0.25 }); // Verde: Muros

    const { 
      frente, profundidad, altura, elevacion, anchoMezzanine, 
      filasPilotines, pilotinesPorFila,
      distanciaColumnas, pasoTirantesPiso, pasoTirantesAltillo, separacionCorreas
    } = params;

    // --- CAPA 1: PILOTINES ---
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

    // --- CAPA 2: COLUMNAS PRINCIPALES Y SECUNDARIAS ---
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

    // --- CAPA 3: ESTRUCTURA PISO, ALTILLO Y TRANSVERSALES ---
    if (layers.estructuras) {
      // Vigas Marco Perimetral Base
      const vigoBase = new THREE.Mesh(new THREE.BoxGeometry(frente, 0.12, profundidad), matBeam);
      vigoBase.position.set(0, elevacion, 0);
      rootGroup.add(vigoBase);

      // Transversales Perfil C de Piso PB
      const cantTirantesPiso = Math.floor(frente / pasoTirantesPiso);
      for (let i = 0; i <= cantTirantesPiso; i++) {
        const x = -frente/2 + (i * pasoTirantesPiso);
        if (x <= frente/2) {
          const tPiso = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.10, profundidad - 0.1), matTrans);
          tPiso.position.set(x, elevacion, 0);
          rootGroup.add(tPiso);
        }
      }

      // Vigas Marco Altillo (+2.30m)
      const vigoAltillo = new THREE.Mesh(new THREE.BoxGeometry(anchoMezzanine, 0.12, profundidad), matBeam);
      vigoAltillo.position.set(-frente/2 + anchoMezzanine/2, elevacion + 2.30, 0);
      rootGroup.add(vigoAltillo);

      // Transversales Perfil C de Altillo
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

    // --- CAPA 4: FAJAS Y CORREAS DE PAREDES/TECHO ---
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

    // --- CAPA 5: PLACAS FENÓLICO / OSB ---
    if (layers.osb) {
      const osbPiso = new THREE.Mesh(new THREE.BoxGeometry(frente, 0.02, profundidad), matOsb);
      osbPiso.position.set(0, elevacion + 0.06, 0);
      rootGroup.add(osbPiso);

      const osbAlt = new THREE.Mesh(new THREE.BoxGeometry(anchoMezzanine, 0.02, profundidad), matOsb);
      osbAlt.position.set(-frente/2 + anchoMezzanine/2, elevacion + 2.36, 0);
      rootGroup.add(osbAlt);
    }

    // --- CAPA 6: REVESTIMIENTO PUR / CEMENTICIA / CHAPA ---
    if (layers.pur) {
      const pur = new THREE.Mesh(new THREE.BoxGeometry(frente, altura, profundidad), matPur);
      pur.position.set(0, elevacion + altura / 2, 0);
      rootGroup.add(pur);
    }

    let id;
    const animate = () => {
      id = requestAnimationFrame(animate);
      if (rootGroupRef.current && isRotating) {
        rootGroupRef.current.rotation.y += 0.003 * rotationDirection.current;
      }
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(id);
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, [params, layers, isRotating]);

  const setPresetView = (view) => {
    if (!cameraRef.current || !rootGroupRef.current) return;
    rootGroupRef.current.rotation.y = 0;
    if (view === 'front') cameraRef.current.position.set(0, 3, 16);
    else if (view === 'top') cameraRef.current.position.set(0, 18, 0.1);
    else if (view === 'side') cameraRef.current.position.set(16, 3, 0);
    else cameraRef.current.position.set(12, 8, 14);
    cameraRef.current.lookAt(0, 2, 0);
  };

  return (
    <div className="canvas-box" ref={mountRef}>
      <div className="canvas-controls">
        <button className="btn-ctrl" onClick={() => setIsRotating(!isRotating)}>
          {isRotating ? '⏸️ Pausar' : '▶️ Girar'}
        </button>
        <button className="btn-ctrl" onClick={() => { rotationDirection.current = -1; setIsRotating(true); }}>
          ↺ Izq
        </button>
        <button className="btn-ctrl" onClick={() => { rotationDirection.current = 1; setIsRotating(true); }}>
          ↻ Der
        </button>
        <div className="view-divider">|</div>
        <button className="btn-ctrl" onClick={() => setPresetView('iso')}>📐 3D</button>
        <button className="btn-ctrl" onClick={() => setPresetView('front')}>🔲 Frente</button>
        <button className="btn-ctrl" onClick={() => setPresetView('top')}>🔝 Planta</button>
        <button className="btn-ctrl" onClick={() => setPresetView('side')}>📐 Lateral</button>
      </div>
    </div>
  );
}