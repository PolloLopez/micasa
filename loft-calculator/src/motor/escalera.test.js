// Tests de la escalera. Correr con: npm test
import { describe, it, expect } from 'vitest';
import { calcularEscalones, alturaEscalera, repartirDescansos, ESCALERA_INICIAL } from './escalera.js';
import { generarEstructura, listarPiezas } from './estructura.js';
import { validarParametros } from './validacion.js';
import { calcularPresupuesto, CATALOGO_INICIAL } from './presupuesto.js';
import { migrarParams } from './migracion.js';
import { INSUMO } from './constantes.js';
import { PARAMS_INICIALES as P, ABERTURAS_INICIALES } from './parametrosIniciales.js';

const conEscalera = (cambios) => ({ ...P, escalera: { ...P.escalera, ...cambios } });
const enL = conEscalera({ forma: 'L', descansos: [6], giroHacia: 'B' });
// Caracol de 3/4 de vuelta que entra en el loft: arranca perpendicular al borde (hacia B) y gira hacia A.
const tresCuartos = conEscalera({ forma: '3/4', descansos: [3, 5, 8], bajaHacia: 'B', posicion: 2, giroHacia: 'A' });

describe('cálculo de escalones', () => {
  it('altura automática = piso 2 + espesor del piso', () => {
    expect(alturaEscalera(ESCALERA_INICIAL)).toBeCloseTo(2.38);
    expect(alturaEscalera({ ...ESCALERA_INICIAL, alturaTotal: 2.7 })).toBe(2.7);
  });

  it('todas las contrahuellas iguales: 2,38 m / objetivo 18 cm => 13 de 18,3 cm', () => {
    const r = calcularEscalones(ESCALERA_INICIAL);
    expect(r.contrahuellas).toBe(13);
    expect(r.contrahuella).toBeCloseTo(2.38 / 13);
    expect(r.pisadas).toBe(12);
    expect(r.blondel).toBeCloseTo(2 * (2.38 / 13) + 0.27); // 63,6 cm: cómodo
  });
});

describe('escalera recta paralela al borde (ejemplo del loft)', () => {
  const e = generarEstructura(P, ABERTURAS_INICIALES);
  const esc = e.escalera;

  it('12 pisadas, cada una a su altura', () => {
    expect(esc.escalones).toHaveLength(12);
    esc.escalones.forEach((s, i) => expect(s.centro[1]).toBeCloseTo(0.5 + (i + 1) * (2.38 / 13)));
  });

  it('va pegada al borde del entrepiso y arranca en la posición elegida', () => {
    // Entrepiso en D (x de -3,75 a -0,75): eje de la escalera a medio ancho del borde.
    esc.escalones.forEach((s) => expect(s.centro[0]).toBeCloseTo(-0.75 + 0.4));
    const zanca = esc.piezas.find((p) => p.id === 'esc-zanca:1');
    expect(zanca.hasta[2]).toBeCloseTo(-2.25 + 0.6); // arriba, sobre el borde
    expect(zanca.desde[2]).toBeCloseTo(-2.25 + 0.6 + 12 * 0.27); // abajo, hacia A
    expect(zanca.desde[1]).toBeCloseTo(0.5); // apoya en el piso
  });

  it('apoyos: 2 ángulos por escalón; 1 columna intermedia bajo la zanca', () => {
    expect(esc.piezas.filter((p) => p.tipo === 'apoyo-escalon')).toHaveLength(24);
    esc.piezas.filter((p) => p.tipo === 'apoyo-escalon').forEach((p) => expect(p.largo).toBeCloseTo(0.76));
    expect(esc.piezas.filter((p) => p.tipo === 'columna-escalera')).toHaveLength(1);
  });

  it('recorte de caño central: 1 apoyo por escalón', () => {
    const cano = generarEstructura(conEscalera({ tipoApoyo: 'cano', apoyosPorEscalon: 1, largoApoyo: 0.3 }), []);
    expect(cano.escalera.piezas.filter((p) => p.tipo === 'apoyo-escalon')).toHaveLength(12);
  });

  it('sin avisos: es cómoda y entra en la planta', () => {
    expect(esc.resumen.avisos).toEqual([]);
    expect(esc.resumen.perpendicular).toBe(false);
  });

  it('las piezas tienen grupo "escalera" y se pueden eliminar', () => {
    listarPiezas(e).filter((p) => p.id.startsWith('esc-')).forEach((p) => expect(p.grupos).toEqual(['escalera']));
    const sinZanca = generarEstructura({ ...P, piezasEliminadas: ['esc-zanca:1'] }, []);
    expect(sinZanca.escalera.piezas.find((p) => p.id === 'esc-zanca:1')).toBeUndefined();
  });
});

