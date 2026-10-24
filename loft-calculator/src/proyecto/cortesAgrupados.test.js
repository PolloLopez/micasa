// Tests de cortes agrupados (v1.28). Correr con: npm test
import { describe, it, expect } from 'vitest';
import { agruparBarras, textoBarra } from './cortesAgrupados.js';

describe('barras que se cortan igual', () => {
  it('se juntan con cuántas veces, en el orden en que aparecen', () => {
    const cortes = { barras: [
      { piezas: [4.95, 1.1], usado: 6.053 }, { piezas: [4.95, 1.1], usado: 6.053 },
      { piezas: [3], usado: 3.003 }, { piezas: [4.95, 1.1], usado: 6.053 },
    ] };
    const g = agruparBarras(cortes, 6.06);
    expect(g).toEqual([{ piezas: [4.95, 1.1], sobra: 0.01, veces: 3 }, { piezas: [3], sobra: 3.06, veces: 1 }]);
    expect(textoBarra(g[0])).toBe('3 × 4.95 + 1.10');
    expect(textoBarra(g[1])).toBe('3.00');
  });
});
