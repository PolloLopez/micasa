// Tests de las uniones (v1.33): qué queda entero, qué se corta y cuánto se descuenta. Correr con: npm test
import { describe, it, expect } from 'vitest';
import { generarEstructura, listarPiezas } from './estructura.js';
import { calcularPresupuesto, CATALOGO_INICIAL } from './presupuesto.js';
import { normalizarCatalogo, migrarParams } from './migracion.js';
import { PARAMS_INICIALES as P, ABERTURAS_INICIALES } from './parametrosIniciales.js';
import { medidaVista, medidaAlto, completarUniones, validarUniones } from './uniones.js';
import { validarAbertura, validarParametros } from './validacion.js';

const CATALOGO = normalizarCatalogo(CATALOGO_INICIAL);
const conRed = (cambios = {}) => ({ ...P, ...cambios, uniones: { modo: 'red', luz: 0, ...(cambios.uniones ?? {}) } });
const eje = (params = P, aberturas = ABERTURAS_INICIALES) => generarEstructura({ ...params, uniones: { modo: 'eje', luz: 0 } }, aberturas, CATALOGO);
const red = (params = conRed(), aberturas = ABERTURAS_INICIALES) => generarEstructura(params, aberturas, CATALOGO);
const deTipo = (e, tipo) => listarPiezas(e).filter((p) => p.tipo === tipo);
const mitad = (tipo) => medidaVista({ tipo }, CATALOGO) / 2;

describe('las fajas no cruzan las aberturas (también eje a eje)', () => {
  it('la faja a la altura de la ventana y de la puerta se corta en sus marcos y no pasa por los vanos', () => {
    // En A: puerta de 0.90 (hasta 2.05) y ventana de 1.50 (de 1.10 a 1.70). La faja de 1.60 cruza las dos.
    const altura = P.elevacion + 1.6;
    const fajas = deTipo(eje(), 'horizontal').filter((p) => p.grupos.includes('A') && Math.abs(p.desde[1] - altura) < 1e-6);
    expect(fajas.length).toBe(3);
    const total = fajas.reduce((a, p) => a + p.largo, 0);
    expect(total).toBeCloseTo(P.largo - 0.9 - 1.5, 6); // el ancho de los vanos ya no se compra
    // Una faja que no toca ninguna abertura conserva su id de siempre.
    expect(deTipo(eje(), 'horizontal').some((p) => p.id === 'horiz:C:1')).toBe(true);
  });
});

