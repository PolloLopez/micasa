// Tests del piso 2 con altura elegible y sus columnas (v1.28). Correr con: npm test
import { describe, it, expect } from 'vitest';
import { generarEstructura } from './estructura.js';
import { calcularPresupuesto, CATALOGO_INICIAL } from './presupuesto.js';
import { validarParametros } from './validacion.js';
import { migrarParams } from './migracion.js';
import { calcularEscalones } from './escalera.js';
import { PARAMS_INICIALES as P } from './parametrosIniciales.js';
import { INSUMO } from './constantes.js';

const renglon = (e, id) => calcularPresupuesto(e, CATALOGO_INICIAL, { compartir: false }).items.find((i) => i.id === id);

describe('altura del piso 2', () => {
  it('el entrepiso, sus piezas y la escalera siguen la altura elegida', () => {
    const e = generarEstructura({ ...P, alturaPiso2: 2.6 }, []);
    expect(e.entrepiso.y).toBeCloseTo(P.elevacion + 2.6);
    expect(e.piso2.tirantes.every((p) => Math.abs(p.desde[1] - (P.elevacion + 2.6)) < 1e-9)).toBe(true);
    expect(calcularEscalones(P.escalera, 2.6).alturaTotal).toBeGreaterThan(calcularEscalones(P.escalera).alturaTotal);
  });

  it('tiene que quedar 50 cm abajo del techo', () => {
    expect(validarParametros({ ...P, alturaPiso2: 4.2 }).alturaPiso2).toMatch(/Máximo 4.00/);
    expect(validarParametros({ ...P, alturaPiso2: 1.5 }).alturaPiso2).toBe('Mínimo 1.8');
    expect(validarParametros({ ...P, alturaPiso2: 3.5 })).toEqual({});
  });
});

describe('columnas del entrepiso', () => {
  const e = generarEstructura(P, []);
  const delEntrepiso = (est) => est.columnas.filter((p) => p.tipo === 'columna-entrepiso');

  it('las que no están en una pared van a su renglón', () => {
    expect(delEntrepiso(e).length).toBeGreaterThan(0);
    expect(renglon(e, INSUMO.COLUMNA_ENTREPISO).largosPiezas).toHaveLength(delEntrepiso(e).length);
  });

  it('pueden terminar en el piso 2 en vez de subir al techo', () => {
    const corta = generarEstructura({ ...P, columnasEntrepisoHastaPiso2: true }, []);
    delEntrepiso(corta).forEach((c) => expect(c.hasta[1]).toBeCloseTo(P.elevacion + P.alturaPiso2));
    // Las de las paredes no cambian.
    expect(corta.columnas.filter((p) => p.tipo === 'columna').map((p) => p.largo))
      .toEqual(e.columnas.filter((p) => p.tipo === 'columna').map((p) => p.largo));
  });

  it('fila del medio con viga de apoyo, aunque el entrepiso no tenga borde libre', () => {
    // El entrepiso del ejemplo: apoyado en D, 3.00 de profundidad.
    const base = { ...P, escalera: { ...P.escalera, activa: false } };
    const sin = generarEstructura(base, []);
    const con = generarEstructura({ ...base, filaColumnasEntrepiso: true }, []);
    expect(delEntrepiso(con).length).toBeGreaterThan(delEntrepiso(sin).length);
    const viga = con.marcos.find((p) => p.tipo === 'viga-apoyo');
    expect(viga.largo).toBeCloseTo(4.5); // a lo largo de la pared donde apoya (D, 4.50 m)
    expect(viga.desde[1]).toBeLessThan(con.entrepiso.y); // abajo de los tirantes
    expect(renglon(con, INSUMO.VIGA_CIERRE).largosPiezas.length).toBe(renglon(sin, INSUMO.VIGA_CIERRE).largosPiezas.length + 1);
  });
});

describe('proyectos de antes', () => {
  it('se abren con el piso 2 a 2.30 y las columnas como estaban', () => {
    const { alturaPiso2, filaColumnasEntrepiso, columnasEntrepisoHastaPiso2, ...viejo } = P;
    expect([alturaPiso2, filaColumnasEntrepiso, columnasEntrepisoHastaPiso2]).toEqual([2.3, false, false]);
    expect(migrarParams(viejo)).toMatchObject({ alturaPiso2: 2.3, filaColumnasEntrepiso: false, columnasEntrepisoHastaPiso2: false });
  });
});
