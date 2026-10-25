// Tests del formato compacto (v1.30). Correr con: npm test
import { describe, it, expect } from 'vitest';
import { compactar, expandir, diferencia, aplicarDiferencia } from './formatoCompacto.js';
import { crearArchivoProyecto, leerArchivoProyecto } from './archivoProyecto.js';
import { proyectoEjemplo, gradaEjemplo, montajeEjemplo } from './proyectosBase.js';

describe('diferencia', () => {
  it('solo lo distinto, con claves borradas y valores null', () => {
    const base = { a: 1, b: { c: 2, d: 3 }, e: 'x', f: 5 };
    const valor = { a: 1, b: { c: 9, d: 3 }, f: null, g: [1, 2] };
    const d = diferencia(valor, base);
    expect(d).toEqual({ b: { c: 9 }, f: null, g: [1, 2], '~': ['e'] });
    expect(aplicarDiferencia(base, d)).toEqual(valor);
    expect(diferencia(base, base)).toBeUndefined();
  });
});

describe('proyecto compacto', () => {
  it('ida y vuelta: el archivo es el mismo', () => {
    for (const p of [proyectoEjemplo(), gradaEjemplo(), montajeEjemplo()]) {
      const archivo = JSON.parse(JSON.stringify(crearArchivoProyecto({ ...p, nombre: 'Prueba' }, new Date('2026-10-25T12:00:00Z'))));
      expect(expandir(JSON.parse(JSON.stringify(compactar(archivo))))).toEqual(archivo);
    }
  });

  it('con cambios: medidas, un proveedor nuevo, un material quitado y un precio null', () => {
    const p = proyectoEjemplo();
    p.params.largo = 9.1;
    p.params.paredes.B.separacionVerticales = 1.8;
    p.catalogo = p.catalogo.filter((i) => i.id !== 'acc-selladores')
      .concat([{ id: 'prov-9', categoria: 'proveedor', nombre: 'Corralón', recargoTarjeta: 10, nota: '', flete: 20000, fleteGratisDesde: 0 }]);
    const archivo = JSON.parse(JSON.stringify(crearArchivoProyecto(p)));
    const vuelta = expandir(JSON.parse(JSON.stringify(compactar(archivo))));
    expect(vuelta).toEqual(archivo);
    const r = leerArchivoProyecto(JSON.stringify(vuelta));
    expect(r.ok).toBe(true);
    expect(r.proyecto.params.largo).toBe(9.1);
  });

  it('es mucho más chico que el archivo entero', () => {
    const archivo = crearArchivoProyecto(proyectoEjemplo());
    expect(JSON.stringify(compactar(archivo)).length).toBeLessThan(JSON.stringify(archivo).length / 2);
  });

  it('lo que no es compacto se rechaza', () => {
    expect(() => expandir({ formato: 'micasa-proyecto' })).toThrow();
  });
});
