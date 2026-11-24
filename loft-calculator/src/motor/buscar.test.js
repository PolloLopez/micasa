// Tests del buscador (v1.84). Correr con: npm test
import { describe, it, expect } from 'vitest';
import { coincide, filtrarPor } from './buscar.js';

describe('buscador', () => {
  it('palabras sueltas en cualquier orden, sin mayúsculas ni tildes, medidas con coma o punto', () => {
    const t = 'Columna · Frente (A) · 4.33 m · corte 1.15a · Caño estructural 80x80x2.0';
    expect(coincide(t, 'frente columna')).toBe(true);
    expect(coincide(t, 'COLUMNA 4,33')).toBe(true);
    expect(coincide(t, 'cano 80x80')).toBe(true); // "Caño" sin tilde
    expect(coincide(t, '1.15')).toBe(true);
    expect(coincide(t, 'columna techo')).toBe(false); // tienen que estar todas
    expect(coincide(t, '  ')).toBe(true);
  });
  it('filtra una lista (vacío = todo)', () => {
    const filas = [{ n: 'Solera superior' }, { n: 'Horizontal (faja)' }];
    expect(filtrarPor(filas, 'faja', (f) => f.n)).toEqual([{ n: 'Horizontal (faja)' }]);
    expect(filtrarPor(filas, '', (f) => f.n)).toBe(filas);
  });
});
