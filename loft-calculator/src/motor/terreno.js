// ==========================================================
// TERRENO E IMPLANTACIÓN (v1.32): la casa ubicada en su lote
// ----------------------------------------------------------
// El lote es un rectángulo FRENTE x FONDO. Se mide como se mide parado en la
// vereda mirando el lote:
//
//            fondo del lote (medianera de fondo)
//        ┌───────────────────────────┐  ▲
//        │                           │  │ v = distancia a la línea municipal
//        │      ┌─────────┐          │  │
//        │      │  casa   │          │  │
//        │      └─────────┘          │  │
//        └───────────────────────────┘  0
//        u = 0 ─────────────────────▶ u = frente del lote
//        lateral izquierdo     lateral derecho
//        ══════ línea municipal (la calle) ══════
//
// Coordenadas del lote: u = distancia al lateral IZQUIERDO, v = distancia a la
// LÍNEA MUNICIPAL. La casa y cada elemento se ubican por la distancia de su
// borde más cercano a esas dos líneas (como se mide con la cinta en el lote).
// El frente de la casa (params.ladoFrente) mira a la calle.
//
// Todos los valores (medidas, retiros, distancias mínimas) los carga el
// diseñador: cambian según la zona y el municipio. 0 = sin control.
// ==========================================================

import { geometriaLados, largoLado } from './geometria.js';
import { LADOS } from './constantes.js';

/** Qué se puede ubicar en el terreno. `forma` decide cómo se mide y se dibuja. */
export const TIPOS_ELEMENTO = {
  pozo: { nombre: 'Pozo séptico', forma: 'circulo', diametro: 1.2, alto: 0, color: '#78716c' },
  camara: { nombre: 'Cámara séptica', forma: 'rectangulo', ancho: 0.6, largo: 0.6, alto: 0, color: '#a8a29e' },
  arbol: { nombre: 'Árbol', forma: 'circulo', diametro: 4, alto: 6, color: '#15803d' },
  construccion: { nombre: 'Construcción', forma: 'rectangulo', ancho: 3, largo: 3, alto: 2.5, color: '#94a3b8' },
  acceso: { nombre: 'Acceso', forma: 'rectangulo', ancho: 3, largo: 5, alto: 0, color: '#a1a1aa' },
  vereda: { nombre: 'Vereda', forma: 'rectangulo', ancho: 1, largo: 5, alto: 0, color: '#d6d3d1' },
};

/** Los que no pueden quedar encima de la casa (un árbol, un acceso o una vereda sí pueden tocarla). */
const NO_PISAN_LA_CASA = ['pozo', 'camara', 'construccion'];

/** Rumbos para elegir hacia dónde mira la calle (grados desde el norte, en sentido horario). */
export const RUMBOS = [
  ['N', 0], ['NE', 45], ['E', 90], ['SE', 135], ['S', 180], ['SO', 225], ['O', 270], ['NO', 315],
];

export const TERRENO_INICIAL = {
  activo: false, // false = la obra sin terreno (como antes de v1.32)
  frente: 10, // ancho del lote sobre la línea municipal (m)
  fondo: 30, // profundidad del lote (m)
  distanciaFrente: 5, // de la línea municipal al frente de la casa
  distanciaIzquierda: 2, // del lateral izquierdo (mirando desde la calle) a la casa
  orientacion: 0, // hacia dónde mira la calle, en grados desde el norte (0 = N, 90 = E)
  retiros: { frente: 0, fondo: 0, izquierda: 0, derecha: 0 }, // retiros mínimos; 0 = sin control
  minimoPozoCasa: 0, // distancia mínima del pozo séptico a la casa; 0 = sin control
  minimoPozoMedianera: 0, // del pozo a las medianeras (laterales y fondo); 0 = sin control
  elementos: [], // [{ id, tipo, nombre, distanciaFrente, distanciaIzquierda, ancho, largo, diametro, alto }]
};

/**
 * Un elemento nuevo de un tipo, con sus medidas de fábrica, cerca del fondo del lote.
 * Cada uno nuevo se corre un poco a la derecha del anterior, así no aparecen todos encimados.
 */
export function elementoNuevo(tipo, terreno, id) {
  const t = TIPOS_ELEMENTO[tipo];
  const ancho = t.ancho ?? t.diametro;
  const largo = t.largo ?? t.diametro;
  const corrido = 1 + (terreno.elementos?.length ?? 0) * 2.5;
  const u = Math.max(0, Math.min(corrido % Math.max(terreno.frente, 1), terreno.frente - ancho));
  const v = Math.max(0, terreno.fondo - 2 - largo);
  return {
    id, tipo, nombre: t.nombre,
    distanciaFrente: Math.round(v * 100) / 100, distanciaIzquierda: Math.round(u * 100) / 100,
    ancho, largo, diametro: t.diametro ?? 0, alto: t.alto,
  };
}

