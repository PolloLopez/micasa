// ==========================================================
// REVESTIMIENTOS: cuántos paneles, chapas o placas hay que comprar
// ----------------------------------------------------------
// Cada tipo de revestimiento (renglón "panel" del catálogo) dice
// cómo se vende:
//
//   A MEDIDA  (panel PUR, algunas chapas): tiene un ANCHO ÚTIL fijo y
//             se pide del largo que haga falta, hasta un LARGO MÁXIMO.
//             Por pared: tiras = largo de la pared ÷ ancho útil; cada
//             tira mide el alto de la pared en ese lugar. Si el alto
//             pasa el largo máximo, la tira va en tramos con SOLAPE
//             (0 = a tope).
//
//   ESTÁNDAR  (OSB, fenólico, durlock, chapa de medida fija): placas de
//             ANCHO x LARGO. Por paño se arma la grilla de placas (se
//             prueba parada y acostada y se queda con la que usa menos).
//
// Además cada tipo dice dónde va respecto de la estructura (UBICACIÓN):
//   'cara' = sobre la cara de los perfiles (el exterior por fuera, el
//            interior por dentro): tapa los marcos.
//   'eje'  = embutido entre los perfiles, al eje de la pared.
// Eso solo cambia el dibujo 3D; las cantidades son las mismas.
//
// Un "paño" es una superficie a revestir: { donde, largo, h1, h2, neto, huecos }
//   largo  = a lo largo de la pared (o del techo, paralelo al lado bajo)
//   h1, h2 = alto en cada punta (una pared bajo un techo inclinado es un trapecio)
//   neto   = m² descontando aberturas (solo informativo)
//   huecos = aberturas: [{ desde, hasta, abajo, arriba }] (v1.24)
//
// DESCONTAR ABERTURAS (v1.24), como se hace en obra:
//   - a medida: una tira que cae ENTERA dentro del ancho de una abertura
//     se pide en dos pedazos (abajo del antepecho y arriba del dintel);
//     las que el hueco corta solo en parte se piden enteras y se recortan.
//   - placa fija: una placa que cae ENTERA dentro de un hueco no se compra;
//     las que el hueco corta en parte, sí (se recortan).
// ==========================================================

export const VENTAS = ['medida', 'estandar'];
export const UBICACIONES = ['cara', 'eje'];

/** Valores de arranque de un tipo de revestimiento (también para migrar los viejos). */
export const REVESTIMIENTO_POR_DEFECTO = {
  venta: 'medida',
  anchoUtil: 1, // m (panel PUR típico)
  largoMaximo: 12, // m
  solape: 0, // m (0 = a tope)
  anchoPlaca: 1.22, // m
  largoPlaca: 2.44, // m
  espesor: 50, // mm (para el dibujo)
  ubicacion: 'cara',
};

/** Límites de cada dato (los usa la pantalla y la migración). */
export const LIMITES_REVESTIMIENTO = {
  anchoUtil: { min: 0.1, max: 3 },
  largoMaximo: { min: 0.5, max: 20 },
  solape: { min: 0, max: 1 },
  anchoPlaca: { min: 0.2, max: 3 },
  largoPlaca: { min: 0.2, max: 6 },
  espesor: { min: 1, max: 300 },
};

const EPSILON = 1e-6;
const alCm = (m) => Math.ceil(m * 100 - 1e-6) / 100; // redondeo hacia arriba al cm

/**
 * Parte un largo en tramos de hasta `largoMaximo`, solapando `solape`.
 * Ej.: 7 m con máximo 4 y solape 0,2 => [4, 3.2] (el segundo trae el solape).
 */
export function cortarEnTramos(largo, largoMaximo, solape = 0) {
  if (largo <= largoMaximo + EPSILON) return [alCm(largo)];
  const avance = largoMaximo - solape; // lo que cubre cada tramo menos el último
  const tramos = [];
  let falta = largo;
  while (falta > largoMaximo + EPSILON) {
    tramos.push(largoMaximo);
    falta -= avance;
  }
  tramos.push(alCm(falta));
  return tramos;
}

/** Alto del paño a una distancia `x` desde la punta 1 (interpola h1 -> h2). */
const altoEn = (pano, x) => pano.h1 + ((pano.h2 - pano.h1) * x) / pano.largo;

const PEDAZO_MINIMO = 0.05; // m: un pedazo más chico que esto no se pide

/**
 * Partes de una tira (de x0 a x1, alto `alto`) que hay que pedir: la tira entera,
 * o, si una o más aberturas la tapan de lado a lado, los pedazos entre los huecos.
 * @returns {number[]} alturas de cada pedazo
 */
