// Tests del montaje industrial (mesas y tanques). Correr con: npm test
import { describe, it, expect } from 'vitest';
import {
  MESA_INICIAL, TANQUE_INICIAL, MONTAJE_INICIAL, generarMesa, generarTanque, cuentasTanque, idNuevoComponente,
} from './montaje.js';
import { generarEstructura, listarPiezas } from './estructura.js';
import { calcularPresupuesto, CATALOGO_INICIAL } from './presupuesto.js';
import { validarParametros } from './validacion.js';
import { migrarParams } from './migracion.js';
import { INSUMO } from './constantes.js';
import { PARAMS_INICIALES as P } from './parametrosIniciales.js';
import { montajeNuevo, montajeEjemplo } from '../proyecto/proyectosBase.js';
import { describirPieza } from '../descripcionPiezas.js';

const mesa = (cambios = {}) => ({ ...MESA_INICIAL, id: 'c1', ...cambios });
const tanque = (cambios = {}) => ({ ...TANQUE_INICIAL, id: 'c2', ...cambios });
const conMontaje = (componentes) => ({ ...P, tipoProyecto: 'montaje', montaje: { componentes } });
const deTipo = (piezas, tipo) => piezas.filter((p) => p.tipo === tipo);

describe('mesa / bastidor', () => {
  const m = generarMesa(mesa());

  it('mesa de 2 x 1 x 0,90: 4 patas, marco arriba y abajo, 3 travesaños bajo la tapa', () => {
    expect(deTipo(m.piezas, 'mont-pata')).toHaveLength(4);
    deTipo(m.piezas, 'mont-pata').forEach((p) => expect(p.largo).toBeCloseTo(0.9));
    expect(deTipo(m.piezas, 'mont-marco')).toHaveLength(8);
    expect(deTipo(m.piezas, 'mont-travesano')).toHaveLength(3);
    deTipo(m.piezas, 'mont-travesano').forEach((p) => expect(p.largo).toBeCloseTo(1));
  });

  it('tapa de chapa: 1 chapa de 2,44 x 1,22 alcanza para 2 x 1', () => {
    expect(m.cantidades.chapasMesa).toBe(1);
    // 3 x 1,5: acostadas harían falta 2 x 2 = 4; paradas (1,22 a lo largo) alcanzan 3 x 1 = 3.
    expect(generarMesa(mesa({ largo: 3, ancho: 1.5 })).cantidades.chapasMesa).toBe(3);
    expect(generarMesa(mesa({ tapa: 'madera' })).cantidades.m2Madera).toBeCloseTo(2);
  });

  it('patas intermedias, sin marco inferior y riostras', () => {
    const larga = generarMesa(mesa({ largo: 4, separacionPatas: 2, marcoInferior: false, riostras: 'todas' }));
    expect(deTipo(larga.piezas, 'mont-pata')).toHaveLength(6); // 3 por lado
    expect(deTipo(larga.piezas, 'mont-marco')).toHaveLength(4); // solo el de arriba
    expect(deTipo(larga.piezas, 'riostra')).toHaveLength(2 * 2 + 2 * 2 * 2); // cabeceras + 2 vanos x 2 lados
  });

  it('avisos: larga sin patas intermedias y alta sin riostras', () => {
    expect(generarMesa(mesa({ largo: 3 })).resumen.avisos.join(' ')).toMatch(/sin patas intermedias/);
    expect(generarMesa(mesa({ alto: 1.5 })).resumen.avisos.join(' ')).toMatch(/sin riostras/);
  });

  it('se ubica y gira en la planta (90°: el largo pasa a ir en z)', () => {
    const girada = generarMesa(mesa({ x: 5, z: 1, rotacion: 90 }));
    const pata = girada.piezas.find((p) => p.id === 'c1:pata:0:0'); // local (-1, -0,5)
    expect(pata.desde[0]).toBeCloseTo(5 + 0.5);
    expect(pata.desde[2]).toBeCloseTo(1 - 1);
  });
});

describe('tanque cilíndrico', () => {
  it('cuentas del tanque de ejemplo (Ø 1,20 x 1,50, dos tapas, chapa de 3 mm)', () => {
    const c = cuentasTanque(tanque());
    expect(c.anillos).toBe(2); // 1,50 m de alto / 1,22 de ancho de chapa
    expect(c.chapasPorAnillo).toBe(2); // perímetro 3,77 m / 2,44
    expect(c.chapasEnvolvente).toBe(4);
    expect(c.chapasTapas).toBe(1); // dos discos de 1,20 entran en una chapa
    expect(c.chapas).toBe(5);
    expect(c.soldadura).toBeCloseTo(2 * 1.5 + 3 * Math.PI * 1.2); // 2 costuras + 1 unión de anillos + 2 tapas
    expect(c.volumenLitros).toBeCloseTo(Math.PI * 0.36 * 1.5 * 1000);
    expect(c.pesoChapa).toBeCloseTo((Math.PI * 1.2 * 1.5 + 2 * Math.PI * 0.36) * 0.003 * 7850);
  });

  it('diámetro mayor que el ancho de la chapa: tapas en partes, con aviso', () => {
    const grande = tanque({ diametro: 2 });
    expect(cuentasTanque(grande).tapaEnPartes).toBe(true);
    expect(generarTanque(grande).resumen.avisos.join(' ')).toMatch(/en partes/);
  });

  it('vertical: patas alrededor que suben 30 cm por la envolvente', () => {
    const t = generarTanque(tanque());
    const patas = deTipo(t.piezas, 'mont-pata');
    expect(patas).toHaveLength(4);
    patas.forEach((p) => expect(p.hasta[1]).toBeCloseTo(0.9));
    expect(t.cilindros[0].eje).toBe('y');
    expect(t.cilindros[0].centro[1]).toBeCloseTo(0.6 + 0.75);
  });

  it('horizontal: cunas de dos patas y un travesaño; el eje gira con el componente', () => {
    const t = generarTanque(tanque({ orientacion: 'horizontal', apoyos: 2 }));
    expect(deTipo(t.piezas, 'mont-pata')).toHaveLength(4);
    expect(deTipo(t.piezas, 'mont-travesano')).toHaveLength(2);
    expect(t.cilindros[0].eje).toBe('x');
    expect(generarTanque(tanque({ orientacion: 'horizontal', rotacion: 90 })).cilindros[0].eje).toBe('z');
  });
});

