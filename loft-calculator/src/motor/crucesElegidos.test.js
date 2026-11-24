// Tests v1.88: cruces elegidos uno por uno y piezas agregadas editadas que no se perdían del presupuesto. npm test
import { describe, it, expect } from 'vitest';
import { claveCruce, normalizarCrucesElegidos, aOpcion, deOpcion, cambiarCrucesElegidos } from './crucesElegidos.js';
import { generarEstructura, listarPiezas } from './estructura.js';
import { aplicarEdicion } from './edicionPiezas.js';
import { unionesConMaterial } from './armado.js';
import { migrarParams } from './migracion.js';
import { CATALOGO_INICIAL, calcularPresupuesto } from './presupuesto.js';
import { PARAMS_INICIALES as P, ABERTURAS_INICIALES } from './parametrosIniciales.js';

const estructuraCon = (params) => generarEstructura(params, ABERTURAS_INICIALES, CATALOGO_INICIAL);
const base = estructuraCon(P);
// Un cruce de una transversal de piso con un tirante (el pedido de Leandro).
const transversal = Object.keys(base.crucesDePiezas).find((id) => id.startsWith('transv-piso'));
const cruceConTirante = base.crucesDePiezas[transversal].find((c) => c.tipoOtra === 'piso');
const tramosDe = (piezas, id) => piezas.filter((p) => p.id === id || p.id.startsWith(`${id}~`));

describe('v1.88: los cruces de cada pieza', () => {
  it('se anotan con la otra pieza, dónde y qué pasa', () => {
    expect(transversal).toBeTruthy();
    expect(cruceConTirante).toMatchObject({ clave: claveCruce(transversal, cruceConTirante.otra) });
    expect(['se corta', 'entera']).toContain(cruceConTirante.resultado);
    expect(cruceConTirante.punto).toHaveLength(3);
    // El mismo cruce, visto desde el tirante, tiene la misma clave.
    expect(base.crucesDePiezas[cruceConTirante.otra].some((c) => c.clave === cruceConTirante.clave)).toBe(true);
  });

  it('"corta": pasa entera la elegida y se corta la otra, solo en ese cruce', () => {
    const { clave, otra } = cruceConTirante;
    const pasaTirante = listarPiezas(estructuraCon({ ...P, crucesElegidos: { [clave]: { forma: 'corta', entera: otra } } }));
    const pasaTransversal = listarPiezas(estructuraCon({ ...P, crucesElegidos: { [clave]: { forma: 'corta', entera: transversal } } }));
    // (si la transversal termina contra el tirante, "cortarse" es quedar más corta: se mide el largo, no los tramos)
    const metros = (piezas, id) => tramosDe(piezas, id).reduce((a, p) => a + p.largo, 0);
    expect(metros(pasaTransversal, transversal)).toBeGreaterThan(metros(pasaTirante, transversal) + 0.03);
    expect(metros(pasaTirante, otra)).toBeGreaterThan(metros(pasaTransversal, otra) + 0.03);
    const cortes = (piezas, id) => tramosDe(piezas, id).reduce((a, p) => a + (p.cortesEnCruces ?? 0), 0);
    expect(cortes(pasaTransversal, otra)).toBeGreaterThan(cortes(pasaTirante, otra));
  });

  it('"debajo": no se cortan y la que se mueve baja (o sube) lo que miden las dos / 2', () => {
    const { clave, otra } = cruceConTirante;
    const y = (piezas, id) => tramosDe(piezas, id)[0].desde[1];
    const antes = listarPiezas(base);
    const baja = estructuraCon({ ...P, crucesElegidos: { [clave]: { forma: 'debajo', abajo: transversal, mueve: transversal } } });
    const piezas = listarPiezas(baja);
    expect(y(piezas, transversal)).toBeLessThan(y(antes, transversal) - 0.03);
    expect(y(piezas, otra)).toBeCloseTo(y(antes, otra), 6);
    expect(baja.crucesDePiezas[transversal].find((c) => c.clave === clave).resultado).toBe('debajo');
    expect(baja.crucesDePiezas[otra].find((c) => c.clave === clave).resultado).toBe('arriba');
    expect(tramosDe(piezas, transversal)[0].corridaDebajo).toBeLessThan(0);
    // Sube la de arriba: la transversal queda donde estaba.
    const sube = listarPiezas(estructuraCon({ ...P, crucesElegidos: { [clave]: { forma: 'debajo', abajo: transversal, mueve: otra } } }));
    expect(y(sube, transversal)).toBeCloseTo(y(antes, transversal), 6);
    expect(y(sube, otra)).toBeGreaterThan(y(antes, otra) + 0.03);
  });

  it('la unión elegida en un cruce manda sobre la de la pieza', () => {
    const piezas = listarPiezas(base);
    const cortada = piezas.find((p) => p.cortesCon?.length);
    const [clave, ...resto] = cortada.cortesCon;
    const id = cortada.id.split('~')[0];
    const total = piezas.filter((p) => p.id.split('~')[0] === id).reduce((a, p) => a + (p.cortesCon?.length ?? 0), 0);
    expect(unionesConMaterial(piezas, { [id]: 'cubrejunta' }, { [clave]: { union: 'chapa' } })).toMatchObject({ chapa: 1, cubrejunta: total - 1 });
    expect(resto.length).toBe(cortada.cortesCon.length - 1);
  });
});