export function pedazosDeTira(x0, x1, alto, huecos = []) {
  const queLaTapan = huecos
    .filter((h) => h.desde <= x0 + EPSILON && h.hasta >= x1 - EPSILON)
    .sort((a, b) => a.abajo - b.abajo);
  const pedazos = [];
  let desde = 0;
  queLaTapan.forEach((h) => {
    if (h.abajo - desde > PEDAZO_MINIMO) pedazos.push(h.abajo - desde);
    desde = Math.max(desde, h.arriba);
  });
  if (alto - desde > PEDAZO_MINIMO) pedazos.push(alto - desde);
  return pedazos.map((p) => Number(p.toFixed(4)));
}

/**
 * Tiras de un revestimiento a medida en un paño: cada tira toma el alto
 * MAYOR de su tramo (en una pared inclinada se corta en obra).
 * Las que caen enteras sobre una abertura se piden en pedazos (v1.24).
 * @returns {number[]} largos a pedir (ya partidos en tramos si hace falta)
 */
export function tirasDePano(pano, tipo) {
  const cantidad = Math.max(1, Math.ceil(pano.largo / tipo.anchoUtil - EPSILON));
  const largos = [];
  for (let i = 0; i < cantidad; i++) {
    const x0 = i * tipo.anchoUtil;
    const x1 = Math.min(pano.largo, (i + 1) * tipo.anchoUtil);
    const alto = Math.max(altoEn(pano, x0), altoEn(pano, x1));
    pedazosDeTira(x0, x1, alto, pano.huecos).forEach((pedazo) => {
      largos.push(...cortarEnTramos(pedazo, tipo.largoMaximo, tipo.solape));
    });
  }
  return largos;
}

/**
 * Placas estándar de un paño: grilla (columnas x filas) con la placa
 * parada o acostada, la que use menos. Se toma el alto mayor del paño.
 * @returns {{ placas, columnas, filas, parada }}
 */
export function placasDePano(pano, tipo) {
  const alto = Math.max(pano.h1, pano.h2);
  const huecos = pano.huecos ?? [];
  // v1.24: una placa que cae entera dentro de un hueco no se compra.
  const dentroDeUnHueco = (x0, x1, y0, y1) => huecos.some((h) =>
    h.desde <= x0 + EPSILON && h.hasta >= x1 - EPSILON && h.abajo <= y0 + EPSILON && h.arriba >= y1 - EPSILON);
  const grilla = (anchoPlaca, altoPlaca) => {
    const columnas = Math.max(1, Math.ceil(pano.largo / anchoPlaca - EPSILON));
    const filas = Math.max(1, Math.ceil(alto / altoPlaca - EPSILON));
    let placas = 0;
    for (let c = 0; c < columnas; c++) {
      for (let f = 0; f < filas; f++) {
        const x0 = c * anchoPlaca;
        const y0 = f * altoPlaca;
        if (!dentroDeUnHueco(x0, Math.min(pano.largo, x0 + anchoPlaca), y0, Math.min(alto, y0 + altoPlaca))) placas++;
      }
    }
    return { placas, columnas, filas };
  };
  const parada = grilla(tipo.anchoPlaca, tipo.largoPlaca);
  const acostada = grilla(tipo.largoPlaca, tipo.anchoPlaca);
  return acostada.placas < parada.placas ? { ...acostada, parada: false } : { ...parada, parada: true };
}

/** "6 × 4.25 m + 2 × 1.10 m" a partir de una lista de largos (decimales con punto, como el resto de la app). */
export function resumirLargos(largos) {
  const porLargo = new Map();
  largos.forEach((l) => porLargo.set(l.toFixed(2), (porLargo.get(l.toFixed(2)) ?? 0) + 1));
  return [...porLargo.entries()]
    .sort((a, b) => Number(b[0]) - Number(a[0]))
    .map(([largo, n]) => `${n} × ${largo} m`)
    .join(' + ');
}

/**
 * Cuánto comprar de un tipo de revestimiento para todos los paños que lo usan.
 * @returns {{ cantidad, unidad, detalle, piezas, neto }}
 *   a medida: cantidad = m² que se pagan (tiras x ancho útil), piezas = largos de las tiras
 *   estándar: cantidad = placas
 */
