// ==========================================================
// PARTES DE LA OBRA (v1.70)
// ----------------------------------------------------------
// Pedido de Leandro: "los pilotines ya quedaron finalizados y en el cálculo
// del sistema siguen faltando materiales. Debería poder agregar elementos al
// rubro que necesite: en los pilotines compré manguera de riego para el
// asentamiento y tanza para alinearlos".
// Eligió: marcar una parte como TERMINADA (sus materiales salen de "falta
// comprar") y EXTRAS en cada parte que suman al presupuesto.
//
// Cada renglón del presupuesto es de una parte (Pilotines y zapatas, Piso,
// Paredes, Entrepiso, Techo…). La obra civil (cemento, arena, piedra…) se
// reparte entre sus partes (pilotines, tapial, pilar, cámara, pozo) con las
// cuentas de obraCivil.js. Se guarda en params.seguimiento:
//   terminadas: ['pilotines', 'oc:tapial', …]
//   extras:     [{ id, parte, nombre, cantidad, unidad, precio }]   (precio por unidad)
// ==========================================================

import { materialesDeObraCivil, completarObraCivil } from './obraCivil.js';

/** Las partes fijas y los renglones del presupuesto de cada una (por id; los "por pared" van por su base). */
export const PARTES_FIJAS = [
  { clave: 'pilotines', nombre: 'Pilotines y zapatas', items: ['pilotin', 'hormigonZapata', 'excavacion'], obraCivil: ['pilotines'] },
  { clave: 'piso', nombre: 'Piso (planta baja)', items: ['bordePiso', 'piso', 'transversalPiso', 'tiranteMadera'] },
  { clave: 'paredes', nombre: 'Estructura de paredes', items: ['columna', 'columnaEsquina', 'montante', 'marcoAbertura', 'marco', 'correa', 'riostra'] },
  { clave: 'entrepiso', nombre: 'Entrepiso', items: ['columnaEntrepiso', 'vigaCierre', 'piso2', 'transversalPiso2', 'bordePiso2', 'tiranteMadera2'] },
  { clave: 'cubierta', nombre: 'Cubierta de los pisos (OSB, machimbre)', items: ['osb', 'machimbre'] },
  { clave: 'escalera', nombre: 'Escalera', items: ['zanca', 'apoyoEscalon', 'columnaEscalera', 'escalon', 'pisoDescanso'] },
  { clave: 'techo', nombre: 'Techo', items: ['vigaTecho', 'correaTecho', 'bordeTecho'] },
  { clave: 'revestimiento', nombre: 'Revestimiento de paredes', items: [] }, // los paneles (menos el del techo)
  { clave: 'mesadas', nombre: 'Mesadas', items: ['estructuraMesada', 'tapaMesada', 'estanteMesada', 'bachaSimple', 'bachaDoble'] },
  { clave: 'tabiques', nombre: 'Tabiques', items: ['estructuraTabique', 'puertaPlaca', 'puertaGranero'] },
];

// Los renglones de obra civil: de qué campo de materialesDeObraCivil sale la cantidad de cada uno.
const OBRA_CIVIL = { cemento: 'bolsas', arena: 'arena', piedra: 'piedra', hierro8: 'varillas8', hierro6: 'varillas6', hierro42: 'varillas42',
  ladrilloHueco: 'ladrilloHueco', ladrilloComun: 'ladrilloComun', excavacionObra: 'excavacion' };
const CAMPOS_CIVIL = ['hormigon', 'mortero', 'hierro8', 'hierro6', 'hierro42', 'ladrilloHueco', 'ladrilloComun', 'excavacion'];

const base = (id) => String(id).split('@')[0]; // "columna@perfil-3" (renglón por pared) → "columna"
const claveMaterial = (item) => item.perfilId ?? item.id; // la de la lista de materiales (listaDeMateriales)

/** De qué parte es un renglón del presupuesto (o null: accesorios, flete, obra civil repartida). */
export function parteDeItem(item, estructura) {
  if (String(item.id).startsWith('inst:')) return String(item.id).split(':').slice(0, 2).join(':'); // cada instalación es su parte (también sus materiales: inst:sistema:k)
  if (String(item.id).startsWith('extra:')) return item.parte ?? null;
  if (item.categoria === 'panel') return item.id === estructura?.techo?.panel ? 'techo' : 'revestimiento';
  return PARTES_FIJAS.find((p) => p.items.includes(base(item.id)))?.clave ?? null;
}

/**
 * Las partes de la obra con lo que lleva cada una (solo las que llevan algo, o tienen extras).
 * @param items  los renglones del presupuesto (con las instalaciones como "inst:…")
 * @returns {{ clave, nombre, renglones: { id, nombre, cantidad, unidad, subtotal }[], obraCivil: object|null, extras: object[], terminada }[]}
 */
