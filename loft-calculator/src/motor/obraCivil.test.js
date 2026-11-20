// Tests de la obra civil (v1.56): hormigón por dosificación, tapial, pilar de luz, cámara y pozo. Correr con: npm test
import { describe, it, expect } from 'vitest';
import { cuentasDeObraCivil, largoDelTapial, validarObraCivil, completarObraCivil, OBRA_CIVIL_INICIAL, tramosDelTapial, huecoDelPorton, RENDIMIENTOS, DOSIFICACIONES_HORMIGON, DOSIFICACIONES_MORTERO, dosificacionElegida } from './obraCivil.js';
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
    const { partes, materiales } = cuentasDeObraCivil(conObraCivil({ tapial: { lados: [], largoManual: 10, alto: 2, columnasCada: 3, pilotines: false, encofrado: 'ninguno' } }));
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
    const base = { tapial: { lados: [], largoManual: 10, alto: 2, columnasCada: 3, pilotines: false } };
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

describe('v1.80: tapial encadenado con pilotines, ladrillo a elegir, encofrado fenólico, albañil y portón', () => {
  const base = { lados: [], largoManual: 10, alto: 2, columnasCada: 3 };
  const tapialCon = (cambios = {}, otros = {}) => cuentasDeObraCivil(conObraCivil({ tapial: { ...base, ...cambios }, ...otros }));

  it('de fábrica: un pilotín bajo cada columna (ø 0,20 x 1,50 m) y encofrado fenólico para 2 tramos', () => {
    const sin = tapialCon({ pilotines: false, encofrado: 'ninguno' }).partes[0];
    const con = tapialCon().partes[0];
    const pilotin = (Math.PI * 0.2 * 0.2) / 4 * 1.5;
    expect(con.hormigon - sin.hormigon).toBeCloseTo(5 * pilotin, 6);
    expect(con.excavacion - sin.excavacion).toBeCloseTo(5 * pilotin, 6);
    expect(con.hierro8 - sin.hierro8).toBeCloseTo(5 * 4 * 1.5, 6); // 4 ø8 por pilotín
    expect(con.detalle).toMatch(/pilotines de ø0,20 m x 1,50 m/);
    // Un juego = 3 m x 2 caras x (0,30 + 0,15) + 2 x 0,25 x 2,30 = 3,85 m²; dos juegos = 7,7 m² (+15 % / 2,98 m²).
    expect(con.fenolicos).toBeCloseTo((7.7 * 1.15) / RENDIMIENTOS.placaFenolica, 6);
    expect(con.tirantesEncofrado).toBeCloseTo(7.7 * 3, 6);
    expect(tapialCon().materiales).toMatchObject({ fenolicos: 3, tirantesEncofrado: 24 });
    expect(sin.fenolicos).toBe(0);
  });

  it('el ladrillo cambia cuántos van y el mortero (y va a su renglón)', () => {
    const hueco8 = tapialCon({ ladrillo: 'hueco8', pilotines: false }).partes[0];
    expect(hueco8.ladrilloHueco8).toBeCloseTo(17 * 15.5, 6);
    expect(hueco8.ladrilloHueco).toBe(0);
    expect(hueco8.mortero).toBeCloseTo(17 * 0.01, 6);
    const comun = tapialCon({ ladrillo: 'comun', pilotines: false }).partes[0];
    expect(comun.ladrilloComun).toBeCloseTo(17 * 60, 6);
    expect(tapialCon({ ladrillo: 'bloque' }).materiales.bloqueHormigon).toBe(Math.ceil(17 * 12.5));
    // En el presupuesto, el renglón de ese ladrillo.
    const e = generarEstructura(conObraCivil({ tapial: { ...base, ladrillo: 'hueco18' } }), []);
    const items = calcularPresupuesto(e, CATALOGO_INICIAL, { proveedor: 'prov-1' }).items;
    expect(items.find((i) => i.id === INSUMO.LADRILLO_HUECO_18)?.cantidad).toBe(Math.ceil(17 * 15.5));
    expect(items.find((i) => i.id === INSUMO.LADRILLO_HUECO)).toBeUndefined();
    expect(items.find((i) => i.id === INSUMO.FENOLICO)?.cantidad).toBe(3);
  });

  it('"según el albañil" reemplaza lo calculado de ese material (lo demás, igual)', () => {
    const calc = tapialCon();
    const albanil = tapialCon({ segunAlbanil: { bolsas: 30, ladrillos: 300 } });
    expect(albanil.tapial.conAlbanil).toBe(true);
    expect(albanil.materiales.bolsas).toBe(30);
    expect(albanil.materiales.cemento).toBe(1500);
    expect(albanil.materiales.ladrilloHueco).toBe(300);
    expect(albanil.materiales.arena).toBe(calc.materiales.arena);
    expect(albanil.tapial.calculado.ladrillos).toBe(calc.materiales.ladrilloHueco); // lo calculado queda a la vista
    // Con más partes (un pozo), solo cambia lo del tapial.
    const pozo = { activo: true, frente: 10, fondo: 30, elementos: [{ id: 1, tipo: 'pozo', diametro: 1.2 }] };
    const conPozo = (t) => cuentasDeObraCivil({ ...conObraCivil({ tapial: { ...base, ...t } }), terreno: { ...PARAMS_INICIALES.terreno, ...pozo } });
    expect(conPozo({ segunAlbanil: { ladrillos: 300 } }).materiales.ladrilloComun).toBe(conPozo({}).materiales.ladrilloComun);
    // Valores raros no se guardan.
    expect(completarObraCivil({ tapial: { segunAlbanil: { bolsas: -2, nada: 4, arena: 3 } } }).tapial.segunAlbanil).toEqual({ arena: 3 });
  });

  it('el portón corredizo deja un hueco (sin muro ni encadenado) y lleva su bastidor, relleno, riel y herrajes', () => {
    const porton = { activo: true, lado: 'frente', desde: 1, ancho: 3, alto: 2, relleno: 'chapa' };
    const sin = tapialCon({ pilotines: false, encofrado: 'ninguno' }).partes[0];
    const con = tapialCon({ pilotines: false, encofrado: 'ninguno' }, { porton });
    const t = con.partes[0];
    // 7 m de muro: ceil(7/3)+1 = 4 columnas, + 1 por el segundo tramo = 5. Muro = 7 x 2 - 5 x 0,15 x 2 - 7 x 0,15.
    expect(t.detalle).toMatch(/5 columnas.*hueco de 3,00 m/);
    expect(t.ladrilloHueco).toBeCloseTo((14 - 1.5 - 1.05) * 15.5, 6);
    expect(t.ladrilloHueco).toBeLessThan(sin.ladrilloHueco);
    // La viga de fundación sigue de largo (10 m: el riel va encima); el encadenado, solo 7 m.
    expect(t.excavacion).toBeCloseTo(sin.excavacion, 6);
    const p = con.porton;
    expect(p.anchoHoja).toBeCloseTo(3.2, 6);
    expect(p.piezas.map((x) => x.largo)).toEqual([2, 2, 3.2, 3.2, 3.2, 2, 2, 2]); // marco, travesaño y 3 montantes
    expect(p).toMatchObject({ relleno: 'chapa', rellenoM2: 6.4, riel: 6.4 });
    // En el presupuesto: bastidor en barras con cortes, chapa, riel y el kit.
    const e = generarEstructura(conObraCivil({ tapial: base, porton: { ...porton, relleno: 'malla' } }), []);
    const items = calcularPresupuesto(e, CATALOGO_INICIAL, { proveedor: 'prov-1' }).items;
    expect(items.find((i) => i.id === INSUMO.PORTON_BASTIDOR)).toMatchObject({ cantidad: 4 }); // 20,6 m en barras de 6 m
    expect(items.find((i) => i.id === INSUMO.PORTON_MALLA)?.cantidad).toBe(6.4);
    expect(items.find((i) => i.id === INSUMO.PORTON_CHAPA)).toBeUndefined();
    expect(items.find((i) => i.id === INSUMO.PORTON_RIEL)?.cantidad).toBe(6.4);
    expect(items.find((i) => i.id === INSUMO.PORTON_KIT)?.cantidad).toBe(1);
  });

  it('con terreno el portón va en su lado: parte ese lado en dos tramos (para el 3D y el plano)', () => {
    const p = conObraCivil({ tapial: { ...base, lados: ['frente', 'izquierda'] }, porton: { activo: true, lado: 'frente', desde: 7, ancho: 3, alto: 2, relleno: 'chapa' } }, { frente: 12, fondo: 27 });
    expect(tramosDelTapial(p.obraCivil, p.terreno)).toEqual([
      { lado: 'frente', desde: 0, hasta: 7 }, { lado: 'frente', desde: 10, hasta: 12 }, { lado: 'izquierda', desde: 0, hasta: 27 }]);
    // Si se pasa del lado, se corre para que entre; en un lado sin tapial, no hay portón.
    expect(huecoDelPorton(completarObraCivil({ ...p.obraCivil, porton: { ...p.obraCivil.porton, desde: 11 } }), p.terreno)).toMatchObject({ desde: 9, hasta: 12 });
    expect(huecoDelPorton(completarObraCivil({ ...p.obraCivil, porton: { ...p.obraCivil.porton, lado: 'fondo' } }), p.terreno)).toBeNull();
  });

  it('se valida y los proyectos de antes quedan con lo de fábrica', () => {
    const oc = completarObraCivil({ tapial: { lados: [], largoManual: 10, alto: 2, columnasCada: 3, ladrillo: 'marmol', encofrado: 'oro' } });
    expect(oc.tapial).toMatchObject({ ladrillo: 'hueco12', encofrado: 'fenolico', pilotines: true, segunAlbanil: {} });
    expect(oc.porton).toMatchObject({ activo: false, lado: 'frente', ancho: 3, relleno: 'chapa' });
    expect(validarObraCivil(oc)).toEqual({});
    expect(validarObraCivil({ ...oc, porton: { ...oc.porton, ancho: 40 } })).toHaveProperty(['obraCivil.porton.ancho']);
    expect(validarObraCivil({ ...oc, tapial: { ...oc.tapial, ladrillo: 'marmol' } })).toHaveProperty(['obraCivil.tapial.ladrillo']);
  });
});

describe('v1.80: la dosificación como la dice el albañil', () => {
  it('la de fábrica es 1:2:3 y 1:4; números propios = "otra"', () => {
    expect(dosificacionElegida(DOSIFICACIONES_HORMIGON, OBRA_CIVIL_INICIAL.hormigon)).toBe('1:2:3');
    expect(dosificacionElegida(DOSIFICACIONES_MORTERO, OBRA_CIVIL_INICIAL.mortero)).toBe('1:4');
    expect(dosificacionElegida(DOSIFICACIONES_HORMIGON, { cemento: 333, arena: 0.6, piedra: 0.75 })).toBe('mano');
    // Una más fuerte lleva más cemento por m³.
    const [, , fuerte] = DOSIFICACIONES_HORMIGON.find(([c]) => c === '1:2:2');
    expect(fuerte.cemento).toBeGreaterThan(OBRA_CIVIL_INICIAL.hormigon.cemento);
    expect(validarObraCivil({ ...OBRA_CIVIL_INICIAL, hormigon: fuerte })).toEqual({});
  });
});
