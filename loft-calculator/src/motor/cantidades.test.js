// Tests de separaciones por medida o por cantidad (v1.27). Correr con: npm test
import { describe, it, expect } from 'vitest';
import { separacionDe, cantidadDe, CAMPOS_CON_CANTIDAD } from './cantidades.js';
import { generarEstructura, infoSeparacion } from './estructura.js';
import { validarParametros, revisarCantidades } from './validacion.js';
import { migrarParams } from './migracion.js';
import { PARAMS_INICIALES as P } from './parametrosIniciales.js';

const con = (cantidades, extra = {}) => ({ ...P, ...extra, cantidades });
const correasConBordes = (e) => e.techo.correas.length + e.techo.bordes.filter((b) => b.id.startsWith('correa-techo:')).length;
const deLaPared = (piezas, lado, tipo) => piezas.filter((p) => p.tipo === tipo && p.grupos.includes(lado));

describe('separación según la cantidad', () => {
  it('sin cantidad: la medida cargada; con cantidad: reparte parejo', () => {
    expect(separacionDe(P, 'paredes.A.separacionVerticales', 7.5)).toBe(2.5);
    // 4 columnas con las puntas en 7,5 m → 3 tramos de 2,5
    expect(separacionDe(con({ 'paredes.A.separacionVerticales': 4 }), 'paredes.A.separacionVerticales', 7.5)).toBe(2.5);
    // 3 fajas interiores en 2,4 m → 4 tramos de 0,6
    expect(separacionDe(con({ 'paredes.A.separacionHorizontales': 3 }), 'paredes.A.separacionHorizontales', 2.4)).toBeCloseTo(0.6);
    expect(separacionDe(con({ separacionTransversalesPiso: 0 }), 'separacionTransversalesPiso', 3)).toBe(0);
  });

  it('una cantidad no entera o negativa no cuenta (queda por medida)', () => {
    expect(cantidadDe(con({ separacionPiso: 2.5 }), 'separacionPiso')).toBeNull();
    expect(cantidadDe(con({ separacionPiso: -1 }), 'separacionPiso')).toBeNull();
  });
});

