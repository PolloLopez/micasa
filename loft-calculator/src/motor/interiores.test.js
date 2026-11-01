// Tests de mesadas y muebles (v1.38). Correr con: npm test
import { describe, it, expect } from 'vitest';
import { generarEstructura, listarPiezas } from './estructura.js';
import { calcularPresupuesto, CATALOGO_INICIAL, PERFILES_INICIALES } from './presupuesto.js';
import { migrarParams, normalizarCatalogo } from './migracion.js';
import { validarParametros } from './validacion.js';
import { PARAMS_INICIALES as P, ABERTURAS_INICIALES } from './parametrosIniciales.js';
import { INSUMO } from './constantes.js';
import {
  MESADA_NUEVA, mesadaNueva, generarMesada, tramosDelFrente, ubicarMesada, validarMesada,
  muebleNuevo, ubicarMueble, validarMueble, muebleFueraDeLaPlanta,
} from './interiores.js';

// Mesada de fábrica en la pared C (fondo): x de 0,85 a 3,25 (planta de 7,5 x 4,5).
const mesada = (cambios = {}) => ({ ...structuredClone(MESADA_NUEVA), id: 1, nombre: 'Mesada 1', ...cambios });
const conMesadas = (...mesadas) => ({ ...P, mesadas });
const presupuesto = (params) => calcularPresupuesto(generarEstructura(params, ABERTURAS_INICIALES), CATALOGO_INICIAL, { proveedor: 'prov-1' });
const renglon = (params, id) => presupuesto(params).items.find((i) => i.id === id);

describe('mesadas: ubicación y estructura', () => {
  it('contra la pared C, desde la esquina izquierda (vista desde afuera), en la cara de adentro de la pared', () => {
    const u = ubicarMesada(P, mesada());
    expect(u.origen[0]).toBeCloseTo(0.85, 6); // 3,75 - 0,5 - 2,4
    expect(u.origen[1]).toBeCloseTo(-2.19, 6); // -2,25 + 0,06
    expect(u.adentro).toEqual([0, 1]);
    const piezas = generarMesada(P, mesada()).piezas;
    piezas.forEach((p) => [p.desde, p.hasta].forEach(([x, , z]) => {
      expect(x).toBeGreaterThan(0.85 - 1e-6);
      expect(x).toBeLessThan(3.25 + 1e-6);
      expect(z).toBeGreaterThan(-2.19 - 1e-6);
      expect(z).toBeLessThan(-2.19 + 0.6 + 1e-6);
    }));
  });

  it('desde la derecha queda en espejo', () => {
    const u = ubicarMesada(P, mesada({ ladoReferencia: 'derecha' }));
    expect(u.origen[0]).toBeCloseTo(-3.25, 6); // arranca a 0,5 de la esquina derecha (x = -3,75)
  });

  it('el fondo y los montantes apoyan en el piso; la estructura termina bajo la tapa', () => {
    const m = mesada();
    const piezas = generarMesada(P, m).piezas;
    const piso = P.elevacion + 0.09;
    const fondoAbajo = piezas.find((p) => p.id === 'mesada:1:fondo-abajo');
    expect(fondoAbajo.desde[1]).toBeCloseTo(piso, 6);
    expect(fondoAbajo.largo).toBeCloseTo(2.4, 6);
    const masAlta = Math.max(...piezas.flatMap((p) => [p.desde[1], p.hasta[1]]));
    expect(masAlta).toBeCloseTo(piso + m.alto - m.espesorTapa, 6);
    // Con zócalo: solera en el piso retirada 6 cm del frente y una pata por montante del frente.
    const frente = piezas.filter((p) => p.id.includes('frente-mont'));
    const patas = piezas.filter((p) => p.id.includes(':pata:'));
    expect(patas).toHaveLength(frente.length);
    patas.forEach((p) => expect(p.largo).toBeCloseTo(0.1, 6));
    expect(piezas.find((p) => p.id === 'mesada:1:zocalo:0').desde[2]).toBeCloseTo(-2.19 + 0.6 - 0.06, 6);
  });

  it('un hueco corta el frente: sin solera de abajo ni zócalo ahí, con montante en cada borde', () => {
    const m = mesada({ huecos: [{ desde: 1, ancho: 0.7, nombre: 'Heladera' }] });
    expect(tramosDelFrente(m)).toEqual([[0, 1], [1.7, 2.4]]);
    const piezas = generarMesada(P, m).piezas;
    const ids = piezas.map((p) => p.id);
    expect(ids).toContain('mesada:1:frente-mont:100');
    expect(ids).toContain('mesada:1:frente-mont:170');
    expect(ids.filter((id) => id.includes('frente-abajo'))).toHaveLength(2);
    expect(ids.filter((id) => id.includes(':zocalo:'))).toHaveLength(2);
    // Ningún travesaño de abajo dentro del hueco.
    piezas.filter((p) => p.id.includes('trav-abajo')).forEach((p) => {
      const x = p.desde[0] - 0.85;
      expect(x < 1 + 1e-6 || x > 1.7 - 1e-6).toBe(true);
    });
  });

  it('un hueco en la punta: el montante de la punta baja hasta el piso', () => {
    const m = mesada({ huecos: [{ desde: 0, ancho: 0.6, nombre: 'Lavarropas' }] });
    const punta = generarMesada(P, m).piezas.find((p) => p.id === 'mesada:1:frente-mont:0');
    expect(Math.min(punta.desde[1], punta.hasta[1])).toBeCloseTo(P.elevacion + 0.09, 6);
  });

  it('va en la lista de piezas de la obra (se puede seleccionar y editar)', () => {
    const e = generarEstructura(conMesadas(mesada()), ABERTURAS_INICIALES);
    expect(listarPiezas(e).filter((p) => p.tipo === 'mesada').length).toBeGreaterThan(10);
    // Una pieza eliminada a mano no vuelve.
    const sinUna = generarEstructura({ ...conMesadas(mesada()), piezasEliminadas: ['mesada:1:fondo-arriba'] }, ABERTURAS_INICIALES);
    expect(listarPiezas(sinUna).some((p) => p.id === 'mesada:1:fondo-arriba')).toBe(false);
  });

  it('en grada y montaje no hay mesadas', () => {
    const e = generarEstructura({ ...conMesadas(mesada()), tipoProyecto: 'grada' }, []);
    expect(listarPiezas(e).some((p) => p.tipo === 'mesada')).toBe(false);
  });
});

