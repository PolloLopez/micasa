// ==========================================================
// INTERIORES (v1.38): mesadas y muebles
// ----------------------------------------------------------
// MESADA (decisiones de Leandro 31/10): una estructura de perfiles de la lista
// contra una pared, revestida (Durlock u otro de la lista) al frente y a los
// costados, con tapa aparte (granito, madera…), huecos bajo mesada (heladera,
// lavarropas, bacha: sin estructura ni placa al frente), estantes y zócalo
// para el pie (retirado del frente).
//   Se ubica como las aberturas: en una pared (lado), a una distancia de su
//   esquina izquierda o derecha (vista desde afuera), y entra `profundidad`
//   hacia adentro. Las piezas van en la capa "Mesadas" y al presupuesto
//   (estructura en barras con cortes, revestimiento con los paños de siempre,
//   tapa y estantes en m²).
//
// MUEBLE: una forma por tipo (cama, mesa, heladera…) con sus medidas cargadas
// a mano y un material. Se ubica como lo del terreno: distancia al lateral
// izquierdo (mirando el frente desde afuera) y al frente, hasta su borde, y
// se puede girar de a 90°. No va al presupuesto (es para dimensionar).
// ==========================================================

import { geometriaLados, largoLado, alturaEn, tramoEntrepiso } from './geometria.js';
import { haciaAdentro, pieza } from './segmentos.js';
import { LADOS, ALTURA_PISO_2 } from './constantes.js';
import { limitesSobrePared, ubicarTabique, MEDIO_ESPESOR_TABIQUE } from './tabiques.js';

