// Tests de proveedores y precios por proveedor (v1.25). Correr con: npm test
import { describe, it, expect } from 'vitest';
import { precioEn, aplicarProveedor, conProveedores, faltanPrecios, MAS_BARATO, PROVEEDOR_INICIAL, precioBarraPorKg, conPrecioCambiado, leerPrecio } from './proveedores.js';
import { kgPorMetro } from './perfiles.js';
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

describe('v1.77: precio por kilo', () => {
  // Caño 80x80x2.0 de 6 m: ~4,9 kg/m (kgPorMetro calcula la sección).
  const cano = { id: 'perfil-9', categoria: 'hierro', tipo: 'cuadrado', a: 80, b: 80, c: 0, espesor: 2, largoBarra: 6, texto: '', kgm: 0 };
  const prov = { id: 'p1', nombre: 'Rionda', recargoTarjeta: 10 };
  it('la barra sale de $/kg × kg/m × largo; con tarjeta lleva el recargo', () => {
    const conKg = { ...cano, precios: { p1: { efectivo: null, tarjeta: null, porKg: 2000 } } };
    const kgBarra = kgPorMetro(cano) * 6;
    expect(precioBarraPorKg(cano, 2000)).toBe(Math.round(2000 * kgBarra));
    expect(precioEn(conKg, prov, 'efectivo')).toBe(Math.round(2000 * kgBarra));
    expect(precioEn(conKg, prov, 'tarjeta')).toBe(Math.round(Math.round(2000 * kgBarra) * 1.1));
  });
  it('sin peso (un "otro" sin kg/m) o si no es hierro, no hay precio por kilo', () => {
    expect(precioBarraPorKg({ ...cano, tipo: 'otro', kgm: 0 }, 2000)).toBeNull();
    expect(precioBarraPorKg({ id: 'osb', categoria: 'placa' }, 2000)).toBeNull();
    expect(precioEn({ ...cano, tipo: 'otro', kgm: 0, precios: { p1: { efectivo: null, porKg: 2000 } } }, prov, 'efectivo')).toBeNull();
  });
  it('por barra y por kilo se excluyen al cargarlos', () => {
    expect(conPrecioCambiado({ efectivo: 50000, tarjeta: null }, 'porKg', 2000)).toEqual({ efectivo: null, tarjeta: null, porKg: 2000 });
    expect(conPrecioCambiado({ efectivo: null, tarjeta: null, porKg: 2000 }, 'efectivo', 48000)).toEqual({ efectivo: 48000, tarjeta: null });
    expect(conPrecioCambiado({ efectivo: null, tarjeta: null, porKg: 2000 }, 'porKg', null)).toEqual({ efectivo: null, tarjeta: null });
    expect(conPrecioCambiado(undefined, 'tarjeta', 9)).toEqual({ efectivo: null, tarjeta: 9 });
  });
  it('el $/kg se guarda con el proyecto (y uno inválido se descarta)', () => {
    const cat = conProveedores([{ ...cano, precios: { p1: { efectivo: null, porKg: 2100 } } }], [{ id: 'p1', categoria: 'proveedor', nombre: 'Rionda' }]);
    expect(cat.find((i) => i.id === 'perfil-9').precios.p1.porKg).toBe(2100);
    const malo = conProveedores([{ ...cano, precios: { p1: { efectivo: 5, porKg: -3 } } }], [{ id: 'p1', categoria: 'proveedor', nombre: 'Rionda' }]);
    expect(malo.find((i) => i.id === 'perfil-9').precios.p1.porKg).toBeUndefined();
  });
});

describe('v1.81: proveedor en dólares (ALPANEL)', () => {
  const alpanel = { id: 'prov-2', categoria: 'proveedor', nombre: 'ALPANEL', recargoTarjeta: 10, moneda: 'USD', dolar: 1450 };
  const panel = { id: 'panelMuros', categoria: 'panel', precios: { 'prov-2': { efectivo: 245.5, tarjeta: null } } };

  it('sus precios se cargan en US$ y se pasan a pesos con su dólar (y la tarjeta, con el recargo)', () => {
    expect(precioEn(panel, alpanel, 'efectivo')).toBe(355975); // 245,50 x 1450
    expect(precioEn(panel, alpanel, 'tarjeta')).toBe(Math.round(355975 * 1.1));
    expect(precioEn(panel, { ...alpanel, moneda: 'ARS' }, 'efectivo')).toBe(245.5); // en pesos, tal cual
    expect(precioEn(panel, { ...alpanel, dolar: 0 }, 'efectivo')).toBe(0); // sin dólar cargado: 0 (la ficha avisa)
  });

  it('se guarda la moneda y el dólar; los de antes quedan en pesos', () => {
    const c = normalizarCatalogo([{ ...alpanel }, { id: 'prov-3', categoria: 'proveedor', nombre: 'Rionda' }]);
    expect(c.find((i) => i.id === 'prov-2')).toMatchObject({ moneda: 'USD', dolar: 1450 });
    expect(c.find((i) => i.id === 'prov-3')).toMatchObject({ moneda: 'ARS', dolar: 0 });
    expect(normalizarCatalogo([{ ...alpanel, dolar: -3 }]).find((i) => i.id === 'prov-2').dolar).toBe(0);
  });

  it('un precio escrito a mano: con miles o con centavos', () => {
    expect(leerPrecio('38.000')).toBe(38000);
    expect(leerPrecio('38000')).toBe(38000);
    expect(leerPrecio('245,50')).toBe(245.5);
    expect(leerPrecio('245.5')).toBe(245.5);
    expect(leerPrecio('US$ 1.234,56')).toBe(1234.56);
    expect(leerPrecio('-4')).toBeNull();
    expect(leerPrecio('abc')).toBeNull();
  });
});
