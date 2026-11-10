// Tests de qué tarjeta se abre al elegir algo en el 3D (v1.42.1). Correr con: npm test
import { describe, it, expect } from 'vitest';
import { focoDe } from './contextoFoco.js';

describe('lo elegido en el 3D abre su tarjeta', () => {
  it('cada cosa va a su pestaña, su tarjeta y su ficha', () => {
    expect(focoDe(null)).toBeNull();
    expect(focoDe({ pieza: { id: 'piso:3', tipo: 'piso', grupos: ['piso'] } })).toEqual({ pestana: 'estructura', tarjeta: 'pisos', item: null });
    expect(focoDe({ pieza: { id: 'viga:1', tipo: 'viga-techo', grupos: ['techo'] } })).toMatchObject({ tarjeta: 'techo' });
    expect(focoDe({ pieza: { id: 'col:B:2', tipo: 'columna', grupos: ['B'] } })).toEqual({ pestana: 'paredes', tarjeta: 'paredes', item: 'pared:B' });
    expect(focoDe({ pieza: { id: 'mesada:4:fondo-abajo', tipo: 'mesada', grupos: ['mesada'], mesada: 4 } })).toEqual({ pestana: 'paredes', tarjeta: 'mesadas', item: 'mesada:4' });
    expect(focoDe({ pieza: { id: 'tabique:2:dintel', tipo: 'tabique', grupos: ['tabique'] } })).toMatchObject({ tarjeta: 'tabiques', item: 'tabique:2' });
    expect(focoDe({ abertura: { id: 1, lado: 'A' } })).toMatchObject({ item: 'pared:A' });
    expect(focoDe({ mueble: 7 })).toEqual({ pestana: 'paredes', tarjeta: 'muebles', item: 'mueble:7' });
    expect(focoDe({ pieza: { id: 'esc:1', tipo: 'zanca', grupos: ['escalera', 'piso2'] } })).toMatchObject({ tarjeta: 'escalera' });
  });
});
