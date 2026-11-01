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

import { geometriaLados, largoLado } from './geometria.js';
import { haciaAdentro, pieza } from './segmentos.js';
import { LADOS, ALTURA_PISO_2 } from './constantes.js';

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
  huecos: [], // [{ desde, ancho, nombre }] medidos desde la punta izquierda de la mesada (vista de frente)
  mostrarEtiqueta: true, // v1.38.1: cartel con el nombre en el 3D (como paredes y aberturas)
  colorTapa: '', // v1.38.2: color propio de la tapa ('' = el de la capa "Tapas, placas y estantes")
  colorEstantes: '', // v1.38.2: color propio de los estantes ('' = el de la madera)
};

/** Una mesada nueva con un id libre. */
export function mesadaNueva(mesadas, id) {
  return { ...structuredClone(MESADA_NUEVA), id, nombre: `Mesada ${mesadas.length + 1}` };
}

/** Altura del piso terminado de un nivel. */
const alturaDelPiso = (params, nivel) => params.elevacion + (nivel === 'piso2' ? (params.alturaPiso2 ?? ALTURA_PISO_2) : 0) + ALTO_PISO;

/**
 * Dónde está la mesada: punta izquierda del fondo (contra la pared), dirección a lo largo y hacia adentro.
 * "Izquierda" de la mesada = mirándola de frente (desde adentro de la casa).
 */
export function ubicarMesada(params, m) {
  const geo = geometriaLados(params)[m.lado];
  const largoPared = largoLado(m.lado, params);
  const inicio = m.ladoReferencia === 'izquierda' ? m.desde : largoPared - m.desde - m.largo; // sobre la pared (desde p1)
  // Vista desde adentro, la pared se recorre al revés que desde afuera: la punta izquierda es la de p1 + inicio + largo.
  const adentro = haciaAdentro(geo);
  const alongo = [-geo.direccion[0], -geo.direccion[1]]; // hacia la derecha mirándola de frente
  const puntoP1 = (d) => [geo.p1[0] + geo.direccion[0] * d, geo.p1[1] + geo.direccion[1] * d];
  const enEje = puntoP1(inicio + m.largo);
  const origen = [enEje[0] + adentro[0] * MEDIA_PARED, enEje[1] + adentro[1] * MEDIA_PARED];
  return { origen, alongo, adentro, y: alturaDelPiso(params, m.nivel), inicio, largoPared };
}

/** Tramos del frente sin huecos: [[desde, hasta]] desde la punta izquierda. */
export function tramosDelFrente(m) {
  const huecos = [...(m.huecos ?? [])].sort((a, b) => a.desde - b.desde);
  const tramos = [];
  let x = 0;
  huecos.forEach((h) => {
    if (h.desde > x + 0.01) tramos.push([x, h.desde]);
    x = Math.max(x, h.desde + h.ancho);
  });
  if (x < m.largo - 0.01) tramos.push([x, m.largo]);
  return tramos;
}

/** Posiciones de montantes en un tramo: las puntas y parejos a no más de la separación. */
function montantesDe([a, b], separacion) {
  const n = Math.max(1, Math.ceil((b - a) / separacion - 0.01));
  return Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n);
}

/**
 * Piezas y superficies de una mesada.
 * Estructura (vista de frente, x desde la punta izquierda, z desde la pared hacia adentro):
 *   - fondo, contra la pared: solera en el piso y solera arriba (bajo la tapa), con montantes del piso a la tapa;
 *   - frente: solera arriba entera; abajo (a la altura del zócalo) solo en los tramos sin hueco, con montantes
 *     en esos tramos y en los bordes de cada hueco (ahí va la placa y la puerta del bajo mesada);
 *   - travesaños de frente a fondo: arriba en cada montante (sostienen la tapa) y abajo fuera de los huecos;
 *   - con zócalo: una solera en el piso retirada del frente y una pata corta en cada montante del frente
 *     (ahí se atornilla la placa del zócalo).
 * En un hueco (heladera, lavarropas) no hay solera de abajo ni zócalo.
 */
