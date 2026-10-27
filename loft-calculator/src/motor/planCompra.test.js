// Tests de flete, plan de compra y accesorios (v1.29). Correr con: npm test
import { describe, it, expect } from 'vitest';
import { costoFlete, renglonesDeFlete, planDeCompra, masBaratoEn, faltanPrecios, totalDeLaObra, usaPlanDeCompra, materialesDeCompra, textoPedido, cantidadPedida } from './proveedores.js';
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

// v1.30.2 (caso de Leandro): los paneles los vende SOLO otro proveedor (Vastek). El total del proveedor elegido
// los deja afuera ("no vende"); el total de la obra tiene que ser el del plan de compra, que los incluye.
describe('total de la obra', () => {
  const e = generarEstructura(P, []);
  // OSB solo en "Barato" (el resto solo en "Hierros"), sin flete.
  const cat = catalogoCon(0).map((i) => (i.id === INSUMO.OSB ? { ...i, precios: { b: i.precios.b } } : i));
  const conHierros = calcularPresupuesto(e, cat, { proveedor: 'h', pago: 'efectivo' });
  const plan = planDeCompra(conHierros.items, cat, 'efectivo');
  const osb = calcularPresupuesto(e, cat, { proveedor: 'b', pago: 'efectivo' }).items.find((i) => i.id === INSUMO.OSB);

  it('el total de un solo proveedor deja afuera lo que no vende', () => {
    expect(faltanPrecios(conHierros.items)).toContain(osb.nombre);
  });

  it('con varios proveedores, el total de la obra es el del plan (incluye lo que vende el otro)', () => {
    expect(osb.subtotal).toBeGreaterThan(0);
    expect(plan.total).toBe(conHierros.total + osb.subtotal);
    expect(usaPlanDeCompra(plan, 2)).toBe(true);
    expect(totalDeLaObra(conHierros.total, plan, 2)).toBe(plan.total);
  });

  it('con un solo proveedor (o sin plan), queda el total de siempre', () => {
    expect(totalDeLaObra(conHierros.total, plan, 1)).toBe(conHierros.total);
    expect(totalDeLaObra(conHierros.total, null, 3)).toBe(conHierros.total);
    expect(usaPlanDeCompra({ compras: [] }, 2)).toBe(false);
  });
});

// v1.30.3: el pedido a cada proveedor va por material (no por dónde se usa).
describe('lista de materiales por proveedor', () => {
  const renglones = [
    { id: 'columna', nombre: 'Columnas', perfil: 'Caño 80x80x2.0', perfilId: 'perfil-1', largoBarra: 6, cantidad: 5, unidad: 'barra', precio: 100, subtotal: 500 },
    { id: 'zanca', nombre: 'Zanca', perfil: 'Caño 80x80x2.0', perfilId: 'perfil-1', largoBarra: 6, cantidad: 2, unidad: 'barra', precio: 100, subtotal: 200 },
    { id: 'columnaEscalera', nombre: 'Columnas de escalera', perfil: 'Caño 80x80x2.0', perfilId: 'perfil-1', largoBarra: 6, cantidad: 0, unidad: 'barra', precio: 100, subtotal: 0 },
    { id: 'panelMuros', nombre: 'Panel de pared', perfil: 'Panel PUR 50 mm', venta: 'medida', detalle: '7 × 4.40 m', cantidad: 108.4, unidad: 'm²', precio: 10, subtotal: 1084 },
    { id: 'panel3', nombre: 'Panel 3', perfil: '', venta: 'medida', detalle: 'sin uso', cantidad: 0, unidad: 'm²', precio: 10, subtotal: 0 },
  ];

  it('suma los renglones del mismo perfil y saca lo que no se compra', () => {
    const m = materialesDeCompra(renglones);
    expect(m.map((x) => x.nombre)).toEqual(['Caño 80x80x2.0', 'Panel de pared — Panel PUR 50 mm']);
    expect(m.map(cantidadPedida)).toEqual(['7 barras de 6 m', '108.4 m²']);
    expect(m[0]).toMatchObject({ cantidad: 7, subtotal: 700, usos: ['Columnas', 'Zanca', 'Columnas de escalera'], medidas: null });
    expect(m[1]).toMatchObject({ cantidad: 108.4, medidas: '7 × 4.40 m' });
  });

  it('el texto del pedido lleva cantidades y medidas, sin precios', () => {
    const t = textoPedido({ proveedor: { nombre: 'Vastek' }, materiales: materialesDeCompra(renglones) }, 'Casa');
    expect(t).toBe('Pedido para Vastek — Casa\n• 7 barras de 6 m — Caño 80x80x2.0\n• 108.4 m² — Panel de pared — Panel PUR 50 mm\n   Medidas: 7 × 4.40 m');
    expect(t).not.toContain('$');
  });

  it('el plan de compra trae la lista de cada proveedor', () => {
    const e = generarEstructura(P, []);
    const cat = catalogoCon(1000);
    const plan = planDeCompra(calcularPresupuesto(e, cat, { proveedor: 'h', pago: 'efectivo' }).items, cat, 'efectivo');
    for (const c of plan.compras) {
      const suma = c.materiales.reduce((a, m) => a + m.subtotal, 0);
      expect(Math.round(suma)).toBe(Math.round(c.subtotal)); // agrupar no cambia la plata
    }
    expect(plan.compras[1].materiales.map((m) => m.clave)).toEqual([INSUMO.OSB]);
  });
});

// v1.30.4: el pedido dice qué barra es: tipo, medidas con nombre, espesor y kilos.
describe('ficha de cada material en el pedido', () => {
  const e = generarEstructura(P, []);
  const plan = planDeCompra(calcularPresupuesto(e, CATALOGO_INICIAL, { proveedor: 'prov-1', pago: 'efectivo' }).items, CATALOGO_INICIAL, 'efectivo');
  const materiales = plan.compras.flatMap((c) => c.materiales);

  it('los hierros llevan tipo, medidas, espesor y kilos', () => {
    const hierros = materiales.filter((m) => m.largoBarra);
    expect(hierros.length).toBeGreaterThan(0);
    for (const m of hierros) {
      expect(m.ficha).toMatch(/Espesor \d+(\.\d+)? mm/);
      expect(m.kgPorBarra).toBeGreaterThan(0);
      expect(cantidadPedida(m)).toMatch(/^\d+ barras? de \d+(\.\d+)? m$/);
    }
  });

  it('el texto del pedido lleva la ficha y los kilos', () => {
    const t = textoPedido(plan.compras[0]);
    expect(t).toMatch(/barras de 6 m — Caño estructural/);
    expect(t).toMatch(/Lado \d+ mm · Espesor \d\.\d mm · ≈ \d+ kg/);
  });
});
