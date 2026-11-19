// Tests de la lista de compras (v1.72). Correr con: npm test
import { describe, it, expect } from 'vitest';
import { filasDeLaLista, agruparLista, compraDesdeLista, pagarRetirado, ultimaDesdeLista, deshacerMarca, informeDeCompras, estadoDeFila } from './listaCompras.js';
import { planDeCompra, conProveedores, NINGUNO } from './proveedores.js';
import { compradoPorMaterial, cuentasDeCompra } from './compras.js';

const catalogo = conProveedores([
  { id: 'perfil-1', categoria: 'hierro', nombre: 'Caño 80', precios: { a: { efectivo: 100 }, b: { efectivo: 90 } } },
  { id: 'cemento', categoria: 'unidad', nombre: 'Cemento', precios: { a: { efectivo: 10 } } },
], [{ id: 'a', categoria: 'proveedor', nombre: 'Rionda' }, { id: 'b', categoria: 'proveedor', nombre: 'Hernandez' }]);
const proveedores = catalogo.filter((i) => i.categoria === 'proveedor');
const items = [
  { id: 'columna', nombre: 'Columnas', perfil: 'Caño 80x80', perfilId: 'perfil-1', cantidad: 10, unidad: 'barra', largoBarra: 6 },
  { id: 'cemento', nombre: 'Cemento', perfil: 'Portland 50 kg', cantidad: 7, unidad: 'bolsas' },
];

describe('lista de compras', () => {
  it('cada renglón con el proveedor del plan; elegido a mano le gana; "ninguno" sale del plan', () => {
    const plan = planDeCompra(items, catalogo);
    let filas = filasDeLaLista({ items, plan, catalogo, proveedores });
    expect(filas.map((f) => [f.id, f.proveedor, f.precio])).toEqual([['columna', 'b', 90], ['cemento', 'a', 10]]);
    const asignaciones = { columna: 'a', cemento: NINGUNO };
    const plan2 = planDeCompra(items, catalogo, 'efectivo', asignaciones);
    expect(plan2.total).toBe(1000); // solo las columnas en Rionda; el cemento no se compra
    filas = filasDeLaLista({ items, plan: plan2, catalogo, proveedores, asignaciones });
    expect(filas.map((f) => [f.proveedor, f.aMano, f.subtotal])).toEqual([['a', 'a', 1000], [NINGUNO, NINGUNO, 0]]);
    const grupos = agruparLista(filas, proveedores);
    expect(grupos.map((g) => g.nombre)).toEqual(['Rionda', 'No se compra (lo consigo yo / ya lo tengo)']);
  });
  it('retirado sin pagar (una parte), después pagado: queda como compra y descuenta lo que falta', () => {
    const plan = planDeCompra(items, catalogo);
    const fila = filasDeLaLista({ items, plan, catalogo, proveedores })[0];
    let compras = [compraDesdeLista([], fila, 4, 'Hernandez', false, '2026-11-17')];
    expect(cuentasDeCompra(compras[0])).toEqual({ total: 360, pagado: 0, falta: 360 });
    expect(compradoPorMaterial(compras).get('perfil-1').cantidad).toBe(4);
    let f = filasDeLaLista({ items, plan, catalogo, proveedores, compras })[0];
    expect([f.retirado, f.sinPagar, f.pagado, f.falta]).toEqual([4, 4, 0, 6]);
    compras = pagarRetirado(compras, 'columna');
    f = filasDeLaLista({ items, plan, catalogo, proveedores, compras })[0];
    expect([f.retirado, f.sinPagar, f.pagado, f.falta]).toEqual([4, 0, 4, 6]);
  });
  it('una parte terminada no tiene faltante', () => {
    const f = filasDeLaLista({ items, catalogo, proveedores, terminadas: ['paredes'] })[0];
    expect([f.parte, f.falta, f.terminada]).toEqual(['paredes', 0, true]);
  });
  it('deshacer: borra solo la última marca de ese renglón hecha desde la lista', () => {
    const plan = planDeCompra(items, catalogo);
    const fila = filasDeLaLista({ items, plan, catalogo, proveedores })[0];
    let compras = [compraDesdeLista([], fila, 2, 'Hernandez', true, '2026-11-17')];
    compras = [compraDesdeLista(compras, fila, 3, 'Hernandez', false, '2026-11-18'), ...compras];
    const aMano = { id: 9, fecha: '2026-11-18', proveedor: 'X', nota: 'a mano', pagada: true, faltaPagar: 0,
      renglones: [{ id: 1, material: 'perfil-1', renglon: fila.id, nombre: 'x', cantidad: 1, unidad: 'barra', monto: 1, para: '' }] };
    compras = [aMano, ...compras];
    expect(ultimaDesdeLista(compras, fila.id).id).toBe(2);
    compras = deshacerMarca(compras, fila.id);
    expect(compras.map((c) => c.id)).toEqual([9, 1]); // la cargada a mano no se toca
    compras = deshacerMarca(compras, fila.id);
    expect(compras.map((c) => c.id)).toEqual([9]);
    expect(deshacerMarca(compras, fila.id)).toBe(compras); // ya no hay nada que deshacer
    expect(ultimaDesdeLista(compras, 'otro')).toBeNull();
  });
});

describe('informe de compras para el PDF y el Excel (v1.74)', () => {
  it('lista por proveedor, las compras hechas por fecha y solo lo que falta si se pide', () => {
    const plan = planDeCompra(items, catalogo);
    const fila0 = filasDeLaLista({ items, plan, catalogo, proveedores })[0];
    const compras = [compraDesdeLista([], fila0, 10, 'Hernandez', true, '2026-11-17')];
    const filas = filasDeLaLista({ items, plan, catalogo, proveedores, compras });
    const inf = informeDeCompras(filas, proveedores, compras);
    expect(inf.compras).toHaveLength(1);
    expect(inf.compras[0]).toMatchObject({ fecha: '2026-11-17', proveedor: 'Hernandez', pagado: inf.compras[0].total, falta: 0 });
    expect(inf.grupos.flatMap((g) => g.filas).find((f) => f.uso === fila0.nombre).estado).toBe('✓ comprado y pagado');
    const falta = informeDeCompras(filas, proveedores, compras, true);
    expect(falta.grupos.flatMap((g) => g.filas).some((f) => f.uso === fila0.nombre)).toBe(false);
    expect(falta.totales).toEqual(inf.totales); // los totales son de toda la lista
    expect(estadoDeFila({ terminada: false, sinPagar: 0, retirado: 0, falta: 3 })[0]).toBe('falta');
  });
});
