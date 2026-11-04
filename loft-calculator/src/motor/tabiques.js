// ==========================================================
// TABIQUES (v1.41): divisiones interiores de Durlock (baño, antebaño, ducha)
// ----------------------------------------------------------
// Decisiones de Leandro (31/10 y 04/11): estructura con un perfil de la lista
// (ej. steel frame 70 mm), revestimiento POR CARA de la lista (Durlock común,
// verde para húmedos, cementicia…), con puerta de abrir o corrediza tipo
// granero. El cerramiento de la ducha es un tabique más.
//   Se ubica desde una pared:
//     - perpendicular: sale de la pared hacia adentro, a `desde` de la esquina
//       (vista desde afuera, como las aberturas), y mide `largo`;
//     - paralelo: corre a `separacion` de la cara de adentro de la pared,
//       arrancando a `desde` de la esquina, y mide `largo`.
//   Alto: hasta el techo (sigue la pendiente), hasta el piso 2 o una medida.
//   Estructura: solera abajo (cortada en la puerta), solera arriba, montantes
//   cada X, jambas y dintel de la puerta con montantes cortos arriba.
// ==========================================================

import { geometriaLados, largoLado, alturaEn, tramoEntrepiso } from './geometria.js';
import { haciaAdentro, pieza, cm } from './segmentos.js';
import { LADOS, ALTURA_PISO_2 } from './constantes.js';

const ALTO_PISO = 0.09; // piso terminado sobre la estructura (como mesadas y muebles)
const MEDIA_PARED = 0.06; // cara de adentro de la pared
const ALTO_ENTREPISO = 0.12; // tirantes del piso 2

/** Medio espesor de un tabique terminado (montante de 70 mm + una placa), para apoyar cosas contra su cara. */
export const MEDIO_ESPESOR_TABIQUE = 0.05;

/**
 * v1.41.1: lo que limita una pared por dentro: sus dos esquinas (cara de adentro de la pared de al lado) y las dos
 * caras de cada tabique que sale de ella (perpendicular, del mismo nivel). Distancias desde la punta 1 de la pared.
 * @returns {{ d: number, nombre: string }[]} ordenados
 */
export function limitesSobrePared(params, lado, nivel = 'piso') {
  const largo = largoLado(lado, params);
  const limites = [{ d: MEDIA_PARED, nombre: 'la esquina' }, { d: largo - MEDIA_PARED, nombre: 'la esquina' }];
  (params.tabiques ?? []).filter((t) => t.lado === lado && t.orientacion === 'perpendicular' && (t.nivel ?? 'piso') === nivel)
    .forEach((t) => {
      const d = t.ladoReferencia === 'izquierda' ? t.desde : largo - t.desde;
      limites.push({ d: d - MEDIO_ESPESOR_TABIQUE, nombre: t.nombre, tabique: t.id, eje: d }, { d: d + MEDIO_ESPESOR_TABIQUE, nombre: t.nombre, tabique: t.id, eje: d });
    });
  return limites.sort((a, b) => a.d - b.d);
}

export const TIPOS_PUERTA = [['ninguna', 'Sin puerta'], ['abatir', 'De abrir'], ['granero', 'Corrediza (granero)']];
export const PUERTA_NUEVA = { tipo: 'ninguna', desde: 0.1, ancho: 0.7, alto: 2.0, cara: 'B' };

export const TABIQUE_NUEVO = {
  nombre: 'Tabique',
  nivel: 'piso',
  lado: 'B',
  ladoReferencia: 'izquierda',
  desde: 1.5, // distancia de la esquina (por afuera, como las aberturas)
  orientacion: 'perpendicular', // 'perpendicular' (sale de la pared) | 'paralelo' (corre al lado de la pared)
  separacion: 1.2, // paralelo: distancia a la cara de adentro de la pared
  largo: 1.5,
  alto: 'techo', // 'techo' | 'piso2' | 'medida'
  altoMedida: 2.4,
  separacionMontantes: 0.4,
  perfil: '', // id de la lista de perfiles ('' = el general de "Estructura de tabiques")
  revestimientoA: '', // cara A (ver carasDelTabique); '' = sin
  revestimientoB: '',
  puerta: { ...PUERTA_NUEVA },
  mostrarEtiqueta: true,
};

