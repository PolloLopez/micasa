// Tests de la lista de perfiles (v1.21). Correr con: npm test
import { describe, it, expect } from 'vitest';
import {
  nombrePerfil, kgPorMetro, perfilDesdeTexto, armarListaDePerfiles, resolverCatalogo, revisarPerfil, enPulgadas, PERFIL_NUEVO, fichaDePerfil,
} from './perfiles.js';
import { normalizarCatalogo } from './migracion.js';
import { CATALOGO_INICIAL, CATALOGO_FIJO, calcularPresupuesto } from './presupuesto.js';
import { generarEstructura } from './estructura.js';
import { PARAMS_INICIALES as P } from './parametrosIniciales.js';
import { INSUMO } from './constantes.js';

const perfil = (cambios) => ({ ...PERFIL_NUEVO, ...cambios });

describe('nombre y peso de cada tipo', () => {
  it('caño cuadrado 80x80x2: nombre como se vende y ~4,9 kg/m', () => {
    const p = perfil({ tipo: 'cuadrado', a: 80, espesor: 2 });
    expect(nombrePerfil(p)).toBe('Caño estructural 80x80x2.0');
    expect(kgPorMetro(p)).toBeCloseTo(4.9, 1); // (80² − 76²) mm² × 0,00785
  });

  it('perfil C con y sin labio, U, rectangular, redondo, planchuela', () => {
    expect(nombrePerfil(perfil({ tipo: 'c', a: 100, b: 50, c: 15, espesor: 2 }))).toBe('Perfil C 100x50x15x2.0');
    expect(nombrePerfil(perfil({ tipo: 'c', a: 80, b: 40, c: 0, espesor: 1.6 }))).toBe('Perfil C 80x40x1.6');
    expect(nombrePerfil(perfil({ tipo: 'u', a: 80, b: 40, espesor: 2 }))).toBe('Perfil U 80x40x2.0');
    expect(nombrePerfil(perfil({ tipo: 'rectangular', a: 100, b: 50, espesor: 2 }))).toBe('Caño estructural 100x50x2.0');
    expect(nombrePerfil(perfil({ tipo: 'redondo', a: 50.8, espesor: 2 }))).toBe('Caño redondo 50.8x2.0');
    expect(nombrePerfil(perfil({ tipo: 'planchuela', a: 50, espesor: 6.35 }))).toBe('Planchuela 50x6.35');
    // C 100x50x15x2: 2 × (100 + 100 + 30 − 8) = 444 mm² => 3,49 kg/m
    expect(kgPorMetro(perfil({ tipo: 'c', a: 100, b: 50, c: 15, espesor: 2 }))).toBeCloseTo(3.49, 2);
  });

  it('ángulos en pulgadas cuando son fracciones comunes', () => {
    expect(enPulgadas(38.1)).toBe('1 1/2"');
    expect(enPulgadas(4.7625)).toBe('3/16"');
    expect(enPulgadas(40)).toBeNull();
    expect(nombrePerfil(perfil({ tipo: 'angulo', a: 38.1, b: 38.1, espesor: 4.7625 }))).toBe('Ángulo 1 1/2" x 3/16"');
    expect(nombrePerfil(perfil({ tipo: 'angulo', a: 40, b: 40, espesor: 3 }))).toBe('Ángulo 40x40x3.0');
  });

  it('otro: texto libre y kg/m a mano', () => {
    const p = perfil({ tipo: 'otro', texto: 'Hierro torsionado 12 mm', kgm: 0.888 });
    expect(nombrePerfil(p)).toBe('Hierro torsionado 12 mm');
    expect(kgPorMetro(p)).toBe(0.888);
  });

  it('valida medidas imposibles', () => {
    expect(revisarPerfil(perfil({ tipo: 'cuadrado', a: 40, espesor: 2 }))).toBeNull();
    expect(revisarPerfil(perfil({ tipo: 'cuadrado', a: 4, espesor: 2 }))).toMatch(/Lado/);
    expect(revisarPerfil(perfil({ tipo: 'cuadrado', a: 10, espesor: 5 }))).toMatch(/espesor/);
    expect(revisarPerfil(perfil({ tipo: 'c', a: 80, b: 40, c: 0, espesor: 1.6 }))).toBeNull(); // labio opcional
  });
});

describe('leer los perfiles escritos a mano (proyectos de antes)', () => {
  it('reconoce los textos de fábrica y los de Leandro', () => {
    expect(perfilDesdeTexto('Caño estructural 80x80x2')).toMatchObject({ tipo: 'cuadrado', a: 80, b: 80, espesor: 2 });
    expect(perfilDesdeTexto('Caño estructural 120x60x2.0')).toMatchObject({ tipo: 'rectangular', a: 120, b: 60, espesor: 2 });
    expect(perfilDesdeTexto('Perfil C 80x40x1.6')).toMatchObject({ tipo: 'c', a: 80, b: 40, c: 0, espesor: 1.6 });
    expect(perfilDesdeTexto('Perfil C 100x50x15x2')).toMatchObject({ tipo: 'c', a: 100, b: 50, c: 15, espesor: 2 });
    const angulo = perfilDesdeTexto('Ángulo 1 1/2" x 3/16"');
    expect(angulo.tipo).toBe('angulo');
    expect(nombrePerfil(angulo)).toBe('Ángulo 1 1/2" x 3/16"');
  });

  it('lo que no reconoce queda como "otro" con el texto tal cual', () => {
    expect(perfilDesdeTexto('Hierro del 8')).toMatchObject({ tipo: 'otro', texto: 'Hierro del 8' });
  });
});

