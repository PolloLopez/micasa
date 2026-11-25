// Tests de la geometría: los altos y la pendiente del techo (v1.95). Correr con: npm test
import { describe, it, expect } from 'vitest';
describe('v1.95: los dos altos medidos en obra dan la pendiente', async () => {
  const { pendienteParaAltos, gradosDePendiente, alturaMaxima } = await import('./geometria.js');
  const params = { largo: 7.5, ancho: 4.5, altura: 4.25, pendienteTecho: 10, caidaTecho: 'A' }; // cae hacia A: la luz es el ancho
  it('de 4,25 a 4,70 m en 4,50 m de luz: 10 %', () => {
    expect(pendienteParaAltos(4.25, 4.7, params)).toBeCloseTo(10, 6);
    expect(alturaMaxima({ ...params, pendienteTecho: pendienteParaAltos(4.25, 5, params) })).toBeCloseTo(5, 2);
  });
  it('el lado alto más bajo que el bajo, o más de 60 %: no', () => {
    expect(pendienteParaAltos(4.5, 4.2, params)).toBeNull();
    expect(pendienteParaAltos(1, 5, params)).toBeNull();
    expect(pendienteParaAltos(4.5, 4.5, params)).toBe(0); // techo plano
  });
  it('en grados', () => { expect(gradosDePendiente(10)).toBeCloseTo(5.71, 2); });
});
