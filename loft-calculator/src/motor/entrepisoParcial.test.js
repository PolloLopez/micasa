// Tests del entrepiso parcial y la viga de cierre (v1.14). Correr con: npm test
//
// Planta del loft de ejemplo (7,50 x 4,50), vista desde arriba:
//
//            C (z = -2,25)
//        ┌─────────────────┐
//   D    │▓▓▓▓             │   B
// (x=-)  │                 │
//        └─────────────────┘
//            A (z = +2,25)
//
// El entrepiso se apoya en D (de z = -2,25 a +2,25, medido desde la
// esquina izquierda vista desde afuera = la esquina con C) y entra 3 m
// hacia adentro (hasta x = -0,75).
import { describe, it, expect } from 'vitest';
import { generarEstructura } from './estructura.js';
import { tramoEntrepiso } from './geometria.js';
import { calcularPresupuesto, CATALOGO_INICIAL } from './presupuesto.js';
import { validarParametros } from './validacion.js';
import { migrarParams } from './migracion.js';
import { INSUMO } from './constantes.js';
import { PARAMS_INICIALES as P } from './parametrosIniciales.js';
import { proyectoVacio } from '../proyecto/proyectosBase.js';

const SIN_ESCALERA = { ...P, escalera: { ...P.escalera, activa: false } };
// Altillo de 2 m de largo x 3 m de profundidad, pegado a la esquina D-C.
const ALTILLO = { ...SIN_ESCALERA, largoEntrepiso: 2 };

const deTipo = (e, tipo) => e.marcos.filter((m) => m.tipo === tipo);
const interiores = (e) => e.columnas.filter((c) => c.grupos[0] === 'interior');
const posiciones = (e) => new Set(e.columnas.map((c) => `${c.x.toFixed(2)},${c.z.toFixed(2)}`));

describe('tramo del entrepiso sobre la pared', () => {
  it('largo 0 = toda la pared (como antes de v1.14)', () => {
    expect(tramoEntrepiso(P)).toEqual({ inicio: 0, largo: 4.5 });
  });

  it('desde la esquina izquierda o la derecha', () => {
    expect(tramoEntrepiso({ ...P, largoEntrepiso: 2, distanciaEntrepiso: 0.5 })).toEqual({ inicio: 0.5, largo: 2 });
    const derecha = tramoEntrepiso({ ...P, largoEntrepiso: 2, distanciaEntrepiso: 0.5, referenciaEntrepiso: 'derecha' });
    expect(derecha.inicio).toBeCloseTo(4.5 - 0.5 - 2);
  });
});

describe('entrepiso completo: lo de siempre + viga de cierre', () => {
  const e = generarEstructura(SIN_ESCALERA, []);

  it('el borde de enfrente (libre) pasa a ser viga de cierre; los 3 contra pared siguen siendo marco', () => {
    expect(deTipo(e, 'marco-piso2')).toHaveLength(3);
    const vigas = deTipo(e, 'viga-cierre');
    expect(vigas).toHaveLength(1);
    expect(vigas[0].largo).toBeCloseTo(4.5);
    expect(vigas[0].id).toBe('marco-piso2:2'); // mismo id que antes: no rompe piezas eliminadas
  });

  it('mismas columnas que antes: 3 en el borde libre (cada 2,50 sobre 4,50)', () => {
    // Las 2 de las puntas caen sobre las paredes A y C; la del medio es "interior".
    expect(interiores(e)).toHaveLength(1);
    expect(posiciones(e).size).toBe(13);
  });

  it('entrepiso que llega a la pared de enfrente: sin viga de cierre ni columnas extra', () => {
    const lleno = generarEstructura({ ...SIN_ESCALERA, anchoEntrepiso: 7.5 }, []);
    expect(deTipo(lleno, 'viga-cierre')).toHaveLength(0);
    expect(interiores(lleno)).toHaveLength(0);
  });
});

