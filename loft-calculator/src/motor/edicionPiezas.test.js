// Tests de edición de piezas sueltas (recortar, mover, cambiar perfil). Correr con: npm test
import { describe, it, expect } from 'vitest';
import {
  aplicarEdicion, revisarEdicion, revisarEdicionDePieza, esEdicionVacia, esVertical, EDICION_VACIA,
} from './edicionPiezas.js';
import { generarEstructura, listarPiezas } from './estructura.js';
import { calcularPresupuesto, CATALOGO_INICIAL } from './presupuesto.js';
import { validarParametros } from './validacion.js';
import { migrarParams } from './migracion.js';
import { INSUMO } from './constantes.js';
import { PARAMS_INICIALES as P, ABERTURAS_INICIALES } from './parametrosIniciales.js';

// Columna del centro del altillo (borde del entrepiso): va del piso (0,50) al techo (5,225).
const ID_COLUMNA_ALTILLO = 'col:-75,0';
const conEdicion = (edicion) => ({ ...P, piezasEditadas: { [ID_COLUMNA_ALTILLO]: edicion } });
const columna = (e) => listarPiezas(e).find((p) => p.id === ID_COLUMNA_ALTILLO);

describe('aplicarEdicion (pieza suelta)', () => {
  const original = { id: 'x', tipo: 'columna', grupos: ['A'], desde: [0, 0, 0], hasta: [0, 3, 0], largo: 3 };

  it('recorta desde cada extremo sobre su propio eje', () => {
    const p = aplicarEdicion(original, { recorteInicio: 0.5, recorteFin: 1 });
    expect(p.desde).toEqual([0, 0.5, 0]);
    expect(p.hasta).toEqual([0, 2, 0]);
    expect(p.largo).toBeCloseTo(1.5);
    expect(p.editada).toBe(true);
  });

  it('mueve en X, Y, Z sin cambiar el largo', () => {
    const p = aplicarEdicion(original, { moverX: 0.2, moverY: -0.1, moverZ: 0.3 });
    expect(p.desde).toEqual([0.2, -0.1, 0.3]);
    expect(p.largo).toBeCloseTo(3);
  });

  it('cambiar el perfil marca el renglón del catálogo', () => {
    expect(aplicarEdicion(original, { perfil: INSUMO.COLUMNA_ESCALERA }).insumo).toBe(INSUMO.COLUMNA_ESCALERA);
    expect(aplicarEdicion(original, {})).not.toHaveProperty('insumo');
  });

  it('si el recorte la dejaría sin largo (cambió una medida), se ignora el recorte y se avisa', () => {
    const p = aplicarEdicion(original, { recorteInicio: 2, recorteFin: 2, moverX: 1 });
    expect(p.largo).toBeCloseTo(3);
    expect(p.desde[0]).toBe(1); // el movimiento sí se aplica
    expect(p.recorteIgnorado).toBe(true);
  });

  it('revisa la edición contra la pieza y descarta datos raros', () => {
    expect(revisarEdicionDePieza(original, { recorteInicio: 1.5, recorteFin: 1.5 })).toMatch(/queda en 0\.00 m/);
    expect(revisarEdicionDePieza(original, { recorteFin: 1 })).toBeNull();
    expect(revisarEdicion({ moverX: 9 })).toMatch(/hasta 5 m/);
    expect(revisarEdicion({ recorteInicio: -1 })).toMatch(/recorte/);
    expect(revisarEdicion({ perfil: 'cualquiera' })).toMatch(/Perfil/);
    expect(revisarEdicion({ color: 'rojo' })).toMatch(/desconocidos/);
  });

  it('edición vacía y piezas verticales', () => {
    expect(esEdicionVacia(EDICION_VACIA)).toBe(true);
    expect(esEdicionVacia({ moverY: 0.1 })).toBe(false);
    expect(esVertical(original)).toBe(true);
    expect(esVertical({ ...original, hasta: [3, 0, 0] })).toBe(false);
  });
});

