// Tests de revestimientos (v1.15): a medida (tiras, largo máximo, solape) y estándar (placas).
// Correr con: npm test
import { describe, it, expect } from 'vitest';
import {
  cortarEnTramos, tirasDePano, placasDePano, cuentaRevestimiento, resumirLargos, REVESTIMIENTO_POR_DEFECTO, juntasDePano, pedazosDeTira, pedazosDePared,
  tirasEnteras, unidadDePrecio, comparativaDeTiras, encimadosDePano, pedazosConLugar,
} from './revestimientos.js';
import { generarEstructura } from './estructura.js';
import { calcularPresupuesto, CATALOGO_INICIAL } from './presupuesto.js';
import { normalizarCatalogo, migrarParams } from './migracion.js';
import { validarParametros, validarPanelesUsados } from './validacion.js';
import { PARAMS_INICIALES as P } from './parametrosIniciales.js';

const aMedida = (cambios = {}) => ({ ...REVESTIMIENTO_POR_DEFECTO, ...cambios });
const estandar = (cambios = {}) => ({ ...REVESTIMIENTO_POR_DEFECTO, venta: 'estandar', ...cambios });
const pared = (largo, h1, h2 = h1) => ({ donde: 'pared', largo, h1, h2, neto: (largo * (h1 + h2)) / 2 });

describe('a medida: tramos por largo máximo', () => {
  it('si entra, una sola tira', () => {
    expect(cortarEnTramos(4.25, 12)).toEqual([4.25]);
  });

  it('más larga que el máximo: tramos a tope', () => {
    expect(cortarEnTramos(7, 4)).toEqual([4, 3]);
    expect(cortarEnTramos(9, 4)).toEqual([4, 4, 1]);
  });

  it('con solape: el tramo siguiente trae lo que se superpone', () => {
    // 7 m, máximo 4, solape 0,20: el primero cubre 3,80 => falta 3,20.
    const tramos = cortarEnTramos(7, 4, 0.2);
    expect(tramos).toHaveLength(2);
    expect(tramos[1]).toBeCloseTo(3.2);
  });
});

describe('a medida: tiras de una pared', () => {
  it('pared de 7,50 x 4,25 con ancho útil 1 m => 8 tiras de 4,25', () => {
    expect(tirasDePano(pared(7.5, 4.25), aMedida())).toEqual(Array(8).fill(4.25));
  });

  it('ancho útil de 1,15 m (panel más ancho) => menos tiras', () => {
    expect(tirasDePano(pared(7.5, 4.25), aMedida({ anchoUtil: 1.15 }))).toHaveLength(7);
  });

  it('pared más alta que el largo máximo: cada tira en dos tramos', () => {
    const tiras = tirasDePano(pared(2, 5), aMedida({ largoMaximo: 3 }));
    expect(tiras).toEqual([3, 2, 3, 2]);
  });

  it('pared inclinada: cada tira toma su alto mayor', () => {
    expect(tirasDePano(pared(2, 3, 4), aMedida())).toEqual([3.5, 4]);
  });

  it('cuenta: m² que se pagan (tiras x ancho útil) y la lista para pedir', () => {
    const c = cuentaRevestimiento(aMedida(), [pared(7.5, 4.25)]);
    expect(c.unidad).toBe('m²');
    expect(c.cantidad).toBeCloseTo(8 * 4.25);
    expect(c.detalle).toMatch(/^8 × 4\.25 m/);
  });
});

describe('estándar: placas', () => {
  it('pared de 7,50 x 2,40 con placa 1,20 x 2,40 => 7 placas paradas', () => {
    expect(placasDePano(pared(7.5, 2.4), estandar({ anchoPlaca: 1.2, largoPlaca: 2.4 }))).toEqual({ placas: 7, columnas: 7, filas: 1, parada: true });
  });

  it('elige acostada si usa menos placas', () => {
    // 4,80 x 1,20: paradas (1,22 x 2,44) => 4 columnas x 1 fila = 4; acostadas (2,44 x 1,22) => 2 x 1 = 2.
    const r = placasDePano(pared(4.8, 1.2), estandar());
    expect(r.placas).toBe(2);
    expect(r.parada).toBe(false);
  });

  it('cuenta en placas, sumando los paños', () => {
    const c = cuentaRevestimiento(estandar({ anchoPlaca: 1.2, largoPlaca: 2.4 }), [pared(7.5, 2.4), pared(3, 2.4)]);
    expect(c.unidad).toBe('placas');
    expect(c.cantidad).toBe(7 + 3);
  });
});

