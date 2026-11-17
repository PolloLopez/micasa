// Tests de los empalmes (v1.68). Correr con: npm test
import { describe, it, expect } from 'vitest';
import { apoyosDePieza, tramosDeEmpalme } from './empalmes.js';
import { optimizarCortes } from './optimizadorCortes.js';

describe('apoyos de una pieza', () => {
  it('donde la cruzan otras (no las paralelas ni las que pasan lejos)', () => {
    const correa = { id: 'c', desde: [0, 3, 0], hasta: [7.5, 3, 0] };
    const vigas = [0, 2.5, 5, 7.5].map((x, i) => ({ id: `v${i}`, desde: [x, 3.08, -2], hasta: [x, 3.08, 2] })); // apoyadas debajo (8 cm)
    const paralela = { id: 'p', desde: [0, 3, 0.05], hasta: [7.5, 3, 0.05] };
    const lejos = { id: 'l', desde: [3, 4, -2], hasta: [3, 4, 2] };
    expect(apoyosDePieza(correa, [correa, ...vigas, paralela, lejos])).toEqual([2.5, 5]); // las puntas no cuentan
  });
});

describe('tramos de un empalme', () => {
  it('sin apoyos: barra entera + el resto (como antes)', () => {
    expect(tramosDeEmpalme(7.5, 6, [])).toEqual({ tramos: [6, 1.5], sobreApoyo: false });
  });
  it('con apoyos: la unión cae sobre uno; "largo" o "parejo"', () => {
    const apoyos = [1.5, 3, 4.5, 6];
    expect(tramosDeEmpalme(7.5, 6, apoyos, 'largo')).toEqual({ tramos: [6, 1.5], sobreApoyo: true });
    const parejo = tramosDeEmpalme(7.5, 6, apoyos, 'parejo');
    expect([...parejo.tramos].sort()).toEqual([3, 4.5]); // los dos tramos de menos de 5 m
    expect(parejo.sobreApoyo).toBe(true);
    // 13 m con barras de 6 y apoyos cada 2,5: 3 tramos, todos sobre apoyos.
    const r = tramosDeEmpalme(13, 6, [2.5, 5, 7.5, 10, 12.5], 'largo');
    expect(r.tramos).toEqual([5, 5, 3]);
    expect(r.sobreApoyo).toBe(true);
  });
  it('si entre dos apoyos hay más que una barra, como antes (sin apoyo)', () => {
    expect(tramosDeEmpalme(9, 6, [8], 'largo').sobreApoyo).toBe(false);
  });
});

describe('optimizador con empalmes, disco y retazo del herrero', () => {
  it('elige la forma de empalmar que gasta menos barras', () => {
    // Dos correas de 7,50 con apoyos cada 1,50 y dos piezas de 4,40. Barras de 6.
    // "largo": 6+1,5 y 6+1,5 → 6, 6, 4,4+1,5, 4,4+1,5 = 4 barras.
    // "parejo": 4,5+3 y 4,5+3 → 4,5, 4,5, 3+3, 4,4, 4,4 = 5 barras: se queda con "largo".
    const apoyos = [1.5, 3, 4.5, 6];
    const r = optimizarCortes([{ largo: 7.5, id: 'a', apoyos }, { largo: 7.5, id: 'b', apoyos }, { largo: 4.4, id: 'x' }, { largo: 4.4, id: 'y' }], 6, 0);
    expect(r.totalBarras).toBe(4);
    expect(r.empalmes.map((e) => e.tramos)).toEqual([[6, 1.5], [6, 1.5]]);
    expect(r.empalmes.every((e) => e.sobreApoyo)).toBe(true);
    // Cada barra sabe qué pieza (id) y qué tramo lleva.
    expect(r.barras.flatMap((b) => b.ids).sort()).toEqual(['a', 'a', 'b', 'b', 'x', 'y']);
  });
  it('el disco y el retazo mínimo se pueden cambiar', () => {
    const base = optimizarCortes([2, 2, 2], 6, { merma: 0 });
    expect(base.totalBarras).toBe(1);
    expect(optimizarCortes([2, 2, 2], 6, { merma: 0.005 }).totalBarras).toBe(2); // con 5 mm por corte ya no entran
    expect(optimizarCortes([5.5], 6, { merma: 0, retazoUtil: 0.6 }).retazos).toEqual([]); // 0,50 < 0,60: se tira
    expect(optimizarCortes([5.5], 6, { merma: 0, retazoUtil: 0.4 }).retazos).toEqual([0.5]);
  });
});

describe('hoja de corte: códigos', () => {
  it('grupo.barra + letra; la empalmada con sus dos códigos', async () => {
    const { codigosDeCorte, textoDeCodigo } = await import('./hojaDeCorte.js');
    const cortes = optimizarCortes([{ largo: 7.5, id: 'a' }, { largo: 4, id: 'x' }], 6, 0);
    const codigos = codigosDeCorte([{ perfil: 'C 80', cortes }]);
    expect(textoDeCodigo(codigos.get('x'))).toMatch(/^1\.\d[ab]$/);
    expect(codigos.get('a')).toHaveLength(2); // 6 + 1,5
    expect(codigos.get('a').map((p) => p.tramo.n)).toEqual([1, 2]);
  });
});