const ALTO_PISO = 0.09; // el piso terminado está un poco arriba de la estructura (OSB)
const MEDIA_PARED = 0.06; // la mesada arranca en la cara de adentro de los perfiles de la pared, no en su eje
const cm = (n) => Math.round(n * 100);
/** v1.38.2: color propio opcional: '' (o sin dato) = el de fábrica; si no, '#rrggbb'. */
export const colorOpcional = (c) => c === undefined || c === '' || (typeof c === 'string' && /^#[0-9a-fA-F]{6}$/.test(c));
/** Color con el que se dibuja un mueble: el propio o el de su material. */
export const colorDelMueble = (m) => m.color || MATERIALES_MUEBLE[m.material]?.color || MATERIALES_MUEBLE.madera.color;

// ---------- Mesadas ----------

export const MESADA_NUEVA = {
  nombre: 'Mesada',
  nivel: 'piso', // 'piso' (planta baja) | 'piso2' (entrepiso)
  lado: 'C',
  ladoReferencia: 'izquierda',
  desde: 0.5, // distancia de la esquina (por afuera, como las aberturas)
  largo: 2.4,
  profundidad: 0.6,
  alto: 0.9,
  espesorTapa: 0.03,
  separacionMontantes: 0.6, // montantes del frente y del fondo
  perfil: '', // id de la lista de perfiles ('' = el general de "Estructura de mesadas")
  revestimiento: '', // id del tipo de revestimiento (frente, costados y zócalo); '' = sin
  costadoIzquierdo: true, // se reviste ese costado (si da contra una pared, no hace falta)
  costadoDerecho: true,
  zocalo: 0.1, // alto del zócalo para el pie (0 = sin)
  retiroZocalo: 0.06, // cuánto se mete el zócalo respecto del frente
  estantes: 1, // estantes por tramo (0 = sin)
  huecos: [], // [{ tramo, desde, ancho, nombre, tapa, conZocalo, electro, cargaFrontal }] desde la punta izquierda de su tramo (vista de frente)
  mostrarEtiqueta: true, // v1.38.1: cartel con el nombre en el 3D (como paredes y aberturas)
  colorTapa: '', // v1.38.2: color propio de la tapa ('' = el de la capa "Tapas, placas y estantes")
  colorEstantes: '', // v1.38.2: color propio de los estantes ('' = el de la madera)
  // v1.40: forma (recta, L o U) y el largo de los tramos que siguen por las paredes de al lado.
  forma: 'recta',
  largoIzquierdo: 1.2,
  largoDerecho: 1.2,
  bachas: [], // [{ tramo, desde, ancho, profundidad, doble }]
  // v1.40.1: revestir el lomo de los tramos que siguen (si no dan contra una pared, ej. una península).
  fondoIzquierdo: false,
  fondoDerecho: false,
  ubicacionLibre: true, // v1.40.1: la L/U se ubica con la distancia a la esquina (ver completarMesada)
};

/** Una mesada nueva con un id libre. */
export function mesadaNueva(mesadas, id) {
  return { ...structuredClone(MESADA_NUEVA), id, nombre: `Mesada ${mesadas.length + 1}` };
}

/** Altura del piso terminado de un nivel. */
export const alturaDelPiso = (params, nivel) => params.elevacion + (nivel === 'piso2' ? (params.alturaPiso2 ?? ALTURA_PISO_2) : 0) + ALTO_PISO;

/** v1.40: formas de la mesada. "Izquierda" y "derecha" = mirándola de frente, desde adentro de la casa. */
export const FORMAS_MESADA = [
  ['recta', 'Recta'],
  ['L-izquierda', 'En L (sigue por la pared de la izquierda)'],
  ['L-derecha', 'En L (sigue por la pared de la derecha)'],
  ['U', 'En U (sigue por las dos)'],
];
const giraIzquierda = (m) => m.forma === 'L-izquierda' || m.forma === 'U';
const giraDerecha = (m) => m.forma === 'L-derecha' || m.forma === 'U';

/** v1.40: lo que puede ir en un hueco bajo mesada (se dibuja adentro, con las medidas del hueco). */
export const ELECTROS_HUECO = [['', 'Nada (vacío)'], ['heladera', 'Heladera'], ['cocina', 'Cocina'], ['lavarropas', 'Lavarropas'], ['otro', 'Otro mueble']];
/** Con qué arranca un hueco según lo que va adentro: la cocina (hornallas) y la heladera sin tapa; el lavarropas con tapa. */
export const TAPA_SEGUN_ELECTRO = { '': true, heladera: false, cocina: false, lavarropas: true, otro: true };

/** v1.40: bachas de cocina en la tapa. */
export const BACHA_NUEVA = { tramo: 'principal', desde: 0.8, ancho: 0.52, profundidad: 0.37, doble: false };
export const HUECO_NUEVO = { tramo: 'principal', desde: 0, ancho: 0.6, nombre: 'Hueco', tapa: true, conZocalo: false, electro: '' };

/** Nombre de cada tramo para mostrar. */
export const NOMBRE_TRAMO = { principal: 'principal', izquierdo: 'de la izquierda', derecho: 'de la derecha' };

/**
 * Los tramos rectos de una mesada: el principal (contra su pared, donde lo ubiques y del largo que quieras) y, en L o U,
 * los que salen derechos desde sus puntas hacia adentro de la casa (v1.40.1: antes la L/U se pegaba sí o sí a las
 * esquinas). Si la punta está en la esquina, el tramo que sigue queda contra la pared de al lado; si no (ej. el límite
 * es un tabique), queda suelto y su lomo se puede revestir.
 * Cada tramo: { clave, origen (punta izquierda del fondo), alongo (hacia su derecha), adentro (hacia su frente), largo,
 * costados, fondoRevestido, esquinas }.
 *   - El cuadrado de la esquina es del principal; el tramo que sigue arranca después de su profundidad. Su largo cargado
 *     (`largoIzquierdo` / `largoDerecho`) se mide desde la cara de adentro de la pared principal.
 *   - `esquinas`: el pedazo del frente del principal que queda tapado por el tramo que sigue (sin placa ni zócalo).
 */
export function tramosDeMesada(params, m) {
  const geo = geometriaLados(params)[m.lado];
  const largoPared = largoLado(m.lado, params);
  const prof = m.profundidad;
  const largo = m.largo;
  const inicio = m.ladoReferencia === 'izquierda' ? m.desde : largoPared - m.desde - largo; // sobre la pared (desde p1)
  const adentro = haciaAdentro(geo);
  const alongo = [-geo.direccion[0], -geo.direccion[1]]; // hacia la derecha mirándola de frente
  // Vista desde adentro, la pared se recorre al revés que desde afuera: la punta izquierda es la de p1 + inicio + largo.
  const d = inicio + largo;
  const origen = [geo.p1[0] + geo.direccion[0] * d + adentro[0] * MEDIA_PARED, geo.p1[1] + geo.direccion[1] * d + adentro[1] * MEDIA_PARED];
  const punto = (x, z) => [origen[0] + alongo[0] * x + adentro[0] * z, origen[1] + alongo[1] * x + adentro[1] * z];
  const tramos = [{
    clave: 'principal', origen, alongo, adentro, largo, inicio,
    costadoIzquierdo: giraIzquierda(m) ? false : m.costadoIzquierdo,
    costadoDerecho: giraDerecha(m) ? false : m.costadoDerecho,
    fondoRevestido: false, // contra la pared
    esquinas: [...(giraIzquierda(m) ? [{ desde: 0, ancho: prof }] : []), ...(giraDerecha(m) ? [{ desde: largo - prof, ancho: prof }] : [])],
  }];
  if (giraIzquierda(m)) {
    // Sale desde la punta izquierda: su lomo es la línea de esa punta, su frente mira a la derecha del principal y
    // su punta derecha (la que toca al principal) da a la esquina.
    tramos.push({ clave: 'izquierdo', origen: punto(0, m.largoIzquierdo), alongo: [-adentro[0], -adentro[1]], adentro: alongo,
      largo: m.largoIzquierdo - prof, costadoIzquierdo: m.costadoIzquierdo, costadoDerecho: false,
      fondoRevestido: m.fondoIzquierdo === true, esquinas: [] });
  }
  if (giraDerecha(m)) {
    // Sale desde la punta derecha: su punta izquierda (la que toca al principal) da a la esquina.
    tramos.push({ clave: 'derecho', origen: punto(largo, prof), alongo: adentro, adentro: [-alongo[0], -alongo[1]],
      largo: m.largoDerecho - prof, costadoIzquierdo: false, costadoDerecho: m.costadoDerecho,
      fondoRevestido: m.fondoDerecho === true, esquinas: [] });
  }
  return tramos;
}

/** Punta izquierda del fondo de un tramo (vista de frente), dirección a lo largo, hacia adentro y altura del piso. */
function ubicarTramo(params, { origen, alongo, adentro }, nivel) {
  return { origen, alongo, adentro, y: alturaDelPiso(params, nivel) };
}

/**
 * v1.40.1: distancia a la esquina (vista desde afuera) para que la punta izquierda o derecha de la mesada (vista de
 * adentro) quede contra la pared de al lado. La izquierda de adentro es la derecha de afuera.
 */
export function mesadaALaEsquina(m, punta) {
  return punta === 'izquierda' ? { ladoReferencia: 'derecha', desde: MEDIA_PARED } : { ladoReferencia: 'izquierda', desde: MEDIA_PARED };
}

/** Dónde está el tramo principal sobre su pared: [desde, hasta] medidos desde la punta 1 de la pared (al eje). */
function rangoSobrePared(params, m) {
  const largoPared = largoLado(m.lado, params);
  const inicio = m.ladoReferencia === 'izquierda' ? m.desde : largoPared - m.desde - m.largo;
  return [inicio, inicio + m.largo];
}

/**
 * v1.41.1: los límites más cercanos a cada punta de la mesada (vista de adentro): esquinas o caras de tabiques.
 * La punta izquierda de adentro es la de mayor distancia a la punta 1 de la pared.
 * @returns {{ izquierda: { d, nombre } | null, derecha: { d, nombre } | null }}
 */
export function limitesDeMesada(params, m) {
  const [a, b] = rangoSobrePared(params, m);
  const centro = (a + b) / 2;
  const limites = limitesSobrePared(params, m.lado, m.nivel);
  return { izquierda: limites.find((l) => l.d > centro + 1e-6) ?? null, derecha: [...limites].reverse().find((l) => l.d < centro - 1e-6) ?? null };
}

/**
 * Lleva una punta (o las dos) de la mesada hasta su límite: 'izquierda', 'derecha' o 'ambas'. Conserva desde qué esquina
 * se mide. Devuelve la mesada cambiada (para pasarla a cambiar(), que la valida).
 */
export function ajustarMesada(params, m, hacia) {
  const largoPared = largoLado(m.lado, params);
  let [a, b] = rangoSobrePared(params, m);
  const { izquierda, derecha } = limitesDeMesada(params, m);
  if (hacia !== 'derecha' && izquierda) b = izquierda.d;
  if (hacia !== 'izquierda' && derecha) a = derecha.d;
  const largo = Number((b - a).toFixed(4));
  const desde = Number((m.ladoReferencia === 'izquierda' ? a : largoPared - b).toFixed(4));
  // Los huecos y bachas del tramo principal se miden desde su punta izquierda (la de mayor distancia): si esa punta se
  // corre, se corren con ella para quedar en el mismo lugar. Los que quedan afuera del nuevo largo se sacan.
  const corrimiento = rangoSobrePared(params, m)[1] - b;
  const acomodar = (lista) => (lista ?? []).map((x) => ((x.tramo ?? 'principal') === 'principal'
    ? { ...x, desde: Number((x.desde - corrimiento).toFixed(4)) } : x))
    .filter((x) => (x.tramo ?? 'principal') !== 'principal' || (x.desde > -1e-3 && x.desde + x.ancho < largo + 1e-3));
  return { ...m, desde, largo, huecos: acomodar(m.huecos), bachas: acomodar(m.bachas) };
}

/** Tabiques que la mesada atraviesa (su eje cae dentro del tramo principal). */
export function tabiquesQueCruzaLaMesada(params, m) {
  const [a, b] = rangoSobrePared(params, m);
  const vistos = new Map();
  limitesSobrePared(params, m.lado, m.nivel).filter((l) => l.tabique !== undefined && l.eje > a + 1e-3 && l.eje < b - 1e-3)
    .forEach((l) => vistos.set(l.tabique, l.nombre));
  return [...vistos.values()];
}

/**
 * v1.40.1: las mesadas en L/U de la v1.40.0 iban pegadas a las esquinas (la distancia a la esquina no se usaba y la U
 * ocupaba toda la pared). Se pasan a la ubicación libre sin que se muevan.
 */
export function completarMesada(m, params) {
  const base = { ...MESADA_NUEVA, ...m,
    huecos: Array.isArray(m?.huecos) ? m.huecos.map((h) => ({ ...HUECO_NUEVO, ...h })) : [],
    bachas: Array.isArray(m?.bachas) ? m.bachas.map((b) => ({ ...BACHA_NUEVA, ...b })) : [] };
  if (m?.ubicacionLibre === true || base.forma === 'recta') return { ...base, ubicacionLibre: true };
  if (base.forma === 'U') {
    const largo = LADOS.includes(base.lado) && params ? largoLado(base.lado, params) - 2 * MEDIA_PARED : base.largo;
    return { ...base, ...mesadaALaEsquina(base, 'derecha'), largo, ubicacionLibre: true };
  }
  return { ...base, ...mesadaALaEsquina(base, base.forma === 'L-izquierda' ? 'izquierda' : 'derecha'), ubicacionLibre: true };
}

/**
 * Dónde está la mesada (su tramo principal): punta izquierda del fondo, dirección a lo largo y hacia adentro.
 * "Izquierda" de la mesada = mirándola de frente (desde adentro de la casa).
 */
export function ubicarMesada(params, m) {
  const principal = tramosDeMesada(params, m)[0];
  return { ...ubicarTramo(params, principal, m.nivel), inicio: principal.inicio, largoPared: largoLado(m.lado, params) };
}

/** Lo que queda de [0, largo] sacando unos huecos ({ desde, ancho }): [[desde, hasta]]. */
function sinHuecos(largo, huecos) {
  const ordenados = [...huecos].sort((a, b) => a.desde - b.desde);
  const tramos = [];
  let x = 0;
  ordenados.forEach((h) => {
    if (h.desde > x + 0.01) tramos.push([x, h.desde]);
    x = Math.max(x, h.desde + h.ancho);
  });
  if (x < largo - 0.01) tramos.push([x, largo]);
  return tramos;
}

/** Tramos del frente sin huecos: [[desde, hasta]] desde la punta izquierda (de una mesada recta). */
export function tramosDelFrente(m) {
  return sinHuecos(m.largo, m.huecos ?? []);
}

/** Posiciones de montantes en un tramo: las puntas y parejos a no más de la separación. */
function montantesDe([a, b], separacion) {
  const n = Math.max(1, Math.ceil((b - a) / separacion - 0.01));
  return Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n);
}

const unicos = (lista) => [...new Set(lista.map((x) => Number(x.toFixed(4))))].sort((a, b) => a - b);

/**
 * Un pedazo recto de mesada con estructura propia (una mesada recta, o un tramo de una L/U, o lo que queda entre
 * dos huecos sin tapa). x va de 0 a `largo` desde su punta izquierda.
 * Estructura (vista de frente, z desde la pared hacia adentro):
 *   - fondo, contra la pared: solera en el piso y solera arriba (bajo la tapa), con montantes del piso a la tapa;
 *   - frente: solera arriba entera; abajo (a la altura del zócalo) en los tramos con base, con montantes
 *     en los tramos con frente y en los bordes de cada hueco (ahí va la placa y la puerta del bajo mesada);
 *   - travesaños de frente a fondo: arriba en cada montante (sostienen la tapa) y abajo donde hay base;
 *   - con zócalo: una solera en el piso retirada del frente y una pata corta en cada montante con base.
 * Un hueco con tapa no lleva frente; si además es "sobre zócalo", la base (zócalo y solera de abajo) sigue por debajo
 * y el electrodoméstico apoya arriba de ella.
 */
