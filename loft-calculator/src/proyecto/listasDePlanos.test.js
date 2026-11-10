// Tests de las listas de los planos y de "solo planos" (v1.42). Correr con: npm test
import { describe, it, expect } from 'vitest';
import { listaDePerfiles, listaDeAberturas, resumenDeAberturas, parteDeRenglon, plantasElegidas } from './listasDePlanos.js';
import { hojasDeObra } from './exportarExcel.js';
import { OPCIONES_IMPRESION_INICIALES, SOLO_PLANOS, opcionesImpresionValidas, completarOpcionesImpresion } from './opcionesImpresion.js';
import { generarEstructura } from '../motor/estructura.js';
import { calcularPresupuesto, CATALOGO_INICIAL } from '../motor/presupuesto.js';
import { resolverCatalogo } from '../motor/perfiles.js';
import { listaDeMateriales } from '../motor/proveedores.js';
import { todasLasVistas } from '../motor/planos.js';
import { PARAMS_INICIALES as P, ABERTURAS_INICIALES } from '../motor/parametrosIniciales.js';

const obra = () => {
  const e = generarEstructura(P, ABERTURAS_INICIALES);
  const r = calcularPresupuesto(e, CATALOGO_INICIAL);
  const materiales = listaDeMateriales(r.items, resolverCatalogo(CATALOGO_INICIAL));
  return { nombre: 'Loft', params: P, vistas: todasLasVistas(e, P, resolverCatalogo(CATALOGO_INICIAL), ABERTURAS_INICIALES), ...r, materiales, aberturas: ABERTURAS_INICIALES };
};

describe('caños y perfiles', () => {
  it('para comprar: barras de cada perfil (las mismas de la lista de materiales); y dónde va cada uno', () => {
    const { items, materiales } = obra();
    const { compra, usos } = listaDePerfiles(items, materiales);
    expect(compra.length).toBeGreaterThan(2);
    const barras = materiales.filter((m) => m.largoBarra && m.cantidad > 0).reduce((a, m) => a + m.cantidad, 0);
    expect(compra.reduce((a, c) => a + c.barras, 0)).toBe(barras);
    expect(compra.every((c) => c.perfil && c.largoBarra > 0)).toBe(true);
    const columnas = usos.find((u) => u.parte === 'Columnas');
    expect(columnas.piezas).toBeGreaterThan(0);
    expect(columnas.metros).toBeGreaterThan(0);
    expect(usos.every((u) => u.piezas > 0)).toBe(true); // sin renglones vacíos
  });
});

describe('aberturas', () => {
  it('número, tipo, pared, medidas y dónde está', () => {
    const lista = listaDeAberturas(ABERTURAS_INICIALES, P);
    expect(lista[0]).toMatchObject({ numero: 1, tipo: 'Puerta', pared: 'Frente (A)', ancho: 0.9, alto: 2.05, antepecho: 0, ubicacion: 'a 1.00 m de la esquina izquierda' });
    expect(lista[1]).toMatchObject({ numero: 2, tipo: 'Ventana', antepecho: 1.1, ubicacion: 'a 1.20 m de la esquina derecha' });
    expect(resumenDeAberturas(lista)).toBe('1 puerta · 1 ventana');
    expect(resumenDeAberturas([])).toBe('sin aberturas');
  });
});

describe('solo planos', () => {
  it('el atajo deja paredes, plantas, caños y aberturas', () => {
    expect(Object.entries(SOLO_PLANOS).filter(([, v]) => v).map(([k]) => k).sort())
      .toEqual(['listaAberturas', 'listaCanos', 'paredes', 'parteEntrepiso', 'parteInteriores', 'partePisos', 'parteTecho', 'plantas']);
    expect(opcionesImpresionValidas(SOLO_PLANOS)).toBe(true);
  });

  it('el Excel con solo planos trae Paredes, Plantas, Caños y Aberturas (sin la hoja Obra)', () => {
    const hojas = hojasDeObra(obra(), SOLO_PLANOS);
    expect(hojas.map((h) => h.nombre)).toEqual(['Paredes', 'Plantas', 'Caños', 'Aberturas']);
    const aberturas = hojas[3].filas.map((f) => (Array.isArray(f) ? f : f.celdas));
    expect(aberturas[0][0]).toBe('Aberturas: 1 puerta · 1 ventana');
    expect(aberturas.some((f) => f[0] === 2 && f[1] === 'Ventana')).toBe(true);
  });

  it('lo elegido en versiones de antes se conserva y se completa con las listas nuevas', () => {
    const { listaCanos, listaAberturas, ...viejo } = { ...OPCIONES_IMPRESION_INICIALES, presupuesto: false };
    expect([listaCanos, listaAberturas]).toEqual([true, true]);
    const completo = completarOpcionesImpresion(viejo);
    expect(opcionesImpresionValidas(completo)).toBe(true);
    expect(completo).toMatchObject({ presupuesto: false, listaCanos: true, listaAberturas: true });
  });
});

describe('partes de la obra (para quien cotiza los paneles)', () => {
  const sinNada = { partePisos: false, parteEntrepiso: false, parteTecho: false, parteInteriores: false };

  it('cada renglón sabe de qué parte es; los marcos de las aberturas van con las paredes', () => {
    expect(parteDeRenglon({ id: 'piso2' })).toBe('entrepiso');
    expect(parteDeRenglon({ id: 'vigaTecho@perfil-3', derivadoDe: 'vigaTecho' })).toBe('techo');
    expect(parteDeRenglon({ id: 'marcoAbertura' })).toBe('paredes');
    expect(parteDeRenglon({ id: 'estructuraTabique' })).toBe('interiores');
  });

  it('solo paredes: los caños son los de las paredes y sus aberturas, con los cortes de nuevo', () => {
    const { items, materiales } = obra();
    const todo = listaDePerfiles(items, materiales);
    const paredes = listaDePerfiles(items, materiales, sinNada);
    const partes = paredes.usos.map((u) => u.parte);
    expect(partes).toContain('Columnas');
    expect(partes).toContain('Marcos de aberturas');
    expect(partes).not.toContain('Estructura de piso');
    expect(partes).not.toContain('Vigas de techo');
    expect(partes).not.toContain('Estructura de piso 2');
    const barras = (l) => l.compra.reduce((a, c) => a + c.barras, 0);
    expect(barras(paredes)).toBeGreaterThan(0);
    expect(barras(paredes)).toBeLessThan(barras(todo));
    expect(paredes.compra.every((c) => c.kilos > 0)).toBe(true);
  });

  it('las plantas y el Excel siguen a las partes elegidas', () => {
    const datos = obra();
    expect(plantasElegidas(datos.vistas.plantas, { parteEntrepiso: false }).map((p) => p.nivel)).toEqual(['piso', 'techo']);
    const hojas = hojasDeObra(datos, { ...SOLO_PLANOS, ...sinNada });
    expect(hojas.map((h) => h.nombre)).toEqual(['Paredes', 'Caños', 'Aberturas']); // sin plantas
  });
});
