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

import { pedazosDeTira, cortarEnTramos, tirasDePano, intervalosDeTira, rellenosDeTira, parteLaTira, franjasDeTiras, costadoEfectivo, REVESTIMIENTO_POR_DEFECTO } from './revestimientos.js';

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
  const costado = costadoEfectivo(t); // v1.68: por revestimiento; v1.71: sin descontar aberturas, nunca se parte
  const tiras = [];
  franjasDeTiras(pano.largo, t).forEach(({ x0, x1 }, i) => { // v1.68: la angosta donde se eligió
    const ancho = x1 - x0;
    const [a0, a1] = [altoEn(pano, x0), altoEn(pano, x1)];
    const alto = Math.max(a0, a1);
    const pedidos = pedazosDeTira(x0, x1, alto, pano.huecos ?? [], costado).flatMap((p) => cortarEnTramos(p, t.largoMaximo, t.solape));
    const cortes = [];
    if (ancho < u - 0.005) cortes.push(`cortar a lo largo: queda de ${m2(ancho)} m de ancho`);
    if (Math.abs(a0 - a1) > 0.005) cortes.push(`corte inclinado arriba: de ${m2(a0)} a ${m2(a1)} m`);
    // La que la parte (de lado a lado, o dejándole un costado de menos de 30 cm, v1.67): ya va en pedazos.
    const entera = (h) => parteLaTira(h, x0, x1, costado);
    if ((pano.huecos ?? []).some((h) => entera(h) && tapa(h, x0, x1, alto))) {
      // v1.68: una puerta que la parte deja solo el pedazo de arriba.
      cortes.push(pedidos.length > 1 ? `va en ${pedidos.length} pedazos (abajo y arriba de la abertura)` : 'va solo arriba de la abertura');
    }
    const rellenos = rellenosDeTira(x0, x1, alto, pano.huecos ?? [], costado);
    rellenos.forEach((r) => cortes.push(`relleno al costado ${r.lado} de la abertura: ${m2(r.ancho)} × ${m2(r.arriba - r.abajo)} m`));
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
    tiras.push({ n: i + 1, x0, ancho, alto, a0, a1, pedidos, cortes, rellenos, usado, comprado, desperdicio: Math.max(0, comprado - usado) });
  });
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
  // v1.68: lo que quedó de los retazos (sirve para los rellenos al costado de las aberturas).
  return { reusos, ahorroPedidos, ahorroM2: ahorroPedidos.reduce((a, l) => a + l, 0) * u, sobrantes: sobrantes.filter((s) => s.ancho > 0.01) };
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
  if (t.venta === 'estandar' || t.descontarAberturas === false) return null; // v1.71: tiras enteras: correrla no ahorra
  const u = t.anchoUtil;
  const h = pano.huecos[indice];
  if (!h) return null;
  const m2De = (huecos) => tirasDePano({ ...pano, huecos }, t).reduce((a, l) => a + l, 0) * u;
  const actual = m2De(pano.huecos);
  const ancho = h.hasta - h.desde;
  const candidatos = [];
  // v1.68: las juntas según el reparto de las tiras (y las dos puntas de la pared).
  const juntas = [...franjasDeTiras(pano.largo, t).map((f) => f.x0), pano.largo];
  juntas.forEach((junta) => candidatos.push(junta - h.desde, junta - h.hasta)); // el borde izquierdo o el derecho en la junta
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

/**
 * v1.65 (Leandro: "no estoy pudiendo seleccionar los paneles"): qué tira (o placa) hay en un punto de
 * la pared tocado en el 3D.
 * @param pano  { largo, h1, h2, huecos }
 * @param x     distancia desde la esquina izquierda de la pared (vista desde afuera), en m
 * @param h     altura desde abajo de la pared, en m
 * @returns {{ n, total, x0, ancho, alto, pedidos, cortes, desperdicio } | { placa: true, fila, columna, filas, columnas, x0, y0, ancho, alto } | null}
 */