describe('escalera en L', () => {
  const e = generarEstructura(enL, []);
  const esc = e.escalera;

  it('pisadas: 6 arriba (7..12) + 5 abajo (1..5) = 11; el descanso hace de pisada 6', () => {
    expect(esc.escalones).toHaveLength(11);
    expect(esc.descansos).toHaveLength(1);
    expect(esc.descansos[0].centro[1]).toBeCloseTo(0.5 + 6 * (2.38 / 13));
    expect(esc.descansos[0].superficie).toBeCloseTo(0.64);
  });

  it('dos zancas, marco del descanso y una columna central', () => {
    expect(esc.piezas.filter((p) => p.tipo === 'zanca')).toHaveLength(2);
    expect(esc.piezas.filter((p) => p.tipo === 'marco-descanso')).toHaveLength(4);
    expect(esc.piezas.filter((p) => p.id.startsWith('esc-col-descanso'))).toHaveLength(1);
  });

  it('el segundo tramo baja hacia la pared elegida (B = x positivo)', () => {
    const zancaAbajo = esc.piezas.find((p) => p.id === 'esc-zanca:1');
    expect(zancaAbajo.desde[0]).toBeGreaterThan(zancaAbajo.hasta[0]);
  });

  it('4 columnas en el descanso si se piden', () => {
    const r = generarEstructura({ ...enL, escalera: { ...enL.escalera, columnasDescanso: 4 } }, []);
    expect(r.escalera.piezas.filter((p) => p.id.startsWith('esc-col-descanso'))).toHaveLength(4);
  });
});

