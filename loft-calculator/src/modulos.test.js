// Tests de los módulos (v1.32.0). Correr con: npm test
import { describe, it, expect } from 'vitest';
import { MODULOS, configDeModulos, moduloActivo, modulosActivos } from './modulos.js';

describe('módulos por instalación', () => {
  it('lo prendido en el archivo, menos lo que se apaga al compilar', () => {
    expect(configDeModulos({ terreno: true, sol: true }, [])).toEqual({ terreno: true, sol: true });
    expect(configDeModulos({ terreno: true, sol: true }, ['terreno'])).toEqual({ terreno: false, sol: true });
    expect(configDeModulos({}, [])).toEqual({ terreno: false, sol: false }); // lo que no está en el archivo, apagado
  });

  it('moduloActivo es el único que decide; un módulo que no existe nunca está prendido', () => {
    expect(moduloActivo('terreno', { terreno: true })).toBe(true);
    expect(moduloActivo('terreno', { terreno: false })).toBe(false);
    expect(moduloActivo('inventado', { inventado: true, terreno: true })).toBe(true); // la config manda…
    expect(configDeModulos({ inventado: true }, [])).not.toHaveProperty('inventado'); // …pero solo trae los que existen
    expect(modulosActivos({ terreno: true })).toEqual(['terreno']);
    expect(moduloActivo('sol')).toBe(true); // v1.37
  });

  it('esta publicación trae Terreno prendido (decisión de Leandro)', () => {
    expect(moduloActivo('terreno')).toBe(true);
    expect(MODULOS.terreno.nombre).toBe('Terreno e implantación');
  });
});