export function tiraEnPunto(pano, tipo, x, h) {
  const t = { ...REVESTIMIENTO_POR_DEFECTO, ...tipo };
  if (x < -EPS || x > pano.largo + EPS) return null;
  if (t.venta === 'estandar') {
    // Placa fija: una grilla de placas desde abajo a la izquierda.
    const alto = Math.max(pano.h1, pano.h2);
    const columnas = Math.max(1, Math.ceil(pano.largo / t.anchoPlaca - EPS));
    const filas = Math.max(1, Math.ceil(alto / t.largoPlaca - EPS));
    const columna = Math.min(columnas - 1, Math.max(0, Math.floor(x / t.anchoPlaca)));
    const fila = Math.min(filas - 1, Math.max(0, Math.floor(h / t.largoPlaca)));
    const x0 = columna * t.anchoPlaca;
    const y0 = fila * t.largoPlaca;
    return { placa: true, fila: fila + 1, columna: columna + 1, filas, columnas, x0, y0,
      ancho: Math.min(t.anchoPlaca, pano.largo - x0), alto: Math.min(t.largoPlaca, alto - y0) };
  }
  const { tiras } = cortesDeTiras(pano, t);
  const tira = tiras.find((s) => x >= s.x0 - EPS && x <= s.x0 + s.ancho + EPS);
  return tira ? { ...tira, total: tiras.length } : null;
}

/**
 * v1.67 (Leandro: "me falta el plano de cada panel, con sus medidas e indicación de qué lado es el que superpone"):
 * cada pedazo que se pide de una tira, con su forma para dibujarlo: el rectángulo (ancho × largo), el corte
 * inclinado de arriba, los recortes de las aberturas y el lado que superpone sobre la tira de al lado.
 * Coordenadas del pedazo: x de 0 a su ancho (de izquierda a derecha vista desde afuera), y de 0 (abajo) a su largo.
 * @param tira  una de cortesDeTiras(pano, tipo).tiras
 * @returns {{ nombre, ancho, largo, desde, arriba: [izq, der], recortes: {x0, x1, y0, y1}[], superpone }[]}
 *   desde: a qué altura de la pared arranca; arriba: alto del borde de arriba en cada costado (inclinado o no)
 */
export function pedazosDeLaTira(pano, tipo, tira) {
  const t = { ...REVESTIMIENTO_POR_DEFECTO, ...tipo };
  const x1 = tira.x0 + tira.ancho;
  const huecos = pano.huecos ?? [];
  const superpone = t.ladoSolape === 'derecha' ? 'derecha' : 'izquierda';
  const intervalos = intervalosDeTira(tira.x0, x1, tira.alto, huecos, costadoEfectivo(t));
  const pedazos = [];
  intervalos.forEach((iv, k) => {
    // Si pasa el largo máximo, en tramos encimados (como cortarEnTramos).
    const largos = cortarEnTramos(iv.y1 - iv.y0, t.largoMaximo, t.solape);
    let y = iv.y0;
    largos.forEach((largo, j) => {
      const y0 = y;
      const y1 = Math.min(iv.y1, y0 + largo);
      const ultimoDeArriba = k === intervalos.length - 1 && j === largos.length - 1;
      // El borde de arriba: inclinado solo en el pedazo de más arriba (el de la pared con pendiente).
      const arriba = ultimoDeArriba ? [Math.min(y1, tira.a0 ?? y1) - y0, Math.min(y1, tira.a1 ?? y1) - y0] : [y1 - y0, y1 - y0];
      const recortes = huecos.filter((h) => !parteLaTira(h, tira.x0, x1, costadoEfectivo(t))).map((h) => ({
        x0: Math.max(h.desde, tira.x0) - tira.x0, x1: Math.min(h.hasta, x1) - tira.x0,
        y0: Math.max(h.abajo, y0) - y0, y1: Math.min(h.arriba, y1) - y0,
      })).filter((r) => r.x1 - r.x0 > EPS && r.y1 - r.y0 > EPS);
      const cuantos = intervalos.length > 1 ? (k === 0 ? ' · abajo' : k === intervalos.length - 1 ? ' · arriba' : ` · pedazo ${k + 1}`) : '';
      const tramo = largos.length > 1 ? ` · tramo ${j + 1}` : '';
      pedazos.push({ nombre: `Tira ${tira.n}${cuantos}${tramo}`, ancho: tira.ancho, largo, desde: y0, arriba, recortes, superpone,
        cortadaALoLargo: tira.ancho < t.anchoUtil - 0.005 });
      y = y0 + largo - t.solape;
    });
  });
  return pedazos;
}

