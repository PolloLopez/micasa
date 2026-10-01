// Tests del motor de cálculo. Correr con: npm test
import { describe, it, expect } from 'vitest';
import { optimizarCortes, dividirPiezaLarga } from './optimizadorCortes.js';
import { validarParametros, validarAbertura } from './validacion.js';
import { generarEstructura, posicionAbertura, piezasRefuerzoAbertura } from './estructura.js';
import { nombreLado, alturaEn, alturaMaxima, geometriaLados } from './geometria.js';
import { calcularPresupuesto, CATALOGO_INICIAL } from './presupuesto.js';
import { INSUMO } from './constantes.js';
import { PARAMS_INICIALES as P, ABERTURAS_INICIALES } from './parametrosIniciales.js';

const [PUERTA, VENTANA] = ABERTURAS_INICIALES;
const SIN_PENDIENTE = { ...P, pendienteTecho: 0 };
const conPared = (lado, cambios) => ({ ...P, paredes: { ...P.paredes, [lado]: { ...P.paredes[lado], ...cambios } } });

describe('optimizarCortes', () => {
  it('de una barra de 6 m sale UNA sola pieza de 4,50 m', () => {
    expect(optimizarCortes(Array(9).fill(4.5), 6).totalBarras).toBe(9);
  });

  it('aprovecha el sobrante: 4,50 + 1,40 entran en una barra de 6 m', () => {
    const r = optimizarCortes([4.5, 1.4], 6);
    expect(r.totalBarras).toBe(1);
    expect(r.barras[0].piezas).toEqual([4.5, 1.4]);
  });

  it('respeta la merma del disco: 3 + 3 no entra en 6 m', () => {
    expect(optimizarCortes([3, 3], 6).totalBarras).toBe(2);
    expect(optimizarCortes([3, 3], 6, 0).totalBarras).toBe(1);
  });

  it('empalma piezas más largas que la barra', () => {
    expect(dividirPiezaLarga(7.5, 6)).toEqual([6, 1.5]);
    const r = optimizarCortes([7.5], 6);
    expect(r.totalBarras).toBe(2);
    expect(r.piezasEmpalmadas).toBe(1);
  });

  it('lista vacía o barra inválida devuelve 0 sin romper', () => {
    expect(optimizarCortes([], 6).totalBarras).toBe(0);
    expect(optimizarCortes([1], 0).totalBarras).toBe(0);
  });

  it('nunca pone en una barra más de lo que mide', () => {
    const r = optimizarCortes([4.5, 4.5, 2.05, 2.05, 0.9, 1.5, 1.5, 0.6, 0.6], 6);
    r.barras.forEach((b) => expect(b.usado).toBeLessThanOrEqual(6 + 1e-9));
  });
});

describe('geometría: nombres de lados según el frente', () => {
  it('frente A: B es lateral derecho, C fondo, D lateral izquierdo', () => {
    expect(['A', 'B', 'C', 'D'].map((l) => nombreLado(l, 'A'))).toEqual([
      'Frente', 'Lateral derecho', 'Fondo', 'Lateral izquierdo',
    ]);
  });

  it('si el frente pasa a ser B, A queda como lateral izquierdo', () => {
    expect(nombreLado('B', 'B')).toBe('Frente');
    expect(nombreLado('D', 'B')).toBe('Fondo');
    expect(nombreLado('A', 'B')).toBe('Lateral izquierdo');
  });

  it('los lados se recorren en orden: p2 de uno = p1 del siguiente', () => {
    const g = geometriaLados(P);
    expect(g.A.p2).toEqual(g.B.p1);
    expect(g.D.p2).toEqual(g.A.p1);
    expect(g.A.largo).toBe(7.5);
    expect(g.B.largo).toBe(4.5);
  });
});