describe('resumen de largos', () => {
  it('agrupa por largo, del más largo al más corto', () => {
    expect(resumirLargos([3, 2, 3, 2, 3])).toBe('3 × 3.00 m + 2 × 2.00 m');
  });
});

describe('revestimiento interior y presupuesto', () => {
  const placaInterior = { ...CATALOGO_INICIAL.find((p) => p.id === 'panelMuros'), id: 'placaInt', nombre: 'Placa interior', ...estandar({ anchoPlaca: 1.2, largoPlaca: 2.4 }) };
  const catalogo = [...CATALOGO_INICIAL, placaInterior];
  const conInterior = { ...P, paredes: { ...P.paredes, C: { ...P.paredes.C, panelInterior: 'placaInt' } } };

  it('una pared con revestimiento interior suma ese paño en su renglón (en placas)', () => {
    const item = calcularPresupuesto(generarEstructura(conInterior, []), catalogo).items.find((i) => i.id === 'placaInt');
    // Fondo C: 7,50 x 4,50 => 7 columnas x 2 filas (paradas) = 14; acostadas: 4 x 4 = 16 => 14.
    expect(item.cantidad).toBe(14);
    expect(item.detalle).toMatch(/lado C \(interior\)/);
  });

  it('sin revestimiento interior: no aparece en ningún renglón', () => {
    const item = calcularPresupuesto(generarEstructura(P, []), catalogo).items.find((i) => i.id === 'placaInt');
    expect(item.cantidad).toBe(0);
  });

  it('valida que el revestimiento interior exista', () => {
    expect(validarPanelesUsados(conInterior, catalogo)).toBeNull();
    expect(validarPanelesUsados(conInterior, CATALOGO_INICIAL)).toMatch(/interior del lado C/);
  });
});

describe('proyectos de antes de v1.15', () => {
  it('los tipos de panel viejos pasan a "a medida" de 1 m, por fuera de la estructura', () => {
    const viejo = { id: 'panelMuros', categoria: 'panel', nombre: 'Panel', perfil: 'PUR', precio: 1, color: '#000000', colorInterior: '#ffffff' };
    const panel = normalizarCatalogo([viejo]).find((p) => p.id === 'panelMuros');
    expect(panel).toMatchObject({ venta: 'medida', anchoUtil: 1, largoMaximo: 12, solape: 0, ubicacion: 'cara' });
  });

  it('se guardan los datos válidos y se corrigen los imposibles', () => {
    const guardado = { id: 'x', categoria: 'panel', nombre: 'Chapa', venta: 'estandar', anchoPlaca: 1.1, largoPlaca: 99, solape: 0.1, largoMaximo: 0.1 };
    const panel = normalizarCatalogo([guardado]).find((p) => p.id === 'x');
    expect(panel.venta).toBe('estandar');
    expect(panel.anchoPlaca).toBe(1.1);
    expect(panel.largoPlaca).toBe(REVESTIMIENTO_POR_DEFECTO.largoPlaca); // 99 m no existe
    expect(panel.largoMaximo).toBe(REVESTIMIENTO_POR_DEFECTO.largoMaximo); // 0,1 está fuera de rango
  });

  it('las paredes viejas no tienen revestimiento interior', () => {
    const { panelInterior, ...paredVieja } = P.paredes.A; // eslint-disable-line no-unused-vars
    const m = migrarParams({ ...P, paredes: { A: paredVieja, B: paredVieja, C: paredVieja, D: paredVieja } });
    expect(m.paredes.A.panelInterior).toBe('');
    expect(validarParametros(m)).toEqual({});
  });
});

describe('juntas para el 3D (v1.16)', () => {
  it('a medida: una vertical cada ancho útil; horizontales solo si pasa el largo máximo', () => {
    expect(juntasDePano(pared(3.5, 2.6), aMedida())).toEqual({ verticales: [1, 2, 3], horizontales: [] });
    expect(juntasDePano(pared(2, 7), aMedida({ largoMaximo: 3 })).horizontales).toEqual([3, 6]);
  });

  it('placa fija: grilla de la placa (parada)', () => {
    expect(juntasDePano(pared(3.6, 4.8), estandar({ anchoPlaca: 1.2, largoPlaca: 2.4 })))
      .toEqual({ verticales: [1.2, 2.4], horizontales: [2.4] });
  });
});