// ---------- Medidas ----------

/** Lo que ocupa la casa en el lote: ancho sobre la calle (su lado frente) y profundidad. */
export function medidasCasa(params) {
  const ancho = largoLado(params.ladoFrente, params);
  const vecino = LADOS[(LADOS.indexOf(params.ladoFrente) + 1) % 4];
  return { ancho, profundidad: largoLado(vecino, params) };
}

/** La "caja" de un elemento en el lote: { u, v, ancho, largo } (el círculo, en su cuadrado). */
export function cajaDe(el) {
  const circulo = TIPOS_ELEMENTO[el.tipo]?.forma === 'circulo';
  const ancho = circulo ? el.diametro : el.ancho;
  const largo = circulo ? el.diametro : el.largo;
  return { u: el.distanciaIzquierda, v: el.distanciaFrente, ancho, largo };
}

/** Separación entre dos cajas (0 si se tocan o se pisan). */
function separacionCajas(a, b) {
  const du = Math.max(0, a.u - (b.u + b.ancho), b.u - (a.u + a.ancho));
  const dv = Math.max(0, a.v - (b.v + b.largo), b.v - (a.v + a.largo));
  return Math.hypot(du, dv);
}

/** ¿Se pisan (no solo se tocan)? */
const sePisan = (a, b) => a.u < b.u + b.ancho && b.u < a.u + a.ancho && a.v < b.v + b.largo && b.v < a.v + a.largo;

/** Distancia de un elemento a una caja: para un círculo, desde su borde (no desde la esquina del cuadrado). */
function separacion(el, caja) {
  const c = cajaDe(el);
  if (TIPOS_ELEMENTO[el.tipo]?.forma !== 'circulo') return separacionCajas(c, caja);
  const r = el.diametro / 2;
  const centro = [c.u + r, c.v + r];
  const du = Math.max(0, caja.u - centro[0], centro[0] - (caja.u + caja.ancho));
  const dv = Math.max(0, caja.v - centro[1], centro[1] - (caja.v + caja.largo));
  return Math.max(0, Math.hypot(du, dv) - r);
}

const m = (n) => `${n.toFixed(2)} m`;

// ---------- Implantación ----------

/**
 * Todo lo que se calcula del terreno: dónde queda la casa, las 4 distancias, los avisos
 * y cómo pasar del lote al 3D.
 * @returns {{
 *   lote, casa: { u, v, ancho, profundidad }, distancias: { frente, fondo, izquierda, derecha },
 *   elementos: Array, pozos: Array<{ id, nombre, aCasa, izquierda, derecha, fondo }>,
 *   avisos: Array<{ nivel: 'error'|'aviso', texto }>, aMundo: (u, v) => [x, z], norte: [x, z]
 * }}
 */
