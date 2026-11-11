// ==========================================================
// RECORRIDO (v1.45): por dónde pueden caminar las personas del 3D
// ----------------------------------------------------------
// Pedido de Leandro (11/11): personas "como en Los Sims" que caminan por la
// casa y se agachan a buscar cosas, y poder recorrerla en primera persona.
// Acá está solo la cuenta (sin Three.js, así se puede testear):
//   mapaDelNivel   una grilla de 10 cm de la planta de un nivel con las
//                  celdas libres (sin paredes, muebles, mesadas, tabiques
//                  ni escalera), agrandando cada cosa lo que mide el cuerpo
//   buscarCamino   el camino más corto entre dos puntos (A*, en 8 sentidos)
//                  y simplificado (solo los puntos donde dobla)
//   moverConChoque un paso con el teclado: si choca, se desliza por la pared
//   accionPorAltura qué hace al llegar según dónde está lo que busca
//   ladosQueTapan  qué paredes quedan entre la cámara y la casa (se ocultan)
// ==========================================================

import { geometriaLados, tramoEntrepiso } from './geometria.js';
import { haciaAdentro } from './segmentos.js';
import { LADOS } from './constantes.js';
import { obstaculosDelNivel, alturaDelPiso } from './interiores.js';
import { listarPiezas } from './estructura.js';

export const TAMANIO_CELDA = 0.1; // 10 cm
// v1.47.1: 15 cm (antes 20): con 20 no se pasaba entre el vanitory y el tabique de un baño chico (44 cm libres);
// de costado, una persona pasa por ahí.
export const RADIO_CUERPO = 0.15;
const MEDIA_PARED = 0.06;
const ALTO_QUE_TAPA = 1.2; // lo que arranca más arriba (una alacena colgada) no corta el paso
const ALTO_QUE_SE_PISA = 0.15; // v1.47.1: lo más bajo (un plato de ducha) se pisa: no corta el paso
const ESPESOR_BAJO_ESCALON = 0.06; // la tabla y el apoyo: lo que baja el escalón desde su pisada
const AGACHADA = 0.8; // agachándose, una persona pasa por donde queda libre el 80 % de su altura

/** ¿El punto cae sobre el entrepiso? (a lo largo de su pared y hacia adentro, como lo arma la estructura) */
function sobreElEntrepiso(params, [x, z]) {
  if (!(params.anchoEntrepiso > 0)) return false;
  const geo = geometriaLados(params)[params.ladoEntrepiso];
  const { inicio, largo } = tramoEntrepiso(params);
  const v = haciaAdentro(geo);
  const dx = x - geo.p1[0];
  const dz = z - geo.p1[1];
  const a = dx * geo.direccion[0] + dz * geo.direccion[1];
  const b = dx * v[0] + dz * v[1];
  return a > inicio && a < inicio + largo && b > 0 && b < params.anchoEntrepiso;
}

/** ¿El punto cae dentro del rectángulo agrandado `extra` para cada lado? */
const dentroDe = (r, [x, z], extra) => {
  const d = [x - r.centro[0], z - r.centro[1]];
  return Math.abs(d[0] * r.u[0] + d[1] * r.u[1]) < r.mu + extra && Math.abs(d[0] * r.v[0] + d[1] * r.v[1]) < r.mv + extra;
};

/**
 * Grilla de la planta de un nivel: `libre[i][k]` dice si una persona puede pararse con su centro en esa celda.
 * @param estructura  (opcional) para la escalera y las columnas del entrepiso
 * @returns {{ x0, z0, columnas, filas, libre: boolean[][], nivel, y }}
 */
/**
 * @param opciones.radio  medio ancho del cuerpo (lo que se agranda cada obstáculo)
 * @param opciones.altoPersona  la persona más alta de ese piso: por debajo de la escalera pasa si no se golpea la cabeza
 */
