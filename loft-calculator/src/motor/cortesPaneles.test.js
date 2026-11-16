// Tests de los cortes de los paneles (v1.63). Correr con: npm test
import { describe, it, expect } from 'vitest';
import { cortesDeTiras, retazosEntreParedes, sugerenciaParaAbertura, tiraEnPunto } from './cortesPaneles.js';

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
    expect(tiras[1].pedidos).toEqual([2.6]); // de 1 a 2: la ventana la toma en parte
    expect(tiras[1].cortes[0]).toBe('recortar 0,80 × 1,00 m (a 0,20 m de su borde izquierdo, de 1,00 a 2,00 m del piso)');
    expect(tiras[2].pedidos).toEqual([2.6]); // de 2 a 3: la ventana llega hasta 2,70: también en parte
    expect(desperdicio).toBeCloseTo(1.5, 6); // lo recortado de la ventana se tira
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
    // Ventana de 1,20 de 1,10 a 2,30: ninguna tira queda entera adentro. Corriéndola 10 cm a la izquierda (de 1,00 a
    // 2,20) la tira de 1 a 2 queda entera dentro del hueco y se pide en dos pedazos: 1 m² menos.
    const pano = { largo: 4, h1: 2.6, h2: 2.6, huecos: [{ desde: 1.1, hasta: 2.3, abajo: 1, arriba: 2 }] };
    const s = sugerenciaParaAbertura(pano, 0, panel);
    expect(s.correr).toBeCloseTo(-0.1, 6);
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