describe('descontar aberturas (v1.24)', () => {
  const conHuecos = (largo, alto, huecos) => ({ ...pared(largo, alto), huecos });
  const ventana = { desde: 1, hasta: 2.5, abajo: 1, arriba: 2 }; // 1,50 de ancho, de 1 a 2 m de alto

  it('una tira tapada entera por la ventana se pide en dos pedazos (abajo y arriba)', () => {
    expect(pedazosDeTira(1, 2, 3, [ventana])).toEqual([1, 1]);
    // La tira de 2 a 3 la ventana la corta solo en parte (llega a 2,50): va entera.
    expect(pedazosDeTira(2, 3, 3, [ventana])).toEqual([3]);
  });

  it('una puerta (antepecho 0) deja solo el pedazo de arriba; dos ventanas una sobre otra, tres pedazos', () => {
    expect(pedazosDeTira(0, 1, 3, [{ desde: 0, hasta: 1, abajo: 0, arriba: 2 }])).toEqual([1]);
    const dos = [{ desde: 0, hasta: 1, abajo: 0.5, arriba: 1 }, { desde: 0, hasta: 1, abajo: 2, arriba: 2.5 }];
    expect(pedazosDeTira(0, 1, 3, dos)).toEqual([0.5, 1, 0.5]);
  });

  it('a medida: la pared de 4 m con la ventana pide 3 tiras enteras + 2 pedazos', () => {
    expect(tirasDePano(conHuecos(4, 3, [ventana]), aMedida())).toEqual([3, 1, 1, 3, 3]);
  });

  it('placa fija: no se compra la placa que cae entera dentro de un hueco', () => {
    const portón = { desde: 0, hasta: 2.4, abajo: 0, arriba: 2.4 };
    const placa = estandar({ anchoPlaca: 1.2, largoPlaca: 1.2 });
    // Pared de 3,6 x 2,4: 3 x 2 = 6 placas; el portón tapa 2 x 2 = 4 enteras => quedan 2.
    expect(placasDePano(conHuecos(3.6, 2.4, [portón]), placa).placas).toBe(2);
    // Una ventana chica no tapa ninguna placa entera: no descuenta.
    expect(placasDePano(conHuecos(3.6, 2.4, [{ desde: 0.5, hasta: 1, abajo: 1, arriba: 1.5 }]), placa).placas).toBe(6);
  });
});

describe('pared con huecos para el 3D (v1.24)', () => {
  const area = (pedazos) => pedazos.reduce((a, [p0, p1, p2, p3]) => a + (p1[0] - p0[0]) * ((p2[1] - p1[1]) + (p3[1] - p0[1])) / 2, 0);
  it('el área dibujada = pared − huecos (también una puerta que toca el piso)', () => {
    const huecos = [{ desde: 1, hasta: 2.5, abajo: 1, arriba: 2 }, { desde: 3, hasta: 3.9, abajo: 0, arriba: 2.05 }];
    const pedazos = pedazosDePared(5, () => 3, huecos);
    expect(area(pedazos)).toBeCloseTo(5 * 3 - 1.5 * 1 - 0.9 * 2.05);
  });
  it('pared inclinada sin huecos: un solo trapecio', () => {
    const pedazos = pedazosDePared(4, (x) => 3 + x / 4, []);
    expect(pedazos).toHaveLength(1);
    expect(area(pedazos)).toBeCloseTo(4 * 3.5);
  });
});

