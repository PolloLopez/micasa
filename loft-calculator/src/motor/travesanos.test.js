// Tests de los travesaños de una abertura hasta las columnas (v1.28). Correr con: npm test
import { describe, it, expect } from 'vitest';
import { generarEstructura } from './estructura.js';
import { calcularPresupuesto, CATALOGO_INICIAL } from './presupuesto.js';
import { validarAbertura } from './validacion.js';
import { PARAMS_INICIALES as P, ABERTURAS_INICIALES } from './parametrosIniciales.js';
import { INSUMO } from './constantes.js';

// La ventana #2 del ejemplo: lado A, 1.50 de ancho a 1.20 de la esquina derecha, antepecho 1.10.
const ventana = { ...ABERTURAS_INICIALES[1], travesanos: true };
const travesanos = (aberturas) => generarEstructura(P, aberturas).refuerzosAberturas.filter((p) => p.tipo === 'travesano');

describe('travesaños de una abertura', () => {
  it('arriba y abajo, de la ventana a la columna de cada lado', () => {
    const t = travesanos([ventana]);
    expect(t.map((p) => p.id).sort()).toEqual([
      'ref:2:trav-abajo-der', 'ref:2:trav-abajo-izq', 'ref:2:trav-arriba-der', 'ref:2:trav-arriba-izq',
    ]);
    // La ventana va de 4.80 a 6.30. A la izquierda, la columna más cerca es la del entrepiso (en 3.00): 1.80 m;
    // a la derecha, la esquina (7.50): 1.20 m. (La columna de 5.00 cae dentro del vano y se corta.)
    const largos = t.map((p) => Math.round(p.largo * 100) / 100).sort();
    expect(largos).toEqual([1.2, 1.2, 1.8, 1.8]);
    const alturas = [...new Set(t.map((p) => Math.round((p.desde[1] - P.elevacion) * 100) / 100))].sort();
    expect(alturas).toEqual([1.1, 1.7]); // antepecho y dintel
  });

  it('una puerta solo lleva el de arriba; sin la casilla, ninguno', () => {
    expect(travesanos([{ ...ABERTURAS_INICIALES[0], travesanos: true }]).every((p) => p.id.includes('arriba'))).toBe(true);
    expect(travesanos(ABERTURAS_INICIALES)).toHaveLength(0);
  });

  it('van al renglón Marcos de aberturas y se valida la casilla', () => {
    const r = calcularPresupuesto(generarEstructura(P, [ventana]), CATALOGO_INICIAL, { compartir: false });
    const sin = calcularPresupuesto(generarEstructura(P, [ABERTURAS_INICIALES[1]]), CATALOGO_INICIAL, { compartir: false });
    const piezas = (x) => x.items.find((i) => i.id === INSUMO.MARCO_ABERTURA).largosPiezas.length;
    expect(piezas(r) - piezas(sin)).toBe(4);
    expect(validarAbertura({ ...ventana, travesanos: 'si' }, P)).toMatch(/Travesaños/);
  });
});
