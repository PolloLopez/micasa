// Tests de mesadas y muebles (v1.38). Correr con: npm test
import { describe, it, expect } from 'vitest';
import { generarEstructura, listarPiezas } from './estructura.js';
import { calcularPresupuesto, CATALOGO_INICIAL, PERFILES_INICIALES } from './presupuesto.js';
import { migrarParams, normalizarCatalogo } from './migracion.js';
import { validarParametros } from './validacion.js';
import { PARAMS_INICIALES as P, ABERTURAS_INICIALES } from './parametrosIniciales.js';
import { INSUMO } from './constantes.js';
import {
  MESADA_NUEVA, mesadaNueva, colorDelMueble, tramosDeMesada, HUECO_NUEVO, mesadaALaEsquina, generarMesada, tramosDelFrente, ubicarMesada, validarMesada,
  muebleNuevo, ubicarMueble, validarMueble, muebleFueraDeLaPlanta, distanciasDelMueble, libreArribaDelMueble, paredHacia, cajonesQueChocan,
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
    expect(validarMesada(mesada({ huecos: [{ desde: 2, ancho: 0.7 }] }), P)).toBe('Un hueco no entra en su tramo');
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

  it('se mide desde la cara de adentro del lateral y del frente (frente A: lateral izquierdo x = -3,75)', () => {
    const m = { ...muebleNuevo('mesa', [], 1), distanciaLateral: 1, distanciaFrente: 0.5 };
    const u = ubicarMueble(P, m);
    expect(u.centro[0]).toBeCloseTo(-3.75 + 0.06 + 1 + 0.7, 6);
    expect(u.centro[1]).toBeCloseTo(2.25 - 0.06 - 0.5 - 0.4, 6);
    expect(u.y).toBeCloseTo(P.elevacion + 0.09, 6);
    // Girado 90°: ocupa al revés en planta.
    const girado = ubicarMueble(P, { ...m, giro: 90 });
    expect([girado.anchoPlanta, girado.profPlanta]).toEqual([0.8, 1.4]);
    expect(girado.angulo - u.angulo).toBeCloseTo(Math.PI / 2, 6);
  });

  it('desde el lateral derecho y desde el fondo, y calcula las otras dos distancias', () => {
    const m = { ...muebleNuevo('mesa', [], 1), desdeLateral: 'derecho', distanciaLateral: 0.2, desdeFrente: 'fondo', distanciaFrente: 0.1 };
    const u = ubicarMueble(P, m);
    expect(u.centro[0]).toBeCloseTo(3.75 - 0.06 - 0.2 - 0.7, 6);
    expect(u.centro[1]).toBeCloseTo(-2.25 + 0.06 + 0.1 + 0.4, 6);
    const d = distanciasDelMueble(P, m);
    expect(d.derecha).toBeCloseTo(0.2, 6);
    expect(d.izquierda).toBeCloseTo(7.38 - 0.2 - 1.4, 6); // 7,50 - 2 x 0,06 por dentro
    expect(d.fondo).toBeCloseTo(0.1, 6);
    expect(d.frente).toBeCloseTo(4.38 - 0.1 - 0.8, 6);
  });

  it('calcula lo libre hasta el techo (y hasta el piso 2 si está debajo del entrepiso)', () => {
    // Pegada al fondo (lado C, el bajo del techo: 4,50 + 0,06 x 10 % en la cara de adentro).
    const libre = { ...muebleNuevo('mesa', [], 1), desdeLateral: 'derecho', distanciaLateral: 0.3, desdeFrente: 'fondo', distanciaFrente: 0 };
    expect(libreArribaDelMueble(P, libre).libre).toBeCloseTo(4.5 + 0.006 - 0.09 - 0.75, 6);
    expect(libreArribaDelMueble(P, libre).hasta).toBe('techo');
    // Bajo el entrepiso (sobre el lateral izquierdo, 3 m de fondo): hasta los tirantes del piso 2.
    const abajo = { ...libre, desdeLateral: 'izquierdo' };
    expect(libreArribaDelMueble(P, abajo)).toEqual({ libre: expect.closeTo(2.3 - 0.12 - 0.09 - 0.75, 6), hasta: 'piso2' });
    // En el piso 2: del piso 2 al techo.
    expect(libreArribaDelMueble(P, { ...abajo, nivel: 'piso2' }).libre).toBeCloseTo(4.5 + 0.006 - 2.3 - 0.09 - 0.75, 6);
  });

  it('lavarropas: de carga frontal de fábrica; vanitory es un tipo más', () => {
    expect(muebleNuevo('lavarropas', [], 1).cargaFrontal).toBe(true);
    expect(muebleNuevo('mesa', [], 1)).not.toHaveProperty('cargaFrontal');
    expect(validarMueble({ ...muebleNuevo('lavarropas', [], 1), cargaFrontal: false }, P)).toBeNull();
    expect(muebleNuevo('vanitory', [], 1)).toMatchObject({ nombre: 'Vanitory', ancho: 0.6, profundidad: 0.45, alto: 0.85 });
  });

  it('un mueble de la v1.38 (medido al eje) no se mueve al abrirlo', () => {
    const viejo = { id: 1, tipo: 'mesa', nombre: 'Mesa', nivel: 'piso', ancho: 1.4, profundidad: 0.8, alto: 0.75, material: 'madera',
      distanciaFrente: 0.5, distanciaIzquierda: 1, giro: 0, mostrarEtiqueta: true, color: '' };
    const nuevo = migrarParams({ ...P, muebles: [viejo] }).muebles[0];
    expect(nuevo).toMatchObject({ desdeLateral: 'izquierdo', desdeFrente: 'frente' });
    expect(nuevo.distanciaLateral).toBeCloseTo(0.94, 6);
    expect(nuevo).not.toHaveProperty('distanciaIzquierda');
    expect(ubicarMueble(P, nuevo).centro[0]).toBeCloseTo(-3.75 + 1 + 0.7, 6); // donde estaba
    expect(validarMueble(nuevo, P)).toBeNull();
  });

  it('en el piso 2 va a la altura del entrepiso', () => {
    const u = ubicarMueble(P, { ...muebleNuevo('cama1', [], 1), nivel: 'piso2' });
    expect(u.y).toBeCloseTo(P.elevacion + P.alturaPiso2 + 0.09, 6);
  });

  it('avisa si se sale de la planta', () => {
    const m = muebleNuevo('placard', [], 1);
    expect(muebleFueraDeLaPlanta(P, m)).toBe(false);
    expect(muebleFueraDeLaPlanta(P, { ...m, distanciaLateral: 7 })).toBe(true);
    expect(muebleFueraDeLaPlanta(P, { ...m, giro: 90, distanciaFrente: 3 })).toBe(true); // 3 + 1,5 > 4,38 por dentro
    expect(muebleFueraDeLaPlanta(P, { ...m, desdeLateral: 'derecho', distanciaLateral: -0.1 })).toBe(true);
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

describe('etiquetas de mesadas y muebles (v1.38.1)', () => {
  it('nacen con etiqueta; se puede sacar una por una', () => {
    expect(generarMesada(P, mesada()).mostrarEtiqueta).toBe(true);
    expect(generarMesada(P, mesada({ mostrarEtiqueta: false })).mostrarEtiqueta).toBe(false);
    expect(muebleNuevo('mesa', [], 1).mostrarEtiqueta).toBe(true);
  });

  it('los proyectos de la v1.38.0 quedan con etiqueta; un valor raro no se guarda', () => {
    const { mostrarEtiqueta, ...sinEtiqueta } = muebleNuevo('silla', [], 1);
    expect(mostrarEtiqueta).toBe(true);
    expect(migrarParams({ ...P, muebles: [sinEtiqueta] }).muebles[0].mostrarEtiqueta).toBe(true);
    expect(migrarParams({ ...P, mesadas: [{ id: 2 }] }).mesadas[0].mostrarEtiqueta).toBe(true);
    expect(validarMueble({ ...sinEtiqueta, mostrarEtiqueta: 'si' }, P)).toBe('Valor inválido');
    expect(validarMesada(mesada({ mostrarEtiqueta: 1 }), P)).toBe('Valor inválido');
  });
});

describe('colores propios (v1.38.2)', () => {
  it('mueble: sin color usa el de su material; con color, el suyo', () => {
    const m = muebleNuevo('heladera', [], 1);
    expect(m.color).toBe('');
    expect(colorDelMueble(m)).toBe('#f1f5f9'); // blanco
    expect(colorDelMueble({ ...m, color: '#dc2626' })).toBe('#dc2626');
    expect(validarMueble({ ...m, color: 'rojo' }, P)).toBe('Color inválido');
    expect(validarMueble({ ...m, color: '#dc2626' }, P)).toBeNull();
  });

  it('mesada: color de tapa y de estantes opcionales', () => {
    expect(generarMesada(P, mesada()).colorTapa).toBe('');
    expect(generarMesada(P, mesada({ colorTapa: '#111827' })).colorTapa).toBe('#111827');
    expect(validarMesada(mesada({ colorEstantes: '#12345' }), P)).toBe('Color inválido');
    expect(validarMesada(mesada({ colorTapa: '#ffffff', colorEstantes: '' }), P)).toBeNull();
  });

  it('los muebles de antes quedan con el color de su material', () => {
    const { color, ...viejo } = muebleNuevo('cama1', [], 1);
    expect(color).toBe('');
    expect(migrarParams({ ...P, muebles: [viejo] }).muebles[0].color).toBe('');
  });
});

describe('mesadas en L y en U, huecos y bachas (v1.40)', () => {
  // Pared C (fondo): vista de adentro, la izquierda es el lateral D (x = -3,75) y la derecha el B (x = 3,75).
  const dentro = (piezas, eje, min, max) => piezas.every((p) => [p.desde, p.hasta].every((q) => q[eje] > min - 1e-6 && q[eje] < max + 1e-6));
  const hueco = (cambios) => ({ ...HUECO_NUEVO, ...cambios });

  it('en L hacia la izquierda: el principal llega a la pared de la izquierda y el otro tramo sigue por ella', () => {
    const m = mesada({ forma: 'L-izquierda', largoIzquierdo: 1.5, revestimiento: 'panelMuros', ...mesadaALaEsquina({}, 'izquierda') });
    const tramos = tramosDeMesada(P, m);
    expect(tramos.map((t) => t.clave)).toEqual(['principal', 'izquierdo']);
    const g = generarMesada(P, m);
    const principal = g.piezas.filter((p) => !p.id.includes(':izq'));
    const otro = g.piezas.filter((p) => p.id.includes(':izq'));
    expect(dentro(principal, 0, -3.69, -1.29)).toBe(true); // de la cara del lateral D (-3,69) a 2,40 m
    expect(dentro(otro, 0, -3.69, -3.09)).toBe(true); // contra el lateral D, 60 cm de profundidad
    expect(dentro(otro, 2, -1.59, -0.69)).toBe(true); // arranca después de la profundidad del principal, hasta 1,50 m
    expect(g.tapa.m2).toBeCloseTo(2.4 * 0.6 + 0.9 * 0.6, 6);
    // Costados: el principal solo a la derecha; el otro tramo solo en su punta libre (su izquierda).
    expect(g.panos.filter((p) => p.donde.includes('costado')).map((p) => p.donde)).toEqual(['Mesada 1 (costado der.)', 'Mesada 1 de la izquierda (costado izq.)']);
    // El pedazo del frente del principal tapado por el otro tramo no lleva placa.
    expect(g.panos.find((p) => p.donde === 'Mesada 1 (frente)').neto).toBeCloseTo((2.4 - 0.6) * (0.9 - 0.03 - 0.1), 6);
  });

  it('en U, del largo que quieras: los tramos salen derechos desde las puntas (aunque no haya pared)', () => {
    // Mesada de 3 m a 1 m de la esquina derecha (vista de afuera): punta derecha de adentro en x = 3,75 - 1 = 2,75.
    const m = mesada({ forma: 'U', largo: 3, desde: 1, largoIzquierdo: 1.2, largoDerecho: 1.8, fondoDerecho: true, revestimiento: 'panelMuros' });
    const tramos = tramosDeMesada(P, m);
    expect(tramos.map((t) => [t.clave, Number(t.largo.toFixed(2))])).toEqual([['principal', 3], ['izquierdo', 0.6], ['derecho', 1.2]]);
    const g = generarMesada(P, m);
    const derecho = g.piezas.filter((p) => p.id.includes(':der'));
    expect(dentro(derecho, 0, 2.75 - 0.6, 2.75)).toBe(true); // sale de la punta derecha hacia adentro
    expect(dentro(derecho, 2, -2.19 + 0.6, -2.19 + 1.8)).toBe(true);
    const izquierdo = g.piezas.filter((p) => p.id.includes(':izq'));
    expect(dentro(izquierdo, 0, -0.25, -0.25 + 0.6)).toBe(true); // la punta izquierda está en 2,75 - 3
    // El lomo del tramo de la derecha (suelto) se reviste si se pide; el de la izquierda no.
    expect(g.panos.filter((p) => p.donde.includes('lomo')).map((p) => p.donde)).toEqual(['Mesada 1 de la derecha (lomo)']);
    expect(validarMesada(m, P)).toBeNull();
    expect(validarMesada({ ...m, largoIzquierdo: 0.7 }, P)).toMatch(/tramo de la izquierda/);
  });

  it('los estantes entran también en el esquinero', () => {
    const recta = generarMesada(P, mesada({ largo: 2.4 }));
    const enL = generarMesada(P, mesada({ largo: 2.4, forma: 'L-derecha', largoDerecho: 1.2 }));
    // El principal tiene el mismo estante que una recta (el esquinero no se pierde) y el otro tramo, el suyo.
    expect(enL.estantesM2).toBeCloseTo(recta.estantesM2 + 0.6 * 0.58, 6);
  });

  it('una L/U de la v1.40.0 (pegada a la esquina) no se mueve al abrirla', () => {
    const vieja = { ...mesada({ forma: 'L-izquierda', largo: 2.4, desde: 0.5, largoIzquierdo: 1.5 }) };
    delete vieja.ubicacionLibre;
    const migrada = migrarParams(conMesadas(vieja)).mesadas[0];
    expect(migrada).toMatchObject({ ubicacionLibre: true, ladoReferencia: 'derecha' });
    expect(migrada.desde).toBeCloseTo(0.06, 6);
    expect(ubicarMesada(P, migrada).origen[0]).toBeCloseTo(-3.69, 6); // sigue contra el lateral izquierdo
    const u = { ...mesada({ forma: 'U' }) };
    delete u.ubicacionLibre;
    expect(migrarParams(conMesadas(u)).mesadas[0].largo).toBeCloseTo(7.38, 6);
  });

  it('un hueco SIN tapa (cocina) parte la mesada: sin estructura ni tapa ahí y costados revestidos a los dos lados', () => {
    const m = mesada({ revestimiento: 'panelMuros', huecos: [hueco({ desde: 1, ancho: 0.6, tapa: false, electro: 'cocina', nombre: 'Cocina' })] });
    const g = generarMesada(P, m);
    expect(g.tapa.m2).toBeCloseTo((2.4 - 0.6) * 0.6, 6);
    expect(g.tapa.tramos).toBe(2);
    expect(g.piezas.some((p) => p.id.startsWith('mesada:1:p1:'))).toBe(true);
    // Ninguna pieza dentro del hueco (x de 0,85 + 1 a 0,85 + 1,6).
    expect(g.piezas.every((p) => [p.desde[0], p.hasta[0]].every((x) => x < 1.85 + 1e-6) || [p.desde[0], p.hasta[0]].every((x) => x > 2.45 - 1e-6))).toBe(true);
    expect(g.panos.filter((p) => p.donde.includes('costado'))).toHaveLength(4);
    // La cocina va en el hueco, del ancho del hueco, mirando hacia adentro de la casa.
    expect(g.electros).toHaveLength(1);
    expect(g.electros[0]).toMatchObject({ tipo: 'cocina', alto: 0.85, pasaDeAlto: 0 });
    expect(g.electros[0].ancho).toBeCloseTo(0.58, 6);
    expect(g.electros[0].centro[0]).toBeCloseTo(0.85 + 1.3, 6);
    expect(g.electros[0].angulo).toBeCloseTo(0, 6); // adentro de la pared C = +z: sin girar
  });

  it('un hueco CON tapa sobre zócalo: la base sigue por debajo y el lavarropas apoya arriba (avisa si no entra)', () => {
    const m = mesada({ huecos: [hueco({ desde: 1, ancho: 0.6, conZocalo: true, electro: 'lavarropas' })] });
    const g = generarMesada(P, m);
    expect(g.piezas.filter((p) => p.id.includes(':zocalo:'))).toHaveLength(1); // un solo zócalo de punta a punta
    expect(g.tapa.m2).toBeCloseTo(2.4 * 0.6, 6);
    const lav = g.electros[0];
    expect(lav.y).toBeCloseTo(P.elevacion + 0.09 + 0.1, 6);
    expect(lav.pasaDeAlto).toBeCloseTo(0.1 + 0.85 - 0.87, 6); // 85 cm sobre 10 de zócalo, bajo una estructura a 87
    expect(lav.cargaFrontal).toBe(true);
    // Sin zócalo debajo, el lavarropas va al piso y entra.
    expect(generarMesada(P, mesada({ huecos: [hueco({ desde: 1, ancho: 0.6, electro: 'lavarropas' })] })).electros[0].pasaDeAlto).toBe(0);
  });

  it('bachas: cortan la tapa y van al presupuesto (simple o doble)', () => {
    const conBachas = mesada({ bachas: [{ tramo: 'principal', desde: 0.2, ancho: 0.52, profundidad: 0.37, doble: false },
      { tramo: 'principal', desde: 1.2, ancho: 0.76, profundidad: 0.37, doble: true }] });
    const g = generarMesada(P, conBachas);
    expect(g.tapa.m2).toBeCloseTo(2.4 * 0.6 - 0.52 * 0.37 - 0.76 * 0.37, 6);
    expect(g.bachas).toEqual({ simples: 1, dobles: 1 });
    expect(renglon(conMesadas(conBachas), INSUMO.BACHA_SIMPLE).cantidad).toBe(1);
    expect(renglon(conMesadas(conBachas), INSUMO.BACHA_DOBLE).cantidad).toBe(1);
    expect(validarMesada(conBachas, P)).toBeNull();
    const sobreCocina = { ...conBachas, huecos: [hueco({ desde: 0, ancho: 0.6, tapa: false })] };
    expect(validarMesada(sobreCocina, P)).toBe('Una bacha cae sobre un hueco sin tapa');
    expect(validarMesada(mesada({ bachas: [{ tramo: 'izquierdo', desde: 0, ancho: 0.5, profundidad: 0.37 }] }), P)).toMatch(/tramo que esta mesada no tiene/);
  });

  it('huecos y bachas de la v1.38 se completan (con tapa, sin zócalo, en el tramo principal)', () => {
    const vieja = { ...mesada(), huecos: [{ desde: 1, ancho: 0.7, nombre: 'Heladera' }] };
    delete vieja.forma; delete vieja.bachas;
    const migrada = migrarParams(conMesadas(vieja)).mesadas[0];
    expect(migrada).toMatchObject({ forma: 'recta', bachas: [] });
    expect(migrada.huecos[0]).toMatchObject({ tramo: 'principal', tapa: true, conZocalo: false, electro: '', nombre: 'Heladera' });
    // Y queda igual que antes.
    expect(generarMesada(P, migrada).piezas.map((p) => p.id)).toEqual(generarMesada(P, { ...mesada(), huecos: [{ desde: 1, ancho: 0.7 }] }).piezas.map((p) => p.id));
  });
});

describe('cajones de la cama (v1.40.1)', () => {
  it('la cama nace sin cajones y con 40 cm de apertura; otros muebles no tienen cajones', () => {
    expect(muebleNuevo('cama2', [], 1)).toMatchObject({ cajonesIzquierda: false, cajonesDerecha: false, cajonesPies: false, aperturaCajones: 0.4 });
    expect(muebleNuevo('mesa', [], 1)).not.toHaveProperty('cajonesPies');
    expect(validarMueble({ ...muebleNuevo('cama2', [], 1), aperturaCajones: 2 }, P)).toMatch(/cajones abren/);
  });

  it('cada lado de la cama da a una pared según el giro (derecha e izquierda mirando desde los pies)', () => {
    const cama = muebleNuevo('cama2', [], 1);
    expect(['izquierda', 'derecha', 'pies'].map((l) => paredHacia(cama, l))).toEqual(['izquierda', 'derecha', 'frente']);
    expect(['izquierda', 'derecha', 'pies'].map((l) => paredHacia({ ...cama, giro: 90 }, l))).toEqual(['frente', 'fondo', 'derecha']);
    expect(['izquierda', 'derecha', 'pies'].map((l) => paredHacia({ ...cama, giro: 180 }, l))).toEqual(['derecha', 'izquierda', 'fondo']);
  });

  it('avisa qué cajones abiertos chocan con una pared y cuánto falta', () => {
    // Cabecera contra el fondo, a 0,2 m del lateral izquierdo: los cajones de la izquierda (40 cm) chocan.
    const cama = { ...muebleNuevo('cama2', [], 1), cajonesIzquierda: true, cajonesDerecha: true, cajonesPies: true,
      desdeLateral: 'izquierdo', distanciaLateral: 0.2, desdeFrente: 'fondo', distanciaFrente: 0 };
    const choques = cajonesQueChocan(P, cama);
    expect(choques).toHaveLength(1);
    expect(choques[0]).toMatchObject({ lado: 'izquierda', pared: 'izquierda' });
    expect(choques[0].falta).toBeCloseTo(0.2, 6);
    expect(cajonesQueChocan(P, { ...cama, distanciaLateral: 0.5 })).toEqual([]);
  });
});
