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

import { materialesDeObraCivil, completarObraCivil, CAMPOS_OBRA_CIVIL } from './obraCivil.js';
import { INSUMO } from './constantes.js';

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
  { clave: 'tabiques', nombre: 'Tabiques', items: ['estructuraTabique', 'soleraTabique', 'tornilloT1', 'tornilloT2', 'cintaJuntas', 'masillaJuntas', 'puertaPlaca', 'puertaGranero'] },
];

// Los renglones de obra civil: de qué campo de materialesDeObraCivil sale la cantidad de cada uno.
const OBRA_CIVIL = { cemento: 'bolsas', arena: 'arena', piedra: 'piedra', hierro8: 'varillas8', hierro6: 'varillas6', hierro42: 'varillas42',
  ladrilloHueco: 'ladrilloHueco', ladrilloComun: 'ladrilloComun', excavacionObra: 'excavacion',
  // v1.80: el tapial
  ladrilloHueco8: 'ladrilloHueco8', ladrilloHueco18: 'ladrilloHueco18', bloqueHormigon: 'bloqueHormigon', fenolico: 'fenolicos', tiranteEncofrado: 'tirantesEncofrado' };
const CAMPOS_CIVIL = CAMPOS_OBRA_CIVIL;
// v1.80: el portón corredizo es de la parte del tapial (sus renglones no son obra civil repartida).
const DEL_TAPIAL = new Set([INSUMO.PORTON_BASTIDOR, INSUMO.PORTON_CHAPA, INSUMO.PORTON_MALLA, INSUMO.PORTON_RIEL, INSUMO.PORTON_KIT]);

const base = (id) => String(id).split('@')[0]; // "columna@perfil-3" (renglón por pared) → "columna"
const claveMaterial = (item) => item.perfilId ?? item.id; // la de la lista de materiales (listaDeMateriales)