describe('red: la pieza que se corta pierde media medida del perfil entero en cada cruce', () => {
  it('las columnas van entre el marco de piso y la solera', () => {
    const antes = deTipo(eje(), 'columna').find((p) => p.id.startsWith('col:') && !p.esquina && p.grupos.includes('C'));
    const despues = listarPiezas(red()).find((p) => p.id === antes.id);
    expect(despues.largo).toBeCloseTo(antes.largo - mitad('marco-piso') - mitad('solera'), 4);
    expect(despues.largoEje).toBeCloseTo(antes.largo, 6);
  });

  it('las fajas quedan en tramos entre columnas (descontando el ancho de cada columna)', () => {
    const fajasEje = deTipo(eje(), 'horizontal').filter((p) => p.id.startsWith('horiz:C:1'));
    const fajasRed = deTipo(red(), 'horizontal').filter((p) => p.id.startsWith('horiz:C:1'));
    expect(fajasEje.length).toBe(1);
    // Pared C (7.50, sin aberturas): un tramo entre cada par de columnas seguidas.
    const columnas = deTipo(eje(), 'columna').filter((p) => p.grupos.includes('C'));
    expect(fajasRed.length).toBe(columnas.length - 1);
    // A cada columna del medio se le descuenta el ancho entero; a las dos de esquina, la mitad.
    const ancho = (p) => medidaVista(p, CATALOGO);
    const descuento = columnas.reduce((a, p) => a + (p.esquina ? ancho(p) / 2 : ancho(p)), 0);
    const total = fajasRed.reduce((a, p) => a + p.largo, 0);
    expect(total).toBeCloseTo(7.5 - descuento, 4);
  });

  it('en el piso: bordes largos enteros, cortos entre ellos; tirantes entre bordes; transversales entre tirantes', () => {
    const bordesEje = deTipo(eje(), 'marco-piso');
    const bordesRed = deTipo(red(), 'marco-piso');
    const largos = (lista) => lista.map((p) => p.largo).sort((a, b) => a - b);
    // Los largos llegan hasta la cara de afuera de la esquina (se alargan); los cortos van entre ellos.
    const [corto1, corto2, largo1, largo2] = largos(bordesRed);
    expect(corto1).toBeCloseTo(P.ancho - 2 * mitad('marco-piso'), 4);
    expect(corto2).toBeCloseTo(corto1, 6);
    expect(largo1).toBeGreaterThan(P.largo);
    expect(largo2).toBeCloseTo(largo1, 6);
    expect(largos(bordesEje)).toEqual([P.ancho, P.ancho, P.largo, P.largo]);
    const tiranteEje = deTipo(eje(), 'piso')[0];
    const tiranteRed = listarPiezas(red()).find((p) => p.id === tiranteEje.id);
    expect(tiranteRed.largo).toBeCloseTo(tiranteEje.largo - 2 * mitad('marco-piso'), 4);
    const transvRed = deTipo(red(), 'transv-piso');
    const transvEje = deTipo(eje(), 'transv-piso');
    expect(transvRed.length).toBe(transvEje.length);
    expect(transvRed.reduce((a, p) => a + p.largo, 0)).toBeLessThan(transvEje.reduce((a, p) => a + p.largo, 0));
  });

  it('el marco de la abertura: jambas enteras, dintel entre jambas; la luz para soldar se descuenta en cada punta', () => {
    const dintelEje = deTipo(eje(), 'dintel')[0];
    const dintelRed = listarPiezas(red()).find((p) => p.id === dintelEje.id);
    expect(dintelRed.largo).toBeCloseTo(dintelEje.largo - 2 * mitad('jamba'), 4);
    const conLuz = listarPiezas(red(conRed({ uniones: { luz: 0.002 } }))).find((p) => p.id === dintelEje.id);
    expect(conLuz.largo).toBeCloseTo(dintelRed.largo - 0.004, 6);
    // La jamba sigue entera (solo pierde las soleras de arriba y de abajo).
    const jambaEje = deTipo(eje(), 'jamba')[0];
    const jambaRed = listarPiezas(red()).find((p) => p.id === jambaEje.id);
    expect(jambaRed.largo).toBeCloseTo(jambaEje.largo - mitad('marco-piso') - mitad('solera'), 4);
  });

  it('el techo, las riostras y la escalera no cambian', () => {
    const ids = (e, tipos) => listarPiezas(e).filter((p) => tipos.includes(p.tipo)).map((p) => `${p.id}=${p.largo}`).sort();
    const tipos = ['viga-techo', 'correa-techo', 'borde-techo', 'riostra', 'zanca', 'apoyo-escalon'];
    expect(ids(red(), tipos)).toEqual(ids(eje(), tipos));
  });

  it('cuenta lo descontado y compra menos (o igual) hierro', () => {
    const e = red();
    expect(e.uniones.modo).toBe('red');
    expect(e.uniones.metrosDescontados).toBeGreaterThan(1);
    const barras = (est) => calcularPresupuesto(est, CATALOGO, { proveedor: 'prov-1' }).items
      .filter((i) => i.unidad === 'barra').reduce((a, i) => a + i.cantidad, 0);
    expect(barras(e)).toBeLessThanOrEqual(barras(eje()));
    expect(eje().uniones).toEqual({ modo: 'eje', metrosDescontados: 0, cortes: 0 });
  });
});

describe('perfil propio del marco de cada abertura', () => {
  it('sale en un renglón aparte con el nombre de la abertura', () => {
    const perfil = CATALOGO.find((i) => i.categoria === 'hierro' && i.id !== CATALOGO.find((u) => u.id === 'marcoAbertura').perfilId);
    const aberturas = ABERTURAS_INICIALES.map((op) => (op.id === 2 ? { ...op, perfilMarco: perfil.id } : op));
    const items = calcularPresupuesto(red(conRed(), aberturas), CATALOGO, { proveedor: 'prov-1' }).items;
    expect(items.some((i) => i.nombre === 'Marcos de aberturas (abertura #2)')).toBe(true);
    expect(validarAbertura({ ...aberturas[1], perfilMarco: 7 }, P)).toBe('Perfil del marco inválido');
  });
});

