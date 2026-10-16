// Tests de revestimientos (v1.15): a medida (tiras, largo máximo, solape) y estándar (placas).
// Correr con: npm test
import { describe, it, expect } from 'vitest';
import {
  cortarEnTramos, tirasDePano, placasDePano, cuentaRevestimiento, resumirLargos, REVESTIMIENTO_POR_DEFECTO,
} from './revestimientos.js';
import { generarEstructura } from './estructura.js';
import { calcularPresupuesto, CATALOGO_INICIAL } from './presupuesto.js';
import { normalizarCatalogo, migrarParams } from './migracion.js';
import { validarParametros, validarPanelesUsados } from './validacion.js';
import { PARAMS_INICIALES as P } from './parametrosIniciales.js';

const aMedida = (cambios = {}) => ({ ...REVESTIMIENTO_POR_DEFECTO, ...cambios });
const estandar = (cambios = {}) => ({ ...REVESTIMIENTO_POR_DEFECTO, venta: 'estandar', ...cambios });
const pared = (largo, h1, h2 = h1) => ({ donde: 'pared', largo, h1, h2, neto: (largo * (h1 + h2)) / 2 });

describe('a medida: tramos por largo máximo', () => {
  it('si entra, una sola tira', () => {
    expect(cortarEnTramos(4.25, 12)).toEqual([4.25]);
  });

  it('más larga que el máximo: tramos a tope', () => {
    expect(cortarEnTramos(7, 4)).toEqual([4, 3]);
    expect(cortarEnTramos(9, 4)).toEqual([4, 4, 1]);
  });

  it('con solape: el tramo siguiente trae lo que se superpone', () => {
    // 7 m, máximo 4, solape 0,20: el primero cubre 3,80 => falta 3,20.
    const tramos = cortarEnTramos(7, 4, 0.2);
    expect(tramos).toHaveLength(2);
    expect(tramos[1]).toBeCloseTo(3.2);
  });
});

describe('a medida: tiras de una pared', () => {
  it('pared de 7,50 x 4,25 con ancho útil 1 m => 8 tiras de 4,25', () => {
    expect(tirasDePano(pared(7.5, 4.25), aMedida())).toEqual(Array(8).fill(4.25));
  });

  it('ancho útil de 1,15 m (panel más ancho) => menos tiras', () => {
    expect(tirasDePano(pared(7.5, 4.25), aMedida({ anchoUtil: 1.15 }))).toHaveLength(7);
  });

  it('pared más alta que el largo máximo: cada tira en dos tramos', () => {
    const tiras = tirasDePano(pared(2, 5), aMedida({ largoMaximo: 3 }));
    expect(tiras).toEqual([3, 2, 3, 2]);
  });

  it('pared inclinada: cada tira toma su alto mayor', () => {
    expect(tirasDePano(pared(2, 3, 4), aMedida())).toEqual([3.5, 4]);
  });

  it('cuenta: m² que se pagan (tiras x ancho útil) y la lista para pedir', () => {
    const c = cuentaRevestimiento(aMedida(), [pared(7.5, 4.25)]);
    expect(c.unidad).toBe('m²');
    expect(c.cantidad).toBeCloseTo(8 * 4.25);
    expect(c.detalle).toMatch(/^8 × 4\.25 m/);
  });
});

describe('estándar: placas', () => {
  it('pared de 7,50 x 2,40 con placa 1,20 x 2,40 => 7 placas paradas', () => {
    expect(placasDePano(pared(7.5, 2.4), estandar({ anchoPlaca: 1.2, largoPlaca: 2.4 }))).toEqual({ placas: 7, columnas: 7, filas: 1, parada: true });
  });

  it('elige acostada si usa menos placas', () => {
    // 4,80 x 1,20: paradas (1,22 x 2,44) => 4 columnas x 1 fila = 4; acostadas (2,44 x 1,22) => 2 x 1 = 2.
    const r = placasDePano(pared(4.8, 1.2), estandar());
    expect(r.placas).toBe(2);
    expect(r.parada).toBe(false);
  });

  it('cuenta en placas, sumando los paños', () => {
    const c = cuentaRevestimiento(estandar({ anchoPlaca: 1.2, largoPlaca: 2.4 }), [pared(7.5, 2.4), pared(3, 2.4)]);
    expect(c.unidad).toBe('placas');
    expect(c.cantidad).toBe(7 + 3);
  });
});