describe('montaje en la estructura y el presupuesto', () => {
  const e = generarEstructura(conMontaje(MONTAJE_INICIAL.componentes), []);
  const items = calcularPresupuesto(e, CATALOGO_INICIAL).items;
  const item = (id) => items.find((i) => i.id === id);

  it('es un proyecto propio: solo las piezas del montaje', () => {
    expect(e.paredes).toEqual([]);
    expect(e.grada).toBeNull();
    expect(listarPiezas(e).every((p) => p.grupos.includes('montaje'))).toBe(true);
  });

  it('presupuesto: patas, marcos, chapas, soldadura (sin renglones de construcción)', () => {
    expect(items.map((i) => i.id)).toEqual([
      INSUMO.MONTAJE_PATA, INSUMO.MONTAJE_MARCO, INSUMO.MONTAJE_CHAPA_TANQUE, INSUMO.MONTAJE_CHAPA_MESA,
      INSUMO.MONTAJE_MADERA, INSUMO.MONTAJE_SOLDADURA,
    ]);
    expect(item(INSUMO.MONTAJE_CHAPA_TANQUE).cantidad).toBe(5);
    expect(item(INSUMO.MONTAJE_CHAPA_MESA).cantidad).toBe(1);
    expect(item(INSUMO.MONTAJE_SOLDADURA).cantidad).toBe(14.4); // 14,31 m hacia arriba al decímetro
    expect(item(INSUMO.MONTAJE_PATA).cortes.barras.flatMap((b) => b.piezas)).toHaveLength(4 + 4);
  });

  it('las piezas se describen por su componente y se pueden editar', () => {
    const pata = listarPiezas(e).find((p) => p.id === 'c1:pata:0:0');
    expect(describirPieza(pata, 'A')).toBe('Pata · Mesa de trabajo · 0.90 m');
    const editada = generarEstructura({ ...conMontaje(MONTAJE_INICIAL.componentes), piezasEditadas: { 'c1:pata:0:0': { recorteFin: 0.1 } } }, []);
    expect(listarPiezas(editada).find((p) => p.id === 'c1:pata:0:0').largo).toBeCloseTo(0.8);
  });
});

describe('validación y proyectos de montaje', () => {
  it('ejemplo y montaje nuevo son válidos', () => {
    [montajeNuevo(), montajeEjemplo()].forEach((proyecto) => expect(validarParametros(proyecto.params)).toEqual({}));
    expect(montajeNuevo().params.montaje.componentes).toHaveLength(1);
  });

  it('errores por componente, en su campo', () => {
    expect(validarParametros(conMontaje([mesa({ ancho: 0 })]))).toHaveProperty(['montaje.componentes.0.ancho']);
    expect(validarParametros(conMontaje([mesa(), tanque({ id: 'c1' })]))).toHaveProperty(['montaje.componentes.1.id']);
    expect(validarParametros(conMontaje([tanque({ orientacion: 'horizontal', apoyos: 6 })]))).toHaveProperty(['montaje.componentes.0.apoyos']);
    expect(validarParametros(conMontaje([mesa({ alturaMarcoInferior: 0.9 })]))).toHaveProperty(['montaje.componentes.0.alturaMarcoInferior']);
    expect(validarParametros(conMontaje([{ ...mesa(), tipo: 'cinta' }]))).toHaveProperty(['montaje.componentes.0.tipo']);
  });

  it('ids nuevos de componente', () => {
    expect(idNuevoComponente([])).toBe('c1');
    expect(idNuevoComponente([{ id: 'c1' }, { id: 'c7' }])).toBe('c8');
  });

  it('un proyecto de la v1.10 se abre con el montaje de ejemplo guardado (sin usarlo)', () => {
    const { montaje, ...viejo } = P; // eslint-disable-line no-unused-vars
    const m = migrarParams(viejo);
    expect(m.tipoProyecto).toBe('construccion');
    expect(m.montaje.componentes).toHaveLength(2);
    expect(validarParametros(m)).toEqual({});
  });
});