function generarSegmento(params, m, s) {
  const { p, largo, huecos, prefijo, donde } = s;
  const arriba = m.alto - m.espesorTapa; // la estructura termina abajo de la tapa
  const abajo = m.zocalo > 0 ? m.zocalo : 0; // el frente arranca arriba del zócalo
  const prof = m.profundidad;
  const zZocalo = prof - m.retiroZocalo;
  const grupos = ['mesada'];
  const extra = { ...(m.perfil ? { perfilPared: m.perfil, ladoPared: m.nombre } : {}), mesada: m.id, nivel: m.nivel ?? 'piso' };
  const pz = (id, desde, hasta) => ({ ...pieza(`${prefijo}:${id}`, 'mesada', grupos, desde, hasta), ...extra });
  const piezas = [];
  const conFrente = sinHuecos(largo, huecos); // donde va la placa del frente
  const conBase = sinHuecos(largo, huecos.filter((h) => !(h.conZocalo && m.zocalo > 0))); // donde va zócalo y solera de abajo
  const en = (tramos) => (x) => tramos.some(([a, b]) => x >= a - 0.005 && x <= b + 0.005);
  const enBase = en(conBase);

  // Montantes del frente: los de cada tramo con frente, los bordes de los huecos y las dos puntas (siempre).
  const xsFrente = unicos([0, largo, ...conFrente.flatMap((t) => montantesDe(t, m.separacionMontantes)),
    ...huecos.flatMap((h) => [h.desde, h.desde + h.ancho]).filter((x) => x > 0.005 && x < largo - 0.005)]);
  // Montantes del fondo: parejos y, además, enfrente de cada montante del frente (para los travesaños).
  const xsFondo = unicos([...montantesDe([0, largo], m.separacionMontantes), ...xsFrente]);

  piezas.push(pz('fondo-abajo', p(0, 0, 0), p(largo, 0, 0)));
  piezas.push(pz('fondo-arriba', p(0, 0, arriba), p(largo, 0, arriba)));
  xsFondo.forEach((x) => piezas.push(pz(`fondo-mont:${cm(x)}`, p(x, 0, 0), p(x, 0, arriba))));
  piezas.push(pz('frente-arriba', p(0, prof, arriba), p(largo, prof, arriba)));
  conBase.forEach(([a, b], i) => piezas.push(pz(`frente-abajo:${i}`, p(a, prof, abajo), p(b, prof, abajo))));
  // Con base el montante apoya en la solera de abajo; si no (dentro de un hueco, ej. una punta), baja hasta el piso.
  xsFrente.forEach((x) => piezas.push(pz(`frente-mont:${cm(x)}`, p(x, prof, enBase(x) ? abajo : 0), p(x, prof, arriba))));
  xsFondo.forEach((x) => piezas.push(pz(`trav-arriba:${cm(x)}`, p(x, 0, arriba), p(x, prof, arriba))));
  xsFrente.filter(enBase).forEach((x) => piezas.push(pz(`trav-abajo:${cm(x)}`, p(x, 0, abajo), p(x, prof, abajo))));
  if (m.zocalo > 0) {
    conBase.forEach(([a, b], i) => piezas.push(pz(`zocalo:${i}`, p(a, zZocalo, 0), p(b, zZocalo, 0))));
    xsFrente.filter(enBase).forEach((x) => piezas.push(pz(`pata:${cm(x)}`, p(x, zZocalo, 0), p(x, zZocalo, abajo))));
  }

  // Superficies.
  const altoFrente = arriba - abajo; // la placa del frente va del zócalo a la tapa
  const suma = (tramos) => tramos.reduce((acc, [a, b]) => acc + (b - a), 0);
  const panos = [];
  if (m.revestimiento) {
    panos.push({ largo, h1: altoFrente, h2: altoFrente, neto: suma(conFrente) * altoFrente, donde: `${donde} (frente)`,
      huecos: huecos.map((h) => ({ desde: h.desde, hasta: h.desde + h.ancho, abajo: 0, arriba: altoFrente })) });
    if (s.costadoIzquierdo) panos.push({ largo: prof, h1: arriba, h2: arriba, neto: prof * arriba, donde: `${donde} (costado izq.)` });
    if (s.costadoDerecho) panos.push({ largo: prof, h1: arriba, h2: arriba, neto: prof * arriba, donde: `${donde} (costado der.)` });
    if (m.zocalo > 0) panos.push({ largo: suma(conBase), h1: m.zocalo, h2: m.zocalo, neto: suma(conBase) * m.zocalo, donde: `${donde} (zócalo)` });
    if (s.fondoRevestido) panos.push({ largo, h1: arriba, h2: arriba, neto: largo * arriba, donde: `${donde} (lomo)` });
  }
  // v1.40.1: los estantes también entran en el esquinero (el pedazo tapado por el tramo que sigue).
  const conEstantes = sinHuecos(largo, huecos.filter((h) => !h.esquina));
  const estantes = m.estantes > 0 ? conEstantes.map(([a, b]) => ({ desde: a, hasta: b, alturas: Array.from({ length: m.estantes },
    (_, k) => abajo + ((k + 1) * altoFrente) / (m.estantes + 1)) })) : [];
  const adentro3 = [s.adentro[0], 0, s.adentro[1]];
  const alongo3 = [s.alongo[0], 0, s.alongo[1]];
  const placa = (esquinas, afuera) => ({ esquinas, afuera });
  return {
    piezas, panos,
    tapaM2: largo * prof,
    estantesM2: estantes.reduce((acc, e) => acc + (e.hasta - e.desde) * (prof - 0.02) * e.alturas.length, 0),
    tapa: [p(0, 0, arriba), p(largo, 0, arriba), p(largo, prof + 0.02, arriba), p(0, prof + 0.02, arriba)].map((q) => [q[0], q[1] + m.espesorTapa, q[2]]),
    placas: [
      ...conFrente.map(([a, b]) => placa([p(a, prof, abajo), p(b, prof, abajo), p(b, prof, arriba), p(a, prof, arriba)], adentro3)),
      ...(m.zocalo > 0 ? conBase.map(([a, b]) => placa([p(a, zZocalo, 0), p(b, zZocalo, 0), p(b, zZocalo, m.zocalo), p(a, zZocalo, m.zocalo)], adentro3)) : []),
      ...(s.costadoIzquierdo ? [placa([p(0, 0, 0), p(0, prof, 0), p(0, prof, arriba), p(0, 0, arriba)], alongo3.map((c) => -c))] : []),
      ...(s.costadoDerecho ? [placa([p(largo, 0, 0), p(largo, prof, 0), p(largo, prof, arriba), p(largo, 0, arriba)], alongo3)] : []),
      ...(s.fondoRevestido ? [placa([p(0, 0, 0), p(largo, 0, 0), p(largo, 0, arriba), p(0, 0, arriba)], adentro3.map((c) => -c))] : []),
    ],
    estantes: estantes.flatMap((e) => e.alturas.map((h) => [p(e.desde, 0.01, h), p(e.hasta, 0.01, h), p(e.hasta, prof - 0.01, h), p(e.desde, prof - 0.01, h)])),
  };
}

/**
 * Piezas y superficies de una mesada (recta, en L o en U), con sus huecos, bachas y electrodomésticos.
 * Cada tramo se parte en los huecos SIN tapa (cocina, heladera): ahí no hay estructura y los dos pedazos llevan
 * costado revestido. Los huecos CON tapa (lavarropas de carga frontal) siguen bajo la tapa.
 */
