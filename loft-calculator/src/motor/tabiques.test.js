// Tests de los tabiques de Durlock (v1.41). Correr con: npm test
import { describe, it, expect } from 'vitest';
import { generarEstructura, listarPiezas } from './estructura.js';
import { calcularPresupuesto, CATALOGO_INICIAL, PERFILES_INICIALES } from './presupuesto.js';
import { migrarParams } from './migracion.js';
import { validarParametros } from './validacion.js';
import { PARAMS_INICIALES as P, ABERTURAS_INICIALES } from './parametrosIniciales.js';
import { INSUMO } from './constantes.js';
import { TABIQUE_NUEVO, tabiqueNuevo, ubicarTabique, altosDelTabique, generarTabique, validarTabique } from './tabiques.js';

// Lateral derecho (lado B, x = 3,75): sale hacia adentro (-x) a 1,50 m de su esquina izquierda (z = 2,25).
const tabique = (cambios = {}) => ({ ...structuredClone(TABIQUE_NUEVO), id: 1, nombre: 'Baño', ...cambios });
const conPuerta = (puerta) => tabique({ puerta: { ...TABIQUE_NUEVO.puerta, ...puerta } });
const items = (params) => calcularPresupuesto(generarEstructura(params, ABERTURAS_INICIALES), CATALOGO_INICIAL, { proveedor: 'prov-1' }).items;
const renglon = (params, id) => items(params).find((i) => i.id === id);

describe('tabiques: ubicación y alto', () => {
  it('perpendicular: sale de la cara de adentro de la pared, a la distancia de la esquina', () => {
    const u = ubicarTabique(P, tabique());
    expect(u.inicio[0]).toBeCloseTo(3.69, 6);
    expect(u.inicio[1]).toBeCloseTo(2.25 - 1.5, 6);
    expect(u.direccion[0]).toBeCloseTo(-1, 6);
    expect(u.direccion[1]).toBeCloseTo(0, 6);
  });

  it('paralelo: corre a la separación de la pared', () => {
    const u = ubicarTabique(P, tabique({ orientacion: 'paralelo', separacion: 1, desde: 1, largo: 2 }));
    expect(u.inicio[0]).toBeCloseTo(3.75 - 1.06, 6);
    expect(u.inicio[1]).toBeCloseTo(2.25 - 1, 6);
    expect(u.direccion).toEqual([0, -1]);
  });

  it('alto hasta el techo (con la pendiente), hasta el piso 2 o una medida', () => {
    const [h0, h1] = altosDelTabique(P, tabique());
    expect(h0).toBeCloseTo(4.5 + 3 * 0.1 - 0.09, 6); // z = 0,75: 3 m del lado bajo (C)
    expect(h1).toBeCloseTo(h0, 6); // corre en x: misma altura de techo
    expect(altosDelTabique(P, tabique({ alto: 'medida', altoMedida: 2.4 }))).toEqual([2.4, 2.4]);
    expect(altosDelTabique(P, tabique({ alto: 'piso2' }))[0]).toBeCloseTo(2.3 - 0.12 - 0.09, 6);
    // Paralelo al fondo-frente (corre en z): el techo sube a lo largo.
    const [a, b] = altosDelTabique(P, tabique({ orientacion: 'paralelo', separacion: 1, desde: 1, largo: 2 }));
    expect(a - b).toBeCloseTo(2 * 0.1, 6);
  });
});

