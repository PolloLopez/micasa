// Tests del terreno e implantación (v1.32). Correr con: npm test
import { describe, it, expect } from 'vitest';
import { implantacion, medidasCasa, validarTerreno, completarTerreno, elementoNuevo, rumboDe, TERRENO_INICIAL } from './terreno.js';
import { PARAMS_INICIALES as P } from './parametrosIniciales.js';
import { migrarParams } from './migracion.js';
import { validarParametros } from './validacion.js';

/** Casa de 7.50 (lado A, frente) x 4.50 en un lote de 10 x 30. */
const conTerreno = (cambios = {}, params = {}) => ({
  ...P, ...params, terreno: { ...structuredClone(TERRENO_INICIAL), activo: true, ...cambios },
});
const cerca = (a, b) => a.forEach((n, i) => expect(n).toBeCloseTo(b[i], 6));

describe('ubicación de la casa', () => {
  it('ancho sobre la calle = el lado frente; profundidad = el otro', () => {
    expect(medidasCasa(P)).toEqual({ ancho: 7.5, profundidad: 4.5 });
    expect(medidasCasa({ ...P, ladoFrente: 'B' })).toEqual({ ancho: 4.5, profundidad: 7.5 });
  });

  it('las 4 distancias: frente e izquierda se cargan, fondo y derecha salen solas', () => {
    const imp = implantacion(conTerreno({ distanciaFrente: 5, distanciaIzquierda: 1 }));
    expect(imp.distancias).toEqual({ frente: 5, izquierda: 1, derecha: 1.5, fondo: 20.5 });
    expect(imp.avisos).toEqual([]);
  });

  it('avisa si no entra y si invade un retiro (los retiros los carga el diseñador)', () => {
    const noEntra = implantacion(conTerreno({ distanciaIzquierda: 3 })); // 3 + 7.5 > 10
    expect(noEntra.avisos[0]).toMatchObject({ nivel: 'error' });
    expect(noEntra.avisos[0].texto).toMatch(/se pasa 0.50 m del lateral derecho/);
    const retiro = implantacion(conTerreno({ distanciaFrente: 2, retiros: { frente: 3, fondo: 0, izquierda: 0, derecha: 0 } }));
    expect(retiro.avisos).toEqual([{ nivel: 'aviso', texto: 'Invade el retiro de frente: hay 2.00 m y pide 3.00 m.' }]);
    // 0 = sin control
    expect(implantacion(conTerreno({ distanciaFrente: 0 })).avisos).toEqual([]);
  });
});

describe('del lote al 3D', () => {
  it('la esquina izquierda del frente de la casa cae en su lugar, con cualquier lado como frente', () => {
    for (const lado of ['A', 'B', 'C', 'D']) {
      const params = conTerreno({ distanciaFrente: 5, distanciaIzquierda: 1 }, { ladoFrente: lado });
      const imp = implantacion(params);
      const { ancho, profundidad } = medidasCasa(params);
      // Las 4 esquinas de la casa (en el lote) tienen que caer en las 4 esquinas de la planta (centro en 0,0).
      const esquinas = [[1, 5], [1 + ancho, 5], [1, 5 + profundidad], [1 + ancho, 5 + profundidad]].map(([u, v]) => imp.aMundo(u, v));
      esquinas.forEach(([x, z]) => {
        expect(Math.abs(Math.abs(x) - P.largo / 2)).toBeLessThan(1e-9);
        expect(Math.abs(Math.abs(z) - P.ancho / 2)).toBeLessThan(1e-9);
      });
    }
  });

  it('la línea municipal queda del lado del frente (afuera), y el fondo del otro', () => {
    const imp = implantacion(conTerreno({ distanciaFrente: 5, distanciaIzquierda: 1 })); // frente A: z = +2.25
    expect(imp.aMundo(1, 0)[1]).toBeCloseTo(2.25 + 5); // la calle, hacia +z
    expect(imp.aMundo(1, 30)[1]).toBeCloseTo(2.25 - 25); // el fondo, hacia -z
    expect(imp.aMundo(0, 5)[0]).toBeCloseTo(-3.75 - 1); // lateral izquierdo visto desde la calle: hacia -x
  });

  it('el norte: si la calle mira al norte, el norte es "hacia afuera" del frente; al este, gira 90°', () => {
    cerca(implantacion(conTerreno({ orientacion: 0 })).norte, [0, 1]); // frente A mira a +z
    const n = implantacion(conTerreno({ orientacion: 90 })).norte;
    // Si la calle mira al este, girando el norte 90° en sentido horario (visto desde arriba) se llega a la calle.
    cerca([n[0] * Math.cos(Math.PI / 2) - n[1] * Math.sin(Math.PI / 2), n[0] * Math.sin(Math.PI / 2) + n[1] * Math.cos(Math.PI / 2)], [0, 1]);
    expect(rumboDe(90)).toBe('E');
    expect(rumboDe(350)).toBe('N');
    expect(rumboDe(200)).toBe('S');
  });
});

