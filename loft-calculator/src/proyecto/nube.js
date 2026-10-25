// ==========================================================
// PROYECTO EN LA NUBE (v1.30): links cortos que guardan los cambios
// ----------------------------------------------------------
// El proyecto se guarda en Firestore (la base de datos de Firebase) y el link
// solo lleva su identificador:
//   ver     https://.../micasa/#p=K7x2mQa9Zt          (cualquiera lo abre)
//   editar  https://.../micasa/#e=K7x2mQa9Zt.<clave>  (abre y GUARDA cambios)
//
// Se habla con Firestore por su API REST (pedidos HTTP con fetch), sin la
// librería de Firebase: no suma dependencias ni peso a la app.
// La seguridad está en las reglas (firebase/firestore.rules): para guardar
// hay que saber la clave; en la base solo queda su "hash" (una huella que no
// se puede dar vuelta), así que el link de ver no sirve para editar.
//
// Mientras no esté configurado (configNube.js vacío), nubeDisponible() da
// false y la app usa el link de siempre (el proyecto adentro del link).
// ==========================================================

import { CONFIG_NUBE } from './configNube.js';
import { empaquetarProyecto, desempaquetar } from './linkProyecto.js';
import { leerArchivoProyecto } from './archivoProyecto.js';

export const PREFIJO_VER = '#p=';
export const PREFIJO_EDITAR = '#e=';
const LETRAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

export const nubeDisponible = (config = CONFIG_NUBE) => Boolean(config?.projectId && config?.apiKey);

/** Texto al azar con letras y números (para el id y la clave), con el generador seguro del navegador. */
export function alAzar(largo) {
  const bytes = crypto.getRandomValues(new Uint8Array(largo));
  return Array.from(bytes, (b) => LETRAS[b % LETRAS.length]).join('');
}

/** Huella sha256 en hexadecimal (minúsculas), como la calcula la regla de Firestore. */
export async function huella(texto) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, '0')).join('');
}

// ---------- Links ----------

/** Los dos links de un proyecto en la nube. */
export const linksNube = (urlBase, id, clave) => ({
  ver: `${urlBase}${PREFIJO_VER}${id}`,
  editar: `${urlBase}${PREFIJO_EDITAR}${id}.${clave}`,
});

/** ¿El "#" es de un proyecto en la nube? → { id, clave|null } o null. */
export function leerHashNube(hash) {
  if (typeof hash !== 'string') return null;
  if (hash.startsWith(PREFIJO_VER)) {
    const id = hash.slice(PREFIJO_VER.length);
    return /^[A-Za-z0-9]{10,40}$/.test(id) ? { id, clave: null } : null;
  }
  if (hash.startsWith(PREFIJO_EDITAR)) {
    const [id, clave] = hash.slice(PREFIJO_EDITAR.length).split('.');
    return /^[A-Za-z0-9]{10,40}$/.test(id ?? '') && /^[A-Za-z0-9]{16,64}$/.test(clave ?? '') ? { id, clave } : null;
  }
  return null;
}

// ---------- Firestore por REST ----------

// `config.host` solo para probar con el emulador de Firebase (ver firebase/probarReglas.mjs).
const urlDocumentos = (config) => `${config.host ?? 'https://firestore.googleapis.com'}/v1/projects/${config.projectId}/databases/(default)/documents`;
const nombreDoc = (config, ruta) => `projects/${config.projectId}/databases/(default)/documents/${ruta}`;

/** Un documento de Firestore se escribe con tipos: { campo: { stringValue: '…' } }. */
const campos = (objeto) => Object.fromEntries(Object.entries(objeto).map(([k, v]) => {
  if (typeof v === 'number') return [k, { integerValue: String(v) }];
  if (v instanceof Date) return [k, { timestampValue: v.toISOString() }];
  return [k, { stringValue: String(v) }];
}));

/** Mensaje claro según lo que contestó Firestore. */
function errorDeNube(estado) {
  if (estado === 403) return 'No se pudo guardar: el link no permite editar o alguien guardó otra versión antes (recargá el link).';
  if (estado === 404) return 'El proyecto no existe (¿el link está incompleto?).';
  // 409 / 400: falló una condición del envío (lo más común: ya existe esa versión).
  if (estado === 409 || estado === 400) return 'Alguien guardó otra versión antes: recargá el link para ver la última.';
  return `No se pudo conectar con la nube (error ${estado}). Probá de nuevo en un rato.`;
}

/** Varias escrituras juntas (todas o ninguna): POST …/documents:commit. */
async function commit(config, writes, fetchFn) {
  const r = await fetchFn(`${urlDocumentos(config)}:commit?key=${config.apiKey}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ writes }),
  });
  if (!r.ok) throw new Error(errorDeNube(r.status));
}

/**
 * Sube un proyecto nuevo y devuelve su id y su clave de edición (la clave no se guarda en la nube).
 * @returns {Promise<{ id, clave, rev: 0 }>}
 */
export async function crearEnNube(proyecto, { config = CONFIG_NUBE, fetchFn = fetch } = {}) {
  const id = alAzar(12);
  const clave = alAzar(24);
  await commit(config, [{
    update: { name: nombreDoc(config, `proyectos/${id}`), fields: campos({
      datos: await empaquetarProyecto(proyecto), claveHash: await huella(clave), rev: 0, actualizado: new Date(),
    }) },
    currentDocument: { exists: false },
  }], fetchFn);
  return { id, clave, rev: 0 };
}

/**
 * Lee un proyecto de la nube.
 * @returns {Promise<{ ok: true, proyecto, rev } | { ok: false, error }>}
 */
export async function leerDeNube(id, { config = CONFIG_NUBE, fetchFn = fetch } = {}) {
  try {
    const r = await fetchFn(`${urlDocumentos(config)}/proyectos/${id}?key=${config.apiKey}`);
    if (!r.ok) return { ok: false, error: errorDeNube(r.status) };
    const doc = await r.json();
    const texto = await desempaquetar(doc.fields.datos.stringValue);
    const leido = leerArchivoProyecto(texto);
    if (!leido.ok) return leido;
    return { ok: true, proyecto: leido.proyecto, rev: Number(doc.fields.rev.integerValue) };
  } catch {
    return { ok: false, error: 'No se pudo leer el proyecto de la nube (¿sin internet?).' };
  }
}

/**
 * Guarda una versión nueva con la clave del link de editar. Si alguien guardó antes
 * (la versión de la nube ya no es `rev`), Firestore la rechaza y no se pisa nada.
 * @returns {Promise<number>} la versión nueva
 */
export async function guardarEnNube(id, clave, proyecto, rev, { config = CONFIG_NUBE, fetchFn = fetch } = {}) {
  const nueva = rev + 1;
  await commit(config, [
    // 1) el registro con la clave (nadie lo puede leer): prueba que se sabe la clave.
    {
      update: { name: nombreDoc(config, `cambios/${id}_${nueva}`), fields: campos({ id, clave }) },
      currentDocument: { exists: false },
    },
    // 2) el proyecto con la versión siguiente.
    {
      update: { name: nombreDoc(config, `proyectos/${id}`), fields: campos({
        datos: await empaquetarProyecto(proyecto), claveHash: await huella(clave), rev: nueva, actualizado: new Date(),
      }) },
      currentDocument: { exists: true },
    },
  ], fetchFn);
  return nueva;
}