describe('v1.88: opciones de la lista y lo que se guarda', () => {
  it('ida y vuelta entre lo guardado y la opción del <select>', () => {
    const cambio = deOpcion('debajo:esta:otra', 'a~2', 'b');
    expect(cambio).toEqual({ forma: 'debajo', abajo: 'a', mueve: 'b' });
    expect(aOpcion(cambio, 'a')).toBe('debajo:esta:otra');
    expect(aOpcion(cambio, 'b')).toBe('debajo:otra:esta');
    expect(deOpcion('', 'a', 'b')).toEqual({});
  });

  it('cambiar la forma conserva la unión, y volver a la regla con soldada borra el cruce', () => {
    let c = cambiarCrucesElegidos({}, { 'a|b': { union: 'chapa' } });
    c = cambiarCrucesElegidos(c, { 'a|b': { forma: 'corta', entera: 'a' } });
    expect(c['a|b']).toEqual({ forma: 'corta', entera: 'a', union: 'chapa' });
    c = cambiarCrucesElegidos(c, { 'a|b': { forma: 'debajo', abajo: 'a', mueve: 'a' } }); // debajo: sin unión
    expect(c['a|b']).toEqual({ forma: 'debajo', abajo: 'a', mueve: 'a' });
    c = cambiarCrucesElegidos(c, { 'a|b': {} });
    expect(c).toEqual({});
  });

  it('se guarda limpio', () => {
    expect(normalizarCrucesElegidos({ 'a|b': { forma: 'corta', entera: 'z' }, 'c|d': { forma: 'debajo', abajo: 'c', mueve: 'd', union: 'chapa' },
      'e|f': { union: 'cubrejunta' }, x: { union: 'chapa' } })).toEqual({ 'c|d': { forma: 'debajo', abajo: 'c', mueve: 'd' }, 'e|f': { union: 'cubrejunta' } });
    expect(migrarParams({ ...P }).crucesElegidos).toEqual({});
  });
});

describe('v1.88: una pieza agregada que se mueve sigue en el presupuesto (Leandro: "Borde de piso 7,58 m no está unida")', () => {
  const columna = listarPiezas(base).find((p) => p.tipo === 'columna' && !p.esquina);
  const agregada = { id: 'agr:1', tipo: 'solera', grupos: ['A'], desde: [-1, 1, 2.25], hasta: [1, 1, 2.25], insumo: 'columna' };
  const conAgregada = (edicion) => ({ ...P, piezasAgregadas: [agregada], piezasEditadas: edicion ? { 'agr:1': edicion } : {} });
  it('al editarla conserva su renglón, que es agregada y lo demás que dice qué es', () => {
    const editada = aplicarEdicion({ ...columna, insumo: 'columna', agregada: true, madera: true, nivel: 'piso2' }, { moverY: 0.2 });
    expect(editada).toMatchObject({ insumo: 'columna', agregada: true, madera: true, nivel: 'piso2', editada: true });
    expect(aplicarEdicion({ ...columna, insumo: 'columna' }, { perfil: 'marco' }).insumo).toBe('marco');
  });

  it('movida, sigue en la hoja de corte; con un perfil de la lista elegido, va con ese perfil', () => {
    const perfilDeColumna = CATALOGO_INICIAL.find((i) => i.id === CATALOGO_INICIAL.find((u) => u.id === 'columna').perfilId);
    const otroPerfil = CATALOGO_INICIAL.find((i) => i.categoria === 'hierro' && i.id !== perfilDeColumna.id && i.largoBarra >= 2.1);
    const grupoDe = (perfilId) => calcularPresupuesto(estructuraCon(conAgregada({ moverY: 0.2, perfilLista: perfilId })), CATALOGO_INICIAL, { proveedor: 'prov-1' })
      .gruposCortes.find((g) => g.cortes.barras.some((b) => (b.ids ?? []).includes('agr:1')));
    const sinEditar = calcularPresupuesto(estructuraCon(conAgregada(null)), CATALOGO_INICIAL, { proveedor: 'prov-1' }).gruposCortes
      .find((g) => g.cortes.barras.some((b) => (b.ids ?? []).includes('agr:1')));
    const movida = calcularPresupuesto(estructuraCon(conAgregada({ moverY: 0.2 })), CATALOGO_INICIAL, { proveedor: 'prov-1' }).gruposCortes
      .find((g) => g.cortes.barras.some((b) => (b.ids ?? []).includes('agr:1')));
    expect(sinEditar).toBeTruthy();
    expect(movida?.perfil).toBe(sinEditar.perfil); // antes de la v1.88: undefined (se perdía)
    expect(grupoDe(otroPerfil.id)?.perfil).not.toBe(sinEditar.perfil);
  });
});