/** De qué parte es un renglón del presupuesto (o null: accesorios, flete, obra civil repartida). */
export function parteDeItem(item, estructura) {
  if (String(item.id).startsWith('inst:')) return String(item.id).split(':').slice(0, 2).join(':'); // cada instalación es su parte (también sus materiales: inst:sistema:k)
  if (String(item.id).startsWith('extra:')) return item.parte ?? null;
  if (item.categoria === 'accesorio') return item.parte || null; // v1.79: un material agregado a una parte (precio por proveedor)
  if (DEL_TAPIAL.has(base(item.id))) return 'oc:tapial';
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
  // Obra civil (v1.79: antes que los renglones, así un material agregado al tapial cae en SU parte): los pilotines van con su parte; tapial, pilar, cámara y pozo son partes propias.
  (estructura?.obraCivil?.partes ?? []).forEach((oc) => {
    const fija = PARTES_FIJAS.find((p) => p.obraCivil?.includes(oc.clave));
    if (fija) de(fija.clave).obraCivil = oc;
    else partes.push({ clave: `oc:${oc.clave}`, nombre: oc.nombre, renglones: [], obraCivil: oc });
  });
  items.filter((i) => i.cantidad > 0 && i.categoria !== 'flete' && !String(i.id).startsWith('extra:')).forEach((i) => { // los extras van aparte
    const clave = parteDeItem(i, estructura);
    if (!clave) return;
    // Una instalación (su nombre); un material de una parte que ya no está (ej. se sacó el tapial): "Otra parte".
    if (!de(clave)) partes.push({ clave, nombre: i.categoria === 'accesorio' ? 'Otra parte' : i.nombre, renglones: [], obraCivil: null });
    de(clave).renglones.push({ id: i.id, nombre: i.nombre, cantidad: i.cantidad, unidad: i.unidad, subtotal: i.subtotal ?? 0 });
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

// ---------- mano de obra de cada parte (v1.74) ----------
// Pedido (PENDIENTES v1.70): "una parte terminada con su rubro de mano de obra (Pilotines ↔ el trabajo de José): unirlos".
// El trabajo (rubro del seguimiento) guarda `parteObra` = la clave de la parte. La parte muestra sus trabajos y, si
// está terminada y el trabajo no llegó al 100 %, ofrece completarlo.

/** Los trabajos (rubros del seguimiento) unidos a una parte. */
export const trabajosDeLaParte = (rubros = [], clave) => rubros.filter((r) => r.parteObra === clave);

/** ¿La parte está terminada pero alguno de sus trabajos no llegó al 100 %? (para avisar y ofrecer completarlo) */
export const trabajosSinTerminar = (rubros = [], clave) => trabajosDeLaParte(rubros, clave).filter((r) => (r.avance ?? 0) < 100);

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

// ---------- v1.79.1: pedido para cotizar ----------

const numero = (n) => n.toLocaleString('es-AR', { maximumFractionDigits: 2 });
// La excavación es trabajo (no se le compra al corralón): no va en el pedido.
const NO_SE_COMPRAN = new Set([INSUMO.EXCAVACION, INSUMO.EXCAVACION_OBRA]);

/**
 * Lo que se compra de la obra civil de una parte (cemento en bolsas, arena, piedra, varillas, ladrillos), como
 * renglones { nombre, cantidad, unidad }. Usa las mismas cuentas que la tarjeta de Obra civil.
 */
function renglonesDeObraCivil(oc, obraCivilParams) {
  if (!oc) return [];
  const dosis = completarObraCivil(obraCivilParams);
  const m = oc.materialesFinal ?? materialesDeObraCivil(oc, dosis); // v1.80: con lo que dijo el albañil, si lo cargó
  const varilla = (diametro) => `Hierro ø${diametro} (varillas de ${dosis.largoVarilla} m)`;
  return [
    ['Cemento', m.bolsas, `bolsas de ${dosis.bolsaKg} kg`],
    ['Arena', m.arena, 'm³'],
    ['Piedra', m.piedra, 'm³'],
    [varilla(8), m.varillas8, 'u'],
    [varilla(6), m.varillas6, 'u'],
    [varilla('4,2'), m.varillas42, 'u'],
    ['Ladrillo hueco 12', m.ladrilloHueco, 'u'],
    ['Ladrillo hueco 8', m.ladrilloHueco8, 'u'],
    ['Ladrillo hueco 18', m.ladrilloHueco18, 'u'],
    ['Bloque de hormigón 19x19x39', m.bloqueHormigon, 'u'],
    ['Ladrillo común', m.ladrilloComun, 'u'],
    ['Placa fenólica 18 mm 1,22 x 2,44 m', m.fenolicos, 'u'],
    ['Tirante de pino 2" x 3"', m.tirantesEncofrado, 'm'],
  ].filter(([, cantidad]) => cantidad > 0).map(([nombre, cantidad, unidad]) => ({ nombre, cantidad, unidad }));
}

/**
 * Texto para pedirle precio a un corralón por WhatsApp (sin precios: el mismo para todos, así se comparan iguales).
 * Junta lo que lleva la parte (sus renglones, incluidos los materiales agregados), su obra civil y los extras de antes.
 * @param parte un elemento de partesDeLaObra(…)
 * @param obraCivilParams params.obraCivil (la dosificación y el largo de las varillas)
 */
export function textoParaCotizar(parte, obraCivilParams = undefined, nombreProyecto = '') {
  const renglones = [
    ...parte.renglones.filter((r) => r.cantidad > 0 && !NO_SE_COMPRAN.has(r.id)),
    ...renglonesDeObraCivil(parte.obraCivil, obraCivilParams),
    ...(parte.extras ?? []).filter((x) => x.cantidad > 0 && x.nombre.trim()),
  ];
  const titulo = `Hola, ¿me pasás precio de estos materiales? Son para: ${parte.nombre}${nombreProyecto ? ` (${nombreProyecto})` : ''}`;
  // "4 barras de 6 m" (no "4 barra"): el corralón tiene que saber el largo.
  const unidadDe = (r) => (r.unidad === 'barra' ? `${r.cantidad === 1 ? 'barra' : 'barras'}${r.largoBarra ? ` de ${numero(r.largoBarra)} m` : ''}`
    : r.unidad === 'placa' && r.cantidad !== 1 ? 'placas' : r.unidad ?? '');
  const lineas = renglones.map((r) => `• ${numero(r.cantidad)} ${unidadDe(r)} — ${r.nombre}`.replace(/ {2,}/g, ' '));
  return [titulo, '', ...lineas, '', '¿Hacen envío? ¿Cuánto sale? Gracias.'].join('\n');
}
