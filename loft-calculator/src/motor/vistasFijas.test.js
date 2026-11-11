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

describe('vistas por partes (v1.44)', () => {
  it('planta baja y entrepiso desde arriba, y el adentro desde cada lado sin esa pared', async () => {
    const { vistasPorPartes } = await import('./vistasFijas.js');
    const { PARAMS_INICIALES: P } = await import('./parametrosIniciales.js');
    const v = vistasPorPartes(P);
    expect(v.map((x) => x.clave)).toEqual(['plantaBaja', 'entrepiso', 'interiorA', 'interiorB', 'interiorC', 'interiorD']);
    expect(v[0].ocultar).toEqual({ techo: false, piso2: false, escalera: false });
    expect(v[1].ocultar).toEqual({ techo: false });
    expect(v[2]).toMatchObject({ ocultar: { A: false }, desde: [0, 0, 1] }); // frente A: se mira desde +z
    expect(v[2].titulo).toBe('Desde frente (A), sin esa pared');
    // Sin entrepiso, no hay vista del entrepiso.
    expect(vistasPorPartes({ ...P, anchoEntrepiso: 0 }).map((x) => x.clave)).not.toContain('entrepiso');
  });
});
