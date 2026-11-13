// Tests de la obra civil (v1.56): hormigón por dosificación, tapial, pilar de luz, cámara y pozo. Correr con: npm test
import { describe, it, expect } from 'vitest';
import { cuentasDeObraCivil, largoDelTapial, validarObraCivil, completarObraCivil, OBRA_CIVIL_INICIAL } from './obraCivil.js';
import { PARAMS_INICIALES } from './parametrosIniciales.js';
import { migrarParams } from './migracion.js';
import { validarParametros } from './validacion.js';
import { generarEstructura } from './estructura.js';
import { calcularPresupuesto, CATALOGO_INICIAL } from './presupuesto.js';
import { INSUMO } from './constantes.js';

const conObraCivil = (cambios, terreno = null) => ({
  ...PARAMS_INICIALES,
  obraCivil: completarObraCivil({ ...OBRA_CIVIL_INICIAL, ...cambios }),
  ...(terreno ? { terreno: { ...PARAMS_INICIALES.terreno, activo: true, ...terreno } } : {}),
});

describe('tapial de ladrillo hueco con columnas, viga de fundación y encadenado', () => {
  it('10 m x 2 m con columnas cada 3 m: 5 columnas, 17 m² de muro', () => {
    const { partes, materiales } = cuentasDeObraCivil(conObraCivil({ tapial: { lados: [], largoManual: 10, alto: 2, columnasCada: 3 } }));
    const t = partes[0];
    expect(t.detalle).toMatch(/5 columnas/);
    // muro = 10 x 2 - 5 columnas x 0,15 x 2 - el encadenado (10 x 0,15) = 17 m²
    expect(t.ladrilloHueco).toBeCloseTo(17 * 15.5, 6);
    expect(t.mortero).toBeCloseTo(17 * 0.015, 6);
    // hormigón = columnas (5 x 0,15² x 2,30) + viga (10 x 0,25 x 0,30) + encadenado (10 x 0,15 x 0,15)
    expect(t.hormigon).toBeCloseTo(5 * 0.0225 * 2.3 + 0.75 + 0.225, 6);
    // cemento = 1,234 m³ x 350 + 0,255 m³ x 250 = 495,6 kg = 10 bolsas de 50
    expect(materiales).toMatchObject({ bolsas: 10, arena: 1.1, piedra: 1, ladrilloHueco: 264 });
    expect(materiales.cemento).toBeCloseTo(495.56, 1);
  });

  it('con terreno, el largo sale de los lados elegidos del lote', () => {
    const p = conObraCivil({ tapial: { lados: ['izquierda', 'derecha', 'fondo'], largoManual: 0, alto: 2, columnasCada: 3 } }, { frente: 10, fondo: 30 });
    expect(largoDelTapial(p.obraCivil, p.terreno)).toBe(70);
    expect(cuentasDeObraCivil(p).partes[0].detalle).toMatch(/^70,00 m/);
  });

  it('la dosificación es editable: más cemento por m³, más bolsas', () => {
    const base = { tapial: { lados: [], largoManual: 10, alto: 2, columnasCada: 3 } };
    const comun = cuentasDeObraCivil(conObraCivil(base)).materiales.cemento;
    const rico = cuentasDeObraCivil(conObraCivil({ ...base, hormigon: { cemento: 450, arena: 0.6, piedra: 0.75 } })).materiales.cemento;
    expect(rico - comun).toBeCloseTo(100 * (5 * 0.0225 * 2.3 + 0.975), 6);
  });
});

