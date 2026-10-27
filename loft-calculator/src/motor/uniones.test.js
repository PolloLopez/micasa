// Tests de las uniones (v1.33): qué queda entero, qué se corta y cuánto se descuenta. Correr con: npm test
import { describe, it, expect } from 'vitest';
import { generarEstructura, listarPiezas } from './estructura.js';
import { calcularPresupuesto, CATALOGO_INICIAL } from './presupuesto.js';
import { normalizarCatalogo, migrarParams } from './migracion.js';
import { PARAMS_INICIALES as P, ABERTURAS_INICIALES } from './parametrosIniciales.js';
import { medidaVista, completarUniones, validarUniones } from './uniones.js';
import { validarAbertura, validarParametros } from './validacion.js';

const CATALOGO = normalizarCatalogo(CATALOGO_INICIAL);
const conRed = (cambios = {}) => ({ ...P, ...cambios, uniones: { modo: 'red', luz: 0, ...(cambios.uniones ?? {}) } });
const eje = (params = P, aberturas = ABERTURAS_INICIALES) => generarEstructura({ ...params, uniones: { modo: 'eje', luz: 0 } }, aberturas, CATALOGO);
const red = (params = conRed(), aberturas = ABERTURAS_INICIALES) => generarEstructura(params, aberturas, CATALOGO);
const deTipo = (e, tipo) => listarPiezas(e).filter((p) => p.tipo === tipo);
const mitad = (tipo) => medidaVista({ tipo }, CATALOGO) / 2;

describe('las fajas no cruzan las aberturas (también eje a eje)', () => {
  it('la faja a la altura de la ventana y de la puerta se corta en sus marcos y no pasa por los vanos', () => {
    // En A: puerta de 0.90 (hasta 2.05) y ventana de 1.50 (de 1.10 a 1.70). La faja de 1.60 cruza las dos.
    const altura = P.elevacion + 1.6;
    const fajas = deTipo(eje(), 'horizontal').filter((p) => p.grupos.includes('A') && Math.abs(p.desde[1] - altura) < 1e-6);
    expect(fajas.length).toBe(3);
    const total = fajas.reduce((a, p) => a + p.largo, 0);
    expect(total).toBeCloseTo(P.largo - 0.9 - 1.5, 6); // el ancho de los vanos ya no se compra
    // Una faja que no toca ninguna abertura conserva su id de siempre.
    expect(deTipo(eje(), 'horizontal').some((p) => p.id === 'horiz:C:1')).toBe(true);
  });
});

