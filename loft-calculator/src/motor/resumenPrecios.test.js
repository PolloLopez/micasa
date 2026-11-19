// Tests del resumen de precios de la pestaña Materiales (v1.65). Correr con: npm test
import { describe, it, expect } from 'vitest';
import { textoDePrecio, preciosCargados, preciosOrdenados, antiguedadDePrecios, proveedoresConPreciosViejos, DIAS_PRECIO_VIEJO } from './resumenPrecios.js';
import { conProveedores } from './proveedores.js';
import { MAS_BARATO } from './proveedores.js';

const proveedores = [
  { id: 'p1', nombre: 'Centro', recargoTarjeta: 10 },
  { id: 'p2', nombre: 'Gramabi', recargoTarjeta: 0 },
  { id: 'p3', nombre: 'Vastek', recargoTarjeta: 0 },
];
const cano = { id: 'c', precios: { p1: { efectivo: 91820 }, p2: { efectivo: 90300 } } };
const sinNada = { id: 's', precios: {} };
const n = (t) => t.replace(/\s/g, ' '); // toLocaleString usa espacio duro

describe('textoDePrecio', () => {
  it('en el elegido y avisa si otro es más barato', () => {
    const r = textoDePrecio(cano, proveedores, 'p1');
    expect(r.falta).toBe(false);
    expect(n(r.texto)).toMatch(/91\.820 en Centro \(más barato: \$ 90\.300 en Gramabi\)/);
  });
  it('el elegido no lo vende: lo dice y muestra desde cuánto en otro (antes decía solo "sin precio")', () => {
    const r = textoDePrecio(cano, proveedores, 'p3');
    expect(r.falta).toBe(true);
    expect(n(r.texto)).toMatch(/^sin precio en Vastek · desde \$ 90\.300 en Gramabi$/);
  });
  it('el más barato y sin precio en ninguno', () => {
    expect(n(textoDePrecio(cano, proveedores, MAS_BARATO).texto)).toMatch(/90\.300 en Gramabi$/);
    expect(textoDePrecio(sinNada, proveedores, 'p1')).toEqual({ texto: 'sin precio', falta: true, sospechoso: false });
  });
  it('marca un precio tipeado de más (11.111.111.111.111)', () => {
    expect(textoDePrecio({ precios: { p1: { efectivo: 11111111111111 } } }, proveedores, 'p1').sospechoso).toBe(true);
  });
  it('con tarjeta usa el recargo', () => {
    expect(preciosOrdenados(cano, proveedores, 'tarjeta').map((o) => o.precio)).toEqual([90300, 101002]);
  });
});

describe('preciosCargados', () => {
  it('cuenta cuántos materiales de la obra tienen precio en el proveedor', () => {
    expect(preciosCargados(proveedores[0], [cano, sinNada])).toEqual({ cargados: 1, total: 2, sospechosos: 0 });
    expect(preciosCargados(proveedores[2], [cano, sinNada]).cargados).toBe(0);
  });
});

describe('fecha de los precios (v1.74)', () => {
  it('cuenta los días y avisa pasado el mes', () => {
    expect(antiguedadDePrecios({ preciosAl: '' }, '2026-11-18')).toBeNull();
    expect(antiguedadDePrecios({}, '2026-11-18')).toBeNull();
    expect(antiguedadDePrecios({ preciosAl: '2026-11-18' }, '2026-11-18')).toMatchObject({ dias: 0, vieja: false, texto: 'precios de hoy' });
    expect(antiguedadDePrecios({ preciosAl: '2026-11-17' }, '2026-11-18').texto).toBe('precios de ayer');
    expect(antiguedadDePrecios({ preciosAl: '2026-10-19' }, '2026-11-18')).toMatchObject({ dias: DIAS_PRECIO_VIEJO, vieja: false });
    expect(antiguedadDePrecios({ preciosAl: '2026-10-18' }, '2026-11-18')).toMatchObject({ dias: 31, vieja: true, texto: 'precios del 18/10 (hace 31 días)' });
    // Cambio de horario o de año: los días se cuentan por fecha, no por horas.
    expect(antiguedadDePrecios({ preciosAl: '2025-12-31' }, '2026-01-02').dias).toBe(2);
  });
  it('solo los viejos van al aviso; la fecha se guarda al abrir el proyecto (y una mala se descarta)', () => {
    const lista = [{ id: 'a', nombre: 'Rionda', preciosAl: '2026-09-01' }, { id: 'b', nombre: 'Hernandez', preciosAl: '2026-11-10' }, { id: 'c', nombre: 'Sin' }];
    expect(proveedoresConPreciosViejos(lista, '2026-11-18').map((v) => v.proveedor.nombre)).toEqual(['Rionda']);
    const cat = conProveedores([], [{ id: 'p1', categoria: 'proveedor', nombre: 'X', preciosAl: '2026-11-01' }, { id: 'p2', categoria: 'proveedor', nombre: 'Y', preciosAl: 'ayer' }]);
    expect(cat.filter((i) => i.categoria === 'proveedor').map((p) => p.preciosAl)).toEqual(['2026-11-01', '']);
  });
});
