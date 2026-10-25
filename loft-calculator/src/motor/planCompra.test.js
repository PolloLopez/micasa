// Tests de flete, plan de compra y accesorios (v1.29). Correr con: npm test
import { describe, it, expect } from 'vitest';
import { costoFlete, renglonesDeFlete, planDeCompra, masBaratoEn, faltanPrecios } from './proveedores.js';
import { calcularPresupuesto, CATALOGO_INICIAL } from './presupuesto.js';
import { normalizarCatalogo } from './migracion.js';
import { generarEstructura } from './estructura.js';
import { PARAMS_INICIALES as P } from './parametrosIniciales.js';
import { INSUMO } from './constantes.js';

describe('flete', () => {
  const p = { flete: 25000, fleteGratisDesde: 1000000 };
  it('se cobra una vez si se le compra algo; gratis desde el monto; nada si no se le compra', () => {
    expect(costoFlete(p, 300000)).toBe(25000);
    expect(costoFlete(p, 1000000)).toBe(0);
    expect(costoFlete(p, 0)).toBe(0);
    expect(costoFlete({ flete: 25000, fleteGratisDesde: 0 }, 5e7)).toBe(25000); // 0 = siempre cobra
  });

  it('va como un renglón del presupuesto (y en el total) del proveedor elegido', () => {
    const cat = CATALOGO_INICIAL.map((i) => (i.categoria === 'proveedor' ? { ...i, flete: 30000 } : i));
    const e = generarEstructura(P, []);
    const con = calcularPresupuesto(e, cat, { proveedor: 'prov-1', pago: 'efectivo' });
    const sin = calcularPresupuesto(e, CATALOGO_INICIAL, { proveedor: 'prov-1', pago: 'efectivo' });
    expect(con.items.find((i) => i.id === 'flete:prov-1')).toMatchObject({ nombre: 'Flete Mi proveedor', subtotal: 30000 });
    expect(con.total).toBe(sin.total + 30000);
    expect(renglonesDeFlete([], cat)).toEqual([]); // sin compra, sin flete
  });
});

// Dos proveedores: "Hierros" vende todo; "Barato" vende solo OSB, 10 % más barato, pero con flete.
const hierros = { id: 'h', categoria: 'proveedor', nombre: 'Hierros', recargoTarjeta: 0, flete: 0, fleteGratisDesde: 0 };
const barato = (flete) => ({ id: 'b', categoria: 'proveedor', nombre: 'Barato', recargoTarjeta: 0, flete, fleteGratisDesde: 0 });
const catalogoCon = (flete) => [
  ...CATALOGO_INICIAL.filter((i) => i.categoria !== 'proveedor').map((i) => {
    const base = i.precios?.['prov-1'];
    if (!base) return i;
    const precios = { h: base };
    if (i.id === INSUMO.OSB) precios.b = { efectivo: Math.round(base.efectivo * 0.9), tarjeta: null };
    return { ...i, precios };
  }),
  hierros, barato(flete),
];

describe('plan de compra', () => {
  const e = generarEstructura(P, []);
  const items = (cat) => calcularPresupuesto(e, cat, { proveedor: 'h', pago: 'efectivo' }).items;

  it('le compra el OSB al más barato si el ahorro supera el flete', () => {
    const cat = catalogoCon(1000);
    const plan = planDeCompra(items(cat), cat, 'efectivo');
    expect(plan.compras.map((c) => c.proveedor.nombre)).toEqual(['Hierros', 'Barato']);
    expect(plan.compras[1].renglones.map((r) => r.id)).toEqual([INSUMO.OSB]);
    expect(plan.compras[1].flete).toBe(1000);
    expect(plan.nadieVende).toEqual([]);
  });

  it('si el flete se come el ahorro, todo a uno solo', () => {
    const cat = catalogoCon(500000);
    const plan = planDeCompra(items(cat), cat, 'efectivo');
    expect(plan.compras.map((c) => c.proveedor.nombre)).toEqual(['Hierros']);
    const soloHierros = calcularPresupuesto(e, cat, { proveedor: 'h', pago: 'efectivo' }).total;
    expect(plan.total).toBe(soloHierros);
  });

  it('el más barato de cada renglón, para la columna del presupuesto', () => {
    const cat = catalogoCon(0);
    const osb = items(cat).find((i) => i.id === INSUMO.OSB);
    expect(masBaratoEn(osb, cat, 'efectivo')).toMatchObject({ nombre: 'Barato' });
  });

  it('lo que un proveedor no tiene cargado es que no lo vende', () => {
    const cat = catalogoCon(0);
    const r = calcularPresupuesto(e, cat, { proveedor: 'b', pago: 'efectivo' });
    expect(faltanPrecios(r.items)).toContain('Pilotines');
  });
});

describe('accesorios', () => {
  it('con cantidad cargada entran al presupuesto con el precio del proveedor', () => {
    const cat = CATALOGO_INICIAL.map((i) => (i.id === 'acc-electrodos'
      ? { ...i, cantidad: 3, precios: { 'prov-1': { efectivo: 8000, tarjeta: null } } } : i));
    const r = calcularPresupuesto(generarEstructura(P, []), cat, { proveedor: 'prov-1', pago: 'efectivo' });
    expect(r.items.find((i) => i.id === 'acc-electrodos')).toMatchObject({ cantidad: 3, subtotal: 24000, unidad: 'kg' });
    // Los que están en 0 no aparecen.
    expect(r.items.some((i) => i.id === 'acc-tornilleria')).toBe(false);
  });

  it('proyectos de antes arrancan con tornillería, electrodos y selladores; los agregados se conservan', () => {
    const viejo = CATALOGO_INICIAL.filter((i) => i.categoria !== 'accesorio');
    expect(normalizarCatalogo(viejo).filter((i) => i.categoria === 'accesorio').map((i) => i.nombre))
      .toEqual(['Tornillería', 'Electrodos', 'Selladores']);
    const conPropio = [...viejo, { id: 'acc-1', categoria: 'accesorio', nombre: 'Pintura antióxido', unidad: 'lata', cantidad: 2, precios: {} }];
    const c = normalizarCatalogo(conPropio).filter((i) => i.categoria === 'accesorio');
    expect(c).toHaveLength(1);
    expect(c[0]).toMatchObject({ nombre: 'Pintura antióxido', unidad: 'lata', cantidad: 2 });
  });
});
