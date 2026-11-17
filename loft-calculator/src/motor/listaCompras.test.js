// Tests de la lista de compras (v1.72). Correr con: npm test
import { describe, it, expect } from 'vitest';
import { filasDeLaLista, agruparLista, compraDesdeLista, pagarRetirado } from './listaCompras.js';
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
});
