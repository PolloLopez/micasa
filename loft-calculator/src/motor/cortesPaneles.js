// ==========================================================
// CORTES DE LOS PANELES (v1.63)
// ----------------------------------------------------------
// Pedido de Leandro (16/11): "necesito los tamaños y cortes de los paneles"
// y "voy a posicionar las ventanas en base a los paneles para tener menos
// recortes". Para los revestimientos A MEDIDA (panel PUR):
//
//   1. La lista de tiras de cada pared, de izquierda a derecha (vista desde
//      afuera): ancho, largo a pedir y qué hay que cortarle (a lo ancho la
//      última, inclinado arriba si la pared tiene pendiente, el hueco de
//      una abertura que la toma en parte), con lo que se tira.
//   2. Retazos: la última tira de una pared casi nunca va entera a lo
//      ancho (7,50 m con tiras de 1 m: la última es de 0,50 m). Lo que
//      sobra de su ancho alcanza para la última de otra pared si no es más
//      alta: se corta a lo largo de la misma tira y se compra una menos.
//   3. Ventanas: para cada abertura, cuánto correrla para que sus bordes
//      caigan en una junta y cuánto se ahorra (una tira que queda entera
//      dentro del hueco se pide en dos pedazos más cortos).
// Las cuentas de compra siguen en revestimientos.js (tirasDePano).
// ==========================================================

import { pedazosDeTira, cortarEnTramos, tirasDePano, REVESTIMIENTO_POR_DEFECTO } from './revestimientos.js';

const EPS = 1e-6;
const m2 = (n) => n.toFixed(2).replace('.', ',');
const altoEn = (pano, x) => pano.h1 + ((pano.h2 - pano.h1) * x) / pano.largo;
/** Lo que un hueco tapa de la franja [x0, x1] (ancho y alto), o null si no la toca. */
function tapa(h, x0, x1, alto) {
  const desde = Math.max(x0, h.desde);
  const hasta = Math.min(x1, h.hasta);
  const abajo = Math.max(0, h.abajo);
  const arriba = Math.min(alto, h.arriba);
  return hasta - desde > EPS && arriba - abajo > EPS ? { desde, hasta, abajo, arriba } : null;
}

/**
 * Las tiras de un paño con sus tamaños y cortes.
 * @param pano { largo, h1, h2, huecos, donde }
 * @returns {{ tiras: { n, x0, ancho, alto, pedidos: number[], cortes: string[], usado, comprado, desperdicio }[], comprado, usado, desperdicio }}
 *   usado / comprado / desperdicio en m²
 */
export function cortesDeTiras(pano, tipo) {
  const t = { ...REVESTIMIENTO_POR_DEFECTO, ...tipo };
  const u = t.anchoUtil;
  const cantidad = Math.max(1, Math.ceil(pano.largo / u - EPS));
  const tiras = [];
  for (let i = 0; i < cantidad; i++) {
    const x0 = i * u;
    const x1 = Math.min(pano.largo, (i + 1) * u);
    const ancho = x1 - x0;
    const [a0, a1] = [altoEn(pano, x0), altoEn(pano, x1)];
    const alto = Math.max(a0, a1);
    const pedidos = pedazosDeTira(x0, x1, alto, pano.huecos ?? []).flatMap((p) => cortarEnTramos(p, t.largoMaximo, t.solape));
    const cortes = [];
    if (ancho < u - 0.005) cortes.push(`cortar a lo largo: queda de ${m2(ancho)} m de ancho`);
    if (Math.abs(a0 - a1) > 0.005) cortes.push(`corte inclinado arriba: de ${m2(a0)} a ${m2(a1)} m`);
    const entera = (h) => h.desde <= x0 + EPS && h.hasta >= x1 - EPS; // la tapa a lo ancho: ya va en pedazos
    let huecos = 0;
    (pano.huecos ?? []).forEach((h) => {
      const r = tapa(h, x0, x1, alto);
      if (!r) return;
      huecos += (r.hasta - r.desde) * (r.arriba - r.abajo);
      if (!entera(h)) {
        cortes.push(`recortar ${m2(r.hasta - r.desde)} × ${m2(r.arriba - r.abajo)} m (a ${m2(r.desde - x0)} m de su borde izquierdo, de ${m2(r.abajo)} a ${m2(r.arriba)} m del piso)`);
      }
    });
    const usado = Math.max(0, (ancho * (a0 + a1)) / 2 - huecos);
    const comprado = pedidos.reduce((a, l) => a + l, 0) * u;
    tiras.push({ n: i + 1, x0, ancho, alto, pedidos, cortes, usado, comprado, desperdicio: Math.max(0, comprado - usado) });
  }
  const suma = (k) => tiras.reduce((a, x) => a + x[k], 0);
  return { tiras, comprado: suma('comprado'), usado: suma('usado'), desperdicio: suma('desperdicio') };
}

/**
 * Retazos entre paredes: la tira angosta de una pared sale de lo que sobra a lo ancho de la angosta de otra (si no
 * es más alta). Primero las más altas (sus retazos sirven para más).
 * @param panos [{ largo, h1, h2, huecos, donde }] del mismo tipo de panel
 * @returns {{ reusos: { para, de, ancho, alto }[], ahorroPedidos: number[], ahorroM2 }}
 *   ahorroPedidos: los largos que no hace falta comprar (salen de un retazo)
 */
