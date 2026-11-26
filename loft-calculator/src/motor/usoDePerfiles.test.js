// Tests v1.101: cuántos perfiles se usaron y cuántos faltan. Correr con: npm test
import { describe, it, expect } from 'vitest';
import { usoDePerfiles } from './usoDePerfiles.js';

describe('v1.101: perfiles usados y en obra (Leandro: "para comparar con la realidad")', () => {
  // Caño 80×80: 3 barras de 6 m. Barra 1: dos columnas (una puesta); barra 2: una solera en dos tramos (el 2º puesto); barra 3: nada puesto.
  const grupos = [{ perfil: 'Caño 80x80', largoBarra: 6, cortes: { barras: [
    { numero: 1, piezas: [2.5, 2.5, 1], ids: ['col:1', 'col:2', null] },
    { numero: 2, piezas: [3, 2.9], ids: ['solera:A~1', 'solera:A~2'] },
    { numero: 3, piezas: [5.5], ids: ['borde:B'] },
  ] } }, { perfil: 'Caño 80x80', largoBarra: 6, cortes: { barras: [{ numero: 4, piezas: [4], ids: ['viga:1'] }] } }];
  const avance = { 'col:1': { instalada: true }, 'solera:A': { instalada: true }, 'borde:B': { instalada: false } };
  const materiales = [{ clave: 'perfil-1', material: 'Caño 80x80', largoBarra: 6 }];
  const compras = [{ renglones: [{ material: 'perfil-1', cantidad: 3 }] }, { renglones: [{ material: 'otro', cantidad: 9 }, { cantidad: 1 }] }];
  const [u] = usoDePerfiles(grupos, avance, materiales, compras);
  it('suma las barras de todos los grupos del mismo perfil y cuenta las empezadas', () => {
    expect(u).toMatchObject({ perfil: 'Caño 80x80', clave: 'perfil-1', barras: 4, compradas: 3, faltanComprar: 1, empezadas: 2, sinTocar: 2 });
  });
  it('en el lote deberían quedar las compradas menos las empezadas (enteras)', () => {
    expect(u.enObra).toBe(1);
  });
  it('piezas por su id de base (los tramos de una solera son una pieza) y metros puestos', () => {
    expect(u.piezas).toBe(5);
    expect(u.puestas).toBe(2);
    expect(u.metros).toBe(20.4);
    expect(u.metrosPuestos).toBe(2.5 + 3 + 2.9);
  });
  it('sin compras ni avance: todo falta', () => {
    expect(usoDePerfiles(grupos)[0]).toMatchObject({ compradas: 0, faltanComprar: 4, sobran: 0, empezadas: 0, enObra: 0, clave: null });
    expect(usoDePerfiles(grupos, {}, materiales, [{ renglones: [{ material: 'perfil-1', cantidad: 6 }] }])[0]).toMatchObject({ faltanComprar: 0, sobran: 2 });
  });
});
