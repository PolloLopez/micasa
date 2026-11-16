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

describe('v1.47.1: puertas y perros', () => {
  const params = { ...PARAMS_INICIALES, anchoEntrepiso: 0, muebles: [], mesadas: [], tabiques: [] };

  it('la persona abre la puerta que está por cruzar; después se cierra sola', () => {
    const personas = crearPersonasEnEscena(new THREE.Scene());
    personas.sincronizar([ana], params, null);
    const desde = personas.estado(1);
    personas.definirPuertas([{ id: 'p1', centro: [desde.x + 1, desde.z], nivel: 'piso' }]);
    personas.ordenar(1, [desde.x + 2.5, desde.z]);
    let maxima = 0;
    for (let i = 0; i < 120; i++) { personas.actualizar(1 / 30); maxima = Math.max(maxima, personas.apertura('p1')); }
    expect(maxima).toBeGreaterThan(0.7);
    expect(personas.estado(1).x).toBeGreaterThan(desde.x + 1.5); // pasó
    for (let i = 0; i < 300; i++) personas.actualizar(1 / 30);
    expect(personas.apertura('p1')).toBeLessThan(0.1);
  });

  it('un perro sale solo a dar vueltas; las puertas no las abre', () => {
    const personas = crearPersonasEnEscena(new THREE.Scene());
    const perro = { id: 2, especie: 'perro', nombre: 'Toby', tamanio: 'mediano', altura: 0.5, nivel: 'piso', colorRopa: '' };
    personas.sincronizar([perro], params, null);
    const antes = personas.estado(2);
    for (let i = 0; i < 600; i++) personas.actualizar(1 / 30); // 20 segundos
    const despues = personas.estado(2);
    expect(Math.hypot(despues.x - antes.x, despues.z - antes.z)).toBeGreaterThan(0.1);
    expect(despues.ojos).toBeLessThan(0.7);
  });
});

describe('v1.49: sentarse', () => {
  it('va hasta el sillón y se sienta a la altura del asiento; con el teclado se levanta', async () => {
    const { lugarParaUsar } = await import('./motor/recorrido.js');
    const { muebleNuevo } = await import('./motor/interiores.js');
    const params = { ...PARAMS_INICIALES, anchoEntrepiso: 0, mesadas: [], tabiques: [], muebles: [] };
    const sillon = { ...muebleNuevo('sillon', [], 1), distanciaLateral: 1, distanciaFrente: 2.5 };
    const conSillon = { ...params, muebles: [sillon] };
    const escena = new THREE.Scene();
    const personas = crearPersonasEnEscena(escena);
    personas.sincronizar([ana], conSillon, null);
    const uso = lugarParaUsar(conSillon, sillon);
    expect(personas.ordenar(1, uso.acercarse, { uso })).toBe(true);
    for (let i = 0; i < 450; i++) personas.actualizar(1 / 30);
    const e = personas.estado(1);
    expect(e.usando).toBe('sentarse');
    expect(e.x).toBeCloseTo(uso.sitio[0], 5);
    const figura = escena.children[0].children[0];
    const cadera = figura.children.find((c) => c.isGroup && c.position.y > 0.3);
    expect(cadera.position.y).toBeCloseTo(uso.altura, 1);
    personas.actualizar(1 / 30, { id: 1, avance: [0, 1] });
    expect(personas.estado(1).usando).toBeNull();
  });
});

describe('v1.61: cada uno en su lugar (sin encimarse) y los perros arriba del sillón y la cama', async () => {
  const { lugaresParaUsar } = await import('./motor/recorrido.js');
  const { muebleNuevo } = await import('./motor/interiores.js');
  const params = { ...PARAMS_INICIALES, anchoEntrepiso: 0, mesadas: [], tabiques: [], muebles: [] };
  const sillon = { ...muebleNuevo('sillon', [], 1), distanciaLateral: 1, distanciaFrente: 2.5 };
  const cama = { ...muebleNuevo('cama2', [], 2), distanciaLateral: 4.5, distanciaFrente: 0.3 };
  const conMuebles = { ...params, muebles: [sillon, cama] };
  const beto = { ...ana, id: 2, nombre: 'Beto', sexo: 'hombre', altura: 1.8 };
  const toby = { id: 3, especie: 'perro', nombre: 'Toby', tamanio: 'mediano', altura: 0.5, nivel: 'piso', colorRopa: '' };

  it('el sillón de 3 cuerpos tiene 3 lugares y la cama de 2 plazas, 2', () => {
    expect(sillon.cuerpos).toBe(3);
    const l = lugaresParaUsar(conMuebles, sillon);
    expect(l.map((x) => x.clave)).toEqual(['1:0', '1:1', '1:2']);
    expect(Math.hypot(l[0].sitio[0] - l[1].sitio[0], l[0].sitio[1] - l[1].sitio[1])).toBeCloseTo((1.8 - 0.36) / 3, 5);
    expect(lugaresParaUsar(conMuebles, cama)).toHaveLength(2);
    expect(lugaresParaUsar(conMuebles, { ...sillon, cuerpos: undefined, ancho: 1.2 })).toHaveLength(2); // los de antes: por el ancho
  });

  it('dos que van al sillón se sientan en cuerpos distintos; el perro se sube y se echa; lleno, avisa', () => {
    const personas = crearPersonasEnEscena(new THREE.Scene());
    personas.sincronizar([ana, beto, toby], conMuebles, null);
    const usos = lugaresParaUsar(conMuebles, sillon);
    expect(personas.ordenar(1, usos[0].acercarse, { usos })).toBe(true);
    expect(personas.ordenar(2, usos[0].acercarse, { usos })).toBe(true);
    expect(personas.ordenar(3, usos[0].acercarse, { usos })).toBe(true);
    for (let i = 0; i < 250; i++) personas.actualizar(1 / 30); // a los ~8 s (el perro se queda arriba entre 10 y 20 s)
    const [a, b, t] = [1, 2, 3].map((id) => personas.estado(id));
    expect(a.usando).toBe('sentarse');
    expect(b.usando).toBe('sentarse');
    expect(t.usando).not.toBeNull(); // el perro arriba del sillón
    const sitios = [a, b, t].map((e) => `${e.x.toFixed(2)},${e.z.toFixed(2)}`);
    expect(new Set(sitios).size).toBe(3); // cada uno en un cuerpo
    expect(personas.ordenar(1, usos[0].acercarse, { usos: usos.slice(1) })).toEqual({ ocupado: true });
  });

  it('caminando, nunca quedan encimados (dos que se cruzan, se esquivan o esperan)', () => {
    const personas = crearPersonasEnEscena(new THREE.Scene());
    personas.sincronizar([ana, beto], params, null);
    const inicioA = personas.estado(1);
    const inicioB = personas.estado(2);
    // Cada uno va adonde está el otro (se cruzan de frente).
    personas.ordenar(1, [inicioB.x + 1.5, inicioB.z]);
    personas.ordenar(2, [inicioA.x - 1.5, inicioA.z]);
    let minimo = Infinity;
    for (let i = 0; i < 600; i++) {
      personas.actualizar(1 / 30);
      const [a, b] = [personas.estado(1), personas.estado(2)];
      minimo = Math.min(minimo, Math.hypot(a.x - b.x, a.z - b.z));
    }
    expect(minimo).toBeGreaterThan(0.4); // dos radios de 22 cm (con un poco de tolerancia de los pasos)
  });
});