export function generarMesada(params, m) {
  const { origen, alongo, adentro, y } = ubicarMesada(params, m);
  const p = (x, z, h) => [origen[0] + alongo[0] * x + adentro[0] * z, y + h, origen[1] + alongo[1] * x + adentro[1] * z];
  const arriba = m.alto - m.espesorTapa; // la estructura termina abajo de la tapa
  const abajo = m.zocalo > 0 ? m.zocalo : 0; // el frente arranca arriba del zócalo
  const prof = m.profundidad;
  const zZocalo = prof - m.retiroZocalo;
  const base = `mesada:${m.id}`;
  const grupos = ['mesada'];
  const extra = { ...(m.perfil ? { perfilPared: m.perfil, ladoPared: m.nombre } : {}), mesada: m.id };
  const pz = (id, desde, hasta) => ({ ...pieza(`${base}:${id}`, 'mesada', grupos, desde, hasta), ...extra });
  const piezas = [];
  const tramos = tramosDelFrente(m);
  const enTramo = (x) => tramos.some(([a, b]) => x >= a - 0.005 && x <= b + 0.005);
  const unicos = (lista) => [...new Set(lista.map((x) => Number(x.toFixed(4))))].sort((a, b) => a - b);

  // Montantes del frente: los de cada tramo, los bordes de los huecos y las dos puntas (siempre).
  const xsFrente = unicos([0, m.largo, ...tramos.flatMap((t) => montantesDe(t, m.separacionMontantes)),
    ...(m.huecos ?? []).flatMap((h) => [h.desde, h.desde + h.ancho]).filter((x) => x > 0.005 && x < m.largo - 0.005)]);
  // Montantes del fondo: parejos y, además, enfrente de cada montante del frente (para los travesaños).
  const xsFondo = unicos([...montantesDe([0, m.largo], m.separacionMontantes), ...xsFrente]);

  // Fondo (contra la pared).
  piezas.push(pz('fondo-abajo', p(0, 0, 0), p(m.largo, 0, 0)));
  piezas.push(pz('fondo-arriba', p(0, 0, arriba), p(m.largo, 0, arriba)));
  xsFondo.forEach((x) => piezas.push(pz(`fondo-mont:${cm(x)}`, p(x, 0, 0), p(x, 0, arriba))));
  // Frente.
  piezas.push(pz('frente-arriba', p(0, prof, arriba), p(m.largo, prof, arriba)));
  tramos.forEach(([a, b], i) => piezas.push(pz(`frente-abajo:${i}`, p(a, prof, abajo), p(b, prof, abajo))));
  // En un tramo el montante apoya en la solera de abajo; dentro de un hueco (ej. una punta) baja hasta el piso.
  xsFrente.forEach((x) => piezas.push(pz(`frente-mont:${cm(x)}`, p(x, prof, enTramo(x) ? abajo : 0), p(x, prof, arriba))));
  // Travesaños de frente a fondo.
  xsFondo.forEach((x) => piezas.push(pz(`trav-arriba:${cm(x)}`, p(x, 0, arriba), p(x, prof, arriba))));
  xsFrente.filter(enTramo).forEach((x) => piezas.push(pz(`trav-abajo:${cm(x)}`, p(x, 0, abajo), p(x, prof, abajo))));
  // Zócalo: solera en el piso (retirada) y patas cortas hasta los travesaños de abajo.
  if (m.zocalo > 0) {
    tramos.forEach(([a, b], i) => piezas.push(pz(`zocalo:${i}`, p(a, zZocalo, 0), p(b, zZocalo, 0))));
    xsFrente.filter(enTramo).forEach((x) => piezas.push(pz(`pata:${cm(x)}`, p(x, zZocalo, 0), p(x, zZocalo, abajo))));
  }

  // Superficies.
  const altoFrente = arriba - abajo; // la placa del frente va del zócalo a la tapa
  const largoTramos = tramos.reduce((acc, [a, b]) => acc + (b - a), 0);
  const panos = [];
  if (m.revestimiento) {
    panos.push({ largo: m.largo, h1: altoFrente, h2: altoFrente, neto: largoTramos * altoFrente, donde: `${m.nombre} (frente)`,
      huecos: (m.huecos ?? []).map((h) => ({ desde: h.desde, hasta: h.desde + h.ancho, abajo: 0, arriba: altoFrente })) });
    if (m.costadoIzquierdo) panos.push({ largo: prof, h1: m.alto - m.espesorTapa, h2: m.alto - m.espesorTapa, neto: prof * (m.alto - m.espesorTapa), donde: `${m.nombre} (costado izq.)` });
    if (m.costadoDerecho) panos.push({ largo: prof, h1: m.alto - m.espesorTapa, h2: m.alto - m.espesorTapa, neto: prof * (m.alto - m.espesorTapa), donde: `${m.nombre} (costado der.)` });
    if (m.zocalo > 0) panos.push({ largo: largoTramos, h1: m.zocalo, h2: m.zocalo, neto: largoTramos * m.zocalo, donde: `${m.nombre} (zócalo)` });
  }
  const estantes = m.estantes > 0 ? tramos.map(([a, b]) => ({ desde: a, hasta: b, alturas: Array.from({ length: m.estantes },
    (_, k) => abajo + ((k + 1) * altoFrente) / (m.estantes + 1)) })) : [];
  return {
    id: m.id, nombre: m.nombre, piezas, panos, panel: m.revestimiento,
    mostrarEtiqueta: m.mostrarEtiqueta !== false,
    colorTapa: m.colorTapa || '', colorEstantes: m.colorEstantes || '', // v1.38.2
    ejes: { alongo, adentro }, // para el 3D: hacia dónde mira cada placa
    tapa: { m2: m.largo * prof, largo: m.largo, profundidad: prof, espesor: m.espesorTapa },
    estantesM2: estantes.reduce((acc, e) => acc + (e.hasta - e.desde) * (prof - 0.02) * e.alturas.length, 0),
    // Para el 3D: cada superficie como 4 esquinas.
    dibujo: {
      tapa: [p(0, 0, arriba), p(m.largo, 0, arriba), p(m.largo, prof + 0.02, arriba), p(0, prof + 0.02, arriba)].map((q) => [q[0], q[1] + m.espesorTapa, q[2]]),
      frente: tramos.map(([a, b]) => [p(a, prof, abajo), p(b, prof, abajo), p(b, prof, arriba), p(a, prof, arriba)]),
      // signo: hacia dónde mira la placa a lo largo de la mesada (-1 = el costado izquierdo, +1 = el derecho).
      costados: [m.costadoIzquierdo && { signo: -1, esquinas: [p(0, 0, 0), p(0, prof, 0), p(0, prof, arriba), p(0, 0, arriba)] },
        m.costadoDerecho && { signo: 1, esquinas: [p(m.largo, 0, 0), p(m.largo, prof, 0), p(m.largo, prof, arriba), p(m.largo, 0, arriba)] }].filter(Boolean),
      zocalo: m.zocalo > 0 ? tramos.map(([a, b]) => [p(a, zZocalo, 0), p(b, zZocalo, 0), p(b, zZocalo, m.zocalo), p(a, zZocalo, m.zocalo)]) : [],
      estantes: estantes.flatMap((e) => e.alturas.map((h) => [p(e.desde, 0.01, h), p(e.hasta, 0.01, h), p(e.hasta, prof - 0.01, h), p(e.desde, prof - 0.01, h)])),
      espesorTapa: m.espesorTapa,
    },
  };
}