describe('v1.81: cobrado por tira entera de largo fijo (ALPANEL)', () => {
  const tipo = { ...REVESTIMIENTO_POR_DEFECTO, anchoUtil: 0.95, largoMaximo: 11.9, cobro: 'tira', largoTira: 11.9, aprovecharRetazos: false, descontarAberturas: false };
  // Dos paredes: una de 3,8 m x 5 m de alto (4 tiras de 5 m) y otra de 1,9 m x 2,6 m (2 de 2,6 m).
  const panos = [
    { donde: 'pared A', largo: 3.8, h1: 5, h2: 5, neto: 19, huecos: [] },
    { donde: 'pared B', largo: 1.9, h1: 2.6, h2: 2.6, neto: 4.94, huecos: [] },
  ];

  it('los pedazos de cada pared se acomodan en tiras enteras (como las barras), con los recortes en la misma pared', () => {
    const c = cuentaRevestimiento(tipo, panos);
    expect(c.unidad).toBe('tiras');
    // Pared A: 4 x 5 m en tiras de 11,90: 2 por tira = 2 tiras. Pared B: 2 x 2,60 = 1 tira.
    expect(c.cantidad).toBe(3);
    expect(c.tirasPorPared.map((g) => [g.donde, g.tiras.length])).toEqual([['pared A', 2], ['pared B', 1]]);
    expect(c.tirasPorPared[0].tiras[0].piezas.map((x) => x.largo)).toEqual([5, 5]);
    expect(c.tirasPorPared[0].tiras[0].sobra).toBeCloseTo(1.9, 1); // 11,90 - 10 (menos lo que se lleva el corte)
    expect(c.detalle).toMatch(/^3 tiras enteras de 11\.90 m/);
    expect(unidadDePrecio(tipo)).toBe('tira');
    expect(unidadDePrecio({ ...tipo, cobro: 'm2' })).toBe('m²');
  });

  it('avisa si compartiendo los recortes entre paredes se compra menos', () => {
    // 3 pedazos de 4 m en cada pared, tiras de 10 m (2 por tira): por pared 2 + 2 = 4; compartiendo 3.
    const r = tirasEnteras([{ donde: 'A', piezas: [4, 4, 4] }, { donde: 'B', piezas: [4, 4, 4] }], 10.02);
    expect(r).toMatchObject({ tiras: 4, compartiendo: 3 });
    // Tiras de 7,62: la pared A (4 x 5 m) sobra 2,62 en cada una, justo para los de 2,60 de la pared B.
    const c = cuentaRevestimiento({ ...tipo, largoTira: 7.62 }, panos);
    expect(c.cantidad).toBe(5);
    expect(c.detalle).toMatch(/usando los recortes de una pared en otra serían/);
  });

  it('un pedazo más alto que la tira va en tramos; los de antes siguen por m²', () => {
    const alta = cuentaRevestimiento({ ...tipo, largoTira: 3 }, [{ donde: 'pared', largo: 0.95, h1: 5, h2: 5, neto: 4.75, huecos: [] }]);
    expect(alta.piezas).toEqual([3, 2]);
    expect(alta.cantidad).toBe(2);
    const m2 = cuentaRevestimiento({ ...tipo, cobro: undefined }, panos);
    expect(m2.unidad).toBe('m²');
    expect(normalizarCatalogo([{ id: 'p', categoria: 'panel', nombre: 'P', venta: 'medida' }]).find((i) => i.id === 'p')).toMatchObject({ cobro: 'm2', largoTira: 0 });
  });
});

describe('v1.81.1: comparar tiras con y sin recortes, con y sin aberturas', () => {
  it('una tira por pedazo cuesta más que usando los recortes; entre paredes, lo menos', () => {
    const tipo = { ...REVESTIMIENTO_POR_DEFECTO, anchoUtil: 0.95, largoMaximo: 11.9, cobro: 'tira', largoTira: 7.62, aprovecharRetazos: true };
    const panos = [
      { donde: 'pared A', largo: 3.8, h1: 5, h2: 5, neto: 19, huecos: [] },
      { donde: 'pared B', largo: 1.9, h1: 2.6, h2: 2.6, neto: 4.94, huecos: [{ desde: 0.1, hasta: 1.8, abajo: 0.9, arriba: 2.1 }] },
    ];
    const c = comparativaDeTiras(tipo, panos);
    expect(c.todoEntero).toEqual({ sinRecortes: 6, mismaPared: 5, entreParedes: 4 });
    expect(c.conAberturas.sinRecortes).toBeGreaterThanOrEqual(c.conAberturas.mismaPared);
    expect(c.conAberturas.mismaPared).toBeGreaterThanOrEqual(c.conAberturas.entreParedes);
  });
});