export function mapaDelNivel(params, nivel = 'piso', estructura = null, { radio = RADIO_CUERPO, altoPersona = 1.75 } = {}) {
  const { largo, ancho } = params;
  const borde = MEDIA_PARED + radio; // de la cara de adentro de la pared, el cuerpo
  const x0 = -largo / 2;
  const z0 = -ancho / 2;
  const columnas = Math.max(1, Math.round(largo / TAMANIO_CELDA));
  const filas = Math.max(1, Math.round(ancho / TAMANIO_CELDA));
  const obstaculos = obstaculosDelNivel(params, nivel, { huecoPuertas: true })
    .filter((o) => o.y0 < ALTO_QUE_TAPA && o.y1 > ALTO_QUE_SE_PISA);
  // La escalera: en planta baja no se pasa por debajo de los escalones bajos; en el piso 2, no se cae por el hueco.
  const escalones = [...(estructura?.escalera?.escalones ?? []), ...(estructura?.escalera?.descansos ?? [])].map((s) => {
    const f = s.direccion; // a lo largo del tramo
    return { centro: [s.centro[0], s.centro[2]], u: [f[1], -f[0]], v: f, mu: s.ancho / 2, mv: (s.huella ?? s.lado) / 2, y: s.centro[1] };
  });
  const yPiso = alturaDelPiso(params, nivel);
  // v1.47.1: por debajo de la escalera se pasa (agachándose un poco) donde el escalón queda a más del 80 % de la
  // altura de la persona; antes se cortaba todo lo que estaba debajo de 2 m. `techo` guarda lo libre arriba.
  const libreDebajo = (s) => s.y - ESPESOR_BAJO_ESCALON - yPiso;
  const conEscalera = nivel === 'piso' ? escalones : [];
  const tapanEscalones = conEscalera.filter((s) => libreDebajo(s) < AGACHADA * altoPersona);
  const bajos = conEscalera.filter((s) => libreDebajo(s) >= AGACHADA * altoPersona && libreDebajo(s) < altoPersona + 0.03);
  // Columnas sueltas (las del entrepiso o la escalera): piezas verticales que no son de las paredes ni de mesadas.
  const columnasSueltas = nivel === 'piso' && estructura
    ? listarPiezas(estructura).filter((p) => Math.hypot(p.hasta[0] - p.desde[0], p.hasta[2] - p.desde[2]) < 0.02
        && Math.abs(p.hasta[1] - p.desde[1]) > 1 && !p.nivel && !(p.grupos ?? []).every((g) => LADOS.includes(g)))
      .map((p) => ({ centro: [p.desde[0], p.desde[2]], u: [1, 0], v: [0, 1], mu: 0.06, mv: 0.06 }))
    : [];
  const libre = [];
  const techo = []; // lo libre arriba de cada celda (Infinity = nada encima que moleste)
  for (let i = 0; i < columnas; i++) {
    libre.push([]);
    techo.push([]);
    for (let k = 0; k < filas; k++) {
      const q = [x0 + (i + 0.5) * TAMANIO_CELDA, z0 + (k + 0.5) * TAMANIO_CELDA];
      const adentro = q[0] > x0 + borde && q[0] < -x0 - borde && q[1] > z0 + borde && q[1] < -z0 - borde;
      const piso = nivel === 'piso2' ? sobreElEntrepiso(params, q) && esBordeLibre(params, q, radio) : true;
      libre[i].push(adentro && piso
        && !obstaculos.some((o) => dentroDe(o, q, radio))
        && !tapanEscalones.some((s) => dentroDe(s, q, radio))
        && !columnasSueltas.some((c) => dentroDe(c, q, radio)));
      techo[i].push(Math.min(Infinity, ...bajos.filter((s) => dentroDe(s, q, 0.05)).map(libreDebajo)));
    }
  }
  return { x0, z0, columnas, filas, libre, techo, nivel, y: yPiso };
}

