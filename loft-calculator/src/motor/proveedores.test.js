// Tests de proveedores y precios por proveedor (v1.25). Correr con: npm test
import { describe, it, expect } from 'vitest';
import { precioEn, aplicarProveedor, conProveedores, faltanPrecios, MAS_BARATO, PROVEEDOR_INICIAL } from './proveedores.js';
import { normalizarCatalogo } from './migracion.js';
import { calcularPresupuesto, CATALOGO_INICIAL } from './presupuesto.js';
import { generarEstructura } from './estructura.js';
import { PARAMS_INICIALES as P } from './parametrosIniciales.js';
import { INSUMO } from './constantes.js';

const hierros = { id: 'h', categoria: 'proveedor', nombre: 'Hierros', recargoTarjeta: 10 };
const corralon = { id: 'c', categoria: 'proveedor', nombre: 'Corralón', recargoTarjeta: 15 };

describe('precio de un material en un proveedor', () => {
  const material = { id: 'm', categoria: 'placa', precios: { h: { efectivo: 1000, tarjeta: null }, c: { efectivo: 900, tarjeta: 1200 } } };

  it('efectivo; tarjeta = efectivo + recargo, salvo que tenga precio propio con tarjeta', () => {
    expect(precioEn(material, hierros, 'efectivo')).toBe(1000);
    expect(precioEn(material, hierros, 'tarjeta')).toBe(1100); // +10 %
    expect(precioEn(material, corralon, 'tarjeta')).toBe(1200); // el propio manda
  });

  it('un proveedor que no lo tiene: null', () => {
    expect(precioEn({ ...material, precios: {} }, hierros, 'efectivo')).toBeNull();
  });

  it('aplicarProveedor deja el precio elegido; "el más barato" toma el menor y dice de quién es', () => {
    const cat = [material, hierros, corralon];
    expect(aplicarProveedor(cat, 'h', 'tarjeta')[0]).toMatchObject({ precio: 1100, sinPrecio: false });
    expect(aplicarProveedor(cat, MAS_BARATO, 'efectivo')[0]).toMatchObject({ precio: 900, proveedorDelPrecio: 'Corralón' });
    expect(aplicarProveedor(cat, MAS_BARATO, 'tarjeta')[0]).toMatchObject({ precio: 1100, proveedorDelPrecio: 'Hierros' });
  });

  it('sin precio en ese proveedor: $0 y marcado (para avisar que el total está incompleto)', () => {
    const cat = [{ ...material, precios: { c: { efectivo: 900, tarjeta: null } } }, hierros, corralon];
    const r = aplicarProveedor(cat, 'h', 'efectivo')[0];
    expect(r).toMatchObject({ precio: 0, sinPrecio: true });
    expect(faltanPrecios([{ nombre: 'OSB', cantidad: 3, sinPrecio: true }, { nombre: 'X', cantidad: 0, sinPrecio: true }])).toEqual(['OSB']);
  });
});

describe('proyectos de antes de v1.25', () => {
  it('se crea "Mi proveedor" y cada precio pasa a ser su precio en efectivo', () => {
    const viejo = [{ id: 'osb', categoria: 'placa', perfil: 'OSB', precio: 28000 }];
    const c = normalizarCatalogo(viejo);
    const proveedores = c.filter((i) => i.categoria === 'proveedor');
    expect(proveedores).toEqual([PROVEEDOR_INICIAL]);
    expect(c.find((i) => i.id === 'osb').precios).toEqual({ 'prov-1': { efectivo: 28000, tarjeta: null } });
    // Los perfiles de la lista y los paneles también; los usos de perfil (Columnas…) no: toman el de su perfil.
    expect(c.filter((i) => i.categoria === 'hierro').every((h) => h.precios['prov-1'])).toBe(true);
    expect(c.find((i) => i.id === INSUMO.COLUMNA).precios).toBeUndefined();
  });

  it('el total con "Mi proveedor" en efectivo es el mismo de siempre', () => {
    const e = generarEstructura(P, []);
    const antes = calcularPresupuesto(e, CATALOGO_INICIAL).total;
    expect(calcularPresupuesto(e, CATALOGO_INICIAL, { proveedor: 'prov-1', pago: 'efectivo' }).total).toBe(antes);
  });

  it('normalizar dos veces da lo mismo (estable) y conserva proveedores y precios cargados', () => {
    const conDos = conProveedores(CATALOGO_INICIAL.filter((i) => i.categoria !== 'proveedor'),
      [...CATALOGO_INICIAL, { ...hierros }]);
    const una = normalizarCatalogo(conDos);
    expect(una.filter((i) => i.categoria === 'proveedor').map((p) => p.nombre)).toEqual(['Mi proveedor', 'Hierros']);
    expect(normalizarCatalogo(una)).toEqual(una);
  });
});

describe('comparar presupuestos', () => {
  const e = generarEstructura(P, []);
  // Segundo proveedor: todo 10 % más barato en efectivo, 20 % de recargo con tarjeta; no tiene pilotines.
  const conOtro = [
    ...CATALOGO_INICIAL.map((i) => (i.precios?.['prov-1'] ? {
      ...i,
      precios: { ...i.precios, ...(i.id === INSUMO.PILOTIN ? {} : { otro: { efectivo: Math.round(i.precios['prov-1'].efectivo * 0.9), tarjeta: null } }) },
    } : i)),
    { id: 'otro', categoria: 'proveedor', nombre: 'Otro', recargoTarjeta: 20, nota: '' },
  ];
  const total = (proveedor, pago) => calcularPresupuesto(e, conOtro, { proveedor, pago });

  it('cada proveedor da su total y avisa lo que le falta', () => {
    const otro = total('otro', 'efectivo');
    expect(otro.total).toBeLessThan(total('prov-1', 'efectivo').total);
    expect(faltanPrecios(otro.items)).toEqual(['Pilotines']);
    expect(total('otro', 'tarjeta').total).toBeGreaterThan(otro.total);
  });

  it('"el más barato de cada material" nunca es más caro que ninguno y no le falta nada', () => {
    const barato = total(MAS_BARATO, 'efectivo');
    expect(barato.total).toBeLessThanOrEqual(total('prov-1', 'efectivo').total);
    expect(faltanPrecios(barato.items)).toEqual([]);
    expect(barato.items.find((i) => i.id === INSUMO.PILOTIN).proveedorDelPrecio).toBe('Mi proveedor');
  });
});
