// Tests de la escalera. Correr con: npm test
import { describe, it, expect } from 'vitest';
import { calcularEscalones, alturaEscalera, ESCALERA_INICIAL } from './escalera.js';
import { generarEstructura, listarPiezas } from './estructura.js';
import { validarParametros } from './validacion.js';
import { calcularPresupuesto, CATALOGO_INICIAL } from './presupuesto.js';
import { migrarParams } from './migracion.js';
import { INSUMO } from './constantes.js';
import { PARAMS_INICIALES as P, ABERTURAS_INICIALES } from './parametrosIniciales.js';

const conEscalera = (cambios) => ({ ...P, escalera: { ...P.escalera, ...cambios } });
const enL = conEscalera({ forma: 'L', escalonesHastaDescanso: 6, giroHacia: 'B' });

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
    expect(esc.descanso.centro[1]).toBeCloseTo(0.5 + 6 * (2.38 / 13));
    expect(esc.descanso.superficie).toBeCloseTo(0.64);
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
    expect(validarParametros({ ...enL, escalera: { ...enL.escalera, escalonesHastaDescanso: 12 } })).toHaveProperty('escalera.escalonesHastaDescanso');
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
  it('un proyecto de antes de la v1.7 se abre sin escalera', () => {
    const { escalera, ...viejo } = P; // eslint-disable-line no-unused-vars
    const m = migrarParams(viejo);
    expect(m.escalera.activa).toBe(false);
    expect(validarParametros(m)).toEqual({});
  });
});