export function generarMesada(params, m) {
  const prof = m.profundidad;
  const arriba = m.alto - m.espesorTapa;
  const res = { piezas: [], panos: [], tapaM2: 0, estantesM2: 0, tapas: [], placas: [], estantes: [] };
  const bachas = [];
  const electros = [];
  tramosDeMesada(params, m).forEach((tramo) => {
    const { origen, alongo, adentro, y } = ubicarTramo(params, tramo, m.nivel);
    const pTramo = (x, z, h) => [origen[0] + alongo[0] * x + adentro[0] * z, y + h, origen[1] + alongo[1] * x + adentro[1] * z];
    const huecos = (m.huecos ?? []).filter((h) => (h.tramo ?? 'principal') === tramo.clave);
    const sinTapa = huecos.filter((h) => h.tapa === false);
    const conTapa = [...huecos.filter((h) => h.tapa !== false), ...tramo.esquinas.map((e) => ({ ...e, esquina: true }))];
    const nombreTramo = tramo.clave === 'principal' ? m.nombre : `${m.nombre} ${NOMBRE_TRAMO[tramo.clave]}`;
    sinHuecos(tramo.largo, sinTapa).forEach(([a, b], k) => {
      const corta = (x) => (x > 0.005 && x < tramo.largo - 0.005); // el borde es un corte por un hueco sin tapa
      const clave = { principal: 'p', izquierdo: 'izq', derecho: 'der' }[tramo.clave];
      const prefijo = tramo.clave === 'principal' && k === 0 ? `mesada:${m.id}` : `mesada:${m.id}:${clave}${k}`;
      const seg = generarSegmento(params, m, {
        p: (x, z, h) => pTramo(a + x, z, h), largo: b - a, prefijo, alongo, adentro,
        donde: k === 0 ? nombreTramo : `${nombreTramo} ${k + 1}`,
        huecos: conTapa.filter((h) => h.desde < b - 0.005 && h.desde + h.ancho > a + 0.005)
          .map((h) => ({ ...h, desde: Math.max(0, h.desde - a), ancho: Math.min(b, h.desde + h.ancho) - Math.max(a, h.desde) })),
        costadoIzquierdo: corta(a) ? true : tramo.costadoIzquierdo,
        costadoDerecho: corta(b) ? true : tramo.costadoDerecho,
        fondoRevestido: tramo.fondoRevestido,
      });
      res.piezas.push(...seg.piezas);
      res.panos.push(...seg.panos);
      res.tapaM2 += seg.tapaM2;
      res.estantesM2 += seg.estantesM2;
      res.tapas.push(seg.tapa);
      res.placas.push(...seg.placas);
      res.estantes.push(...seg.estantes);
    });
    // Bachas: un rectángulo en la tapa (centrado en la profundidad); la tapa pierde ese pedazo.
    (m.bachas ?? []).filter((b) => (b.tramo ?? 'principal') === tramo.clave).forEach((b) => {
      const z0 = (prof - b.profundidad) / 2;
      bachas.push({ doble: b.doble === true, m2: b.ancho * b.profundidad,
        esquinas: [pTramo(b.desde, z0, m.alto), pTramo(b.desde + b.ancho, z0, m.alto), pTramo(b.desde + b.ancho, z0 + b.profundidad, m.alto), pTramo(b.desde, z0 + b.profundidad, m.alto)],
        grifo: pTramo(b.desde + b.ancho / 2, Math.max(0.04, z0 - 0.05), m.alto) });
    });
    // Electrodomésticos en los huecos: del ancho del hueco, al ras del frente, mirando hacia adentro de la casa.
    huecos.filter((h) => h.electro && TIPOS_MUEBLE[h.electro]).forEach((h) => {
      const t = TIPOS_MUEBLE[h.electro];
      const profE = Math.min(t.profundidad, prof);
      const sube = h.conZocalo && m.zocalo > 0 ? m.zocalo : 0;
      // Con tapa arriba: si no entra debajo de la estructura de la tapa, se avisa cuánto pasa (se dibuja igual).
      const alto = t.alto;
      const pasaDeAlto = h.tapa === false ? 0 : Math.max(0, sube + alto - arriba);
      const c = pTramo(h.desde + h.ancho / 2, prof - profE / 2, 0);
      electros.push({ tipo: h.electro, nombre: h.nombre, ancho: Math.max(0.05, h.ancho - 0.02), profundidad: profE, alto,
        material: t.material, cargaFrontal: h.cargaFrontal !== false, pasaDeAlto, puerta: t.puerta ?? 'ninguna', // v1.42.1: con su puerta
        centro: [c[0], c[2]], y: c[1] + sube, angulo: Math.atan2(adentro[0], adentro[1]) });
    });
  });
  const bachasM2 = bachas.reduce((acc, b) => acc + b.m2, 0);
  return {
    id: m.id, nombre: m.nombre, piezas: res.piezas, panos: res.panos, panel: m.revestimiento, nivel: m.nivel ?? 'piso',
    mostrarEtiqueta: m.mostrarEtiqueta !== false,
    colorTapa: m.colorTapa || '', colorEstantes: m.colorEstantes || '', // v1.38.2
    tapa: { m2: Math.max(0, res.tapaM2 - bachasM2), espesor: m.espesorTapa, tramos: res.tapas.length },
    estantesM2: res.estantesM2,
    bachas: { simples: bachas.filter((b) => !b.doble).length, dobles: bachas.filter((b) => b.doble).length },
    electros,
    // Para el 3D: cada superficie como 4 esquinas; las placas con hacia dónde miran.
    dibujo: { tapas: res.tapas, placas: res.placas, estantes: res.estantes, bachas, espesorTapa: m.espesorTapa },
  };
}

/** Todas las mesadas de la obra. */
export function generarMesadas(params) {
  if (params.tipoProyecto !== 'construccion') return [];
  return (params.mesadas ?? []).map((m) => generarMesada(params, m));
}

/** Errores de carga de una mesada (que entre en sus paredes, huecos y bachas en sus tramos). */
export function validarMesada(m, params) {
  if (!LADOS.includes(m.lado)) return 'Elegí una pared';
  const num = (v, min, max) => Number.isFinite(v) && v >= min && v <= max;
  if (!FORMAS_MESADA.some(([f]) => f === (m.forma ?? 'recta'))) return 'Elegí la forma';
  if (!num(m.largo, 0.3, 20)) return 'El largo va de 0,30 a 20 m';
  if (!num(m.profundidad, 0.2, 1.5)) return 'La profundidad va de 0,20 a 1,50 m';
  if (!num(m.alto, 0.3, 1.5)) return 'El alto va de 0,30 a 1,50 m';
  if (!num(m.espesorTapa, 0, 0.1)) return 'La tapa va de 0 a 10 cm';
  if (!num(m.separacionMontantes, 0.2, 2)) return 'Los montantes van cada 0,20 a 2 m';
  if (!num(m.zocalo, 0, 0.3) || !num(m.retiroZocalo, 0, 0.2)) return 'El zócalo va de 0 a 30 cm (retiro hasta 20 cm)';
  if (!Number.isInteger(m.estantes) || m.estantes < 0 || m.estantes > 5) return 'Estantes: de 0 a 5';
  if (!num(m.desde, 0, 50)) return 'La distancia a la esquina no puede ser negativa';
  const forma = m.forma ?? 'recta';
  if (m.desde + m.largo > largoLado(m.lado, params) + 0.001) return 'La mesada no entra en esa pared';
  if (giraIzquierda(m) && !num(m.largoIzquierdo, m.profundidad + 0.3, 20)) return `El tramo de la izquierda va de ${(m.profundidad + 0.3).toFixed(2)} a 20 m`;
  if (giraDerecha(m) && !num(m.largoDerecho, m.profundidad + 0.3, 20)) return `El tramo de la derecha va de ${(m.profundidad + 0.3).toFixed(2)} a 20 m`;
  if (['fondoIzquierdo', 'fondoDerecho'].some((c) => m[c] !== undefined && typeof m[c] !== 'boolean')) return 'Valor inválido';
  if (m.nivel === 'piso2' && !(params.anchoEntrepiso > 0)) return 'No hay entrepiso';
  if (!['piso', 'piso2'].includes(m.nivel)) return 'Elegí planta baja o piso 2';
  if (typeof m.nombre !== 'string' || m.nombre.length > 40) return 'El nombre puede tener hasta 40 letras';
  if (m.mostrarEtiqueta !== undefined && typeof m.mostrarEtiqueta !== 'boolean') return 'Valor inválido';
  if (m.apoyado !== undefined && typeof m.apoyado !== 'boolean') return 'Valor inválido'; // v1.49
  if (!colorOpcional(m.colorTapa) || !colorOpcional(m.colorEstantes)) return 'Color inválido';
  // Largo de cada tramo (huecos y bachas se miden en su tramo, desde su punta izquierda).
  const largos = Object.fromEntries(tramosDeMesada(params, { ...m, forma }).map((t) => [t.clave, t.largo]));
  for (const h of m.huecos ?? []) {
    const largo = largos[h.tramo ?? 'principal'];
    if (largo === undefined) return 'Un hueco está en un tramo que esta mesada no tiene';
    if (!num(h.desde, 0, largo) || !num(h.ancho, 0.1, largo) || h.desde + h.ancho > largo + 0.001) return 'Un hueco no entra en su tramo';
    if (h.electro !== undefined && !ELECTROS_HUECO.some(([e]) => e === h.electro)) return 'Electrodoméstico desconocido';
    if (['tapa', 'conZocalo', 'cargaFrontal'].some((c) => h[c] !== undefined && typeof h[c] !== 'boolean')) return 'Valor inválido';
  }
  for (const b of m.bachas ?? []) {
    const largo = largos[b.tramo ?? 'principal'];
    if (largo === undefined) return 'Una bacha está en un tramo que esta mesada no tiene';
    if (!num(b.ancho, 0.2, 2) || !num(b.profundidad, 0.2, m.profundidad - 0.06)) return 'La bacha va de 0,20 m y deja 3 cm de tapa adelante y atrás';
    if (!num(b.desde, 0, largo) || b.desde + b.ancho > largo + 0.001) return 'Una bacha no entra en su tramo';
    const sobreHueco = (m.huecos ?? []).some((h) => (h.tramo ?? 'principal') === (b.tramo ?? 'principal') && h.tapa === false
      && b.desde < h.desde + h.ancho - 0.001 && b.desde + b.ancho > h.desde + 0.001);
    if (sobreHueco) return 'Una bacha cae sobre un hueco sin tapa';
  }
  return null;
}

