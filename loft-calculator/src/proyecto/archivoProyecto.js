// ==========================================================
// ARCHIVO DE PROYECTO (.json)
// ----------------------------------------------------------
// Guarda TODO lo necesario para retomar una obra en un archivo:
// medidas, aberturas, catálogo (perfiles, largos y precios) y colores.
// Sirve para:
//   - tener un archivo por proyecto (loft, galpón, garage...);
//   - pasárselo al herrero (WhatsApp, mail) y que lo abra en la app.
//
// Al abrir se valida todo: un archivo puede venir editado a mano,
// roto, o de una versión vieja. Nunca se carga algo inválido.
// No hace falta servidor: el archivo queda en la compu de cada uno.
// ==========================================================

import { validarParametros, validarAbertura } from '../motor/validacion.js';
import { CATALOGO_INICIAL } from '../motor/presupuesto.js';
import { coloresValidos, COLORES_INICIALES } from '../capas.js';

export const FORMATO = 'micasa-proyecto';
export const VERSION_FORMATO = 2; // misma forma de datos que localStorage v2

/** Arma el contenido del archivo. */
export function crearArchivoProyecto({ nombre, params, aberturas, catalogo, colores }, fecha = new Date()) {
  return {
    formato: FORMATO,
    version: VERSION_FORMATO,
    nombre: nombre.trim() || 'Proyecto sin nombre',
    guardado: fecha.toISOString(),
    params,
    aberturas,
    catalogo,
    colores,
  };
}

/** Nombre de archivo seguro: "micasa-loft-mercedes-2026-10-01.json". */
export function nombreDeArchivo(nombre, fecha = new Date()) {
  const limpio = (nombre || 'proyecto')
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // saca tildes
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    .slice(0, 40) || 'proyecto';
  return `micasa-${limpio}-${fecha.toISOString().slice(0, 10)}.json`;
}

/**
 * Lee y valida el texto de un archivo de proyecto.
 * @returns {{ ok: true, proyecto } | { ok: false, error: string }}
 */
export function leerArchivoProyecto(texto) {
  let datos;
  try {
    datos = JSON.parse(texto);
  } catch {
    return { ok: false, error: 'El archivo no es un proyecto válido (no se pudo leer el JSON).' };
  }

  if (!datos || datos.formato !== FORMATO) {
    return { ok: false, error: 'El archivo no es un proyecto de micasa.' };
  }
  if (datos.version !== VERSION_FORMATO) {
    return { ok: false, error: `El proyecto es de otra versión (${datos.version}); esta app abre la versión ${VERSION_FORMATO}.` };
  }

  const erroresParams = validarParametros(datos.params ?? {});
  const primerError = Object.entries(erroresParams)[0];
  if (primerError) {
    return { ok: false, error: `Medidas inválidas en el archivo: ${primerError[0]} (${primerError[1]}).` };
  }

  if (!Array.isArray(datos.aberturas)) {
    return { ok: false, error: 'Faltan las aberturas en el archivo.' };
  }
  const aberturaMal = datos.aberturas.findIndex((op) => validarAbertura(op, datos.params) !== null);
  if (aberturaMal >= 0) {
    return { ok: false, error: `La abertura #${aberturaMal + 1} no entra en su pared: ${validarAbertura(datos.aberturas[aberturaMal], datos.params)}` };
  }

  // Catálogo: tienen que estar todos los renglones; si falta alguno
  // (archivo de una versión anterior), se completa con el de fábrica.
  const catalogoArchivo = Array.isArray(datos.catalogo) ? datos.catalogo : [];
  const catalogo = CATALOGO_INICIAL.map((base) => {
    const delArchivo = catalogoArchivo.find((p) => p.id === base.id);
    if (!delArchivo) return base;
    return {
      ...base,
      perfil: typeof delArchivo.perfil === 'string' ? delArchivo.perfil : base.perfil,
      precio: Number.isFinite(delArchivo.precio) && delArchivo.precio >= 0 ? delArchivo.precio : base.precio,
      largoBarra: base.largoBarra === null ? null
        : Number.isFinite(delArchivo.largoBarra) && delArchivo.largoBarra >= 1 ? delArchivo.largoBarra : base.largoBarra,
    };
  });

  return {
    ok: true,
    proyecto: {
      nombre: typeof datos.nombre === 'string' ? datos.nombre : 'Proyecto sin nombre',
      params: datos.params,
      aberturas: datos.aberturas,
      catalogo,
      colores: coloresValidos(datos.colores) ? datos.colores : COLORES_INICIALES,
    },
  };
}