describe('geometría: techo a una agua', () => {
  it('cae hacia C: en C la altura es la mínima y en A sube 10 % de 4,50 m', () => {
    expect(alturaEn(0, -2.25, P)).toBeCloseTo(4.5);
    expect(alturaEn(0, 2.25, P)).toBeCloseTo(4.95);
    expect(alturaMaxima(P)).toBeCloseTo(4.95);
  });

  it('cae hacia B: la pendiente corre sobre el largo', () => {
    const p = { ...P, caidaTecho: 'B' };
    expect(alturaEn(3.75, 0, p)).toBeCloseTo(4.5);
    expect(alturaEn(-3.75, 0, p)).toBeCloseTo(4.5 + 0.75);
  });
});

describe('validarParametros', () => {
  it('los valores por defecto son válidos', () => {
    expect(validarParametros(P)).toEqual({});
  });

  it('separación 0 es inválida (antes colgaba el navegador)', () => {
    expect(validarParametros({ ...P, separacionPiso: 0 })).toHaveProperty('separacionPiso');
    expect(validarParametros(conPared('B', { separacionHorizontales: 0 }))).toHaveProperty('paredes.B.separacionHorizontales');
  });

  it('transversales: 0 significa "sin transversales" y es válido', () => {
    expect(validarParametros({ ...P, separacionTransversales: 0 })).toEqual({});
    expect(validarParametros({ ...P, separacionTransversales: 0.1 })).toHaveProperty('separacionTransversales');
  });

  it('rechaza negativos, NaN, decimales en enteros y lados inexistentes', () => {
    expect(validarParametros({ ...P, largo: -1 })).toHaveProperty('largo');
    expect(validarParametros({ ...P, altura: NaN })).toHaveProperty('altura');
    expect(validarParametros({ ...P, filasPilotines: 2.5 })).toHaveProperty('filasPilotines');
    expect(validarParametros({ ...P, ladoFrente: 'Z' })).toHaveProperty('ladoFrente');
  });

  it('el entrepiso no puede ser más profundo que la planta en su dirección', () => {
    // Apoyado en D (eje X), la profundidad disponible es el largo (7,50).
    expect(validarParametros({ ...P, anchoEntrepiso: 5 })).toEqual({});
    // Apoyado en A (eje Z), la disponible es el ancho (4,50).
    expect(validarParametros({ ...P, ladoEntrepiso: 'A', anchoEntrepiso: 5 })).toHaveProperty('anchoEntrepiso');
  });
});

describe('validarAbertura', () => {
  it('acepta puerta y ventana por defecto', () => {
    expect(validarAbertura(PUERTA, P)).toBeNull();
    expect(validarAbertura(VENTANA, P)).toBeNull();
  });

  it('rechaza una abertura que se sale de la pared', () => {
    expect(validarAbertura({ ...PUERTA, offsetHorizontal: 7 }, P)).toMatch(/No entra/);
    expect(validarAbertura({ ...PUERTA, lado: 'B', offsetHorizontal: 4 }, P)).toMatch(/No entra/);
  });

  it('usa la altura real del tramo cuando la pared es inclinada', () => {
    // Lado B va de A (alto, 4,95) a C (bajo, 4,50). Cerca de C solo hay 4,50.
    const alta = { ...VENTANA, lado: 'B', ladoReferencia: 'derecha', offsetHorizontal: 0.2, alturaAntepecho: 2.6, alto: 2.1 };
    expect(validarAbertura(alta, P)).toMatch(/altura/);
    // La misma ventana cerca de A (lado alto) sí entra: 2,60 + 2,10 = 4,70 < 4,8.
    expect(validarAbertura({ ...alta, ladoReferencia: 'izquierda' }, P)).toBeNull();
  });
});