// ---------- Muebles ----------

/** v1.48: grupos de la lista de muebles (antes iba todo mezclado). */
export const GRUPOS_MUEBLE = [['muebles', 'Muebles'], ['electro', 'Electrodomésticos'], ['bano', 'Baño']];

/** Tipos de mueble con sus medidas de fábrica (ancho x profundidad x alto, en m), su grupo y su material. */
export const TIPOS_MUEBLE = {
  cama2: { nombre: 'Cama 2 plazas', grupo: 'muebles', ancho: 1.4, profundidad: 1.9, alto: 0.5, material: 'madera', forma: 'cama' },
  cama1: { nombre: 'Cama 1 plaza', grupo: 'muebles', ancho: 0.8, profundidad: 1.9, alto: 0.5, material: 'madera', forma: 'cama' },
  mesa: { nombre: 'Mesa', grupo: 'muebles', ancho: 1.4, profundidad: 0.8, alto: 0.75, material: 'madera', forma: 'mesa' },
  silla: { nombre: 'Silla', grupo: 'muebles', ancho: 0.45, profundidad: 0.45, alto: 0.9, material: 'madera', forma: 'silla' },
  sillon: { nombre: 'Sillón', grupo: 'muebles', ancho: 1.8, profundidad: 0.85, alto: 0.8, material: 'tela', forma: 'sillon' },
  escritorio: { nombre: 'Escritorio', grupo: 'muebles', ancho: 1.2, profundidad: 0.6, alto: 0.75, material: 'madera', forma: 'mesa' },
  placard: { nombre: 'Placard', grupo: 'muebles', ancho: 1.5, profundidad: 0.6, alto: 2.1, material: 'madera', forma: 'placard', puerta: 'dos' },
  // v1.42.1: copero y alacena (la alacena va colgada: `elevacion` = del piso a su parte de abajo).
  copero: { nombre: 'Copero', grupo: 'muebles', ancho: 0.9, profundidad: 0.4, alto: 1.9, material: 'madera', forma: 'placard', puerta: 'dos' },
  alacena: { nombre: 'Alacena', grupo: 'muebles', ancho: 1.2, profundidad: 0.35, alto: 0.7, material: 'madera', forma: 'placard', puerta: 'dos', elevacion: 1.45 },
  heladera: { nombre: 'Heladera', grupo: 'electro', ancho: 0.7, profundidad: 0.7, alto: 1.8, material: 'blanco', forma: 'electro', puerta: 'derecha' },
  cocina: { nombre: 'Cocina', grupo: 'electro', ancho: 0.56, profundidad: 0.6, alto: 0.85, material: 'acero', forma: 'cocina', puerta: 'abajo' }, // v1.39: con hornallas
  lavarropas: { nombre: 'Lavarropas', grupo: 'electro', ancho: 0.6, profundidad: 0.6, alto: 0.85, material: 'blanco', forma: 'lavarropas', puerta: 'izquierda' }, // v1.39: carga frontal o superior
  vanitory: { nombre: 'Vanitory', grupo: 'bano', ancho: 0.6, profundidad: 0.45, alto: 0.85, material: 'blanco', forma: 'vanitory', puerta: 'dos' }, // v1.39: con bacha
  inodoro: { nombre: 'Inodoro', grupo: 'bano', ancho: 0.4, profundidad: 0.65, alto: 0.75, material: 'blanco', forma: 'inodoro' },
  ducha: { nombre: 'Plato de ducha', grupo: 'bano', ancho: 0.8, profundidad: 0.8, alto: 0.1, material: 'blanco', forma: 'caja' },
  // v1.48: electrodomésticos chicos (pedido de Leandro). Los de mesada arrancan apoyados a 0,95 m (alto de mesada) y
  // el televisor colgado a 1 m; la altura se cambia en la ficha.
  televisor: { nombre: 'Televisor', grupo: 'electro', ancho: 1.23, profundidad: 0.06, alto: 0.71, material: 'negro', forma: 'tv', elevacion: 1 },
  cafetera: { nombre: 'Cafetera', grupo: 'electro', ancho: 0.2, profundidad: 0.25, alto: 0.35, material: 'negro', apoyable: true, forma: 'cafetera', elevacion: 0.95 },
  hornoAire: { nombre: 'Horno de aire (air fryer)', grupo: 'electro', ancho: 0.3, profundidad: 0.35, alto: 0.32, material: 'negro', apoyable: true, forma: 'hornoAire', elevacion: 0.95 },
  maquinaPan: { nombre: 'Máquina de pan', grupo: 'electro', ancho: 0.25, profundidad: 0.35, alto: 0.3, material: 'blanco', apoyable: true, forma: 'maquinaPan', elevacion: 0.95 },
  otro: { nombre: 'Otro', grupo: 'muebles', ancho: 1, profundidad: 0.6, alto: 0.8, material: 'madera', forma: 'caja' },
};

/** Materiales (color y cuánto brilla) para el 3D. */
export const MATERIALES_MUEBLE = {
  madera: { nombre: 'Madera', color: '#a16207', metal: 0, aspereza: 0.8 },
  blanco: { nombre: 'Blanco', color: '#f1f5f9', metal: 0, aspereza: 0.4 },
  acero: { nombre: 'Acero', color: '#cbd5e1', metal: 0.7, aspereza: 0.3 },
  tela: { nombre: 'Tela', color: '#64748b', metal: 0, aspereza: 1 },
  negro: { nombre: 'Negro', color: '#1f2937', metal: 0.1, aspereza: 0.5 },
};

export function muebleNuevo(tipo, muebles, id) {
  const t = TIPOS_MUEBLE[tipo];
  const iguales = muebles.filter((m) => m.tipo === tipo).length;
  return {
    id, tipo, nombre: iguales ? `${t.nombre} ${iguales + 1}` : t.nombre, nivel: 'piso',
    ancho: t.ancho, profundidad: t.profundidad, alto: t.alto, material: t.material,
    // v1.39: se mide desde la pared que elijas (lateral izquierdo o derecho, frente o fondo), desde su cara de adentro.
    desdeLateral: 'izquierdo', distanciaLateral: 0.3 + iguales * 0.3,
    desdeFrente: 'frente', distanciaFrente: 0.3 + iguales * 0.3,
    giro: 0,
    mostrarEtiqueta: true, // v1.38.1: cartel con el nombre en el 3D
    color: '', // v1.38.2: color propio ('' = el de su material)
    ...(t.forma === 'lavarropas' ? { cargaFrontal: true } : {}), // v1.39: carga frontal (puerta redonda) o superior
    ...(t.forma === 'cama' ? { ...CAJONES_CAMA } : {}), // v1.40.1: cajones a los costados y a los pies
    puerta: t.puerta ?? 'ninguna', // v1.42.1: cómo abre (para ver el lugar que necesita la puerta abierta)
    elevacion: t.elevacion ?? 0, // v1.42.1: del piso a la parte de abajo del mueble (alacena colgada)
  };
}

/**
 * v1.42.1: cómo abre la puerta del mueble. Izquierda / derecha = de qué lado está la bisagra, mirando el mueble de frente.
 * El margen es lo que hay que dejar libre adelante para abrirla.
 */
export const PUERTAS_MUEBLE = [
  ['ninguna', 'Sin puerta'], ['izquierda', 'Una, bisagra a la izquierda'], ['derecha', 'Una, bisagra a la derecha'],
  ['dos', 'Dos hojas'], ['abajo', 'Rebatible hacia abajo (horno)'], ['corrediza', 'Corrediza (no necesita lugar)'],
];

/** Lo que sale hacia adelante la puerta abierta (m): el ancho de la hoja (la del lavarropas, su puerta redonda). */
export function margenDePuerta(m) {
  switch (m.puerta) {
    case 'izquierda': case 'derecha':
      if (TIPOS_MUEBLE[m.tipo]?.forma === 'lavarropas') return m.cargaFrontal === false ? 0 : Math.min(m.ancho, m.alto) * 0.7;
      return m.ancho;
    case 'dos': return m.ancho / 2;
    case 'abajo': return Math.min(0.5, m.alto * 0.55);
    default: return 0;
  }
}

/** Si la puerta abierta choca con la pared de enfrente: { pared, falta } o null. */
export function puertaQueChoca(params, m) {
  const margen = margenDePuerta(m);
  if (!(margen > 0)) return null;
  const pared = paredHacia(m, 'pies'); // el frente del mueble
  const falta = margen - distanciasDelMueble(params, m)[pared];
  return falta > 0.001 ? { pared, falta, margen } : null;
}

// ---------- v1.43.2: la puerta contra muebles, mesadas y tabiques ----------

