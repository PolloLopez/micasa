// Tests de las descripciones de piezas. Correr con: npm test
import { describe, it, expect } from 'vitest';
import { describirPieza } from './descripcionPiezas.js';

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
