// Tests del motor de cálculo. Correr con: npm test
import { describe, it, expect } from 'vitest';
import { optimizarCortes, dividirPiezaLarga } from './optimizadorCortes.js';
import { validarParametros, validarAbertura } from './validacion.js';
import { generarEstructura, posicionAbertura, piezasRefuerzoAbertura } from './estructura.js';
import { calcularPresupuesto, CATALOGO_INICIAL } from './presupuesto.js';
import { INSUMO } from './constantes.js';

// Valores por defecto del loft (los mismos que usa App.jsx).
const PARAMS = {
  frente: 7.5, profundidad: 4.5, altura: 4.5, elevacion: 0.5, anchoMezzanine: 3,
  distanciaColumnas: 2.5, pasoTirantesPiso: 0.4, pasoTirantesAltillo: 0.4,
  separacionCorreas: 0.8, filasPilotines: 4, pilotinesPorFila: 3,
};
const PUERTA = { pared: 'frente', ladoReferencia: 'izquierda', offsetHorizontal: 1, alturaAntepecho: 0, ancho: 0.9, alto: 2.05 };
const VENTANA = { pared: 'frente', ladoReferencia: 'derecha', offsetHorizontal: 1.2, alturaAntepecho: 1.1, ancho: 1.5, alto: 0.6 };

describe('optimizarCortes', () => {
  it('de una barra de 6 m sale UNA sola pieza de 4,50 m (bug original: daba 7 barras para 9 piezas)', () => {
    const r = optimizarCortes(Array(9).fill(4.5), 6);
    expect(r.totalBarras).toBe(9);
  });

  it('aprovecha el sobrante: 4,50 + 1,40 entran en una barra de 6 m', () => {
    const r = optimizarCortes([4.5, 1.4], 6);
    expect(r.totalBarras).toBe(1);
    expect(r.barras[0].piezas).toEqual([4.5, 1.4]);
  });

  it('respeta la merma del disco: 3 + 3 no entra en 6 m', () => {
    expect(optimizarCortes([3, 3], 6).totalBarras).toBe(2);
    expect(optimizarCortes([3, 3], 6, 0).totalBarras).toBe(1);
  });

  it('empalma piezas más largas que la barra', () => {
    expect(dividirPiezaLarga(7.5, 6)).toEqual([6, 1.5]);
    const r = optimizarCortes([7.5], 6);
    expect(r.totalBarras).toBe(2);
    expect(r.piezasEmpalmadas).toBe(1);
  });

  it('lista vacía o barra inválida devuelve 0 sin romper', () => {
    expect(optimizarCortes([], 6).totalBarras).toBe(0);
    expect(optimizarCortes([1], 0).totalBarras).toBe(0);
  });

  it('nunca pone en una barra más de lo que mide', () => {
    const r = optimizarCortes([4.5, 4.5, 2.05, 2.05, 0.9, 1.5, 1.5, 0.6, 0.6], 6);
    r.barras.forEach((b) => expect(b.usado).toBeLessThanOrEqual(6 + 1e-9));
  });
});

describe('validarParametros', () => {
  it('los valores por defecto son válidos', () => {
    expect(validarParametros(PARAMS)).toEqual({});
  });

  it('paso 0 es inválido (antes colgaba el navegador)', () => {
    expect(validarParametros({ ...PARAMS, pasoTirantesPiso: 0 })).toHaveProperty('pasoTirantesPiso');
    expect(validarParametros({ ...PARAMS, separacionCorreas: 0 })).toHaveProperty('separacionCorreas');
  });

  it('rechaza negativos, NaN y decimales en cantidades enteras', () => {
    expect(validarParametros({ ...PARAMS, frente: -1 })).toHaveProperty('frente');
    expect(validarParametros({ ...PARAMS, altura: NaN })).toHaveProperty('altura');
    expect(validarParametros({ ...PARAMS, filasPilotines: 2.5 })).toHaveProperty('filasPilotines');
  });

  it('el altillo no puede ser más ancho que el frente', () => {
    expect(validarParametros({ ...PARAMS, anchoMezzanine: 8 })).toHaveProperty('anchoMezzanine');
  });
});

describe('validarAbertura', () => {
  it('acepta puerta y ventana por defecto', () => {
    expect(validarAbertura(PUERTA, PARAMS)).toBeNull();
    expect(validarAbertura(VENTANA, PARAMS)).toBeNull();
  });

  it('rechaza una abertura que se sale de la pared', () => {
    expect(validarAbertura({ ...PUERTA, offsetHorizontal: 7 }, PARAMS)).toMatch(/No entra/);
    expect(validarAbertura({ ...PUERTA, pared: 'izquierda', offsetHorizontal: 4 }, PARAMS)).toMatch(/No entra/);
    expect(validarAbertura({ ...VENTANA, alturaAntepecho: 4.2 }, PARAMS)).toMatch(/altura/);
  });
});

