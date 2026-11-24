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

  it('v1.85: un perfil conserva su color aunque otro deje de usarse, y el color elegido a mano manda', () => {
    const conLosDos = coloresPorPerfil([{ insumo: INSUMO.COLUMNA, largo: 1 }, { insumo: INSUMO.PISO, largo: 1 }], catalogo);
    const soloC = coloresPorPerfil([{ insumo: INSUMO.PISO, largo: 1 }], catalogo); // el 80x80 ya no se usa
    expect(soloC[0].color).toBe(conLosDos.find((x) => x.perfil === soloC[0].perfil).color);
    const propio = coloresPorPerfil([{ insumo: INSUMO.PISO, largo: 1 }], catalogo, { [soloC[0].perfil]: '#123456' });
    expect(propio[0].color).toBe('#123456');
  });

  it('v1.85: con una lista más larga que la paleta, dos perfiles en uso no comparten color', () => {
    const lista = Array.from({ length: 14 }, (_, i) => ({ id: `h${i}`, categoria: 'hierro', tipo: 'cuadrado', a: 20 + i * 10, espesor: 2 }));
    const usos = [{ id: INSUMO.COLUMNA, perfilId: 'h0' }, { id: INSUMO.PISO, perfilId: 'h12' }]; // el 13.º caería en el color del 1.º
    const r = coloresPorPerfil([{ insumo: INSUMO.COLUMNA, largo: 1 }, { insumo: INSUMO.PISO, largo: 1 }], [...lista, ...usos]);
    expect(new Set(r.map((x) => x.color)).size).toBe(2);
  });
});

describe('v1.62: el mismo caño, un solo nombre (y un solo color)', async () => {
  const { normalizarNombrePerfil } = await import('./coloresPerfil.js');
  it('rectangular 80x80 = cuadrado 80x80; 2 = 2.0; con o sin espacios', () => {
    expect(normalizarNombrePerfil('Caño estructural 80x80x2')).toBe('Caño estructural 80x80x2.0');
    expect(normalizarNombrePerfil('Caño estructural 80 x 80 x 2,0')).toBe('Caño estructural 80x80x2.0');
    expect(normalizarNombrePerfil('Caño cuadrado 80x80x2.0')).toBe('Caño estructural 80x80x2.0');
    const catalogo2 = [
      { id: 'r80', categoria: 'hierro', tipo: 'rectangular', a: 80, b: 80, espesor: 2 },
      { id: 'c80', categoria: 'hierro', tipo: 'cuadrado', a: 80, espesor: 2 },
      { id: INSUMO.COLUMNA, categoria: 'perfil', perfilId: 'r80' },
      { id: INSUMO.VIGA_TECHO, categoria: 'perfil', perfilId: 'c80' },
      { id: INSUMO.CORREA, categoria: 'perfil', perfilId: null, perfil: 'Caño estructural 80 x 80 x 2' },
    ];
    const lista = coloresPorPerfil([{ insumo: INSUMO.COLUMNA, largo: 1 }, { insumo: INSUMO.VIGA_TECHO, largo: 2 }, { insumo: INSUMO.CORREA, largo: 3 }], catalogo2);
    expect(lista).toEqual([{ perfil: 'Caño estructural 80x80x2.0', piezas: 3, metros: 6, color: PALETA_PERFILES[0] }]);
  });
});

describe('v1.88: nombre corto de un perfil (para la fila de "Editadas": "C 80×40 → 80×80")', async () => {
  const { abreviarPerfil } = await import('./coloresPerfil.js');
  it('caño, perfil C, ángulo, PGC y sin medidas', () => {
    expect(abreviarPerfil('Caño estructural 80x80x2.0')).toBe('80×80');
    expect(abreviarPerfil('Perfil C 80x40x15x1.6')).toBe('C 80×40');
    expect(abreviarPerfil('Ángulo 1 1/2"x3/16"')).toBe('Ángulo 1 1/2"x3/16"'); // en pulgadas: queda entero
    expect(abreviarPerfil('Montante PGC 70x0.9')).toBe('PGC 70×0.9');
    expect(abreviarPerfil('Sin perfil en el catálogo')).toBe('Sin perfil en el catálogo');
    expect(abreviarPerfil('')).toBe('Sin nombre');
  });
});
