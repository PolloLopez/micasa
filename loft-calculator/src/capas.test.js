// Tests de colores por capa. Correr con: npm test
import { describe, it, expect } from 'vitest';
import { completarColores, COLORES_INICIALES, CAPAS, AYUDAS, GRUPOS_LEYENDA, capaDelProyecto } from './capas.js';

describe('completarColores (navegadores con colores de versiones anteriores)', () => {
  it('conserva los colores guardados y completa las capas nuevas con su color por defecto', () => {
    const r = completarColores({ columnas: '#00ff00' });
    expect(r.columnas).toBe('#00ff00');
    expect(r.escalera).toBe(COLORES_INICIALES.escalera);
    expect(r.escalones).toBe(COLORES_INICIALES.escalones);
  });

  it('descarta colores inválidos o datos rotos', () => {
    expect(completarColores({ columnas: 'verde' }).columnas).toBe(COLORES_INICIALES.columnas);
    expect(completarColores(null)).toEqual(COLORES_INICIALES);
  });
});

describe('leyenda agrupada (v1.19)', () => {
  const enGrupos = GRUPOS_LEYENDA.flatMap((g) => g.capas);

  it('cada capa y cada ayuda está en un solo grupo (no se pierde ninguna casilla)', () => {
    const todas = [...Object.keys(CAPAS), ...Object.keys(AYUDAS)].sort();
    expect([...enGrupos].sort()).toEqual(todas);
    expect(new Set(enGrupos).size).toBe(enGrupos.length);
  });

  it('una grada solo muestra sus capas; una construcción no muestra las de grada ni montaje', () => {
    expect(enGrupos.filter((c) => capaDelProyecto(c, 'grada'))).toEqual(['grada', 'escalones']);
    expect(capaDelProyecto('montaje', 'construccion')).toBe(false);
    expect(capaDelProyecto('juntas', 'construccion')).toBe(true);
    expect(capaDelProyecto('juntas', 'montaje')).toBe(false);
  });
});
