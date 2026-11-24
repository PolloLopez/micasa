// v1.83: el nombre corto de los perfiles en los botones de "Qué perfil lleva cada parte". Correr con: npm test
import { describe, it, expect } from 'vitest';
import { nombreCorto } from './PerfilesDeLasPartes.jsx';

describe('nombre corto de un perfil', () => {
  it('se queda con la medida (y la forma si no es un caño)', () => {
    expect(nombreCorto({ categoria: 'hierro', tipo: 'rectangular', a: 80, b: 80, espesor: 2 })).toBe('80×80');
    expect(nombreCorto({ categoria: 'hierro', tipo: 'c', a: 80, b: 40, c: 15, espesor: 1.6 })).toBe('C 80×40');
    expect(nombreCorto({ categoria: 'hierro', tipo: 'cuadrado', a: 50, espesor: 1.6 })).toBe('50×50');
  });
});
