// Tests del recorrido de las personas y de las paredes que tapan (v1.45). Correr con: npm test
import { describe, it, expect } from 'vitest';
import { mapaDelNivel, buscarCamino, puntoLibre, moverConChoque, accionPorAltura, ladosQueTapan, libreMasCercano } from './recorrido.js';
import { personaNueva, validarPersona, completarPersona } from './personas.js';
import { muebleNuevo, ubicarMueble } from './interiores.js';
import { tabiqueNuevo } from './tabiques.js';
import { validarParametros } from './validacion.js';
import { migrarParams } from './migracion.js';
import { PARAMS_INICIALES } from './parametrosIniciales.js';

// Casa sin entrepiso de 7,50 x 4,50 (el centro de la planta es el 0, 0).
const casa = (cambios = {}) => ({ ...PARAMS_INICIALES, anchoEntrepiso: 0, muebles: [], mesadas: [], tabiques: [], ...cambios });
const largoDe = (desde, camino) => camino.reduce((acc, q, i) => acc + Math.hypot(q[0] - (i ? camino[i - 1] : desde)[0], q[1] - (i ? camino[i - 1] : desde)[1]), 0);

describe('mapa de la planta', () => {
  it('adentro se puede estar; pegado a la pared o afuera, no', () => {
    const mapa = mapaDelNivel(casa());
    expect(puntoLibre(mapa, [0, 0])).toBe(true);
    expect(puntoLibre(mapa, [3.7, 0])).toBe(false); // contra la pared (el cuerpo no entra)
    expect(puntoLibre(mapa, [10, 0])).toBe(false);
  });

  it('un mueble ocupa su lugar (agrandado por el cuerpo); una alacena colgada no corta el paso', () => {
    const cama = { ...muebleNuevo('cama2', [], 1), distanciaLateral: 2, distanciaFrente: 1 };
    const alacena = { ...muebleNuevo('alacena', [], 2), distanciaLateral: 5, distanciaFrente: 1 };
    const p = casa({ muebles: [cama, alacena] });
    const mapa = mapaDelNivel(p);
    expect(puntoLibre(mapa, ubicarMueble(p, cama).centro)).toBe(false);
    expect(puntoLibre(mapa, ubicarMueble(p, alacena).centro)).toBe(true);
  });
});

describe('camino', () => {
  it('en línea recta si no hay nada en el medio', () => {
    const mapa = mapaDelNivel(casa());
    const camino = buscarCamino(mapa, [-2, 0], [2, 0]);
    expect(camino).toEqual([[2, 0]]);
  });

  it('rodea un tabique y pasa por el hueco de su puerta', () => {
    // Tabique que sale de la pared de frente y cruza casi toda la planta, con una puerta.
    const base = tabiqueNuevo([], 1);
    const t = { ...base, lado: 'A', orientacion: 'perpendicular', ladoReferencia: 'izquierda', desde: 3.75, largo: 4.38,
      puerta: { ...base.puerta, tipo: 'abatir', desde: 2.5, ancho: 0.8 } };
    const p = casa({ tabiques: [t] });
    const mapa = mapaDelNivel(p);
    expect(puntoLibre(mapa, [0, 0.5])).toBe(false); // sobre el tabique
    const desde = [-2, 1];
    const camino = buscarCamino(mapa, desde, [2, 1]);
    expect(camino.length).toBeGreaterThan(1); // dobla para pasar por la puerta
    expect(largoDe(desde, camino)).toBeGreaterThan(4.1); // más largo que la recta (4 m)
    // Pasa por el hueco: algún tramo cruza x = 0 cerca de la puerta (z de -0.3 a 0.5 hacia el fondo).
    const cruce = camino.some((q, i) => { const a = i ? camino[i - 1] : desde; return (a[0] < 0) !== (q[0] < 0); });
    expect(cruce).toBe(true);
    // Sin puerta no hay forma de pasar del otro lado.
    const cerrado = mapaDelNivel(casa({ tabiques: [{ ...t, puerta: { ...t.puerta, tipo: 'ninguna' } }] }));
    expect(buscarCamino(cerrado, desde, [2, 1])).toEqual([]);
  });

  it('si el destino está ocupado va a lo libre más cercano', () => {
    const cama = { ...muebleNuevo('cama2', [], 1), distanciaLateral: 2, distanciaFrente: 1 };
    const p = casa({ muebles: [cama] });
    const mapa = mapaDelNivel(p);
    const camino = buscarCamino(mapa, [-3, 1.5], ubicarMueble(p, cama).centro);
    expect(camino.length).toBeGreaterThan(0);
    expect(puntoLibre(mapa, camino.at(-1))).toBe(true);
    expect(libreMasCercano(mapa, [0, 0])).not.toBeNull();
  });
});