export function tabiqueNuevo(tabiques, id) {
  return { ...structuredClone(TABIQUE_NUEVO), id, nombre: `Tabique ${tabiques.length + 1}` };
}

/** Qué mira cada cara, para mostrar ("cara A: hacia la esquina izquierda"…). */
export function carasDelTabique(t) {
  return t.orientacion === 'paralelo'
    ? { A: 'hacia la pared', B: 'hacia adentro' }
    : { A: 'hacia la esquina izquierda (vista de afuera)', B: 'hacia la esquina derecha (vista de afuera)' };
}

/**
 * Línea del tabique: punto de arranque (en su eje), dirección a lo largo y normal (de la cara A a la cara B).
 * @returns {{ inicio: [x, z], direccion: [x, z], normal: [x, z] }}
 */
export function ubicarTabique(params, t) {
  const geo = geometriaLados(params)[t.lado];
  const largoPared = largoLado(t.lado, params);
  const adentro = haciaAdentro(geo);
  const sobre = (d, hacia) => [geo.p1[0] + geo.direccion[0] * d + adentro[0] * hacia, geo.p1[1] + geo.direccion[1] * d + adentro[1] * hacia];
  if (t.orientacion === 'paralelo') {
    const d0 = t.ladoReferencia === 'izquierda' ? t.desde : largoPared - t.desde - t.largo;
    return { inicio: sobre(d0, MEDIA_PARED + t.separacion), direccion: geo.direccion, normal: adentro };
  }
  const d = t.ladoReferencia === 'izquierda' ? t.desde : largoPared - t.desde;
  return { inicio: sobre(d, MEDIA_PARED), direccion: adentro, normal: geo.direccion };
}

/** ¿El punto (x, z) cae bajo el entrepiso? */
function bajoElEntrepiso(params, [x, z]) {
  if (!(params.anchoEntrepiso > 0)) return false;
  const geo = geometriaLados(params)[params.ladoEntrepiso];
  const { inicio, largo } = tramoEntrepiso(params);
  const v = haciaAdentro(geo);
  const a = (x - geo.p1[0]) * geo.direccion[0] + (z - geo.p1[1]) * geo.direccion[1];
  const b = (x - geo.p1[0]) * v[0] + (z - geo.p1[1]) * v[1];
  return a > inicio - 1e-6 && a < inicio + largo + 1e-6 && b > -1e-6 && b < params.anchoEntrepiso + 1e-6;
}

/** Alto del tabique (desde el piso terminado) en un punto. */
function altoEn(params, t, punto) {
  const piso2 = params.alturaPiso2 ?? ALTURA_PISO_2;
  if (t.alto === 'medida') return t.altoMedida;
  if (t.nivel === 'piso2') return alturaEn(punto[0], punto[1], params) - piso2 - ALTO_PISO;
  if (t.alto === 'piso2' || bajoElEntrepiso(params, punto)) return piso2 - ALTO_ENTREPISO - ALTO_PISO;
  return alturaEn(punto[0], punto[1], params) - ALTO_PISO;
}

/** Alto en las dos puntas: [al arrancar, al terminar]. */
export function altosDelTabique(params, t) {
  const { inicio, direccion } = ubicarTabique(params, t);
  const fin = [inicio[0] + direccion[0] * t.largo, inicio[1] + direccion[1] * t.largo];
  return [altoEn(params, t, inicio), altoEn(params, t, fin)];
}

