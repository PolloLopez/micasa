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

import { validarParametros, validarAbertura, validarPanelesUsados } from '../motor/validacion.js';
import { migrarParams, normalizarCatalogo } from '../motor/migracion.js';
import { coloresValidos, COLORES_INICIALES } from '../capas.js';

export const FORMATO = 'micasa-proyecto';
export const VERSION_FORMATO = 3; // v3 (app 1.3): transversales por piso, tipos de panel, excedente
const VERSIONES_QUE_SE_ABREN = [2, 3]; // v2 se convierte sola (ver motor/migracion.js)

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
  if (!VERSIONES_QUE_SE_ABREN.includes(datos.version)) {
    return { ok: false, error: `El proyecto es de otra versión (${datos.version}); esta app abre las versiones ${VERSIONES_QUE_SE_ABREN.join(' y ')}.` };
  }

  // Lleva los datos a la forma actual (no cambia nada si ya son v3).
  const params = migrarParams(datos.params ?? {});
  const catalogo = normalizarCatalogo(datos.catalogo);

  const erroresParams = validarParametros(params);
  const primerError = Object.entries(erroresParams)[0];
  if (primerError) {
    return { ok: false, error: `Medidas inválidas en el archivo: ${primerError[0]} (${primerError[1]}).` };
  }

  if (!Array.isArray(datos.aberturas)) {
    return { ok: false, error: 'Faltan las aberturas en el archivo.' };
  }
  const aberturaMal = datos.aberturas.findIndex((op) => validarAbertura(op, params) !== null);
  if (aberturaMal >= 0) {
    return { ok: false, error: `La abertura #${aberturaMal + 1} no entra en su pared: ${validarAbertura(datos.aberturas[aberturaMal], params)}` };
  }

  const panelFaltante = validarPanelesUsados(params, catalogo);
  if (panelFaltante) return { ok: false, error: `${panelFaltante} en el catálogo del archivo.` };

  return {
    ok: true,
    proyecto: {
      nombre: typeof datos.nombre === 'string' ? datos.nombre : 'Proyecto sin nombre',
      params,
      aberturas: datos.aberturas,
      catalogo,
      colores: coloresValidos(datos.colores) ? datos.colores : COLORES_INICIALES,
    },
  };
}
