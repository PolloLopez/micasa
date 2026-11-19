// Tests de los tirantes de madera por largo comercial (v1.77). Correr con: npm test
import { describe, it, expect } from 'vitest';
import { tablasDeMadera, LARGOS_MADERA } from './maderaComercial.js';

describe('tablasDeMadera', () => {
  it('tirantes de 3,40 m: una de 3,66 cada uno (no la de 4,27)', () => {
    const r = tablasDeMadera([3.4, 3.4, 3.4]);
    expect(r.tablas).toEqual([{ largo: 3.66, cantidad: 3 }]);
    expect(r.metros).toBeCloseTo(10.98, 6);
    expect(r.sobra).toBeCloseTo(0.78, 6);
    expect(r.detalle).toBe('3 de 3,66 m (3 tirantes, sobran 0,78 m)');
  });
  it('dos tirantes cortos salen de una misma tabla', () => {
    const r = tablasDeMadera([1.8, 1.8, 1.8, 1.8]);
    expect(r.tablas).toEqual([{ largo: 3.66, cantidad: 2 }]); // 1,80 + 1,80 + sierra = 3,605 ≤ 3,66
  });
  it('mezcla de largos: cada uno con lo que menos compra', () => {
    const r = tablasDeMadera([4.0, 2.9]);
    expect(r.metros).toBeLessThanOrEqual(4.27 + 3.05 + 1e-9);
    expect(r.tablas.reduce((a, t) => a + t.cantidad, 0)).toBe(2);
  });
  it('más largo que la tabla más larga: va empalmado', () => {
    const r = tablasDeMadera([6]);
    expect(r.tablas).toEqual([{ largo: 3.05, cantidad: 2 }]); // 2 x 3,05 = 6,10 ≥ 6
    expect(tablasDeMadera([9.5]).metros).toBeGreaterThanOrEqual(9.5);
  });
  it('nunca compra menos de lo que lleva, y sin tirantes no lleva nada', () => {
    [[2.5, 3.2, 4.1, 1.2], [3.05, 3.05], [0.6, 0.6, 0.6, 0.6, 0.6, 0.6]].forEach((l) => {
      expect(tablasDeMadera(l).metros).toBeGreaterThanOrEqual(l.reduce((a, x) => a + x, 0) - 1e-9);
    });
    expect(tablasDeMadera([])).toMatchObject({ tablas: [], metros: 0, detalle: 'no lleva' });
    expect(LARGOS_MADERA).toEqual([3.05, 3.66, 4.27, 4.88]);
  });
});