describe('datos de las uniones', () => {
  it('los proyectos viejos pasan a la red; se valida la luz', () => {
    const { uniones, ...viejo } = P;
    const deFabrica = { solerasColumnas: 'soleras', columnasFajas: 'columnas', montantesFajas: 'montantes', bordesTirantes: 'bordes', tirantesTransversales: 'tirantes' };
    expect(migrarParams(viejo).uniones).toEqual({ modo: 'red', luz: 0, enteras: deFabrica });
    expect(completarUniones({ modo: 'eje', luz: 0.002, enteras: { columnasFajas: 'fajas', otra: 'x' } }))
      .toEqual({ modo: 'eje', luz: 0.002, enteras: { ...deFabrica, columnasFajas: 'fajas' } });
    expect(validarUniones({ modo: 'red', luz: 0, enteras: { ...deFabrica, bordesTirantes: 'vigas' } }))
      .toEqual({ 'uniones.enteras.bordesTirantes': 'Elegí bordes o tirantes' });
    expect(validarUniones({ modo: 'red', luz: 0.05 })).toEqual({ 'uniones.luz': 'Entre 0 y 20 mm' });
    expect(validarParametros(conRed())).toEqual({});
    expect(uniones.modo).toBe('red');
  });
});

// v1.34: qué queda entero se elige por obra (4 pares) y por abertura (su marco).
describe('jerarquía elegible', () => {
  const conEnteras = (enteras, extra = {}) => conRed({ ...extra, uniones: { enteras: { solerasColumnas: 'soleras', columnasFajas: 'columnas', montantesFajas: 'montantes', bordesTirantes: 'bordes', ...enteras } } });
  const idColumnaC = deTipo(eje(), 'columna').find((p) => !p.esquina && p.grupos.includes('C')).id;

  it('columnas enteras: van de la cara de abajo del marco a la de arriba de la solera; los marcos se cortan', () => {
    const e = red(conEnteras({ solerasColumnas: 'columnas' }));
    const antes = listarPiezas(eje()).find((p) => p.id === idColumnaC);
    const col = listarPiezas(e).find((p) => p.id === idColumnaC);
    expect(col.largo).toBeCloseTo(antes.largo + mitad('marco-piso') + mitad('solera'), 4);
    const solerasC = deTipo(e, 'solera').filter((p) => p.id.includes(':C') || p.grupos.includes('C'));
    expect(solerasC.length).toBeGreaterThan(1); // la solera de C queda en tramos entre columnas
  });

  it('fajas enteras: la faja sigue de punta a punta y las columnas del medio se cortan en cada faja', () => {
    const e = red(conEnteras({ columnasFajas: 'fajas' }));
    const fajas = deTipo(e, 'horizontal').filter((p) => p.id.startsWith('horiz:C:1'));
    expect(fajas.length).toBe(1);
    const esquina = medidaVista({ tipo: 'columna', esquina: true }, CATALOGO) / 2;
    expect(fajas[0].largo).toBeCloseTo(7.5 - 2 * esquina, 4); // contra las esquinas igual se corta (termina ahí)
    expect(listarPiezas(e).filter((p) => p.id.startsWith(`${idColumnaC}~`)).length).toBeGreaterThan(1);
  });

  it('montantes ↔ fajas: con fajas enteras, los montantes quedan en tramos', () => {
    const conMontantes = { paredes: { ...P.paredes, C: { ...P.paredes.C, separacionMontantes: 0.6 } } };
    const montantesEnteros = deTipo(red(conEnteras({}, conMontantes)), 'montante').filter((p) => p.grupos.includes('C'));
    const montantesCortados = deTipo(red(conEnteras({ montantesFajas: 'fajas' }, conMontantes)), 'montante').filter((p) => p.grupos.includes('C'));
    expect(montantesEnteros.length).toBeGreaterThan(0);
    expect(montantesCortados.length).toBeGreaterThan(montantesEnteros.length);
  });

  it('tirantes enteros: llegan a la cara de afuera de los bordes y los bordes se cortan entre tirantes', () => {
    const e = red(conEnteras({ bordesTirantes: 'tirantes' }));
    const antes = deTipo(eje(), 'piso')[0];
    const tirante = listarPiezas(e).find((p) => p.id === antes.id);
    expect(tirante.largo).toBeCloseTo(antes.largo + 2 * mitad('marco-piso'), 4);
    expect(deTipo(e, 'marco-piso').length).toBeGreaterThan(4);
  });

  it('marco de una abertura con dintel y alféizar enteros: las jambas quedan en tramos', () => {
    const ventana = ABERTURAS_INICIALES.find((op) => op.tipo === 'ventana');
    const aberturas = ABERTURAS_INICIALES.map((op) => (op.id === ventana.id ? { ...op, marcoEntero: 'dintel' } : op));
    const e = red(conRed(), aberturas);
    const dintelAntes = listarPiezas(eje()).find((p) => p.id === `ref:${ventana.id}:dintel`);
    const dintel = listarPiezas(e).find((p) => p.id === `ref:${ventana.id}:dintel`);
    expect(dintel.largo).toBeCloseTo(dintelAntes.largo + 2 * mitad('jamba'), 4);
    expect(listarPiezas(e).filter((p) => p.id.startsWith(`ref:${ventana.id}:jamba-izq~`)).length).toBe(3);
    expect(validarAbertura({ ...ventana, marcoEntero: 'x' }, P)).toBe('Elegí jambas o dintel');
    // La otra abertura (la puerta) sigue con jambas enteras.
    expect(listarPiezas(e).filter((p) => p.id.startsWith('ref:1:jamba-izq~')).length).toBe(0);
  });
});

