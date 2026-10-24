// Tests de perfiles por pared y columnas de esquina (v1.22). Correr con: npm test
import { describe, it, expect } from 'vitest';
import { generarEstructura, listarPiezas } from './estructura.js';
import { calcularPresupuesto, CATALOGO_INICIAL } from './presupuesto.js';
import { normalizarCatalogo, migrarParams } from './migracion.js';
import { validarParametros } from './validacion.js';
import { PARAMS_INICIALES as P } from './parametrosIniciales.js';
import { INSUMO } from './constantes.js';
import { nombrePerfil } from './perfiles.js';

// Un perfil de la lista de fábrica que no sea el de las columnas (el 80x80 de la escalera).
const perfil80 = CATALOGO_INICIAL.find((i) => i.categoria === 'hierro' && nombrePerfil(i) === 'Caño estructural 80x80x2.0');
const conPared = (lado, cambios) => ({ ...P, paredes: { ...P.paredes, [lado]: { ...P.paredes[lado], ...cambios } } });
const renglon = (r, id) => r.items.find((i) => i.id === id);

describe('columnas de esquina', () => {
  it('las 4 esquinas van a su renglón (son de dos paredes)', () => {
    const e = generarEstructura(P, []);
    expect(e.columnas.filter((p) => p.esquina)).toHaveLength(4);
    const r = calcularPresupuesto(e, CATALOGO_INICIAL);
    expect(renglon(r, INSUMO.COLUMNA_ESQUINA).largosPiezas).toHaveLength(4);
  });

  it('proyectos viejos: el renglón de esquina arranca con el perfil y precio de sus Columnas', () => {
    const viejo = [{ id: 'columna', categoria: 'perfil', perfil: 'Caño estructural 80x80x2', precio: 30000, largoBarra: 6 }];
    const c = normalizarCatalogo(viejo);
    const col = c.find((i) => i.id === INSUMO.COLUMNA);
    const esq = c.find((i) => i.id === INSUMO.COLUMNA_ESQUINA);
    expect(esq.perfilId).toBe(col.perfilId);
  });

  it('la copia de Columnas no cuenta como un precio más al armar la lista (caso de Leandro, 20/10)', () => {
    const t = (id, perfil, precio) => ({ id, categoria: 'perfil', perfil, precio, largoBarra: 6 });
    const c = normalizarCatalogo([
      t('columna', 'Caño estructural 80x80x2.0', 38000), t('zanca', 'Caño estructural 80x80x2.0', 42000),
      t('columnaEscalera', 'Caño estructural 80x80x2.0', 30000),
    ]);
    const cano = c.find((i) => i.categoria === 'hierro' && i.id === c.find((x) => x.id === 'columna').perfilId);
    // Tres precios, uno cada uno: empate => el más alto, y aviso para revisarlo.
    expect(cano).toMatchObject({ precio: 42000, revisarPrecio: true });
    // La esquina usa el mismo perfil que Columnas (no se arma uno propio con el texto de fábrica).
    expect(c.find((x) => x.id === 'columnaEsquina').perfilId).toBe(cano.id);
  });
});

describe('perfil propio de una pared', () => {
  it('columnas del lado B con otro perfil: renglón "Columnas (lado B)" con ese perfil y precio', () => {
    const params = conPared('B', { perfilColumnas: perfil80.id });
    const e = generarEstructura(params, []);
    const deB = e.columnas.filter((p) => !p.esquina && p.grupos.includes('B'));
    expect(deB.length).toBeGreaterThan(0);
    expect(deB.every((p) => p.perfilPared === perfil80.id)).toBe(true);
    const r = calcularPresupuesto(e, CATALOGO_INICIAL);
    const deLado = renglon(r, `${INSUMO.COLUMNA}@${perfil80.id}`);
    expect(deLado).toMatchObject({ nombre: 'Columnas (lado B)', perfil: 'Caño estructural 80x80x2.0', precio: perfil80.precio, perfilId: perfil80.id });
    expect(deLado.largosPiezas).toHaveLength(deB.length);
    // Ninguna columna se pierde ni se cuenta dos veces.
    const total = ['columna', 'columnaEsquina', `columna@${perfil80.id}`].reduce((a, id) => a + renglon(r, id).largosPiezas.length, 0);
    expect(total).toBe(e.columnas.length);
    // El renglón de pared queda justo debajo de Columnas.
    const ids = r.items.map((i) => i.id);
    expect(ids.indexOf(`columna@${perfil80.id}`)).toBe(ids.indexOf('columna') + 1);
  });

  it('horizontales, montantes y marcos (solera + marco de piso) de una pared', () => {
    const params = conPared('C', {
      perfilHorizontales: perfil80.id, perfilMontantes: perfil80.id, perfilMarcos: perfil80.id, separacionMontantes: 0.6,
    });
    const e = generarEstructura(params, []);
    const r = calcularPresupuesto(e, CATALOGO_INICIAL);
    expect(renglon(r, `${INSUMO.CORREA}@${perfil80.id}`).largosPiezas).toHaveLength(e.correas.filter((p) => p.grupos.includes('C')).length);
    expect(renglon(r, `${INSUMO.MONTANTE}@${perfil80.id}`).largosPiezas.length).toBeGreaterThan(0);
    // v1.28: la solera va en Soleras y el marco de piso en Bordes de piso, los dos con el perfil de la pared.
    expect(renglon(r, `${INSUMO.MARCO}@${perfil80.id}`).largosPiezas).toHaveLength(1); // solera:C
    expect(renglon(r, `${INSUMO.BORDE_PISO}@${perfil80.id}`).largosPiezas).toHaveLength(1); // marco-piso:C
  });

  it('el mismo perfil que el general o uno que ya no existe: no hay renglón aparte', () => {
    const general = CATALOGO_INICIAL.find((i) => i.id === INSUMO.COLUMNA).perfilId;
    for (const id of [general, 'perfil-que-no-existe']) {
      const r = calcularPresupuesto(generarEstructura(conPared('B', { perfilColumnas: id }), []), CATALOGO_INICIAL);
      expect(r.items.some((i) => i.id.startsWith('columna@'))).toBe(false);
    }
  });

  it('una columna recortada a mano sigue con el perfil de su pared', () => {
    const params = conPared('B', { perfilColumnas: perfil80.id });
    const col = generarEstructura(params, []).columnas.find((p) => !p.esquina && p.grupos.includes('B'));
    const editada = generarEstructura({ ...params, piezasEditadas: { [col.id]: { recorteFin: 0.5 } } }, []);
    const p = listarPiezas(editada).find((x) => x.id === col.id);
    expect(p).toMatchObject({ editada: true, perfilPared: perfil80.id });
  });

  it('proyectos viejos abren con el perfil general en todas las paredes y son válidos', () => {
    const { perfilColumnas, perfilHorizontales, perfilMontantes, perfilMarcos, ...vieja } = P.paredes.A; // eslint-disable-line no-unused-vars
    const m = migrarParams({ ...P, paredes: { A: vieja, B: vieja, C: vieja, D: vieja } });
    expect(m.paredes.B).toMatchObject({ perfilColumnas: '', perfilHorizontales: '', perfilMontantes: '', perfilMarcos: '' });
    expect(validarParametros(m)).toEqual({});
  });
});
