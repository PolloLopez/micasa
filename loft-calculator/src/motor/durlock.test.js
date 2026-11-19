// Tests del Durlock de los tabiques (v1.76). Correr con: npm test
import { describe, it, expect } from 'vitest';
import { generarEstructura } from './estructura.js';
import { calcularPresupuesto, CATALOGO_INICIAL } from './presupuesto.js';
import { validarParametros } from './validacion.js';
import { PARAMS_INICIALES as P, ABERTURAS_INICIALES } from './parametrosIniciales.js';
import { INSUMO } from './constantes.js';
import { TABIQUE_NUEVO } from './tabiques.js';
import { materialesDeDurlock, completarDurlock, validarDurlock, RENDIMIENTO_DURLOCK } from './durlock.js';
import { parteDeItem } from './partesObra.js';

// Un tabique de 1,5 m hasta 2,4 m, con puerta de abrir de 0,7 x 2 y placa en las dos caras.
const tabique = { ...structuredClone(TABIQUE_NUEVO), id: 1, nombre: 'Baño', alto: 'medida', altoMedida: 2.4,
  puerta: { ...TABIQUE_NUEVO.puerta, tipo: 'abatir', desde: 0.2, ancho: 0.7, alto: 2 }, revestimientoA: 'panelMuros', revestimientoB: 'panelMuros' };
const conTabique = (extra = {}) => ({ ...P, tabiques: [tabique], ...extra });
const presupuesto = (params) => calcularPresupuesto(generarEstructura(params, ABERTURAS_INICIALES), CATALOGO_INICIAL, { proveedor: 'prov-1' });

describe('Durlock de los tabiques', () => {
  it('soleras y dintel van a su renglón PGU; los montantes quedan en Estructura de tabiques', () => {
    const { items } = presupuesto(conTabique());
    const soleras = items.find((i) => i.id === INSUMO.SOLERA_TABIQUE);
    const montantes = items.find((i) => i.id === INSUMO.ESTRUCTURA_TABIQUE);
    // 2 tramos de solera abajo (cortada en la puerta) + 1 arriba + el dintel.
    expect(soleras.largosPiezas).toHaveLength(4);
    expect(soleras.perfil).toMatch(/PGU/);
    expect(montantes.largosPiezas.length).toBeGreaterThan(0);
    expect(montantes.perfil).toMatch(/PGC/);
    expect(parteDeItem(soleras)).toBe('tabiques');
  });

  it('tornillos, cinta y masilla por m² de placa y por montante', () => {
    const e = generarEstructura(conTabique(), ABERTURAS_INICIALES);
    const d = e.durlock;
    const m2Cara = 1.5 * 2.4 - 0.7 * 2; // 2,2 m² por cara
    expect(d.m2Placa).toBeCloseTo(2 * m2Cara, 6);
    expect(d.t2).toBe(Math.ceil(2 * m2Cara * RENDIMIENTO_DURLOCK.t2PorM2));
    expect(d.cinta).toBe(Math.ceil(2 * m2Cara * 1.5));
    expect(d.masilla).toBe(Math.ceil(2 * m2Cara * 0.9));
    expect(d.t1).toBe(d.montantes * 4);
    const { items } = presupuesto(conTabique());
    expect(items.find((i) => i.id === INSUMO.TORNILLO_T2).cantidad).toBe(d.t2);
    expect(items.find((i) => i.id === INSUMO.MASILLA_JUNTAS).cantidad).toBe(d.masilla);
  });

  it('sin tabiques no aparece nada; sin placas, solo los T1', () => {
    expect(presupuesto(P).items.some((i) => [INSUMO.TORNILLO_T1, INSUMO.TORNILLO_T2, INSUMO.CINTA_JUNTAS].includes(i.id))).toBe(false);
    const sinPlaca = materialesDeDurlock(generarEstructura({ ...P, tabiques: [{ ...tabique, revestimientoA: '', revestimientoB: '' }] }, ABERTURAS_INICIALES).tabiques);
    expect([sinPlaca.t2, sinPlaca.cinta, sinPlaca.masilla]).toEqual([0, 0, 0]);
    expect(sinPlaca.t1).toBeGreaterThan(0);
  });

  it('los rendimientos se cambian por proyecto y se validan', () => {
    const e = generarEstructura(conTabique({ durlock: { t2PorM2: 30, masillaPorM2: 0 } }), ABERTURAS_INICIALES);
    expect(e.durlock.t2).toBe(Math.ceil(e.durlock.m2Placa * 30));
    expect(e.durlock.masilla).toBe(0);
    expect(completarDurlock({ t2PorM2: -1, cintaPorM2: 2 })).toEqual({ ...RENDIMIENTO_DURLOCK, cintaPorM2: 2 });
    expect(validarDurlock({ t2PorM2: 500 })).toEqual({ 'durlock.t2PorM2': 'Tornillos T2 por m²: entre 0 y 100' });
    expect(validarParametros(conTabique({ durlock: { t1PorMontante: 6 } }))).toEqual({});
    expect(Object.keys(validarParametros(conTabique({ durlock: 'x' })))).toEqual(['durlock']);
  });
});