describe('teclado y acciones', () => {
  it('contra la pared se desliza', () => {
    const mapa = mapaDelNivel(casa());
    const [x, z] = moverConChoque(mapa, [3.4, 0], [0.5, 0.1]);
    expect(x).toBe(3.4); // no atraviesa la pared
    expect(z).toBeCloseTo(0.1);
  });

  it('abajo se agacha, al pecho estira el brazo, arriba se estira; en el piso solo camina', () => {
    expect(accionPorAltura(0)).toBeNull();
    expect(accionPorAltura(0.3)).toBe('agacharse');
    expect(accionPorAltura(1.1)).toBe('alcanzar');
    expect(accionPorAltura(1.75)).toBe('estirarse');
    expect(accionPorAltura(1.75, 2)).toBe('alcanzar'); // alguien alto llega sin estirarse
  });
});

describe('paredes que tapan', () => {
  it('desde el frente, en diagonal y alto: se ocultan el frente, el lateral de ese lado y el techo', () => {
    const p = casa();
    expect([...ladosQueTapan(p, [0, 1.6, 10])]).toEqual(['A']); // a la altura de los ojos: el techo no tapa
    expect([...ladosQueTapan(p, [10, 12, 10])].sort()).toEqual(['A', 'B', 'techo']);
    expect(ladosQueTapan(p, [0, 1.6, 0]).size).toBe(0); // adentro no se oculta nada
  });
});

describe('personas en el proyecto', () => {
  it('nuevas alternan mujer y hombre con su altura; se validan', () => {
    const a = personaNueva([], 1);
    const b = personaNueva([a], 2);
    expect([a.sexo, a.altura, b.sexo, b.altura]).toEqual(['mujer', 1.62, 'hombre', 1.75]);
    expect(validarPersona(a, casa())).toBeNull();
    expect(validarPersona({ ...a, altura: 3 }, casa())).toMatch(/altura/);
    expect(validarPersona({ ...a, nivel: 'piso2' }, casa())).toMatch(/entrepiso/);
    expect(completarPersona({ id: 1, nombre: 'x', sexo: 'mujer', altura: 1.6 })).toMatchObject({ nivel: 'piso' });
  });

  it('los proyectos de antes arrancan sin personas y validan', () => {
    const { personas, ...viejo } = PARAMS_INICIALES;
    expect(personas).toEqual([]);
    const migrado = migrarParams(viejo);
    expect(migrado.personas).toEqual([]);
    expect(validarParametros({ ...migrado, personas: [personaNueva([], 1)] })).toEqual({});
  });
});

describe('v1.47.1: baño chico, plato de ducha y debajo de la escalera', () => {
  it('el plato de ducha se pisa (no corta el paso)', () => {
    const ducha = { ...muebleNuevo('ducha', [], 1), distanciaLateral: 3, distanciaFrente: 1.5 };
    const p = casa({ muebles: [ducha] });
    expect(puntoLibre(mapaDelNivel(p), ubicarMueble(p, ducha).centro)).toBe(true);
  });

  it('debajo de la escalera: pasa agachándose donde el escalón queda alto, no donde queda bajo', async () => {
    const { generarEstructura } = await import('./estructura.js');
    const { techoEn } = await import('./recorrido.js');
    const p = { ...PARAMS_INICIALES };
    const e = generarEstructura(p, []);
    const escalones = e.escalera.escalones;
    const yPiso = mapaDelNivel(p, 'piso', e).y;
    const bajo = escalones[1];
    const alto = escalones.at(-1);
    const mapa = mapaDelNivel(p, 'piso', e, { altoPersona: 1.75 });
    expect(puntoLibre(mapa, [bajo.centro[0], bajo.centro[2]])).toBe(false);
    const libreArriba = alto.centro[1] - 0.06 - yPiso;
    if (libreArriba >= 0.8 * 1.75 && libreArriba < 1.78) {
      expect(puntoLibre(mapa, [alto.centro[0], alto.centro[2]])).toBe(true);
      expect(techoEn(mapa, [alto.centro[0], alto.centro[2]])).toBeCloseTo(libreArriba, 2);
    }
  });
});
