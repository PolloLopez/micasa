// Tests del armado en obra (v1.83): fierros instalados, medidas verificadas, alargar piezas. Correr con: npm test
import { describe, it, expect } from 'vitest';
import { normalizarAvance, marcarPiezas, gruposDeArmado, resumenDeArmado, errorDeMedidaReal, zonaDePieza } from './armado.js';
import { aplicarEdicion, revisarEdicionDePieza, ALARGAR_MAXIMO } from './edicionPiezas.js';
import { generarEstructura, listarPiezas } from './estructura.js';
import { migrarParams } from './migracion.js';
import { PARAMS_INICIALES as P, ABERTURAS_INICIALES } from './parametrosIniciales.js';

const piezas = listarPiezas(generarEstructura(P, ABERTURAS_INICIALES));

describe('fierros instalados y medidas verificadas', () => {
  it('se marcan de a una o de a grupos, y se desmarcan', () => {
    const columnasA = piezas.filter((p) => p.tipo === 'columna' && zonaDePieza(p) === 'A').map((p) => p.id);
    expect(columnasA.length).toBeGreaterThan(1);
    let a = marcarPiezas({}, columnasA, 'instalada', true);
    a = marcarPiezas(a, [columnasA[0]], 'verificada', true);
    expect(a[columnasA[0]]).toEqual({ instalada: true, verificada: true });
    a = marcarPiezas(a, [columnasA[0]], 'instalada', false);
    expect(a[columnasA[0]]).toEqual({ verificada: true });
    a = marcarPiezas(a, [columnasA[0]], 'verificada', false);
    expect(a[columnasA[0]]).toBeUndefined(); // sin nada, no se guarda
    const r = resumenDeArmado(piezas, a);
    expect(r.instaladas).toBe(columnasA.length - 1);
    expect(r.porcentaje).toBe(Math.round(((columnasA.length - 1) / piezas.length) * 100));
  });

  it('la lista va por zona (paredes primero) y por tipo, con lo puesto de cada grupo', () => {
    const avance = marcarPiezas({}, piezas.filter((p) => zonaDePieza(p) === 'B').map((p) => p.id), 'instalada', true);
    const grupos = gruposDeArmado(piezas, avance);
    expect(grupos[0].zona).toBe('A');
    const b = grupos.find((g) => g.zona === 'B');
    expect(b.instaladas).toBe(b.total);
    expect(b.tipos.find((t) => t.nombre === 'Columna').instaladas).toBeGreaterThan(0);
    expect(grupos.reduce((n, g) => n + g.total, 0)).toBe(piezas.length); // ninguna se pierde
  });

  it('se guarda con el proyecto; lo raro no', () => {
    expect(normalizarAvance({ x: { instalada: true, medidaReal: 2.4, otra: 1 }, y: { instalada: 'si' }, z: null })).toEqual({ x: { instalada: true, medidaReal: 2.4 } });
    expect(migrarParams({ ...P, avancePiezas: undefined }).avancePiezas).toEqual({});
  });
});

describe('alargar piezas y la medida real', () => {
  const p = piezas.find((x) => x.tipo === 'columna');
  it('una punta se puede alargar (recorte negativo) hasta 3 m', () => {
    const larga = aplicarEdicion(p, { recorteFin: -0.25 });
    expect(larga.largo).toBeCloseTo(p.largo + 0.25, 6);
    expect(revisarEdicionDePieza(p, { recorteFin: -0.25 })).toBeNull();
    expect(revisarEdicionDePieza(p, { recorteFin: -(ALARGAR_MAXIMO + 1) })).toMatch(/se alarga hasta 3 m/);
  });
  it('la medida real deja la pieza de ese largo (más corta o más larga) aunque las uniones la estiren, con la punta del inicio fija', () => {
    const e = generarEstructura(P, ABERTURAS_INICIALES);
    const col = listarPiezas(e).find((x) => x.tipo === 'columna');
    for (const medida of [col.largo - 0.1, col.largo + 0.07]) {
      const q = listarPiezas(generarEstructura({ ...P, avancePiezas: { [col.id]: { medidaReal: medida } } }, ABERTURAS_INICIALES)).find((x) => x.id === col.id);
      expect(q.largo).toBeCloseTo(medida, 6);
      expect(q.desde).toEqual(col.desde);
      expect(q).toMatchObject({ medidaReal: true });
      expect(q.largoPlano).toBeCloseTo(col.largo, 6);
    }
    expect(errorDeMedidaReal(0.01)).toBeTruthy();
    expect(errorDeMedidaReal(2.4)).toBeNull();
  });
});

