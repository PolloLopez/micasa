// Tests de las descripciones de piezas. Correr con: npm test
import { describe, it, expect } from 'vitest';
import { describirPieza, detallesDePieza } from './descripcionPiezas.js';

describe('describirPieza', () => {
  it('nombra las paredes según el frente y los grupos especiales', () => {
    const col = { tipo: 'columna', grupos: ['A', 'D'], largo: 4.95 };
    expect(describirPieza(col, 'A')).toBe('Columna · Frente y Lateral izquierdo · 4.95 m');
    expect(describirPieza({ tipo: 'columna', grupos: ['interior'], largo: 2.3 }, 'A')).toBe('Columna · Borde del entrepiso · 2.30 m');
  });

  it('las piezas de la escalera dicen "Escalera" (antes salía el nombre de una pared)', () => {
    expect(describirPieza({ tipo: 'zanca', grupos: ['escalera'], largo: 3 }, 'A')).toBe('Zanca de escalera · Escalera · 3.00 m');
  });
});

describe('v1.64: detallesDePieza', () => {
  it('vertical, horizontal e inclinada con su altura', () => {
    expect(detallesDePieza({ largo: 2.45, desde: [0, 0, 0], hasta: [0, 2.45, 0] }, 'Caño 80x80x2'))
      .toEqual(['Caño 80x80x2', '2,45 m', 'vertical', 'de 0,00 a 2,45 m de altura']);
    expect(detallesDePieza({ largo: 3, desde: [0, 2.5, 0], hasta: [3, 2.5, 0] }, 'C 100')[2]).toBe('horizontal');
    expect(detallesDePieza({ largo: 3.2, desde: [0, 2.5, 0], hasta: [3, 3.6, 0] }, 'C 100').slice(2))
      .toEqual(['inclinada', 'de 2,50 a 3,60 m de altura']);
  });
  it('sin coordenadas: perfil y largo', () => {
    expect(detallesDePieza({ largo: 1 }, 'X')).toEqual(['X', '1,00 m']);
  });
});
