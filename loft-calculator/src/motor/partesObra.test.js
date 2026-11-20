// Tests de las partes de la obra: terminadas y extras (v1.70). Correr con: npm test
import { describe, it, expect } from 'vitest';
import { partesDeLaObra, descuentoPorTerminadas, itemsDeExtras, extraNuevo, errorDeExtra, trabajosDeLaParte, trabajosSinTerminar, textoParaCotizar } from './partesObra.js';
import { rubroNuevo, validarSeguimiento } from './seguimiento.js';
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

describe('mano de obra unida a cada parte (v1.74)', () => {
  const jose = { ...rubroNuevo([], { nombre: 'Pilotines (José)' }), parteObra: 'pilotines', avance: 80 };
  const pintor = { ...rubroNuevo([jose], { nombre: 'Pintura' }), avance: 100 };
  it('la parte encuentra sus trabajos y avisa los que no llegaron al 100 %', () => {
    expect(rubroNuevo([]).parteObra).toBeNull();
    expect(trabajosDeLaParte([jose, pintor], 'pilotines').map((r) => r.nombre)).toEqual(['Pilotines (José)']);
    expect(trabajosSinTerminar([jose, pintor], 'pilotines')).toHaveLength(1);
    expect(trabajosSinTerminar([{ ...jose, avance: 100 }], 'pilotines')).toHaveLength(0);
    expect(trabajosDeLaParte([jose], 'techo')).toEqual([]);
  });
  it('se valida el campo', () => {
    expect(validarSeguimiento({ rubros: [jose, pintor] })).toEqual({});
    expect(Object.keys(validarSeguimiento({ rubros: [{ ...jose, parteObra: 'x'.repeat(61) }] }))).toEqual(['seguimiento.rubros.0']);
  });
});

describe('pedido para cotizar (v1.79.1)', () => {
  it('junta los materiales de la parte, su obra civil y los extras, sin precios', () => {
    const parte = {
      nombre: 'Tapial',
      renglones: [{ id: 'acc-1', nombre: 'Ladrillo hueco 8', cantidad: 300, unidad: 'u', subtotal: 195000 }, { id: 'x', nombre: 'Nada', cantidad: 0, unidad: 'u' }, { id: 'excavacion', nombre: 'Excavación de zapatas', cantidad: 1.5, unidad: 'm³' }],
      obraCivil: { hormigon: 1, mortero: 0.5, hierro8: 24, hierro6: 0, hierro42: 0, ladrilloHueco: 0, ladrilloComun: 0, excavacion: 1 },
      extras: [{ nombre: 'Tanza', cantidad: 1, unidad: 'rollo', precio: 5000 }],
    };
    const texto = textoParaCotizar(parte, undefined, 'Loft');
    expect(texto.split('\n')[0]).toBe('Hola, ¿me pasás precio de estos materiales? Son para: Tapial (Loft)');
    expect(texto).toContain('• 300 u — Ladrillo hueco 8');
    expect(texto).toMatch(/• \d+ bolsas de \d+ kg — Cemento/);
    expect(texto).toMatch(/— Hierro ø8 \(varillas de 12 m\)/);
    expect(texto).toContain('• 1 rollo — Tanza');
    expect(texto).not.toContain('Nada');
    expect(texto).not.toContain('Excavación'); // es trabajo, no material
    expect(texto).not.toContain('$');
    expect(texto).not.toContain('ø6'); // lo que no lleva no se pide
    // Las barras dicen su largo.
    expect(textoParaCotizar({ nombre: 'Tapial', renglones: [{ id: 'portonBastidor', nombre: 'Bastidor del portón', cantidad: 4, unidad: 'barra', largoBarra: 6 }], obraCivil: null, extras: [] }))
      .toContain('• 4 barras de 6 m — Bastidor del portón');
  });
});