describe('tabiques: estructura y placas', () => {
  it('soleras, montantes cada 40 cm y, con puerta, jambas, dintel y montantes cortos arriba', () => {
    const g = generarTabique(P, conPuerta({ tipo: 'abatir', desde: 0.2, ancho: 0.7, alto: 2 }));
    const ids = g.piezas.map((p) => p.id);
    expect(ids.filter((id) => id.includes('solera-abajo'))).toHaveLength(2); // cortada en la puerta
    expect(ids).toContain('tabique:1:solera-arriba');
    expect(ids).toContain('tabique:1:dintel');
    expect(ids).toContain('tabique:1:montante:20'); // jambas
    expect(ids).toContain('tabique:1:montante:90');
    expect(ids.filter((id) => id.includes('montante-corto'))).toHaveLength(2); // 0,375 y 0,75 caen en la puerta
    const corto = g.piezas.find((p) => p.id.includes('montante-corto'));
    expect(corto.largo).toBeCloseTo(4.71 - 2, 6);
  });

  it('placas por cara, sin la puerta', () => {
    const t = { ...conPuerta({ tipo: 'abatir', desde: 0.2, ancho: 0.7, alto: 2 }), revestimientoA: 'panelMuros', revestimientoB: 'panelTecho' };
    const g = generarTabique(P, t);
    expect(g.panos.map((p) => p.panel)).toEqual(['panelMuros', 'panelTecho']);
    expect(g.panos[0].neto).toBeCloseTo(1.5 * 4.71 - 0.7 * 2, 6);
    expect(generarTabique(P, tabique()).panos).toEqual([]);
  });

  it('va a la lista de piezas, al presupuesto (estructura y puertas) y suma las placas', () => {
    const sin = items(P).map((i) => i.id);
    [INSUMO.ESTRUCTURA_TABIQUE, INSUMO.PUERTA_PLACA, INSUMO.PUERTA_GRANERO].forEach((id) => expect(sin).not.toContain(id));
    const params = { ...P, tabiques: [{ ...conPuerta({ tipo: 'granero' }), revestimientoA: 'panelMuros' }] };
    expect(listarPiezas(generarEstructura(params, ABERTURAS_INICIALES)).some((p) => p.tipo === 'tabique')).toBe(true);
    expect(renglon(params, INSUMO.ESTRUCTURA_TABIQUE).cantidad).toBeGreaterThan(0);
    expect(renglon(params, INSUMO.PUERTA_GRANERO).cantidad).toBe(1);
    expect(renglon(params, 'panelMuros').cantidad).toBeGreaterThan(renglon(P, 'panelMuros').cantidad);
    const abrir = { ...P, tabiques: [conPuerta({ tipo: 'abatir' })] };
    expect(renglon(abrir, INSUMO.PUERTA_PLACA).cantidad).toBe(1);
  });

  it('con un perfil de la lista elegido va a su propio renglón', () => {
    const perfil = PERFILES_INICIALES.find((p) => p.a === 50 && p.b === 50);
    const params = { ...P, tabiques: [tabique({ perfil: perfil.id })] };
    const propio = items(params).find((i) => i.id === `${INSUMO.ESTRUCTURA_TABIQUE}@${perfil.id}`);
    expect(propio.nombre).toBe('Estructura de tabiques (Baño)');
  });
});

describe('tabiques: carga', () => {
  it('nuevo con id y nombre numerado; los proyectos de antes quedan sin tabiques', () => {
    expect(tabiqueNuevo([tabique()], 4)).toMatchObject({ id: 4, nombre: 'Tabique 2', orientacion: 'perpendicular' });
    const { tabiques, ...viejo } = P;
    expect(tabiques).toEqual([]);
    expect(migrarParams(viejo).tabiques).toEqual([]);
    expect(migrarParams({ ...viejo, tabiques: [{ id: 2, lado: 'D' }] }).tabiques[0]).toMatchObject({ id: 2, lado: 'D', puerta: { tipo: 'ninguna' } });
  });

  it('valida que entre, el alto y la puerta', () => {
    expect(validarTabique(tabique(), P)).toBeNull();
    expect(validarTabique(tabique({ desde: 5 }), P)).toMatch(/más larga que la pared/);
    expect(validarTabique(tabique({ orientacion: 'paralelo', desde: 3, largo: 2 }), P)).toMatch(/no entra/);
    expect(validarTabique(conPuerta({ tipo: 'abatir', desde: 1, ancho: 0.7 }), P)).toBe('La puerta no entra en el tabique');
    expect(validarTabique({ ...conPuerta({ tipo: 'abatir' }), alto: 'medida', altoMedida: 1.8 }, P)).toBe('La puerta es más alta que el tabique');
    expect(validarParametros({ ...P, tabiques: [tabique({ largo: 0.1 })] })['tabiques.1']).toMatch(/largo/);
    expect(validarParametros({ ...P, tabiques: [tabique()] })).toEqual({});
  });
});
