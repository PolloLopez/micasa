// Tests del alero del techo (v1.35.1). Correr con: npm test
import { describe, it, expect } from 'vitest';
import { generarEstructura, alerosDelTecho } from './estructura.js';
import { calcularPresupuesto, CATALOGO_INICIAL } from './presupuesto.js';
import { migrarParams } from './migracion.js';
import { validarParametros } from './validacion.js';
import { PARAMS_INICIALES as P, ABERTURAS_INICIALES } from './parametrosIniciales.js';

// De fábrica el techo cae hacia C (lado bajo = C, alto = A); A y C miden 7.50; la luz es el ancho (4.50).
const techo = (cambios = {}) => generarEstructura({ ...P, ...cambios }, ABERTURAS_INICIALES).techo;
const conAlero = (alero, extra = {}) => techo({ alero: { A: 0, B: 0, C: 0, D: 0, ...alero }, ...extra });

describe('alero del techo', () => {
  it('sin alero, todo igual que antes', () => {
    const t = techo();
    expect(t.largo).toBe(7.5);
    expect(t.superficie).toBeCloseTo(7.5 * 4.5 * Math.sqrt(1 + 0.01), 6);
    expect(alerosDelTecho(P)).toEqual({ bajo: 0, alto: 0, inicio: 0, fin: 0 });
  });

  it('cada lado tiene su alero: el panel cubre el techo con todos los aleros', () => {
    const t = conAlero({ A: 0.6, B: 0.4, C: 0.5, D: 0.3 });
    expect(alerosDelTecho({ ...P, alero: { A: 0.6, B: 0.4, C: 0.5, D: 0.3 } })).toEqual({ bajo: 0.5, alto: 0.6, inicio: 0.4, fin: 0.3 }); // el lado bajo C va de B a D
    expect(t.largo).toBeCloseTo(7.5 + 0.3 + 0.4, 6);
    expect(t.largoFaldon).toBeCloseTo((4.5 + 0.5 + 0.6) * Math.sqrt(1.01), 6);
  });

  it('vigas y correas llegan al borde del alero, o terminan en la estructura', () => {
    const sin = techo();
    const al = conAlero({ A: 0.6, C: 0.5, B: 0.4, D: 0.3 });
    expect(al.vigas[0].largo).toBeCloseTo(sin.vigas[0].largo + (0.5 + 0.6) * Math.sqrt(1.01), 4);
    expect(al.correas[0].largo).toBeCloseTo(7.5 + 0.7, 4);
    expect(al.correas.length).toBeGreaterThan(sin.correas.length); // también hay correas en el alero
    const soloPanel = conAlero({ A: 0.6, C: 0.5, B: 0.4, D: 0.3 }, { aleroVigas: 'estructura', aleroCorreas: 'estructura' });
    expect(soloPanel.vigas[0].largo).toBeCloseTo(sin.vigas[0].largo, 6);
    expect(soloPanel.correas.length).toBe(sin.correas.length);
    expect(soloPanel.correas[0].largo).toBeCloseTo(7.5, 6);
    expect(soloPanel.largo).toBeCloseTo(8.2, 6); // el panel igual sale con alero
  });

  it('el panel del techo del presupuesto crece con el alero', () => {
    const m2 = (params) => calcularPresupuesto(generarEstructura(params, ABERTURAS_INICIALES), CATALOGO_INICIAL, { proveedor: 'prov-1' })
      .items.find((i) => i.id === P.panelTecho).cantidad;
    expect(m2({ ...P, alero: { A: 0.6, B: 0, C: 0.6, D: 0 } })).toBeGreaterThan(m2(P));
  });

  it('se valida y los proyectos viejos no tienen alero', () => {
    expect(validarParametros({ ...P, alero: { A: 4, B: 0, C: 0, D: 0 } })).toEqual({ 'alero.A': 'Entre 0 y 3 m' });
    const { alero, aleroVigas, aleroCorreas, ...viejo } = P;
    const m = migrarParams(viejo);
    expect([m.alero, m.aleroVigas, m.aleroCorreas]).toEqual([{ A: 0, B: 0, C: 0, D: 0 }, 'alero', 'alero']);
    expect([alero.A, aleroVigas, aleroCorreas]).toEqual([0, 'alero', 'alero']);
  });
});