describe('armar la lista desde un catálogo viejo', () => {
  const uso = (id, texto, precio, largoBarra = 6) => ({ id, categoria: 'perfil', nombre: id, perfil: texto, precio, largoBarra });

  it('"80x80x2" y "80x80x2.0" son UN perfil; precios distintos => el más usado y aviso', () => {
    const { usos, perfiles } = armarListaDePerfiles([
      uso('columna', 'Caño estructural 80x80x2', 38000),
      uso('zanca', 'Caño estructural 80 x 80 x 2.0', 42000),
      uso('columnaEscalera', 'Caño estructural 80x80x2.0', 42000),
      uso('marco', 'Perfil C 80x40x1.6', 22000),
    ]);
    expect(perfiles).toHaveLength(2);
    const cano = perfiles.find((p) => p.tipo === 'cuadrado');
    expect(cano).toMatchObject({ precio: 42000, revisarPrecio: true });
    expect(new Set(usos.slice(0, 3).map((u) => u.perfilId))).toEqual(new Set([cano.id]));
    expect(perfiles.find((p) => p.tipo === 'c').revisarPrecio).toBeUndefined();
  });

  it('mismo perfil con otro largo de barra => dos perfiles (6 m y 12 m se compran distinto)', () => {
    const { perfiles } = armarListaDePerfiles([uso('a', 'Caño 50x50x2', 1, 6), uso('b', 'Caño 50x50x2', 1, 12)]);
    expect(perfiles).toHaveLength(2);
  });

  it('el catálogo de fábrica no pide revisar precios y los usos repetidos comparten perfil', () => {
    const lista = CATALOGO_INICIAL.filter((i) => i.categoria === 'hierro');
    expect(lista.some((p) => p.revisarPrecio)).toBe(false);
    const de = (id) => CATALOGO_INICIAL.find((i) => i.id === id).perfilId;
    expect(de(INSUMO.TRANSVERSAL_PISO)).toBe(de(INSUMO.CORREA)); // los dos C 80x40x1.6
  });

  it('normalizarCatalogo conserva la lista guardada y es estable (abrir dos veces da lo mismo)', () => {
    const una = normalizarCatalogo(CATALOGO_INICIAL);
    expect(normalizarCatalogo(una)).toEqual(una);
  });

  it('proyecto vacío (perfiles en blanco): sin lista y usos sin perfil', () => {
    const vacio = normalizarCatalogo(CATALOGO_FIJO.map((i) => ({ ...i, perfil: '', precio: 0 })));
    expect(vacio.filter((i) => i.categoria === 'hierro')).toHaveLength(0);
    expect(vacio.find((i) => i.id === INSUMO.COLUMNA).perfilId).toBeNull();
  });
});

describe('el presupuesto usa el perfil de la lista', () => {
  const e = generarEstructura(P, []);
  const idCano = CATALOGO_INICIAL.find((i) => i.id === INSUMO.COLUMNA).perfilId;

  it('cambiar el precio del perfil cambia todos sus usos', () => {
    const caro = CATALOGO_INICIAL.map((i) => (i.id === idCano ? { ...i, precio: 100000 } : i));
    const r = calcularPresupuesto(e, caro);
    expect(r.items.find((i) => i.id === INSUMO.COLUMNA).precio).toBe(100000);
    expect(resolverCatalogo(caro).find((i) => i.id === INSUMO.MARCO_ABERTURA).precio).toBe(100000); // sin aberturas no hay renglón
  });

  it('cambiar el perfil de un uso: toma nombre, barra y precio del otro perfil', () => {
    const otro = CATALOGO_INICIAL.find((i) => i.categoria === 'hierro' && i.id !== idCano);
    const cat = CATALOGO_INICIAL.map((i) => (i.id === INSUMO.COLUMNA ? { ...i, perfilId: otro.id } : i));
    const columna = resolverCatalogo(cat).find((i) => i.id === INSUMO.COLUMNA);
    expect(columna).toMatchObject({ perfil: nombrePerfil(otro), precio: otro.precio, largoBarra: otro.largoBarra });
  });
});

describe('ficha para el pedido (v1.30.4)', () => {
  it('cada medida con su nombre y el espesor', () => {
    expect(fichaDePerfil({ tipo: 'c', a: 80, b: 40, c: 0, espesor: 1.6, largoBarra: 12 }).medidas).toBe('Alto 80 mm · Ala 40 mm · Espesor 1.6 mm');
    expect(fichaDePerfil({ tipo: 'c', a: 100, b: 50, c: 15, espesor: 2, largoBarra: 12 }).medidas).toBe('Alto 100 mm · Ala 50 mm · Labio 15 mm · Espesor 2.0 mm');
    expect(fichaDePerfil({ tipo: 'rectangular', a: 100, b: 50, espesor: 2, largoBarra: 6 })).toMatchObject({ tipo: 'Caño rectangular', medidas: 'Alto 100 mm · Ancho 50 mm · Espesor 2.0 mm' });
    expect(fichaDePerfil({ tipo: 'cuadrado', a: 80, b: 80, espesor: 2, largoBarra: 6 }).medidas).toBe('Lado 80 mm · Espesor 2.0 mm');
  });

  it('los ángulos también en pulgadas; y los kilos de una barra', () => {
    const f = fichaDePerfil({ tipo: 'angulo', a: 38.1, b: 38.1, espesor: 4.7625, largoBarra: 6 });
    expect(f.medidas).toBe('Ala 38.1 mm (1 1/2") · Otra ala 38.1 mm (1 1/2") · Espesor 4.76 mm (3/16")');
    const caño = { tipo: 'cuadrado', a: 80, b: 80, espesor: 2, largoBarra: 6 };
    expect(fichaDePerfil(caño).kgPorBarra).toBeCloseTo(kgPorMetro(caño) * 6);
  });
});