describe('ediciones en la estructura y el presupuesto', () => {
  const base = generarEstructura(P, ABERTURAS_INICIALES);

  it('la columna del altillo cortada a la altura del piso 2 no sigue hasta el techo', () => {
    const original = columna(base);
    const recorte = original.hasta[1] - base.entrepiso.y; // lo que sobra arriba del piso 2
    const e = generarEstructura(conEdicion({ recorteFin: recorte }), ABERTURAS_INICIALES);
    expect(columna(e).hasta[1]).toBeCloseTo(base.entrepiso.y);
    expect(columna(e).largo).toBeCloseTo(original.largo - recorte);
    expect(e.editadasEncontradas.map((p) => p.id)).toEqual([ID_COLUMNA_ALTILLO]);
    expect(e.editadasEncontradas[0].largo).toBeCloseTo(original.largo); // se informa la original
  });

  it('el presupuesto cotiza la pieza recortada (menos metros de columna)', () => {
    // v1.28: la columna del altillo es del entrepiso (renglón Columnas del entrepiso).
    const metros = (e) => calcularPresupuesto(e, CATALOGO_INICIAL).items.find((i) => i.id === INSUMO.COLUMNA_ENTREPISO).largosPiezas.reduce((x, l) => x + l, 0); // sus piezas (las barras pueden ser compartidas)
    const e = generarEstructura(conEdicion({ recorteFin: 2 }), ABERTURAS_INICIALES);
    expect(metros(base) - metros(e)).toBeCloseTo(2);
  });

  it('cambiar el perfil pasa la pieza de renglón', () => {
    const items = (e) => calcularPresupuesto(e, CATALOGO_INICIAL).items;
    const piezasDe = (e, id) => items(e).find((i) => i.id === id).cortes.barras.flatMap((b) => b.piezas).length;
    const e = generarEstructura(conEdicion({ perfil: INSUMO.ZANCA }), ABERTURAS_INICIALES);
    expect(piezasDe(e, INSUMO.COLUMNA_ENTREPISO)).toBe(piezasDe(base, INSUMO.COLUMNA_ENTREPISO) - 1);
    expect(piezasDe(e, INSUMO.ZANCA)).toBe(piezasDe(base, INSUMO.ZANCA) + 1);
  });

  it('eliminar le gana a editar', () => {
    const e = generarEstructura({ ...conEdicion({ recorteFin: 1 }), piezasEliminadas: [ID_COLUMNA_ALTILLO] }, ABERTURAS_INICIALES);
    expect(columna(e)).toBeUndefined();
    expect(e.editadasEncontradas).toEqual([]);
  });

  it('validación de params.piezasEditadas', () => {
    expect(validarParametros(conEdicion({ recorteFin: 1 }))).toEqual({});
    expect(validarParametros(conEdicion({ moverX: 99 }))).toHaveProperty('piezasEditadas');
    expect(validarParametros({ ...P, piezasEditadas: [] })).toHaveProperty('piezasEditadas');
  });
});

describe('etiquetas de las paredes en el 3D', () => {
  it('por defecto: nombre automático y visible', () => {
    expect(P.paredes.A.etiqueta).toBe('');
    expect(P.paredes.A.mostrarEtiqueta).toBe(true);
  });

  it('valida el largo del texto', () => {
    const conEtiqueta = (etiqueta) => ({ ...P, paredes: { ...P.paredes, A: { ...P.paredes.A, etiqueta } } });
    expect(validarParametros(conEtiqueta('Cocina'))).toEqual({});
    expect(validarParametros(conEtiqueta('x'.repeat(31)))).toHaveProperty(['paredes.A.etiqueta']);
  });

  it('un proyecto anterior se abre con etiquetas automáticas y sin piezas editadas', () => {
    const paredesViejas = Object.fromEntries(Object.entries(P.paredes).map(([l, { etiqueta, mostrarEtiqueta, ...resto }]) => [l, resto])); // eslint-disable-line no-unused-vars
    const { piezasEditadas, ...viejo } = { ...P, paredes: paredesViejas }; // eslint-disable-line no-unused-vars
    const m = migrarParams(viejo);
    expect(m.paredes.B).toMatchObject({ etiqueta: '', mostrarEtiqueta: true });
    expect(m.piezasEditadas).toEqual({});
    expect(validarParametros(m)).toEqual({});
  });
});
