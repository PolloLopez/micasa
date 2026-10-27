// ==========================================================
// UNIONES (v1.33, elegibles desde v1.34): qué pieza queda entera y cuál se
// corta en cada cruce
// ----------------------------------------------------------
// En el taller se arma una RED: en cada cruce una pieza sigue entera y la
// otra se corta contra sus caras (soldada o atornillada desde adentro).
//
// Cada cruce es de uno de estos tres tipos (por geometría):
//   X  las dos pasan de largo (una faja por una columna del medio):
//      la que pierde queda partida en dos.
//   T  una termina contra la otra (la columna contra la solera): la que
//      termina se corta contra la cara de la otra... salvo en los pares que
//      se pueden invertir (soleras/columnas, bordes/tirantes, dintel/jamba de
//      cada abertura): si la que termina es la que "queda entera", sigue hasta
//      la cara de afuera y la otra se corta en tramos.
//   L  las dos terminan (una esquina): la entera llega hasta la cara de afuera
//      de la otra; la otra se corta contra ella.
// A la que se corta se le descuenta la mitad de la medida del perfil entero
// (más la luz para soldar, si se cargó). La entera se alarga la mitad del otro.
//
// Qué queda entera se elige por obra (params.uniones.enteras, decisión de
// Leandro 27/10) y el marco por abertura (abertura.marcoEntero):
//   soleras ↔ columnas · columnas ↔ fajas · montantes ↔ fajas · bordes ↔ tirantes
//   jambas ↔ dintel y alféizar (cada abertura).
// No entran (siguen como antes): techo (las correas van APOYADAS sobre las
// vigas), riostras, escalera, columnas del entrepiso, viga de apoyo, piezas
// agregadas a mano.
//
// La "medida vista" del perfil es la que queda en el plano de la red: el ala
// (b) de un perfil C/U, el lado de un caño cuadrado y el ancho (b) de un caño
// rectangular (el alto "a" va hacia el espesor de la pared o parado en el piso).
// ==========================================================

import { INSUMO } from './constantes.js';
import { INSUMO_DE_TIPO } from './piezasAgregadas.js';
import { seccionDesdePerfil } from './canos.js';

/** Qué queda entera en cada par (el valor de fábrica es el primero de cada lista). */
export const OPCIONES_ENTERAS = {
  solerasColumnas: ['soleras', 'columnas'],
  columnasFajas: ['columnas', 'fajas'],
  montantesFajas: ['montantes', 'fajas'],
  bordesTirantes: ['bordes', 'tirantes'],
};
export const ENTERAS_INICIALES = Object.fromEntries(Object.entries(OPCIONES_ENTERAS).map(([k, v]) => [k, v[0]]));
export const UNIONES_INICIALES = { modo: 'red', luz: 0, enteras: { ...ENTERAS_INICIALES } }; // 'eje' = eje a eje (como antes)
export const MARCOS_ABERTURA = ['jambas', 'dintel']; // qué queda entero en el marco de una abertura

const TOLERANCIA = 0.015; // 1,5 cm: dos ejes a menos de eso se tocan
const LARGO_MINIMO = 0.05; // tramos de menos de 5 cm no se fabrican

/** Qué tipos participan en cada "red" (paredes, piso de planta baja, piso 2). */
const REDES = {
  pared: ['marco-piso', 'solera', 'columna', 'jamba', 'dintel', 'alfeizar', 'montante', 'montante-dintel', 'montante-antepecho', 'horizontal', 'travesano'],
  piso: ['marco-piso', 'piso', 'transv-piso'],
  piso2: ['marco-piso2', 'viga-cierre', 'piso2', 'transv-piso2'],
};
const PERIMETRALES = ['marco-piso', 'solera', 'marco-piso2'];
const MONTANTES = ['montante', 'montante-dintel', 'montante-antepecho'];

// ---------- Vectores ----------
const resta = (a, b) => a.map((v, i) => v - b[i]);
const suma = (a, b) => a.map((v, i) => v + b[i]);
const por = (a, k) => a.map((v) => v * k);
const punto = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const largoDe = (a) => Math.hypot(...a);

/** Id de la abertura de una pieza de su marco ("ref:3:dintel" -> 3), o null. */
const aberturaDe = (p) => (p.id.startsWith('ref:') ? Number(p.id.split(':')[1]) : null);

