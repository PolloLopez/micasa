// Tests de la medición en el 3D (v1.16). Correr con: npm test
import { describe, it, expect } from 'vitest';
import { medirEntre, puntoMasCercanoEnPieza } from './medicion.js';

const columna = (x, z) => ({ desde: [x, 0.5, z], hasta: [x, 5, z] });

describe('medir', () => {
  it('se pega al eje de la pieza', () => {
    expect(puntoMasCercanoEnPieza(columna(1, 2), [1.04, 2.3, 2.05])).toEqual([1, 2.3, 2]);
    expect(puntoMasCercanoEnPieza(columna(1, 2), [1, 9, 2])).toEqual([1, 5, 2]); // no se pasa de la punta
  });

  it('entre dos columnas: la separación de eje a eje, aunque se toquen a distinta altura', () => {
    const r = medirEntre([0, 1, 2.25], [2.5, 3, 2.25], columna(0, 2.25), columna(2.5, 2.25));
    expect(r.entreEjes).toBe(true);
    expect(r.principal).toBeCloseTo(2.5);
    expect(r.vertical).toBeCloseTo(2);
  });

  it('en cualquier otro caso: la distancia en línea recta', () => {
    const r = medirEntre([0, 0, 0], [3, 4, 0]);
    expect(r.entreEjes).toBe(false);
    expect(r.principal).toBeCloseTo(5);
    expect(r.horizontal).toBeCloseTo(3);
  });
});