/** Todas las mesadas de la obra. */
export function generarMesadas(params) {
  if (params.tipoProyecto !== 'construccion') return [];
  return (params.mesadas ?? []).map((m) => generarMesada(params, m));
}

/** Errores de carga de una mesada (que entre en su pared y en su profundidad). */
export function validarMesada(m, params) {
  if (!LADOS.includes(m.lado)) return 'Elegí una pared';
  const num = (v, min, max) => Number.isFinite(v) && v >= min && v <= max;
  if (!num(m.largo, 0.3, 20)) return 'El largo va de 0,30 a 20 m';
  if (!num(m.profundidad, 0.2, 1.5)) return 'La profundidad va de 0,20 a 1,50 m';
  if (!num(m.alto, 0.3, 1.5)) return 'El alto va de 0,30 a 1,50 m';
  if (!num(m.espesorTapa, 0, 0.1)) return 'La tapa va de 0 a 10 cm';
  if (!num(m.separacionMontantes, 0.2, 2)) return 'Los montantes van cada 0,20 a 2 m';
  if (!num(m.zocalo, 0, 0.3) || !num(m.retiroZocalo, 0, 0.2)) return 'El zócalo va de 0 a 30 cm (retiro hasta 20 cm)';
  if (!Number.isInteger(m.estantes) || m.estantes < 0 || m.estantes > 5) return 'Estantes: de 0 a 5';
  if (!num(m.desde, 0, 50)) return 'La distancia a la esquina no puede ser negativa';
  if (m.desde + m.largo > largoLado(m.lado, params) + 0.001) return 'La mesada no entra en esa pared';
  if (m.nivel === 'piso2' && !(params.anchoEntrepiso > 0)) return 'No hay entrepiso';
  if (!['piso', 'piso2'].includes(m.nivel)) return 'Elegí planta baja o piso 2';
  if (typeof m.nombre !== 'string' || m.nombre.length > 40) return 'El nombre puede tener hasta 40 letras';
  if (m.mostrarEtiqueta !== undefined && typeof m.mostrarEtiqueta !== 'boolean') return 'Valor inválido';
  if (!colorOpcional(m.colorTapa) || !colorOpcional(m.colorEstantes)) return 'Color inválido';
  for (const h of m.huecos ?? []) {
    if (!num(h.desde, 0, m.largo) || !num(h.ancho, 0.1, m.largo) || h.desde + h.ancho > m.largo + 0.001) return 'Un hueco no entra en la mesada';
  }
  return null;
}

// ---------- Muebles ----------