/**
 * Rango de una pieza en una red (null si no participa). Menor = queda entera.
 * @param ctx { ejeLargo, enteras, marcos: Map(idAbertura -> 'jambas'|'dintel') }
 */
function rangoEn(red, p, ctx) {
  if (!REDES[red].includes(p.tipo)) return null;
  const { enteras } = ctx;
  if (PERIMETRALES.includes(p.tipo)) {
    // Marcos y bordes: los lados largos quedan enteros (0), los cortos van entre ellos (1).
    const d = resta(p.hasta, p.desde);
    const vaEnX = Math.abs(d[0]) >= Math.abs(d[2]);
    return (ctx.ejeLargo === 'x') === vaEnX ? 0 : 1;
  }
  if (p.tipo === 'viga-cierre') return 1;
  // Pisos: tirantes entre bordes, o enteros con los bordes cortados entre ellos.
  if (p.tipo === 'piso' || p.tipo === 'piso2') return enteras.bordesTirantes === 'tirantes' ? -1 : 2;
  if (p.tipo === 'transv-piso' || p.tipo === 'transv-piso2') return 3;
  // Paredes.
  const C = enteras.solerasColumnas === 'columnas' ? -1 : 2; // columnas y jambas
  const F = enteras.columnasFajas === 'fajas' ? C - 0.5 : 5; // fajas
  const M = enteras.montantesFajas === 'montantes' ? F - 0.25 : F + 1; // montantes
  if (p.tipo === 'columna' || p.tipo === 'jamba') return C;
  if (p.tipo === 'dintel' || p.tipo === 'alfeizar') return ctx.marcos.get(aberturaDe(p)) === 'dintel' ? C - 0.1 : 3;
  if (MONTANTES.includes(p.tipo)) return M;
  if (p.tipo === 'horizontal') return F;
  return 6; // travesaños: siempre entre lo que los rodea
}

/** 'gana' si `p` queda entera frente a `q`, 'pierde' si al revés, null si no se tocan en ninguna red. */
function relacion(p, q, ctx) {
  for (const red of Object.keys(REDES)) {
    const rp = rangoEn(red, p, ctx);
    const rq = rangoEn(red, q, ctx);
    if (rp === null || rq === null || rp === rq) continue;
    return rp < rq ? 'gana' : 'pierde';
  }
  return null;
}

/** ¿Es un par que se puede invertir en una T? (la que termina puede quedar entera y cortar a la otra) */
function parInvertible(p, q) {
  const par = (a, b) => (a.includes(p.tipo) && b.includes(q.tipo)) || (a.includes(q.tipo) && b.includes(p.tipo));
  if (par(['marco-piso', 'solera'], ['columna', 'jamba'])) return true;
  if (par(['marco-piso', 'marco-piso2', 'viga-cierre'], ['piso', 'piso2'])) return true;
  return par(['dintel', 'alfeizar'], ['jamba']) && aberturaDe(p) === aberturaDe(q);
}

/**
 * Medida vista (m) del perfil de una pieza, sacada de la lista de perfiles.
 * @param catalogo el catálogo (usos con `perfilId` + lista de perfiles `categoria: 'hierro'`)
 */
export function medidaVista(p, catalogo) {
  const deLista = (id) => catalogo.find((i) => i.categoria === 'hierro' && i.id === id);
  let perfil = p.perfilPared ? deLista(p.perfilPared) : null;
  let texto = null;
  if (!perfil) {
    const idUso = p.insumo ?? (p.esquina ? INSUMO.COLUMNA_ESQUINA : INSUMO_DE_TIPO[p.tipo]);
    const uso = catalogo.find((i) => i.id === idUso);
    perfil = uso?.perfilId ? deLista(uso.perfilId) : null;
    texto = uso?.perfil ?? null;
  }
  if (perfil && perfil.tipo !== 'otro') {
    const mm = perfil.tipo === 'cuadrado' || perfil.tipo === 'redondo' ? perfil.a : (perfil.b || perfil.a);
    if (mm > 0) return mm / 1000;
  }
  return seccionDesdePerfil(texto) ?? 0.05; // sin datos: 5 cm (un perfil chico)
}

