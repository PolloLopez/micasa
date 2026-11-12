// Tests del cierre del presupuesto (v1.46). Correr con: npm test
import { describe, it, expect } from 'vitest';
import { cerrarPresupuesto, completarCierre, validarCierre, CIERRE_INICIAL } from './cierre.js';
import { validarParametros } from './validacion.js';
import { migrarParams } from './migracion.js';
import { PARAMS_INICIALES } from './parametrosIniciales.js';

const montos = (r) => Object.fromEntries(r.renglones.map((x) => [x.clave, x.monto]));

describe('cierre del presupuesto', () => {
  it('sin nada cargado, el total es el de los materiales', () => {
    const r = cerrarPresupuesto(1000000, CIERRE_INICIAL);
    expect(r).toMatchObject({ total: 1000000, conCierre: false });
    expect(r.renglones).toHaveLength(1);
  });

  it('en orden: mano de obra, imprevistos sobre el costo directo, ganancia sobre el costo e IVA sobre el precio', () => {
    const r = cerrarPresupuesto(1000000, { manoDeObra: { modo: 'global', valor: 500000 }, imprevistos: 10, ganancia: 20, iva: 21 });
    // 1.000.000 + 500.000 = 1.500.000; +10 % = 1.650.000; +20 % = 1.980.000; +21 % = 2.395.800
    expect(montos(r)).toEqual({
      materiales: 1000000, manoDeObra: 500000, costoDirecto: 1500000, imprevistos: 150000, costo: 1650000,
      ganancia: 330000, sinIva: 1980000, iva: 415800,
    });
    expect(r.total).toBe(2395800);
    expect(r.renglones.filter((x) => x.subtotal).map((x) => x.concepto)).toEqual(['Costo directo', 'Costo total', 'Precio sin IVA']);
  });

  it('mano de obra por m² cubierto, por kg de hierro o como % de los materiales', () => {
    const medidas = { m2: 50, kg: 2000 };
    expect(cerrarPresupuesto(1000000, { ...CIERRE_INICIAL, manoDeObra: { modo: 'porM2', valor: 40000 } }, medidas).total).toBe(3000000);
    const porKg = cerrarPresupuesto(1000000, { ...CIERRE_INICIAL, manoDeObra: { modo: 'porKg', valor: 1500 } }, medidas);
    expect(porKg.total).toBe(4000000);
    expect(porKg.renglones[1].detalle).toMatch(/2\.000 kg de hierro/);
    expect(cerrarPresupuesto(1000000, { ...CIERRE_INICIAL, manoDeObra: { modo: 'porcentaje', valor: 60 } }).total).toBe(1600000);
  });

  it('solo IVA: sin subtotal de más (el IVA va directo sobre los materiales)', () => {
    const r = cerrarPresupuesto(1000000, { ...CIERRE_INICIAL, iva: 10.5 });
    expect(r.renglones.map((x) => x.clave)).toEqual(['materiales', 'iva']);
    expect(r.total).toBe(1105000);
  });

  it('se valida y los proyectos de antes arrancan sin cierre', () => {
    expect(validarCierre(CIERRE_INICIAL)).toEqual({});
    expect(Object.keys(validarCierre({ ...CIERRE_INICIAL, iva: 15, ganancia: -1 })).sort()).toEqual(['cierre.ganancia', 'cierre.iva']);
    expect(completarCierre({ ganancia: 15 })).toEqual({ ...CIERRE_INICIAL, ganancia: 15 });
    const { cierre, ...viejo } = PARAMS_INICIALES;
    expect(cierre).toEqual(CIERRE_INICIAL);
    const migrado = migrarParams(viejo);
    expect(migrado.cierre).toEqual(CIERRE_INICIAL);
    expect(validarParametros({ ...migrado, cierre: { ...CIERRE_INICIAL, iva: 21 } })).toEqual({});
    expect(validarParametros({ ...migrado, cierre: { ...CIERRE_INICIAL, iva: 3 } })).toHaveProperty('cierre.iva');
  });
});

describe('cierre en el Excel', async () => {
  const { hojasDeObra } = await import('../proyecto/exportarExcel.js');
  it('la hoja Obra termina con el precio de la obra', () => {
    const cierre = cerrarPresupuesto(1000000, { ...CIERRE_INICIAL, ganancia: 10 });
    const hojas = hojasDeObra({ nombre: 'x', params: PARAMS_INICIALES, vistas: { paredes: [], plantas: [] }, items: [], total: 1000000, cierre },
      { presupuesto: true });
    const filas = hojas[0].filas.map((f) => (Array.isArray(f) ? f : f.celdas));
    expect(filas.at(-1)).toEqual(['PRECIO DE LA OBRA', '', '', '', '', { pesos: 1100000 }]);
  });
});

describe('v1.53: mano de obra por segmento', () => {
  it('cada segmento suma su renglón con las medidas de la obra; en 0 no aparece; van al costo directo', async () => {
    const { SEGMENTOS_INICIALES } = await import('./cierre.js');
    expect(SEGMENTOS_INICIALES.map((x) => x.nombre)).toEqual(['Pilotines', 'Estructura', 'Revestimiento', 'Tabiques', 'Tapial', 'Pozo séptico', 'Electricista', 'Plomero']);
    const segmentos = SEGMENTOS_INICIALES.map((x) => ({
      Pilotines: { ...x, valor: 20000 }, Revestimiento: { ...x, valor: 8000 }, Tabiques: { ...x, valor: 15000 }, Electricista: { ...x, valor: 900000 },
    }[x.nombre] ?? x));
    const medidas = { m2: 50, kg: 2000, m2Revestimiento: 100, mTabiques: 6, pilotines: 15 };
    const r = cerrarPresupuesto(1000000, { ...CIERRE_INICIAL, segmentos, imprevistos: 10 }, medidas);
    const m = montos(r);
    expect(m['mo:1']).toBe(300000); // 15 pilotines x 20.000
    expect(m['mo:3']).toBe(800000); // 100 m² x 8.000
    expect(m['mo:4']).toBe(90000); // 6 m x 15.000
    expect(m['mo:7']).toBe(900000); // electricista, monto total
    expect(m['mo:2']).toBeUndefined(); // en 0
    expect(m.costoDirecto).toBe(1000000 + 300000 + 800000 + 90000 + 900000);
    expect(r.renglones.find((x) => x.clave === 'mo:1').detalle).toBe('15 pilotines x $ 20.000');
    // En la pestaña Obra: un rubro por cada segmento con monto.
    const { partesDelPresupuesto } = await import('./seguimiento.js');
    const partes = partesDelPresupuesto({ materiales: 1000000, cierre: r });
    expect(partes.map((p) => p.nombre)).toEqual(['Materiales', 'Mano de obra — Pilotines', 'Mano de obra — Revestimiento', 'Mano de obra — Tabiques', 'Mano de obra — Electricista']);
    expect(validarCierre({ ...CIERRE_INICIAL, segmentos: [{ id: 1, nombre: 'x', modo: 'otro', valor: 1 }] })).toHaveProperty(['cierre.segmentos.0']);
  });
});