/** Tipos de mueble con sus medidas de fábrica (ancho x profundidad x alto, en m) y su material. */
export const TIPOS_MUEBLE = {
  cama2: { nombre: 'Cama 2 plazas', ancho: 1.4, profundidad: 1.9, alto: 0.5, material: 'madera', forma: 'cama' },
  cama1: { nombre: 'Cama 1 plaza', ancho: 0.8, profundidad: 1.9, alto: 0.5, material: 'madera', forma: 'cama' },
  mesa: { nombre: 'Mesa', ancho: 1.4, profundidad: 0.8, alto: 0.75, material: 'madera', forma: 'mesa' },
  silla: { nombre: 'Silla', ancho: 0.45, profundidad: 0.45, alto: 0.9, material: 'madera', forma: 'silla' },
  sillon: { nombre: 'Sillón', ancho: 1.8, profundidad: 0.85, alto: 0.8, material: 'tela', forma: 'sillon' },
  escritorio: { nombre: 'Escritorio', ancho: 1.2, profundidad: 0.6, alto: 0.75, material: 'madera', forma: 'mesa' },
  placard: { nombre: 'Placard', ancho: 1.5, profundidad: 0.6, alto: 2.1, material: 'madera', forma: 'placard' },
  heladera: { nombre: 'Heladera', ancho: 0.7, profundidad: 0.7, alto: 1.8, material: 'blanco', forma: 'electro' },
  cocina: { nombre: 'Cocina', ancho: 0.56, profundidad: 0.6, alto: 0.85, material: 'acero', forma: 'electro' },
  lavarropas: { nombre: 'Lavarropas', ancho: 0.6, profundidad: 0.6, alto: 0.85, material: 'blanco', forma: 'electro' },
  inodoro: { nombre: 'Inodoro', ancho: 0.4, profundidad: 0.65, alto: 0.75, material: 'blanco', forma: 'inodoro' },
  ducha: { nombre: 'Plato de ducha', ancho: 0.8, profundidad: 0.8, alto: 0.1, material: 'blanco', forma: 'caja' },
  otro: { nombre: 'Otro', ancho: 1, profundidad: 0.6, alto: 0.8, material: 'madera', forma: 'caja' },
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
    distanciaFrente: 0.5 + iguales * 0.3, distanciaIzquierda: 0.5 + iguales * 0.3, giro: 0,
    mostrarEtiqueta: true, // v1.38.1: cartel con el nombre en el 3D
    color: '', // v1.38.2: color propio ('' = el de su material)
  };
}

/**
 * Dónde va el mueble en el 3D: centro, ángulo y altura del piso.
 * Como en el terreno: distancia al lateral izquierdo (mirando el frente desde afuera) y al frente, hasta su borde.
 */
export function ubicarMueble(params, m) {
  const frente = geometriaLados(params)[params.ladoFrente];
  const derecha = frente.direccion;
  const adentro = haciaAdentro(frente);
  const girado = m.giro === 90 || m.giro === 270;
  const anchoPlanta = girado ? m.profundidad : m.ancho; // lo que ocupa a lo largo del frente
  const profPlanta = girado ? m.ancho : m.profundidad;
  const u = m.distanciaIzquierda + anchoPlanta / 2;
  const v = m.distanciaFrente + profPlanta / 2;
  const centro = [frente.p1[0] + derecha[0] * u + adentro[0] * v, frente.p1[1] + derecha[1] * u + adentro[1] * v];
  // Ángulo para girar el mueble (su "ancho" va a lo largo del frente con giro 0).
  const angulo = Math.atan2(-derecha[1], derecha[0]) + (m.giro * Math.PI) / 180;
  return { centro, angulo, y: alturaDelPiso(params, m.nivel), anchoPlanta, profPlanta };
}

export function validarMueble(m, params) {
  if (!(m.tipo in TIPOS_MUEBLE)) return 'Tipo de mueble desconocido';
  if (!(m.material in MATERIALES_MUEBLE)) return 'Material desconocido';
  const num = (v, min, max) => Number.isFinite(v) && v >= min && v <= max;
  if (!num(m.ancho, 0.05, 10) || !num(m.profundidad, 0.05, 10) || !num(m.alto, 0.02, 4)) return 'Medidas de 5 cm a 10 m (alto hasta 4 m)';
  if (!num(m.distanciaFrente, -1, 50) || !num(m.distanciaIzquierda, -1, 50)) return 'Distancias inválidas';
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
  const { anchoPlanta, profPlanta } = ubicarMueble(params, m);
  const frente = largoLado(params.ladoFrente, params);
  const fondo = largoLado(LADOS[(LADOS.indexOf(params.ladoFrente) + 1) % 4], params);
  return m.distanciaIzquierda < -0.001 || m.distanciaFrente < -0.001
    || m.distanciaIzquierda + anchoPlanta > frente + 0.001 || m.distanciaFrente + profPlanta > fondo + 0.001;
}
