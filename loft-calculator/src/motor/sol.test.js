// Tests del sol (v1.37). Correr con: npm test
import { describe, it, expect } from 'vitest';
import { posicionDelSol, salidaYPuesta, diaDelAnio, direccionDelSol, rumboDelAzimut, aberturasConSol, SOL_INICIAL, completarSol, validarSol } from './sol.js';
import { PARAMS_INICIALES as P, ABERTURAS_INICIALES } from './parametrosIniciales.js';
import { migrarParams } from './migracion.js';

const MERCEDES = SOL_INICIAL;

describe('posición del sol en Mercedes (lat -34,65°)', () => {
  it('al mediodía solar: en invierno bajo y al norte, en verano alto y al norte', () => {
    const invierno = salidaYPuesta(MERCEDES, diaDelAnio('2026-06-21'));
    const s = posicionDelSol(MERCEDES, diaDelAnio('2026-06-21'), invierno.mediodia);
    expect(s.altura).toBeGreaterThan(30); expect(s.altura).toBeLessThan(33); // 90 - 34.65 - 23.44 ≈ 31.9
    expect(rumboDelAzimut(s.azimut)).toBe('N');
    const verano = salidaYPuesta(MERCEDES, diaDelAnio('2026-12-21'));
    const v = posicionDelSol(MERCEDES, diaDelAnio('2026-12-21'), verano.mediodia);
    expect(v.altura).toBeGreaterThan(77); expect(v.altura).toBeLessThan(80); // ≈ 78.8
  });

  it('el mediodía solar cae cerca de las 13 h (longitud -59,4 con huso -3)', () => {
    const { mediodia, salida, puesta } = salidaYPuesta(MERCEDES, diaDelAnio('2026-03-20'));
    expect(mediodia).toBeGreaterThan(12.8); expect(mediodia).toBeLessThan(13.3);
    expect(puesta - salida).toBeGreaterThan(11.8); expect(puesta - salida).toBeLessThan(12.4); // equinoccio: ~12 h
  });

  it('a la mañana el sol está al este y a la tarde al oeste', () => {
    const dia = diaDelAnio('2026-03-20');
    expect(rumboDelAzimut(posicionDelSol(MERCEDES, dia, 8.5).azimut)).toBe('E');
    expect(rumboDelAzimut(posicionDelSol(MERCEDES, dia, 17.5).azimut)).toBe('O');
    expect(posicionDelSol(MERCEDES, dia, 2).altura).toBeLessThan(0); // de noche
  });
});

describe('el sol en la obra', () => {
  it('con el norte hacia +z, el sol del mediodía viene de +z y arriba', () => {
    const d = direccionDelSol({ altura: 30, azimut: 0 }, [0, 1]);
    expect(d[1]).toBeCloseTo(0.5, 6);
    expect(d[2]).toBeCloseTo(Math.cos(30 * Math.PI / 180), 6);
    const este = direccionDelSol({ altura: 0, azimut: 90 }, [0, 1]);
    expect(este[0]).toBeCloseTo(-1, 6); // el este es el norte girado 90° horario visto desde arriba
  });

  it('entra sol por las aberturas de la pared que el sol ve', () => {
    // Frente A mira a +z: con el sol viniendo de +z entra por las dos aberturas del frente; de -z, por ninguna.
    expect(aberturasConSol(P, ABERTURAS_INICIALES, [0, 0.5, 0.86]).map((a) => a.numero)).toEqual([1, 2]);
    expect(aberturasConSol(P, ABERTURAS_INICIALES, [0, 0.5, -0.86])).toEqual([]);
    expect(aberturasConSol(P, ABERTURAS_INICIALES, [0, -0.1, 1])).toEqual([]); // de noche
  });

  it('el lugar se valida y los proyectos viejos quedan en Mercedes', () => {
    expect(validarSol({ latitud: -80, longitud: 0, huso: -3 })).toEqual({ 'sol.latitud': 'Entre -66° y 66°' });
    expect(completarSol(undefined)).toEqual(SOL_INICIAL);
    const { sol, ...viejo } = P;
    expect(migrarParams(viejo).sol).toEqual(SOL_INICIAL);
    expect(sol).toEqual(SOL_INICIAL);
  });
});
