// Tests de las personas del 3D (v1.45): la figura, las poses y el caminar. Correr con: npm test
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { crearFigura, angulosDePose, aplicarPose, alturaDeOjos, crearPersonasEnEscena } from './personas3d.js';
import { PARAMS_INICIALES } from './motor/parametrosIniciales.js';

const ana = { id: 1, nombre: 'Ana', sexo: 'mujer', altura: 1.6, nivel: 'piso', colorRopa: '' };

describe('figura y poses', () => {
  it('parada mide lo que se cargó; agachada, la cadera y los ojos bajan', () => {
    const f = crearFigura(ana);
    aplicarPose(f, angulosDePose('quieta'), 1);
    const caja = new THREE.Box3().setFromObject(f.raiz);
    expect(caja.max.y).toBeGreaterThan(1.55);
    expect(caja.max.y).toBeLessThan(1.7);
    const ojosParada = alturaDeOjos(f);
    expect(ojosParada).toBeGreaterThan(1.4);
    const caderaParada = f.juntas.cadera.position.y;
    aplicarPose(f, angulosDePose('agacharse'), 1);
    expect(f.juntas.cadera.position.y).toBeLessThan(caderaParada * 0.7);
    expect(alturaDeOjos(f)).toBeLessThan(ojosParada * 0.8);
  });

  it('caminando, cada pierna va para un lado', () => {
    const a = angulosDePose('caminar', Math.PI / 2);
    expect(Math.sign(a.ingleI)).toBe(-Math.sign(a.ingleD));
  });
});

describe('personas en la escena', () => {
  const params = { ...PARAMS_INICIALES, anchoEntrepiso: 0, muebles: [], mesadas: [], tabiques: [] };

  it('caminan hasta donde se las manda y al llegar hacen la acción', () => {
    const escena = new THREE.Scene();
    const personas = crearPersonasEnEscena(escena);
    personas.sincronizar([ana], params, null);
    expect(personas.ordenar(1, [2, 1], { accion: 'agacharse', mirarA: [2.5, 1] })).toBe(true);
    for (let i = 0; i < 300; i++) personas.actualizar(1 / 30); // 10 segundos
    const e = personas.estado(1);
    expect(e.x).toBeCloseTo(2, 1);
    expect(e.z).toBeCloseTo(1, 1);
    // A un punto fuera de la casa no hay forma de llegar más que hasta la pared (va a lo libre más cercano).
    personas.ordenar(1, [20, 0]);
    for (let i = 0; i < 300; i++) personas.actualizar(1 / 30);
    expect(personas.estado(1).x).toBeLessThan(params.largo / 2);
    personas.liberar();
  });

  it('con el teclado avanza y no atraviesa la pared', () => {
    const personas = crearPersonasEnEscena(new THREE.Scene());
    personas.sincronizar([ana], params, null);
    for (let i = 0; i < 300; i++) personas.actualizar(1 / 30, { id: 1, avance: [1, 0] });
    expect(personas.estado(1).x).toBeLessThan(params.largo / 2 - 0.06);
    expect(personas.estado(1).x).toBeGreaterThan(params.largo / 2 - 0.5);
    personas.sincronizar([], params, null); // se quitó
    expect(personas.estado(1)).toBeNull();
  });
});
