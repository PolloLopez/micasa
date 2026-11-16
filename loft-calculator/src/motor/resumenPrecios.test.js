// Tests del resumen de precios de la pestaña Materiales (v1.65). Correr con: npm test
import { describe, it, expect } from 'vitest';
import { textoDePrecio, preciosCargados, preciosOrdenados } from './resumenPrecios.js';
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
