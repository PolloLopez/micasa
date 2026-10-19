// Tests de paredes (v1.17): montantes, montantes de dintel y de antepecho, jambas de piso a solera
// y riostras en cruz. Correr con: npm test
//
// Frente (A) del loft de ejemplo: 7,50 m, columnas cada 2,50 (x = -3,75 / -1,25 / 1,25 / 3,75), alto 4,95 m.
import { describe, it, expect } from 'vitest';
import { generarEstructura, listarPiezas } from './estructura.js';
import { calcularPresupuesto, CATALOGO_INICIAL } from './presupuesto.js';
import { validarParametros, validarAbertura } from './validacion.js';
import { migrarParams } from './migracion.js';
import { INSUMO } from './constantes.js';
import { PARAMS_INICIALES as P, ABERTURAS_INICIALES } from './parametrosIniciales.js';

// Sin entrepiso: así el frente tiene solo sus 4 columnas (el borde del entrepiso agrega una).
const SIN_ESCALERA = { ...P, anchoEntrepiso: 0, escalera: { ...P.escalera, activa: false } };
const conFrente = (cambios) => ({ ...SIN_ESCALERA, paredes: { ...P.paredes, A: { ...P.paredes.A, ...cambios } } });
const deTipo = (e, tipo) => listarPiezas(e).filter((p) => p.tipo === tipo);
const [PUERTA, VENTANA] = ABERTURAS_INICIALES;

describe('montantes', () => {
  it('sin separación (0) no hay montantes, como antes', () => {
    expect(deTipo(generarEstructura(SIN_ESCALERA, []), 'montante')).toHaveLength(0);
  });

  it('cada 0,625 m entre columnas de 2,50: 3 por vano x 3 vanos = 9, de piso a solera', () => {
    const e = generarEstructura(conFrente({ separacionMontantes: 0.625 }), []);
    const montantes = deTipo(e, 'montante').filter((m) => m.grupos.includes('A'));
    expect(montantes).toHaveLength(9);
    montantes.forEach((m) => expect(m.largo).toBeCloseTo(4.95));
  });

  it('en la ventana: el montante se parte en uno de antepecho (abajo) y uno de dintel (arriba)', () => {
    // Ventana en A: de x = 1,05 a 2,55, de 1,10 a 1,70 m de alto. Montante en x = 1,875 (1,25 + 0,625).
    const e = generarEstructura(conFrente({ separacionMontantes: 0.625 }), [VENTANA]);
    const abajo = deTipo(e, 'montante-antepecho');
    const arriba = deTipo(e, 'montante-dintel');
    expect(abajo.length).toBeGreaterThan(0);
    abajo.forEach((m) => expect(m.largo).toBeCloseTo(1.1));
    arriba.forEach((m) => expect(m.largo).toBeCloseTo(4.95 - 1.7));
  });

  it('en una puerta (arranca del piso) solo queda el de dintel', () => {
    const e = generarEstructura(conFrente({ separacionMontantes: 0.3 }), [PUERTA]);
    expect(deTipo(e, 'montante-antepecho')).toHaveLength(0);
    expect(deTipo(e, 'montante-dintel').length).toBeGreaterThan(0);
  });

  it('presupuesto: renglón propio "Montantes" (solo si hay)', () => {
    const item = (params) => calcularPresupuesto(generarEstructura(params, []), CATALOGO_INICIAL).items.find((i) => i.id === INSUMO.MONTANTE);
    expect(item(SIN_ESCALERA)).toBeUndefined();
    expect(item(conFrente({ separacionMontantes: 0.625 })).cortes.barras.flatMap((b) => b.piezas)).toHaveLength(9);
  });
});

describe('jambas de piso a solera', () => {
  it('la jamba de la ventana va del piso a la solera, no solo el alto del vano', () => {
    const e = generarEstructura(SIN_ESCALERA, [VENTANA]);
    const jamba = e.refuerzosAberturas.find((r) => r.id === 'ref:2:jamba-izq');
    expect(jamba.desde[1]).toBeCloseTo(P.elevacion);
    expect(jamba.largo).toBeCloseTo(4.95);
  });
});

describe('riostras en cruz en las paredes', () => {
  it('en las puntas: 2 vanos x 2 diagonales; en todos: 3 x 2', () => {
    const puntas = deTipo(generarEstructura(conFrente({ riostras: 'extremos' }), []), 'riostra').filter((r) => r.grupos.includes('A'));
    const todas = deTipo(generarEstructura(conFrente({ riostras: 'todos' }), []), 'riostra').filter((r) => r.grupos.includes('A'));
    expect(puntas).toHaveLength(4);
    expect(todas).toHaveLength(6);
    // Diagonal de un vano de 2,50 x 4,95.
    expect(todas[0].largo).toBeCloseTo(Math.hypot(2.5, 4.95));
  });

  it('un vano entre columnas con una abertura no lleva cruz', () => {
    // La puerta (x = -2,75 a -1,85) cae en el primer vano: con "todos" quedan 2 vanos.
    const e = generarEstructura(conFrente({ riostras: 'todos' }), [PUERTA]);
    expect(deTipo(e, 'riostra').filter((r) => r.grupos.includes('A'))).toHaveLength(4);
  });

  it('se cotizan en el renglón de riostras', () => {
    const items = calcularPresupuesto(generarEstructura(conFrente({ riostras: 'extremos' }), []), CATALOGO_INICIAL).items;
    expect(items.find((i) => i.id === INSUMO.RIOSTRA).cortes.barras.flatMap((b) => b.piezas)).toHaveLength(4);
  });
});

describe('validación y proyectos viejos', () => {
  it('opciones de riostras y etiqueta de abertura', () => {
    expect(validarParametros(conFrente({ riostras: 'diagonal' }))).toHaveProperty(['paredes.A.riostras']);
    expect(validarAbertura({ ...VENTANA, etiqueta: 'Ventana cocina' }, P)).toBeNull();
    expect(validarAbertura({ ...VENTANA, etiqueta: 'x'.repeat(31) }, P)).toMatch(/etiqueta/);
  });

  it('una pared de antes de v1.17: sin montantes ni riostras', () => {
    const { separacionMontantes, riostras, ...vieja } = P.paredes.A; // eslint-disable-line no-unused-vars
    const m = migrarParams({ ...P, paredes: { A: vieja, B: vieja, C: vieja, D: vieja } });
    expect(m.paredes.A).toMatchObject({ separacionMontantes: 0, riostras: 'no' });
    expect(validarParametros(m)).toEqual({});
  });
});