describe('la estructura con cantidades', () => {
  it('columnas: la cantidad es el total de la pared, con las esquinas', () => {
    const e = generarEstructura(con({ 'paredes.A.separacionVerticales': 6 }), []);
    const columnas = deLaPared(e.columnas, 'A', 'columna');
    expect(columnas).toHaveLength(6);
    expect(infoSeparacion(con({ 'paredes.A.separacionVerticales': 6 }), 'paredes.A.separacionVerticales'))
      .toEqual({ cantidad: 6, separacion: 1.5 }); // 7,5 / 5
  });

  it('montantes: n en cada vano entre columnas, repartidos parejo', () => {
    const p = con({ 'paredes.A.separacionMontantes': 2 });
    const e = generarEstructura(p, []);
    const montantes = e.montantes.filter((m) => m.grupos.includes('A'));
    // Columnas de la pared (con la que baja del entrepiso) → (columnas − 1) vanos × 2 montantes
    const columnas = e.columnas.filter((c) => c.grupos.includes('A')).map((c) => c.desde[0]).sort((a, b) => a - b);
    expect(montantes).toHaveLength((columnas.length - 1) * 2);
    // En el primer vano (de -3,75 a -1,25): a 1/3 y 2/3
    const xs = montantes.map((m) => m.desde[0]).sort((a, b) => a - b);
    expect(xs[0]).toBeCloseTo(columnas[0] + (columnas[1] - columnas[0]) / 3);
    expect(xs[1] - xs[0]).toBeCloseTo((columnas[1] - columnas[0]) / 3);
  });

  it('montantes en 0 por cantidad: sin montantes, aunque la medida tenga un valor', () => {
    const p = con({ 'paredes.A.separacionMontantes': 0 }, { paredes: { ...P.paredes, A: { ...P.paredes.A, separacionMontantes: 0.5 } } });
    expect(generarEstructura(p, []).montantes.filter((m) => m.grupos.includes('A'))).toHaveLength(0);
  });

  it('fajas, tirantes, vigas y correas del techo', () => {
    const p = con({
      'paredes.B.separacionHorizontales': 2,
      separacionPiso: 9,
      separacionVigasTecho: 5,
      separacionCorreasTecho: 4,
    });
    const e = generarEstructura(p, []);
    expect(deLaPared(e.correas, 'B', 'horizontal')).toHaveLength(2);
    expect(e.piso.tirantes).toHaveLength(9);
    expect(e.techo.vigas).toHaveLength(5);
    // Las correas cuentan con las de los bordes (v1.28: con marco perimetral, esas son "borde de techo").
    expect(correasConBordes(e)).toBe(4);
    expect(infoSeparacion(p, 'separacionPiso').cantidad).toBe(9);
    expect(infoSeparacion(p, 'separacionCorreasTecho').cantidad).toBe(4);
  });

  it('fajas en una pared inclinada: exactamente n, repartidas en el alto mayor', () => {
    const p = con({ 'paredes.B.separacionHorizontales': 4 }); // B va de 4,95 a 4,50 (techo con pendiente)
    const fajas = deLaPared(generarEstructura(p, []).correas, 'B', 'horizontal');
    expect(fajas).toHaveLength(4);
    expect(infoSeparacion(p, 'paredes.B.separacionHorizontales')).toEqual({ cantidad: 4, separacion: 0.99 });
  });

  it('por medida, infoSeparacion cuenta lo mismo que el motor', () => {
    const sinEntrepiso = { ...P, anchoEntrepiso: 0, escalera: { ...P.escalera, activa: false } };
    const e = generarEstructura(P, []);
    const columnasA = deLaPared(generarEstructura(sinEntrepiso, []).columnas, 'A', 'columna').length;
    expect(infoSeparacion(P, 'separacionPiso').cantidad).toBe(e.piso.tirantes.length);
    expect(infoSeparacion(P, 'separacionVigasTecho').cantidad).toBe(e.techo.vigas.length);
    expect(infoSeparacion(P, 'separacionCorreasTecho').cantidad).toBe(correasConBordes(e));
    expect(infoSeparacion(sinEntrepiso, 'paredes.A.separacionVerticales').cantidad).toBe(columnasA);
    expect(infoSeparacion(P, 'paredes.A.separacionMontantes')).toMatchObject({ porVano: true, cantidad: null });
  });
});

describe('validación y proyectos viejos', () => {
  it('rechaza campos desconocidos, no enteros y fuera de rango', () => {
    expect(revisarCantidades({ x: 3 })[0][0]).toBe('cantidades');
    expect(revisarCantidades({ separacionPiso: 1.5 })).toEqual([['separacionPiso', 'La cantidad debe ser un número entero']]);
    expect(revisarCantidades({ 'paredes.A.separacionHorizontales': 0 })).toEqual([['paredes.A.separacionHorizontales', 'Mínimo 1']]);
    expect(revisarCantidades({ 'paredes.A.separacionVerticales': 201 })[0][1]).toBe('Máximo 200');
    expect(validarParametros(con({ separacionPiso: 0 })).separacionPiso).toBe('Mínimo 1');
    expect(validarParametros(con({ separacionTransversalesPiso: 0, 'paredes.C.separacionMontantes': 3 }))).toEqual({});
  });

  it('todos los campos con cantidad tienen su mínimo (ninguno puede quedar en un bucle sin fin)', () => {
    Object.entries(CAMPOS_CON_CANTIDAD).forEach(([ruta, c]) => {
      if (c.modo === 'interiores' && !ruta.includes('Transversales')) expect(c.minimo, ruta).toBeGreaterThanOrEqual(1);
    });
  });

  it('un proyecto de antes de v1.27 se abre todo por medida', () => {
    const { cantidades, ...viejo } = P;
    expect(cantidades).toEqual({});
    expect(migrarParams(viejo).cantidades).toEqual({});
  });
});