/** Un rectángulo en planta: centro, sus dos ejes (de largo 1), medias medidas y de qué altura a qué altura va. */
const rectangulo = (centro, u, v, mu, mv, y0, y1, nombre) => ({ centro, u, v, mu, mv, y0, y1, nombre });
const dentro = (r, [x, z]) => {
  const d = [x - r.centro[0], z - r.centro[1]];
  return Math.abs(d[0] * r.u[0] + d[1] * r.u[1]) < r.mu - 0.005 && Math.abs(d[0] * r.v[0] + d[1] * r.v[1]) < r.mv - 0.005;
};

/** Pasa un punto del mueble (x a lo ancho, z hacia su frente) a la planta, con la misma rotación que el 3D. */
function aPlanta(params, m) {
  const { centro, angulo } = ubicarMueble(params, m);
  const [c, s] = [Math.cos(angulo), Math.sin(angulo)];
  return ([lx, lz]) => [centro[0] + lx * c + lz * s, centro[1] - lx * s + lz * c];
}

/**
 * Lugar que ocupa la puerta abierta: puntos de muestra en planta (del cuarto de círculo de cada hoja, o del rectángulo
 * de la puerta rebatible) y de qué altura a qué altura (desde el piso del nivel).
 */
export function zonaDePuerta(params, m) {
  const r = margenDePuerta(m);
  if (!(r > 0)) return null;
  const { ancho: a, profundidad: p, alto: h } = m;
  const elev = m.elevacion ?? 0;
  const puntos = [];
  const hoja = (hx, desde) => {
    for (let i = 1; i <= 4; i++) {
      for (let k = 0; k <= 6; k++) {
        const t = desde + (k / 6) * (Math.PI / 2);
        puntos.push([hx + (r * i / 4) * Math.sin(t), p / 2 + (r * i / 4) * Math.cos(t)]);
      }
    }
  };
  if (m.puerta === 'izquierda') hoja(-a / 2, 0);
  if (m.puerta === 'derecha') hoja(a / 2, -Math.PI / 2);
  if (m.puerta === 'dos') { hoja(-a / 2, 0); hoja(a / 2, -Math.PI / 2); }
  if (m.puerta === 'abajo') {
    for (let i = 0; i <= 4; i++) for (let k = 1; k <= 4; k++) puntos.push([-a / 2 + (a * i) / 4, p / 2 + (r * k) / 4]);
  }
  const esLavarropas = TIPOS_MUEBLE[m.tipo]?.forma === 'lavarropas';
  const [y0, y1] = m.puerta === 'abajo' ? [elev, elev + h * 0.4] : esLavarropas ? [elev + h * 0.15, elev + h * 0.75] : [elev, elev + h];
  const aMundo = aPlanta(params, m);
  return { puntos: puntos.map(aMundo), y0, y1 };
}

/** Lo que puede estar adelante de una puerta: los otros muebles, las mesadas y los tabiques del mismo nivel. */
function obstaculosDe(params, m) {
  return obstaculosDelNivel(params, m.nivel ?? 'piso', { sinMueble: m.id });
}

/**
 * v1.45: muebles, mesadas y tabiques de un nivel como rectángulos en planta ({ centro, u, v, mu, mv, y0, y1, nombre }).
 * Lo usan las puertas (con qué chocan) y las personas (por dónde no pueden caminar).
 * @param opciones.sinMueble  id de un mueble que no cuenta (el de la puerta)
 * @param opciones.huecoPuertas  los tabiques con puerta dejan su hueco libre (para pasar caminando)
 */
export function obstaculosDelNivel(params, nivel, { sinMueble = null, huecoPuertas = false } = {}) {
  const lista = [];
  (params.muebles ?? []).filter((o) => o.id !== sinMueble && (o.nivel ?? 'piso') === nivel).forEach((o) => {
    const { centro, angulo } = ubicarMueble(params, o);
    const [c, s] = [Math.cos(angulo), Math.sin(angulo)];
    const e = o.elevacion ?? 0;
    lista.push(rectangulo(centro, [c, -s], [s, c], o.ancho / 2, o.profundidad / 2, e, e + o.alto, o.nombre || TIPOS_MUEBLE[o.tipo]?.nombre));
  });
  (params.mesadas ?? []).filter((x) => (x.nivel ?? 'piso') === nivel).forEach((x) => {
    tramosDeMesada(params, x).forEach((t) => {
      const fondo = x.profundidad + 0.02; // con el vuelo de la tapa
      const centro = [t.origen[0] + t.alongo[0] * t.largo / 2 + t.adentro[0] * fondo / 2, t.origen[1] + t.alongo[1] * t.largo / 2 + t.adentro[1] * fondo / 2];
      lista.push(rectangulo(centro, t.alongo, t.adentro, t.largo / 2, fondo / 2, 0, x.alto, x.nombre));
    });
  });
  (params.tabiques ?? []).filter((t) => (t.nivel ?? 'piso') === nivel).forEach((t) => {
    const { inicio, direccion, normal } = ubicarTabique(params, t);
    const tramo = (a, b) => {
      if (b - a < 0.01) return;
      const centro = [inicio[0] + direccion[0] * (a + b) / 2, inicio[1] + direccion[1] * (a + b) / 2];
      lista.push(rectangulo(centro, direccion, normal, (b - a) / 2, MEDIO_ESPESOR_TABIQUE, 0, Infinity, t.nombre));
    };
    const puerta = t.puerta;
    if (huecoPuertas && puerta && puerta.tipo !== 'ninguna') {
      tramo(0, puerta.desde); // de un lado y del otro del hueco de la puerta
      tramo(puerta.desde + puerta.ancho, t.largo);
    } else tramo(0, t.largo);
  });
  return lista;
}

/**
 * Con qué choca la puerta abierta (además de la pared de enfrente, ver puertaQueChoca): nombres de los muebles,
 * mesadas y tabiques que caen en su lugar y a su altura.
 */
export function puertaChocaCon(params, m) {
  const zona = zonaDePuerta(params, m);
  if (!zona) return [];
  return [...new Set(obstaculosDe(params, m)
    .filter((o) => o.y0 < zona.y1 - 0.01 && o.y1 > zona.y0 + 0.01 && zona.puntos.some((q) => dentro(o, q)))
    .map((o) => o.nombre))];
}

/** Puntos de muestra de un rectángulo del mueble (x de x0 a x1, z de z0 a z1), en su sistema (x a lo ancho, z al frente). */
function muestras(x0, x1, z0, z1) {
  const puntos = [];
  for (let i = 0; i <= 4; i++) for (let k = 0; k <= 4; k++) puntos.push([x0 + ((x1 - x0) * i) / 4, z0 + ((z1 - z0) * k) / 4]);
  return puntos;
}

/**
 * v1.43.2: cajones abiertos de la cama que dan contra otro mueble, una mesada o un tabique: [{ lado, con: [nombres] }].
 * (Contra las paredes los avisa cajonesQueChocan.)
 */
export function cajonesChocanCon(params, m) {
  if (TIPOS_MUEBLE[m.tipo]?.forma !== 'cama') return [];
  const { ancho: a, profundidad: p, alto: h } = m;
  const abre = m.aperturaCajones ?? 0.4;
  const z0 = -p / 2 + 0.12;
  const z1 = p / 2 - 0.04;
  const zonas = [
    ['izquierda', m.cajonesIzquierda, muestras(-a / 2 - abre, -a / 2 - 0.01, z0, z1)],
    ['derecha', m.cajonesDerecha, muestras(a / 2 + 0.01, a / 2 + abre, z0, z1)],
    ['pies', m.cajonesPies, muestras(-a / 2 + 0.04, a / 2 - 0.04, p / 2 + 0.01, p / 2 + abre)],
  ];
  const aMundo = aPlanta(params, m);
  const elev = m.elevacion ?? 0;
  const [y0, y1] = [elev, elev + h * 0.55]; // los cajones van en la base de la cama
  const obstaculos = obstaculosDe(params, m).filter((o) => o.y0 < y1 - 0.01 && o.y1 > y0 + 0.01);
  return zonas.filter(([, tiene]) => tiene).map(([lado, , puntos]) => {
    const enMundo = puntos.map(aMundo);
    return { lado, con: [...new Set(obstaculos.filter((o) => enMundo.some((q) => dentro(o, q))).map((o) => o.nombre))] };
  }).filter((c) => c.con.length > 0);
}

/**
 * v1.40.1: cajones de la cama. Izquierda y derecha = mirando la cama desde los pies. `aperturaCajones` = cuánto salen
 * abiertos (se dibuja sombreado y se avisa si chocan con una pared).
 */
export const CAJONES_CAMA = { cajonesIzquierda: false, cajonesDerecha: false, cajonesPies: false, aperturaCajones: 0.4 };

