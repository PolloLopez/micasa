// Tests de "Duplicar abertura" (v1.15). Correr con: npm test
import { describe, it, expect } from 'vitest';
import { copiarAbertura, inicioAbertura, aberturaNueva } from './validacion.js';
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

describe('agregar puerta o ventana en una pared (v1.17)', () => {
  it('la primera va a 30 cm de la esquina izquierda, con etiqueta vacía y visible', () => {
    const { abertura } = aberturaNueva('ventana', 'B', [], P, 7);
    expect(abertura).toMatchObject({ id: 7, lado: 'B', offsetHorizontal: 0.3, alturaAntepecho: 1, etiqueta: '', mostrarEtiqueta: true });
  });

  it('no pisa las que ya hay: busca el primer lugar libre', () => {
    // En el frente la puerta ocupa de 1,00 a 1,90 desde la izquierda: la ventana nueva (1 m) va después.
    const { abertura } = aberturaNueva('ventana', 'A', ABERTURAS_INICIALES, P, 7);
    const a = inicioAbertura(abertura, P);
    expect(a + 1 <= 1 + 1e-9 || a >= 1.9 - 1e-9).toBe(true);
  });

  it('una puerta arranca del piso', () => {
    expect(aberturaNueva('puerta', 'C', [], P, 7).abertura.alturaAntepecho).toBe(0);
  });

  it('si no hay lugar, avisa', () => {
    expect(aberturaNueva('puerta', 'A', [], { ...P, largo: 2, ancho: 2 }, 7).abertura).toBeDefined();
    const llena = [{ ...PUERTA, id: 1, lado: 'B', offsetHorizontal: 0, ancho: 4.5 }];
    expect(aberturaNueva('ventana', 'B', llena, P, 7).error).toMatch(/lugar/);
  });
});

describe('v1.59: abertura a futuro (solo el marco, revestida entera)', async () => {
  const { generarEstructura } = await import('./estructura.js');
  const { calcularPresupuesto, CATALOGO_INICIAL } = await import('./presupuesto.js');
  const { PARAMS_INICIALES } = await import('./parametrosIniciales.js');
  const { validarAbertura } = await import('./validacion.js');
  const ventana = { id: 1, tipo: 'ventana', lado: 'A', ancho: 1.2, alto: 1, offsetHorizontal: 2, alturaAntepecho: 1, ladoReferencia: 'izquierda' };
  it('lleva el marco igual que una de verdad, pero la pared no se descuenta ni se recorta', () => {
    const normal = generarEstructura(PARAMS_INICIALES, [ventana]);
    const futura = generarEstructura(PARAMS_INICIALES, [{ ...ventana, futura: true }]);
    const sin = generarEstructura(PARAMS_INICIALES, []);
    expect(futura.refuerzosAberturas.length).toBe(normal.refuerzosAberturas.length);
    expect(futura.refuerzosAberturas.length).toBeGreaterThan(0);
    const paredA = (e) => e.paredes.find((p) => p.lado === 'A');
    expect(paredA(futura).huecos).toEqual([]);
    expect(paredA(futura).superficieNeta).toBe(paredA(sin).superficieNeta);
    const panel = (e) => calcularPresupuesto(e, CATALOGO_INICIAL).items.find((i) => i.id === 'panelMuros').cantidad;
    expect(panel(futura)).toBe(panel(sin));
    expect(validarAbertura({ ...ventana, futura: 'si' }, PARAMS_INICIALES)).toMatch(/futuro/);
  });
});

describe('v1.59: comparativa de revestimientos', async () => {
  const { compararRevestimientos, espesorDelPanel } = await import('./comparativa.js');
  const { CATALOGO_INICIAL } = await import('./presupuesto.js');
  const { PARAMS_INICIALES } = await import('./parametrosIniciales.js');
  it('cada panel en todas las paredes: el más barato primero y la diferencia contra lo de ahora', () => {
    const fino = { ...CATALOGO_INICIAL.find((i) => i.id === 'panelMuros'), id: 'panelFino', nombre: 'Panel fino', perfil: 'Panel PUR 10 mm', precio: 15000, precios: {} };
    const catalogo = [...CATALOGO_INICIAL, fino];
    const r = compararRevestimientos(PARAMS_INICIALES, [], catalogo);
    expect(espesorDelPanel(fino)).toBe(10);
    const actual = r.find((x) => x.id === 'panelMuros');
    expect(actual).toMatchObject({ actual: true, diferencia: 0, espesor: 50 });
    expect(r.map((x) => x.total)).toEqual([...r.map((x) => x.total)].sort((a, b) => a - b));
  });
});
