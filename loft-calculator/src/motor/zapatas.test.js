// Tests de las zapatas de los pilotines (v1.35). Correr con: npm test
import { describe, it, expect } from 'vitest';
import { generarEstructura } from './estructura.js';
import { calcularPresupuesto, CATALOGO_INICIAL } from './presupuesto.js';
import { migrarParams } from './migracion.js';
import { validarParametros } from './validacion.js';
import { PARAMS_INICIALES as P, ABERTURAS_INICIALES } from './parametrosIniciales.js';
import { INSUMO } from './constantes.js';

const conZapata = (z = {}) => ({ ...P, zapata: { activa: true, lado: 0.6, alto: 0.3, profundidad: 0.8, ...z } });
const items = (params) => calcularPresupuesto(generarEstructura(params, ABERTURAS_INICIALES), CATALOGO_INICIAL, { proveedor: 'prov-1' }).items;

describe('zapatas', () => {
  it('sin tildar no suman nada', () => {
    const ids = items(P).map((i) => i.id);
    expect(ids).not.toContain(INSUMO.HORMIGON_ZAPATA);
    expect(generarEstructura(P, ABERTURAS_INICIALES).zapata).toBeNull();
  });

  it('hormigón = pilotines x lado² x alto; excavación = pilotines x lado² x profundidad', () => {
    const lista = items(conZapata());
    const n = P.filasPilotines * P.pilotinesPorFila; // 12
    expect(lista.find((i) => i.id === INSUMO.HORMIGON_ZAPATA).cantidad).toBeCloseTo(n * 0.36 * 0.3, 2);
    expect(lista.find((i) => i.id === INSUMO.EXCAVACION).cantidad).toBeCloseTo(n * 0.36 * 0.8, 2);
    expect(lista.find((i) => i.id === INSUMO.HORMIGON_ZAPATA).detalle).toBe('12 zapatas de 0.60 x 0.60 x 0.30 m');
  });

  it('se valida y los proyectos viejos la traen apagada', () => {
    expect(validarParametros(conZapata())).toEqual({});
    expect(validarParametros(conZapata({ profundidad: 0.2 }))).toEqual({ 'zapata.profundidad': 'Tiene que ser al menos el alto de la zapata' });
    expect(validarParametros(conZapata({ lado: 5 }))).toEqual({ 'zapata.lado': 'Entre 0.2 y 3 m' });
    const { zapata, ...viejo } = P;
    expect(migrarParams(viejo).zapata).toEqual({ activa: false, lado: 0.6, alto: 0.3, profundidad: 0.8 });
    expect(zapata.activa).toBe(false);
  });
});
