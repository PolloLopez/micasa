import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function LoftCanvas({ params, layers }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;
    const w = container.clientWidth, h = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a);

    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
    camera.position.set(12, 8, 14);
    camera.lookAt(0, 2, 0);

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

    // Materiales con colores parametrizados
    const matPil = new THREE.MeshStandardMaterial({ color: 0x94a3b8 });
    const matCol = new THREE.MeshStandardMaterial({ color: 0xef4444 }); // Rojo
    const matBeam = new THREE.MeshStandardMaterial({ color: 0x3b82f6 }); // Azul
    const matCor = new THREE.MeshStandardMaterial({ color: 0xeab308 });  // Amarillo
    const matOsb = new THREE.MeshStandardMaterial({ color: 0xd97706 });  // Madera
    const matPur = new THREE.MeshStandardMaterial({ color: 0x10b981, transparent: true, opacity: 0.25 }); // Verde

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

      // Perímetro exterior
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

    // --- CAPA 3: ESTRUCTURA PISO, ALTILLO Y VIGAS ---
    if (layers.estructuras) {
      // Vigas Marco Base Piso
      const vigoBase = new THREE.Mesh(new THREE.BoxGeometry(frente, 0.1, profundidad), matBeam);
      vigoBase.position.set(0, elevacion, 0);
      rootGroup.add(vigoBase);

      // Tirantes de Piso (+0.50m)
      const cantTirantesPiso = Math.floor(frente / pasoTirantesPiso);
      for (let i = 0; i <= cantTirantesPiso; i++) {
        const x = -frente/2 + (i * pasoTirantesPiso);
        if (x <= frente/2) {
          const tPiso = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.08, profundidad), matBeam);
          tPiso.position.set(x, elevacion, 0);
          rootGroup.add(tPiso);
        }
      }

      // Tirantes de Altillo / Mezzanine (+2.30m)
      const cantTirantesAltillo = Math.floor(anchoMezzanine / pasoTirantesAltillo);
      for (let i = 0; i <= cantTirantesAltillo; i++) {
        const x = -frente/2 + (i * pasoTirantesAltillo);
        if (x <= -frente/2 + anchoMezzanine) {
          const tAlt = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.1, profundidad), matBeam);
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

    // --- CAPA 5: PLACAS OSB ---
    if (layers.osb) {
      // OSB Piso
      const osbPiso = new THREE.Mesh(new THREE.BoxGeometry(frente, 0.02, profundidad), matOsb);
      osbPiso.position.set(0, elevacion + 0.05, 0);
      rootGroup.add(osbPiso);

      // OSB Altillo
      const osbAlt = new THREE.Mesh(new THREE.BoxGeometry(anchoMezzanine, 0.02, profundidad), matOsb);
      osbAlt.position.set(-frente/2 + anchoMezzanine/2, elevacion + 2.35, 0);
      rootGroup.add(osbAlt);
    }

    // --- CAPA 6: REVESTIMIENTO PUR ---
    if (layers.pur) {
      const pur = new THREE.Mesh(new THREE.BoxGeometry(frente, altura, profundidad), matPur);
      pur.position.set(0, elevacion + altura / 2, 0);
      rootGroup.add(pur);
    }

    let id;
    const animate = () => {
      id = requestAnimationFrame(animate);
      rootGroup.rotation.y += 0.002;
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(id);
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, [params, layers]);

  return <div className="canvas-box" ref={mountRef} />;
}