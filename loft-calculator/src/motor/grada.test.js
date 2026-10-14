// Tests de la grada para espectadores y de las riostras. Correr con: npm test
import { describe, it, expect } from 'vitest';
import { GRADA_INICIAL, posicionesPorticos, medidasGrada, ESPESOR_TABLON } from './grada.js';
import { generarEstructura, listarPiezas } from './estructura.js';
import { calcularPresupuesto, CATALOGO_INICIAL } from './presupuesto.js';
import { validarParametros } from './validacion.js';
import { migrarParams } from './migracion.js';
import { INSUMO } from './constantes.js';
import { PARAMS_INICIALES as P } from './parametrosIniciales.js';
import { gradaNueva, gradaEjemplo } from '../proyecto/proyectosBase.js';

// Proyecto de grada con el ejemplo: 6 filas de 6 m, huella 75 cm, contrahuella 40 cm, pórticos cada 1,5 m.
const conGrada = (cambios = {}) => ({ ...P, tipoProyecto: 'grada', grada: { ...GRADA_INICIAL, ...cambios } });
const deTipo = (e, tipo) => e.grada.piezas.filter((p) => p.tipo === tipo);

describe('medidas y pórticos', () => {
  it('pórticos repartidos parejo de punta a punta (6 m cada 1,5 m => 5)', () => {
    expect(posicionesPorticos(6, 1.5)).toEqual([-3, -1.5, 0, 1.5, 3]);
    expect(posicionesPorticos(5, 1.5)).toHaveLength(5); // 4 vanos de 1,25 m (no quedan más de 1,5 m)
  });

  it('altura, profundidad y capacidad (45 cm por persona)', () => {
    const m = medidasGrada(GRADA_INICIAL);
    expect(m.alturaTotal).toBeCloseTo(2.4);
    expect(m.profundidad).toBeCloseTo(4.5);
    expect(m.capacidad).toBe(13 * 6); // 6 m / 0,45 m = 13 personas por fila
  });
});