/** Dónde se cruzan los ejes de p y q: t sobre p, s sobre q (o null si no se tocan o son casi paralelas). */
function cruce(p, q) {
  const lp = largoDe(resta(p.hasta, p.desde));
  const lq = largoDe(resta(q.hasta, q.desde));
  if (lp < 1e-9 || lq < 1e-9) return null;
  const u = por(resta(p.hasta, p.desde), 1 / lp);
  const w = por(resta(q.hasta, q.desde), 1 / lq);
  const c = punto(u, w);
  if (Math.abs(c) > 0.2) return null; // casi paralelas: no es un cruce
  const r = resta(p.desde, q.desde);
  const d = punto(u, r);
  const e = punto(w, r);
  const den = 1 - c * c;
  const t = (c * e - d) / den; // sobre p
  const s = (e - c * d) / den; // sobre q
  const distancia = largoDe(resta(suma(p.desde, por(u, t)), suma(q.desde, por(w, s))));
  if (distancia > TOLERANCIA) return null;
  return { t, s, lp, lq, u };
}

/**
 * Ajusta una pieza contra las demás: la alarga donde queda entera y le saca lo que ocupa la otra donde
 * pierde. Devuelve los tramos que quedan (1 o más, o ninguno).
 */
function ajustarPieza(p, otras, catalogo, ctx) {
  const hp = medidaVista(p, catalogo) / 2;
  const lp = largoDe(resta(p.hasta, p.desde));
  const u = lp > 1e-9 ? por(resta(p.hasta, p.desde), 1 / lp) : [0, 0, 0];
  let alargarInicio = 0;
  let alargarFin = 0;
  const sacar = [];
  otras.forEach((q) => {
    const rel = relacion(p, q, ctx);
    if (!rel) return;
    const x = cruce(p, q);
    if (!x) return;
    const hq = medidaVista(q, catalogo) / 2;
    if (x.s < -hp - TOLERANCIA || x.s > x.lq + hp + TOLERANCIA) return; // el cruce cae fuera de q
    if (x.t < -hq - TOLERANCIA || x.t > lp + hq + TOLERANCIA) return; // el cruce cae fuera de p
    const pEnInicio = x.t <= hq + TOLERANCIA;
    const pEnFin = x.t >= lp - hq - TOLERANCIA;
    const pTermina = pEnInicio || pEnFin;
    const qTermina = x.s <= hp + TOLERANCIA || x.s >= x.lq - hp - TOLERANCIA;
    const quitar = () => sacar.push([x.t - hq - ctx.luz, x.t + hq + ctx.luz]);
    const alargar = () => {
      // Hasta la cara de afuera de q: desde donde está el cruce, la mitad de q.
      if (pEnInicio) alargarInicio = Math.max(alargarInicio, hq - x.t);
      else alargarFin = Math.max(alargarFin, x.t + hq - lp);
    };
    if (pTermina && qTermina) { // L: esquina
      if (rel === 'gana') alargar(); else quitar();
    } else if (pTermina) { // T: p termina contra q
      if (rel === 'gana' && parInvertible(p, q)) alargar(); else quitar();
    } else if (qTermina) { // T: q termina contra p (p pasa de largo)
      if (rel === 'pierde' && parInvertible(p, q)) quitar();
    } else if (rel === 'pierde') { // X: las dos pasan
      quitar();
    }
  });
  if (sacar.length === 0 && alargarInicio <= 1e-9 && alargarFin <= 1e-9) return [p];
  // Lo que queda de [-alargarInicio, lp + alargarFin] sacando cada intervalo.
  const inicio = -alargarInicio;
  const fin = lp + alargarFin;
  sacar.sort((a, b) => a[0] - b[0]);
  const tramos = [];
  let desde = inicio;
  sacar.forEach(([a, b]) => {
    if (a > desde) tramos.push([desde, Math.min(a, fin)]);
    desde = Math.max(desde, b);
  });
  if (desde < fin) tramos.push([desde, fin]);
  const utiles = tramos.filter(([a, b]) => b - a >= LARGO_MINIMO);
  return utiles.map(([a, b], i) => ({
    ...p,
    id: utiles.length === 1 ? p.id : `${p.id}~${i + 1}`,
    desde: suma(p.desde, por(u, a)),
    hasta: suma(p.desde, por(u, b)),
    largo: Number((b - a).toFixed(4)),
    largoEje: p.largoEje ?? p.largo, // el largo de antes (eje a eje), para mostrar la diferencia
  }));
}