// Hacia qué pared mira cada lado del mueble según el giro (0, 90, 180, 270): su derecha (+x) y sus pies / frente (+z).
const DERECHA_SEGUN_GIRO = ['derecha', 'fondo', 'izquierda', 'frente'];
const FRENTE_SEGUN_GIRO = ['frente', 'derecha', 'fondo', 'izquierda'];
const OPUESTA = { derecha: 'izquierda', izquierda: 'derecha', frente: 'fondo', fondo: 'frente' };

/** Pared de la casa (izquierda, derecha, frente, fondo) hacia la que da un lado del mueble ('derecha', 'izquierda', 'pies'). */
export function paredHacia(m, lado) {
  const k = ((m.giro ?? 0) / 90) % 4;
  if (lado === 'derecha') return DERECHA_SEGUN_GIRO[k];
  if (lado === 'izquierda') return OPUESTA[DERECHA_SEGUN_GIRO[k]];
  return FRENTE_SEGUN_GIRO[k]; // pies
}

/** Cajones abiertos que chocan con una pared: [{ lado, pared, falta }]. */
export function cajonesQueChocan(params, m) {
  if (TIPOS_MUEBLE[m.tipo]?.forma !== 'cama') return [];
  const d = distanciasDelMueble(params, m);
  return [['izquierda', m.cajonesIzquierda], ['derecha', m.cajonesDerecha], ['pies', m.cajonesPies]]
    .filter(([, tiene]) => tiene)
    .map(([lado]) => ({ lado, pared: paredHacia(m, lado), falta: m.aperturaCajones - d[paredHacia(m, lado)] }))
    .filter((c) => c.falta > 0.001);
}

/** Lo que mide la planta POR DENTRO (de cara a cara de la estructura): a lo largo del frente y hacia el fondo. */
function plantaPorDentro(params) {
  const frente = largoLado(params.ladoFrente, params);
  const fondo = largoLado(LADOS[(LADOS.indexOf(params.ladoFrente) + 1) % 4], params);
  return { ancho: frente - 2 * MEDIA_PARED, fondo: fondo - 2 * MEDIA_PARED };
}

/** Lo que ocupa en planta (girado 90° o 270°, se cruzan ancho y profundidad). */
function ocupaEnPlanta(m) {
  const girado = m.giro === 90 || m.giro === 270;
  return { anchoPlanta: girado ? m.profundidad : m.ancho, profPlanta: girado ? m.ancho : m.profundidad };
}

/**
 * Distancias del mueble a las caras de adentro de las cuatro paredes (izquierda = lateral izquierdo
 * mirando el frente desde afuera). Las dos que se cargan y las otras dos calculadas.
 */
export function distanciasDelMueble(params, m) {
  const { ancho, fondo } = plantaPorDentro(params);
  const { anchoPlanta, profPlanta } = ocupaEnPlanta(m);
  const izquierda = m.desdeLateral === 'derecho' ? ancho - m.distanciaLateral - anchoPlanta : m.distanciaLateral;
  const frente = m.desdeFrente === 'fondo' ? fondo - m.distanciaFrente - profPlanta : m.distanciaFrente;
  return { izquierda, derecha: ancho - izquierda - anchoPlanta, frente, fondo: fondo - frente - profPlanta };
}

const redondearCm = (n) => Math.round(n * 100) / 100;

/**
 * v1.44: mueve el mueble lo que se lo arrastró en el 3D (dx, dz en metros, en la planta). Conserva desde qué paredes
 * se mide: si se mide desde la derecha, ir a la derecha achica esa distancia. Devuelve el mueble cambiado.
 */
export function moverMueble(params, m, dx, dz) {
  const frente = geometriaLados(params)[params.ladoFrente];
  const derecha = frente.direccion;
  const adentro = haciaAdentro(frente);
  const du = dx * derecha[0] + dz * derecha[1]; // hacia el lateral derecho
  const dv = dx * adentro[0] + dz * adentro[1]; // hacia el fondo
  return {
    ...m,
    distanciaLateral: redondearCm(m.distanciaLateral + (m.desdeLateral === 'derecho' ? -du : du)),
    distanciaFrente: redondearCm(m.distanciaFrente + (m.desdeFrente === 'fondo' ? -dv : dv)),
  };
}

/**
 * v1.44: gira el mueble 90° (sentido +1 o -1) sin que se corra su centro: como cambia lo que ocupa en planta, las
 * distancias a las paredes se acomodan.
 */
export function girarMueble(m, sentido = 1) {
  const antes = ocupaEnPlanta(m);
  const giro = (((m.giro + 90 * sentido) % 360) + 360) % 360;
  const despues = ocupaEnPlanta({ ...m, giro });
  return {
    ...m, giro,
    distanciaLateral: redondearCm(m.distanciaLateral + (antes.anchoPlanta - despues.anchoPlanta) / 2),
    distanciaFrente: redondearCm(m.distanciaFrente + (antes.profPlanta - despues.profPlanta) / 2),
  };
}

/**
 * Dónde va el mueble en el 3D: centro, ángulo y altura del piso.
 * Con giro 0 su ancho va a lo largo del frente y su frente mira hacia el frente de la casa.
 */
export function ubicarMueble(params, m) {
  const frente = geometriaLados(params)[params.ladoFrente];
  const derecha = frente.direccion;
  const adentro = haciaAdentro(frente);
  const { anchoPlanta, profPlanta } = ocupaEnPlanta(m);
  const d = distanciasDelMueble(params, m);
  const u = MEDIA_PARED + d.izquierda + anchoPlanta / 2;
  const v = MEDIA_PARED + d.frente + profPlanta / 2;
  const centro = [frente.p1[0] + derecha[0] * u + adentro[0] * v, frente.p1[1] + derecha[1] * u + adentro[1] * v];
  const angulo = Math.atan2(-derecha[1], derecha[0]) + (m.giro * Math.PI) / 180;
  return { centro, angulo, y: alturaDelPiso(params, m.nivel) + (m.elevacion ?? 0), anchoPlanta, profPlanta };
}

const ALTO_ENTREPISO = 0.12; // tirantes del piso 2: lo que baja el "techo" de la planta baja bajo el entrepiso

/** ¿El punto (x, z) cae bajo el entrepiso? */
function bajoElEntrepiso(params, [x, z]) {
  if (!(params.anchoEntrepiso > 0)) return false;
  const geo = geometriaLados(params)[params.ladoEntrepiso];
  const { inicio, largo } = tramoEntrepiso(params);
  const v = haciaAdentro(geo);
  const dx = x - geo.p1[0];
  const dz = z - geo.p1[1];
  const a = dx * geo.direccion[0] + dz * geo.direccion[1]; // a lo largo de la pared del entrepiso
  const b = dx * v[0] + dz * v[1]; // hacia adentro
  return a > inicio - 1e-6 && a < inicio + largo + 1e-6 && b > -1e-6 && b < params.anchoEntrepiso + 1e-6;
}

/**
 * Cuánto queda libre arriba del mueble hasta la estructura del techo (o del piso 2, si está debajo del
 * entrepiso). Se toma la esquina más baja (el techo tiene pendiente).
 * @returns {{ libre: number, hasta: 'techo' | 'piso2' }}
 */
export function libreArribaDelMueble(params, m) {
  const { centro, angulo } = ubicarMueble(params, m);
  const piso2 = params.alturaPiso2 ?? ALTURA_PISO_2;
  const [c, s] = [Math.cos(angulo), Math.sin(angulo)];
  const [a, p] = [m.ancho, m.profundidad]; // en coordenadas del mueble (el giro lo pone el ángulo)
  const esquinas = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sz]) => {
    const lx = (sx * a) / 2;
    const lz = (sz * p) / 2;
    return [centro[0] + lx * c + lz * s, centro[1] - lx * s + lz * c]; // la misma rotación que el 3D
  });
  // Para cada esquina: hasta dónde llega y contra qué (el techo o los tirantes del piso 2).
  const tope = esquinas.map((q) => {
    if (m.nivel === 'piso2') return { altura: alturaEn(q[0], q[1], params) - piso2, hasta: 'techo' };
    return bajoElEntrepiso(params, q) ? { altura: piso2 - ALTO_ENTREPISO, hasta: 'piso2' } : { altura: alturaEn(q[0], q[1], params), hasta: 'techo' };
  }).reduce((menor, t) => (t.altura < menor.altura ? t : menor));
  return { libre: tope.altura - ALTO_PISO - (m.elevacion ?? 0) - m.alto, hasta: tope.hasta };
}