export function implantacion(params) {
  const t = params.terreno ?? TERRENO_INICIAL;
  const { ancho, profundidad } = medidasCasa(params);
  const casa = { u: t.distanciaIzquierda, v: t.distanciaFrente, ancho, largo: profundidad, profundidad };
  const distancias = {
    frente: t.distanciaFrente,
    izquierda: t.distanciaIzquierda,
    derecha: t.frente - t.distanciaIzquierda - ancho,
    fondo: t.fondo - t.distanciaFrente - profundidad,
  };
  const avisos = [];
  const NOMBRES = { frente: 'de la línea municipal', fondo: 'del fondo', izquierda: 'del lateral izquierdo', derecha: 'del lateral derecho' };

  // La casa entra en el lote y respeta los retiros.
  Object.entries(distancias).forEach(([lado, d]) => {
    if (d < -0.001) avisos.push({ nivel: 'error', texto: `La casa no entra: se pasa ${m(-d)} ${NOMBRES[lado]}.` });
    else if (t.retiros?.[lado] > 0 && d < t.retiros[lado] - 0.001) {
      avisos.push({ nivel: 'aviso', texto: `Invade el retiro de ${lado === 'frente' ? 'frente' : lado === 'fondo' ? 'fondo' : `lateral ${lado}`}: hay ${m(d)} y pide ${m(t.retiros[lado])}.` });
    }
  });

  // Cada elemento: dentro del lote y sin pisar la casa.
  const lote = { u: 0, v: 0, ancho: t.frente, largo: t.fondo };
  const elementos = (t.elementos ?? []).map((el) => ({ ...el, caja: cajaDe(el), forma: TIPOS_ELEMENTO[el.tipo]?.forma ?? 'rectangulo' }));
  elementos.forEach((el) => {
    const c = el.caja;
    if (c.u < -0.001 || c.v < -0.001 || c.u + c.ancho > lote.ancho + 0.001 || c.v + c.largo > lote.largo + 0.001) {
      avisos.push({ nivel: 'aviso', texto: `${el.nombre} queda (en parte) fuera del lote.` });
    }
    if (NO_PISAN_LA_CASA.includes(el.tipo) && sePisan(c, casa) && separacion(el, casa) === 0) {
      avisos.push({ nivel: 'error', texto: `${el.nombre} está encima de la casa.` });
    }
  });

  // Pozos sépticos: distancia a la casa y a las medianeras (laterales y fondo), contra los mínimos cargados.
  const pozos = elementos.filter((el) => el.tipo === 'pozo').map((el) => {
    const r = el.diametro / 2;
    const centro = [el.caja.u + r, el.caja.v + r];
    const datos = {
      id: el.id, nombre: el.nombre, aCasa: separacion(el, casa),
      izquierda: centro[0] - r, derecha: t.frente - centro[0] - r, fondo: t.fondo - centro[1] - r,
    };
    if (t.minimoPozoCasa > 0 && datos.aCasa < t.minimoPozoCasa - 0.001) {
      avisos.push({ nivel: 'aviso', texto: `${el.nombre}: está a ${m(datos.aCasa)} de la casa y el mínimo es ${m(t.minimoPozoCasa)}.` });
    }
    const medianera = Math.min(datos.izquierda, datos.derecha, datos.fondo);
    if (t.minimoPozoMedianera > 0 && medianera < t.minimoPozoMedianera - 0.001) {
      avisos.push({ nivel: 'aviso', texto: `${el.nombre}: está a ${m(Math.max(0, medianera))} de una medianera y el mínimo es ${m(t.minimoPozoMedianera)}.` });
    }
    return datos;
  });

  return { lote: { frente: t.frente, fondo: t.fondo }, casa, distancias, elementos, pozos, avisos, ...conversion(params, t) };
}

/**
 * Del lote al 3D. La esquina izquierda del frente de la casa (vista desde la calle) es la punta 1
 * de su lado frente; "hacia la derecha" es la dirección de ese lado y "hacia el fondo" es hacia adentro.
 * El norte: la calle (hacia afuera del frente) mira a `orientacion` grados del norte, en sentido horario.
 */
function conversion(params, t) {
  const frente = geometriaLados(params)[params.ladoFrente];
  const derecha = frente.direccion; // [x, z]
  const afuera = [-derecha[1], derecha[0]]; // normal hacia la calle
  const adentro = [-afuera[0], -afuera[1]];
  const aMundo = (u, v) => [
    frente.p1[0] + (u - t.distanciaIzquierda) * derecha[0] + (v - t.distanciaFrente) * adentro[0],
    frente.p1[1] + (u - t.distanciaIzquierda) * derecha[1] + (v - t.distanciaFrente) * adentro[1],
  ];
  // Visto desde arriba, girar en sentido horario a grados: (x, z) -> (x cos - z sin, x sin + z cos).
  const g = (-(t.orientacion ?? 0) * Math.PI) / 180;
  const norte = [afuera[0] * Math.cos(g) - afuera[1] * Math.sin(g), afuera[0] * Math.sin(g) + afuera[1] * Math.cos(g)];
  return { aMundo, norte };
}

/** "N", "NE", ... del rumbo más cercano (para mostrar la orientación). */
export function rumboDe(grados) {
  const g = ((grados % 360) + 360) % 360;
  return RUMBOS.reduce((mejor, r) => (Math.abs(((g - r[1] + 540) % 360) - 180) < Math.abs(((g - mejor[1] + 540) % 360) - 180) ? r : mejor))[0];
}

// ---------- Validación ----------

/**
 * Errores de carga (no de ubicación: que la casa no entre es un aviso, para poder ir acomodando).
 * @returns {Object<string, string>} { 'terreno.campo': 'mensaje' }
 */
