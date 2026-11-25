// Tests v1.93: el avance del herrero sale del armado, y lo que es "a futuro" no suma. Correr con: npm test
import { describe, it, expect } from 'vitest';
import { conAvanceDelArmado, rubroNuevo } from './seguimiento.js';
import { porcentajeDeHierros } from './armado.js';
import { cerrarPresupuesto, validarCierre } from './cierre.js';
import { agruparLista } from './listaCompras.js';
import { A_FUTURO, planDeCompra } from './proveedores.js';
import { generarEstructura } from './estructura.js';
import { CATALOGO_INICIAL, calcularPresupuesto } from './presupuesto.js';
import { resolverCatalogo } from './perfiles.js';
import { PARAMS_INICIALES as P, ABERTURAS_INICIALES } from './parametrosIniciales.js';

describe('v1.93: el avance de un trabajo sale del armado (Leandro: "Zopapa 0 % hecho")', () => {
  const piezas = [
    { id: 'a', largo: 6, grupos: ['A'] }, { id: 'b', largo: 4, grupos: ['A'] },
    { id: 'mad', largo: 10, grupos: ['piso2'], madera: true }, { id: 'tab', largo: 10, grupos: ['tabique'] },
  ];
  it('% de los metros de hierro puestos (sin madera ni tabiques)', () => {
    expect(porcentajeDeHierros(piezas, { a: { instalada: true } })).toBe(60);
    expect(porcentajeDeHierros(piezas, { a: { instalada: true }, b: { instalada: true } })).toBe(100);
  });
  it('solo cambia los trabajos marcados, y al 100 % pone la fecha de fin', () => {
    const rubros = [{ ...rubroNuevo([]), id: 1, avanceDelArmado: true }, { ...rubroNuevo([]), id: 2, avance: 10 }];
    const r = conAvanceDelArmado(rubros, 35);
    expect(r.map((x) => x.avance)).toEqual([35, 10]);
    expect(r[0].estado).toBe('enCurso');
    expect(conAvanceDelArmado(r, 35)).toBe(r); // sin cambios: el mismo arreglo (no se guarda de nuevo)
    expect(conAvanceDelArmado(r, 100, '2026-11-25')[0]).toMatchObject({ estado: 'terminado', fechaFin: '2026-11-25' });
  });
});

describe('v1.93: lo que es a futuro no suma (Leandro: "el tapial es una idea, no será un gasto próximo")', () => {
  it('un segmento de mano de obra a futuro sale del precio y se lista aparte', () => {
    const cierre = { manoDeObra: { modo: 'ninguna', valor: 0 }, imprevistos: 0, ganancia: 0, iva: 0,
      segmentos: [{ id: 1, nombre: 'Herrero', modo: 'global', valor: 3e6 }, { id: 2, nombre: 'Tapial', modo: 'global', valor: 6e6, aFuturo: true }] };
    const r = cerrarPresupuesto(1e6, cierre);
    expect(r.total).toBe(4e6);
    expect(r.aFuturo).toEqual([{ concepto: 'Mano de obra — Tapial', monto: 6e6 }]);
    expect(validarCierre({ ...cierre, segmentos: [{ ...cierre.segmentos[0], aFuturo: 'sí' }] })).not.toEqual({});
  });
  it('un renglón a futuro no entra al plan de compra (ni al total)', () => {
    const cat = resolverCatalogo(CATALOGO_INICIAL);
    const { items } = calcularPresupuesto(generarEstructura(P, ABERTURAS_INICIALES, CATALOGO_INICIAL), CATALOGO_INICIAL, { proveedor: 'prov-1' });
    const plan = planDeCompra(items, cat);
    const algo = plan.compras[0].renglones[0];
    const sin = planDeCompra(items, cat, 'efectivo', { [algo.id]: A_FUTURO });
    expect(sin.compras.flatMap((c) => c.renglones).some((x) => x.id === algo.id)).toBe(false);
    expect(sin.total).toBeLessThan(plan.total);
  });
  it('en la lista, el grupo "a futuro" va después de los proveedores', () => {
    const fila = (id, proveedor) => ({ id, proveedor, parte: 'tapial', parteNombre: 'Tapial', subtotal: 100, falta: 1, precio: 100, sinPagar: 0 });
    const g = agruparLista([fila('a', A_FUTURO), fila('b', 'p1')], [{ id: 'p1', nombre: 'Rionda' }]);
    expect(g.map((x) => x.nombre)).toEqual(['Rionda', 'A futuro (todavía no: no entra en el total)']);
  });
});

describe('v1.93: el tapial a futuro (y las placas fenólicas ya)', async () => {
  const { cuentasDeObraCivil } = await import('./obraCivil.js');
  const base = { ...P, terreno: { ...P.terreno, activo: true, frente: 12, fondo: 27, elementos: [] },
    obraCivil: { tapial: { lados: ['frente', 'fondo'], alto: 2, columnasCada: 3, encofrado: 'fenolico', juegosEncofrado: 2 },
      porton: { activo: true, lado: 'frente', desde: 2, ancho: 3, alto: 2, relleno: 'chapa' } } };
  const e = generarEstructura(base, ABERTURAS_INICIALES, CATALOGO_INICIAL);
  const con = cuentasDeObraCivil(base, e);
  const tapial = (extra) => ({ ...base, obraCivil: { ...base.obraCivil, tapial: { ...base.obraCivil.tapial, ...extra } } });
  it('sus materiales y el portón no se compran; quedan aparte', () => {
    const fut = cuentasDeObraCivil(tapial({ aFuturo: true }), e);
    expect(con.materiales.ladrilloHueco).toBeGreaterThan(0);
    expect(fut.materiales.ladrilloHueco).toBe(0);
    expect(fut.materiales.bolsas).toBeLessThan(con.materiales.bolsas);
    expect(fut.porton).toBeNull();
    expect(fut.aFuturo.materiales.ladrilloHueco).toBe(con.materiales.ladrilloHueco);
    expect(fut.aFuturo.porton).toBeTruthy();
    expect(fut.materiales.fenolicos).toBe(0);
  });
  it('con "las placas fenólicas ya", esas sí se compran', () => {
    const fut = cuentasDeObraCivil(tapial({ aFuturo: true, fenolicosYa: true }), e);
    expect(fut.materiales.fenolicos).toBe(con.materiales.fenolicos);
    expect(fut.materiales.fenolicos).toBeGreaterThan(0);
    expect(fut.aFuturo.materiales.fenolicos).toBe(0);
  });
});