export function partesDeLaObra(items, estructura, seguimiento = {}) {
  const terminadas = new Set(seguimiento.terminadas ?? []);
  const extras = seguimiento.extras ?? [];
  const partes = PARTES_FIJAS.map((p) => ({ clave: p.clave, nombre: p.nombre, renglones: [], obraCivil: null }));
  const de = (clave) => partes.find((p) => p.clave === clave);
  items.filter((i) => i.cantidad > 0 && i.categoria !== 'flete' && !String(i.id).startsWith('extra:')).forEach((i) => { // los extras van aparte
    const clave = parteDeItem(i, estructura);
    if (!clave) return;
    if (!de(clave)) partes.push({ clave, nombre: i.nombre, renglones: [], obraCivil: null }); // una instalación
    de(clave).renglones.push({ id: i.id, nombre: i.nombre, cantidad: i.cantidad, unidad: i.unidad, subtotal: i.subtotal ?? 0 });
  });
  // Obra civil: los pilotines van con su parte; tapial, pilar, cámara y pozo son partes propias.
  (estructura?.obraCivil?.partes ?? []).forEach((oc) => {
    const fija = PARTES_FIJAS.find((p) => p.obraCivil?.includes(oc.clave));
    if (fija) de(fija.clave).obraCivil = oc;
    else partes.push({ clave: `oc:${oc.clave}`, nombre: oc.nombre, renglones: [], obraCivil: oc });
  });
  return partes
    .map((p) => ({ ...p, extras: extras.filter((x) => x.parte === p.clave), terminada: terminadas.has(p.clave) }))
    .filter((p) => p.renglones.length > 0 || p.obraCivil || p.extras.length > 0);
}

/**
 * Lo que NO falta comprar porque su parte está terminada: por material de la lista (su clave), cuánto descontar.
 * La obra civil se recalcula sin las partes terminadas (el cemento de los pilotines terminados sale; el del tapial
 * que falta, queda).
 * @returns {Map<string, number>}
 */
export function descuentoPorTerminadas(items, estructura, seguimiento = {}, obraCivilParams = undefined) {
  const terminadas = new Set(seguimiento.terminadas ?? []);
  const descuento = new Map();
  const sumar = (clave, n) => n > 0 && descuento.set(clave, Math.round(((descuento.get(clave) ?? 0) + n) * 100) / 100);
  if (terminadas.size === 0) return descuento;
  items.filter((i) => i.cantidad > 0).forEach((i) => {
    const parte = parteDeItem(i, estructura);
    if (parte && terminadas.has(parte)) sumar(String(i.id).startsWith('extra:') ? i.id : claveMaterial(i), i.cantidad);
  });
  const oc = estructura?.obraCivil;
  if (oc?.partes?.length) {
    const parteDe = (x) => PARTES_FIJAS.find((p) => p.obraCivil?.includes(x.clave))?.clave ?? `oc:${x.clave}`;
    const quedan = oc.partes.filter((x) => !terminadas.has(parteDe(x)));
    if (quedan.length < oc.partes.length) {
      const total = Object.fromEntries(CAMPOS_CIVIL.map((k) => [k, quedan.reduce((a, x) => a + (x[k] ?? 0), 0)]));
      const resto = materialesDeObraCivil(total, completarObraCivil(obraCivilParams));
      Object.entries(OBRA_CIVIL).forEach(([id, campo]) => sumar(id, (oc.materiales?.[campo] ?? 0) - (resto[campo] ?? 0)));
      // Los accesorios del pilar de luz: uno por pilar terminado.
      sumar('kitPilar', oc.partes.filter((x) => x.clave.startsWith('pilar:') && terminadas.has(parteDe(x))).length);
    }
  }
  return descuento;
}

// ---------- extras ----------

const siguienteId = (lista) => Math.max(0, ...lista.map((x) => x.id)) + 1;

export const extraNuevo = (extras, parte) => ({ id: siguienteId(extras), parte, nombre: '', cantidad: 1, unidad: 'u', precio: 0 });

/** Los extras como renglones del presupuesto (para la lista de materiales y los totales). */
export function itemsDeExtras(extras = [], partes = []) {
  return extras.filter((x) => x.cantidad > 0).map((x) => ({
    id: `extra:${x.id}`, categoria: 'extra', parte: x.parte, nombre: x.nombre || 'Extra',
    perfil: `para ${partes.find((p) => p.clave === x.parte)?.nombre ?? x.parte}`, unidad: x.unidad, cantidad: x.cantidad,
    precio: x.precio, subtotal: Math.round(x.cantidad * x.precio), largoBarra: null, detalle: 'Extra cargado a mano', cortes: null,
  }));
}

const texto = (t, n) => typeof t === 'string' && t.length <= n;
export function errorDeExtra(x) {
  if (!x || !Number.isInteger(x.id) || !texto(x.parte, 60) || !texto(x.nombre, 80) || !texto(x.unidad, 20)) return 'Texto demasiado largo';
  if (!(Number.isFinite(x.cantidad) && x.cantidad >= 0 && x.cantidad <= 1e6)) return 'Cantidad inválida';
  if (!(Number.isFinite(x.precio) && x.precio >= 0 && x.precio <= 1e12)) return 'Precio inválido';
  return null;
}
