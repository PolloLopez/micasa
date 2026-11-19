// Tests de compartir sin la parte de plata (v1.76). Correr con: npm test
import { describe, it, expect } from 'vitest';
import { sinLaPlata, conLaPlataDe } from './sinPlata.js';
import { PARAMS_INICIALES as P } from '../motor/parametrosIniciales.js';
import { validarParametros } from '../motor/validacion.js';

const conPlata = {
  nombre: 'Loft', aberturas: [], catalogo: [], colores: {},
  params: {
    ...P,
    seguimiento: { ...P.seguimiento, rubros: [{ id: 1, nombre: 'Albañil' }], compras: [{ id: 1 }], contratistas: [{ id: 1, nombre: 'José', telefono: '123' }],
      terminadas: ['pilotines'], extras: [{ id: 1, parte: 'pilotines', nombre: 'Tanza', cantidad: 1, unidad: 'u', precio: 10 }], asignaciones: { columna: 'prov-1' } },
    finanzas: { compromisos: [{ nombre: 'Terreno' }], acreedores: [{ nombre: 'Papá' }] },
  },
};

describe('sinLaPlata', () => {
  it('saca pagos, compras, contratistas y finanzas; deja lo que cambia el presupuesto', () => {
    const r = sinLaPlata(conPlata);
    expect(r.params.seguimiento.rubros).toEqual([]);
    expect(r.params.seguimiento.compras).toEqual([]);
    expect(r.params.seguimiento.contratistas).toEqual([]);
    expect(r.params.finanzas).toEqual({ compromisos: [], acreedores: [] });
    expect(r.params.seguimiento.terminadas).toEqual(['pilotines']);
    expect(r.params.seguimiento.extras).toHaveLength(1);
    expect(r.params.seguimiento.asignaciones).toEqual({ columna: 'prov-1' });
    expect(r.params.largo).toBe(P.largo);
    expect(JSON.stringify(r)).not.toContain('José');
    expect(conPlata.params.seguimiento.rubros).toHaveLength(1); // no toca el original
  });
  it('lo que queda es un proyecto válido', () => {
    expect(validarParametros(sinLaPlata({ ...conPlata, params: P }).params)).toEqual({});
  });
  it('al abrir tu link en tu compu, vuelve tu plata (y lo demás es lo del link)', () => {
    const delLink = sinLaPlata({ ...conPlata, params: { ...conPlata.params, largo: 9 } });
    const r = conLaPlataDe(delLink, conPlata);
    expect(r.params.largo).toBe(9);
    expect(r.params.seguimiento.rubros).toEqual(conPlata.params.seguimiento.rubros);
    expect(r.params.finanzas).toEqual(conPlata.params.finanzas);
    expect(conLaPlataDe(delLink, null)).toBe(delLink);
  });
});