describe('estructura de la grada (ejemplo)', () => {
  const e = generarEstructura(conGrada(), []);

  it('es un proyecto propio: sin paredes, pisos, techo ni escalera', () => {
    expect(e.paredes).toEqual([]);
    expect(e.columnas).toEqual([]);
    expect(e.escalera).toBeNull();
    expect(listarPiezas(e).every((p) => p.grupos.includes('grada'))).toBe(true);
  });

  it('por pórtico: 1 zanca, 1 apoyo por fila y 1 parante por línea de fila', () => {
    expect(deTipo(e, 'grada-zanca')).toHaveLength(5);
    expect(deTipo(e, 'grada-apoyo')).toHaveLength(5 * 6);
    expect(deTipo(e, 'grada-parante')).toHaveLength(5 * 7);
  });

  it('cada parante llega a la fila que sostiene (debajo del tablón)', () => {
    const alto = (j) => e.grada.piezas.find((p) => p.id === `grada-parante:0:${j}`).hasta[1];
    expect(alto(0)).toBeCloseTo(0.4 - ESPESOR_TABLON); // frente: fila 1
    expect(alto(3)).toBeCloseTo(1.6 - ESPESOR_TABLON); // línea 3: frente de la fila 4
    expect(alto(6)).toBeCloseTo(2.4 - ESPESOR_TABLON); // fondo: fila 6
  });

  it('la zanca va del pie de adelante al tope de atrás', () => {
    const z = e.grada.piezas.find((p) => p.id === 'grada-zanca:0');
    expect(z.desde).toEqual([-3, 0, 2.25]);
    expect(z.hasta[1]).toBeCloseTo(2.35);
    expect(z.hasta[2]).toBeCloseTo(-2.25);
  });

  it('2 vigas longitudinales por fila, de punta a punta', () => {
    const vigas = deTipo(e, 'grada-viga');
    expect(vigas).toHaveLength(12);
    vigas.forEach((v) => expect(v.largo).toBeCloseTo(6));
  });

  it('riostras en cruz atrás, solo en los vanos de los extremos (2 cruces = 4 diagonales)', () => {
    const riostras = deTipo(e, 'riostra');
    expect(riostras).toHaveLength(4);
    riostras.forEach((r) => expect(r.desde[2]).toBeCloseTo(-2.25));
    expect(deTipo(generarEstructura(conGrada({ riostras: 'todos' }), []), 'riostra')).toHaveLength(8);
    expect(deTipo(generarEstructura(conGrada({ riostras: 'no' }), []), 'riostra')).toHaveLength(0);
  });

  it('parantes cada 2 filas (el fondo siempre lleva) y sin parantes', () => {
    const cada2 = generarEstructura(conGrada({ filas: 5, parantesCadaFilas: 2 }), []);
    expect(deTipo(cada2, 'grada-parante').map((p) => p.id.split(':')[2]).slice(0, 4)).toEqual(['0', '2', '4', '5']);
    const sin = generarEstructura(conGrada({ parantesCadaFilas: 0 }), []);
    expect(deTipo(sin, 'grada-parante')).toHaveLength(0);
    expect(sin.grada.resumen.avisos.join(' ')).toMatch(/Sin parantes/);
  });

  it('tablones: asiento adelante y pie atrás en cada fila', () => {
    expect(e.grada.tablones).toHaveLength(12 + 5); // asiento + pie en 6 filas + 5 respaldos (entre filas)
    const asiento = e.grada.tablones.find((t) => t.id === 'asiento:1');
    const pie = e.grada.tablones.find((t) => t.id === 'pie:1');
    expect(asiento.centro[2]).toBeGreaterThan(pie.centro[2]); // adelante = z mayor
  });

  it('avisos: baranda si pasa de 1 m; comodidad de la fila', () => {
    expect(e.grada.resumen.avisos.join(' ')).toMatch(/baranda/);
    const incomoda = generarEstructura(conGrada({ contrahuella: 0.55, huella: 0.65, anchoAsiento: 0.3, anchoPie: 0.3 }), []);
    expect(incomoda.grada.resumen.avisos.join(' ')).toMatch(/entre 35 y 45 cm/);
    expect(incomoda.grada.resumen.avisos.join(' ')).toMatch(/piernas/);
  });

  it('las piezas de la grada se editan y eliminan como cualquier otra', () => {
    const editada = generarEstructura({ ...conGrada(), piezasEditadas: { 'grada-parante:0:0': { perfil: INSUMO.GRADA_ZANCA } } }, []);
    const items = calcularPresupuesto(editada, CATALOGO_INICIAL).items;
    const piezas = (id) => items.find((i) => i.id === id).cortes.barras.flatMap((b) => b.piezas).length;
    expect(piezas(INSUMO.GRADA_PARANTE)).toBe(35 - 1);
    expect(piezas(INSUMO.GRADA_ZANCA)).toBe(5 + 1);
    const sinRiostra = generarEstructura({ ...conGrada(), piezasEliminadas: ['grada-riostra:0:a'] }, []);
    expect(deTipo(sinRiostra, 'riostra')).toHaveLength(3);
  });
});

describe('presupuesto de la grada', () => {
  const items = calcularPresupuesto(generarEstructura(conGrada(), []), CATALOGO_INICIAL).items;
  const item = (id) => items.find((i) => i.id === id);

  it('solo los renglones de la grada', () => {
    expect(items.map((i) => i.id)).toEqual([
      INSUMO.GRADA_ZANCA, INSUMO.GRADA_PARANTE, INSUMO.GRADA_APOYO, INSUMO.GRADA_VIGA, INSUMO.GRADA_UNION, INSUMO.RIOSTRA,
      INSUMO.GRADA_ASIENTO, INSUMO.GRADA_PIE, INSUMO.GRADA_RESPALDO,
    ]); // sin bulones ni tornillos: la grada de ejemplo es de una pieza
  });

  it('tablones por metro: 6 filas x 6 m = 36 m de asiento y 36 m de pie', () => {
    expect(item(INSUMO.GRADA_ASIENTO).cantidad).toBe(36);
    expect(item(INSUMO.GRADA_PIE).cantidad).toBe(36);
  });

  it('los perfiles pasan por el optimizador de cortes', () => {
    expect(item(INSUMO.GRADA_VIGA).cortes.barras.flatMap((b) => b.piezas)).toHaveLength(12);
    expect(item(INSUMO.GRADA_VIGA).cantidad).toBeGreaterThanOrEqual(12); // 6 m sobre barras de 6 m (+1 %)
  });
});

