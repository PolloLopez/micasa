// ==========================================================
// FORMATO COMPACTO DEL PROYECTO (v1.30): solo lo que cambia
// ----------------------------------------------------------
// El link para compartir llevaba el proyecto entero (17 mil letras antes de
// comprimir en la casa de Leandro). Casi todo es igual a lo "de fábrica"
// (parámetros iniciales y catálogo inicial): acá se guarda solo lo distinto.
//
//   compactar(archivo)  → { v: 1, n, g, p, a, c, k }
//       n nombre · g fecha de guardado · p params (solo lo distinto, por campo)
//       a aberturas (enteras) · c catálogo (cada material: id + lo distinto)
//       k colores (solo los distintos)
//   expandir(compacto)  → el archivo completo de nuevo (el mismo que el .json)
//
// Después de expandir, el archivo pasa por leerArchivoProyecto como siempre
// (valida y migra). Lo usan el link (#proyecto=c…) y la nube (Firebase).
// ==========================================================

import { FORMATO, VERSION_FORMATO } from './archivoProyecto.js';
import { PARAMS_INICIALES } from '../motor/parametrosIniciales.js';
import { CATALOGO_INICIAL } from '../motor/presupuesto.js';
import { COLORES_INICIALES } from '../capas.js';

const VERSION_COMPACTO = 1;
const esObjeto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const BORRADAS = '~'; // clave especial: lista de claves que están en la base y no en el valor

/**
 * Lo que tiene `valor` distinto de `base` (recorre objetos; listas y números van enteros).
 * Las claves que están en la base y NO en el valor van en `~` (así al expandir no vuelven).
 * (No se usa null para eso porque hay datos que valen null, ej. un precio con tarjeta.)
 * @returns el valor distinto, o undefined si son iguales
 */
export function diferencia(valor, base) {
  if (igual(valor, base)) return undefined;
  if (!esObjeto(valor) || !esObjeto(base)) return valor;
  const resultado = {};
  Object.keys(valor).forEach((k) => {
    const d = diferencia(valor[k], base[k]);
    if (d !== undefined) resultado[k] = d;
  });
  const borradas = Object.keys(base).filter((k) => !(k in valor));
  if (borradas.length) resultado[BORRADAS] = borradas;
  return resultado;
}

/** `base` con la diferencia aplicada (lo opuesto de `diferencia`). */
export function aplicarDiferencia(base, dif) {
  if (dif === undefined) return structuredClone(base);
  if (!esObjeto(dif) || !esObjeto(base)) return structuredClone(dif);
  const resultado = structuredClone(base);
  Object.entries(dif).forEach(([k, v]) => {
    if (k === BORRADAS) v.forEach((borrada) => delete resultado[borrada]);
    else resultado[k] = aplicarDiferencia(base[k], v);
  });
  return resultado;
}

const catalogoBase = new Map(CATALOGO_INICIAL.map((i) => [i.id, i]));

/** Archivo de proyecto (crearArchivoProyecto) → versión compacta. */
export function compactar(archivo) {
  return {
    v: VERSION_COMPACTO,
    n: archivo.nombre,
    g: archivo.guardado,
    p: diferencia(archivo.params, PARAMS_INICIALES) ?? {},
    a: archivo.aberturas,
    // Cada material: su id y lo distinto del de fábrica (los que no son de fábrica van enteros).
    c: archivo.catalogo.map((item) => {
      const base = catalogoBase.get(item.id);
      return base ? { id: item.id, ...(diferencia(item, base) ?? {}) } : item;
    }),
    k: diferencia(archivo.colores, COLORES_INICIALES) ?? {},
  };
}

/** Versión compacta → archivo completo (para leerArchivoProyecto). Tira error si no es compacto. */
export function expandir(compacto) {
  if (!esObjeto(compacto) || compacto.v !== VERSION_COMPACTO) throw new Error('No es un proyecto compacto');
  return {
    formato: FORMATO,
    version: VERSION_FORMATO,
    nombre: compacto.n,
    guardado: compacto.g,
    params: aplicarDiferencia(PARAMS_INICIALES, compacto.p),
    aberturas: compacto.a,
    catalogo: (compacto.c ?? []).map((item) => {
      const base = catalogoBase.get(item?.id);
      return base ? aplicarDiferencia(base, item) : item;
    }),
    colores: aplicarDiferencia(COLORES_INICIALES, compacto.k),
  };
}
