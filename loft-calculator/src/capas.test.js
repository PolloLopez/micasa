// Tests de colores por capa. Correr con: npm test
import { describe, it, expect } from 'vitest';
import { completarColores, COLORES_INICIALES } from './capas.js';

describe('completarColores (navegadores con colores de versiones anteriores)', () => {
  it('conserva los colores guardados y completa las capas nuevas con su color por defecto', () => {
    const r = completarColores({ columnas: '#00ff00' });
    expect(r.columnas).toBe('#00ff00');
    expect(r.escalera).toBe(COLORES_INICIALES.escalera);
    expect(r.escalones).toBe(COLORES_INICIALES.escalones);
  });

  it('descarta colores inválidos o datos rotos', () => {
    expect(completarColores({ columnas: 'verde' }).columnas).toBe(COLORES_INICIALES.columnas);
    expect(completarColores(null)).toEqual(COLORES_INICIALES);
  });
});
