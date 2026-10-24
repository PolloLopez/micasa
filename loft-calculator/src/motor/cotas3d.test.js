// Tests de las cotas generales del 3D (v1.28). Correr con: npm test
import { describe, it, expect } from 'vitest';
import { cotasGenerales } from './cotas3d.js';
import { PARAMS_INICIALES as P } from './parametrosIniciales.js';

const largoDe = ({ desde, hasta }) => Math.hypot(...desde.map((v, i) => hasta[i] - v));

describe('cotas generales', () => {
  const cotas = cotasGenerales(P);

  it('largo del frente y del lateral derecho, afuera de la pared y en el suelo', () => {
    expect(cotas[0].texto).toBe('7.50 m');
    expect(largoDe(cotas[0])).toBeCloseTo(7.5);
    expect(cotas[0].desde[2]).toBeGreaterThan(P.ancho / 2); // frente = A (z+): la cota queda más afuera
    expect(cotas[1].texto).toBe('4.50 m');
  });

  it('altos en las esquinas: con pendiente, el del fondo es distinto', () => {
    const altos = cotas.slice(2, 5);
    altos.forEach((c) => expect(c.desde[1]).toBeCloseTo(P.elevacion)); // arrancan en el piso del loft
    expect(altos.map((c) => largoDe(c))).toContainEqual(expect.closeTo(P.altura, 5));
    expect(new Set(altos.map((c) => c.texto)).size).toBe(2); // 4.95 (frente) y 4.50 (fondo)
  });

  it('elevación sobre el terreno solo si hay', () => {
    expect(cotas.at(-1).texto).toBe('elev. 0.50 m');
    expect(cotasGenerales({ ...P, elevacion: 0 }).some((c) => c.texto.startsWith('elev.'))).toBe(false);
  });

  it('con otro frente, la cota del largo va sobre ese lado', () => {
    const conB = cotasGenerales({ ...P, ladoFrente: 'B' });
    expect(conB[0].texto).toBe('4.50 m');
    expect(conB[0].desde[0]).toBeGreaterThan(P.largo / 2); // B = x+
  });
});
