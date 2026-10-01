// Tests del archivo de proyecto. Correr con: npm test
import { describe, it, expect } from 'vitest';
import { crearArchivoProyecto, leerArchivoProyecto, nombreDeArchivo } from './archivoProyecto.js';
import { PARAMS_INICIALES, ABERTURAS_INICIALES } from '../motor/parametrosIniciales.js';
import { CATALOGO_INICIAL } from '../motor/presupuesto.js';
import { COLORES_INICIALES } from '../capas.js';

const FECHA = new Date('2026-10-01T12:00:00Z');
const PROYECTO = {
  nombre: 'Loft Mercedes',
  params: { ...PARAMS_INICIALES, largo: 8 },
  aberturas: ABERTURAS_INICIALES,
  catalogo: CATALOGO_INICIAL.map((p) => (p.id === 'pilotin' ? { ...p, precio: 18000, perfil: 'Pilotín 30 cm' } : p)),
  colores: { ...COLORES_INICIALES, columnas: '#123456' },
};
const comoTexto = (obj) => JSON.stringify(obj);

describe('archivo de proyecto', () => {
  it('ida y vuelta: lo que se guarda es lo que se abre', () => {
    const texto = comoTexto(crearArchivoProyecto(PROYECTO, FECHA));
    const r = leerArchivoProyecto(texto);
    expect(r.ok).toBe(true);
    expect(r.proyecto.nombre).toBe('Loft Mercedes');
    expect(r.proyecto.params.largo).toBe(8);
    expect(r.proyecto.aberturas).toHaveLength(2);
    expect(r.proyecto.catalogo.find((p) => p.id === 'pilotin')).toMatchObject({ precio: 18000, perfil: 'Pilotín 30 cm' });
    expect(r.proyecto.colores.columnas).toBe('#123456');
  });

  it('nombre de archivo sin tildes ni espacios', () => {
    expect(nombreDeArchivo('Galpón de Juan / Lote 3', FECHA)).toBe('micasa-galpon-de-juan-lote-3-2026-10-01.json');
    expect(nombreDeArchivo('', FECHA)).toBe('micasa-proyecto-2026-10-01.json');
  });

  it('rechaza archivos que no son proyectos', () => {
    expect(leerArchivoProyecto('esto no es json').ok).toBe(false);
    expect(leerArchivoProyecto('{"hola": 1}').error).toMatch(/no es un proyecto/);
  });

  it('rechaza otra versión de formato', () => {
    const viejo = { ...crearArchivoProyecto(PROYECTO, FECHA), version: 1 };
    expect(leerArchivoProyecto(comoTexto(viejo)).error).toMatch(/otra versión/);
  });

  it('rechaza medidas inválidas (ej. separación 0 editada a mano)', () => {
    const roto = crearArchivoProyecto({ ...PROYECTO, params: { ...PROYECTO.params, separacionPiso: 0 } }, FECHA);
    expect(leerArchivoProyecto(comoTexto(roto)).error).toMatch(/separacionPiso/);
  });

  it('rechaza una abertura que no entra en su pared', () => {
    const roto = crearArchivoProyecto({ ...PROYECTO, aberturas: [{ ...ABERTURAS_INICIALES[0], offsetHorizontal: 20 }] }, FECHA);
    expect(leerArchivoProyecto(comoTexto(roto)).error).toMatch(/#1 no entra/);
  });

  it('completa renglones de catálogo faltantes y descarta precios inválidos', () => {
    const parcial = crearArchivoProyecto({
      ...PROYECTO,
      catalogo: [{ id: 'columna', precio: -5, largoBarra: 0, perfil: 'Caño 80x80' }],
    }, FECHA);
    const r = leerArchivoProyecto(comoTexto(parcial));
    expect(r.ok).toBe(true);
    expect(r.proyecto.catalogo).toHaveLength(CATALOGO_INICIAL.length);
    const columna = r.proyecto.catalogo.find((p) => p.id === 'columna');
    expect(columna.perfil).toBe('Caño 80x80');
    expect(columna.precio).toBe(38000); // el -5 se descarta
    expect(columna.largoBarra).toBe(6); // el 0 se descarta
  });

  it('colores inválidos vuelven a los de fábrica', () => {
    const r = leerArchivoProyecto(comoTexto(crearArchivoProyecto({ ...PROYECTO, colores: { columnas: 'rojo' } }, FECHA)));
    expect(r.proyecto.colores).toEqual(COLORES_INICIALES);
  });
});