describe('resumen de largos', () => {
  it('agrupa por largo, del más largo al más corto', () => {
    expect(resumirLargos([3, 2, 3, 2, 3])).toBe('3 × 3.00 m + 2 × 2.00 m');
  });
});

describe('revestimiento interior y presupuesto', () => {
  const placaInterior = { ...CATALOGO_INICIAL.find((p) => p.id === 'panelMuros'), id: 'placaInt', nombre: 'Placa interior', ...estandar({ anchoPlaca: 1.2, largoPlaca: 2.4 }) };
  const catalogo = [...CATALOGO_INICIAL, placaInterior];
  const conInterior = { ...P, paredes: { ...P.paredes, C: { ...P.paredes.C, panelInterior: 'placaInt' } } };

  it('una pared con revestimiento interior suma ese paño en su renglón (en placas)', () => {
    const item = calcularPresupuesto(generarEstructura(conInterior, []), catalogo).items.find((i) => i.id === 'placaInt');
    // Fondo C: 7,50 x 4,50 => 7 columnas x 2 filas (paradas) = 14; acostadas: 4 x 4 = 16 => 14.
    expect(item.cantidad).toBe(14);
    expect(item.detalle).toMatch(/lado C \(interior\)/);
  });

  it('sin revestimiento interior: no aparece en ningún renglón', () => {
    const item = calcularPresupuesto(generarEstructura(P, []), catalogo).items.find((i) => i.id === 'placaInt');
    expect(item.cantidad).toBe(0);
  });

  it('valida que el revestimiento interior exista', () => {
    expect(validarPanelesUsados(conInterior, catalogo)).toBeNull();
    expect(validarPanelesUsados(conInterior, CATALOGO_INICIAL)).toMatch(/interior del lado C/);
  });
});

describe('proyectos de antes de v1.15', () => {
  it('los tipos de panel viejos pasan a "a medida" de 1 m, por fuera de la estructura', () => {
    const viejo = { id: 'panelMuros', categoria: 'panel', nombre: 'Panel', perfil: 'PUR', precio: 1, color: '#000000', colorInterior: '#ffffff' };
    const panel = normalizarCatalogo([viejo]).find((p) => p.id === 'panelMuros');
    expect(panel).toMatchObject({ venta: 'medida', anchoUtil: 1, largoMaximo: 12, solape: 0, ubicacion: 'cara' });
  });

  it('se guardan los datos válidos y se corrigen los imposibles', () => {
    const guardado = { id: 'x', categoria: 'panel', nombre: 'Chapa', venta: 'estandar', anchoPlaca: 1.1, largoPlaca: 99, solape: 0.1, largoMaximo: 0.1 };
    const panel = normalizarCatalogo([guardado]).find((p) => p.id === 'x');
    expect(panel.venta).toBe('estandar');
    expect(panel.anchoPlaca).toBe(1.1);
    expect(panel.largoPlaca).toBe(REVESTIMIENTO_POR_DEFECTO.largoPlaca); // 99 m no existe
    expect(panel.largoMaximo).toBe(REVESTIMIENTO_POR_DEFECTO.largoMaximo); // 0,1 está fuera de rango
  });

  it('las paredes viejas no tienen revestimiento interior', () => {
    const { panelInterior, ...paredVieja } = P.paredes.A; // eslint-disable-line no-unused-vars
    const m = migrarParams({ ...P, paredes: { A: paredVieja, B: paredVieja, C: paredVieja, D: paredVieja } });
    expect(m.paredes.A.panelInterior).toBe('');
    expect(validarParametros(m)).toEqual({});
  });
});
