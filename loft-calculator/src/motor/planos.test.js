// Tests de los planos para exportar (v1.26). Correr con: npm test
import { describe, it, expect } from 'vitest';
import { vistaDePared, vistaDePlanta, listaDePiezas, perfilDePieza, todasLasVistas } from './planos.js';
import { generarEstructura } from './estructura.js';
import { CATALOGO_INICIAL } from './presupuesto.js';
import { resolverCatalogo, nombrePerfil } from './perfiles.js';
import { PARAMS_INICIALES as P, ABERTURAS_INICIALES } from './parametrosIniciales.js';

const catalogo = resolverCatalogo(CATALOGO_INICIAL);
const e = generarEstructura(P, ABERTURAS_INICIALES);

describe('pared vista desde afuera', () => {
  const frente = vistaDePared(e, P, 'A', catalogo, ABERTURAS_INICIALES);

  it('coordenadas de la pared: x de 0 al largo, y desde el piso', () => {
    expect(frente.largo).toBe(7.5);
    const xs = frente.piezas.flatMap((p) => [p.x1, p.x2]);
    expect(Math.min(...xs)).toBeCloseTo(0);
    expect(Math.max(...xs)).toBeCloseTo(7.5);
    // El marco de piso (grupo 'piso', id marco-piso:A) es de esta pared y está a altura 0.
    const marco = frente.piezas.find((p) => p.id === 'marco-piso:A');
    expect(marco.y1).toBeCloseTo(0);
  });

  it('cotas: columnas cada 2,50 (con las puntas) y las fajas', () => {
    expect(frente.cotas.columnas).toEqual(expect.arrayContaining([0, 2.5, 5, 7.5]));
    expect(frente.cotas.fajas.length).toBeGreaterThan(0);
  });

  it('aberturas con su número de la pantalla y su posición desde la punta 1', () => {
    expect(frente.aberturas.map((a) => a.numero)).toEqual([1, 2]);
    expect(frente.aberturas[0]).toMatchObject({ tipo: 'puerta', ancho: 0.9, desde: 1 });
  });

  it('la lista de piezas suma todas las piezas de la pared, con su perfil', () => {
    const total = frente.lista.reduce((a, g) => a + g.cantidad, 0);
    expect(total).toBe(frente.piezas.length);
    expect(frente.lista.find((g) => g.nombre === 'Columna').perfil).toBe('Caño estructural 100x100x1.6');
    expect(frente.lista.some((g) => g.nombre === 'Columna de esquina')).toBe(true);
  });

  it('revestimiento exterior con las tiras (la ventana se descuenta)', () => {
    expect(frente.revestimiento[0]).toMatchObject({ cara: 'exterior', nombre: 'Panel de pared' });
    expect(frente.revestimiento[0].detalle).toMatch(/3\.25 m.*1\.10 m/);
  });
});

describe('plantas', () => {
  it('piso, entrepiso y techo; el entrepiso con su contorno', () => {
    const { plantas } = todasLasVistas(e, P, catalogo, ABERTURAS_INICIALES);
    expect(plantas.map((p) => p.nivel)).toEqual(['piso', 'piso2', 'techo']);
    const piso2 = plantas[1];
    expect(piso2.contorno).toHaveLength(4);
    expect(piso2.lista.reduce((a, g) => a + g.cantidad, 0)).toBe(piso2.piezas.length);
  });

  it('sin entrepiso no hay planta de entrepiso', () => {
    const sin = generarEstructura({ ...P, anchoEntrepiso: 0, escalera: { ...P.escalera, activa: false } }, []);
    expect(vistaDePlanta(sin, P, 'piso2', catalogo)).toBeNull();
  });
});

describe('perfil de cada pieza', () => {
  it('el de su pared manda sobre el general; el elegido a mano, sobre los dos', () => {
    const otro = catalogo.find((i) => i.categoria === 'hierro' && nombrePerfil(i) === 'Caño estructural 80x80x2.0');
    const columna = e.columnas.find((p) => !p.esquina);
    expect(perfilDePieza({ ...columna, perfilPared: otro.id }, catalogo)).toBe('Caño estructural 80x80x2.0');
    expect(perfilDePieza({ ...columna, perfilPared: otro.id, insumo: 'zanca' }, catalogo)).toBe('Caño estructural 120x60x2.0');
  });

  it('agrupa piezas iguales', () => {
    const p = { tipo: 'montante', grupos: ['A'], largo: 1.851 };
    expect(listaDePiezas([p, { ...p, largo: 1.849 }, { ...p, largo: 2 }], catalogo))
      .toEqual([{ nombre: 'Montante', perfil: 'Caño estructural 50x50x1.6', largo: 2, cantidad: 1 },
        { nombre: 'Montante', perfil: 'Caño estructural 50x50x1.6', largo: 1.85, cantidad: 2 }]);
  });
});
