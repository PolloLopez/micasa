// Tests de las instalaciones (v1.57): recorrido por afuera, curvas y materiales. Correr con: npm test
import { describe, it, expect } from 'vitest';
import { puntoNuevo, tramoNuevo, recorridoDelTramo, materialesDelSistema, validarInstalaciones, completarInstalaciones,
  INSTALACIONES_INICIALES } from './instalaciones.js';
import { PARAMS_INICIALES } from './parametrosIniciales.js';
import { migrarParams } from './migracion.js';
import { validarParametros } from './validacion.js';

// Casa de 7,50 (A y C) x 4,50 (B y D), elevada 0,50 m.
const params = { ...PARAMS_INICIALES, largo: 7.5, ancho: 4.5, elevacion: 0.5 };
const pisoDe = () => 0.5;

const conPuntos = (sistema, ...defs) => {
  const puntos = [];
  defs.forEach(([tipo, cambios]) => puntos.push({ ...puntoNuevo(puntos, sistema, tipo), ...cambios }));
  return puntos;
};

describe('recorrido por afuera de la casa', () => {
  it('en la misma pared: sale, sube al recorrido, corre y baja; 2 curvas por punta', () => {
    const puntos = conPuntos('electrica', ['tablero', { lado: 'A', distancia: 1, altura: 1.6 }], ['toma', { lado: 'A', distancia: 4, altura: 0.3 }]);
    const t = { ...tramoNuevo([], 'electrica', 1, 2), alturaRecorrido: 2.4 };
    const r = recorridoDelTramo(t, puntos, params, pisoDe);
    expect(r.horizontal).toBeCloseTo(3, 9);
    expect(r.vertical).toBeCloseTo(0.8 + 2.1, 9);
    expect(r.largo).toBeCloseTo(3 + 2.9 + 2 * 0.15, 9); // + atravesar la pared en cada punta
    expect(r.curvas).toBe(4);
    expect(r.esquinas).toBe(0);
  });

  it('a otra pared: da la vuelta por el lado más corto y suma una curva por esquina', () => {
    // A (perímetro 0..7,5) a 7 m → B a 1 m: 0,5 + 1 = 1,5 m pasando 1 esquina (no 21 m por el otro lado).
    const puntos = conPuntos('agua', ['entrada', { lado: 'A', distancia: 7, altura: 0.3 }], ['canilla', { lado: 'B', distancia: 1, altura: 0.3 }]);
    const r = recorridoDelTramo({ ...tramoNuevo([], 'agua', 1, 2), alturaRecorrido: 0.3 }, puntos, params, pisoDe);
    expect(r.horizontal).toBeCloseTo(1.5, 9);
    expect(r.esquinas).toBe(1);
    expect(r.curvas).toBe(3); // la esquina + el giro en cada punta (están a la altura del recorrido)
    // Al revés (D a 0,5 m → A a 0,5 m), también por la esquina de D-A: 4 + 0,5 = 4,5 m.
    const otra = conPuntos('agua', ['entrada', { lado: 'D', distancia: 0.5, altura: 0.3 }], ['canilla', { lado: 'A', distancia: 0.5, altura: 0.3 }]);
    expect(recorridoDelTramo({ ...tramoNuevo([], 'agua', 1, 2), alturaRecorrido: 0.3 }, otra, params, pisoDe).horizontal).toBeCloseTo(4.5, 9);
  });

  it('la lámpara en el medio del techo suma lo que va hacia adentro y una curva', () => {
    const puntos = conPuntos('electrica', ['cajaPaso', { lado: 'C', distancia: 2, altura: 2.4 }], ['lampara', { lado: 'C', distancia: 2, altura: 2.4, adentro: 2.25 }]);
    const r = recorridoDelTramo({ ...tramoNuevo([], 'electrica', 1, 2), alturaRecorrido: 2.4 }, puntos, params, pisoDe);
    expect(r.largo).toBeCloseTo(0.3 + 2.25, 9);
    // La pared C va de x = 3,75 a -3,75 (vista desde afuera): a 2 m, x = 1,75; la lámpara, 2,25 m adentro (z = 0).
    expect(r.puntos.at(-1).map((n) => Math.round(n * 1000) / 1000)).toEqual([1.75, 2.9, 0]);
    expect(r.curvas).toBe(3); // el giro de cada punta + el de "adentro"
  });
});

