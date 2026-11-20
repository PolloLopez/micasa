// Tests de los presupuestos de mano de obra por parte y los materiales de cada parte (v1.79). Correr con: npm test
import { describe, it, expect } from 'vitest';
import { cotizacionNueva, cotizacionesDeLaParte, elegirCotizacion, errorDeCotizacion, nombreDeCotizacion } from './manoDeObraPartes.js';
import { completarCierre, cerrarPresupuesto } from './cierre.js';
import { partesDelPresupuesto, cuentasDelRubro, validarSeguimiento } from './seguimiento.js';
import { parteDeItem, partesDeLaObra } from './partesObra.js';
import { normalizarCatalogo } from './migracion.js';

const jose = { id: 1, nombre: 'José', oficio: 'Albañil' };
const cot = (id, quien, monto, extra = {}) => ({ ...cotizacionNueva([], 'oc:tapial'), id, quien, monto, ...extra });

describe('presupuestos de mano de obra por parte', () => {
  it('quedan en el orden en que se cargaron y se marca la más barata', () => {
    const lista = [cot(1, 'Ramón', 900000), cot(2, 'José', 750000), { ...cot(3, 'Otro', 100), parte: 'pilotines' }];
    const r = cotizacionesDeLaParte(lista, 'oc:tapial');
    expect(r.map((c) => [c.quien, c.masBarata])).toEqual([['Ramón', false], ['José', true]]);
    expect(cotizacionesDeLaParte([cot(1, 'Solo', 5)], 'oc:tapial')[0].masBarata).toBe(false); // con una sola no hay "más barata"
    expect(nombreDeCotizacion({ quien: '', contratista: 1 }, [jose])).toBe('José');
    expect(cotizacionNueva([cot(4, 'x', 1)], 'oc:tapial')).toMatchObject({ id: 5, parte: 'oc:tapial', monto: 0, elegida: false });
  });

  it('elegir: usa el segmento "Tapial" del cierre y crea el trabajo en el seguimiento con su contratista', () => {
    const seguimiento = { rubros: [], contratistas: [jose], cotizaciones: [cot(1, 'Ramón', 900000), cot(2, '', 750000, { contratista: 1 })] };
    const r = elegirCotizacion({ seguimiento, cierre: undefined, cotizacion: seguimiento.cotizaciones[1], parteNombre: 'Tapial' });
    expect(r.cotizaciones.map((c) => c.elegida)).toEqual([false, true]);
    const tapial = r.segmentos.filter((s) => s.parte === 'oc:tapial');
    expect(tapial).toHaveLength(1);
    expect(tapial[0]).toMatchObject({ nombre: 'Tapial', modo: 'global', valor: 750000 });
    expect(r.segmentos.length).toBe(completarCierre(undefined).segmentos.length); // reusó el de fábrica, no agregó otro
    expect(r.rubros).toHaveLength(1);
    expect(r.rubros[0]).toMatchObject({ origen: `manoDeObra:${tapial[0].id}`, contratista: 1, quien: 'José', parteObra: 'oc:tapial' });
    // El presupuesto y el seguimiento dicen lo mismo.
    const cierre = { ...completarCierre(undefined), segmentos: r.segmentos };
    const partes = partesDelPresupuesto({ cierre: cerrarPresupuesto(1000000, cierre) });
    expect(cuentasDelRubro(r.rubros[0], partes).presupuestado).toBe(750000);
    // Cambiar de idea: elegir a Ramón actualiza el mismo segmento y el mismo trabajo.
    const r2 = elegirCotizacion({ seguimiento: { ...seguimiento, rubros: r.rubros, cotizaciones: r.cotizaciones }, cierre, cotizacion: r.cotizaciones[0], parteNombre: 'Tapial' });
    expect(r2.segmentos.find((s) => s.parte === 'oc:tapial').valor).toBe(900000);
    expect(r2.rubros).toHaveLength(1);
    expect(r2.rubros[0]).toMatchObject({ quien: 'Ramón', contratista: null });
    expect(validarSeguimiento({ rubros: r2.rubros, cotizaciones: r2.cotizaciones })).toEqual({});
  });

  it('una parte sin segmento de fábrica crea el suyo', () => {
    const r = elegirCotizacion({ seguimiento: {}, cierre: undefined, cotizacion: { ...cot(1, 'A', 300000), parte: 'oc:pilar:1' }, parteNombre: 'Pilar de luz' });
    expect(r.segmentos[r.segmentos.length - 1]).toMatchObject({ nombre: 'Pilar de luz', valor: 300000, parte: 'oc:pilar:1' });
  });

  it('reconoce un segmento renombrado (no suma la mano de obra dos veces)', () => {
    const cierre = { segmentos: [{ id: 1, nombre: 'Pilotines+Pilar', modo: 'global', valor: 900000 }, { id: 6, nombre: 'Pozo séptico-Jose', modo: 'global', valor: 2000000 }] };
    const r = elegirCotizacion({ seguimiento: {}, cierre, cotizacion: { ...cot(1, 'Ramón', 700000), parte: 'oc:pozo:1' }, parteNombre: 'Pozo absorbente' });
    expect(r.segmentos).toHaveLength(2);
    expect(r.segmentos[1]).toMatchObject({ id: 6, nombre: 'Pozo séptico-Jose', valor: 700000, parte: 'oc:pozo:1' });
    const r2 = elegirCotizacion({ seguimiento: {}, cierre, cotizacion: { ...cot(2, 'A', 500000), parte: 'pilotines' }, parteNombre: 'Pilotines y zapatas' });
    expect(r2.segmentos.find((x) => x.id === 1)).toMatchObject({ valor: 500000, parte: 'pilotines' });
  });

  it('valida', () => {
    expect(errorDeCotizacion(cot(1, 'José', 5))).toBeNull();
    expect(errorDeCotizacion({ ...cot(1, 'José', 5), monto: -1 })).toBe('Monto inválido');
    expect(Object.keys(validarSeguimiento({ rubros: [], cotizaciones: [{ id: 'x' }] }))).toEqual(['seguimiento.cotizaciones.0']);
  });
});

describe('materiales de una parte con precio por proveedor', () => {
  it('un accesorio con parte es de esa parte (y se guarda con el proyecto)', () => {
    const acc = { id: 'acc-9', categoria: 'accesorio', nombre: 'Ladrillo hueco 8', unidad: 'u', cantidad: 300, precios: {}, modo: 'manual', parte: 'oc:tapial' };
    expect(parteDeItem(acc)).toBe('oc:tapial');
    expect(parteDeItem({ ...acc, parte: '' })).toBeNull();
    expect(normalizarCatalogo([acc]).find((i) => i.id === 'acc-9').parte).toBe('oc:tapial');
    // Cae en la parte del tapial (no crea otra con su nombre).
    const estructura = { obraCivil: { partes: [{ clave: 'tapial', nombre: 'Tapial', detalle: '' }] } };
    const partes = partesDeLaObra([{ ...acc, subtotal: 0 }], estructura);
    expect(partes.filter((p) => p.clave === 'oc:tapial')).toHaveLength(1);
    expect(partes.find((p) => p.clave === 'oc:tapial').renglones.map((r) => r.id)).toEqual(['acc-9']);
  });
});