export function validarMueble(m, params) {
  if (!(m.tipo in TIPOS_MUEBLE)) return 'Tipo de mueble desconocido';
  if (!(m.material in MATERIALES_MUEBLE)) return 'Material desconocido';
  const num = (v, min, max) => Number.isFinite(v) && v >= min && v <= max;
  if (!num(m.ancho, 0.05, 10) || !num(m.profundidad, 0.05, 10) || !num(m.alto, 0.02, 4)) return 'Medidas de 5 cm a 10 m (alto hasta 4 m)';
  if (!num(m.distanciaFrente, -1, 50) || !num(m.distanciaLateral, -1, 50)) return 'Distancias inválidas';
  if (!['izquierdo', 'derecho'].includes(m.desdeLateral) || !['frente', 'fondo'].includes(m.desdeFrente)) return 'Elegí desde qué pared se mide';
  if (m.cargaFrontal !== undefined && typeof m.cargaFrontal !== 'boolean') return 'Valor inválido';
  if (['cajonesIzquierda', 'cajonesDerecha', 'cajonesPies'].some((c) => m[c] !== undefined && typeof m[c] !== 'boolean')) return 'Valor inválido';
  if (m.aperturaCajones !== undefined && !num(m.aperturaCajones, 0.05, 1.5)) return 'Los cajones abren de 5 cm a 1,50 m';
  if (m.puerta !== undefined && !PUERTAS_MUEBLE.some(([v]) => v === m.puerta)) return 'Elegí cómo abre la puerta';
  if (m.elevacion !== undefined && !num(m.elevacion, 0, 3)) return 'La altura desde el piso va de 0 a 3 m';
  if (![0, 90, 180, 270].includes(m.giro)) return 'Giro de 0, 90, 180 o 270°';
  if (!['piso', 'piso2'].includes(m.nivel)) return 'Elegí planta baja o piso 2';
  if (m.nivel === 'piso2' && !(params.anchoEntrepiso > 0)) return 'No hay entrepiso';
  if (typeof m.nombre !== 'string' || m.nombre.length > 40) return 'El nombre puede tener hasta 40 letras';
  if (m.mostrarEtiqueta !== undefined && typeof m.mostrarEtiqueta !== 'boolean') return 'Valor inválido';
  if (!colorOpcional(m.color)) return 'Color inválido';
  return null;
}

/** ¿Se sale de la planta? (aviso, no error: se puede ir acomodando) */
export function muebleFueraDeLaPlanta(params, m) {
  const d = distanciasDelMueble(params, m);
  return Object.values(d).some((v) => v < -0.001);
}

/**
 * v1.39: completa un mueble guardado. Los de la v1.38 medían desde el EJE del lateral izquierdo y del frente:
 * pasan a medirse desde la cara de adentro (6 cm menos), así no se mueven.
 */
export function completarMueble(m) {
  const base = { mostrarEtiqueta: true, color: '', ...m };
  if (base.distanciaLateral === undefined && Number.isFinite(base.distanciaIzquierda)) {
    const { distanciaIzquierda, ...resto } = base;
    return completarMueble({ ...resto, desdeLateral: 'izquierdo', distanciaLateral: distanciaIzquierda - MEDIA_PARED,
      desdeFrente: 'frente', distanciaFrente: (base.distanciaFrente ?? 0) - MEDIA_PARED });
  }
  return {
    ...base,
    desdeLateral: base.desdeLateral === 'derecho' ? 'derecho' : 'izquierdo',
    desdeFrente: base.desdeFrente === 'fondo' ? 'fondo' : 'frente',
    ...(TIPOS_MUEBLE[base.tipo]?.forma === 'lavarropas' ? { cargaFrontal: base.cargaFrontal !== false } : {}),
    ...(TIPOS_MUEBLE[base.tipo]?.forma === 'cama' ? { ...CAJONES_CAMA, ...base } : {}), // v1.40.1: sin cajones
    // v1.42.1: los de antes, con la puerta de su tipo y en el piso.
    puerta: PUERTAS_MUEBLE.some(([v]) => v === base.puerta) ? base.puerta : (TIPOS_MUEBLE[base.tipo]?.puerta ?? 'ninguna'),
    elevacion: Number.isFinite(base.elevacion) ? base.elevacion : 0,
  };
}

// ---------- v1.49: el mueble contra las paredes y lo demás; apoyarlo sobre una mesada ----------

const NOMBRE_PARED = { izquierda: 'el lateral izquierdo', derecha: 'el lateral derecho', frente: 'el frente', fondo: 'el fondo' };

/** ¿Dos rectángulos en planta se pisan? (separación de ejes: alcanza con probar los 4 ejes de los dos) */
function sePisan(a, b) {
  const ejes = [a.u, a.v, b.u, b.v];
  const d = [b.centro[0] - a.centro[0], b.centro[1] - a.centro[1]];
  const radio = (r, e) => r.mu * Math.abs(r.u[0] * e[0] + r.u[1] * e[1]) + r.mv * Math.abs(r.v[0] * e[0] + r.v[1] * e[1]);
  return ejes.every((e) => Math.abs(d[0] * e[0] + d[1] * e[1]) < radio(a, e) + radio(b, e) - 0.005);
}

/** El mueble como rectángulo en planta (centro, ejes y medias medidas) con su alto. */
function rectanguloDelMueble(params, m) {
  const { centro, angulo } = ubicarMueble(params, m);
  const [c, s] = [Math.cos(angulo), Math.sin(angulo)];
  const e = m.elevacion ?? 0;
  return { centro, u: [c, -s], v: [s, c], mu: m.ancho / 2, mv: m.profundidad / 2, y0: e, y1: e + m.alto };
}

/**
 * v1.49: con qué choca el mueble. `paredes`: por dónde se sale de la planta y cuánto; `con`: nombres de los muebles,
 * mesadas y tabiques que se pisan con él a la misma altura (lo que está apoyado arriba de otra cosa no choca con ella).
 * @returns {{ paredes: { pared, nombre, sale }[], con: string[] }}
 */
export function choquesDelMueble(params, m) {
  const d = distanciasDelMueble(params, m);
  const paredes = Object.entries(d).filter(([, v]) => v < -0.005).map(([pared, v]) => ({ pared, nombre: NOMBRE_PARED[pared], sale: -v }));
  const yo = rectanguloDelMueble(params, m);
  const con = obstaculosDelNivel(params, m.nivel ?? 'piso', { sinMueble: m.id })
    .filter((o) => o.y0 < yo.y1 - 0.01 && o.y1 > yo.y0 + 0.01 && sePisan(yo, o))
    .map((o) => o.nombre);
  return { paredes, con: [...new Set(con)] };
}

/** Texto del aviso ("⚠ Se sale por el fondo 0,35 m · choca con Sillón"), o '' si no choca. */
export function avisoDeChoques({ paredes, con }) {
  const f2 = (n) => n.toFixed(2).replace('.', ',');
  const partes = [
    ...paredes.map((p) => `se sale por ${p.nombre} ${f2(p.sale)} m`),
    ...(con.length ? [`choca con ${con.join(', ')}`] : []),
  ];
  return partes.length ? `⚠ ${partes.join(' · ').replace(/^./, (l) => l.toUpperCase())}` : '';
}

/**
 * v1.49: lo deja adentro de la planta (si entra): corre las distancias negativas a 0. Lo usa el arrastre del 3D, para
 * que no quede medio sillón afuera. Si no entra de ancho o de fondo, lo deja centrado en ese sentido.
 */
export function encerrarEnLaPlanta(params, m) {
  const { ancho, fondo } = plantaPorDentro(params);
  const { anchoPlanta, profPlanta } = ocupaEnPlanta(m);
  const d = distanciasDelMueble(params, m);
  const acomodar = (desde, hasta, total, ocupa) => {
    if (ocupa >= total) return (total - ocupa) / 2; // no entra: centrado
    return Math.min(Math.max(desde, 0), total - ocupa); // la distancia a "desde", entre 0 y lo que sobra
  };
  const izquierda = acomodar(d.izquierda, d.derecha, ancho, anchoPlanta);
  const frente = acomodar(d.frente, d.fondo, fondo, profPlanta);
  return {
    ...m,
    distanciaLateral: redondearCm(m.desdeLateral === 'derecho' ? ancho - izquierda - anchoPlanta : izquierda) + 0, // + 0: sin -0
    distanciaFrente: redondearCm(m.desdeFrente === 'fondo' ? fondo - frente - profPlanta : frente) + 0,
  };
}

/**
 * v1.49: a qué altura queda apoyado un mueble chico (cafetera, horno de aire…) en el lugar donde está: arriba de la
 * mesada o del mueble que tenga abajo (el más alto que pise su centro), o en el piso. Los tabiques no cuentan.
 */
export function alturaDeApoyo(params, m) {
  const { centro } = ubicarMueble(params, m);
  const debajo = obstaculosDelNivel(params, m.nivel ?? 'piso', { sinMueble: m.id })
    .filter((o) => Number.isFinite(o.y1) && o.y1 < 2.5 && dentro({ ...o, mu: o.mu + 0.005, mv: o.mv + 0.005 }, centro));
  return redondearCm(Math.max(0, ...debajo.map((o) => o.y1)));
}

/** ¿El mueble se apoya solo sobre lo que tenga abajo? (los electrodomésticos chicos, de fábrica) */
export const seApoya = (m) => m.apoyado ?? Boolean(TIPOS_MUEBLE[m.tipo]?.apoyable);