describe('pilar de luz, cámara séptica y pozo absorbente (elementos del terreno)', () => {
  const terreno = { elementos: [
    { id: 1, tipo: 'pilarLuz', ancho: 0.45, largo: 0.3 },
    { id: 2, tipo: 'camara', ancho: 1, largo: 1.5 },
    { id: 3, tipo: 'pozo', diametro: 1.2 },
  ] };

  it('cada uno con su ladrillo común, hormigón y excavación', () => {
    const { partes } = cuentasDeObraCivil(conObraCivil({}, terreno));
    expect(partes.map((x) => x.nombre)).toEqual(['Pilar de luz', 'Cámara séptica', 'Pozo absorbente']);
    const [pilar, camara, pozo] = partes;
    // pilar: (0,45 x 0,30 - 0,15²) x 2,20 m de muro; columna 0,15² x 2,20 + base 0,5 x 0,5 x 0,2
    expect(pilar.ladrilloComun).toBeCloseTo((0.135 - 0.0225) * 2.2 * 400, 6);
    expect(pilar.hormigon).toBeCloseTo(0.0225 * 2.2 + 0.05, 6);
    // cámara 1 x 1,5 x 1,2 (1800 litros): paredes de 15 → (1,3 x 1,8 - 1,5) x 1,2 m³ de muro
    expect(camara.detalle).toMatch(/1800 litros/);
    expect(camara.ladrilloComun).toBeCloseTo((1.3 * 1.8 - 1.5) * 1.2 * 400, 6);
    expect(camara.hormigon).toBeCloseTo(2 * 1.3 * 1.8 * 0.1, 6);
    // pozo ø1,20 x 4 m: calzado en panal = π (0,75² - 0,6²) x 4 x 0,6
    expect(pozo.ladrilloComun).toBeCloseTo(Math.PI * (0.75 ** 2 - 0.36) * 4 * 0.6 * 400, 6);
    expect(pozo.excavacion).toBeCloseTo(Math.PI * 0.75 ** 2 * 4, 6);
  });

  it('sin terreno no hay elementos: no suma nada (no cambia el presupuesto de antes)', () => {
    expect(cuentasDeObraCivil(PARAMS_INICIALES).partes).toEqual([]);
  });
});

describe('pilotines hormigonados en obra y presupuesto', () => {
  it('con "hormigonados en obra", el pilotín y el hormigón de zapata pasan a cemento, arena, piedra y hierro', () => {
    const params = { ...conObraCivil({ hormigonEnObra: true, pilotin: { profundidad: 1 } }), zapata: { activa: true, lado: 0.6, alto: 0.3, profundidad: 0.8 } };
    const e = generarEstructura(params, []);
    const n = e.pilotines.length;
    const [pil, zap] = e.obraCivil.partes;
    const largo = 1 + params.elevacion;
    expect(pil.hormigon).toBeCloseTo(n * Math.PI * 0.15 ** 2 * largo, 6);
    expect(pil.hierro8).toBeCloseTo(n * 4 * largo, 6);
    expect(zap.hormigon).toBeCloseTo(n * 0.6 * 0.6 * 0.3, 6);
    const { items } = calcularPresupuesto(e, CATALOGO_INICIAL);
    const ids = items.map((i) => i.id);
    expect(ids).not.toContain(INSUMO.PILOTIN);
    expect(ids).not.toContain(INSUMO.HORMIGON_ZAPATA);
    expect(ids).toContain(INSUMO.EXCAVACION); // la de las zapatas sigue
    const cemento = items.find((i) => i.id === INSUMO.CEMENTO);
    expect(cemento.cantidad).toBe(e.obraCivil.materiales.bolsas);
    expect(cemento.detalle).toMatch(/pilotines, zapatas/);
    expect(items.find((i) => i.id === INSUMO.HIERRO_8).cantidad).toBe(e.obraCivil.materiales.varillas8);
  });

  it('el pilar de luz suma sus accesorios (caja, caño, jabalina)', () => {
    const params = conObraCivil({}, { elementos: [{ id: 1, tipo: 'pilarLuz', ancho: 0.45, largo: 0.3 }] });
    const { items } = calcularPresupuesto(generarEstructura(params, []), CATALOGO_INICIAL);
    expect(items.find((i) => i.id === INSUMO.KIT_PILAR)).toMatchObject({ cantidad: 1 });
    expect(items.find((i) => i.id === INSUMO.LADRILLO_COMUN).cantidad).toBeGreaterThan(0);
  });

  it('se valida y los proyectos de antes arrancan con la de fábrica', () => {
    expect(validarObraCivil(OBRA_CIVIL_INICIAL)).toEqual({});
    expect(validarObraCivil({ ...OBRA_CIVIL_INICIAL, hormigon: { cemento: -1, arena: 0.6, piedra: 0.7 } })).toHaveProperty(['obraCivil.hormigon.cemento']);
    expect(validarObraCivil({ ...OBRA_CIVIL_INICIAL, tapial: { ...OBRA_CIVIL_INICIAL.tapial, lados: ['techo'] } })).toHaveProperty(['obraCivil.tapial.lados']);
    const { obraCivil, ...viejo } = PARAMS_INICIALES;
    expect(obraCivil).toEqual(OBRA_CIVIL_INICIAL);
    const migrado = migrarParams(viejo);
    expect(migrado.obraCivil).toEqual(OBRA_CIVIL_INICIAL);
    expect(validarParametros({ ...migrado, obraCivil: { ...OBRA_CIVIL_INICIAL, pozo: { profundidad: 50 } } })).toHaveProperty(['obraCivil.pozo.profundidad']);
  });
});