const alturaDelPiso = (params, nivel) => params.elevacion + (nivel === 'piso2' ? (params.alturaPiso2 ?? ALTURA_PISO_2) : 0) + ALTO_PISO;

function montantesDe([a, b], separacion) {
  const n = Math.max(1, Math.ceil((b - a) / separacion - 0.01));
  return Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n);
}

/** Piezas, paños por cara y dibujo de un tabique. */
export function generarTabique(params, t) {
  const { inicio, direccion, normal } = ubicarTabique(params, t);
  const y0 = alturaDelPiso(params, t.nivel);
  const [h0, h1] = altosDelTabique(params, t);
  const L = t.largo;
  const arriba = (x) => h0 + ((h1 - h0) * x) / L;
  const p = (x, h) => [inicio[0] + direccion[0] * x, y0 + h, inicio[1] + direccion[1] * x];
  const extra = { ...(t.perfil ? { perfilPared: t.perfil, ladoPared: t.nombre } : {}), tabique: t.id };
  const pz = (id, desde, hasta) => ({ ...pieza(`tabique:${t.id}:${id}`, 'tabique', ['tabique'], desde, hasta), ...extra });
  const conPuerta = t.puerta && t.puerta.tipo !== 'ninguna';
  const pa = conPuerta ? t.puerta.desde : null;
  const pb = conPuerta ? t.puerta.desde + t.puerta.ancho : null;
  const enPuerta = (x) => conPuerta && x > pa + 0.005 && x < pb - 0.005;
  const piezas = [];

  // Soleras: la de abajo se corta en la puerta; la de arriba sigue la pendiente del techo.
  const abajo = conPuerta ? [[0, pa], [pb, L]].filter(([a, b]) => b - a > 0.01) : [[0, L]];
  abajo.forEach(([a, b], i) => piezas.push(pz(`solera-abajo:${i}`, p(a, 0), p(b, 0))));
  piezas.push(pz('solera-arriba', p(0, h0), p(L, h1)));
  // Montantes parejos (fuera de la puerta) y las jambas; arriba de la puerta, montantes cortos.
  const xs = [...new Set([...montantesDe([0, L], t.separacionMontantes), ...(conPuerta ? [pa, pb] : [])].map((x) => Number(x.toFixed(4))))].sort((a, b) => a - b);
  xs.forEach((x) => {
    if (enPuerta(x)) piezas.push(pz(`montante-corto:${cm(x)}`, p(x, t.puerta.alto), p(x, arriba(x))));
    else piezas.push(pz(`montante:${cm(x)}`, p(x, 0), p(x, arriba(x))));
  });
  if (conPuerta) piezas.push(pz('dintel', p(pa, t.puerta.alto), p(pb, t.puerta.alto)));

  // Paños de cada cara (la puerta se descuenta) y el dibujo.
  const area = (L * (h0 + h1)) / 2 - (conPuerta ? t.puerta.ancho * t.puerta.alto : 0);
  const huecos = conPuerta ? [{ desde: pa, hasta: pb, abajo: 0, arriba: t.puerta.alto }] : [];
  const panos = [];
  const caras = carasDelTabique(t);
  [['A', t.revestimientoA], ['B', t.revestimientoB]].filter(([, rev]) => rev).forEach(([cara, rev]) => {
    panos.push({ panel: rev, largo: L, h1: h0, h2: h1, neto: area, huecos, donde: `${t.nombre} (cara ${cara}: ${caras[cara]})` });
  });
  return {
    id: t.id, nombre: t.nombre, piezas, panos, mostrarEtiqueta: t.mostrarEtiqueta !== false,
    puerta: conPuerta ? t.puerta.tipo : null,
    dibujo: {
      esquinas: [p(0, 0), p(L, 0), p(L, h1), p(0, h0)], // [abajo inicio, abajo fin, arriba fin, arriba inicio]
      normal: [normal[0], 0, normal[1]],
      revestimientoA: t.revestimientoA, revestimientoB: t.revestimientoB,
      huecos,
      puerta: conPuerta ? {
        tipo: t.puerta.tipo, cara: t.puerta.cara === 'A' ? -1 : 1,
        esquinas: [p(pa, 0), p(pb, 0), p(pb, t.puerta.alto), p(pa, t.puerta.alto)],
        direccion: [direccion[0], 0, direccion[1]],
      } : null,
      centroArriba: p(L / 2, Math.max(h0, h1)),
    },
  };
}

