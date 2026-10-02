// Tests de los proyectos base. Correr con: npm test
import { describe, it, expect } from 'vitest';
import { proyectoVacio, proyectoEjemplo } from './proyectosBase.js';
import { validarParametros, validarPanelesUsados } from '../motor/validacion.js';
import { generarEstructura } from '../motor/estructura.js';
import { calcularPresupuesto } from '../motor/presupuesto.js';
import { crearArchivoProyecto, leerArchivoProyecto } from './archivoProyecto.js';

describe('proyecto vacío (botón "Nuevo")', () => {
  const p = proyectoVacio();

  it('no tiene datos cargados', () => {
    expect(p.nombre).toBe('');
    expect(p.aberturas).toEqual([]);
    expect(p.params.anchoEntrepiso).toBe(0);
    expect(p.params.separacionTransversalesPiso).toBe(0);
    expect(p.params.pendienteTecho).toBe(0);
    expect(p.catalogo.every((i) => i.precio === 0 && i.perfil === '')).toBe(true);
    expect(p.catalogo.filter((i) => i.categoria === 'panel')).toHaveLength(1);
  });

  it('es válido y el 3D tiene algo que dibujar', () => {
    expect(validarParametros(p.params)).toEqual({});
    expect(validarPanelesUsados(p.params, p.catalogo)).toBeNull();
    const e = generarEstructura(p.params, p.aberturas);
    expect(e.columnas).toHaveLength(4); // solo las esquinas
    expect(e.piso2.tirantes).toHaveLength(0);
    expect(e.piso.transversales).toHaveLength(0);
  });

  it('el presupuesto da $0', () => {
    const e = generarEstructura(p.params, p.aberturas);
    expect(calcularPresupuesto(e, p.catalogo, { excedenteBarras: 1 }).total).toBe(0);
  });

  it('se puede guardar y volver a abrir', () => {
    const r = leerArchivoProyecto(JSON.stringify(crearArchivoProyecto(p)));
    expect(r.ok).toBe(true);
    expect(r.proyecto.nombre).toBe('Proyecto sin nombre');
    expect(r.proyecto.catalogo.find((i) => i.id === 'panel').precio).toBe(0);
  });

  it('cada llamada devuelve una copia nueva (no se comparten objetos)', () => {
    const a = proyectoVacio();
    a.params.paredes.A.separacionVerticales = 1;
    expect(proyectoVacio().params.paredes.A.separacionVerticales).toBe(3);
  });
});

describe('proyecto ejemplo (loft)', () => {
  it('es válido y trae las aberturas del loft', () => {
    const p = proyectoEjemplo();
    expect(validarParametros(p.params)).toEqual({});
    expect(validarPanelesUsados(p.params, p.catalogo)).toBeNull();
    expect(p.aberturas).toHaveLength(2);
  });
});