describe('generarEstructura', () => {
  const e = generarEstructura(PARAMS, [PUERTA, VENTANA]);

  it('pilotines = filas x por fila', () => {
    expect(e.pilotines).toHaveLength(12);
  });

  it('columnas: 2 x 5 en frente/fondo + 3 en la fila intermedia', () => {
    // ceil(7.5/2.5)+1 = 4... 7.5/2.5 = 3 => 4 columnas por lado largo
    // ceil(4.5/2.5)+1 = 3 filas => 1 intermedia con 3 columnas
    expect(e.columnas).toHaveLength(4 * 2 + 3);
  });

  it('tirantes de piso no se superponen con el marco (extremos excluidos)', () => {
    const tirantesPiso = e.tirantes.filter((t) => t.y === PARAMS.elevacion);
    expect(tirantesPiso).toHaveLength(18); // 0.4..7.2 => 18 posiciones
    tirantesPiso.forEach((t) => {
      expect(t.x).toBeGreaterThan(-PARAMS.frente / 2);
      expect(t.x).toBeLessThan(PARAMS.frente / 2);
    });
  });

  it('correas: 5 niveles (0.8 a 4.0) x 4 paredes', () => {
    expect(e.correas).toHaveLength(5 * 4);
  });

  it('refuerzos: puerta = dintel + 2 jambas; ventana suma alféizar', () => {
    expect(piezasRefuerzoAbertura(PUERTA)).toEqual([0.9, 2.05, 2.05]);
    expect(piezasRefuerzoAbertura(VENTANA)).toEqual([1.5, 0.6, 0.6, 1.5]);
    expect(e.refuerzosAberturas).toHaveLength(7);
  });

  it('descuenta las aberturas de los muros', () => {
    const s = e.superficies;
    expect(s.aberturas).toBeCloseTo(0.9 * 2.05 + 1.5 * 0.6);
    expect(s.murosNetos).toBeCloseTo(s.murosBrutos - s.aberturas);
  });
});

describe('posicionAbertura', () => {
  it('puerta desde la izquierda en el frente', () => {
    const p = posicionAbertura(PUERTA, PARAMS);
    expect(p.x).toBeCloseTo(-3.75 + 1 + 0.45);
    expect(p.z).toBeCloseTo(2.25);
    expect(p.y).toBeCloseTo(0.5 + 1.025);
  });

  it('en pared lateral se mide sobre la profundidad y se rota', () => {
    const p = posicionAbertura({ ...PUERTA, pared: 'derecha' }, PARAMS);
    expect(p.x).toBeCloseTo(3.75);
    expect(p.z).toBeCloseTo(-2.25 + 1.45);
    expect(p.rotacionY).toBeCloseTo(Math.PI / 2);
  });
});

describe('calcularPresupuesto', () => {
  const e = generarEstructura(PARAMS, [PUERTA, VENTANA]);
  const { items, total } = calcularPresupuesto(e, CATALOGO_INICIAL);
  const item = (id) => items.find((i) => i.id === id);

  it('las barras de cada perfil coinciden con las piezas de la estructura (3D = cálculo)', () => {
    expect(item(INSUMO.TIRANTE).cortes.metrosNetos).toBeCloseTo(e.tirantes.length * 4.5);
    expect(item(INSUMO.COLUMNA).cortes.barras.flatMap((b) => b.piezas)).toHaveLength(
      e.columnas.length + e.refuerzosAberturas.length
    );
  });

  it('las columnas de 4,50 m necesitan al menos una barra cada una', () => {
    expect(item(INSUMO.COLUMNA).cantidad).toBeGreaterThanOrEqual(e.columnas.length);
  });

  it('total = suma de subtotales', () => {
    expect(total).toBe(items.reduce((a, i) => a + i.cantidad * i.precio, 0));
    expect(total).toBeGreaterThan(0);
  });

  it('pilotines y OSB', () => {
    expect(item(INSUMO.PILOTIN).cantidad).toBe(12);
    // (7.5*4.5 + 3*4.5) * 1.1 / (2.44*1.22) = 51.975 / 2.9768 = 17.46 => 18
    expect(item(INSUMO.OSB).cantidad).toBe(18);
  });

  it('si cambia el precio en el catálogo, cambia el total', () => {
    const caro = CATALOGO_INICIAL.map((p) => (p.id === INSUMO.PILOTIN ? { ...p, precio: 30000 } : p));
    expect(calcularPresupuesto(e, caro).total).toBe(total + 12 * 15000);
  });
});
