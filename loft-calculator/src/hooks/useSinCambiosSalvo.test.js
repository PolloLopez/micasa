// Test de igualesSalvo (v1.47). Correr con: npm test
import { describe, it, expect } from 'vitest';
import { igualesSalvo } from './useSinCambiosSalvo.js';

describe('igualesSalvo', () => {
  it('si solo cambia lo ignorado, es igual; si cambia otra cosa, no', () => {
    const muebles = [];
    const a = { largo: 7.5, muebles, seguimiento: { rubros: [] } };
    expect(igualesSalvo(a, { ...a, seguimiento: { rubros: [1] } }, ['seguimiento'])).toBe(true);
    expect(igualesSalvo(a, { ...a, largo: 8 }, ['seguimiento'])).toBe(false);
    expect(igualesSalvo(a, { ...a, muebles: [] }, ['seguimiento'])).toBe(false); // otro arreglo (cambió)
  });
});
