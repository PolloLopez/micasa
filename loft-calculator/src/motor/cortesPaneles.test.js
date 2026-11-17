// Tests de los cortes de los paneles (v1.63). Correr con: npm test
import { describe, it, expect } from 'vitest';
import { franjasDeTiras, juntasDePano } from './revestimientos.js';
import { cortesDeTiras, retazosEntreParedes, sugerenciaParaAbertura, tiraEnPunto, pedazosDeLaTira, rellenosDeLaObra } from './cortesPaneles.js';

const panel = { venta: 'medida', anchoUtil: 1, largoMaximo: 12, solape: 0 };

describe('tamaños y cortes de cada tira', () => {
  it('pared de 4,50 m de 2,60 a 3,00 m: 5 tiras, la última angosta y todas con corte inclinado', () => {
    const { tiras } = cortesDeTiras({ largo: 4.5, h1: 2.6, h2: 3, huecos: [] }, panel);
    expect(tiras).toHaveLength(5);
    expect(tiras[4].ancho).toBeCloseTo(0.5, 9);
    expect(tiras[4].cortes[0]).toBe('cortar a lo largo: queda de 0,50 m de ancho');
    expect(tiras[0].cortes).toContain('corte inclinado arriba: de 2,60 a 2,69 m');
    expect(tiras[0].pedidos).toEqual([2.69]); // el alto mayor de la tira, al cm
  });

  it('una ventana: la tira que queda entera adentro va en dos pedazos; la que toma en parte, se recorta', () => {
    // Ventana de 1,50 x 1,00, de 1,20 a 2,70, antepecho 1,00.
    const pano = { largo: 4, h1: 2.6, h2: 2.6, huecos: [{ desde: 1.2, hasta: 2.7, abajo: 1, arriba: 2 }] };
    const { tiras, desperdicio } = cortesDeTiras(pano, panel);
    // v1.67: de 1 a 2 la ventana deja 0,20 m al costado (menos de 0,30): la tira va en dos pedazos (abajo 1,00 y
    // arriba 0,60) y el costado se rellena con un retazo de 0,20 × 1,00.
    expect(tiras[1].pedidos).toEqual([1, 0.6]);
    expect(tiras[1].cortes).toEqual(['va en 2 pedazos (abajo y arriba de la abertura)', 'relleno al costado izquierdo de la abertura: 0,20 × 1,00 m']);
    expect(tiras[2].pedidos).toEqual([2.6]); // de 2 a 3: la ventana llega hasta 2,70, le quedan 0,30: se recorta
    expect(tiras[2].cortes[0]).toBe('recortar 0,70 × 1,00 m (a 0,00 m de su borde izquierdo, de 1,00 a 2,00 m del piso)');
    expect(desperdicio).toBeCloseTo(0.7, 6); // lo recortado de la 3 (de ahí sale el relleno de la 2)
  });
});

describe('retazos entre paredes', () => {
  it('la tira angosta de la pared baja sale del retazo de la alta', () => {
    const a = { largo: 7.5, h1: 3, h2: 3, huecos: [], donde: 'Frente' };
    const b = { largo: 4.5, h1: 2.6, h2: 2.6, huecos: [], donde: 'Lateral' };
    const r = retazosEntreParedes([a, b], panel);
    expect(r.reusos).toEqual([{ para: 'Lateral, tira 5', de: 'Frente, tira 8', ancho: 0.5, alto: 2.6 }]);
    expect(r.ahorroM2).toBeCloseTo(2.6, 6);
    // Si lo que sobra es más angosto que lo que hace falta (0,40 contra 0,60), no.
    expect(retazosEntreParedes([{ ...b, largo: 4.6 }, { ...a, largo: 7.6 }], panel).reusos).toEqual([]);
  });
});

describe('ventanas en base a los paneles', () => {
  it('correr la ventana para que su borde caiga en una junta ahorra una tira entera', () => {
    // Ventana de 1,20 de 1,35 a 2,55: deja 0,35 y 0,45 a los costados, ninguna tira se parte. Corriéndola 35 cm a la
    // izquierda (de 1,00 a 2,20) la tira de 1 a 2 queda entera dentro del hueco y se pide en dos pedazos: 1 m² menos.
    const pano = { largo: 4, h1: 2.6, h2: 2.6, huecos: [{ desde: 1.35, hasta: 2.55, abajo: 1, arriba: 2 }] };
    const s = sugerenciaParaAbertura(pano, 0, panel);
    expect(s.correr).toBeCloseTo(-0.35, 6);
    expect(s.ahorroM2).toBeCloseTo(1, 6);
    // Ya alineada: nada que sugerir.
    expect(sugerenciaParaAbertura({ ...pano, huecos: [{ desde: 1, hasta: 2.2, abajo: 1, arriba: 2 }] }, 0, panel)).toBeNull();
    expect(sugerenciaParaAbertura(pano, 0, { ...panel, venta: 'estandar' })).toBeNull();
  });
});

