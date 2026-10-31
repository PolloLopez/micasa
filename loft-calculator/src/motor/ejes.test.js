// Tests de los ejes y la forma de los pilotines (v1.36). Correr con: npm test
import { describe, it, expect } from 'vitest';
import { generarEstructura } from './estructura.js';
import { calcularPresupuesto, CATALOGO_INICIAL } from './presupuesto.js';
import { migrarParams } from './migracion.js';
import { validarParametros } from './validacion.js';
import { PARAMS_INICIALES as P, ABERTURAS_INICIALES } from './parametrosIniciales.js';
import { INSUMO } from './constantes.js';
import { lineasDelModulo, subdividir, textoPilotin } from './ejes.js';

const con = (ejes = {}, extra = {}) => ({ ...P, ...extra, ejes: { modulo: 0, vigasSobreColumnas: false, pilotinesBajoColumnas: false, ...ejes } });
const est = (params) => generarEstructura(params, []);
const xsDe = (lista, i = 0) => [...new Set(lista.map((p) => Number((p.desde ?? [p.x, 0, p.z])[i].toFixed(3))))].sort((a, b) => a - b);
const columnasEnZ = (e, z) => e.columnas.filter((c) => Math.abs(c.desde[2] - z) < 1e-6 && Math.abs(c.desde[1] - P.elevacion) < 1e-6);

describe('ayudas de la grilla', () => {
  it('líneas cada módulo desde la esquina, con la punta', () => {
    expect(lineasDelModulo(4.5, 1.25)).toEqual([0, 1.25, 2.5, 3.75, 4.5]);
    expect(lineasDelModulo(7.5, 1.25)).toEqual([0, 1.25, 2.5, 3.75, 5, 6.25, 7.5]);
    expect(subdividir([0, 1.25, 2.5], 1)).toEqual([0, 0.625, 1.25, 1.875, 2.5]);
  });
});

describe('modulación única', () => {
  const e = est(con({ modulo: 1.25, pilotinesModulo: 'cruces' }));
  const lineasX = lineasDelModulo(7.5, 1.25).map((x) => Number((x - 3.75).toFixed(3)));

  it('las columnas del frente y del fondo caen en las mismas líneas (alineadas)', () => {
    // Además están las columnas del borde libre del entrepiso (x = -0.75), que no son del módulo.
    const delModulo = (z) => xsDe(columnasEnZ(e, z)).filter((x) => x !== -0.75);
    expect(delModulo(2.25)).toEqual(lineasX);
    expect(delModulo(-2.25)).toEqual(lineasX);
  });

  it('pilotines en cada cruce de la grilla', () => {
    expect(e.pilotines.length).toBe(7 * 5);
    expect(xsDe(e.pilotines)).toEqual(lineasX);
  });

  it('vigas de techo y tirantes en cada línea, y parejos adentro de cada módulo', () => {
    const vigasX = xsDe(e.techo.vigas);
    lineasX.slice(1, -1).forEach((x) => expect(vigasX).toContain(x));
    expect(vigasX.length).toBe(11); // 6 módulos de 1.25 partidos en 2 (separación 1 m) = 12 tramos → 11 vigas
    const tirantesX = xsDe(e.piso.tirantes);
    lineasX.slice(1, -1).forEach((x) => expect(tirantesX).toContain(x));
  });
});

describe('pilotines con la modulación (v1.36.1: no obligados en cada cruce)', () => {
  it('de fábrica usan su propia grilla; cada 2 módulos toma uno de cada dos más los bordes', () => {
    expect(est(con({ modulo: 1.25 })).pilotines.length).toBe(12); // filas x por fila, como sin módulo
    const cada2 = est(con({ modulo: 1.25, pilotinesModulo: 'cada2' })).pilotines;
    // x: 0, 2.5, 5, 7.5 (4) · z: 0, 2.5, 4.5 (3)
    expect(cada2.length).toBe(12);
    expect(xsDe(cada2)).toEqual([-3.75, -1.25, 1.25, 3.75]);
  });
});

describe('sin módulo', () => {
  it('vigas sobre las columnas del lado bajo', () => {
    const e = est(con({ vigasSobreColumnas: true }));
    const columnasBajo = xsDe(columnasEnZ(e, -2.25)).filter((x) => Math.abs(Math.abs(x) - 3.75) > 0.01); // sin las esquinas
    const vigasX = xsDe(e.techo.vigas);
    columnasBajo.forEach((x) => expect(vigasX).toContain(x));
  });

  it('un pilotín bajo cada columna; la grilla completa sin repetir cerca', () => {
    const e = est(con({ pilotinesBajoColumnas: true }));
    const columnas = e.columnas.filter((c) => Math.abs(c.desde[1] - P.elevacion) < 1e-6 && !c.id.endsWith(':arriba'));
    columnas.forEach((c) => expect(e.pilotines.some((p) => Math.hypot(p.x - c.desde[0], p.z - c.desde[2]) < 1e-6)).toBe(true));
    e.pilotines.forEach((p, i) => e.pilotines.slice(i + 1).forEach((q) => expect(Math.hypot(p.x - q.x, p.z - q.z)).toBeGreaterThan(0.29)));
    const item = calcularPresupuesto(e, CATALOGO_INICIAL, { proveedor: 'prov-1' }).items.find((i) => i.id === INSUMO.PILOTIN);
    expect(item.cantidad).toBe(e.pilotines.length);
    expect(item.detalle).toBe('uno bajo cada columna + grilla');
  });

  it('de fábrica, todo igual que antes', () => {
    expect(est(P).pilotines.length).toBe(12);
  });
});

describe('forma y medida del pilotín', () => {
  it('el presupuesto dice la medida', () => {
    const pilotin = (params) => calcularPresupuesto(generarEstructura(params, ABERTURAS_INICIALES), CATALOGO_INICIAL, { proveedor: 'prov-1' })
      .items.find((i) => i.id === INSUMO.PILOTIN);
    expect(pilotin(P).perfil).toBe('Pilotín de hormigón ø 30 cm');
    expect(pilotin({ ...P, pilotin: { forma: 'cuadrado', medida: 0.4 } }).perfil).toBe('Pilotín de hormigón 40 x 40 cm');
    expect(textoPilotin({ forma: 'redondo', medida: 0.25 })).toBe('ø 25 cm');
  });

  it('se valida y los proyectos viejos quedan como se dibujaban', () => {
    expect(validarParametros({ ...P, pilotin: { forma: 'triangular', medida: 2 } })).toEqual({
      'pilotin.forma': 'Elegí redondo o cuadrado', 'pilotin.medida': 'Entre 0,10 y 1,50 m',
    });
    expect(validarParametros(con({ modulo: 0.2 }))).toEqual({ 'ejes.modulo': 'Entre 0,5 y 6 m' });
    const { pilotin, ejes, ...viejo } = P;
    const m = migrarParams(viejo);
    expect(m.pilotin).toEqual({ forma: 'redondo', medida: 0.3 });
    expect(m.ejes).toEqual({ modulo: 0, vigasSobreColumnas: false, pilotinesBajoColumnas: false, pilotinesModulo: 'grilla' });
    expect([pilotin.forma, ejes.modulo]).toEqual(['redondo', 0]);
  });
});