describe('elementos y pozo séptico', () => {
  const pozo = (u, v) => ({ id: 1, tipo: 'pozo', nombre: 'Pozo', distanciaFrente: v, distanciaIzquierda: u, diametro: 1.2, alto: 0, ancho: 1.2, largo: 1.2 });

  it('mide el pozo desde su borde, a la casa y a las medianeras', () => {
    // Casa: u 1..8.5, v 5..9.5. Pozo: borde a 2 m del fondo de la casa (v = 11.5), a 1 m del lateral izquierdo.
    const imp = implantacion(conTerreno({ distanciaFrente: 5, distanciaIzquierda: 1, elementos: [pozo(1, 11.5)] }));
    const [d] = imp.pozos;
    expect(d.aCasa).toBeCloseTo(2);
    expect(d.izquierda).toBeCloseTo(1);
    expect(d.derecha).toBeCloseTo(10 - 1 - 1.2);
    expect(d.fondo).toBeCloseTo(30 - 11.5 - 1.2);
  });

  it('avisa con los mínimos que carga el diseñador (0 = sin control)', () => {
    const datos = { distanciaFrente: 5, distanciaIzquierda: 1, elementos: [pozo(0.5, 11.5)] };
    expect(implantacion(conTerreno(datos)).avisos).toEqual([]);
    const avisos = implantacion(conTerreno({ ...datos, minimoPozoCasa: 3, minimoPozoMedianera: 1.5 })).avisos.map((a) => a.texto);
    expect(avisos).toEqual([
      'Pozo: está a 2.00 m de la casa y el mínimo es 3.00 m.',
      'Pozo: está a 0.50 m de una medianera y el mínimo es 1.50 m.',
    ]);
  });

  it('un pozo encima de la casa o fuera del lote se avisa; un árbol puede tocar la casa', () => {
    const encima = implantacion(conTerreno({ distanciaFrente: 5, distanciaIzquierda: 1, elementos: [pozo(3, 6)] }));
    expect(encima.avisos.some((a) => a.nivel === 'error' && /encima de la casa/.test(a.texto))).toBe(true);
    const arbol = { id: 2, tipo: 'arbol', nombre: 'Árbol', distanciaFrente: 6, distanciaIzquierda: 3, diametro: 4, alto: 6 };
    expect(implantacion(conTerreno({ distanciaFrente: 5, distanciaIzquierda: 1, elementos: [arbol] })).avisos).toEqual([]);
    const afuera = implantacion(conTerreno({ elementos: [pozo(9.5, 10)] }));
    expect(afuera.avisos.map((a) => a.texto)).toContain('Pozo queda (en parte) fuera del lote.');
  });

  it('un elemento nuevo trae las medidas de su tipo', () => {
    expect(elementoNuevo('camara', TERRENO_INICIAL, 7)).toMatchObject({ id: 7, tipo: 'camara', ancho: 0.6, largo: 0.6, nombre: 'Cámara séptica' });
    expect(elementoNuevo('arbol', TERRENO_INICIAL, 8)).toMatchObject({ diametro: 4, alto: 6, distanciaFrente: 24 });
    // El segundo se corre a la derecha (no aparecen encimados) y nunca se sale del lote.
    const conUno = { ...TERRENO_INICIAL, elementos: [{}] };
    expect(elementoNuevo('camara', conUno, 2).distanciaIzquierda).toBe(3.5);
    expect(elementoNuevo('construccion', { ...TERRENO_INICIAL, elementos: [{}, {}, {}] }, 4).distanciaIzquierda).toBeLessThanOrEqual(10 - 3);
  });
});