describe('v1.65: tiraEnPunto (tocar un panel en el 3D)', () => {
  const tipo = { venta: 'medida', anchoUtil: 1, largoMaximo: 12, solape: 0 };
  const pano = { largo: 7.5, h1: 2.5, h2: 2.5, huecos: [] };
  it('la tira que está en ese lugar, con sus datos', () => {
    const t = tiraEnPunto(pano, tipo, 3.4, 1);
    expect(t.n).toBe(4);
    expect(t.total).toBe(8);
    expect(t.ancho).toBeCloseTo(1);
    expect(tiraEnPunto(pano, tipo, 7.3, 1).ancho).toBeCloseTo(0.5); // la última, cortada a lo largo
    expect(tiraEnPunto(pano, tipo, 8, 1)).toBeNull();
  });
  it('placa fija: fila y columna', () => {
    const p = tiraEnPunto({ largo: 3, h1: 2.6, h2: 2.6 }, { venta: 'estandar', anchoPlaca: 1.22, largoPlaca: 2.44 }, 2.5, 2.5);
    expect([p.placa, p.columna, p.columnas, p.fila, p.filas]).toEqual([true, 3, 3, 2, 2]);
    expect(p.ancho).toBeCloseTo(3 - 2.44);
  });
});

describe('v1.67: tiras partidas por una abertura y el plano de cada pedazo', () => {
  // El caso de Leandro (Frente, tira 7 de 6 a 7 m): ventana de 6,10 a 7,30, de 1,20 a 2,00; la pared mide 4,25.
  const pano = { largo: 7.5, h1: 4.25, h2: 4.25, huecos: [{ desde: 6.1, hasta: 7.3, abajo: 1.2, arriba: 2 }] };
  const { tiras } = cortesDeTiras(pano, panel);
  it('la tira 7 va en dos pedazos (abajo 1,20 y arriba 2,25) con un relleno de 0,10 × 0,80 a la izquierda', () => {
    expect(tiras[6].pedidos).toEqual([1.2, 2.25]);
    expect(tiras[6].rellenos).toEqual([{ lado: 'izquierdo', ancho: expect.closeTo(0.1, 6), abajo: 1.2, arriba: 2, x0: 6, x1: 6.1 }]);
    expect(tiras[6].cortes.some((c) => c.startsWith('recortar'))).toBe(false);
    // La 8 (de 7 a 7,50, angosta): la ventana le deja 0,20 a la derecha: también partida.
    expect(tiras[7].pedidos).toEqual([1.2, 2.25]);
    expect(tiras[7].rellenos[0].lado).toBe('derecho');
  });
  it('el plano de cada pedazo: medidas, desde dónde arranca y el lado que superpone', () => {
    const p = pedazosDeLaTira(pano, panel, tiras[6]);
    expect(p.map((x) => [x.nombre, x.largo, x.desde, x.superpone])).toEqual([
      ['Tira 7 · abajo', 1.2, 0, 'izquierda'], ['Tira 7 · arriba', 2.25, 2, 'izquierda']]);
    expect(p[0].recortes).toEqual([]);
    expect(pedazosDeLaTira(pano, { ...panel, ladoSolape: 'derecha' }, tiras[6])[0].superpone).toBe('derecha');
  });
  it('una puerta que la toma en parte: el recorte en el pedazo; pared inclinada: el borde de arriba', () => {
    const conPuerta = { largo: 3, h1: 2.6, h2: 3.2, huecos: [{ desde: 1.4, hasta: 2.2, abajo: 0, arriba: 2 }] };
    const t = cortesDeTiras(conPuerta, panel).tiras;
    const [pedazo] = pedazosDeLaTira(conPuerta, panel, t[1]); // de 1 a 2: la puerta le saca 0,60 a la derecha
    expect(pedazo.recortes).toEqual([{ x0: expect.closeTo(0.4, 6), x1: 1, y0: 0, y1: 2 }]);
    expect(pedazo.arriba[0]).toBeCloseTo(2.8);
    expect(pedazo.arriba[1]).toBeCloseTo(3);
  });
});