describe('v1.86: cruces y empalmes elegidos a mano', async () => {
  const { CATALOGO_INICIAL, calcularPresupuesto } = await import('./presupuesto.js');
  const { unionesConMaterial, normalizarEmpalmes, normalizarEnteras } = await import('./armado.js');
  const { INSUMO } = await import('./constantes.js');
  const piezasCon = (params) => listarPiezas(generarEstructura(params, ABERTURAS_INICIALES, CATALOGO_INICIAL));
  const base = piezasCon(P);

  it('una faja marcada "Entera" pasa de largo y las columnas que cruza se cortan', () => {
    const faja = 'horiz:A:1:2';
    expect(base.filter((p) => p.id.startsWith(`${faja}~`)).length).toBeGreaterThan(1); // de fábrica, cortada por las columnas
    const conEntera = piezasCon({ ...P, piezasEnteras: [faja] });
    expect(conEntera.filter((p) => p.id === faja)).toHaveLength(1); // ahora entera
    const columnasCortadas = (lista) => lista.filter((p) => p.tipo === 'columna' && p.id.includes('~')).length;
    expect(columnasCortadas(conEntera)).toBeGreaterThan(columnasCortadas(base));
  });

  it('las uniones con cubrejunta o chapa cuentan material (una por cruce donde se corta)', () => {
    const faja = base.find((p) => p.id.startsWith('horiz:A:1:2~'));
    const id = faja.id.split('~')[0];
    const cortes = base.filter((p) => p.id.startsWith(`${id}~`)).reduce((a, p) => a + (p.cortesEnCruces ?? 0), 0);
    expect(cortes).toBeGreaterThan(0);
    expect(unionesConMaterial(base, { [id]: 'cubrejunta' })).toEqual({ cubrejunta: cortes, chapa: 0 });
    const items = calcularPresupuesto(generarEstructura({ ...P, unionesPieza: { [id]: 'chapa' } }, ABERTURAS_INICIALES, CATALOGO_INICIAL), CATALOGO_INICIAL, { proveedor: 'prov-1' }).items;
    expect(items.find((i) => i.id === INSUMO.CHAPA_UNION)?.cantidad).toBe(cortes);
  });

  it('el empalme va donde lo elige Leandro (si los tramos entran en la barra)', () => {
    const e = generarEstructura({ ...P, empalmesPieza: { 'solera:A': { en: [3.1], hecho: true } } }, ABERTURAS_INICIALES, CATALOGO_INICIAL);
    const { gruposCortes } = calcularPresupuesto(e, CATALOGO_INICIAL, { proveedor: 'prov-1' });
    const empalme = gruposCortes.flatMap((g) => g.cortes.empalmes ?? []).find((x) => x.id === 'solera:A');
    expect(empalme.elegido).toBe(true);
    expect(empalme.tramos[0]).toBeCloseTo(3.1, 6);
    // A 0,5 m el otro tramo (7,1 m) no entra en una barra de 6: sigue el automático y avisa.
    const e2 = generarEstructura({ ...P, empalmesPieza: { 'solera:A': { en: [0.5] } } }, ABERTURAS_INICIALES, CATALOGO_INICIAL);
    const otro = calcularPresupuesto(e2, CATALOGO_INICIAL, { proveedor: 'prov-1' }).gruposCortes.flatMap((g) => g.cortes.empalmes ?? []).find((x) => x.id === 'solera:A');
    expect(otro).toMatchObject({ elegido: false, noEntra: true });
  });

  it('se guarda limpio', () => {
    expect(normalizarEnteras(['a', 'a', 3])).toEqual(['a']);
    expect(normalizarEmpalmes({ x: { en: [2.5, -1, 'a'], hecho: true }, y: { en: [] } })).toEqual({ x: { en: [2.5], hecho: true } });
    expect(migrarParams({ ...P, unionesPieza: { a: 'chapa', b: 'pegamento' } }).unionesPieza).toEqual({ a: 'chapa' });
  });
});

describe('v1.87: el perfil elegido a mano en una pieza manda sobre el de su pared', async () => {
  const { CATALOGO_INICIAL } = await import('./presupuesto.js');
  const { perfilDePieza } = await import('./coloresPerfil.js');
  it('una solera con perfil de pared y otro elegido a mano se compra (y se pinta) con el elegido', () => {
    const hierros = CATALOGO_INICIAL.filter((i) => i.categoria === 'hierro');
    const [deLaPared, aMano] = [hierros[0].id, hierros[1].id];
    const params = { ...P, paredes: { ...P.paredes, A: { ...P.paredes.A, perfilMarcos: deLaPared } } };
    const solera = (p) => listarPiezas(generarEstructura(p, ABERTURAS_INICIALES, CATALOGO_INICIAL)).find((x) => x.tipo === 'solera' && x.id.startsWith('solera:A'));
    expect(solera(params).perfilPared).toBe(deLaPared);
    const editada = solera({ ...params, piezasEditadas: { [solera(params).id]: { perfilLista: aMano } } });
    expect(editada.perfilPared).toBe(aMano);
    expect(perfilDePieza(editada, CATALOGO_INICIAL)).not.toBe(perfilDePieza(solera(params), CATALOGO_INICIAL));
  });
});
