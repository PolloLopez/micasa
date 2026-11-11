// Tests de los consumibles estimados (v1.48). Correr con: npm test
import { describe, it, expect } from 'vitest';
import { medidasParaConsumibles, cantidadDeConsumible, completarConsumible } from './consumibles.js';
import { calcularPresupuesto, CATALOGO_INICIAL } from './presupuesto.js';
import { resolverCatalogo } from './perfiles.js';
import { generarEstructura } from './estructura.js';
import { listaDeMateriales, kilosDeMateriales } from './proveedores.js';
import { PARAMS_INICIALES as P, ABERTURAS_INICIALES } from './parametrosIniciales.js';

const obra = () => {
  const e = generarEstructura(P, ABERTURAS_INICIALES);
  return { e, r: calcularPresupuesto(e, CATALOGO_INICIAL) };
};

describe('consumibles estimados', () => {
  it('las medidas salen de la obra: kilos y superficie de hierro, m² de paneles', () => {
    const { e, r } = obra();
    const m = medidasParaConsumibles(r.items, resolverCatalogo(CATALOGO_INICIAL), e.superficies);
    // Kilos netos (piezas, sin sobrantes): menos que los de las barras enteras de la lista de materiales.
    const kgBarras = kilosDeMateriales(listaDeMateriales(r.items, resolverCatalogo(CATALOGO_INICIAL)));
    expect(m.kgHierro).toBeGreaterThan(kgBarras * 0.7);
    expect(m.kgHierro).toBeLessThanOrEqual(kgBarras);
    // Un caño de 100x100x1,6: su superficie es ~0,4 m² por metro; en promedio la obra da entre 0,1 y 0,5 m²/m.
    expect(m.m2Hierro / m.kgHierro).toBeGreaterThan(0.02);
    expect(m.m2Hierro / m.kgHierro).toBeLessThan(0.15);
    expect(m.m2Paneles).toBeCloseTo(e.superficies.murosNetos + e.superficies.techo, 5);
  });

  it('electrodos, tornillos, sellador y antióxido entran solos al presupuesto (hacia arriba)', () => {
    const { r } = obra();
    const de = (id) => r.items.find((i) => i.id === id);
    expect(de('acc-electrodos').cantidad).toBeGreaterThan(0);
    expect(de('acc-electrodos').detalle).toMatch(/^estimado: .* kg x 0,0125 kg por kg$/);
    expect(Number.isInteger(de('acc-tornilleria').cantidad)).toBe(true);
    expect(de('acc-antioxido').unidad).toBe('litro');
    expect(de('acc-selladores').sinPrecioCargado).toBe(true); // sin precio: se ve, pero no se avisa como "nadie lo vende"
  });

  it('a mano manda la cantidad cargada; un estimado en 0 no entra', () => {
    expect(cantidadDeConsumible({ modo: 'manual', cantidad: 3 }, {})).toEqual({ cantidad: 3, detalle: 'cantidad cargada a mano' });
    expect(cantidadDeConsumible({ modo: 'estimado', base: 'kgHierro', coeficiente: 0.0125, unidad: 'kg' }, { kgHierro: 0 }).cantidad).toBe(0);
    expect(cantidadDeConsumible({ modo: 'estimado', base: 'kgHierro', coeficiente: 0.0125, unidad: 'kg' }, { kgHierro: 800 }).cantidad).toBe(10);
  });

  it('los de antes: los de fábrica en 0 pasan a estimados; con cantidad cargada quedan a mano', () => {
    expect(completarConsumible({ id: 'acc-electrodos', cantidad: 0 })).toMatchObject({ modo: 'estimado', base: 'kgHierro', coeficiente: 0.0125 });
    expect(completarConsumible({ id: 'acc-electrodos', cantidad: 4 })).toMatchObject({ modo: 'manual', cantidad: 4 });
    expect(completarConsumible({ id: 'acc-9', cantidad: 0 })).toMatchObject({ modo: 'manual' });
  });
});