describe('escalera en U y de 3/4 de vuelta (varios descansos)', () => {
  it('reparte los descansos parejo, con tramos de 2 o más contrahuellas', () => {
    expect(repartirDescansos(1, 13)).toEqual([7]);
    expect(repartirDescansos(2, 13)).toEqual([4, 9]);
    expect(repartirDescansos(3, 13)).toEqual([3, 7, 10]);
    expect(repartirDescansos(3, 8)).toEqual([2, 4, 6]); // justo: 4 tramos de 2
  });

  it('en U: 2 descansos, 3 zancas, cada giro de 90° en el mismo sentido', () => {
    const u = generarEstructura(conEscalera({ forma: 'U', descansos: [4, 9], bajaHacia: 'B', posicion: 2, giroHacia: 'A' }), []).escalera;
    expect(u.descansos).toHaveLength(2);
    expect(u.escalones).toHaveLength(12 - 2); // dos pisadas son descansos
    expect(u.piezas.filter((p) => p.tipo === 'zanca')).toHaveLength(3);
    // El tramo de arriba baja hacia B (x+) y el de abajo vuelve hacia D (x-): media vuelta.
    const arriba = u.piezas.find((p) => p.id === 'esc-zanca:3');
    const abajo = u.piezas.find((p) => p.id === 'esc-zanca:1');
    expect(arriba.desde[0]).toBeGreaterThan(arriba.hasta[0]);
    expect(abajo.desde[0]).toBeLessThan(abajo.hasta[0]);
    expect(u.resumen.avisos).toEqual([]);
  });

  it('3/4 de vuelta: 3 descansos a su altura, 4 tramos, entra sin avisos', () => {
    const e = generarEstructura(tresCuartos, []).escalera;
    expect(validarParametros(tresCuartos)).toEqual({});
    expect(e.descansos.map((d) => d.numero)).toEqual([1, 2, 3]);
    e.descansos.forEach((d, i) => expect(d.centro[1]).toBeCloseTo(0.5 + [3, 5, 8][i] * (2.38 / 13)));
    expect(e.piezas.filter((p) => p.tipo === 'zanca')).toHaveLength(4);
    expect(e.piezas.filter((p) => p.tipo === 'marco-descanso')).toHaveLength(12);
    expect(e.escalones).toHaveLength(12 - 3);
    expect(e.resumen.avisos).toEqual([]);
  });

  it('las 4 direcciones de los tramos dan la vuelta (B, A, D, C)', () => {
    const e = generarEstructura(tresCuartos, []).escalera;
    const direccion = (n) => {
      const z = e.piezas.find((p) => p.id === `esc-zanca:${n}`); // de pie (abajo) a tope (arriba): baja al revés
      return [Math.sign(Math.round((z.desde[0] - z.hasta[0]) * 100)), Math.sign(Math.round((z.desde[2] - z.hasta[2]) * 100))];
    };
    expect([4, 3, 2, 1].map(direccion)).toEqual([[1, 0], [0, 1], [-1, 0], [0, -1]]);
  });

  it('avisa el paso libre si un tramo pasa por debajo de otro', () => {
    const bajo = generarEstructura(conEscalera({ forma: '3/4', descansos: [3, 5, 7], bajaHacia: 'B', posicion: 2, giroHacia: 'A' }), []);
    expect(bajo.escalera.resumen.avisos.join(' ')).toMatch(/Paso libre de 1\.46 m/);
  });

  it('avisa el paso libre bajo el entrepiso', () => {
    const r = generarEstructura(conEscalera({ forma: '3/4', descansos: [2, 5, 8], bajaHacia: 'B', posicion: 2, giroHacia: 'A' }), []);
    expect(r.escalera.resumen.avisos.join(' ')).toMatch(/Paso libre bajo el entrepiso de 1\.93 m/);
  });

  it('errores: descansos fuera de orden, faltantes o sin lugar para los tramos', () => {
    const conDescansos = (forma, descansos) => validarParametros(conEscalera({ forma, descansos, bajaHacia: 'B', posicion: 2, giroHacia: 'A' }));
    expect(conDescansos('U', [9, 4])).toHaveProperty(['escalera.descansos.1']);
    // El mensaje sale en el descanso que quedó fuera de lugar, con el rango que le dejan sus vecinos.
    expect(conDescansos('3/4', [3, 9, 8])['escalera.descansos.1']).toBe('El descanso 2 va entre la contrahuella 5 y la 6');
    expect(conDescansos('3/4', [3, 7])).toHaveProperty('escalera.descansos');
    expect(conDescansos('3/4', [3, 5, 12])).toHaveProperty(['escalera.descansos.2']);
    const corta = conEscalera({ forma: '3/4', descansos: [2, 4, 6], alturaTotal: 1, bajaHacia: 'B', posicion: 2, giroHacia: 'A' });
    expect(validarParametros(corta)).toHaveProperty('escalera.forma'); // 6 contrahuellas no dan para 4 tramos
  });

  it('presupuesto: suma el piso de los 3 descansos', () => {
    const items = calcularPresupuesto(generarEstructura(tresCuartos, []), CATALOGO_INICIAL).items;
    expect(items.find((i) => i.id === INSUMO.PISO_DESCANSO).cantidad).toBeCloseTo(3 * 0.64);
  });
});