describe('entrepiso parcial (altillo de 2 x 3 en la esquina D-C)', () => {
  const e = generarEstructura(ALTILLO, []);

  it('rectángulo y superficie: 2 x 3 = 6 m²', () => {
    expect(e.entrepiso.largoU).toBeCloseTo(2);
    expect(e.superficies.piso2).toBeCloseTo(6);
    const xs = e.entrepiso.esquinas.map(([x]) => x);
    const zs = e.entrepiso.esquinas.map(([, z]) => z);
    expect(Math.min(...xs)).toBeCloseTo(-3.75);
    expect(Math.max(...xs)).toBeCloseTo(-0.75);
    expect(Math.min(...zs)).toBeCloseTo(-2.25);
    expect(Math.max(...zs)).toBeCloseTo(-0.25);
  });

  it('2 bordes contra pared (D y C) = marco; 2 bordes libres = viga de cierre', () => {
    expect(deTipo(e, 'marco-piso2')).toHaveLength(2);
    expect(deTipo(e, 'viga-cierre').map((v) => Number(v.largo.toFixed(2))).sort()).toEqual([2, 3]);
  });

  it('tirantes: cruzan la luz corta (2 m) y se reparten sobre los 3 m', () => {
    expect(e.piso2.tirantes).toHaveLength(7); // interiores cada 0,40 en 3 m
    e.piso2.tirantes.forEach((t) => expect(t.largo).toBeCloseTo(2));
  });

  it('columnas del borde libre: puntas + intermedias cada 2,50', () => {
    const cols = posiciones(e);
    // Borde de 3 m (z = -0,25): 2 tramos => x = -3,75 (sobre D), -2,25 y -0,75.
    ['-3.75,-0.25', '-2.25,-0.25', '-0.75,-0.25'].forEach((p) => expect(cols.has(p)).toBe(true));
    // Borde de 2 m (x = -0,75): sus puntas; la de z = -2,25 queda sobre la pared C.
    expect(cols.has('-0.75,-2.25')).toBe(true);
    expect(cols.size).toBe(10 + 4); // perímetro + 4 nuevas
    expect(interiores(e)).toHaveLength(2); // las otras 2 están sobre una pared
  });

  it('columnas del borde libre: con 0, solo en las puntas', () => {
    const soloPuntas = generarEstructura({ ...ALTILLO, separacionColumnasEntrepiso: 0 }, []);
    expect(posiciones(soloPuntas).size).toBe(10 + 3);
  });

  it('medido desde la esquina derecha, separado de las dos esquinas: 3 bordes libres', () => {
    const centro = generarEstructura({ ...ALTILLO, referenciaEntrepiso: 'derecha', distanciaEntrepiso: 0.5 }, []);
    expect(deTipo(centro, 'viga-cierre')).toHaveLength(3);
    const zs = centro.entrepiso.esquinas.map(([, z]) => z);
    expect(Math.min(...zs)).toBeCloseTo(-0.25);
    expect(Math.max(...zs)).toBeCloseTo(1.75);
  });
});

describe('presupuesto con viga de cierre', () => {
  const item = (params, id) => calcularPresupuesto(generarEstructura(params, []), CATALOGO_INICIAL).items.find((i) => i.id === id);

  it('renglón propio, separado de los marcos', () => {
    const viga = item(ALTILLO, INSUMO.VIGA_CIERRE);
    expect(viga.cortes.barras.flatMap((b) => b.piezas).sort()).toEqual([2, 3]);
    expect(viga.perfil).toBe('Perfil C 120x50x2.0');
  });

  it('sin borde libre no aparece el renglón', () => {
    expect(item({ ...SIN_ESCALERA, anchoEntrepiso: 7.5 }, INSUMO.VIGA_CIERRE)).toBeUndefined();
    expect(item({ ...SIN_ESCALERA, anchoEntrepiso: 0 }, INSUMO.VIGA_CIERRE)).toBeUndefined();
  });

  it('una viga de cierre se puede pasar a otro perfil desde el editor', () => {
    const editada = { ...ALTILLO, piezasEditadas: { 'marco-piso2:1': { perfil: INSUMO.COLUMNA } } };
    const viga = item(editada, INSUMO.VIGA_CIERRE);
    expect(viga.largosPiezas).toHaveLength(1); // piezas propias (las barras pueden ser compartidas)
  });
});

describe('validación del entrepiso parcial', () => {
  it('el ejemplo y el altillo son válidos', () => {
    expect(validarParametros(ALTILLO)).toEqual({});
    expect(validarParametros({ ...ALTILLO, referenciaEntrepiso: 'derecha', distanciaEntrepiso: 2.5 })).toEqual({});
  });

  it('el largo no puede pasar la pared, ni el tramo salirse por la otra esquina', () => {
    expect(validarParametros({ ...ALTILLO, largoEntrepiso: 5 })).toHaveProperty('largoEntrepiso');
    expect(validarParametros({ ...ALTILLO, distanciaEntrepiso: 3 })).toHaveProperty('distanciaEntrepiso');
    expect(validarParametros({ ...ALTILLO, largoEntrepiso: 0.5 })).toHaveProperty('largoEntrepiso'); // mínimo 1 m
    expect(validarParametros({ ...ALTILLO, referenciaEntrepiso: 'arriba' })).toHaveProperty('referenciaEntrepiso');
  });

  it('la escalera tiene que llegar al borde del entrepiso parcial', () => {
    const conEscalera = { ...P, largoEntrepiso: 2 };
    expect(validarParametros(conEscalera)).toEqual({}); // posición 0,60 entra en 2 m
    expect(validarParametros({ ...conEscalera, escalera: { ...P.escalera, posicion: 3 } })).toHaveProperty(['escalera.posicion']);
  });
});

describe('proyectos guardados antes de v1.14', () => {
  it('se abren igual: entrepiso en toda la pared y columnas con la separación de esa pared', () => {
    const viejo = Object.fromEntries(Object.entries(P).filter(([k]) =>
      !['largoEntrepiso', 'referenciaEntrepiso', 'distanciaEntrepiso', 'separacionColumnasEntrepiso'].includes(k)));
    viejo.paredes = { ...P.paredes, D: { ...P.paredes.D, separacionVerticales: 1.5 } };
    const m = migrarParams(viejo);
    expect(m.largoEntrepiso).toBe(0);
    expect(m.referenciaEntrepiso).toBe('izquierda');
    expect(m.separacionColumnasEntrepiso).toBe(1.5);
    expect(validarParametros(m)).toEqual({});
  });

  it('un proyecto nuevo (vacío) es válido', () => {
    expect(validarParametros(proyectoVacio().params)).toEqual({});
  });
});