// v1.34.1: borrar a mano una columna vuelve a unir lo que ella cortaba.
describe('piezas borradas a mano', () => {
  it('sin la columna, la faja y la solera vuelven a pasar enteras por ese lugar', () => {
    const columna = deTipo(eje(), 'columna').find((p) => !p.esquina && p.grupos.includes('C'));
    const conFaja = (e) => deTipo(e, 'horizontal').filter((p) => p.id.startsWith('horiz:C:1'));
    const sinColumna = red(conRed({ piezasEliminadas: [columna.id], uniones: { enteras: { solerasColumnas: 'columnas' } } }));
    const conColumna = red(conRed({ uniones: { enteras: { solerasColumnas: 'columnas' } } }));
    expect(listarPiezas(sinColumna).some((p) => p.id.startsWith(columna.id))).toBe(false);
    expect(conFaja(sinColumna).length).toBe(conFaja(conColumna).length - 1); // un tramo menos: se unieron
    expect(deTipo(sinColumna, 'solera').length).toBe(deTipo(conColumna, 'solera').length - 1);
    expect(sinColumna.eliminadasEncontradas.map((p) => p.id)).toEqual([columna.id]);
  });

  it('borrar un tramo ya cortado sigue funcionando', () => {
    const tramo = deTipo(red(), 'horizontal').find((p) => p.id.startsWith('horiz:C:1~'));
    const e = red(conRed({ piezasEliminadas: [tramo.id] }));
    expect(listarPiezas(e).some((p) => p.id === tramo.id)).toBe(false);
    expect(e.eliminadasEncontradas.map((p) => p.id)).toEqual([tramo.id]);
  });
});

// v1.35: tirantes y transversales del piso (3 formas de armarlo).
describe('tirantes y transversales del piso', () => {
  const con = (opcion, modo = 'red') => red(conRed({ uniones: { modo, enteras: { tirantesTransversales: opcion } } }));
  const filas = (e) => deTipo(e, 'transv-piso');
  const tirantes = (e) => deTipo(e, 'piso');

  it('transversales enteros: una pieza por fila de borde a borde y los tirantes cortados en cada fila', () => {
    const e = con('transversales');
    const nFilas = new Set(filas(e).map((p) => p.desde[2].toFixed(3) + p.desde[0].toFixed(3))).size;
    expect(filas(e).every((p) => p.id.includes(':fila:'))).toBe(true);
    expect(filas(e).length).toBe(nFilas);
    const tirantesDeFabrica = tirantes(red());
    expect(tirantes(e).length).toBe(tirantesDeFabrica.length * (filas(e).length + 1));
  });

  it('tirantes apoyados: nada se corta, suben un nivel y llegan a la cara de afuera de los bordes', () => {
    const e = con('apoyados');
    const base = tirantes(eje());
    expect(tirantes(e).length).toBe(base.length);
    const t = tirantes(e)[0];
    const t0 = base.find((p) => p.id === t.id);
    const sube = (medidaAlto({ tipo: 'transv-piso' }, CATALOGO) + medidaAlto({ tipo: 'piso' }, CATALOGO)) / 2;
    expect(t.desde[1]).toBeCloseTo(t0.desde[1] + sube, 6);
    expect(t.largo).toBeCloseTo(t0.largo + 2 * mitad('marco-piso'), 4);
    expect(filas(e).every((p) => p.id.includes(':fila:'))).toBe(true);
    // En eje a eje también suben (es la forma), pero sin alargarse.
    const ejeApoyado = tirantes(con('apoyados', 'eje')).find((p) => p.id === t.id);
    expect(ejeApoyado.largo).toBe(t0.largo);
    expect(ejeApoyado.desde[1]).toBeCloseTo(t.desde[1], 6);
  });
});
