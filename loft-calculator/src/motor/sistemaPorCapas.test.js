// Tests v1.102: revestimiento por capas (chapa + lana + listones + tacos + fenólico) y su comparación. Correr con: npm test
import { describe, it, expect } from 'vitest';
import { sistemaChapaLanaFenolico, capasDeFabrica } from './sistemaPorCapas.js';
import { compararRevestimientos } from './comparativa.js';
import { generarEstructura } from './estructura.js';
import { CATALOGO_INICIAL, calcularPresupuesto } from './presupuesto.js';
import { normalizarCatalogo } from './migracion.js';
import { cantidadDeConsumible, completarConsumible, esEstimado } from './consumibles.js';
import { PARAMS_INICIALES as P, ABERTURAS_INICIALES } from './parametrosIniciales.js';
import { LADOS } from './constantes.js';

const conChapa = (catalogo, idChapa) => ({ ...P, paredes: Object.fromEntries(LADOS.map((l) => [l, { ...P.paredes[l], panel: idChapa, panelInterior: '' }])) });

describe('v1.102: revestimiento por capas', () => {
  const nuevos = sistemaChapaLanaFenolico(CATALOGO_INICIAL);
  const catalogo = normalizarCatalogo([...CATALOGO_INICIAL, ...nuevos]);
  const [chapa, fenolico] = nuevos;
  it('arma la chapa (con el fenólico por dentro) y 4 capas estimadas con los m² de la chapa', () => {
    expect(chapa.interior).toBe(fenolico.id);
    expect(nuevos.slice(2).map((c) => c.nombre)).toEqual(['Lana de vidrio', 'Membrana hidrófuga', 'Listones de madera', 'Tacos y fijaciones']);
    expect(nuevos.slice(2).every((c) => c.base === `rev:${chapa.id}` && esEstimado(c))).toBe(true);
    // sobreviven a la migración (el interior, la mano de obra y la base de las capas)
    expect(catalogo.find((i) => i.id === chapa.id)).toMatchObject({ interior: fenolico.id, manoDeObraM2: 0 });
    expect(catalogo.filter((i) => i.base === `rev:${chapa.id}` && i.modo === 'estimado')).toHaveLength(4);
    expect(completarConsumible({ ...nuevos[2], modo: 'estimado' }).modo).toBe('estimado');
  });
  it('lana: un rollo de 14,4 m² + 5 %; listones cada 60 cm de 3,05 m', () => {
    const [lana, , listones, tacos] = capasDeFabrica();
    expect(cantidadDeConsumible({ ...lana, modo: 'estimado', base: 'rev:x' }, { 'rev:x': 100 }).cantidad).toBe(8); // 100 × 1,05 / 14,4 = 7,3
    expect(cantidadDeConsumible({ ...listones, modo: 'estimado', base: 'rev:x' }, { 'rev:x': 100 }).cantidad).toBe(58); // 166,7 m × 1,05 / 3,05
    expect(cantidadDeConsumible({ ...tacos, modo: 'estimado', base: 'rev:x' }, { 'rev:x': 100 }).cantidad).toBe(417);
  });
  it('con la chapa en las paredes: entran las capas y el fenólico por dentro (solo); sin ella, no', () => {
    const e = generarEstructura(conChapa(catalogo, chapa.id), ABERTURAS_INICIALES, catalogo);
    expect(e.paredes.every((p) => p.panelInterior === fenolico.id)).toBe(true);
    const { items } = calcularPresupuesto(e, catalogo);
    const lana = items.find((i) => i.nombre === 'Lana de vidrio');
    const m2 = e.paredes.reduce((a, p) => a + p.superficieNeta, 0);
    expect(lana.cantidad).toBe(Math.ceil(m2 * 1.05 / 14.4 - 1e-9));
    expect(items.find((i) => i.id === fenolico.id).cantidad).toBeGreaterThan(0);
    const sin = calcularPresupuesto(generarEstructura(P, ABERTURAS_INICIALES, catalogo), catalogo).items;
    expect(sin.find((i) => i.nombre === 'Lana de vidrio')).toBeUndefined();
    expect(sin.find((i) => i.id === fenolico.id).cantidad).toBe(0);
  });
  it('una pared con interior elegido a mano se queda con el suyo', () => {
    const p = conChapa(catalogo, chapa.id);
    p.paredes.A = { ...p.paredes.A, panelInterior: 'panelMuros' };
    const e = generarEstructura(p, ABERTURAS_INICIALES, catalogo);
    expect(e.paredes.find((x) => x.lado === 'A').panelInterior).toBe('panelMuros');
  });
  it('Comparar: suma la mano de obra por m², muestra las capas y no prueba el fenólico por fuera', () => {
    const cat = catalogo.map((i) => (i.id === chapa.id ? { ...i, manoDeObraM2: 1000, precio: 100 } : i.id === 'panelMuros' ? { ...i, manoDeObraM2: 500 } : i))
      .map((i) => (i.nombre === 'Lana de vidrio' ? { ...i, precio: 50 } : i));
    const filas = compararRevestimientos(P, ABERTURAS_INICIALES, cat);
    expect(filas.some((f) => f.id === fenolico.id)).toBe(false);
    const f = filas.find((x) => x.id === chapa.id);
    expect(f.manoDeObra).toBe(Math.round(f.m2 * 1000));
    expect(f.totalConManoDeObra).toBe(f.total + f.manoDeObra);
    expect(f.capas.map((c) => c.nombre)).toEqual(expect.arrayContaining(['Lana de vidrio', 'Listones de madera', 'Tacos y fijaciones', 'Placa fenólica (interior)']));
    const actual = filas.find((x) => x.actual);
    expect(actual.diferencia).toBe(0);
    expect(f.diferencia).toBe(f.totalConManoDeObra - actual.totalConManoDeObra);
  });
});
