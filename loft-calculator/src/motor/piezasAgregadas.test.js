// Tests de piezas duplicadas a mano (v1.16). Correr con: npm test
import { describe, it, expect } from 'vitest';
import { duplicarPieza, idNuevaAgregada, revisarAgregadas, insumoDePieza } from './piezasAgregadas.js';
import { generarEstructura, listarPiezas } from './estructura.js';
import { calcularPresupuesto, CATALOGO_INICIAL } from './presupuesto.js';
import { validarParametros } from './validacion.js';
import { migrarParams } from './migracion.js';
import { PERFILES_ASIGNABLES } from './edicionPiezas.js';
import { INSUMO } from './constantes.js';
import { PARAMS_INICIALES as P } from './parametrosIniciales.js';

const e = generarEstructura(P, []);
const columnaFrente = e.columnas.find((c) => c.id === 'col:-125,225'); // sobre el frente (A, en x)
const columnaLateral = e.columnas.find((c) => c.grupos.includes('B') && !c.grupos.includes('A') && !c.grupos.includes('C'));
const horizontal = e.correas.find((c) => c.grupos.includes('A'));
const tirante = e.piso.tirantes[0];

describe('duplicar una pieza', () => {
  it('columna del frente: la copia va 50 cm a lo largo de la pared, en el renglón Columnas', () => {
    const copia = duplicarPieza(columnaFrente, []);
    expect(copia.id).toBe('agr:1');
    expect(copia.desde[0]).toBeCloseTo(columnaFrente.desde[0] + 0.5);
    expect(copia.desde[2]).toBeCloseTo(columnaFrente.desde[2]);
    expect(copia.insumo).toBe(INSUMO.COLUMNA);
  });

  it('columna de un lateral: se corre en z (a lo largo de esa pared)', () => {
    const copia = duplicarPieza(columnaLateral, []);
    expect(copia.desde[2]).toBeCloseTo(columnaLateral.desde[2] + 0.5);
  });

  it('horizontal de pared: 50 cm más arriba; tirante: de costado', () => {
    expect(duplicarPieza(horizontal, []).desde[1]).toBeCloseTo(horizontal.desde[1] + 0.5);
    const copia = duplicarPieza(tirante, []);
    expect(copia.desde[1]).toBeCloseTo(tirante.desde[1]);
    expect(Math.hypot(copia.desde[0] - tirante.desde[0], copia.desde[2] - tirante.desde[2])).toBeCloseTo(0.5);
  });

  it('columna de esquina: la copia va hacia el centro (no afuera de la casa) y queda solo en esa pared', () => {
    const esquinaDerecha = e.columnas.find((c) => c.id === 'col:375,225'); // frente y lateral derecho
    const copia = duplicarPieza(esquinaDerecha, []);
    expect(copia.desde[0]).toBeCloseTo(3.75 - 0.5);
    expect(copia.grupos).toEqual(['A']);
  });

  it('ids nuevos y renglón de una pieza ya pasada a otro perfil', () => {
    expect(idNuevaAgregada([{ id: 'agr:1' }, { id: 'agr:7' }])).toBe('agr:8');
    expect(insumoDePieza({ ...horizontal, insumo: INSUMO.COLUMNA })).toBe(INSUMO.COLUMNA);
  });
});

describe('piezas agregadas en la estructura y el presupuesto', () => {
  const copia = duplicarPieza(columnaFrente, []);
  const conCopia = { ...P, piezasAgregadas: [copia] };
  const e2 = generarEstructura(conCopia, []);
  const columnas = (est) => calcularPresupuesto(est, CATALOGO_INICIAL).items.find((i) => i.id === INSUMO.COLUMNA);

  it('aparece en la lista de piezas y se cotiza en su renglón', () => {
    expect(listarPiezas(e2).some((p) => p.id === 'agr:1' && p.agregada)).toBe(true);
    const piezas = (est) => columnas(est).cortes.barras.flatMap((b) => b.piezas).length;
    expect(piezas(e2)).toBe(piezas(e) + 1);
  });

  it('se puede editar (recortar) con piezasEditadas', () => {
    const editada = generarEstructura({ ...conCopia, piezasEditadas: { 'agr:1': { recorteFin: 1 } } }, []);
    expect(listarPiezas(editada).find((p) => p.id === 'agr:1').largo).toBeCloseTo(columnaFrente.largo - 1);
  });

  it('es válido; lo roto no', () => {
    expect(validarParametros(conCopia)).toEqual({});
    expect(revisarAgregadas([{ ...copia, insumo: 'inventado' }], PERFILES_ASIGNABLES)).toMatch(/perfil/);
    expect(revisarAgregadas([copia, copia], PERFILES_ASIGNABLES)).toMatch(/id/);
    expect(revisarAgregadas([{ ...copia, hasta: copia.desde }], PERFILES_ASIGNABLES)).toMatch(/largo/);
  });

  it('un proyecto de antes de v1.16 abre sin piezas agregadas', () => {
    const { piezasAgregadas, ...viejo } = P; // eslint-disable-line no-unused-vars
    expect(migrarParams(viejo).piezasAgregadas).toEqual([]);
  });
});
