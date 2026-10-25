// ==========================================================
// BIBLIOTECA DE PROYECTOS ("Mis proyectos")
// ----------------------------------------------------------
// Lista de proyectos guardados en el navegador de cada usuario
// (localStorage). Cada entrada guarda el proyecto con el MISMO
// formato que el archivo .json (archivoProyecto.js), así que al
// abrir se valida y migra igual que un archivo.
//
//   entrada = { id, nombre, guardado (fecha ISO), datos }
//
// Funciones puras (no tocan el navegador): reciben la lista y
// devuelven una lista nueva. Así se testean fácil.
//
// Límite: la lista vive en ESE navegador. Si se borran los datos
// del navegador se pierde: por eso existe el respaldo (exportar /
// importar todos los proyectos en un archivo).
// ==========================================================

import { crearArchivoProyecto, leerArchivoProyecto } from './archivoProyecto.js';

export const FORMATO_RESPALDO = 'micasa-biblioteca';
export const VERSION_RESPALDO = 1;

/** Id nuevo para una entrada (fecha + azar: no se repite en la práctica). */
export function nuevoId() {
  return `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Arma una entrada a partir del proyecto en pantalla.
 * @param nube  v1.30: { id, clave, rev } si el proyecto tiene link en la nube (la clave queda solo en
 *              este navegador: no va en el .json ni en el link para ver)
 */
export function crearEntrada(proyecto, { id = nuevoId(), nombre, fecha = new Date(), nube = null }) {
  const nombreFinal = (nombre ?? proyecto.nombre ?? '').trim() || 'Proyecto sin nombre';
  return {
    id,
    nombre: nombreFinal,
    guardado: fecha.toISOString(),
    datos: crearArchivoProyecto({ ...proyecto, nombre: nombreFinal }, fecha),
    ...(nube ? { nube } : {}),
  };
}

/** Agrega la entrada o reemplaza la que tiene el mismo id. */
export function guardarEntrada(lista, entrada) {
  const existe = lista.some((e) => e.id === entrada.id);
  return existe ? lista.map((e) => (e.id === entrada.id ? entrada : e)) : [...lista, entrada];
}

export function borrarEntrada(lista, id) {
  return lista.filter((e) => e.id !== id);
}

/** Copia una entrada con otro id y "(copia)" en el nombre (sin su link de la nube: la copia es otro proyecto). */
export function duplicarEntrada(lista, id, { nuevoIdCopia = nuevoId(), fecha = new Date() } = {}) {
  const original = lista.find((e) => e.id === id);
  if (!original) return lista;
  const nombre = `${original.nombre} (copia)`;
  return [...lista, {
    id: nuevoIdCopia,
    nombre,
    guardado: fecha.toISOString(),
    datos: { ...original.datos, nombre, guardado: fecha.toISOString() },
  }];
}

export function renombrarEntrada(lista, id, nombre) {
  const limpio = nombre.trim();
  if (!limpio) return lista;
  return lista.map((e) => (e.id === id ? { ...e, nombre: limpio, datos: { ...e.datos, nombre: limpio } } : e));
}

/** Más recientes primero. */
export function ordenarPorFecha(lista) {
  return [...lista].sort((a, b) => b.guardado.localeCompare(a.guardado));
}

/**
 * Abre una entrada: valida y migra los datos con las mismas reglas
 * que un archivo .json. @returns {{ok, proyecto} | {ok: false, error}}
 */
export function abrirEntrada(entrada) {
  const r = leerArchivoProyecto(JSON.stringify(entrada.datos));
  return r.ok ? { ok: true, proyecto: { ...r.proyecto, nombre: entrada.nombre } } : r;
}

/** JSON con las claves ordenadas: dos objetos iguales dan el mismo texto aunque el orden difiera. */
function jsonOrdenado(valor) {
  if (Array.isArray(valor)) return `[${valor.map(jsonOrdenado).join(',')}]`;
  if (valor && typeof valor === 'object') {
    return `{${Object.keys(valor).sort().map((k) => `${JSON.stringify(k)}:${jsonOrdenado(valor[k])}`).join(',')}}`;
  }
  return JSON.stringify(valor);
}

/**
 * ¿El proyecto en pantalla es distinto de lo guardado en la entrada?
 * Compara solo el contenido (no la fecha de guardado).
 */
export function hayCambiosSinGuardar(proyecto, entrada) {
  if (!entrada) return true;
  const contenido = ({ nombre, params, aberturas, catalogo, colores }) =>
    jsonOrdenado({ nombre: (nombre ?? '').trim(), params, aberturas, catalogo, colores });
  return contenido({ ...proyecto }) !== contenido({ ...entrada.datos, nombre: entrada.nombre });
}

/** Lista guardada en el navegador: descarta entradas con forma rota. */
export function esBibliotecaValida(lista) {
  return Array.isArray(lista) && lista.every((e) =>
    e && typeof e.id === 'string' && typeof e.nombre === 'string' &&
    typeof e.guardado === 'string' && e.datos && typeof e.datos === 'object');
}

// ---------------- Respaldo de toda la biblioteca ----------------

export function crearRespaldo(lista, fecha = new Date()) {
  return { formato: FORMATO_RESPALDO, version: VERSION_RESPALDO, exportado: fecha.toISOString(), proyectos: lista };
}

/**
 * Lee un respaldo y lo suma a la lista actual. No pisa nada: si un id
 * ya existe, el importado entra como proyecto nuevo. Los proyectos
 * inválidos se saltean y se informan.
 * @returns {{ok, lista, importados, salteados} | {ok: false, error}}
 */
export function importarRespaldo(lista, texto) {
  let datos;
  try {
    datos = JSON.parse(texto);
  } catch {
    return { ok: false, error: 'El archivo no es un respaldo válido (no se pudo leer el JSON).' };
  }
  if (!datos || datos.formato !== FORMATO_RESPALDO || !Array.isArray(datos.proyectos)) {
    return { ok: false, error: 'El archivo no es un respaldo de "Mis proyectos".' };
  }
  let nueva = [...lista];
  let importados = 0;
  const salteados = [];
  datos.proyectos.forEach((e, i) => {
    const nombre = typeof e?.nombre === 'string' ? e.nombre : `#${i + 1}`;
    if (!e || typeof e !== 'object' || !e.datos || !abrirEntrada({ ...e, nombre }).ok) {
      salteados.push(nombre);
      return;
    }
    const id = typeof e.id === 'string' && !nueva.some((x) => x.id === e.id) ? e.id : nuevoId();
    nueva = [...nueva, { id, nombre, guardado: typeof e.guardado === 'string' ? e.guardado : new Date().toISOString(), datos: e.datos }];
    importados++;
  });
  return { ok: true, lista: nueva, importados, salteados };
}
