// Tests de la v1.49: muebles contra la pared, apoyados en la mesada, aberturas que se mueven y personas que se
// sientan o se acuestan. Correr con: npm test
import { describe, it, expect } from 'vitest';
import { obstaculosDelNivel, ubicarMueble, moverMueble, muebleNuevo, choquesDelMueble, avisoDeChoques, encerrarEnLaPlanta, alturaDeApoyo, seApoya, mesadaNueva, distanciasDelMueble } from './interiores.js';
import { moverAbertura, validarAbertura } from './validacion.js';
import { lugarParaUsar } from './recorrido.js';
import { PARAMS_INICIALES, ABERTURAS_INICIALES } from './parametrosIniciales.js';

const casa = (cambios = {}) => ({ ...PARAMS_INICIALES, anchoEntrepiso: 0, muebles: [], mesadas: [], tabiques: [], ...cambios });

describe('muebles contra la pared y contra otros', () => {
  it('medio sillón afuera: avisa por qué pared y cuánto; encerrar lo deja adentro', () => {
    const sillon = { ...muebleNuevo('sillon', [], 1), distanciaLateral: -0.9 };
    const p = casa({ muebles: [sillon] });
    const { paredes } = choquesDelMueble(p, sillon);
    expect(paredes).toEqual([{ pared: 'izquierda', nombre: 'el lateral izquierdo', sale: 0.9 }]);
    expect(avisoDeChoques(choquesDelMueble(p, sillon))).toBe('⚠ Se sale por el lateral izquierdo 0,90 m');
    const adentro = encerrarEnLaPlanta(p, sillon);
    expect(adentro.distanciaLateral).toBe(0);
    expect(Object.values(distanciasDelMueble(p, adentro)).every((d) => d >= 0)).toBe(true);
    // Medido desde la derecha: también.
    const derecho = { ...sillon, desdeLateral: 'derecho', distanciaLateral: -0.5 };
    expect(encerrarEnLaPlanta(p, derecho).distanciaLateral).toBe(0);
  });

  it('dos muebles que se pisan chocan; uno apoyado arriba de otro, no', () => {
    const mesa = { ...muebleNuevo('mesa', [], 1), distanciaLateral: 2, distanciaFrente: 1 };
    const silla = { ...muebleNuevo('silla', [], 2), distanciaLateral: 2.2, distanciaFrente: 1.1 };
    const cafetera = { ...muebleNuevo('cafetera', [], 3), distanciaLateral: 3.0, distanciaFrente: 1.2, elevacion: 0.75 };
    const p = casa({ muebles: [mesa, silla, cafetera] });
    expect(choquesDelMueble(p, silla).con).toEqual(['Mesa']);
    expect(choquesDelMueble(p, cafetera).con).toEqual([]);
  });
});

describe('apoyado sobre la mesada', () => {
  it('la cafetera sube a la mesada si está arriba de ella; si no, al piso', () => {
    const mesada = { ...mesadaNueva([], 1), lado: 'C', ladoReferencia: 'izquierda', desde: 1, largo: 2 };
    const base = casa({ mesadas: [mesada] });
    // La cafetera, llevada (como arrastrándola) al medio de la mesada.
    const tapa = obstaculosDelNivel(base, 'piso').find((o) => o.nombre === mesada.nombre);
    const suelta = muebleNuevo('cafetera', [], 1);
    const [cx, cz] = ubicarMueble(base, suelta).centro;
    const sobre = moverMueble(base, suelta, tapa.centro[0] - cx, tapa.centro[1] - cz);
    const p = { ...base, muebles: [sobre] };
    expect(seApoya(sobre)).toBe(true);
    expect(alturaDeApoyo(p, sobre)).toBeCloseTo(mesada.alto, 2);
    expect(alturaDeApoyo(p, { ...sobre, distanciaFrente: sobre.distanciaFrente - 1.5 })).toBe(0);
    expect(seApoya(muebleNuevo('heladera', [], 2))).toBe(false);
  });
});

describe('aberturas que se mueven desde el 3D', () => {
  it('a lo largo de la pared (midiendo desde cualquier esquina) y el antepecho; no se sale de la pared', () => {
    const p = casa();
    const [puerta, ventana] = ABERTURAS_INICIALES;
    expect(moverAbertura(puerta, p, 0.5).offsetHorizontal).toBe(1.5); // desde la izquierda: +
    expect(moverAbertura(puerta, p, 0.5, 0.3).alturaAntepecho).toBe(0); // la puerta no sube
    const v = moverAbertura(ventana, p, 0.5, 0.2);
    expect(v.offsetHorizontal).toBe(0.7); // desde la derecha: ir a la derecha achica la distancia
    expect(v.alturaAntepecho).toBe(1.3);
    expect(moverAbertura(ventana, p, 50).offsetHorizontal).toBe(0); // contra la esquina
    expect(validarAbertura(moverAbertura(ventana, p, 0, 10), p)).toBeTruthy(); // muy arriba: no entra
  });
});

describe('personas: sentarse y acostarse', () => {
  it('la cama se usa acostado, el sillón, la silla y el inodoro sentado; la ducha se pisa', () => {
    const p = casa();
    const de = (tipo) => lugarParaUsar(p, { ...muebleNuevo(tipo, [], 1), distanciaLateral: 2, distanciaFrente: 1 });
    expect(de('cama2')).toMatchObject({ accion: 'acostarse', altura: 0.5 });
    expect(de('sillon')).toMatchObject({ accion: 'sentarse' });
    expect(de('sillon').altura).toBeCloseTo(0.42, 2);
    expect(de('inodoro').accion).toBe('sentarse');
    expect(de('silla').accion).toBe('sentarse');
    expect(de('ducha').accion).toBeNull();
    expect(de('heladera')).toBeNull();
  });
});
