// Tests de las compras hechas y los contratistas (v1.69). Correr con: npm test
import { describe, it, expect } from 'vitest';
import { compraNueva, renglonNuevo, cuentasDeCompra, resumenDeCompras, trabajosPorContratista,
  contratistasDesdeQuien, errorDeCompra, contratistaNuevo } from './compras.js';
import { completarSeguimiento, validarSeguimiento, cuentasDelRubro } from './seguimiento.js';

const lista = [
  { clave: 'cemento', nombre: 'Cemento', cantidad: 20, unidad: 'bolsas', precio: 12000, subtotal: 240000 },
  { clave: 'perfil-1', nombre: 'Caño 80x80x2.0', cantidad: 22, unidad: 'barra', precio: 90000, subtotal: 1980000 },
];

describe('compras hechas', () => {
  it('una compra por material descuenta cantidad y plata de lo que falta', () => {
    const c = { ...compraNueva([], '2026-11-01'), proveedor: 'Corralón', renglones: [
      { ...renglonNuevo([], lista[0]), cantidad: 12, monto: 150000, para: 'Pilotines' },
    ] };
    const r = resumenDeCompras(lista, [c], 2220000);
    expect(r.gastado).toBe(150000);
    expect(r.materiales[0]).toMatchObject({ comprado: 12, faltaCantidad: 8, faltaMonto: 96000 });
    expect(r.falta).toBe(2220000 - 12 * 12000); // lo comprado se descuenta a precio del presupuesto
  });
  it('un ticket suelto descuenta plata del total; lo de más no resta de otros materiales', () => {
    const ticket = { ...compraNueva([]), renglones: [{ ...renglonNuevo([]), nombre: 'Fierros varios', monto: 500000 }] };
    const deMas = { ...compraNueva([ticket]), renglones: [{ ...renglonNuevo([], lista[1]), cantidad: 30, monto: 2700000 }] };
    const r = resumenDeCompras(lista, [ticket, deMas], 2220000);
    expect(r.materiales[1].faltaCantidad).toBe(0);
    expect(r.falta).toBe(Math.max(0, 2220000 - 1980000 - 500000));
  });
  it('pagada entera de fábrica; si no, lo que falta pagar', () => {
    const c = { ...compraNueva([]), renglones: [{ ...renglonNuevo([]), monto: 1000 }] };
    expect(cuentasDeCompra(c)).toEqual({ total: 1000, pagado: 1000, falta: 0 });
    expect(cuentasDeCompra({ ...c, pagada: false, faltaPagar: 400 })).toEqual({ total: 1000, pagado: 600, falta: 400 });
    expect(errorDeCompra({ ...c, fecha: 'ayer' })).toBe('Fecha inválida');
    expect(errorDeCompra(c)).toBeNull();
  });
});

describe('contratistas', () => {
  const rubros = [
    { id: 1, nombre: 'Pilotines', origen: '', quien: 'Jose', pagos: [{ id: 1, fecha: '2026-11-01', monto: 300, medio: 'efectivo', nota: '' }], presupuestado: 900, contratado: null },
    { id: 2, nombre: 'Pilar de luz', origen: '', quien: 'jose ', pagos: [], presupuestado: 100, contratado: null },
    { id: 3, nombre: 'Materiales — Centro', origen: 'proveedor:prov-1', quien: 'Centro', pagos: [], presupuestado: 0, contratado: null },
    { id: 4, nombre: 'Electricidad', origen: '', quien: '', pagos: [], presupuestado: 50, contratado: null },
  ];
  it('los proyectos de antes arman la lista con los nombres de "Quién" (no los proveedores de materiales)', () => {
    const { contratistas, rubros: r } = contratistasDesdeQuien(rubros);
    expect(contratistas.map((c) => c.nombre)).toEqual(['Jose']);
    expect(r.map((x) => x.contratista)).toEqual([1, 1, null, null]);
    const s = completarSeguimiento({ rubros });
    expect(s.contratistas).toHaveLength(1);
    expect(validarSeguimiento(s)).toEqual({});
  });
  it('los trabajos agrupados por contratista con lo contratado, pagado y lo que falta', () => {
    const s = completarSeguimiento({ rubros });
    const grupos = trabajosPorContratista(s, (r) => cuentasDelRubro(r, []));
    expect(grupos.map((g) => [g.contratista?.nombre ?? 'Sin asignar', g.trabajos.length, g.contratado, g.pagado, g.falta]))
      .toEqual([['Jose', 2, 1000, 300, 700], ['Sin asignar', 1, 50, 0, 50]]);
    expect(contratistaNuevo(s.contratistas).id).toBe(2);
  });
});
