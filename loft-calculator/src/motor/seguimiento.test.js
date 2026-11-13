// Tests del seguimiento de la obra (v1.47). Correr con: npm test
import { describe, it, expect } from 'vitest';
import { rubroNuevo, pagoNuevo, partesDelPresupuesto, rubrosDesdePresupuesto, cuentasDelRubro, resumenSeguimiento,
  validarSeguimiento, completarSeguimiento, hoy } from './seguimiento.js';
import { cerrarPresupuesto, CIERRE_INICIAL } from './cierre.js';
import { validarParametros } from './validacion.js';
import { migrarParams } from './migracion.js';
import { PARAMS_INICIALES } from './parametrosIniciales.js';

const compras = [{ proveedor: { id: 'p1', nombre: 'Corralón' }, total: 3000000 }, { proveedor: { id: 'p2', nombre: 'Paneles SA' }, total: 2000000 }];
const cierre = cerrarPresupuesto(5000000, { ...CIERRE_INICIAL, manoDeObra: { modo: 'global', valor: 1500000 } });

describe('rubros desde el presupuesto', () => {
  it('uno por proveedor y la mano de obra; con un solo proveedor, uno de materiales', () => {
    const partes = partesDelPresupuesto({ compras, cierre });
    expect(partes.map((p) => [p.origen, p.monto])).toEqual([['proveedor:p1', 3000000], ['proveedor:p2', 2000000], ['manoDeObra', 1500000]]);
    const solo = partesDelPresupuesto({ materiales: 4000000, nombreProveedor: 'Mi proveedor' });
    expect(solo).toEqual([{ origen: 'materiales', nombre: 'Materiales', quien: 'Mi proveedor', monto: 4000000 }]);
  });

  it('armar de nuevo no duplica los que ya están; lo presupuestado sigue al presupuesto', () => {
    const partes = partesDelPresupuesto({ compras, cierre });
    const una = rubrosDesdePresupuesto([], partes);
    expect(rubrosDesdePresupuesto(una, partes)).toHaveLength(3);
    const masCaro = partes.map((p) => (p.origen === 'proveedor:p1' ? { ...p, monto: 3500000 } : p));
    expect(cuentasDelRubro(una[0], masCaro).presupuestado).toBe(3500000);
    expect(cuentasDelRubro(una[0], []).sinOrigen).toBe(true); // se quitó el proveedor
  });
});

describe('pagos y saldo', () => {
  it('pagos parciales, saldo, lo contratado distinto de lo presupuestado y pagado de más', () => {
    const partes = partesDelPresupuesto({ compras, cierre });
    let r = rubrosDesdePresupuesto([], partes)[2]; // mano de obra: presupuestado 1.500.000
    r = { ...r, contratado: 1400000, estado: 'enCurso', pagos: [pagoNuevo([], 500000, '2026-11-01')] };
    r = { ...r, pagos: [...r.pagos, pagoNuevo(r.pagos, 400000, '2026-11-10')] };
    expect(r.pagos.map((p) => p.id)).toEqual([1, 2]);
    expect(cuentasDelRubro(r, partes)).toMatchObject({ presupuestado: 1500000, contratado: 1400000, pagado: 900000, saldo: 500000, pagadoTodo: false });
    const demas = { ...r, pagos: [...r.pagos, pagoNuevo(r.pagos, 600000)] };
    expect(cuentasDelRubro(demas, partes)).toMatchObject({ saldo: 0, deMas: 100000, pagadoTodo: true });
  });

  it('resumen de la obra', () => {
    const partes = partesDelPresupuesto({ compras, cierre });
    const rubros = rubrosDesdePresupuesto([], partes).map((r, i) => (i === 0
      ? { ...r, estado: 'terminado', avance: 100, pagos: [pagoNuevo([], 3000000)] } : r));
    const aMano = { ...rubroNuevo(rubros, { nombre: 'Electricista' }), presupuestado: 800000, pagos: [pagoNuevo([], 200000)] };
    const s = resumenSeguimiento({ rubros: [...rubros, aMano] }, partes);
    expect(s).toMatchObject({ rubros: 4, presupuestado: 7300000, contratado: 7300000, pagado: 3200000, saldo: 4100000, terminados: 1 });
    expect(s.porcentajePagado).toBeCloseTo(43.8, 1);
  });
});

describe('validación y proyectos de antes', () => {
  it('fechas, montos y medios', () => {
    const r = { ...rubroNuevo([], {}), pagos: [pagoNuevo([], 100)] };
    expect(validarSeguimiento({ rubros: [r] })).toEqual({});
    expect(validarSeguimiento({ rubros: [{ ...r, pagos: [{ ...r.pagos[0], monto: -1 }] }] })).toHaveProperty(['seguimiento.rubros.0']);
    expect(validarSeguimiento({ rubros: [{ ...r, fechaFin: '11/11/2026' }] })).toHaveProperty(['seguimiento.rubros.0']);
    expect(hoy(new Date(2026, 10, 5))).toBe('2026-11-05');
  });

  it('los proyectos de antes arrancan sin rubros y validan', () => {
    const { seguimiento, ...viejo } = PARAMS_INICIALES;
    expect(seguimiento).toEqual({ rubros: [] });
    const migrado = migrarParams(viejo);
    expect(migrado.seguimiento).toEqual({ rubros: [] });
    expect(validarParametros(migrado)).toEqual({});
    expect(completarSeguimiento({ rubros: [{ id: 1, nombre: 'x' }] }).rubros[0]).toMatchObject({ estado: 'pendiente', pagos: [], contratado: null });
  });
});

describe('v1.50: seguimiento en el PDF y el Excel', () => {
  it('el informe trae cada rubro con sus cuentas y sus pagos ordenados; el Excel tiene su hoja', async () => {
    const { informeDeSeguimiento, fechaLegible } = await import('./seguimiento.js');
    const { hojasDeObra } = await import('../proyecto/exportarExcel.js');
    const partes = partesDelPresupuesto({ compras, cierre });
    const rubros = rubrosDesdePresupuesto([], partes).map((r, i) => (i === 2
      ? { ...r, estado: 'enCurso', avance: 30, pagos: [pagoNuevo([], 400000, '2026-11-10'), { ...pagoNuevo([{ id: 1 }], 500000, '2026-11-01'), medio: 'efectivo' }] } : r));
    const informe = informeDeSeguimiento({ rubros }, partes);
    const mo = informe.rubros[2];
    expect(mo).toMatchObject({ nombre: 'Mano de obra', estado: 'En proceso · 30 % hecho · 60 % pagado', contratado: 1500000, pagado: 900000, falta: 600000 });
    expect(mo.pagos.map((p) => [fechaLegible(p.fecha), p.medio])).toEqual([['01/11/2026', 'Efectivo'], ['10/11/2026', 'Transferencia']]);
    const hojas = hojasDeObra({ nombre: 'x', params: PARAMS_INICIALES, vistas: { paredes: [], plantas: [] }, items: [], total: 0, seguimiento: informe },
      { seguimiento: true });
    expect(hojas.map((h) => h.nombre)).toEqual(['Seguimiento']);
    const filas = hojas[0].filas.map((f) => (Array.isArray(f) ? f : f.celdas));
    expect(filas.some((f) => f[0] === 'Pagado' && f[1].pesos === 900000)).toBe(true);
    expect(filas.some((f) => f[0] === '  Pago 01/11/2026')).toBe(true);
  });
});