describe('validación y proyectos de grada', () => {
  it('asiento + pie tienen que entrar en la fila', () => {
    expect(validarParametros(conGrada({ anchoAsiento: 0.5, anchoPie: 0.4 }))).toHaveProperty(['grada.anchoAsiento']);
    expect(validarParametros(conGrada({ riostras: 'muchas' }))).toHaveProperty(['grada.riostras']);
    expect(validarParametros({ ...P, tipoProyecto: 'otro' })).toHaveProperty('tipoProyecto');
  });

  it('grada nueva (sin precios) y de ejemplo son válidas', () => {
    [gradaNueva(), gradaEjemplo()].forEach((proyecto) => {
      expect(proyecto.params.tipoProyecto).toBe('grada');
      expect(validarParametros(proyecto.params)).toEqual({});
    });
    expect(gradaNueva().catalogo.every((i) => i.precio === 0)).toBe(true);
  });

  it('un proyecto de la v1.8 se abre como construcción, con la grada por defecto y sin riostras en la escalera', () => {
    const { tipoProyecto, grada, ...viejo } = P; // eslint-disable-line no-unused-vars
    const { riostras, ...escaleraVieja } = P.escalera; // eslint-disable-line no-unused-vars
    const m = migrarParams({ ...viejo, escalera: escaleraVieja });
    expect(m.tipoProyecto).toBe('construccion');
    expect(m.grada).toEqual(GRADA_INICIAL);
    expect(m.escalera.riostras).toBe(false);
    expect(validarParametros(m)).toEqual({});
  });
});

describe('parantes y riostras de la escalera', () => {
  const conEscalera = (cambios) => ({ ...P, escalera: { ...P.escalera, ...cambios } });

  it('hasta 12 parantes por tramo', () => {
    const e = generarEstructura(conEscalera({ apoyosIntermedios: 6 }), []);
    expect(e.escalera.piezas.filter((p) => p.tipo === 'columna-escalera')).toHaveLength(6);
    expect(validarParametros(conEscalera({ apoyosIntermedios: 13 }))).toHaveProperty(['escalera.apoyosIntermedios']);
  });

  it('riostras en cruz entre parantes consecutivos (3 parantes => 2 cruces)', () => {
    const e = generarEstructura(conEscalera({ apoyosIntermedios: 3, riostras: true }), []);
    const riostras = e.escalera.piezas.filter((p) => p.tipo === 'riostra');
    expect(riostras).toHaveLength(4);
    const items = calcularPresupuesto(e, CATALOGO_INICIAL).items;
    expect(items.find((i) => i.id === INSUMO.RIOSTRA).cortes.barras.flatMap((b) => b.piezas)).toHaveLength(4);
  });

  it('sin riostras el renglón no aparece en una construcción', () => {
    const items = calcularPresupuesto(generarEstructura(conEscalera({ apoyosIntermedios: 3 }), []), CATALOGO_INICIAL).items;
    expect(items.find((i) => i.id === INSUMO.RIOSTRA)).toBeUndefined();
  });
});

