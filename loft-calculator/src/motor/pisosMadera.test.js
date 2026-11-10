// Tests de los pisos con tirantes de madera y machimbre (v1.42.1). Correr con: npm test
import { describe, it, expect } from 'vitest';
import { generarEstructura } from './estructura.js';
import { calcularPresupuesto, CATALOGO_INICIAL } from './presupuesto.js';
import { migrarParams } from './migracion.js';
import { validarParametros } from './validacion.js';
import { PARAMS_INICIALES as P, ABERTURAS_INICIALES } from './parametrosIniciales.js';
import { INSUMO } from './constantes.js';

const items = (params) => calcularPresupuesto(generarEstructura(params, ABERTURAS_INICIALES), CATALOGO_INICIAL, { proveedor: 'prov-1' }).items;
const renglon = (params, id) => items(params).find((i) => i.id === id);
const altillo = { ...P, tirantesPiso2: 'madera', cubiertaPiso2: 'machimbre' };

describe('altillo con perfiles C y tirantes de madera con machimbre', () => {
  it('los tirantes del piso 2 salen del renglón de perfil y van por metro a "Tirantes de madera"', () => {
    const e = generarEstructura(altillo, ABERTURAS_INICIALES);
    expect(e.piso2.tirantes.every((p) => p.madera)).toBe(true);
    expect(e.piso.tirantes.some((p) => p.madera)).toBe(false); // la planta baja sigue de hierro
    const metros = e.piso2.tirantes.reduce((a, p) => a + p.largo, 0);
    expect(renglon(altillo, INSUMO.TIRANTE_MADERA_2).cantidad).toBeCloseTo(Math.ceil(metros * 10 - 1e-9) / 10, 6);
    expect(renglon(altillo, INSUMO.PISO_2).cantidad).toBe(0); // sin barras de perfil para los tirantes
    expect(renglon(altillo, INSUMO.TRANSVERSAL_PISO_2).cantidad).toBeGreaterThan(0); // las C siguen
  });

  it('el machimbre reemplaza al OSB solo en ese piso', () => {
    const conOsb = renglon(P, INSUMO.OSB).cantidad;
    expect(renglon(altillo, INSUMO.OSB).cantidad).toBeLessThan(conOsb);
    const s = generarEstructura(altillo, ABERTURAS_INICIALES).superficies;
    expect(renglon(altillo, INSUMO.MACHIMBRE).cantidad).toBeCloseTo(Math.ceil(s.piso2 * 1.1 * 100 - 1e-9) / 100, 6);
    // Los dos pisos con machimbre: no queda OSB.
    expect(renglon({ ...altillo, cubiertaPiso: 'machimbre' }, INSUMO.OSB)).toMatchObject({ cantidad: 0, detalle: 'no lleva' });
  });

  it('sin madera, como siempre: no aparecen sus renglones', () => {
    const ids = items(P).map((i) => i.id);
    [INSUMO.TIRANTE_MADERA, INSUMO.TIRANTE_MADERA_2, INSUMO.MACHIMBRE].forEach((id) => expect(ids).not.toContain(id));
  });

  it('los proyectos de antes quedan de hierro y con OSB; valores raros no se guardan', () => {
    const { tirantesPiso, tirantesPiso2, cubiertaPiso, cubiertaPiso2, ...viejo } = P;
    expect([tirantesPiso, tirantesPiso2, cubiertaPiso, cubiertaPiso2]).toEqual(['hierro', 'hierro', 'osb', 'osb']);
    expect(migrarParams(viejo)).toMatchObject({ tirantesPiso: 'hierro', tirantesPiso2: 'hierro', cubiertaPiso: 'osb', cubiertaPiso2: 'osb' });
    expect(validarParametros({ ...P, tirantesPiso2: 'bambú' }).tirantesPiso2).toBe('Elegí hierro o madera');
    expect(validarParametros(altillo)).toEqual({});
  });
});
