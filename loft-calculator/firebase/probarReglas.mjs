// ==========================================================
// Prueba de las reglas de Firestore con el EMULADOR (v1.30)
// ----------------------------------------------------------
// Corre en tu compu (necesita Java). Desde la carpeta loft-calculator:
//
//   npx firebase-tools emulators:exec --only firestore --project demo-pollo --config firebase/firebase.json "node firebase/probarReglas.mjs"
//
// Usa el mismo código de la app (src/proyecto/nube.js) contra el emulador,
// que aplica firebase/firestore.rules igual que la nube de verdad.
// ==========================================================

import { crearEnNube, leerDeNube, guardarEnNube } from '../src/proyecto/nube.js';
import { proyectoEjemplo } from '../src/proyecto/proyectosBase.js';

const host = `http://${process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8085'}`;
const op = { config: { projectId: 'demo-pollo', apiKey: 'emulador', host }, fetchFn: fetch };
let fallas = 0;
const probar = async (que, fn) => {
  try { await fn(); console.log(`✓ ${que}`); } catch (e) { fallas++; console.log(`✗ ${que}: ${e.message}`); }
};
const esperarError = async (promesa) => {
  try { await promesa; } catch { return; }
  throw new Error('se esperaba que la regla lo rechace');
};

const proyecto = { ...proyectoEjemplo(), nombre: 'Prueba de reglas' };
let link;
await probar('crear un proyecto', async () => { link = await crearEnNube(proyecto, op); });
await probar('leerlo con el link de ver', async () => {
  const r = await leerDeNube(link.id, op);
  if (!r.ok || r.proyecto.nombre !== 'Prueba de reglas') throw new Error(r.error ?? 'no coincide');
});
await probar('guardar con la clave (link de editar)', async () => {
  if ((await guardarEnNube(link.id, link.clave, { ...proyecto, nombre: 'Cambiado' }, 0, op)) !== 1) throw new Error('rev');
  const r = await leerDeNube(link.id, op);
  if (r.proyecto.nombre !== 'Cambiado' || r.rev !== 1) throw new Error('no se guardó');
});
await probar('sin la clave NO se puede guardar', () => esperarError(guardarEnNube(link.id, 'otraClaveCualquiera12345', proyecto, 1, op)));
await probar('con una versión vieja NO se pisa', () => esperarError(guardarEnNube(link.id, link.clave, proyecto, 0, op)));
await probar('los registros con la clave NO se pueden leer', async () => {
  const r = await fetch(`${host}/v1/projects/demo-pollo/databases/(default)/documents/cambios/${link.id}_1`);
  if (r.ok) throw new Error('se pudo leer un cambio');
});
await probar('NO se puede listar los proyectos', async () => {
  const r = await fetch(`${host}/v1/projects/demo-pollo/databases/(default)/documents/proyectos`);
  if (r.ok) throw new Error('se pudo listar');
});
console.log(fallas ? `\n${fallas} prueba(s) fallaron` : '\nTodas las reglas andan.');
process.exit(fallas ? 1 : 0);
