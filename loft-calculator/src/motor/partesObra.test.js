// Tests de las partes de la obra: terminadas y extras (v1.70). Correr con: npm test
import { describe, it, expect } from 'vitest';
import { partesDeLaObra, descuentoPorTerminadas, itemsDeExtras, extraNuevo, errorDeExtra } from './partesObra.js';
import { generarEstructura } from './estructura.js';
import { calcularPresupuesto, CATALOGO_INICIAL } from './presupuesto.js';
import { PARAMS_INICIALES as P, ABERTURAS_INICIALES } from './parametrosIniciales.js';
import { completarObraCivil } from './obraCivil.js';

const conObra = { ...P, obraCivil: { ...completarObraCivil(P.obraCivil), hormigonEnObra: true } };
const e = generarEstructura(conObra, ABERTURAS_INICIALES, CATALOGO_INICIAL);
const { items } = calcularPresupuesto(e, CATALOGO_INICIAL);
const item = (id) => items.find((i) => i.id === id);

describe('partes de la obra', () => {
  it('cada renglón va a su parte; los pilotines con su obra civil', () => {
    const partes = partesDeLaObra(items, e, {});
    const pilotines = partes.find((p) => p.clave === 'pilotines');
    expect(pilotines.obraCivil.clave).toBe('pilotines');
    expect(partes.find((p) => p.clave === 'paredes').renglones.map((r) => r.id)).toContain('columna');
    expect(partes.find((p) => p.clave === 'revestimiento').renglones.map((r) => r.id)).toContain('panelMuros');
    expect(partes.find((p) => p.clave === 'techo').renglones.map((r) => r.id)).toContain('panelTecho');
  });
  it('con los pilotines terminados, su cemento, arena, piedra y hierro ya no faltan', () => {
    expect(descuentoPorTerminadas(items, e, {}).size).toBe(0);
    const d = descuentoPorTerminadas(items, e, { terminadas: ['pilotines'] }, conObra.obraCivil);
    expect(d.get('cemento')).toBe(item('cemento').cantidad); // la obra civil es solo de pilotines: todo
    expect(d.get('hierro8')).toBe(item('hierro8').cantidad);
    expect(d.has('columna')).toBe(false);
  });
  it('paredes terminadas: descuenta los perfiles de su renglón (por la clave del perfil)', () => {
    const d = descuentoPorTerminadas(items, e, { terminadas: ['paredes'] });
    const col = item('columna');
    expect(d.get(col.perfilId)).toBeGreaterThanOrEqual(col.cantidad);
  });
});

describe('extras de una parte', () => {
  it('suman al presupuesto como renglones y se validan', () => {
    const extras = [{ ...extraNuevo([], 'pilotines'), nombre: 'Manguera de riego (nivel)', cantidad: 20, unidad: 'm', precio: 800 },
      { ...extraNuevo([{ id: 1 }], 'pilotines'), nombre: 'Tanza', cantidad: 1, unidad: 'rollo', precio: 3500 }];
    const its = itemsDeExtras(extras, [{ clave: 'pilotines', nombre: 'Pilotines y zapatas' }]);
    expect(its.map((i) => [i.id, i.subtotal, i.perfil])).toEqual([['extra:1', 16000, 'para Pilotines y zapatas'], ['extra:2', 3500, 'para Pilotines y zapatas']]);
    const partes = partesDeLaObra([...items, ...its], e, { extras, terminadas: ['pilotines'] });
    expect(partes.find((p) => p.clave === 'pilotines')).toMatchObject({ terminada: true });
    expect(partes.find((p) => p.clave === 'pilotines').extras).toHaveLength(2);
    // Terminada: los extras tampoco faltan.
    expect(descuentoPorTerminadas(its, e, { terminadas: ['pilotines'] }).get('extra:1')).toBe(20);
    expect(errorDeExtra({ ...extras[0], precio: -1 })).toBe('Precio inválido');
  });
});