export function retazosEntreParedes(panos, tipo) {
  const t = { ...REVESTIMIENTO_POR_DEFECTO, ...tipo };
  const u = t.anchoUtil;
  const angostas = panos.flatMap((p) => cortesDeTiras(p, t).tiras
    .filter((x) => x.ancho < u - 0.005 && x.pedidos.length === 1) // una sola pieza (sin aberturas que la partan)
    .map((x) => ({ ...x, donde: p.donde ?? '' })))
    .sort((a, b) => b.alto - a.alto);
  const sobrantes = []; // { ancho, alto, de }
  const reusos = [];
  const ahorroPedidos = [];
  angostas.forEach((x) => {
    // El retazo más chico que alcanza (para no gastar uno grande en una tira chica).
    const sirven = sobrantes.filter((s) => s.ancho >= x.ancho - EPS && s.alto >= x.alto - EPS).sort((a, b) => a.ancho * a.alto - b.ancho * b.alto);
    if (sirven.length > 0) {
      const s = sirven[0];
      reusos.push({ para: `${x.donde}, tira ${x.n}`, de: s.de, ancho: x.ancho, alto: x.alto });
      ahorroPedidos.push(...x.pedidos);
      s.ancho -= x.ancho; // lo que queda del retazo, por si sirve para otra
    } else {
      sobrantes.push({ ancho: u - x.ancho, alto: x.alto, de: `${x.donde}, tira ${x.n}` });
    }
  });
  return { reusos, ahorroPedidos, ahorroM2: ahorroPedidos.reduce((a, l) => a + l, 0) * u };
}

/**
 * Cuánto correr una abertura para que sus bordes caigan en las juntas de los paneles, y cuánto se ahorra.
 * Prueba que su borde izquierdo o el derecho quede en cada junta cercana (hasta media tira para cada lado).
 * @param pano    la pared (con todos sus huecos)
 * @param indice  cuál de los huecos es la abertura
 * @returns {{ correr, ahorroM2, actualM2, mejorM2 } | null}  correr: m (+ = a la derecha vista desde afuera); null si ya está bien
 */
export function sugerenciaParaAbertura(pano, indice, tipo) {
  const t = { ...REVESTIMIENTO_POR_DEFECTO, ...tipo };
  if (t.venta === 'estandar') return null;
  const u = t.anchoUtil;
  const h = pano.huecos[indice];
  if (!h) return null;
  const m2De = (huecos) => tirasDePano({ ...pano, huecos }, t).reduce((a, l) => a + l, 0) * u;
  const actual = m2De(pano.huecos);
  const ancho = h.hasta - h.desde;
  const candidatos = [];
  for (let k = Math.floor((h.desde - u) / u); k <= Math.ceil((h.hasta + u) / u); k++) {
    const junta = k * u;
    candidatos.push(junta - h.desde, junta - h.hasta); // el borde izquierdo o el derecho en la junta
  }
  let mejor = { correr: 0, m2: actual };
  candidatos.filter((d) => Math.abs(d) <= u / 2 + EPS && Math.abs(d) > 0.005).forEach((d) => {
    const nuevo = { ...h, desde: h.desde + d, hasta: h.hasta + d };
    if (nuevo.desde < -EPS || nuevo.hasta > pano.largo + EPS) return; // se saldría de la pared
    const otros = pano.huecos.map((x, i) => (i === indice ? nuevo : x));
    if (otros.some((x, i) => i !== indice && x.desde < nuevo.hasta - EPS && x.hasta > nuevo.desde + EPS)) return; // se pisaría con otra
    const m = m2De(otros);
    if (m < mejor.m2 - 0.005 || (Math.abs(m - mejor.m2) <= 0.005 && Math.abs(d) < Math.abs(mejor.correr) && mejor.correr !== 0)) mejor = { correr: d, m2: m };
  });
  if (mejor.correr === 0 || actual - mejor.m2 < 0.005) return null;
  return { correr: Number(mejor.correr.toFixed(3)), ahorroM2: actual - mejor.m2, actualM2: actual, mejorM2: mejor.m2, ancho };
}

/**
 * La sugerencia de cada abertura de la obra (las de las paredes con panel a medida), por id. Las "a futuro" no
 * (la pared va entera). Los huecos de cada pared están en el mismo orden que sus aberturas (sin las a futuro).
 * @returns {{ [idAbertura]: sugerencia }}
 */
export function sugerenciasDeAberturas(estructura, aberturas, catalogo) {
  const resultado = {};
  (estructura?.paredes ?? []).forEach((pared) => {
    const tipo = catalogo.find((i) => i.id === pared.panel);
    if (!tipo) return;
    const pano = { largo: pared.largo, h1: pared.alturas[0], h2: pared.alturas[1], huecos: pared.huecos ?? [] };
    aberturas.filter((op) => op.lado === pared.lado && !op.futura).forEach((op, i) => {
      const s = sugerenciaParaAbertura(pano, i, tipo);
      if (s) resultado[op.id] = s;
    });
  });
  return resultado;
}