/** Todos los tabiques de la obra. */
export function generarTabiques(params) {
  if (params.tipoProyecto !== 'construccion') return [];
  return (params.tabiques ?? []).map((t) => generarTabique(params, t));
}

/** Completa un tabique guardado (campos nuevos con su valor de fábrica). */
export function completarTabique(t) {
  const base = t && typeof t === 'object' ? t : {};
  return { ...structuredClone(TABIQUE_NUEVO), ...base, puerta: { ...PUERTA_NUEVA, ...(base.puerta ?? {}) } };
}

/** Errores de carga de un tabique. */
export function validarTabique(t, params) {
  const num = (v, min, max) => Number.isFinite(v) && v >= min && v <= max;
  if (!LADOS.includes(t.lado)) return 'Elegí una pared';
  if (!['perpendicular', 'paralelo'].includes(t.orientacion)) return 'Elegí perpendicular o paralelo';
  if (!['piso', 'piso2'].includes(t.nivel)) return 'Elegí planta baja o piso 2';
  if (t.nivel === 'piso2' && !(params.anchoEntrepiso > 0)) return 'No hay entrepiso';
  if (!num(t.largo, 0.3, 20)) return 'El largo va de 0,30 a 20 m';
  if (!num(t.desde, 0, 50)) return 'La distancia a la esquina no puede ser negativa';
  const largoPared = largoLado(t.lado, params);
  if (t.orientacion === 'paralelo' && t.desde + t.largo > largoPared + 0.001) return 'El tabique no entra a lo largo de esa pared';
  if (t.orientacion === 'perpendicular' && t.desde > largoPared + 0.001) return 'La distancia a la esquina es más larga que la pared';
  if (t.orientacion === 'paralelo' && !num(t.separacion, 0.05, 20)) return 'La separación de la pared va de 5 cm a 20 m';
  if (!['techo', 'piso2', 'medida'].includes(t.alto)) return 'Elegí hasta dónde llega';
  if (t.alto === 'medida' && !num(t.altoMedida, 0.3, 6)) return 'El alto va de 0,30 a 6 m';
  if (t.alto === 'piso2' && !(params.anchoEntrepiso > 0)) return 'No hay entrepiso';
  if (!num(t.separacionMontantes, 0.2, 1.2)) return 'Los montantes van cada 0,20 a 1,20 m';
  if (typeof t.nombre !== 'string' || t.nombre.length > 40) return 'El nombre puede tener hasta 40 letras';
  if (typeof t.mostrarEtiqueta !== 'boolean') return 'Valor inválido';
  const pu = t.puerta;
  if (!pu || !TIPOS_PUERTA.some(([v]) => v === pu.tipo)) return 'Elegí el tipo de puerta';
  if (!['A', 'B'].includes(pu.cara)) return 'Elegí de qué lado corre la puerta';
  if (pu.tipo !== 'ninguna') {
    if (!num(pu.ancho, 0.4, 2) || !num(pu.alto, 1.5, 3)) return 'La puerta va de 0,40 a 2 m de ancho y de 1,50 a 3 m de alto';
    if (!num(pu.desde, 0, t.largo) || pu.desde + pu.ancho > t.largo + 0.001) return 'La puerta no entra en el tabique';
    const [h0, h1] = altosDelTabique(params, t);
    if (pu.alto > Math.min(h0, h1) - 0.05) return 'La puerta es más alta que el tabique';
  }
  return null;
}
