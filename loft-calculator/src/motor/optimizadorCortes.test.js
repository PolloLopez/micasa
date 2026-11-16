// Tests del optimizador de cortes (v1.63: mejor acomodo, retazos y desperdicio real). Correr con: npm test
import { describe, it, expect } from 'vitest';
import { optimizarCortes, RETAZO_UTIL } from './optimizadorCortes.js';

describe('v1.63: menos barras y retazos aprovechables', () => {
  it('encuentra el acomodo que el primer ajuste no ve (barras de 10: 5+3+2 y 4+3+3)', () => {
    const r = optimizarCortes([5, 4, 3, 3, 3, 2], 10, 0);
    expect(r.totalBarras).toBe(2);
    expect(r.barras.flatMap((b) => b.piezas).sort()).toEqual([2, 3, 3, 3, 4, 5]);
    r.barras.forEach((b) => expect(b.piezas.reduce((a, x) => a + x, 0)).toBeLessThanOrEqual(10));
  });

  it('con merma por corte: nunca se pasa del largo de la barra', () => {
    const piezas = [2.95, 2.95, 2.1, 2.1, 1.4, 1.4, 1.4, 0.9, 0.9, 0.6, 0.6, 0.45];
    const r = optimizarCortes(piezas, 6, 0.003);
    r.barras.forEach((b) => expect(b.piezas.reduce((a, x) => a + x, 0) + 0.003 * (b.piezas.length - 1)).toBeLessThanOrEqual(6 + 1e-9));
    expect(r.barras.flatMap((b) => b.piezas).length).toBe(piezas.length);
    expect(r.totalBarras).toBe(Math.ceil(piezas.reduce((a, x) => a + x, 0) / 6)); // 3 barras: el mínimo posible
  });

  it('los sobrantes largos son retazos (no se tiran); lo corto, desperdicio', () => {
    const r = optimizarCortes([4, 5.9], 6, 0);
    expect(r.retazos).toEqual([2]); // de la barra con 4 m sobran 2 m: retazo
    expect(r.metrosRetazos).toBeCloseTo(2, 9);
    expect(r.metrosTirados).toBeCloseTo(0.1, 9); // los 10 cm de la otra
    expect(RETAZO_UTIL).toBe(0.3);
  });
});