describe('tablones: separados, del mismo material o un solo tipo por fila', () => {
  const items = (cambios) => calcularPresupuesto(generarEstructura(conGrada(cambios), []), CATALOGO_INICIAL).items;
  const ids = (cambios) => items(cambios).map((i) => i.id);
  const item = (cambios, id) => items(cambios).find((i) => i.id === id);

  it('separados (por defecto): renglón de asiento y renglón de pie', () => {
    expect(GRADA_INICIAL.tipoTablones).toBe('separados');
    expect(ids({})).toEqual(expect.arrayContaining([INSUMO.GRADA_ASIENTO, INSUMO.GRADA_PIE]));
    expect(ids({})).not.toContain(INSUMO.GRADA_TABLON);
  });

  it('mismo material: los mismos dos tablones por fila, un solo renglón con los metros sumados', () => {
    const e = generarEstructura(conGrada({ tipoTablones: 'mismoMaterial' }), []);
    expect(e.grada.tablones.filter((t) => t.tipo !== 'respaldo')).toHaveLength(12); // igual que separados: asiento + pie en 6 filas
    expect(ids({ tipoTablones: 'mismoMaterial' })).not.toContain(INSUMO.GRADA_ASIENTO);
    const t = item({ tipoTablones: 'mismoMaterial' }, INSUMO.GRADA_TABLON);
    expect(t.cantidad).toBe(72); // 36 m de asiento + 36 m de pie
    expect(t.detalle).toBe('2 por fila x 6 filas de 6.00 m');
  });

  it('un solo tipo: N tablones iguales repartidos de adelante hacia atrás', () => {
    const e = generarEstructura(conGrada({ tipoTablones: 'unico', tablonesPorFila: 3, anchoTablon: 0.25 }), []);
    const fila1 = e.grada.tablones.filter((t) => t.id.startsWith('tablon:1:'));
    expect(fila1).toHaveLength(3);
    // 3 x 25 cm en una fila de 75 cm: cubren toda la profundidad, sin huecos.
    expect(fila1.map((t) => t.centro[2])).toEqual([2.125, 1.875, 1.625].map((z) => expect.closeTo(z, 6)));
    expect(item({ tipoTablones: 'unico' }, INSUMO.GRADA_TABLON).cantidad).toBe(3 * 6 * 6);
  });

  it('un solo tablón por fila queda adelante (donde se sienta)', () => {
    const e = generarEstructura(conGrada({ tipoTablones: 'unico', tablonesPorFila: 1, anchoTablon: 0.4 }), []);
    expect(e.grada.tablones.find((t) => t.id === 'tablon:1:0').centro[2]).toBeCloseTo(2.25 - 0.2);
  });

  it('validación: los tablones tienen que entrar en la fila', () => {
    expect(validarParametros(conGrada({ tipoTablones: 'unico', tablonesPorFila: 4, anchoTablon: 0.25 }))).toHaveProperty(['grada.anchoTablon']);
    expect(validarParametros(conGrada({ tipoTablones: 'unico', tablonesPorFila: 3, anchoTablon: 0.25 }))).toEqual({});
    expect(validarParametros(conGrada({ tipoTablones: 'otro' }))).toHaveProperty(['grada.tipoTablones']);
  });

  it('una grada guardada con la v1.9 se abre con tablones separados', () => {
    const { tipoTablones, anchoTablon, tablonesPorFila, ...gradaV19 } = GRADA_INICIAL; // eslint-disable-line no-unused-vars
    const m = migrarParams({ ...P, tipoProyecto: 'grada', grada: gradaV19 });
    expect(m.grada.tipoTablones).toBe('separados');
    expect(validarParametros(m)).toEqual({});
  });
});