/** En el piso 2, que todo el cuerpo quede arriba del entrepiso (no se asome al borde). */
function esBordeLibre(params, [x, z], radio) {
  return [[radio, 0], [-radio, 0], [0, radio], [0, -radio]].every(([dx, dz]) => sobreElEntrepiso(params, [x + dx, z + dz]));
}

/** Celda de un punto (puede caer afuera de la grilla). */
export const celdaDe = (mapa, [x, z]) => [Math.floor((x - mapa.x0) / TAMANIO_CELDA), Math.floor((z - mapa.z0) / TAMANIO_CELDA)];
const centroDe = (mapa, [i, k]) => [mapa.x0 + (i + 0.5) * TAMANIO_CELDA, mapa.z0 + (k + 0.5) * TAMANIO_CELDA];
const esLibre = (mapa, [i, k]) => i >= 0 && k >= 0 && i < mapa.columnas && k < mapa.filas && mapa.libre[i][k];

/** Lo libre arriba de un punto (debajo de la escalera); Infinity si no hay nada encima. */
export function techoEn(mapa, q) {
  const [i, k] = celdaDe(mapa, q);
  return mapa.techo?.[i]?.[k] ?? Infinity;
}

/** ¿Se puede estar parado en este punto? */
export const puntoLibre = (mapa, q) => esLibre(mapa, celdaDe(mapa, q));

/** La celda libre más cercana a un punto (buscando en anillos cada vez más grandes); null si no hay ninguna. */
export function libreMasCercano(mapa, q) {
  const [ci, ck] = celdaDe(mapa, q);
  if (esLibre(mapa, [ci, ck])) return [ci, ck];
  const maximo = Math.max(mapa.columnas, mapa.filas);
  for (let r = 1; r <= maximo; r++) {
    let mejor = null;
    let distMejor = Infinity;
    for (let i = ci - r; i <= ci + r; i++) {
      for (let k = ck - r; k <= ck + r; k++) {
        if (Math.max(Math.abs(i - ci), Math.abs(k - ck)) !== r || !esLibre(mapa, [i, k])) continue;
        const d = Math.hypot(i - ci, k - ck);
        if (d < distMejor) { distMejor = d; mejor = [i, k]; }
      }
    }
    if (mejor) return mejor;
  }
  return null;
}

/** ¿Se ve una celda desde la otra sin pasar por celdas ocupadas? (para sacar los puntos de más del camino) */
function hayLineaLibre(mapa, a, b) {
  const pasos = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * 3) + 1;
  for (let j = 0; j <= pasos; j++) {
    const t = j / pasos;
    if (!puntoLibre(mapa, [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t])) return false;
  }
  return true;
}

/**
 * Camino más corto de `desde` a `hasta` (puntos [x, z] en metros). Si `hasta` está ocupado (adentro de un mueble),
 * va a lo libre más cercano. Devuelve los puntos por donde pasa (sin `desde`), o [] si no se puede llegar.
 */