describe('mesadas: presupuesto', () => {
  it('sin mesadas no aparecen sus renglones', () => {
    const ids = presupuesto(P).items.map((i) => i.id);
    [INSUMO.ESTRUCTURA_MESADA, INSUMO.TAPA_MESADA, INSUMO.ESTANTE_MESADA].forEach((id) => expect(ids).not.toContain(id));
  });

  it('estructura en barras, tapa y estantes en m²', () => {
    const params = conMesadas(mesada());
    const estructura = renglon(params, INSUMO.ESTRUCTURA_MESADA);
    expect(estructura.cantidad).toBeGreaterThan(0);
    expect(renglon(params, INSUMO.TAPA_MESADA).cantidad).toBeCloseTo(1.44, 2); // 2,40 x 0,60
    // 1 estante en todo el largo, de 58 cm de fondo.
    expect(renglon(params, INSUMO.ESTANTE_MESADA).cantidad).toBeCloseTo(Math.ceil(2.4 * 0.58 * 100) / 100, 2);
    expect(presupuesto(params).total).toBeGreaterThan(presupuesto(P).total);
  });

  it('el revestimiento suma el frente (sin los huecos), los costados y el zócalo', () => {
    const conHueco = mesada({ revestimiento: 'panelMuros', huecos: [{ desde: 1, ancho: 0.7, nombre: 'Heladera' }] });
    const panos = generarMesada(P, conHueco).panos;
    const altoFrente = 0.9 - 0.03 - 0.1;
    expect(panos.find((p) => p.donde.includes('frente')).neto).toBeCloseTo(1.7 * altoFrente, 6);
    expect(panos.filter((p) => p.donde.includes('costado'))).toHaveLength(2);
    expect(panos.find((p) => p.donde.includes('zócalo')).neto).toBeCloseTo(1.7 * 0.1, 6);
    // Sin revestimiento elegido, no hay paños.
    expect(generarMesada(P, mesada()).panos).toEqual([]);
    const panel = (params) => presupuesto(params).items.find((i) => i.id === 'panelMuros').cantidad;
    expect(panel(conMesadas(conHueco))).toBeGreaterThan(panel(P));
  });

  it('con un perfil de la lista elegido va a su propio renglón, con el nombre de la mesada', () => {
    const perfil = PERFILES_INICIALES.find((p) => p.a === 50 && p.b === 50);
    const params = conMesadas(mesada({ perfil: perfil.id }));
    const items = presupuesto(params).items;
    const propio = items.find((i) => i.id === `${INSUMO.ESTRUCTURA_MESADA}@${perfil.id}`);
    expect(propio.nombre).toBe('Estructura de mesadas (Mesada 1)');
    expect(propio.cantidad).toBeGreaterThan(0);
    // Una pieza editada a mano sigue en el renglón de su mesada.
    const editada = generarEstructura({ ...params, piezasEditadas: { 'mesada:1:fondo-arriba': { recorteInicio: 0.1 } } }, ABERTURAS_INICIALES);
    expect(listarPiezas(editada).find((p) => p.id === 'mesada:1:fondo-arriba').perfilPared).toBe(perfil.id);
  });

  it('un catálogo de antes recibe el renglón de mesadas sin cambiar su lista de perfiles', () => {
    const viejo = CATALOGO_INICIAL.filter((i) => ![INSUMO.ESTRUCTURA_MESADA, INSUMO.TAPA_MESADA, INSUMO.ESTANTE_MESADA].includes(i.id));
    const normal = normalizarCatalogo(viejo);
    expect(normal.find((i) => i.id === INSUMO.ESTRUCTURA_MESADA).perfil).toBe('Caño estructural 40x40x1.6');
    expect(normal.filter((i) => i.categoria === 'hierro').length).toBe(CATALOGO_INICIAL.filter((i) => i.categoria === 'hierro').length);
  });
});