describe('generarEstructura', () => {
  const e = generarEstructura(P, ABERTURAS_INICIALES);

  it('pilotines = filas x por fila', () => {
    expect(e.pilotines).toHaveLength(12);
  });

  it('columnas: perímetro sin duplicar esquinas + borde libre del entrepiso', () => {
    // A y C: 7,5/2,5 => 4 columnas c/u; B y D: 4,5/2,5 => 3 c/u. Esquinas compartidas: 4.
    // Perímetro: 4+4+3+3-4 = 10. Borde del entrepiso (paralelo a D): 3 columnas.
    expect(e.columnas).toHaveLength(13);
  });

  it('cada pared respeta su propia separación de verticales', () => {
    const densa = generarEstructura(conPared('A', { separacionVerticales: 0.5 }), []);
    // A con 0,5 m => 16 columnas (15 tramos). La del borde del entrepiso (x = -0,75)
    // coincide con una de ellas y no se duplica.
    expect(densa.columnas.filter((c) => Math.abs(c.z - 2.25) < 1e-6)).toHaveLength(16);
    // C sigue con 4 + la del borde del entrepiso.
    expect(densa.columnas.filter((c) => Math.abs(c.z + 2.25) < 1e-6)).toHaveLength(5);
  });

  it('las columnas del lado alto son más largas (pendiente)', () => {
    const enA = e.columnas.filter((c) => Math.abs(c.z - 2.25) < 1e-6);
    const enC = e.columnas.filter((c) => Math.abs(c.z + 2.25) < 1e-6);
    enA.forEach((c) => expect(c.largo).toBeCloseTo(4.95));
    enC.forEach((c) => expect(c.largo).toBeCloseTo(4.5));
  });

  it('estructura de piso: tirantes cruzan la luz corta (4,50) cada 0,40', () => {
    expect(e.piso.tirantes).toHaveLength(18);
    e.piso.tirantes.forEach((t) => expect(t.largo).toBeCloseTo(4.5));
  });

  it('estructura de piso 2: entrepiso 4,50 x 3,00 => tirantes de 3,00', () => {
    // Apoyado en D (largo 4,50); la luz corta es 3,00 => se reparten sobre 4,50.
    expect(e.piso2.tirantes).toHaveLength(11);
    e.piso2.tirantes.forEach((t) => expect(t.largo).toBeCloseTo(3));
  });

  it('transversales: filas entre tirantes; con 0 no hay', () => {
    // Piso: luz 4,5 cada 1,5 => 2 filas; cada fila 19 tramos (18 tirantes + 2 marcos).
    expect(e.piso.transversales).toHaveLength(2 * 19);
    const sin = generarEstructura({ ...P, separacionTransversales: 0 }, []);
    expect(sin.piso.transversales).toHaveLength(0);
    expect(sin.piso2.transversales).toHaveLength(0);
  });

  it('sin entrepiso no hay piso 2 ni columnas extra', () => {
    const sin = generarEstructura({ ...P, anchoEntrepiso: 0 }, []);
    expect(sin.piso2.tirantes).toHaveLength(0);
    expect(sin.columnas).toHaveLength(10);
  });

  it('horizontales de pared: sin pendiente, 5 niveles x 4 paredes', () => {
    expect(generarEstructura(SIN_PENDIENTE, []).correas).toHaveLength(20);
  });

  it('horizontales de pared: en paredes inclinadas el nivel alto es parcial', () => {
    const p = conPared('B', { separacionHorizontales: 0.3 });
    const enB = generarEstructura(p, []).correas.filter((c) => Math.abs(c.desde[0] - 3.75) < 1e-6 && Math.abs(c.hasta[0] - 3.75) < 1e-6);
    // Niveles 0,3..4,8 (16); el de 4,8 m está por encima de 4,50 => tramo parcial.
    expect(enB).toHaveLength(16);
    const ultima = enB[enB.length - 1];
    expect(ultima.largo).toBeLessThan(4.5);
    expect(ultima.largo).toBeCloseTo(4.5 * (4.95 - 4.8) / 0.45, 1);
  });

  it('techo: vigas siguen la pendiente; correas paralelas al lado bajo', () => {
    const largoViga = Math.hypot(4.5, 0.45);
    // Vigas interiores cada 1,0 m sobre 7,5 => 7.
    expect(e.techo.vigas).toHaveLength(7);
    e.techo.vigas.forEach((v) => expect(v.largo).toBeCloseTo(largoViga));
    e.techo.correas.forEach((c) => expect(c.largo).toBeCloseTo(7.5));
    // Sobre la pendiente (4,52 m) cada 0,8 => 0, 0,8 ... 4,0 + el borde alto = 7.
    expect(e.techo.correas).toHaveLength(7);
  });

  it('superficies: muros trapecio menos aberturas; techo sobre la pendiente', () => {
    const s = e.superficies;
    const brutos = 7.5 * 4.95 + 7.5 * 4.5 + 2 * 4.5 * (4.5 + 4.95) / 2;
    expect(s.aberturas).toBeCloseTo(0.9 * 2.05 + 1.5 * 0.6);
    expect(s.murosNetos).toBeCloseTo(brutos - s.aberturas);
    expect(s.techo).toBeCloseTo(7.5 * Math.hypot(4.5, 0.45));
    expect(s.piso2).toBeCloseTo(4.5 * 3);
  });

  it('refuerzos: puerta = dintel + 2 jambas; ventana suma alféizar', () => {
    expect(piezasRefuerzoAbertura(PUERTA)).toEqual([0.9, 2.05, 2.05]);
    expect(piezasRefuerzoAbertura(VENTANA)).toEqual([1.5, 0.6, 0.6, 1.5]);
    expect(e.refuerzosAberturas).toHaveLength(7);
  });
});