describe('v1.82: mover los recortes (de qué tira sale cada pedazo) y cuál queda arriba de cuál', () => {
  const tipo = { ...REVESTIMIENTO_POR_DEFECTO, anchoUtil: 0.95, anchoTotal: 1, largoMaximo: 11.9, cobro: 'tira', largoTira: 11.9, aprovecharRetazos: false, descontarAberturas: false };
  const panos = [
    { donde: 'pared A', largo: 3.8, h1: 5, h2: 5, neto: 19, huecos: [] },
    { donde: 'pared B', largo: 1.9, h1: 2.6, h2: 2.6, neto: 4.94, huecos: [] },
  ];

  it('cada pedazo tiene su lugar (los mismos que tirasDePano)', () => {
    const conHueco = { ...panos[0], huecos: [{ desde: 1, hasta: 2.8, abajo: 1, arriba: 2.2 }] };
    expect(pedazosConLugar(conHueco, tipo).map((p) => p.largo)).toEqual(tirasDePano(conHueco, tipo));
    expect(pedazosConLugar(panos[0], tipo)[1]).toMatchObject({ x0: 0.95, y0: 0, largo: 5 });
  });

  it('un pedazo elegido a mano sale de la tira elegida (aunque sea de otra pared); los demás se acomodan solos', () => {
    const auto = cuentaRevestimiento(tipo, panos);
    expect(auto.tirasPorPared.map((g) => g.tiras.length)).toEqual([2, 1]);
    // Los dos pedazos de 2,60 de la pared B, a la tira 2 de la pared A: entran los dos (y un 5 m de A al lado).
    const manual = cuentaRevestimiento({ ...tipo, tirasManuales: { 'pared B|0': { pared: 'pared A', n: 2 }, 'pared B|1': { pared: 'pared A', n: 2 } } }, panos);
    const tira2 = manual.tirasPorPared[0].tiras.find((t) => t.n === 2);
    expect(tira2.piezas.filter((x) => x.manual).map((x) => x.id)).toEqual(['pared B|0', 'pared B|1']);
    expect(tira2.piezas.map((x) => x.largo)).toEqual([5, 2.6, 2.6]);
    expect(manual.tirasPorPared.map((g) => g.donde)).toEqual(['pared A']); // la pared B ya no lleva tira propia
    expect(manual.cantidad).toBe(3);
    // Tres de 5 m en la misma tira de 11,90: el tercero no entra (aviso) y va a otra.
    const lleno = cuentaRevestimiento({ ...tipo, tirasManuales: { 'pared A|0': { pared: 'pared A', n: 1 }, 'pared A|1': { pared: 'pared A', n: 1 }, 'pared A|2': { pared: 'pared A', n: 1 } } }, panos);
    expect(lleno.avisosTiras[0]).toMatch(/no entra en la tira 1 de pared A/);
    // Pedir una tira nueva (la 5) para un pedazo: se respeta el número.
    const nueva = cuentaRevestimiento({ ...tipo, tirasManuales: { 'pared A|0': { pared: 'pared A', n: 5 } } }, panos);
    expect(nueva.tirasPorPared[0].tiras.map((t) => t.n)).toContain(5);
    expect(nueva.lugares['pared A|0']).toMatchObject({ x0: 0, y0: 0 });
  });

  it('el empalme vertical: el tramo de arriba monta por fuera; el encastre, del lado que superpone', () => {
    const alta = { donde: 'pared', largo: 1.9, h1: 5, h2: 5, neto: 9.5, huecos: [] };
    const e = encimadosDePano(alta, { ...tipo, largoTira: 3, solape: 0.15 });
    expect(e.verticales).toEqual([{ abajo: 2.85, arriba: 3 }]);
    expect(e.laterales).toEqual([{ desde: 0.95, hasta: 1 }]); // ancho total 1 − útil 0,95 = 5 cm, a la derecha de la junta
    expect(encimadosDePano(alta, { ...tipo, ladoSolape: 'derecha' }).laterales[0]).toMatchObject({ hasta: 0.95 });
    expect(encimadosDePano(alta, { ...tipo, anchoTotal: 0 }).laterales).toEqual([]); // sin ancho total no se sabe
  });
});

