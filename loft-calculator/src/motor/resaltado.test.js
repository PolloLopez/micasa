// Tests de qué se resalta en el 3D (v1.27). Correr con: npm test
import { describe, it, expect } from 'vitest';
import { compraDePieza, piezaResaltada, contarResaltadas, mismoCriterio } from './resaltado.js';
import { generarEstructura, listarPiezas } from './estructura.js';
import { calcularPresupuesto, CATALOGO_INICIAL } from './presupuesto.js';
import { PARAMS_INICIALES as P, ABERTURAS_INICIALES } from './parametrosIniciales.js';
import { INSUMO } from './constantes.js';

// Pared B con columnas de otro perfil (v1.22): sus columnas van a un renglón aparte.
const otroPerfil = CATALOGO_INICIAL.find((i) => i.categoria === 'hierro'
  && i.id !== CATALOGO_INICIAL.find((u) => u.id === INSUMO.COLUMNA).perfilId);
const params = { ...P, paredes: { ...P.paredes, B: { ...P.paredes.B, perfilColumnas: otroPerfil.id, separacionMontantes: 0.6 } } };
const e = generarEstructura(params, ABERTURAS_INICIALES);
const piezas = listarPiezas(e);

describe('renglón y perfil de cada pieza', () => {
  it('cada renglón del presupuesto tiene exactamente las piezas que se resaltan con él', () => {
    const { items } = calcularPresupuesto(e, CATALOGO_INICIAL);
    const conPiezas = items.filter((i) => i.largosPiezas?.length > 0);
    expect(conPiezas.length).toBeGreaterThan(5);
    conPiezas.forEach((item) => {
      expect(contarResaltadas(piezas, { tipo: 'renglon', id: item.id }, CATALOGO_INICIAL), item.id).toBe(item.largosPiezas.length);
    });
    // Y ninguna pieza queda sin renglón.
    const suma = conPiezas.reduce((a, i) => a + i.largosPiezas.length, 0);
    expect(suma).toBe(piezas.filter((p) => compraDePieza(p, CATALOGO_INICIAL).renglon).length);
  });

  it('las columnas de la pared B salen con su perfil propio', () => {
    const deB = piezas.find((p) => p.tipo === 'columna' && !p.esquina && p.ladoPared === 'B');
    expect(compraDePieza(deB, CATALOGO_INICIAL)).toEqual({ renglon: `${INSUMO.COLUMNA}@${otroPerfil.id}`, perfil: otroPerfil.id });
    expect(piezaResaltada(deB, { tipo: 'perfil', id: otroPerfil.id }, CATALOGO_INICIAL)).toBe(true);
    // Una columna de esquina usa su propio renglón.
    const esquina = piezas.find((p) => p.esquina);
    expect(compraDePieza(esquina, CATALOGO_INICIAL).renglon).toBe(INSUMO.COLUMNA_ESQUINA);
  });

  it('una pieza con perfil elegido a mano va con ese', () => {
    const columna = piezas.find((p) => p.tipo === 'columna' && p.ladoPared === 'B');
    expect(compraDePieza({ ...columna, insumo: INSUMO.ZANCA }, CATALOGO_INICIAL).renglon).toBe(INSUMO.ZANCA);
  });
});

describe('criterios', () => {
  it('una pared: sus piezas y su marco de piso', () => {
    const deA = piezas.filter((p) => piezaResaltada(p, { tipo: 'grupo', id: 'A' }, CATALOGO_INICIAL));
    expect(deA.some((p) => p.id === 'marco-piso:A')).toBe(true);
    expect(deA.every((p) => p.grupos.includes('A') || p.id === 'marco-piso:A')).toBe(true);
  });

  it('varios grupos juntos (la tarjeta Pisos: piso y entrepiso)', () => {
    const pisos = contarResaltadas(piezas, { tipo: 'grupo', id: ['piso', 'piso2'] }, CATALOGO_INICIAL);
    const soloPiso = contarResaltadas(piezas, { tipo: 'grupo', id: 'piso' }, CATALOGO_INICIAL);
    expect(pisos).toBeGreaterThan(soloPiso);
    expect(mismoCriterio({ tipo: 'grupo', id: ['piso', 'piso2'] }, { tipo: 'grupo', id: ['piso', 'piso2'] })).toBe(true);
  });

  it('sin criterio no se resalta nada', () => {
    expect(piezaResaltada(piezas[0], null, CATALOGO_INICIAL)).toBe(false);
    expect(contarResaltadas(piezas, null, CATALOGO_INICIAL)).toBe(0);
  });

  it('mismoCriterio compara tipo e id', () => {
    expect(mismoCriterio({ tipo: 'grupo', id: 'A' }, { tipo: 'grupo', id: 'A' })).toBe(true);
    expect(mismoCriterio({ tipo: 'grupo', id: 'A' }, { tipo: 'perfil', id: 'A' })).toBe(false);
    expect(mismoCriterio(null, null)).toBe(true);
    expect(mismoCriterio(null, { tipo: 'grupo', id: 'A' })).toBe(false);
  });
});