describe('datos del terreno', () => {
  it('valida medidas (no la ubicación: que no entre es un aviso)', () => {
    expect(validarTerreno(conTerreno().terreno)).toEqual({});
    expect(validarTerreno({ ...conTerreno().terreno, frente: 0, orientacion: 400 })).toMatchObject({
      'terreno.frente': 'Tiene que ser mayor que 0', 'terreno.orientacion': 'Entre 0 y 359 grados',
    });
    const conPozoRoto = { ...conTerreno().terreno, elementos: [{ tipo: 'pozo', nombre: 'P', distanciaFrente: 1, distanciaIzquierda: 1, diametro: 0, alto: 0 }] };
    expect(validarTerreno(conPozoRoto)).toEqual({ 'terreno.elementos.0.diametro': 'Tiene que ser mayor que 0' });
    expect(validarParametros(conTerreno({ distanciaIzquierda: 50 }))).toEqual({}); // no entra, pero se puede cargar
  });

  it('los proyectos de antes se abren sin terreno', () => {
    const { terreno, ...viejo } = P;
    expect(migrarParams(viejo).terreno).toEqual(TERRENO_INICIAL);
    expect(completarTerreno({ activo: true, frente: 12, retiros: { frente: 3 } })).toMatchObject({
      activo: true, frente: 12, fondo: 30, retiros: { frente: 3, fondo: 0, izquierda: 0, derecha: 0 }, elementos: [],
    });
    expect(terreno.activo).toBe(false);
  });
});

describe('el terreno viaja en el link y en el archivo', () => {
  it('ida y vuelta por el formato compacto', async () => {
    const { compactar, expandir } = await import('../proyecto/formatoCompacto.js');
    const { crearArchivoProyecto, leerArchivoProyecto } = await import('../proyecto/archivoProyecto.js');
    const { proyectoEjemplo } = await import('../proyecto/proyectosBase.js');
    const base = proyectoEjemplo();
    const proyecto = { ...base, params: { ...base.params, terreno: { ...conTerreno().terreno, orientacion: 135, elementos: [elementoNuevo('pozo', TERRENO_INICIAL, 1)] } } };
    const archivo = JSON.parse(JSON.stringify(crearArchivoProyecto(proyecto)));
    const vuelta = leerArchivoProyecto(JSON.stringify(expandir(compactar(archivo))));
    expect(vuelta.ok).toBe(true);
    expect(vuelta.proyecto.params.terreno).toEqual(proyecto.params.terreno);
  });
});

describe('resumen de la obra', () => {
  it('sin terreno no agrega nada; con terreno, lote, ubicación, retiros y elementos', async () => {
    const { resumenDeTerreno } = await import('./terreno.js');
    expect(resumenDeTerreno(P)).toEqual([]);
    const pozo = { ...elementoNuevo('pozo', TERRENO_INICIAL, 1), distanciaFrente: 11.5, distanciaIzquierda: 1 };
    const filas = Object.fromEntries(resumenDeTerreno(conTerreno({ distanciaIzquierda: 1, orientacion: 45, retiros: { frente: 3, fondo: 0, izquierda: 0, derecha: 0 }, elementos: [pozo] })));
    expect(filas.Terreno).toBe('lote 10.00 m x 30.00 m · la calle está hacia el NE (45°)');
    expect(filas['Ubicación de la casa']).toBe('5.00 m de la línea municipal · 1.00 m al lateral izq. · 1.50 m al lateral der. · 20.50 m al fondo');
    expect(filas.Retiros).toBe('frente 3.00 m');
    expect(filas['En el terreno']).toBe('Pozo séptico (ø 1.20 m, a 2.00 m de la casa)');
  });
});

describe('el norte del 3D y el del plano coinciden', () => {
  it('para cualquier frente y orientación', () => {
    for (const lado of ['A', 'B', 'C', 'D']) {
      for (const orientacion of [0, 45, 90, 135, 200, 315]) {
        const imp = implantacion(conTerreno({ orientacion }, { ladoFrente: lado }));
        const o = imp.aMundo(0, 0);
        const derecha = imp.aMundo(1, 0).map((n, i) => n - o[i]);
        const adentro = imp.aMundo(0, 1).map((n, i) => n - o[i]);
        // Plano (PlanoImplantacion): "arriba" es el fondo; la flecha se gira -(orientacion + 180)° (SVG, sentido horario).
        const g = (-(orientacion + 180) * Math.PI) / 180;
        const [sx, sy] = [Math.sin(g), -Math.cos(g)]; // (0, -1) girado g en el SVG (y hacia abajo)
        const enMundo = [derecha[0] * sx - adentro[0] * sy, derecha[1] * sx - adentro[1] * sy];
        cerca(imp.norte, enMundo);
      }
    }
  });
});