describe('unión de parantes, respaldo y grada desmontable', () => {
  const items = (cambios) => calcularPresupuesto(generarEstructura(conGrada(cambios), []), CATALOGO_INICIAL).items;
  const item = (cambios, id) => items(cambios).find((i) => i.id === id);

  it('unión de parantes: un caño bajo por pórtico y uno a lo largo por línea de parantes', () => {
    const e = generarEstructura(conGrada(), []);
    const uniones = deTipo(e, 'grada-union');
    expect(uniones.filter((u) => u.id.startsWith('grada-union:'))).toHaveLength(5); // 5 pórticos
    expect(uniones.filter((u) => u.id.startsWith('grada-union-largo:'))).toHaveLength(7); // 7 líneas de parantes
    uniones.forEach((u) => expect(u.desde[1]).toBeCloseTo(0.15));
    expect(deTipo(generarEstructura(conGrada({ unionParantes: false }), []), 'grada-union')).toHaveLength(0);
  });

  it('respaldo: tabla parada arriba de cada contrahuella, del ancho elegido', () => {
    const e = generarEstructura(conGrada({ anchoRespaldo: 0.2 }), []);
    const r = e.grada.tablones.find((t) => t.id === 'respaldo:1');
    expect(r.vertical).toBe(true);
    expect(r.ancho).toBe(0.2);
    expect(r.centro[1] + r.ancho / 2).toBeCloseTo(2 * 0.4 - ESPESOR_TABLON); // llega hasta la fila 2
    expect(item({}, INSUMO.GRADA_RESPALDO).cantidad).toBe(5 * 6);
  });

  it('en 3 módulos: pórticos en las puntas de cada módulo, junta de 2 cm y bulones en cada unión', () => {
    const e = generarEstructura(conGrada({ modulos: 3 }), []);
    expect(e.grada.resumen.modulos).toBe(3);
    expect(e.grada.resumen.largoModulo).toBeCloseTo((6 - 2 * 0.02) / 3);
    // Cada módulo de ~2 m lleva 3 pórticos (2 vanos de ~1 m): 9 pórticos.
    expect(deTipo(e, 'grada-zanca')).toHaveLength(9);
    const xs = deTipo(e, 'grada-zanca').map((z) => z.desde[0]).sort((a, b) => a - b);
    expect(xs[3] - xs[2]).toBeCloseTo(0.02); // los dos pórticos de la unión, separados por la junta
    // Bulones: 2 uniones x 2 x (7 parantes + 1 zanca) = 32
    expect(item({ modulos: 3 }, INSUMO.GRADA_BULON).cantidad).toBe(32);
    // Vigas: cada módulo tiene las suyas.
    expect(deTipo(e, 'grada-viga')).toHaveLength(12 * 3);
  });

  it('filas atornillables: 2 tornillos por tablón en cada pórtico', () => {
    // 1 módulo, 5 pórticos; por fila asiento + pie (6 filas) + 5 respaldos = 17 tablones => 17 x 5 x 2
    expect(item({ filasAtornillables: true }, INSUMO.GRADA_TORNILLO).cantidad).toBe(17 * 5 * 2);
    expect(item({}, INSUMO.GRADA_TORNILLO)).toBeUndefined();
  });

  it('validación: unión debajo de la primera fila, respaldo y largo de módulo', () => {
    expect(validarParametros(conGrada({ alturaUnion: 0.35 }))).toHaveProperty(['grada.alturaUnion']);
    expect(validarParametros(conGrada({ anchoRespaldo: 0.5 }))).toHaveProperty(['grada.anchoRespaldo']);
    expect(validarParametros(conGrada({ modulos: 7 }))).toHaveProperty(['grada.modulos']);
    expect(validarParametros(conGrada({ modulos: 6 }))).toEqual({});
  });

  it('aviso: módulos sin riostras', () => {
    expect(generarEstructura(conGrada({ modulos: 2, riostras: 'no' }), []).grada.resumen.avisos.join(' ')).toMatch(/módulos sin riostras/);
  });
});

describe('caños comunes: grosor para el 3D a partir del perfil', () => {
  it('lee caños en mm y ángulos en pulgadas', async () => {
    const { seccionDesdePerfil, CANOS_COMUNES } = await import('./canos.js');
    expect(seccionDesdePerfil('Caño estructural 60x40x2.0')).toBeCloseTo(0.06);
    expect(seccionDesdePerfil('Caño estructural 100x100x2.0')).toBeCloseTo(0.1);
    expect(seccionDesdePerfil('Ángulo 1 1/4" x 1/8"')).toBeCloseTo(0.03175);
    expect(seccionDesdePerfil('Ángulo 1" x 1/8"')).toBeCloseTo(0.0254);
    expect(seccionDesdePerfil('Perfil C 120x50x2.0')).toBeCloseTo(0.12);
    expect(seccionDesdePerfil('lo que diga el herrero')).toBeNull();
    expect(seccionDesdePerfil('')).toBeNull();
    CANOS_COMUNES.forEach((c) => expect(seccionDesdePerfil(c)).not.toBeNull());
  });
});
