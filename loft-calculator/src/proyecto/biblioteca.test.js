// Tests de "Mis proyectos". Correr con: npm test
import { describe, it, expect } from 'vitest';
import {
  crearEntrada, guardarEntrada, borrarEntrada, duplicarEntrada, renombrarEntrada,
  ordenarPorFecha, abrirEntrada, hayCambiosSinGuardar, esBibliotecaValida,
  crearRespaldo, importarRespaldo,
} from './biblioteca.js';
import { proyectoEjemplo, proyectoVacio } from './proyectosBase.js';

const F1 = new Date('2026-10-01T10:00:00Z');
const F2 = new Date('2026-10-05T10:00:00Z');
const loft = proyectoEjemplo();
const galpon = { ...proyectoVacio(), nombre: 'Galpón de Juan' };

describe('biblioteca de proyectos', () => {
  const e1 = crearEntrada(loft, { id: 'a', nombre: 'Loft Mercedes', fecha: F1 });
  const e2 = crearEntrada(galpon, { id: 'b', fecha: F2 });
  const lista = guardarEntrada(guardarEntrada([], e1), e2);

  it('guarda con el nombre elegido (o el del proyecto)', () => {
    expect(lista.map((e) => e.nombre)).toEqual(['Loft Mercedes', 'Galpón de Juan']);
    expect(crearEntrada(proyectoVacio(), { fecha: F1 }).nombre).toBe('Proyecto sin nombre');
  });

  it('guardar de nuevo con el mismo id reemplaza (no duplica)', () => {
    const cambiado = crearEntrada({ ...loft, params: { ...loft.params, largo: 9 } }, { id: 'a', nombre: 'Loft Mercedes', fecha: F2 });
    const r = guardarEntrada(lista, cambiado);
    expect(r).toHaveLength(2);
    expect(r.find((e) => e.id === 'a').datos.params.largo).toBe(9);
  });

  it('abrir devuelve el proyecto validado', () => {
    const r = abrirEntrada(e1);
    expect(r.ok).toBe(true);
    expect(r.proyecto.nombre).toBe('Loft Mercedes');
    expect(r.proyecto.aberturas).toHaveLength(2);
  });

  it('abrir una entrada rota no carga nada', () => {
    const rota = { ...e1, datos: { ...e1.datos, params: { ...e1.datos.params, largo: -1 } } };
    expect(abrirEntrada(rota).ok).toBe(false);
  });

  it('duplicar, renombrar y borrar', () => {
    const conCopia = duplicarEntrada(lista, 'a', { nuevoIdCopia: 'c', fecha: F2 });
    expect(conCopia).toHaveLength(3);
    expect(conCopia.find((e) => e.id === 'c').nombre).toBe('Loft Mercedes (copia)');
    const renombrada = renombrarEntrada(conCopia, 'c', '  Loft con alero ');
    expect(renombrada.find((e) => e.id === 'c').nombre).toBe('Loft con alero');
    expect(renombrarEntrada(conCopia, 'c', '   ')).toBe(conCopia); // nombre vacío: no cambia
    expect(borrarEntrada(renombrada, 'a').map((e) => e.id)).toEqual(['b', 'c']);
  });

  it('ordena del más reciente al más viejo', () => {
    expect(ordenarPorFecha(lista).map((e) => e.id)).toEqual(['b', 'a']);
  });

  it('detecta cambios sin guardar', () => {
    expect(hayCambiosSinGuardar({ ...loft, nombre: 'Loft Mercedes' }, e1)).toBe(false);
    expect(hayCambiosSinGuardar({ ...loft, nombre: 'Loft Mercedes', aberturas: [] }, e1)).toBe(true);
    expect(hayCambiosSinGuardar({ ...loft, nombre: 'Otro nombre' }, e1)).toBe(true);
    expect(hayCambiosSinGuardar(loft, undefined)).toBe(true); // nunca se guardó
    // Mismo contenido con las claves en otro orden: no hay cambios.
    const invertido = Object.fromEntries(Object.entries(loft.params).reverse());
    expect(hayCambiosSinGuardar({ ...loft, nombre: 'Loft Mercedes', params: invertido }, e1)).toBe(false);
  });

  it('valida la forma de la lista guardada en el navegador', () => {
    expect(esBibliotecaValida(lista)).toBe(true);
    expect(esBibliotecaValida([{ id: 1 }])).toBe(false);
    expect(esBibliotecaValida('hola')).toBe(false);
  });
});

describe('respaldo de "Mis proyectos"', () => {
  const lista = [crearEntrada(loft, { id: 'a', nombre: 'Loft', fecha: F1 })];

  it('exportar e importar en otro navegador', () => {
    const texto = JSON.stringify(crearRespaldo(lista, F2));
    const r = importarRespaldo([], texto);
    expect(r.ok).toBe(true);
    expect(r.importados).toBe(1);
    expect(r.lista[0].nombre).toBe('Loft');
  });

  it('importar no pisa: un id repetido entra como proyecto nuevo', () => {
    const texto = JSON.stringify(crearRespaldo(lista, F2));
    const r = importarRespaldo(lista, texto);
    expect(r.lista).toHaveLength(2);
    expect(new Set(r.lista.map((e) => e.id)).size).toBe(2);
  });

  it('saltea proyectos rotos y avisa cuáles', () => {
    const roto = { id: 'x', nombre: 'Roto', guardado: F1.toISOString(), datos: { formato: 'micasa-proyecto', version: 3, params: {} } };
    const texto = JSON.stringify(crearRespaldo([...lista, roto], F2));
    const r = importarRespaldo([], texto);
    expect(r.importados).toBe(1);
    expect(r.salteados).toEqual(['Roto']);
  });

  it('rechaza archivos que no son respaldos', () => {
    expect(importarRespaldo([], 'no json').ok).toBe(false);
    expect(importarRespaldo([], '{"formato":"micasa-proyecto"}').error).toMatch(/no es un respaldo/);
  });
});

describe('link de la nube en Mis proyectos (v1.30)', () => {
  it('la entrada guarda el link (con la clave) y la copia no lo hereda', () => {
    const nube = { id: 'K7x2mQa9Zt12', clave: 'claveclaveclaveclave1234', rev: 3 };
    const entrada = crearEntrada(proyectoEjemplo(), { id: 'p-1', nombre: 'Casa', nube });
    expect(entrada.nube).toEqual(nube);
    expect(JSON.stringify(entrada.datos)).not.toContain(nube.clave); // el .json no lleva la clave
    const lista = duplicarEntrada([entrada], 'p-1', { nuevoIdCopia: 'p-2' });
    expect(lista[1].nube).toBeUndefined();
    expect(crearEntrada(proyectoEjemplo(), { id: 'p-3', nombre: 'Sin link' }).nube).toBeUndefined();
  });
});