describe('posicionAbertura (medida desde afuera)', () => {
  it('puerta en A desde la izquierda', () => {
    const p = posicionAbertura(PUERTA, P);
    expect(p.x).toBeCloseTo(-3.75 + 1 + 0.45);
    expect(p.z).toBeCloseTo(2.25);
    expect(p.y).toBeCloseTo(0.5 + 1.025);
    expect(p.rotacionY).toBeCloseTo(0);
  });

  it('en B la "izquierda" (vista desde afuera) es la esquina con A', () => {
    const p = posicionAbertura({ ...PUERTA, lado: 'B' }, P);
    expect(p.x).toBeCloseTo(3.75);
    expect(p.z).toBeCloseTo(2.25 - 1.45);
    expect(Math.abs(p.rotacionY)).toBeCloseTo(Math.PI / 2);
  });
});

describe('calcularPresupuesto', () => {
  const e = generarEstructura(P, ABERTURAS_INICIALES);
  const { items, total } = calcularPresupuesto(e, CATALOGO_INICIAL);
  const item = (id) => items.find((i) => i.id === id);

  it('tiene un renglón por cada insumo del catálogo', () => {
    expect(items.map((i) => i.id)).toEqual(CATALOGO_INICIAL.map((p) => p.id));
  });

  it('estructura de piso y piso 2 van en renglones separados', () => {
    expect(item(INSUMO.PISO).cortes.metrosNetos).toBeCloseTo(18 * 4.5);
    expect(item(INSUMO.PISO_2).cortes.metrosNetos).toBeCloseTo(11 * 3);
  });

  it('las barras coinciden con las piezas de la estructura (3D = cálculo)', () => {
    expect(item(INSUMO.COLUMNA).cortes.barras.flatMap((b) => b.piezas)).toHaveLength(
      e.columnas.length + e.refuerzosAberturas.length
    );
    expect(item(INSUMO.VIGA_TECHO).cantidad).toBe(7);
  });

  it('total = suma de subtotales y cambia con el precio', () => {
    expect(total).toBe(items.reduce((a, i) => a + i.cantidad * i.precio, 0));
    const caro = CATALOGO_INICIAL.map((p) => (p.id === INSUMO.PILOTIN ? { ...p, precio: 30000 } : p));
    expect(calcularPresupuesto(e, caro).total).toBe(total + 12 * 15000);
  });

  it('OSB: (7,5 x 4,5 + 4,5 x 3) x 1,1 / 2,9768 => 18 placas', () => {
    expect(item(INSUMO.OSB).cantidad).toBe(18);
  });
});