/** Las listas de la estructura que entran en las redes (el resto queda igual). */
const LISTAS = [
  ['columnas'], ['refuerzosAberturas'], ['montantes'], ['marcos'], ['correas'],
  ['piso', 'tirantes'], ['piso', 'transversales'], ['piso2', 'tirantes'], ['piso2', 'transversales'],
];

/**
 * Aplica las uniones a una estructura de construcción (después de marcar los perfiles de pared,
 * antes de las ediciones a mano).
 * @param params    usa params.uniones ({ modo, luz, enteras }) y el largo/ancho (qué lados del marco son los largos)
 * @param catalogo  para la medida de cada perfil
 * @param aberturas para el marco de cada una (marcoEntero)
 * @returns la estructura con las piezas ajustadas y `uniones: { modo, metrosDescontados, cortes }`
 *          (metrosDescontados = lo que se compra de menos; negativo si las enteras alargan más de lo que se descuenta)
 */
export function aplicarUniones(e, params, catalogo, aberturas = []) {
  const config = completarUniones(params.uniones);
  if (config.modo !== 'red' || !catalogo) return { ...e, uniones: { modo: 'eje', metrosDescontados: 0, cortes: 0 } };
  const ctx = {
    ejeLargo: params.largo >= params.ancho ? 'x' : 'z',
    enteras: config.enteras,
    luz: config.luz,
    marcos: new Map(aberturas.map((op) => [op.id, op.marcoEntero === 'dintel' ? 'dintel' : 'jambas'])),
  };
  const leer = (ruta) => ruta.reduce((o, k) => o?.[k], e) ?? [];
  const participa = (p) => Object.keys(REDES).some((red) => rangoEn(red, p, ctx) !== null);
  const todas = LISTAS.flatMap((ruta) => leer(ruta)).filter(participa);
  let metrosDescontados = 0;
  let cortes = 0;

  const procesar = (lista) => lista.flatMap((p) => {
    if (!participa(p)) return [p];
    const resultado = ajustarPieza(p, todas.filter((q) => q !== p), catalogo, ctx);
    if (resultado.length !== 1 || resultado[0] !== p) {
      metrosDescontados += p.largo - resultado.reduce((a, r) => a + r.largo, 0);
      cortes += resultado.length;
    }
    return resultado;
  });

  const nueva = { ...e };
  LISTAS.forEach((ruta) => {
    if (ruta.length === 1) nueva[ruta[0]] = procesar(leer(ruta));
    else nueva[ruta[0]] = { ...nueva[ruta[0]], [ruta[1]]: procesar(leer(ruta)) };
  });
  nueva.uniones = { modo: 'red', metrosDescontados: Math.round(metrosDescontados * 100) / 100, cortes };
  return nueva;
}

/** Completa la configuración de uniones (proyectos de antes: con red, que es lo correcto, y la jerarquía de fábrica). */
export function completarUniones(u) {
  const base = u && typeof u === 'object' ? u : {};
  const enteras = base.enteras && typeof base.enteras === 'object' ? base.enteras : {};
  return {
    modo: base.modo === 'eje' ? 'eje' : 'red',
    luz: Number.isFinite(base.luz) && base.luz >= 0 ? base.luz : 0,
    enteras: Object.fromEntries(Object.entries(OPCIONES_ENTERAS)
      .map(([par, opciones]) => [par, opciones.includes(enteras[par]) ? enteras[par] : opciones[0]])),
  };
}

/** Errores de carga de las uniones. */
export function validarUniones(u) {
  const errores = {};
  if (!u || typeof u !== 'object') return { uniones: 'Faltan los datos de las uniones' };
  if (!['red', 'eje'].includes(u.modo)) errores['uniones.modo'] = 'Elegí con descuentos o eje a eje';
  if (!Number.isFinite(u.luz) || u.luz < 0 || u.luz > 0.02) errores['uniones.luz'] = 'Entre 0 y 20 mm';
  if (u.enteras !== undefined) {
    Object.entries(OPCIONES_ENTERAS).forEach(([par, opciones]) => {
      if (!opciones.includes(u.enteras?.[par])) errores[`uniones.enteras.${par}`] = `Elegí ${opciones.join(' o ')}`;
    });
  }
  return errores;
}