export function cuentaRevestimiento(tipo, panos) {
  const t = { ...REVESTIMIENTO_POR_DEFECTO, ...tipo };
  const neto = panos.reduce((acc, p) => acc + p.neto, 0);
  const donde = panos.map((p) => p.donde).join(', ');

  if (t.venta === 'estandar') {
    const placas = panos.reduce((acc, p) => acc + placasDePano(p, t).placas, 0);
    return {
      cantidad: placas,
      unidad: 'placas',
      piezas: [],
      neto,
      detalle: `placas de ${t.anchoPlaca.toFixed(2)} x ${t.largoPlaca.toFixed(2)} m · ${neto.toFixed(2)} m² netos · ${donde}`,
    };
  }

  const piezas = panos.flatMap((p) => tirasDePano(p, t));
  const m2 = Math.ceil(piezas.reduce((acc, l) => acc + l, 0) * t.anchoUtil * 100 - 1e-6) / 100;
  return {
    cantidad: m2,
    unidad: 'm²',
    piezas,
    neto,
    detalle: `${resumirLargos(piezas)} (ancho útil ${t.anchoUtil.toFixed(2)} m) · ${neto.toFixed(2)} m² netos · ${donde}`,
  };
}

/**
 * Juntas de un paño (v1.16), para dibujarlas en el 3D y acomodar las aberturas:
 *   verticales   = distancias desde la punta 1 donde termina una tira o placa;
 *   horizontales = alturas donde termina un tramo (a medida) o una fila de placas.
 * Las tiras arrancan en la punta 1 (esquina izquierda vista desde afuera), igual que en la cuenta.
 */
export function juntasDePano(pano, tipo) {
  const t = { ...REVESTIMIENTO_POR_DEFECTO, ...tipo };
  const alto = Math.max(pano.h1, pano.h2);
  const cada = (paso, hasta) => {
    const lista = [];
    for (let x = paso; x < hasta - 0.01; x += paso) lista.push(Number(x.toFixed(4)));
    return lista;
  };
  if (t.venta === 'estandar') {
    const { parada } = placasDePano(pano, t);
    const ancho = parada ? t.anchoPlaca : t.largoPlaca;
    const altoPlaca = parada ? t.largoPlaca : t.anchoPlaca;
    return { verticales: cada(ancho, pano.largo), horizontales: cada(altoPlaca, alto) };
  }
  // A medida: una junta horizontal donde termina cada tramo (si la tira pasa el largo máximo).
  const horizontales = [];
  for (let h = t.largoMaximo; h < alto - 0.01; h += t.largoMaximo - t.solape) horizontales.push(Number(h.toFixed(4)));
  return { verticales: cada(t.anchoUtil, pano.largo), horizontales };
}

/**
 * Pedazos de una pared SIN los huecos de las aberturas (v1.24), en coordenadas de la pared:
 * x a lo largo (0 = punta 1), y = altura desde abajo. La pared se corta en franjas verticales en
 * los bordes de cada hueco; en cada franja quedan los tramos de alto que no son hueco. Así no
 * hace falta triangular formas con agujeros (y una puerta que toca el piso no da problemas).
 * @param largo   largo de la pared
 * @param altoEn  (x) => alto de la pared en x (puede ser inclinada)
 * @param huecos  [{ desde, hasta, abajo, arriba }]
 * @returns {Array<[[x,y],[x,y],[x,y],[x,y]]>} cuadriláteros (abajo-izq, abajo-der, arriba-der, arriba-izq)
 */
export function pedazosDePared(largo, altoEn, huecos) {
  const dentro = huecos
    .map((h) => ({ ...h, desde: Math.max(0, h.desde), hasta: Math.min(largo, h.hasta) }))
    .filter((h) => h.hasta - h.desde > 1e-6);
  const xs = [...new Set([0, largo, ...dentro.flatMap((h) => [h.desde, h.hasta])].map((x) => Number(x.toFixed(5))))]
    .sort((a, b) => a - b);
  const pedazos = [];
  for (let i = 0; i < xs.length - 1; i++) {
    const [a, b] = [xs[i], xs[i + 1]];
    if (b - a < 1e-6) continue;
    const queTapan = dentro.filter((h) => h.desde <= a + 1e-6 && h.hasta >= b - 1e-6).sort((p, q) => p.abajo - q.abajo);
    let y = 0;
    queTapan.forEach((h) => {
      if (h.abajo - y > 1e-3) pedazos.push([[a, y], [b, y], [b, h.abajo], [a, h.abajo]]);
      y = Math.max(y, h.arriba);
    });
    const [ta, tb] = [altoEn(a), altoEn(b)];
    if (Math.max(ta, tb) - y > 1e-3) pedazos.push([[a, y], [b, y], [b, Math.max(y, tb)], [a, Math.max(y, ta)]]);
  }
  return pedazos;
}