describe('v1.82.1: elegir la forma de usar los recortes (desde Comparar)', () => {
  const tipo = { ...REVESTIMIENTO_POR_DEFECTO, anchoUtil: 0.95, largoMaximo: 11.9, cobro: 'tira', largoTira: 7.62, aprovecharRetazos: true, descontarAberturas: false };
  const panos = [
    { donde: 'pared A', largo: 3.8, h1: 5, h2: 5, neto: 19, huecos: [] },
    { donde: 'pared B', largo: 1.9, h1: 2.6, h2: 2.6, neto: 4.94, huecos: [] },
  ];
  it('misma pared (de fábrica), cualquier pared o una tira por pedazo: lo mismo que dice Comparar', () => {
    const comp = comparativaDeTiras(tipo, panos).todoEntero;
    const pared = cuentaRevestimiento(tipo, panos);
    const entre = cuentaRevestimiento({ ...tipo, recortes: 'entreParedes' }, panos);
    const ninguno = cuentaRevestimiento({ ...tipo, recortes: 'ninguno' }, panos);
    expect([pared.cantidad, entre.cantidad, ninguno.cantidad]).toEqual([comp.mismaPared, comp.entreParedes, comp.sinRecortes]);
    expect(entre.cantidad).toBeLessThan(pared.cantidad);
    expect(entre.tirasPorPared.map((g) => g.donde)).toEqual(['todas las paredes']);
    expect(entre.detalle).toMatch(/recortes en cualquier pared/);
    expect(ninguno.tirasPorPared.every((g) => g.tiras.every((t) => t.piezas.length === 1))).toBe(true);
    expect(normalizarCatalogo([{ id: 'p', categoria: 'panel', nombre: 'P', recortes: 'cualquiera' }]).find((i) => i.id === 'p').recortes).toBe('pared');
  });
});

describe('v1.90: elegir de qué tira sale un pedazo (también tocándolo en el 3D, y del techo a una pared)', async () => {
  const { destinosDeTiras, cambiarTiraManual, tiraDeCadaPedazo, TODAS_LAS_PAREDES } = await import('./revestimientos.js');
  const porPared = [
    { donde: 'techo', tiras: [{ n: 1, piezas: [{ id: 'techo|0', largo: 5.03 }, { id: 'techo|1', largo: 5.03 }], sobra: 1.83 }] },
    { donde: 'lado B', tiras: [{ n: 1, piezas: [{ id: 'lado B|0', largo: 4.7 }], sobra: 7.2 }] },
  ];
  it('los destinos dicen qué lleva cada tira y cuánto sobra, más una nueva por grupo', () => {
    const d = destinosDeTiras(porPared);
    expect(d).toContainEqual(['techo|1', 'techo · tira 1: techo 5,03 + techo 5,03 · sobra 1,83 m']);
    expect(d).toContainEqual(['lado B|2', 'lado B · tira nueva']);
    // Con los recortes en cualquier pared, sin "todas las paredes ·" adelante.
    expect(destinosDeTiras([{ donde: TODAS_LAS_PAREDES, tiras: [{ n: 3, piezas: [{ id: 'lado B|0', largo: 4.7 }], sobra: 7.2 }] }])[0][1])
      .toBe('tira 3: lado B 4,70 · sobra 7,20 m');
  });
  it('elegir y volver a lo automático', () => {
    const m = cambiarTiraManual({}, 'techo|0', 'lado B|1');
    expect(m).toEqual({ 'techo|0': { pared: 'lado B', n: 1 } });
    expect(cambiarTiraManual(m, 'techo|0', '')).toEqual({});
  });
  it('un pedazo del techo mandado a la tira de una pared sale de ahí', () => {
    const tipo = { venta: 'medida', cobro: 'tira', largoTira: 11.9, largoMaximo: 12, anchoUtil: 0.95, recortes: 'pared',
      tirasManuales: { 'techo|0': { pared: 'lado B', n: 1 } } };
    const panos = [
      { donde: 'lado B', largo: 0.95, h1: 4.7, h2: 4.7, neto: 4.4, huecos: [] },
      { donde: 'techo', largo: 1.9, h1: 5.03, h2: 5.03, neto: 9.5, huecos: [] },
    ];
    const r = tiraDeCadaPedazo(tipo, panos);
    expect(r.pedazosDe('techo').find((l) => l.id === 'techo|0')).toMatchObject({ n: 1, manual: true });
    expect(r.tirasPorPared.find((g) => g.donde === 'lado B').tiras[0].piezas.map((x) => x.id)).toContain('techo|0');
  });
});