export function validarTerreno(t) {
  const errores = {};
  if (!t || typeof t !== 'object') return { terreno: 'Faltan los datos del terreno' };
  const positivo = (ruta, valor, max = 1000) => {
    if (!Number.isFinite(valor) || valor <= 0) errores[ruta] = 'Tiene que ser mayor que 0';
    else if (valor > max) errores[ruta] = `Hasta ${max} m`;
  };
  const noNegativo = (ruta, valor) => { if (!Number.isFinite(valor) || valor < 0) errores[ruta] = 'No puede ser negativo'; };
  positivo('terreno.frente', t.frente);
  positivo('terreno.fondo', t.fondo);
  noNegativo('terreno.distanciaFrente', t.distanciaFrente);
  noNegativo('terreno.distanciaIzquierda', t.distanciaIzquierda);
  if (!Number.isFinite(t.orientacion) || t.orientacion < 0 || t.orientacion >= 360) errores['terreno.orientacion'] = 'Entre 0 y 359 grados';
  ['frente', 'fondo', 'izquierda', 'derecha'].forEach((lado) => noNegativo(`terreno.retiros.${lado}`, t.retiros?.[lado]));
  noNegativo('terreno.minimoPozoCasa', t.minimoPozoCasa);
  noNegativo('terreno.minimoPozoMedianera', t.minimoPozoMedianera);
  if (!Array.isArray(t.elementos)) errores['terreno.elementos'] = 'Lista inválida';
  else {
    t.elementos.forEach((el, i) => {
      const ruta = `terreno.elementos.${i}`;
      if (!(el?.tipo in TIPOS_ELEMENTO)) { errores[ruta] = 'Tipo de elemento desconocido'; return; }
      if (typeof el.nombre !== 'string' || el.nombre.length > 40) errores[`${ruta}.nombre`] = 'Hasta 40 letras';
      noNegativo(`${ruta}.distanciaFrente`, el.distanciaFrente);
      noNegativo(`${ruta}.distanciaIzquierda`, el.distanciaIzquierda);
      noNegativo(`${ruta}.alto`, el.alto);
      if (TIPOS_ELEMENTO[el.tipo].forma === 'circulo') positivo(`${ruta}.diametro`, el.diametro, 100);
      else { positivo(`${ruta}.ancho`, el.ancho, 1000); positivo(`${ruta}.largo`, el.largo, 1000); }
    });
  }
  return errores;
}

/** Completa el terreno de un proyecto (los de antes de v1.32 no lo tienen: quedan sin terreno). */
export function completarTerreno(t) {
  if (!t || typeof t !== 'object') return structuredClone(TERRENO_INICIAL);
  return {
    ...structuredClone(TERRENO_INICIAL), ...t,
    retiros: { ...TERRENO_INICIAL.retiros, ...(t.retiros ?? {}) },
    elementos: Array.isArray(t.elementos) ? t.elementos : [],
  };
}

/**
 * Filas del resumen de la obra (PDF y Excel) con el terreno (v1.32). Vacío si la obra no tiene terreno.
 * @returns {Array<[string, string]>}
 */
export function resumenDeTerreno(params) {
  const t = params.terreno;
  if (!t?.activo || params.tipoProyecto !== 'construccion') return [];
  const imp = implantacion(params);
  const d = imp.distancias;
  const filas = [
    ['Terreno', `lote ${m(t.frente)} x ${m(t.fondo)} · la calle está hacia el ${rumboDe(t.orientacion)} (${t.orientacion}°)`],
    ['Ubicación de la casa', `${m(d.frente)} de la línea municipal · ${m(d.izquierda)} al lateral izq. · ${m(d.derecha)} al lateral der. · ${m(d.fondo)} al fondo`],
  ];
  const retiros = ['frente', 'fondo', 'izquierda', 'derecha'].filter((l) => t.retiros[l] > 0).map((l) => `${l} ${m(t.retiros[l])}`);
  if (retiros.length) filas.push(['Retiros', retiros.join(' · ')]);
  if (imp.elementos.length) {
    filas.push(['En el terreno', imp.elementos.map((el) => {
      const medida = el.forma === 'circulo' ? `ø ${m(el.diametro)}` : `${m(el.ancho)} x ${m(el.largo)}`;
      const pozo = imp.pozos.find((p) => p.id === el.id);
      return `${el.nombre} (${medida}${el.alto > 0 ? `, ${m(el.alto)} de alto` : ''}${pozo ? `, a ${m(pozo.aCasa)} de la casa` : ''})`;
    }).join(' · ')]);
  }
  if (imp.avisos.length) filas.push(['Avisos del terreno', imp.avisos.map((a) => a.texto).join(' ')]);
  return filas;
}
