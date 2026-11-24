// Tests del armado en obra (v1.83): fierros instalados, medidas verificadas, alargar piezas. Correr con: npm test
import { describe, it, expect } from 'vitest';
import { normalizarAvance, marcarPiezas, gruposDeArmado, resumenDeArmado, errorDeMedidaReal, zonaDePieza } from './armado.js';
import { aplicarEdicion, revisarEdicionDePieza, ALARGAR_MAXIMO } from './edicionPiezas.js';
import { generarEstructura, listarPiezas } from './estructura.js';
import { migrarParams } from './migracion.js';
import { PARAMS_INICIALES as P, ABERTURAS_INICIALES } from './parametrosIniciales.js';

const piezas = listarPiezas(generarEstructura(P, ABERTURAS_INICIALES));

describe('fierros instalados y medidas verificadas', () => {
  it('se marcan de a una o de a grupos, y se desmarcan', () => {
    const columnasA = piezas.filter((p) => p.tipo === 'columna' && zonaDePieza(p) === 'A').map((p) => p.id);
    expect(columnasA.length).toBeGreaterThan(1);
    let a = marcarPiezas({}, columnasA, 'instalada', true);
    a = marcarPiezas(a, [columnasA[0]], 'verificada', true);
    expect(a[columnasA[0]]).toEqual({ instalada: true, verificada: true });
    a = marcarPiezas(a, [columnasA[0]], 'instalada', false);
    expect(a[columnasA[0]]).toEqual({ verificada: true });
    a = marcarPiezas(a, [columnasA[0]], 'verificada', false);
    expect(a[columnasA[0]]).toBeUndefined(); // sin nada, no se guarda
    const r = resumenDeArmado(piezas, a);
    expect(r.instaladas).toBe(columnasA.length - 1);
    expect(r.porcentaje).toBe(Math.round(((columnasA.length - 1) / piezas.length) * 100));
  });

  it('la lista va por zona (paredes primero) y por tipo, con lo puesto de cada grupo', () => {
    const avance = marcarPiezas({}, piezas.filter((p) => zonaDePieza(p) === 'B').map((p) => p.id), 'instalada', true);
    const grupos = gruposDeArmado(piezas, avance);
    expect(grupos[0].zona).toBe('A');
    const b = grupos.find((g) => g.zona === 'B');
    expect(b.instaladas).toBe(b.total);
    expect(b.tipos.find((t) => t.nombre === 'Columna').instaladas).toBeGreaterThan(0);
    expect(grupos.reduce((n, g) => n + g.total, 0)).toBe(piezas.length); // ninguna se pierde
  });

  it('se guarda con el proyecto; lo raro no', () => {
    expect(normalizarAvance({ x: { instalada: true, medidaReal: 2.4, otra: 1 }, y: { instalada: 'si' }, z: null })).toEqual({ x: { instalada: true, medidaReal: 2.4 } });
    expect(migrarParams({ ...P, avancePiezas: undefined }).avancePiezas).toEqual({});
  });
});

describe('alargar piezas y la medida real', () => {
  const p = piezas.find((x) => x.tipo === 'columna');
  it('una punta se puede alargar (recorte negativo) hasta 3 m', () => {
    const larga = aplicarEdicion(p, { recorteFin: -0.25 });
    expect(larga.largo).toBeCloseTo(p.largo + 0.25, 6);
    expect(revisarEdicionDePieza(p, { recorteFin: -0.25 })).toBeNull();
    expect(revisarEdicionDePieza(p, { recorteFin: -(ALARGAR_MAXIMO + 1) })).toMatch(/se alarga hasta 3 m/);
  });
  it('la medida real deja la pieza de ese largo (más corta o más larga) aunque las uniones la estiren, con la punta del inicio fija', () => {
    const e = generarEstructura(P, ABERTURAS_INICIALES);
    const col = listarPiezas(e).find((x) => x.tipo === 'columna');
    for (const medida of [col.largo - 0.1, col.largo + 0.07]) {
      const q = listarPiezas(generarEstructura({ ...P, avancePiezas: { [col.id]: { medidaReal: medida } } }, ABERTURAS_INICIALES)).find((x) => x.id === col.id);
      expect(q.largo).toBeCloseTo(medida, 6);
      expect(q.desde).toEqual(col.desde);
      expect(q).toMatchObject({ medidaReal: true });
      expect(q.largoPlano).toBeCloseTo(col.largo, 6);
    }
    expect(errorDeMedidaReal(0.01)).toBeTruthy();
    expect(errorDeMedidaReal(2.4)).toBeNull();
  });
});
