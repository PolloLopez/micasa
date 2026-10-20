// Tests de cortes compartidos (v1.19.1): renglones del mismo perfil cortan de las mismas barras.
// Correr con: npm test
import { describe, it, expect } from 'vitest';
import { clavePerfil, repartirBarras, compartirCortes } from './cortesCompartidos.js';
import { optimizarCortes } from './optimizadorCortes.js';
import { generarEstructura } from './estructura.js';
import { calcularPresupuesto, CATALOGO_INICIAL } from './presupuesto.js';
import { PARAMS_INICIALES as P } from './parametrosIniciales.js';
import { INSUMO } from './constantes.js';

/** Renglón de perfil como los arma el presupuesto (barra de 6,06 m). */
const renglon = (id, perfil, largosPiezas, precio = 30000) => ({
  id, nombre: id, perfil, largoBarra: 6, largoReal: 6.06, precio, largosPiezas,
  cortes: optimizarCortes(largosPiezas, 6.06), cantidad: optimizarCortes(largosPiezas, 6.06).totalBarras, detalle: '',
});

describe('mismo perfil escrito distinto', () => {
  it('80x80x2 = 80 x 80 x 2.0 = 80×80×2,0 (y sin importar mayúsculas ni acentos)', () => {
    const clave = clavePerfil('Caño estructural 80x80x2');
    expect(clavePerfil('Caño estructural 80x80x2.0')).toBe(clave);
    expect(clavePerfil('caño  estructural 80 x 80 x 2.00')).toBe(clave);
    expect(clavePerfil('CANO ESTRUCTURAL 80×80×2,0')).toBe(clave);
  });

  it('otro hierro sigue siendo otro', () => {
    expect(clavePerfil('Caño estructural 80x80x2')).not.toBe(clavePerfil('Caño estructural 80x80x1.6'));
    expect(clavePerfil('Perfil C 80x40x1.6')).not.toBe(clavePerfil('Caño estructural 80x40x1.6'));
  });
});

describe('repartir las barras compartidas', () => {
  it('según los metros de cada renglón, sumando justo el total', () => {
    expect(repartirBarras(12, [50, 10])).toEqual([10, 2]);
    expect(repartirBarras(3, [1, 1, 1])).toEqual([1, 1, 1]);
    const r = repartirBarras(7, [3.3, 2.2, 1.1]);
    expect(r.reduce((a, n) => a + n, 0)).toBe(7);
  });
});

describe('el caso de Leandro: columnas y zanca de 80x80x2', () => {
  // Columnas de 4,70 (sobra ~1,36 por barra) y zanca con piezas cortas que entran en esos sobrantes.
  const columnas = renglon('Columnas', 'Caño estructural 80x80x2', Array(11).fill(4.7));
  const zanca = renglon('Zanca', 'Caño estructural 80x80x2.0', [1.68, 1.03, 0.8, 0.8, 0.8, 0.8, 0.8, 0.8, 0.8, 0.8, 0.7]);

  it('juntas usan menos barras que por separado, y cada pieza sabe de qué renglón es', () => {
    const { items, grupos } = compartirCortes([columnas, zanca]);
    const separadas = columnas.cortes.totalBarras + zanca.cortes.totalBarras; // 11 + 2
    expect(grupos).toHaveLength(1);
    expect(grupos[0].compartido).toBe(true);
    expect(grupos[0].cortes.totalBarras).toBeLessThan(separadas);
    expect(items[0].cantidad + items[1].cantidad).toBe(grupos[0].cortes.totalBarras);
    const origenes = grupos[0].cortes.barras.flatMap((b) => b.origenes);
    expect(origenes.filter((o) => o === 'Zanca')).toHaveLength(11);
    expect(items[1].detalle).toMatch(/comparte barras con Columnas/);
  });

  it('con otro precio no se juntan y se avisa', () => {
    const cara = { ...zanca, precio: 99999 };
    const { items, grupos } = compartirCortes([columnas, cara]);
    expect(grupos.every((g) => !g.compartido)).toBe(true);
    expect(items[1].cantidad).toBe(zanca.cortes.totalBarras);
    expect(items[1].avisoPrecio).toMatch(/otro precio/);
  });

  it('precios distintos: un aviso por perfil con cada precio y quién lo usa (para igualarlos)', () => {
    const otra = renglon('Columnas de escalera', 'Caño estructural 80X80X2', [2.5]);
    const { preciosDistintos } = compartirCortes([columnas, { ...zanca, precio: 42000 }, otra]);
    expect(preciosDistintos).toHaveLength(1);
    expect(preciosDistintos[0].precios).toEqual([
      { precio: 30000, renglones: [{ id: 'Columnas', nombre: 'Columnas' }, { id: 'Columnas de escalera', nombre: 'Columnas de escalera' }] },
      { precio: 42000, renglones: [{ id: 'Zanca', nombre: 'Zanca' }] },
    ]);
  });

  it('si juntar no ahorra, cada renglón queda como estaba', () => {
    const a = renglon('A', 'Caño 50x50', [6, 6]);
    const b = renglon('B', 'Caño 50x50', [6]);
    const { items, grupos } = compartirCortes([a, b]);
    expect(grupos).toHaveLength(2);
    expect(items.map((i) => i.cantidad)).toEqual([2, 1]);
  });
});

describe('presupuesto completo', () => {
  const e = generarEstructura(P, []);

  it('compartir nunca sube el total y las barras de cada grupo coinciden con sus renglones', () => {
    const separado = calcularPresupuesto(e, CATALOGO_INICIAL, { compartir: false });
    const junto = calcularPresupuesto(e, CATALOGO_INICIAL);
    expect(junto.total).toBeLessThanOrEqual(separado.total);
    junto.gruposCortes.forEach((g) => {
      const suma = junto.items.filter((i) => g.renglones.some((r) => r.id === i.id)).reduce((a, i) => a + i.cantidad, 0);
      expect(suma).toBe(g.cortes.totalBarras);
    });
  });

  it('sin compartir, cada renglón es su propio grupo (como antes de v1.19.1)', () => {
    const separado = calcularPresupuesto(e, CATALOGO_INICIAL, { compartir: false });
    expect(separado.gruposCortes.every((g) => g.renglones.length === 1)).toBe(true);
    const columnas = separado.items.find((i) => i.id === INSUMO.COLUMNA);
    expect(columnas.cantidad).toBe(columnas.cortes.totalBarras);
  });
});
