// Tests de los equipos (v1.58): frigorías, salamandra y su caño, paneles solares. Correr con: npm test
import { describe, it, expect } from 'vitest';
import { aireNuevo, salamandraNueva, alcanceDelAire, alcanceDeLaSalamandra, canoDeSalida, dimensionarSolar, materialesDeEquipos,
  validarEquipos, completarEquipos, EQUIPOS_INICIALES } from './equipos.js';
import { PARAMS_INICIALES } from './parametrosIniciales.js';
import { migrarParams } from './migracion.js';
import { validarParametros } from './validacion.js';

const params = { ...PARAMS_INICIALES, largo: 7.5, ancho: 4.5, altura: 2.6, elevacion: 0.5 };
const estructura = { superficies: { piso: 33.75, piso2: 0, techo: 36 } };

describe('aires: ¿alcanzan las frigorías?', () => {
  it('un ambiente de 20 m² x 2,60 m pide ≈ 2600 frigorías: uno de 2250 no alcanza, uno de 3000 sí', () => {
    const chico = { ...aireNuevo([]), frigorias: 2250, ambienteM2: 20 };
    const r = alcanceDelAire(chico, params, estructura);
    expect(r).toMatchObject({ m3: 52, necesarias: 2600, alcanza: false, sugerido: 3000 });
    expect(r.texto).toMatch(/No alcanza/);
    expect(alcanceDelAire({ ...chico, frigorias: 3000 }, params, estructura).alcanza).toBe(true);
    // Sin m² del ambiente, toda la planta; con sol de la tarde (factor 1,3) pide más.
    expect(alcanceDelAire({ ...chico, ambienteM2: 0 }, params, estructura).m2).toBe(33.75);
    expect(alcanceDelAire({ ...chico, factor: 1.3 }, params, estructura).necesarias).toBe(3380);
  });
});

describe('salamandra y su caño', () => {
  it('por el techo: del equipo al techo y 1 m arriba; por la pared: hasta la pared más cercana, 2 codos', () => {
    const s = { ...salamandraNueva([]), desdeLateral: 1, desdeFrente: 2, sobreTecho: 1 };
    expect(canoDeSalida(s, params, estructura)).toEqual({ metros: 2.6 - 0.8 + 1, codos: 0, pared: null });
    const pared = canoDeSalida({ ...s, salida: 'pared' }, params, estructura);
    expect(pared.pared).toBeCloseTo(1.15, 9); // 1 m al lateral + atravesar la pared
    expect(pared).toMatchObject({ codos: 2 });
    expect(pared.metros).toBeCloseTo(1.15 + 2.8 + 0.3, 9);
    expect(alcanceDeLaSalamandra(s, params, estructura)).toMatchObject({ necesarias: Math.round(33.75 * 2.6 * 45), alcanza: true });
  });
});

describe('solar', () => {
  it('300 kWh por mes con 4,5 horas de sol: 7 paneles de 450 W; el peso sobre el techo', () => {
    const d = dimensionarSolar({ ...EQUIPOS_INICIALES.solar, activo: true, consumoMensual: 300 }, estructura);
    // 10.000 Wh por día / (450 W x 4,5 h x 0,8 = 1620 Wh por panel) = 6,2 → 7
    expect(d).toMatchObject({ sugeridos: 7, paneles: 7, kgPaneles: 7 * 31 });
    expect(d.superficie).toBeCloseTo(7 * 2.28 * 1.13, 9);
    expect(d.avisos).toEqual([]);
    const conTermo = dimensionarSolar({ ...EQUIPOS_INICIALES.solar, consumoMensual: 300, termotanque: 200 }, estructura);
    expect(conTermo.kgTermo).toBe(260);
    expect(conTermo.avisos.some((a) => a.includes('260 kg'))).toBe(true);
    const muchos = dimensionarSolar({ ...EQUIPOS_INICIALES.solar, paneles: 14 }, estructura);
    expect(muchos.avisos[0]).toMatch(/no entran/);
  });
});

describe('materiales y validación', () => {
  it('cada equipo con su kit; los precios a mano', () => {
    const equipos = { ...EQUIPOS_INICIALES, aires: [aireNuevo([])], salamandras: [salamandraNueva([])], precios: { 'Salamandra 10.000 kcal/h': 400000 } };
    const r = materialesDeEquipos({ ...params, equipos }, estructura);
    const de = (n) => r.materiales.find((m) => m.nombre.startsWith(n));
    expect(de('Aire split frío/calor 3.000').cantidad).toBe(1);
    expect(de('Caño de cobre').cantidad).toBe(4);
    expect(de('Caño de chapa 6"').cantidad).toBe(Math.ceil(2.6 - 0.8 + 1));
    expect(r.total).toBe(400000);
  });

  it('se valida y los proyectos de antes arrancan vacíos', () => {
    const ok = completarEquipos({ aires: [aireNuevo([])], salamandras: [salamandraNueva([])] });
    expect(validarEquipos(ok)).toEqual({});
    expect(validarEquipos({ ...ok, aires: [{ ...ok.aires[0], frigorias: 10 }] })).toHaveProperty(['equipos.aires.0']);
    expect(validarEquipos({ ...ok, salamandras: [{ ...ok.salamandras[0], diametro: '8' }] })).toHaveProperty(['equipos.salamandras.0']);
    const { equipos, ...viejo } = PARAMS_INICIALES;
    expect(equipos).toEqual(EQUIPOS_INICIALES);
    expect(migrarParams(viejo).equipos).toEqual(EQUIPOS_INICIALES);
    expect(validarParametros({ ...migrarParams(viejo), equipos: ok })).toEqual({});
  });
});
