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
// Un "paño" es una superficie a revestir: { donde, largo, h1, h2, neto }
//   largo  = a lo largo de la pared (o del techo, paralelo al lado bajo)
//   h1, h2 = alto en cada punta (una pared bajo un techo inclinado es un trapecio)
//   neto   = m² descontando aberturas (solo informativo)
// Para no complicar, las tiras y placas NO se descuentan por las
// aberturas (cálculo conservador: sobra material). Queda en PENDIENTES.
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

/**
 * Tiras de un revestimiento a medida en un paño: cada tira toma el alto
 * MAYOR de su tramo (en una pared inclinada se corta en obra).
 * @returns {number[]} largos a pedir (ya partidos en tramos si hace falta)
 */
export function tirasDePano(pano, tipo) {
  const cantidad = Math.max(1, Math.ceil(pano.largo / tipo.anchoUtil - EPSILON));
  const largos = [];
  for (let i = 0; i < cantidad; i++) {
    const x0 = i * tipo.anchoUtil;
    const x1 = Math.min(pano.largo, (i + 1) * tipo.anchoUtil);
    const alto = Math.max(altoEn(pano, x0), altoEn(pano, x1));
    largos.push(...cortarEnTramos(alto, tipo.largoMaximo, tipo.solape));
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
  const grilla = (anchoPlaca, altoPlaca) => {
    const columnas = Math.max(1, Math.ceil(pano.largo / anchoPlaca - EPSILON));
    const filas = Math.max(1, Math.ceil(alto / altoPlaca - EPSILON));
    return { placas: columnas * filas, columnas, filas };
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
