// Tests v1.96: otro panel en una parte de la pared o del techo. Correr con: npm test
import { describe, it, expect } from 'vitest';
import { segmentosDePanel, panosDeLaPared, panosDelTecho, normalizarTramosPanel, errorDeTramo, panoEn } from './tramosPanel.js';
import { generarEstructura } from './estructura.js';
import { CATALOGO_INICIAL, calcularPresupuesto, panosPorRevestimiento } from './presupuesto.js';
import { migrarParams } from './migracion.js';
import { PARAMS_INICIALES as P, ABERTURAS_INICIALES } from './parametrosIniciales.js';

describe('v1.96: los segmentos de panel', () => {
  it('un tramo en el medio parte la pared en 3; lo que no es tramo lleva el de la pared', () => {
    expect(segmentosDePanel(7.5, 'cc', [{ desde: 2, hasta: 4.5, panel: 'cf' }]))
      .toEqual([{ x0: 0, x1: 2, panel: 'cc' }, { x0: 2, x1: 4.5, panel: 'cf' }, { x0: 4.5, x1: 7.5, panel: 'cc' }]);
  });
  it('se recortan a la pared, manda el último y se juntan los iguales', () => {
    expect(segmentosDePanel(4, 'cc', [{ desde: 3, hasta: 9, panel: 'cf' }, { desde: 0, hasta: 1, panel: 'cc' }]))
      .toEqual([{ x0: 0, x1: 3, panel: 'cc' }, { x0: 3, x1: 4, panel: 'cf' }]);
    expect(segmentosDePanel(4, 'cc', [{ desde: 1, hasta: 3, panel: 'cf' }, { desde: 2, hasta: 3, panel: 'x' }]).map((s) => s.panel)).toEqual(['cc', 'cf', 'x', 'cc']);
    expect(segmentosDePanel(4, 'cc', [])).toEqual([{ x0: 0, x1: 4, panel: 'cc' }]);
  });
  it('se guarda limpio y avisa lo que no tiene sentido', () => {
    expect(normalizarTramosPanel([{ desde: 1, hasta: 0.5, panel: 'a' }, { desde: 1, hasta: 2, panel: '' }, { desde: 1, hasta: 2, panel: 'a' }]))
      .toEqual([{ desde: 1, hasta: 2, panel: 'a' }]);
    expect(errorDeTramo({ desde: 1, hasta: 9 }, 4.5)).toBeTruthy();
    expect(errorDeTramo({ desde: 1, hasta: 2 }, 4.5)).toBeNull();
  });
});

describe('v1.96: los paños de una pared y del techo con tramos', () => {
  const pared = { lado: 'A', largo: 6, alturas: [4, 5], panel: 'cc', superficieNeta: 27,
    huecos: [{ desde: 2.5, hasta: 3.5, abajo: 1, arriba: 2 }], tramosPanel: [{ desde: 3, hasta: 4, panel: 'cf' }] };
  it('cada paño con su alto en las puntas, sus huecos corridos y su nombre', () => {
    const panos = panosDeLaPared(pared);
    expect(panos.map((p) => [p.panel, p.donde, p.largo])).toEqual([['cc', 'lado A · 1', 3], ['cf', 'lado A · 2', 1], ['cc', 'lado A · 3', 2]]);
    expect(panos[1]).toMatchObject({ h1: 4.5, h2: 4 + 4 / 6 });
    expect(panos[0].huecos).toEqual([{ desde: 2.5, hasta: 3, abajo: 1, arriba: 2 }]);
    expect(panos[1].huecos).toEqual([{ desde: 0, hasta: 0.5, abajo: 1, arriba: 2 }]);
    expect(panoEn(panos, 3.5).panel).toBe('cf');
    expect(panosDeLaPared({ ...pared, tramosPanel: [] })).toEqual([expect.objectContaining({ donde: 'lado A', neto: 27 })]);
  });
  it('el techo, a lo largo', () => {
    const t = { largo: 8, largoFaldon: 5, superficie: 40, panel: 'cc', tramosPanel: [{ desde: 0, hasta: 3, panel: 'cf' }] };
    expect(panosDelTecho(t).map((p) => [p.panel, p.donde, p.largo, p.neto])).toEqual([['cf', 'techo · 1', 3, 15], ['cc', 'techo · 2', 5, 25]]);
  });
});