export function buscarCamino(mapa, desde, hasta) {
  const inicio = libreMasCercano(mapa, desde);
  const fin = libreMasCercano(mapa, hasta);
  if (!inicio || !fin) return [];
  const clave = ([i, k]) => i * mapa.filas + k;
  const estimar = ([i, k]) => Math.hypot(i - fin[0], k - fin[1]);
  const costo = new Map([[clave(inicio), 0]]);
  const vieneDe = new Map();
  const abiertos = [{ celda: inicio, f: estimar(inicio) }];
  const vecinos = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  let encontrado = false;
  while (abiertos.length > 0) {
    // La grilla es chica (una casa: unos miles de celdas): alcanza con buscar el menor en la lista.
    let m = 0;
    for (let j = 1; j < abiertos.length; j++) if (abiertos[j].f < abiertos[m].f) m = j;
    const { celda } = abiertos.splice(m, 1)[0];
    if (celda[0] === fin[0] && celda[1] === fin[1]) { encontrado = true; break; }
    const g = costo.get(clave(celda));
    vecinos.forEach(([di, dk]) => {
      const otra = [celda[0] + di, celda[1] + dk];
      if (!esLibre(mapa, otra)) return;
      // En diagonal, sin cortar la esquina de un obstáculo.
      if (di !== 0 && dk !== 0 && (!esLibre(mapa, [celda[0] + di, celda[1]]) || !esLibre(mapa, [celda[0], celda[1] + dk]))) return;
      const nuevo = g + (di !== 0 && dk !== 0 ? Math.SQRT2 : 1);
      if (nuevo < (costo.get(clave(otra)) ?? Infinity)) {
        costo.set(clave(otra), nuevo);
        vieneDe.set(clave(otra), celda);
        abiertos.push({ celda: otra, f: nuevo + estimar(otra) });
      }
    });
  }
  if (!encontrado) return [];
  const celdas = [fin];
  while (clave(celdas[0]) !== clave(inicio)) celdas.unshift(vieneDe.get(clave(celdas[0])));
  const puntos = celdas.map((c) => centroDe(mapa, c));
  // Si el destino es libre, se llega justo ahí (no al centro de su celda).
  if (puntoLibre(mapa, hasta)) puntos[puntos.length - 1] = [...hasta];
  // Simplificar: desde cada punto, saltar al más lejano que se vea en línea recta.
  const simple = [];
  let actual = desde;
  let j = 0;
  while (j < puntos.length) {
    let salto = j;
    for (let n = puntos.length - 1; n > j; n--) if (hayLineaLibre(mapa, actual, puntos[n])) { salto = n; break; }
    simple.push(puntos[salto]);
    actual = puntos[salto];
    j = salto + 1;
  }
  return simple;
}

/** Un paso con el teclado: avanza si se puede; si no, se desliza solo en x o solo en z (como contra una pared). */
export function moverConChoque(mapa, [x, z], [dx, dz]) {
  if (puntoLibre(mapa, [x + dx, z + dz])) return [x + dx, z + dz];
  if (dx !== 0 && puntoLibre(mapa, [x + dx, z])) return [x + dx, z];
  if (dz !== 0 && puntoLibre(mapa, [x, z + dz])) return [x, z + dz];
  return [x, z];
}

/**
 * Qué hace la persona al llegar a lo que tocaste, según a qué altura (desde su piso) está:
 * abajo se agacha, a la altura del pecho estira el brazo y arriba se estira. En el piso, nada (solo camina).
 * @param altoPersona  una persona alta llega más arriba sin estirarse
 */
export function accionPorAltura(altura, altoPersona = 1.7) {
  if (altura < 0.05) return null;
  if (altura < 0.33 * altoPersona) return 'agacharse';
  if (altura > 0.92 * altoPersona) return 'estirarse';
  return 'alcanzar';
}

/**
 * v1.45: qué paredes quedan entre la cámara y la casa (como en Los Sims, se ocultan para ver adentro).
 * Una pared tapa si la cámara está del lado de afuera. El techo tapa si la cámara está más alta que la pared más baja.
 * @param camara [x, y, z]
 * @returns {Set<string>} lados ('A'…'D') y 'techo'
 */
export function ladosQueTapan(params, [x, y, z]) {
  const lados = geometriaLados(params);
  const tapan = new Set();
  LADOS.forEach((lado) => {
    const geo = lados[lado];
    const medio = [(geo.p1[0] + geo.p2[0]) / 2, (geo.p1[1] + geo.p2[1]) / 2];
    const afuera = [-geo.direccion[1], geo.direccion[0]];
    if ((x - medio[0]) * afuera[0] + (z - medio[1]) * afuera[1] > 0.2) tapan.add(lado);
  });
  const paredMasBaja = (params.elevacion ?? 0) + params.altura; // `altura` es la del lado bajo del techo
  // v1.47.1: también mirando desde arriba de todo (antes, justo encima de la casa el techo no se ocultaba).
  if (y > paredMasBaja) tapan.add('techo');
  return tapan;
}
