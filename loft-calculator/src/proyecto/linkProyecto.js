// ==========================================================
// LINK PARA COMPARTIR UN PROYECTO
// ----------------------------------------------------------
// Mete el proyecto entero (el mismo contenido que el .json) dentro del
// link, después del "#": https://.../micasa/#proyecto=z<datos>
//   - Lo que va después del "#" NO viaja al servidor: queda solo en el
//     navegador de quien abre el link (no hace falta backend).
//   - Se comprime (deflate) y se pasa a base64url (letras, números, - y _)
//     para que el link sea corto y no se rompa al mandarlo por WhatsApp.
//   - Si el navegador no sabe comprimir, va sin comprimir (prefijo "j").
//   - v1.30: prefijo "c" = formato compacto (solo lo distinto de fábrica, ver
//     formatoCompacto.js) y comprimido: la mitad de largo. Los links viejos
//     ("z" y "j") se siguen abriendo.
// Al abrir el link, App lo lee con leerLinkProyecto(), que valida igual
// que un archivo .json (leerArchivoProyecto).
// ==========================================================

import { crearArchivoProyecto, leerArchivoProyecto } from './archivoProyecto.js';
import { compactar, expandir } from './formatoCompacto.js';

export const PREFIJO_HASH = '#proyecto=';

/** Bytes -> base64url (sin "=" al final). */
function aBase64Url(bytes) {
  let binario = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binario += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binario).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** base64url -> bytes. */
function deBase64Url(texto) {
  const normal = texto.replace(/-/g, '+').replace(/_/g, '/');
  const binario = atob(normal + '='.repeat((4 - (normal.length % 4)) % 4));
  return Uint8Array.from(binario, (c) => c.charCodeAt(0));
}

/** Pasa bytes por un stream de compresión o descompresión y junta el resultado. */
async function transformar(bytes, stream) {
  const salida = new Blob([bytes]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(salida).arrayBuffer());
}

/** Texto -> "z<comprimido>" o "j<sin comprimir>". */
export async function empaquetar(texto) {
  const bytes = new TextEncoder().encode(texto);
  if (typeof CompressionStream === 'undefined') return `j${aBase64Url(bytes)}`;
  return `z${aBase64Url(await transformar(bytes, new CompressionStream('deflate-raw')))}`;
}

/** "z..." / "j..." / "c..." -> texto. Tira error si está roto. ("c" = compacto: devuelve el archivo completo.) */
export async function desempaquetar(paquete) {
  const tipo = paquete[0];
  const bytes = deBase64Url(paquete.slice(1));
  if (tipo === 'j') return new TextDecoder().decode(bytes);
  const texto = new TextDecoder().decode(await transformar(bytes, new DecompressionStream('deflate-raw')));
  if (tipo === 'z') return texto;
  if (tipo === 'c') return JSON.stringify(expandir(JSON.parse(texto)));
  throw new Error('formato desconocido');
}

/** Proyecto → paquete compacto "c…" (para el link y para la nube). */
export async function empaquetarProyecto(proyecto) {
  const compacto = JSON.stringify(compactar(crearArchivoProyecto(proyecto)));
  if (typeof CompressionStream === 'undefined') return empaquetar(JSON.stringify(crearArchivoProyecto(proyecto)));
  return `c${aBase64Url(await transformar(new TextEncoder().encode(compacto), new CompressionStream('deflate-raw')))}`;
}

/**
 * Link para compartir el proyecto en pantalla.
 * @param proyecto { nombre, params, aberturas, catalogo, colores }
 * @param urlBase  dirección de la app sin "#" (ej. https://pollolopez.github.io/micasa/)
 */
export async function crearLinkProyecto(proyecto, urlBase) {
  return `${urlBase}${PREFIJO_HASH}${await empaquetarProyecto(proyecto)}`;
}

/** ¿El "#" de la dirección trae un proyecto? */
export const tieneProyectoEnLink = (hash) => typeof hash === 'string' && hash.startsWith(PREFIJO_HASH);

/**
 * Lee el proyecto del "#" de la dirección.
 * @returns {Promise<{ ok: true, proyecto } | { ok: false, error: string }>}
 */
export async function leerLinkProyecto(hash) {
  if (!tieneProyectoEnLink(hash)) return { ok: false, error: 'El link no trae un proyecto.' };
  let texto;
  try {
    texto = await desempaquetar(decodeURIComponent(hash.slice(PREFIJO_HASH.length)));
  } catch {
    return { ok: false, error: 'El link del proyecto está incompleto o roto (¿se cortó al copiarlo?).' };
  }
  return leerArchivoProyecto(texto);
}
