// Tests del proyecto en la nube (v1.30). Correr con: npm test
// Firestore se reemplaza por un falso en memoria que aplica LAS MISMAS reglas que
// firebase/firestore.rules (las reales se prueban con firebase/probarReglas.mjs y el emulador).
import { describe, it, expect } from 'vitest';
import { crearEnNube, leerDeNube, guardarEnNube, leerHashNube, linksNube, huella, alAzar, nubeDisponible } from './nube.js';
import { proyectoEjemplo } from './proyectosBase.js';

const CONFIG = { projectId: 'demo-pollo', apiKey: 'clave-publica' };
const prefijo = 'projects/demo-pollo/databases/(default)/documents/';

/** Firestore falso: guarda documentos y aplica las reglas de firestore.rules. */
function firestoreFalso() {
  const docs = new Map();
  const valor = (campo) => campo.stringValue ?? (campo.integerValue !== undefined ? Number(campo.integerValue) : campo.timestampValue);
  const plano = (fields) => Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, valor(v)]));
  async function permitido(ruta, nuevo, despues) {
    const [coleccion, id] = ruta.split('/');
    const anterior = docs.get(ruta);
    if (coleccion === 'proyectos') {
      if (!anterior) return nuevo.rev === 0 && nuevo.claveHash?.length === 64 && id.length >= 10;
      return nuevo.claveHash === anterior.claveHash && nuevo.rev === anterior.rev + 1 && despues.has(`cambios/${id}_${nuevo.rev}`);
    }
    if (coleccion === 'cambios') {
      if (anterior) return false;
      const proyectoDespues = despues.get(`proyectos/${nuevo.id}`);
      const proyectoAntes = docs.get(`proyectos/${nuevo.id}`);
      return Boolean(proyectoDespues && proyectoAntes) && id === `${nuevo.id}_${proyectoDespues.rev}`
        && (await huella(nuevo.clave)) === proyectoAntes.claveHash;
    }
    return false;
  }
  const fetchFn = async (url, opciones = {}) => {
    if (opciones.method === 'POST') {
      const { writes } = JSON.parse(opciones.body);
      const despues = new Map(docs);
      writes.forEach((w) => despues.set(w.update.name.replace(prefijo, ''), plano(w.update.fields)));
      for (const w of writes) {
        const ruta = w.update.name.replace(prefijo, '');
        if (w.currentDocument?.exists === false && docs.has(ruta)) return { ok: false, status: 409 };
        if (w.currentDocument?.exists === true && !docs.has(ruta)) return { ok: false, status: 404 };
        if (!(await permitido(ruta, plano(w.update.fields), despues))) return { ok: false, status: 403 };
      }
      despues.forEach((v, k) => docs.set(k, v));
      return { ok: true, status: 200, json: async () => ({}) };
    }
    const ruta = decodeURIComponent(url.split('/documents/')[1].split('?')[0]);
    if (ruta.startsWith('cambios/')) return { ok: false, status: 403 }; // nadie los lee
    const doc = docs.get(ruta);
    if (!doc) return { ok: false, status: 404 };
    return { ok: true, status: 200, json: async () => ({ fields: {
      datos: { stringValue: doc.datos }, claveHash: { stringValue: doc.claveHash }, rev: { integerValue: String(doc.rev) },
    } }) };
  };
  return { docs, fetchFn };
}

describe('links de la nube', () => {
  it('ver y editar, cortos', () => {
    const l = linksNube('https://pollolopez.github.io/micasa/', 'K7x2mQa9Zt12', 'claveclaveclaveclave1234');
    expect(l.ver).toBe('https://pollolopez.github.io/micasa/#p=K7x2mQa9Zt12');
    expect(l.ver.length).toBeLessThan(60);
    expect(leerHashNube('#p=K7x2mQa9Zt12')).toEqual({ id: 'K7x2mQa9Zt12', clave: null });
    expect(leerHashNube('#e=K7x2mQa9Zt12.claveclaveclaveclave1234')).toEqual({ id: 'K7x2mQa9Zt12', clave: 'claveclaveclaveclave1234' });
    expect(leerHashNube('#p=corto')).toBeNull();
    expect(leerHashNube('#proyecto=zAAA')).toBeNull();
  });

  it('id y clave al azar; huella sha256 en hexa', async () => {
    expect(alAzar(12)).toMatch(/^[A-Za-z0-9]{12}$/);
    expect(alAzar(24)).not.toBe(alAzar(24));
    expect(await huella('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  it('sin configurar, no hay nube', () => {
    expect(nubeDisponible({ projectId: '', apiKey: '' })).toBe(false);
    expect(nubeDisponible(CONFIG)).toBe(true);
  });
});

describe('guardar y leer', () => {
  it('crear, leer con el link de ver y guardar cambios con el de editar', async () => {
    const { docs, fetchFn } = firestoreFalso();
    const op = { config: CONFIG, fetchFn };
    const proyecto = { ...proyectoEjemplo(), nombre: 'Casa de prueba' };
    const { id, clave, rev } = await crearEnNube(proyecto, op);
    expect(rev).toBe(0);
    expect(docs.get(`proyectos/${id}`).claveHash).toBe(await huella(clave));
    expect(JSON.stringify([...docs.values()])).not.toContain(clave); // la clave no queda en el proyecto

    const leido = await leerDeNube(id, op);
    expect(leido).toMatchObject({ ok: true, rev: 0 });
    expect(leido.proyecto.nombre).toBe('Casa de prueba');

    const cambiado = { ...proyecto, params: { ...proyecto.params, largo: 9 } };
    expect(await guardarEnNube(id, clave, cambiado, 0, op)).toBe(1);
    const otra = await leerDeNube(id, op);
    expect(otra.rev).toBe(1);
    expect(otra.proyecto.params.largo).toBe(9);
  });

  it('sin la clave no se puede guardar (aunque se copie la huella)', async () => {
    const { fetchFn } = firestoreFalso();
    const op = { config: CONFIG, fetchFn };
    const { id } = await crearEnNube(proyectoEjemplo(), op);
    await expect(guardarEnNube(id, 'claveinventadaclaveinventada', proyectoEjemplo(), 0, op)).rejects.toThrow(/no permite editar/);
  });

  it('si alguien guardó antes, no se pisa', async () => {
    const { fetchFn } = firestoreFalso();
    const op = { config: CONFIG, fetchFn };
    const { id, clave } = await crearEnNube(proyectoEjemplo(), op);
    await guardarEnNube(id, clave, proyectoEjemplo(), 0, op); // otro guardó la versión 1
    await expect(guardarEnNube(id, clave, proyectoEjemplo(), 0, op)).rejects.toThrow(/otra versión/);
  });

  it('un id que no existe avisa', async () => {
    const { fetchFn } = firestoreFalso();
    expect(await leerDeNube('NoExisteNada12', { config: CONFIG, fetchFn })).toMatchObject({ ok: false });
  });
});
