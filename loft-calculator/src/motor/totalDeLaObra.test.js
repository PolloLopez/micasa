// Tests v1.100: el total dicho entero y las partes "a futuro" en un solo lugar. Correr con: npm test
import { describe, it, expect } from 'vitest';
import { partesAFuturo, cambiosParteAFuturo, asignacionesConFuturo, subtotalAFuturo, materialesSinPrecio, resumenDelTotal, montoDeObraCivilAFuturo, PARTE_TAPIAL } from './totalDeLaObra.js';
import { A_FUTURO, NINGUNO, planDeCompra } from './proveedores.js';
import { filasDeLaLista } from './listaCompras.js';
import { validarSeguimiento } from './seguimiento.js';
import { parteDeItem } from './partesObra.js';
import { generarEstructura } from './estructura.js';
import { CATALOGO_INICIAL, calcularPresupuesto } from './presupuesto.js';
import { resolverCatalogo } from './perfiles.js';
import { PARAMS_INICIALES as P, ABERTURAS_INICIALES } from './parametrosIniciales.js';

describe('v1.100: partes a futuro (una sola idea para Fundación, Partes y la Lista de compras)', () => {
  it('el tapial se guarda en la obra civil y las demás en el seguimiento', () => {
    const params = { seguimiento: { aFuturo: ['escalera'] }, obraCivil: { tapial: { aFuturo: true } } };
    expect([...partesAFuturo(params)].sort()).toEqual(['escalera', PARTE_TAPIAL]);
    expect(partesAFuturo({}).size).toBe(0);
    expect(cambiosParteAFuturo(params, PARTE_TAPIAL, false)).toEqual([['obraCivil.tapial.aFuturo', false]]);
    expect(cambiosParteAFuturo(params, 'techo', true)).toEqual([['seguimiento.aFuturo', ['escalera', 'techo']]]);
    expect(cambiosParteAFuturo(params, 'escalera', false)).toEqual([['seguimiento.aFuturo', []]]);
  });
  it('valida la lista guardada', () => {
    expect(validarSeguimiento({ rubros: [], aFuturo: ['escalera'] })).toEqual({});
    expect(validarSeguimiento({ rubros: [], aFuturo: 'escalera' })).toHaveProperty(['seguimiento.aFuturo']);
  });
  const items = [
    { id: 'zanca', nombre: 'Zanca', cantidad: 2, subtotal: 100, perfilId: 'perfil-1' },
    { id: 'escalon', nombre: 'Escalones', cantidad: 12, subtotal: 50 },
    { id: 'columna', nombre: 'Columnas', cantidad: 8, subtotal: 400, perfilId: 'perfil-1' },
  ];
  it('los renglones de la parte a futuro pasan a "a futuro" (salvo los que no se compran) y se restan', () => {
    const futuras = new Set(['escalera']);
    const a = asignacionesConFuturo({ escalon: NINGUNO, columna: 'p2' }, items, null, futuras);
    expect(a).toEqual({ zanca: A_FUTURO, escalon: NINGUNO, columna: 'p2' });
    const sinNada = {};
    expect(asignacionesConFuturo(sinNada, items, null, new Set())).toBe(sinNada); // sin partes a futuro: el mismo objeto
    expect(subtotalAFuturo(items, null, futuras)).toBe(150);
  });
  it('con el proyecto de fábrica: la parte "techo" a futuro sale del plan de compra y la lista la muestra aparte', () => {
    const cat = resolverCatalogo(CATALOGO_INICIAL);
    const e = generarEstructura(P, ABERTURAS_INICIALES, CATALOGO_INICIAL);
    const { items } = calcularPresupuesto(e, CATALOGO_INICIAL, { proveedor: 'prov-1' });
    const futuras = new Set(['techo']);
    const delTecho = items.filter((i) => i.cantidad > 0 && parteDeItem(i, e) === 'techo');
    expect(delTecho.length).toBeGreaterThan(0);
    const antes = planDeCompra(items, cat);
    const asignaciones = asignacionesConFuturo({}, items, e, futuras);
    const plan = planDeCompra(items, cat, 'efectivo', asignaciones);
    const ids = plan.compras.flatMap((c) => c.renglones.map((r) => r.id));
    delTecho.forEach((i) => expect(ids).not.toContain(i.id));
    expect(plan.total).toBeLessThan(antes.total);
    const otros = [{ id: 'extra:1', parte: 'techo', nombre: 'Membrana', cantidad: 1, precio: 30 }];
    const conExtra = asignacionesConFuturo({}, [...items, { id: 'extra:1', parte: 'techo', subtotal: 30 }], e, futuras);
    const filas = filasDeLaLista({ items, plan, catalogo: cat, proveedores: [], asignaciones: conExtra, estructura: e, otros });
    expect(filas.filter((f) => f.parte === 'techo').every((f) => f.proveedor === A_FUTURO)).toBe(true);
    expect(filas.find((f) => f.id === 'extra:1').proveedor).toBe(A_FUTURO);
  });
});

describe('v1.100: el total dicho entero (Leandro: "me dice 34 millones y estoy lejísimos")', () => {
  it('obra completa, pagado y lo que falta (materiales + mano de obra sin pagar)', () => {
    // Los números del 25/11: obra $ 34,3 M (materiales 22,4 M), pagado 6,2 M (4,6 M de compras y 1,6 M al herrero).
    const r = resumenDelTotal({ precioObra: 34_311_067, materiales: 22_411_067, pagado: 6_183_520,
      compras: { falta: 18_762_977, deuda: 0, pagado: 4_583_520 }, sinPrecio: 27, aFuturo: { materiales: 500_000, manoDeObra: 200_000 } });
    expect(r.manoDeObra).toBe(11_900_000);
    expect(r.faltaManoDeObra).toBe(11_900_000 - 1_600_000);
    expect(r.falta).toBe(18_762_977 + 10_300_000);
    expect(r.sinPrecio).toBe(27);
    expect(r.aFuturo.total).toBe(700_000);
    expect(r.conAvance).toBe(true);
  });
  it('lo retirado sin pagar también falta; sin nada pagado, falta todo', () => {
    expect(resumenDelTotal({ precioObra: 100, materiales: 100, pagado: 0, compras: { falta: 60, deuda: 20, pagado: 0 } }).falta).toBe(80);
    const nada = resumenDelTotal({ precioObra: 150, materiales: 100, pagado: 0, compras: null });
    expect(nada.falta).toBe(150);
    expect(nada.conAvance).toBe(false);
  });
  it('pagar de más a los contratistas no da "falta" negativa', () => {
    expect(resumenDelTotal({ precioObra: 150, materiales: 100, pagado: 500, compras: { falta: 0, deuda: 0, pagado: 0 } }).faltaManoDeObra).toBe(0);
  });
  it('sin precio: uno por material (columnas y zanca del mismo caño son uno)', () => {
    expect(materialesSinPrecio([{ id: 'a', perfilId: 'p1' }, { id: 'b', perfilId: 'p1' }, { id: 'osb' }])).toHaveLength(2);
  });
  it('la obra civil del tapial a futuro, con el precio por unidad de cada material', () => {
    const precios = { cemento: 10000, arena: 30000 };
    expect(montoDeObraCivilAFuturo({ bolsas: 20, arena: 2, ladrilloHueco18: 500 }, (c) => precios[c] ?? null)).toEqual({ monto: 260000, sinPrecio: 1 });
    expect(montoDeObraCivilAFuturo(null, () => 1)).toEqual({ monto: 0, sinPrecio: 0 });
  });
});