describe('mesadas: carga', () => {
  it('nueva con id propio y nombre numerado', () => {
    expect(mesadaNueva([mesada()], 7)).toMatchObject({ id: 7, nombre: 'Mesada 2', lado: 'C' });
  });

  it('valida medidas, que entre en la pared y los huecos', () => {
    expect(validarMesada(mesada(), P)).toBeNull();
    expect(validarMesada(mesada({ desde: 6 }), P)).toBe('La mesada no entra en esa pared');
    expect(validarMesada(mesada({ huecos: [{ desde: 2, ancho: 0.7 }] }), P)).toBe('Un hueco no entra en la mesada');
    expect(validarMesada(mesada({ profundidad: 0.1 }), P)).toMatch(/profundidad/);
    expect(validarParametros(conMesadas(mesada({ desde: 6 })))['mesadas.1']).toBe('La mesada no entra en esa pared');
    expect(validarParametros(conMesadas(mesada()))).toEqual({});
  });

  it('un proyecto de antes queda sin mesadas ni muebles; una mesada guardada se completa', () => {
    const { mesadas, muebles, ...viejo } = P;
    expect(mesadas).toEqual([]);
    expect(muebles).toEqual([]);
    const migrado = migrarParams(viejo);
    expect(migrado.mesadas).toEqual([]);
    expect(migrado.muebles).toEqual([]);
    const incompleta = migrarParams({ ...viejo, mesadas: [{ id: 3, lado: 'A' }] }).mesadas[0];
    expect(incompleta).toMatchObject({ id: 3, lado: 'A', largo: MESADA_NUEVA.largo, huecos: [] });
  });
});

describe('muebles', () => {
  it('nuevo: medidas de fábrica del tipo y nombre numerado si se repite', () => {
    const cama = muebleNuevo('cama2', [], 1);
    expect(cama).toMatchObject({ tipo: 'cama2', nombre: 'Cama 2 plazas', ancho: 1.4, profundidad: 1.9, giro: 0, nivel: 'piso' });
    expect(muebleNuevo('cama2', [cama], 2).nombre).toBe('Cama 2 plazas 2');
  });

  it('se ubica desde el lateral izquierdo y el frente (frente A: el lateral izquierdo es x = -3,75)', () => {
    const m = { ...muebleNuevo('mesa', [], 1), distanciaIzquierda: 1, distanciaFrente: 0.5 };
    const u = ubicarMueble(P, m);
    expect(u.centro[0]).toBeCloseTo(-3.75 + 1 + 0.7, 6);
    expect(u.centro[1]).toBeCloseTo(2.25 - 0.5 - 0.4, 6);
    expect(u.y).toBeCloseTo(P.elevacion + 0.09, 6);
    // Girado 90°: ocupa al revés en planta.
    const girado = ubicarMueble(P, { ...m, giro: 90 });
    expect([girado.anchoPlanta, girado.profPlanta]).toEqual([0.8, 1.4]);
    expect(girado.angulo - u.angulo).toBeCloseTo(Math.PI / 2, 6);
  });

  it('en el piso 2 va a la altura del entrepiso', () => {
    const u = ubicarMueble(P, { ...muebleNuevo('cama1', [], 1), nivel: 'piso2' });
    expect(u.y).toBeCloseTo(P.elevacion + P.alturaPiso2 + 0.09, 6);
  });

  it('avisa si se sale de la planta', () => {
    const m = muebleNuevo('placard', [], 1);
    expect(muebleFueraDeLaPlanta(P, m)).toBe(false);
    expect(muebleFueraDeLaPlanta(P, { ...m, distanciaIzquierda: 7 })).toBe(true);
    expect(muebleFueraDeLaPlanta(P, { ...m, giro: 90, distanciaFrente: 3.2 })).toBe(true); // 3,2 + 1,5 > 4,5
  });

  it('valida tipo, material, medidas y giro', () => {
    const m = muebleNuevo('silla', [], 1);
    expect(validarMueble(m, P)).toBeNull();
    expect(validarMueble({ ...m, giro: 45 }, P)).toMatch(/Giro/);
    expect(validarMueble({ ...m, ancho: 0 }, P)).toMatch(/Medidas/);
    expect(validarMueble({ ...m, material: 'oro' }, P)).toBe('Material desconocido');
    expect(validarParametros({ ...P, muebles: [{ ...m, alto: 9 }] })['muebles.1']).toMatch(/Medidas/);
  });

  it('los muebles no cambian el presupuesto', () => {
    expect(presupuesto({ ...P, muebles: [muebleNuevo('heladera', [], 1)] }).total).toBe(presupuesto(P).total);
  });
});