describe('v1.68: costado mínimo, dónde va la tira angosta y de dónde salen los rellenos', () => {
  const pano = { largo: 7.5, h1: 4.25, h2: 4.25, huecos: [{ desde: 6.1, hasta: 7.3, abajo: 1.2, arriba: 2 }], donde: 'Frente' };
  it('el costado mínimo es de cada revestimiento (0 = solo si la tapa de lado a lado)', () => {
    expect(cortesDeTiras(pano, { ...panel, costadoMinimo: 0 }).tiras[6].pedidos).toEqual([4.25]);
    expect(cortesDeTiras(pano, { ...panel, costadoMinimo: 0.05 }).tiras[6].pedidos).toEqual([4.25]); // le quedan 0,10
    expect(cortesDeTiras(pano, { ...panel, costadoMinimo: 0.15 }).tiras[6].pedidos).toEqual([1.2, 2.25]);
  });
  it('la tira angosta a la derecha (de fábrica), a la izquierda o repartida en las dos puntas', () => {
    const anchos = (tiraAngosta) => franjasDeTiras(7.5, { anchoUtil: 1, tiraAngosta }).map((f) => Number((f.x1 - f.x0).toFixed(3)));
    expect(anchos('derecha')).toEqual([1, 1, 1, 1, 1, 1, 1, 0.5]);
    expect(anchos('izquierda')).toEqual([0.5, 1, 1, 1, 1, 1, 1, 1]);
    expect(anchos('repartida')).toEqual([0.75, 1, 1, 1, 1, 1, 1, 0.75]);
    expect(franjasDeTiras(3, { anchoUtil: 1, tiraAngosta: 'repartida' }).length).toBe(3); // justa: sin angosta
    // Las juntas siguen el reparto.
    expect(juntasDePano({ largo: 7.5, h1: 3, h2: 3 }, { ...panel, tiraAngosta: 'izquierda' }).verticales[0]).toBeCloseTo(0.5);
  });
  it('el relleno sale del recorte de otra tira si entra; si no, se compra', () => {
    // Puerta de 0,80 de 2,60 a 3,40 (le saca 0,40 a la tira 3 y 0,40 a la 4): recortes de 0,40 × 2,00.
    const conPuerta = { ...pano, huecos: [...pano.huecos, { desde: 2.6, hasta: 3.4, abajo: 0, arriba: 2 }] };
    const { rellenos, comprar } = rellenosDeLaObra([conPuerta], panel);
    expect(rellenos.map((r) => [r.para, r.de])).toEqual([
      ['Frente, tira 8 (costado derecho)', 'recorte de Frente, tira 3'], ['Frente, tira 7 (costado izquierdo)', 'recorte de Frente, tira 3']]);
    expect(comprar).toEqual([]);
    // Sin puerta, ningún recorte: se compra un pedazo de 0,80 para los dos (entran uno al lado del otro).
    const sinPuerta = rellenosDeLaObra([pano], panel);
    expect(sinPuerta.rellenos.every((r) => r.de === null)).toBe(true);
    expect(sinPuerta.comprar).toEqual([0.8]);
  });
});

describe('v1.71: descontar o no las aberturas', () => {
  const pano = { largo: 7.5, h1: 4.25, h2: 4.25, huecos: [{ desde: 6.1, hasta: 7.3, abajo: 1.2, arriba: 2 }, { desde: 2.6, hasta: 4.1, abajo: 0, arriba: 2 }], donde: 'Frente', neto: 25 };
  it('sin descontar: tiras enteras, los huecos se recortan en obra, sin rellenos ni sugerencias', () => {
    const t = cortesDeTiras(pano, { ...panel, descontarAberturas: false }).tiras;
    expect(t.every((x) => x.pedidos.length === 1 && x.pedidos[0] === 4.25)).toBe(true);
    expect(t.flatMap((x) => x.rellenos)).toEqual([]);
    expect(t[6].cortes.some((c) => c.startsWith('recortar'))).toBe(true);
    expect(sugerenciaParaAbertura(pano, 0, { ...panel, descontarAberturas: false })).toBeNull();
  });
  it('cuánto se ahorra descontándolas (lo que se arriesga si viene mal cortado)', async () => {
    const { ahorroPorAberturas } = await import('./revestimientos.js');
    const a = ahorroPorAberturas(panel, [pano]);
    expect(a.sinDescuento).toBeCloseTo(8 * 4.25);
    // Las tiras que parte una abertura (la 4 por la puerta, la 7 y la 8 por la ventana) se piden más cortas.
    expect(a.ahorro).toBeGreaterThan(0);
    expect(a.conDescuento + a.ahorro).toBeCloseTo(a.sinDescuento);
    expect(a.unidad).toBe('m²');
  });
});