describe('avisos y validación', () => {
  it('avisa si la escalera se sale de la planta', () => {
    const larga = generarEstructura(conEscalera({ posicion: 3 }), []);
    expect(larga.escalera.resumen.avisos.join(' ')).toMatch(/se sale de la planta/);
  });

  it('avisa si no es cómoda', () => {
    const empinada = generarEstructura(conEscalera({ huella: 0.22, contrahuellaObjetivo: 0.21 }), []);
    expect(empinada.escalera.resumen.avisos.join(' ')).toMatch(/Regla de comodidad|Huella corta|Contrahuella alta/);
  });

  it('perpendicular al borde: baja hacia la pared de enfrente', () => {
    const r = generarEstructura(conEscalera({ bajaHacia: 'B', posicion: 2 }), []);
    expect(r.escalera.resumen.perpendicular).toBe(true);
    expect(r.escalera.resumen.avisos).toEqual([]);
  });

  it('errores: sin entrepiso, hacia la pared del entrepiso, posición fuera del borde', () => {
    expect(validarParametros({ ...P, anchoEntrepiso: 0 })).toHaveProperty('escalera.activa');
    expect(validarParametros(conEscalera({ bajaHacia: 'D' }))).toHaveProperty('escalera.bajaHacia');
    expect(validarParametros(conEscalera({ posicion: 9 }))).toHaveProperty('escalera.posicion');
  });

  it('errores en L: descanso fuera de rango y giro que no es de 90°', () => {
    expect(validarParametros({ ...enL, escalera: { ...enL.escalera, descansos: [12] } })).toHaveProperty(['escalera.descansos.0']);
    expect(validarParametros({ ...enL, escalera: { ...enL.escalera, giroHacia: 'C' } })).toHaveProperty('escalera.giroHacia');
  });

  it('desactivada no valida reglas de ubicación ni se dibuja', () => {
    const off = conEscalera({ activa: false, bajaHacia: 'D' });
    expect(validarParametros(off)).toEqual({});
    expect(generarEstructura(off, []).escalera).toBeNull();
  });
});

describe('presupuesto de la escalera', () => {
  const e = generarEstructura(enL, []);
  const items = calcularPresupuesto(e, CATALOGO_INICIAL, { excedenteBarras: 1 }).items;
  const item = (id) => items.find((i) => i.id === id);

  it('escalones por unidad y piso del descanso en m²', () => {
    expect(item(INSUMO.ESCALON).cantidad).toBe(11);
    expect(item(INSUMO.PISO_DESCANSO).cantidad).toBeCloseTo(0.64);
  });

  it('zanca + marco del descanso, apoyos y columnas pasan por el optimizador', () => {
    expect(item(INSUMO.ZANCA).cortes.barras.flatMap((b) => b.piezas)).toHaveLength(2 + 4);
    expect(item(INSUMO.APOYO_ESCALON).cortes.barras.flatMap((b) => b.piezas)).toHaveLength(22);
    expect(item(INSUMO.COLUMNA_ESCALERA).cantidad).toBeGreaterThan(0);
  });

  it('sin escalera: los renglones quedan en 0', () => {
    const sin = calcularPresupuesto(generarEstructura(conEscalera({ activa: false }), []), CATALOGO_INICIAL).items;
    [INSUMO.ZANCA, INSUMO.APOYO_ESCALON, INSUMO.COLUMNA_ESCALERA, INSUMO.ESCALON, INSUMO.PISO_DESCANSO]
      .forEach((id) => expect(sin.find((i) => i.id === id).cantidad).toBe(0));
  });
});

describe('migración', () => {
  it('una L guardada con la v1.7 (escalonesHastaDescanso) pasa a la lista de descansos', () => {
    const { descansos, ...escaleraV17 } = enL.escalera; // eslint-disable-line no-unused-vars
    const m = migrarParams({ ...P, escalera: { ...escaleraV17, escalonesHastaDescanso: 5 } });
    expect(m.escalera.descansos).toEqual([5]);
    expect(m.escalera).not.toHaveProperty('escalonesHastaDescanso');
    expect(validarParametros(m)).toEqual({});
  });

  it('un proyecto de antes de la v1.7 se abre sin escalera', () => {
    const { escalera, ...viejo } = P; // eslint-disable-line no-unused-vars
    const m = migrarParams(viejo);
    expect(m.escalera.activa).toBe(false);
    expect(validarParametros(m)).toEqual({});
  });
});
