// ==========================================================
// UNIONES (v1.33): qué pieza queda entera y cuál se corta en cada cruce
// ----------------------------------------------------------
// Hasta v1.32 todas las piezas se medían EJE A EJE y se cruzaban una encima
// de la otra. En el taller se arma una RED: en cada cruce una pieza sigue
// entera y la otra se corta contra sus caras (soldada o atornillada desde
// adentro). A la que se corta se le descuenta, en cada punta, la mitad de la
// medida del perfil entero (más la luz para soldar, si se cargó), y si lo
// cruza por el medio queda partida en dos.
//
// Jerarquía (decisión de Leandro, 27/10). Menor número = queda entera.
//   Paredes: soleras/marcos de piso (los dos largos 0, los cortos 1) >
//            columnas y jambas (2) > dinteles y alféizares (3) >
//            montantes y tramos de columna cortados por un vano (4) >
//            fajas y travesaños (5).
//   Pisos:   bordes (largos 0, cortos 1; viga de cierre 1) > tirantes (2) >
//            transversales (3).
// No entran (siguen como antes): techo (las correas van APOYADAS sobre las
// vigas), riostras, escalera, columnas del entrepiso, viga de apoyo (los
// tirantes apoyan encima), piezas agregadas a mano.
//
// La "medida vista" del perfil entero es la que queda en el plano de la red:
// el ala (b) de un perfil C/U, el lado de un caño cuadrado y el ancho (b)
// de un caño rectangular (el alto "a" va hacia el espesor de la pared o
// parado en el piso).
// ==========================================================

import { INSUMO } from './constantes.js';
import { INSUMO_DE_TIPO } from './piezasAgregadas.js';
import { seccionDesdePerfil } from './canos.js';

export const UNIONES_INICIALES = { modo: 'red', luz: 0 }; // 'red' = con descuentos; 'eje' = eje a eje (como antes)

const TOLERANCIA = 0.015; // 1,5 cm: dos ejes a menos de eso se tocan
const LARGO_MINIMO = 0.05; // tramos de menos de 5 cm no se fabrican
const PERIMETRO = 'perimetro'; // marcos y bordes: los largos quedan enteros, los cortos se cortan

/** Rango de cada tipo de pieza en cada "red" (paredes, piso de planta baja, piso 2). */
const REDES = {
  pared: {
    'marco-piso': PERIMETRO, solera: PERIMETRO,
    columna: 2, jamba: 2,
    dintel: 3, alfeizar: 3,
    montante: 4, 'montante-dintel': 4, 'montante-antepecho': 4,
    horizontal: 5, travesano: 5,
  },
  piso: { 'marco-piso': PERIMETRO, piso: 2, 'transv-piso': 3 },
  piso2: { 'marco-piso2': PERIMETRO, 'viga-cierre': 1, piso2: 2, 'transv-piso2': 3 },
};

// ---------- Vectores ----------
const resta = (a, b) => a.map((v, i) => v - b[i]);
const suma = (a, b) => a.map((v, i) => v + b[i]);
const por = (a, k) => a.map((v) => v * k);
const punto = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const largoDe = (a) => Math.hypot(...a);

/** Rango de una pieza en una red (null si no participa). */
function rangoEn(red, p, ejeLargo) {
  const r = REDES[red][p.tipo];
  if (r === undefined) return null;
  // Columna partida por una abertura (tramo de abajo o de arriba): se corta contra el alféizar o el dintel.
  if (p.tipo === 'columna' && /:(abajo|arriba)$/.test(p.id)) return 4;
  if (r !== PERIMETRO) return r;
  const d = resta(p.hasta, p.desde);
  const vaEnX = Math.abs(d[0]) >= Math.abs(d[2]);
  return (ejeLargo === 'x') === vaEnX ? 0 : 1;
}

