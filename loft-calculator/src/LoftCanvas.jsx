import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function LoftCanvas({ params }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;
    const w = container.clientWidth, h = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1e293b);

    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
    camera.position.set(12, 8, 14);
    camera.lookAt(0, 2, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const dl = new THREE.DirectionalLight(0xffffff, 0.8);
    dl.position.set(10, 20, 10);
    scene.add(dl);

    scene.add(new THREE.GridHelper(20, 20, 0x64748b, 0x334155));

    const group = new THREE.Group();
    scene.add(group);

    const matCol = new THREE.MeshStandardMaterial({ color: 0xef4444 });
    const matBeam = new THREE.MeshStandardMaterial({ color: 0x3b82f6 });
    const matPur = new THREE.MeshStandardMaterial({ color: 0x10b981, transparent: true, opacity: 0.3 });
    const matOsb = new THREE.MeshStandardMaterial({ color: 0xd97706 });
    const matPil = new THREE.MeshStandardMaterial({ color: 0x94a3b8 });

    const { frente, profundidad, altura, elevacion, anchoMezzanine } = params;

    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 3; j++) {
        const x = -frente/2 + (frente / 3) * i;
        const z = -profundidad/2 + (profundidad / 2) * j;
        const p = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, elevacion, 16), matPil);
        p.position.set(x, elevacion / 2, z);
        group.add(p);
      }
    }

    [
      [-frente/2, -profundidad/2], [0, -profundidad/2], [frente/2, -profundidad/2],
      [-frente/2, profundidad/2],  [0, profundidad/2],  [frente/2, profundidad/2],
      [-frente/2 + anchoMezzanine, -profundidad/2], [-frente/2 + anchoMezzanine, profundidad/2]
    ].forEach(([x, z]) => {
      const c = new THREE.Mesh(new THREE.BoxGeometry(0.1, altura, 0.1), matCol);
      c.position.set(x, elevacion + altura / 2, z);
      group.add(c);
    });

    const osb = new THREE.Mesh(new THREE.BoxGeometry(frente, 0.02, profundidad), matOsb);
    osb.position.set(0, elevacion + 0.01, 0);
    group.add(osb);

    const mez = new THREE.Mesh(new THREE.BoxGeometry(anchoMezzanine, 0.08, profundidad), matBeam);
    mez.position.set(-frente/2 + anchoMezzanine/2, elevacion + 2.30, 0);
    group.add(mez);

    const pur = new THREE.Mesh(new THREE.BoxGeometry(frente, altura, profundidad), matPur);
    pur.position.set(0, elevacion + altura / 2, 0);
    group.add(pur);

    let id;
    const animate = () => {
      id = requestAnimationFrame(animate);
      group.rotation.y += 0.002;
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(id);
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, [params]);

  return <div className="canvas-box" ref={mountRef} />;
}