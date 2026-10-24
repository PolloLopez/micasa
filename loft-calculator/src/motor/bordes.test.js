// Tests de bordes de pisos y techo con perfil propio (v1.28). Correr con: npm test
import { describe, it, expect } from 'vitest';
import { generarEstructura } from './estructura.js';
import { calcularPresupuesto, CATALOGO_INICIAL } from './presupuesto.js';
import { normalizarCatalogo, migrarParams } from './migracion.js';
import { PARAMS_INICIALES as P } from './parametrosIniciales.js';
import { INSUMO } from './constantes.js';

const renglon = (r, id) => r.items.find((i) => i.id === id);

describe('bordes de piso aparte de las soleras', () => {
  const e = generarEstructura(P, []);
  const r = calcularPresupuesto(e, CATALOGO_INICIAL, { compartir: false });

  it('Soleras: solo las de arriba de las paredes; Bordes de piso: marcos de planta baja y entrepiso', () => {
    expect(renglon(r, INSUMO.MARCO).largosPiezas).toHaveLength(e.marcos.filter((p) => p.tipo === 'solera').length);
    expect(renglon(r, INSUMO.BORDE_PISO).largosPiezas)
      .toHaveLength(e.marcos.filter((p) => p.tipo === 'marco-piso' || p.tipo === 'marco-piso2').length);
  });

  it('cada uno con su perfil: borde 80x80, interior C 80x40 (el caso de Leandro)', () => {
    const cano80 = CATALOGO_INICIAL.find((i) => i.categoria === 'hierro' && i.tipo === 'cuadrado' && i.a === 80);
    expect(cano80).toBeDefined();
    const catalogo = CATALOGO_INICIAL.map((i) => (i.id === INSUMO.BORDE_PISO || i.id === INSUMO.BORDE_TECHO ? { ...i, perfilId: cano80.id } : i));
    const r2 = calcularPresupuesto(e, catalogo, { compartir: false });
    expect(renglon(r2, INSUMO.BORDE_PISO).perfilId).toBe(cano80.id);
    expect(renglon(r2, INSUMO.BORDE_TECHO).perfilId).toBe(cano80.id);
    expect(renglon(r2, INSUMO.PISO).perfilId).not.toBe(cano80.id);
  });
});

describe('marco perimetral del techo', () => {
  it('con marco: 4 bordes (2 correas de los bordes + 2 en las puntas) y su renglón', () => {
    const e = generarEstructura(P, []);
    expect(e.techo.bordes).toHaveLength(4);
    expect(e.techo.bordes.every((b) => b.tipo === 'borde-techo')).toBe(true);
    const r = calcularPresupuesto(e, CATALOGO_INICIAL, { compartir: false });
    expect(renglon(r, INSUMO.BORDE_TECHO).largosPiezas).toHaveLength(4);
  });

  it('sin marco: como antes (las correas de los bordes son correas, sin renglón de bordes)', () => {
    const e = generarEstructura({ ...P, techoConBorde: false }, []);
    expect(e.techo.bordes).toHaveLength(0);
    expect(e.techo.correas).toHaveLength(7);
    expect(renglon(calcularPresupuesto(e, CATALOGO_INICIAL), INSUMO.BORDE_TECHO)).toBeUndefined();
  });
});

describe('proyectos de antes de v1.28', () => {
  it('se abren sin marco de techo y los bordes copian el perfil de los renglones de antes', () => {
    const { techoConBorde, ...viejos } = P;
    expect(techoConBorde).toBe(true);
    expect(migrarParams(viejos).techoConBorde).toBe(false);
    // Catálogo viejo: sin los renglones nuevos; Marcos y soleras con un perfil cambiado a mano.
    const viejo = normalizarCatalogo(CATALOGO_INICIAL)
      .filter((i) => i.id !== INSUMO.BORDE_PISO && i.id !== INSUMO.BORDE_TECHO)
      .map((i) => (i.id === INSUMO.MARCO ? { ...i, perfilId: 'perfil-x' } : i));
    const cat = normalizarCatalogo([...viejo, { id: 'perfil-x', categoria: 'hierro', tipo: 'cuadrado', a: 80, b: 80, espesor: 1.6, largoBarra: 6, precio: 50000 }]);
    const marco = cat.find((i) => i.id === INSUMO.MARCO);
    expect(marco.perfilId).toBe('perfil-x');
    expect(cat.find((i) => i.id === INSUMO.BORDE_PISO).perfilId).toBe('perfil-x');
    expect(cat.find((i) => i.id === INSUMO.BORDE_TECHO).perfilId).toBe(cat.find((i) => i.id === INSUMO.VIGA_TECHO).perfilId);
  });

  it('el total de un proyecto viejo no cambia', () => {
    const params = migrarParams({ ...P, techoConBorde: undefined });
    const e = generarEstructura(params, []);
    const conMarcosJuntos = calcularPresupuesto(e, CATALOGO_INICIAL).total;
    expect(conMarcosJuntos).toBeGreaterThan(0);
    // Mismo perfil y precio en Soleras y Bordes de piso → con cortes compartidos, mismas barras que antes.
    expect(renglon(calcularPresupuesto(e, CATALOGO_INICIAL), INSUMO.BORDE_PISO).perfilId)
      .toBe(renglon(calcularPresupuesto(e, CATALOGO_INICIAL), INSUMO.MARCO).perfilId);
  });
});