/** ¿`a` queda entera frente a `b`? (comparten alguna red y en ella `a` tiene rango menor) */
function mandaSobre(a, b, ejeLargo) {
  return Object.keys(REDES).some((red) => {
    const ra = rangoEn(red, a, ejeLargo);
    const rb = rangoEn(red, b, ejeLargo);
    return ra !== null && rb !== null && ra < rb;
  });
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

/**
 * Dónde cruza `q` (entera) a `p` (la que se corta): distancia sobre p desde su punta "desde",
 * o null si no se tocan (o son casi paralelas).
 */
function cruce(p, q) {
  const lp = largoDe(resta(p.hasta, p.desde));
  const lq = largoDe(resta(q.hasta, q.desde));
  if (lp < 1e-9 || lq < 1e-9) return null;
  const u = por(resta(p.hasta, p.desde), 1 / lp);
  const w = por(resta(q.hasta, q.desde), 1 / lq);
  const c = punto(u, w);
  if (Math.abs(c) > 0.2) return null; // casi paralelas: no es un cruce
  // Puntos más cercanos entre las dos rectas.
  const r = resta(p.desde, q.desde);
  const d = punto(u, r);
  const e = punto(w, r);
  const den = 1 - c * c;
  const t = (c * e - d) / den; // sobre p
  const s = (e - c * d) / den; // sobre q
  if (s < -TOLERANCIA || s > lq + TOLERANCIA) return null; // fuera de la pieza entera
  const distancia = largoDe(resta(suma(p.desde, por(u, t)), suma(q.desde, por(w, s))));
  if (distancia > TOLERANCIA) return null;
  return { t, lp, u };
}

/**
 * Corta una pieza contra las que quedan enteras: devuelve los tramos que quedan (1 o más, o ninguno).
 * Cada cruce le saca [t - mitad, t + mitad], con mitad = medida vista / 2 + luz.
 */
function cortarPieza(p, enteras, catalogo, luz) {
  let lp = null;
  let u = null;
  const sacar = [];
  enteras.forEach((q) => {
    const x = cruce(p, q);
    if (!x) return;
    lp = x.lp;
    u = x.u;
    const mitad = medidaVista(q, catalogo) / 2 + luz;
    if (x.t < -mitad - TOLERANCIA || x.t > x.lp + mitad + TOLERANCIA) return; // la cruza más allá de sus puntas
    sacar.push([x.t - mitad, x.t + mitad]);
  });
  if (sacar.length === 0) return [p];
  // Lo que queda de [0, lp] sacando cada intervalo.
  sacar.sort((a, b) => a[0] - b[0]);
  const tramos = [];
  let desde = 0;
  sacar.forEach(([a, b]) => {
    if (a > desde) tramos.push([desde, Math.min(a, lp)]);
    desde = Math.max(desde, b);
  });
  if (desde < lp) tramos.push([desde, lp]);
  const utiles = tramos.filter(([a, b]) => b - a >= LARGO_MINIMO);
  return utiles.map(([a, b], i) => ({
    ...p,
    id: utiles.length === 1 ? p.id : `${p.id}~${i + 1}`,
    desde: suma(p.desde, por(u, a)),
    hasta: suma(p.desde, por(u, b)),
    largo: Number((b - a).toFixed(4)),
    largoEje: p.largoEje ?? p.largo, // el largo de antes (eje a eje), para mostrar cuánto se descontó
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
 * @param params   usa params.uniones ({ modo, luz }) y el largo/ancho (qué lados del marco son los largos)
 * @param catalogo para la medida de cada perfil
 * @returns la estructura con las piezas cortadas y `uniones: { modo, metrosDescontados, cortes }`
 */
export function aplicarUniones(e, params, catalogo) {
  const config = { ...UNIONES_INICIALES, ...(params.uniones ?? {}) };
  if (config.modo !== 'red' || !catalogo) return { ...e, uniones: { modo: 'eje', metrosDescontados: 0, cortes: 0 } };
  const ejeLargo = params.largo >= params.ancho ? 'x' : 'z';
  const leer = (ruta) => ruta.reduce((o, k) => o?.[k], e) ?? [];
  const todas = LISTAS.flatMap((ruta) => leer(ruta));
  const participa = (p) => Object.keys(REDES).some((red) => rangoEn(red, p, ejeLargo) !== null);
  let metrosDescontados = 0;
  let cortes = 0;

  const procesar = (lista) => lista.flatMap((p) => {
    if (!participa(p)) return [p];
    const enteras = todas.filter((q) => q !== p && participa(q) && mandaSobre(q, p, ejeLargo));
    const resultado = cortarPieza(p, enteras, catalogo, config.luz);
    const queda = resultado.reduce((a, r) => a + r.largo, 0);
    if (resultado.length !== 1 || resultado[0] !== p) {
      metrosDescontados += p.largo - queda;
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

/** Completa la configuración de uniones (proyectos de antes de v1.33: con red, que es lo correcto). */
export function completarUniones(u) {
  const base = u && typeof u === 'object' ? u : {};
  return {
    modo: base.modo === 'eje' ? 'eje' : 'red',
    luz: Number.isFinite(base.luz) && base.luz >= 0 ? base.luz : 0,
  };
}

/** Errores de carga de las uniones. */
export function validarUniones(u) {
  const errores = {};
  if (!u || typeof u !== 'object') return { uniones: 'Faltan los datos de las uniones' };
  if (!['red', 'eje'].includes(u.modo)) errores['uniones.modo'] = 'Elegí con descuentos o eje a eje';
  if (!Number.isFinite(u.luz) || u.luz < 0 || u.luz > 0.02) errores['uniones.luz'] = 'Entre 0 y 20 mm';
  return errores;
}
