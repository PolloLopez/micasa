// Tests de "Duplicar abertura" (v1.15). Correr con: npm test
import { describe, it, expect } from 'vitest';
import { copiarAbertura, inicioAbertura } from './validacion.js';
import { PARAMS_INICIALES as P, ABERTURAS_INICIALES } from './parametrosIniciales.js';

const [PUERTA, VENTANA] = ABERTURAS_INICIALES; // puerta a 1 m de la izquierda; ventana a 1,20 m de la derecha (frente de 7,50)

describe('duplicar abertura', () => {
  it('la copia queda al lado (30 cm), con otro id y las mismas medidas', () => {
    const copia = copiarAbertura(PUERTA, ABERTURAS_INICIALES, P, 99);
    expect(copia.id).toBe(99);
    expect(copia.offsetHorizontal).toBeCloseTo(1 + 0.9 + 0.3);
    expect({ ...copia, id: PUERTA.id, offsetHorizontal: PUERTA.offsetHorizontal }).toEqual(PUERTA);
  });

  it('si al lado se sale de la pared, va del otro lado', () => {
    const pegada = { ...VENTANA, offsetHorizontal: 0.2 }; // a 20 cm de la esquina derecha
    const copia = copiarAbertura(pegada, [pegada], P, 99);
    expect(copia.offsetHorizontal).toBeCloseTo(0.2 + 1.5 + 0.3);
  });

  it('no se pone encima de otra abertura', () => {
    // La ventana copiada "hacia adentro" caería sobre la de al lado: busca el otro lugar.
    const otra = { ...VENTANA, id: 3, offsetHorizontal: 3 };
    const copia = copiarAbertura(VENTANA, [VENTANA, otra], P, 99);
    const a = inicioAbertura(copia, P);
    const b = inicioAbertura(otra, P);
    expect(a + copia.ancho <= b + 1e-9 || b + otra.ancho <= a + 1e-9).toBe(true);
  });

  it('si no entra en ningún lado, queda en el mismo lugar para moverla a mano', () => {
    const angosta = { ...P, largo: 2 };
    const ancha = { ...VENTANA, ladoReferencia: 'izquierda', offsetHorizontal: 0.2, ancho: 1.5 };
    expect(copiarAbertura(ancha, [ancha], angosta, 99).offsetHorizontal).toBe(0.2);
  });
});