describe('v1.96: en el presupuesto, cada panel cuenta solo su tramo', () => {
  const cat = [...CATALOGO_INICIAL, { ...CATALOGO_INICIAL.find((i) => i.id === 'panelMuros'), id: 'chapaFoil', nombre: 'Chapa-foil' }];
  const params = migrarParams({ ...P, paredes: { ...P.paredes, A: { ...P.paredes.A, tramosPanel: [{ desde: 1, hasta: 3, panel: 'chapaFoil' }] } },
    tramosPanelTecho: [{ desde: 0, hasta: 2, panel: 'chapaFoil' }] });
  const e = generarEstructura(params, ABERTURAS_INICIALES, cat);
  it('los paños de cada panel', () => {
    const panos = panosPorRevestimiento(e);
    expect(panos.chapaFoil.map((p) => p.donde)).toEqual(['lado A · 2', 'techo · 1']);
    expect(panos.chapaFoil.reduce((a, p) => a + p.largo, 0)).toBeCloseTo(4, 6);
    expect(panos.panelMuros.some((p) => p.donde === 'lado A · 1')).toBe(true);
  });
  it('el renglón del panel nuevo aparece y el de siempre baja', () => {
    const con = calcularPresupuesto(e, cat, { proveedor: 'prov-1' }).items;
    const sin = calcularPresupuesto(generarEstructura(P, ABERTURAS_INICIALES, cat), cat, { proveedor: 'prov-1' }).items;
    expect(con.find((i) => i.id === 'chapaFoil')?.cantidad).toBeGreaterThan(0);
    expect(con.find((i) => i.id === 'panelMuros').cantidad).toBeLessThan(sin.find((i) => i.id === 'panelMuros').cantidad);
  });
});

describe('v1.97: cambiar el panel de una tira (desde el 3D)', async () => {
  const { tramosConPanel } = await import('./tramosPanel.js');
  it('pone el panel en esa parte y deja los tramos mínimos', () => {
    let t = tramosConPanel(6, 'cc', [], 1, 2, 'cf');
    expect(t).toEqual([{ desde: 1, hasta: 2, panel: 'cf' }]);
    t = tramosConPanel(6, 'cc', t, 2, 3, 'cf'); // la tira de al lado: se juntan
    expect(t).toEqual([{ desde: 1, hasta: 3, panel: 'cf' }]);
    t = tramosConPanel(6, 'cc', t, 1, 2, 'cc'); // volver una al de la pared: el tramo se achica
    expect(t).toEqual([{ desde: 2, hasta: 3, panel: 'cf' }]);
    expect(tramosConPanel(6, 'cc', t, 2, 3, 'cc')).toEqual([]); // y se borra
  });
});

describe('v1.99: el sentido de montaje de cada pared', async () => {
  const { franjasDeTiras, tipoEnPano, encimadosDePano, pedazosConLugar } = await import('./revestimientos.js');
  const tipo = { venta: 'medida', anchoUtil: 1, largoMaximo: 12, ladoSolape: 'izquierda', tiraAngosta: 'derecha', anchoTotal: 1.05 };
  it('de derecha a izquierda: la angosta va a la izquierda y el costado que monta es el derecho', () => {
    expect(franjasDeTiras(4.5, tipo).at(-1)).toMatchObject({ x0: 4, x1: 4.5 }); // de izq. a der.: la angosta, a la derecha
    const t = tipoEnPano(tipo, { sentido: 'derIzq' });
    expect(t).toMatchObject({ ladoSolape: 'derecha', tiraAngosta: 'izquierda' });
    expect(tipoEnPano(t, { sentido: 'derIzq' })).toBe(t); // una sola vez
    expect(franjasDeTiras(4.5, t)[0]).toMatchObject({ x0: 0, x1: 0.5 });
    expect(pedazosConLugar({ largo: 4.5, h1: 3, h2: 3, huecos: [], sentido: 'derIzq' }, tipo)[0]).toMatchObject({ x0: 0, x1: 0.5 });
    expect(encimadosDePano({ largo: 4.5, h1: 3, h2: 3, sentido: 'derIzq' }, tipo).ladoSolape).toBe('derecha');
  });
  it('se guarda por pared y llega a sus paños', () => {
    const params = migrarParams({ ...P, paredes: { ...P.paredes, C: { ...P.paredes.C, sentidoPanel: 'derIzq' } } });
    expect(params.paredes.C.sentidoPanel).toBe('derIzq');
    expect(params.paredes.A.sentidoPanel).toBe('izqDer');
    const e = generarEstructura(params, ABERTURAS_INICIALES, CATALOGO_INICIAL);
    expect(panosPorRevestimiento(e)[params.paredes.C.panel].find((p) => p.donde === 'lado C').sentido).toBe('derIzq');
  });
});
