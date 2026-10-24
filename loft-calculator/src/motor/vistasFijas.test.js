// Tests de las vistas fijas para imprimir (v1.28). Correr con: npm test
import { describe, it, expect } from 'vitest';
import { vistasFijas } from './vistasFijas.js';
import { PARAMS_INICIALES as P } from './parametrosIniciales.js';

describe('vistas fijas', () => {
  it('frente A: la cámara del frente mira desde z+ y la lateral desde x+ (lado B)', () => {
    const [frente, lateral, arriba] = vistasFijas(P);
    expect(frente.desde).toEqual([0, 0, 1]);
    expect(lateral.desde).toEqual([1, 0, 0]);
    expect(lateral.titulo).toBe('Lateral derecho (B)');
    expect(arriba.desde).toEqual([0, 1, 0]);
    expect(arriba.arriba).toEqual([0, 0, -1]); // el frente (z+) queda abajo
  });

  it('con otro frente giran todas', () => {
    const [frente, lateral] = vistasFijas({ ...P, ladoFrente: 'C' });
    expect(frente.desde[2]).toBe(-1);
    expect(lateral.titulo).toBe('Lateral derecho (D)');
  });
});