describe('red: la pieza que se corta pierde media medida del perfil entero en cada cruce', () => {
  it('las columnas van entre el marco de piso y la solera', () => {
    const antes = deTipo(eje(), 'columna').find((p) => p.id.startsWith('col:') && !p.esquina && p.grupos.includes('C'));
    const despues = listarPiezas(red()).find((p) => p.id === antes.id);
    expect(despues.largo).toBeCloseTo(antes.largo - mitad('marco-piso') - mitad('solera'), 4);
    expect(despues.largoEje).toBeCloseTo(antes.largo, 6);
  });

  it('las fajas quedan en tramos entre columnas (descontando el ancho de cada columna)', () => {
    const fajasEje = deTipo(eje(), 'horizontal').filter((p) => p.id.startsWith('horiz:C:1'));
    const fajasRed = deTipo(red(), 'horizontal').filter((p) => p.id.startsWith('horiz:C:1'));
    expect(fajasEje.length).toBe(1);
    // Pared C (7.50, sin aberturas): un tramo entre cada par de columnas seguidas.
    const columnas = deTipo(eje(), 'columna').filter((p) => p.grupos.includes('C'));
    expect(fajasRed.length).toBe(columnas.length - 1);
    // A cada columna del medio se le descuenta el ancho entero; a las dos de esquina, la mitad.
    const ancho = (p) => medidaVista(p, CATALOGO);
    const descuento = columnas.reduce((a, p) => a + (p.esquina ? ancho(p) / 2 : ancho(p)), 0);
    const total = fajasRed.reduce((a, p) => a + p.largo, 0);
    expect(total).toBeCloseTo(7.5 - descuento, 4);
  });

  it('en el piso: bordes largos enteros, cortos entre ellos; tirantes entre bordes; transversales entre tirantes', () => {
    const bordesEje = deTipo(eje(), 'marco-piso');
    const bordesRed = deTipo(red(), 'marco-piso');
    const largos = (lista) => lista.map((p) => p.largo).sort((a, b) => a - b);
    expect(largos(bordesRed)).toEqual(largos(bordesEje).map((l) => (l < 7 ? Number((l - 2 * mitad('marco-piso')).toFixed(4)) : l)));
    const tiranteEje = deTipo(eje(), 'piso')[0];
    const tiranteRed = listarPiezas(red()).find((p) => p.id === tiranteEje.id);
    expect(tiranteRed.largo).toBeCloseTo(tiranteEje.largo - 2 * mitad('marco-piso'), 4);
    const transvRed = deTipo(red(), 'transv-piso');
    const transvEje = deTipo(eje(), 'transv-piso');
    expect(transvRed.length).toBe(transvEje.length);
    expect(transvRed.reduce((a, p) => a + p.largo, 0)).toBeLessThan(transvEje.reduce((a, p) => a + p.largo, 0));
  });

  it('el marco de la abertura: jambas enteras, dintel entre jambas; la luz para soldar se descuenta en cada punta', () => {
    const dintelEje = deTipo(eje(), 'dintel')[0];
    const dintelRed = listarPiezas(red()).find((p) => p.id === dintelEje.id);
    expect(dintelRed.largo).toBeCloseTo(dintelEje.largo - 2 * mitad('jamba'), 4);
    const conLuz = listarPiezas(red(conRed({ uniones: { luz: 0.002 } }))).find((p) => p.id === dintelEje.id);
    expect(conLuz.largo).toBeCloseTo(dintelRed.largo - 0.004, 6);
    // La jamba sigue entera (solo pierde las soleras de arriba y de abajo).
    const jambaEje = deTipo(eje(), 'jamba')[0];
    const jambaRed = listarPiezas(red()).find((p) => p.id === jambaEje.id);
    expect(jambaRed.largo).toBeCloseTo(jambaEje.largo - mitad('marco-piso') - mitad('solera'), 4);
  });

  it('el techo, las riostras y la escalera no cambian', () => {
    const ids = (e, tipos) => listarPiezas(e).filter((p) => tipos.includes(p.tipo)).map((p) => `${p.id}=${p.largo}`).sort();
    const tipos = ['viga-techo', 'correa-techo', 'borde-techo', 'riostra', 'zanca', 'apoyo-escalon'];
    expect(ids(red(), tipos)).toEqual(ids(eje(), tipos));
  });

  it('cuenta lo descontado y compra menos (o igual) hierro', () => {
    const e = red();
    expect(e.uniones.modo).toBe('red');
    expect(e.uniones.metrosDescontados).toBeGreaterThan(1);
    const barras = (est) => calcularPresupuesto(est, CATALOGO, { proveedor: 'prov-1' }).items
      .filter((i) => i.unidad === 'barra').reduce((a, i) => a + i.cantidad, 0);
    expect(barras(e)).toBeLessThanOrEqual(barras(eje()));
    expect(eje().uniones).toEqual({ modo: 'eje', metrosDescontados: 0, cortes: 0 });
  });
});

describe('perfil propio del marco de cada abertura', () => {
  it('sale en un renglón aparte con el nombre de la abertura', () => {
    const perfil = CATALOGO.find((i) => i.categoria === 'hierro' && i.id !== CATALOGO.find((u) => u.id === 'marcoAbertura').perfilId);
    const aberturas = ABERTURAS_INICIALES.map((op) => (op.id === 2 ? { ...op, perfilMarco: perfil.id } : op));
    const items = calcularPresupuesto(red(conRed(), aberturas), CATALOGO, { proveedor: 'prov-1' }).items;
    expect(items.some((i) => i.nombre === 'Marcos de aberturas (abertura #2)')).toBe(true);
    expect(validarAbertura({ ...aberturas[1], perfilMarco: 7 }, P)).toBe('Perfil del marco inválido');
  });
});

describe('datos de las uniones', () => {
  it('los proyectos viejos pasan a la red; se valida la luz', () => {
    const { uniones, ...viejo } = P;
    expect(migrarParams(viejo).uniones).toEqual({ modo: 'red', luz: 0 });
    expect(completarUniones({ modo: 'eje', luz: 0.002 })).toEqual({ modo: 'eje', luz: 0.002 });
    expect(validarUniones({ modo: 'red', luz: 0.05 })).toEqual({ 'uniones.luz': 'Entre 0 y 20 mm' });
    expect(validarParametros(conRed())).toEqual({});
    expect(uniones).toEqual({ modo: 'red', luz: 0 });
  });
});