/**
 * v1.68 (Leandro: "rellenos de recortes"): de dónde sale cada relleno (el costado angosto al lado de una abertura
 * que parte una tira). Primero de lo que se RECORTA de otras tiras (el hueco de una ventana que toma una tira en
 * parte es un pedazo de panel que sobra) y de lo que quedó de las tiras angostas; si no alcanza, se compra.
 * Cada relleno toma el pedazo más chico donde entra (mismo sentido: el largo del panel, para arriba).
 * @param panos     [{ largo, h1, h2, huecos, donde }] del mismo revestimiento
 * @param sobrantes [{ ancho, alto, de }] lo que quedó de los retazos (retazosEntreParedes)
 * @returns {{ rellenos: { para, ancho, alto, de: string|null }[], comprar: number[] }}
 *   de = de dónde sale (null: se compra); comprar = largos de tira a pedir para los que no salen de un recorte
 */
export function rellenosDeLaObra(panos, tipo, sobrantes = []) {
  const t = { ...REVESTIMIENTO_POR_DEFECTO, ...tipo };
  const fuentes = sobrantes.map((s) => ({ ...s }));
  const pedidos = [];
  panos.forEach((pano) => {
    const donde = pano.donde ?? '';
    cortesDeTiras(pano, t).tiras.forEach((tira) => {
      const x1 = tira.x0 + tira.ancho;
      (pano.huecos ?? []).filter((h) => !parteLaTira(h, tira.x0, x1, costadoEfectivo(t))).forEach((h) => {
        const r = tapa(h, tira.x0, x1, tira.alto);
        if (r) fuentes.push({ ancho: r.hasta - r.desde, alto: r.arriba - r.abajo, de: `recorte de ${donde}, tira ${tira.n}` });
      });
      (tira.rellenos ?? []).forEach((r) => pedidos.push({ para: `${donde}, tira ${tira.n} (costado ${r.lado})`, ancho: r.ancho, alto: r.arriba - r.abajo }));
    });
  });
  // Los más grandes primero (son los que menos opciones tienen).
  pedidos.sort((a, b) => b.ancho * b.alto - a.ancho * a.alto);
  const sinFuente = [];
  const rellenos = pedidos.map((p) => {
    const f = fuentes.filter((s) => s.ancho >= p.ancho - EPS && s.alto >= p.alto - EPS).sort((a, b) => a.ancho * a.alto - b.ancho * b.alto)[0];
    if (!f) { sinFuente.push(p); return { ...p, de: null }; }
    f.ancho -= p.ancho; // lo que queda de ese pedazo (cortado a lo largo)
    return { ...p, de: f.de };
  });
  // Los que no salen de un recorte: se piden pedazos de tira, varios rellenos uno al lado del otro en cada uno.
  const comprar = [];
  let libre = 0;
  [...sinFuente].sort((a, b) => b.alto - a.alto).forEach((p) => {
    if (libre >= p.ancho - EPS) { libre -= p.ancho; return; }
    comprar.push(Number(p.alto.toFixed(4)));
    libre = t.anchoUtil - p.ancho;
  });
  return { rellenos, comprar };
}
