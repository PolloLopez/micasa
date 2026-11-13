// Tests del color por perfil (v1.55). Correr con: npm test
import { describe, it, expect } from 'vitest';
import { coloresPorPerfil, perfilDePieza, PALETA_PERFILES, COLOR_SIN_PERFIL, SIN_PERFIL } from './coloresPerfil.js';
import { INSUMO } from './constantes.js';

// Dos usos (columna y viga de techo) con el mismo caño 80x80x2; los tirantes con un perfil C.
const catalogo = [
  { id: 'h80', categoria: 'hierro', tipo: 'cuadrado', a: 80, espesor: 2 },
  { id: 'hC', categoria: 'hierro', tipo: 'c', a: 100, b: 50, c: 15, espesor: 2 },
  { id: INSUMO.COLUMNA, categoria: 'perfil', perfilId: 'h80' },
  { id: INSUMO.VIGA_TECHO, categoria: 'perfil', perfilId: 'h80' },
  { id: INSUMO.PISO, categoria: 'perfil', perfilId: 'hC' },
  { id: INSUMO.CORREA, categoria: 'perfil', perfilId: null },
];

describe('un color por perfil', () => {
  it('la columna y la viga del mismo 80x80x2 van del mismo color; el resto, otro', () => {
    const piezas = [
      { insumo: INSUMO.COLUMNA, largo: 2.5 }, { insumo: INSUMO.VIGA_TECHO, largo: 4 }, { insumo: INSUMO.PISO, largo: 3 },
      { insumo: INSUMO.CORREA, largo: 1 }, { insumo: INSUMO.PISO, largo: 3, madera: true }, // de madera: no cuenta
    ];
    const lista = coloresPorPerfil(piezas, catalogo);
    expect(lista).toEqual([
      { perfil: 'Caño estructural 80x80x2.0', piezas: 2, metros: 6.5, color: PALETA_PERFILES[0] },
      { perfil: 'Perfil C 100x50x15x2.0', piezas: 1, metros: 3, color: PALETA_PERFILES[1] },
      { perfil: SIN_PERFIL, piezas: 1, metros: 1, color: COLOR_SIN_PERFIL },
    ]);
    expect(perfilDePieza({ insumo: INSUMO.COLUMNA }, catalogo)).toBe(perfilDePieza({ insumo: INSUMO.VIGA_TECHO }, catalogo));
  });

  it('la pared con perfil propio usa ese perfil (como en la lista de materiales)', () => {
    expect(perfilDePieza({ tipo: 'columna', perfilPared: 'hC' }, catalogo)).toBe('Perfil C 100x50x15x2.0');
  });

  it('el color sigue al nombre del perfil, no a la cantidad (no cambia al agregar piezas)', () => {
    const a = coloresPorPerfil([{ insumo: INSUMO.COLUMNA, largo: 1 }, { insumo: INSUMO.PISO, largo: 1 }], catalogo);
    const b = coloresPorPerfil([{ insumo: INSUMO.COLUMNA, largo: 1 }, ...Array(9).fill({ insumo: INSUMO.PISO, largo: 1 })], catalogo);
    expect(a.map((x) => [x.perfil, x.color])).toEqual(b.map((x) => [x.perfil, x.color]));
  });
});