describe('materiales', () => {
  it('caño rígido de PVC: barras, cuplas, curvas, grampas, conectores, cajas y el cable de 3 conductores', () => {
    const puntos = conPuntos('electrica', ['tablero', { lado: 'A', distancia: 1, altura: 1.6 }], ['toma', { lado: 'A', distancia: 4, altura: 0.3 }]);
    const p = { ...params, instalaciones: { puntos, tramos: [{ ...tramoNuevo([], 'electrica', 1, 2), alturaRecorrido: 2.4 }], precios: {} } };
    const { materiales, tramos, total } = materialesDelSistema(p, null, 'electrica');
    const de = (n) => materiales.find((m) => m.nombre.startsWith(n))?.cantidad;
    expect(tramos[0]).toMatchObject({ nombre: 'Tablero → Toma', curvas: 4 });
    // 6,2 m → 3 barras de 3 m, 2 cuplas, 4 curvas, 8 grampas (cada 0,8 m), 2 conectores
    expect(de('Caño rígido PVC ø20 mm')).toBe(3);
    expect(de('Cupla PVC ø20')).toBe(2);
    expect(de('Curva PVC ø20')).toBe(4);
    expect(de('Grampa omega ø20')).toBe(8);
    expect(de('Conector PVC ø20')).toBe(2);
    expect(de('Caja rectangular 5x10')).toBe(1);
    expect(de('Cable 2,5 mm²')).toBe(Math.ceil((6.2 + 0.6) * 3));
    expect(total).toBeGreaterThan(0);
  });

  it('los precios cargados a mano ganan a los de ejemplo', () => {
    const puntos = conPuntos('gas', ['garrafa', { lado: 'B', distancia: 1 }], ['cocina', { lado: 'B', distancia: 3 }]);
    const p = { ...params, instalaciones: { puntos, tramos: [tramoNuevo([], 'gas', 1, 2)], precios: { 'Garrafa 10 kg': 50000 } } };
    const garrafa = materialesDelSistema(p, null, 'gas').materiales.find((m) => m.nombre === 'Garrafa 10 kg');
    expect(garrafa).toMatchObject({ cantidad: 1, precio: 50000, total: 50000 });
  });

  it('se valida y los proyectos de antes arrancan vacíos', () => {
    const puntos = conPuntos('agua', ['canilla', {}], ['ducha', {}]);
    const ok = { puntos, tramos: [tramoNuevo([], 'agua', 1, 2)], precios: {} };
    expect(validarInstalaciones(ok)).toEqual({});
    expect(validarInstalaciones({ ...ok, tramos: [{ ...ok.tramos[0], hasta: 1 }] })).toHaveProperty(['instalaciones.tramos.0']);
    expect(validarInstalaciones({ ...ok, tramos: [{ ...ok.tramos[0], material: 'pvc' }] })).toHaveProperty(['instalaciones.tramos.0']);
    expect(validarInstalaciones({ ...ok, puntos: [{ ...puntos[0], lado: 'X' }, puntos[1]] })).toHaveProperty(['instalaciones.puntos.0']);
    const { instalaciones, ...viejo } = PARAMS_INICIALES;
    expect(instalaciones).toEqual(INSTALACIONES_INICIALES);
    const migrado = migrarParams(viejo);
    expect(migrado.instalaciones).toEqual(INSTALACIONES_INICIALES);
    expect(validarParametros({ ...migrado, instalaciones: completarInstalaciones(ok) })).toEqual({});
  });
});

describe('instalaciones en el Excel', () => {
  it('una hoja con los tramos y los materiales de cada sistema elegido', async () => {
    const { hojasDeObra } = await import('../proyecto/exportarExcel.js');
    const { materialesDeInstalaciones } = await import('./instalaciones.js');
    const puntos = conPuntos('agua', ['entrada', { lado: 'A', distancia: 1 }], ['ducha', { lado: 'A', distancia: 3 }]);
    const p = { ...params, instalaciones: { puntos, tramos: [tramoNuevo([], 'agua', 1, 2)], precios: {} } };
    const instalaciones = materialesDeInstalaciones(p, null);
    expect(instalaciones.map((s) => s.sistema)).toEqual(['agua']);
    const hojas = hojasDeObra({ nombre: 'x', params: p, vistas: { paredes: [], plantas: [] }, items: [], total: 0, instalaciones }, { instAgua: true });
    expect(hojas.map((h) => h.nombre)).toEqual(['Instalaciones']);
    const filas = hojas[0].filas.map((x) => (Array.isArray(x) ? x : x.celdas));
    expect(filas.some((x) => x[0] === 'Entrada de agua (red) → Ducha' && x[1] === 'Caño termofusión ø20')).toBe(true);
    expect(hojasDeObra({ nombre: 'x', params: p, vistas: { paredes: [], plantas: [] }, items: [], total: 0, instalaciones }, { instAgua: false })).toEqual([]);
  });
});
