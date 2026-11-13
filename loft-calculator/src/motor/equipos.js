// ==========================================================
// EQUIPOS (v1.58): aires, salamandra y energía solar
// ----------------------------------------------------------
// Pedido de Leandro (12/11):
//   - Aires acondicionados: la condensadora (afuera) y el split (adentro),
//     con las frigorías para ver si alcanzan.
//   - Una salamandra (estufa rusa) con su caño de salida.
//   - Dimensionar el techo y la estructura para paneles solares y un
//     termotanque solar.
//
// Las cuentas son las de un cálculo rápido (las que usa cualquier
// instalador para elegir el equipo), no un cálculo térmico ni estructural:
//   - Frío: ≈ 50 frigorías por m³ del ambiente (más si da el sol de la tarde o
//     es muy vidriado: el "factor" es editable). Calor: ≈ 45 kcal/h por m³.
//   - Paneles: cantidad = consumo diario / (horas de sol pico x potencia x
//     rendimiento 0,8). Peso: el de cada panel con su soporte, y el
//     termotanque solar lleno (litros + su peso vacío), repartido en la
//     superficie del techo, para compararlo con lo que suele aguantar un
//     techo liviano de chapa o panel.
// Lo que el herrero tenga que reforzar lo decide él: acá se avisa.
// ==========================================================

import { geometriaLados } from './geometria.js';
import { LADOS } from './constantes.js';

export const FRIGORIAS_POR_M3 = 50;
export const KCAL_POR_M3 = 45;
export const FRIGORIAS_COMERCIALES = [2250, 3000, 4500, 5500, 6000, 9000];
export const KCAL_SALAMANDRA = [6000, 8000, 10000, 12000, 15000];
export const DIAMETROS_CANO = [['5', '5" (125 mm)'], ['6', '6" (150 mm)']];
export const SALIDAS_CANO = [['techo', 'Por el techo (derecho para arriba)'], ['pared', 'Por la pared (sale y sube por afuera)']];

/** Panel solar común (≈ 450 W). */
export const PANEL_SOLAR = { potencia: 450, largo: 2.28, ancho: 1.13, kg: 27, soporteKg: 4 };
export const HORAS_SOL_PICO = 4.5; // promedio anual de buena parte de Argentina (editable)
export const RENDIMIENTO_SOLAR = 0.8;
export const CARGA_TECHO_LIVIANO = 25; // kg/m² que suele admitir sin refuerzo un techo liviano (chapa o panel sobre correas C)

export const EQUIPOS_INICIALES = {
  aires: [],
  salamandras: [],
  solar: { activo: false, consumoMensual: 300, horasSolPico: HORAS_SOL_PICO, paneles: 0, termotanque: 0, kgTermotanqueVacio: 60 },
  precios: {},
};

const siguienteId = (lista) => Math.max(0, ...lista.map((x) => x.id)) + 1;

export function aireNuevo(aires) {
  return {
    id: siguienteId(aires), nombre: `Aire ${aires.length + 1}`, nivel: 'piso', lado: 'C', distancia: 1, altura: 2.1,
    frigorias: 3000, ambienteM2: 0, factor: 1, // ambienteM2 0 = toda la planta de ese piso
    distanciaCondensadora: 3, // m de caño de cobre entre el split y la condensadora
  };
}

export function salamandraNueva(salamandras) {
  return {
    id: siguienteId(salamandras), nombre: salamandras.length ? `Salamandra ${salamandras.length + 1}` : 'Salamandra', nivel: 'piso',
    desdeLateral: 1, desdeFrente: 1, kcal: 10000, diametro: '6', salida: 'techo', sobreTecho: 1,
  };
}

/** m² de la planta de un nivel (para cuando el aire es de toda la planta). */
function m2DelNivel(nivel, estructura) {
  const s = estructura?.superficies ?? {};
  return nivel === 'piso2' ? s.piso2 ?? 0 : s.piso ?? 0;
}

/**
 * Alto del ambiente: en planta baja, del piso al techo (el lado bajo: con entrepiso es una doble altura, así el volumen
 * ya incluye el del altillo); en el entrepiso, de su piso al techo.
 */
function altoDelAmbiente(params, estructura, nivel) {
  const alto = params.altura ?? 2.6;
  if (nivel === 'piso2' && estructura?.entrepiso) return Math.max(1.5, (params.elevacion ?? 0) + alto - estructura.entrepiso.y);
  return alto;
}

/**
 * ¿Alcanza el aire? Lo que pide el ambiente (m³ x 50 x factor) contra las frigorías del equipo.
 * @returns {{ m2, m3, necesarias, sobra, alcanza, texto, sugerido }}
 */
export function alcanceDelAire(aire, params, estructura) {
  const m2 = aire.ambienteM2 > 0 ? aire.ambienteM2 : m2DelNivel(aire.nivel, estructura);
  const m3 = m2 * altoDelAmbiente(params, estructura, aire.nivel);
  const necesarias = Math.round(m3 * FRIGORIAS_POR_M3 * aire.factor);
  const sugerido = FRIGORIAS_COMERCIALES.find((f) => f >= necesarias) ?? FRIGORIAS_COMERCIALES.at(-1);
  const alcanza = aire.frigorias >= necesarias;
  const texto = alcanza
    ? `Alcanza: el ambiente (${n1(m2)} m², ${n1(m3)} m³) pide ≈ ${necesarias.toLocaleString('es-AR')} frigorías y el equipo da ${aire.frigorias.toLocaleString('es-AR')}.`
    : `⚠ No alcanza: el ambiente (${n1(m2)} m², ${n1(m3)} m³) pide ≈ ${necesarias.toLocaleString('es-AR')} frigorías y el equipo da ${aire.frigorias.toLocaleString('es-AR')}. Uno de ${sugerido.toLocaleString('es-AR')} o dos equipos.`;
  return { m2, m3, necesarias, sobra: aire.frigorias - necesarias, alcanza, texto, sugerido };
}

const n1 = (n) => n.toLocaleString('es-AR', { maximumFractionDigits: 1 });

/** Calor de la salamandra contra el volumen de la casa (toda la planta baja + entrepiso). */
export function alcanceDeLaSalamandra(s, params, estructura) {
  const m3 = m2DelNivel('piso', estructura) * altoDelAmbiente(params, estructura, 'piso'); // toda la casa (doble altura incluida)
  const necesarias = Math.round(m3 * KCAL_POR_M3);
  const alcanza = s.kcal >= necesarias;
  return { m3, necesarias, alcanza,
    texto: `${alcanza ? 'Alcanza' : '⚠ Justa'}: la casa (${n1(m3)} m³) pide ≈ ${necesarias.toLocaleString('es-AR')} kcal/h y la salamandra da ${s.kcal.toLocaleString('es-AR')}.` };
}

/**
 * El caño de salida de la salamandra: por el techo, del equipo (≈ 0,8 m de alto) al techo y lo que sobresale; por la
 * pared, hasta la pared más cercana, afuera y para arriba hasta pasar el techo.
 * @returns {{ metros, codos, pared, techoEn }}
 */
export function canoDeSalida(s, params, estructura) {
  const altoEquipo = 0.8;
  const altoTecho = altoDelAmbiente(params, estructura, s.nivel); // de su piso al techo
  const vertical = Math.max(0, altoTecho - altoEquipo) + s.sobreTecho;
  if (s.salida === 'techo') return { metros: vertical, codos: 0, pared: null };
  // La pared más cercana (las distancias del frente y del lateral izquierdo, y sus opuestas).
  const largo = params.largo;
  const ancho = params.ancho;
  const opciones = [s.desdeLateral, s.desdeFrente, largo - s.desdeLateral, ancho - s.desdeFrente];
  const horizontal = Math.max(0, Math.min(...opciones)) + 0.15; // + atravesar la pared
  return { metros: horizontal + vertical + 0.3, codos: 2, pared: horizontal };
}

/** Paneles para el consumo, la superficie que ocupan y el peso sobre el techo. */
export function dimensionarSolar(solar, estructura) {
  const consumoDiario = (solar.consumoMensual * 1000) / 30; // Wh por día
  const porPanel = PANEL_SOLAR.potencia * solar.horasSolPico * RENDIMIENTO_SOLAR;
  const sugeridos = solar.consumoMensual > 0 ? Math.ceil(consumoDiario / porPanel - 1e-9) : 0;
  const paneles = solar.paneles > 0 ? solar.paneles : sugeridos;
  const superficie = paneles * PANEL_SOLAR.largo * PANEL_SOLAR.ancho;
  const techo = estructura?.superficies?.techo ?? 0;
  const kgPaneles = paneles * (PANEL_SOLAR.kg + PANEL_SOLAR.soporteKg);
  const kgTermo = solar.termotanque > 0 ? solar.termotanque + solar.kgTermotanqueVacio : 0; // 1 litro de agua = 1 kg
  // El peso se reparte en lo que ocupan los equipos (con 1 m² de apoyo para el termotanque).
  const apoyo = superficie + (kgTermo > 0 ? 1 : 0);
  const cargaZona = apoyo > 0 ? (kgPaneles + kgTermo) / apoyo : 0;
  const avisos = [];
  if (superficie > techo * 0.8 && techo > 0) avisos.push(`Los paneles ocupan ${n1(superficie)} m² y el techo tiene ${n1(techo)} m²: no entran (dejá lugar para pasar y mantener).`);
  if (cargaZona > CARGA_TECHO_LIVIANO) avisos.push(`Cargan ≈ ${n1(cargaZona)} kg/m² donde apoyan (un techo liviano suele aguantar ≈ ${CARGA_TECHO_LIVIANO} kg/m²): reforzá esas correas o apoyá el termotanque sobre una viga.`);
  if (kgTermo > 0) avisos.push(`El termotanque solar lleno pesa ≈ ${Math.round(kgTermo)} kg: apoyalo sobre las vigas, no en el medio de una correa.`);
  return {
    sugeridos, paneles, potenciaKw: (paneles * PANEL_SOLAR.potencia) / 1000, generacionMensual: (paneles * porPanel * 30) / 1000,
    superficie, techo, kgPaneles, kgTermo, cargaZona, avisos,
  };
}

/** La posición del split (adentro) y la condensadora (afuera, en la misma pared, abajo) en el 3D. */
export function ubicarAire(aire, params, pisoDe) {
  const geo = geometriaLados(params);
  const lado = geo[aire.lado];
  const t = Math.max(0.4, Math.min(lado.largo - 0.4, aire.distancia));
  const n = [-lado.direccion[1], lado.direccion[0]];
  const base = [lado.p1[0] + lado.direccion[0] * t, lado.p1[1] + lado.direccion[1] * t];
  const piso = pisoDe(aire.nivel);
  return {
    split: [base[0] - n[0] * 0.12, piso + aire.altura, base[1] - n[1] * 0.12],
    condensadora: [base[0] + n[0] * 0.3, piso + 0.3, base[1] + n[1] * 0.3],
    angulo: Math.atan2(lado.direccion[0], lado.direccion[1]),
  };
}

// ---------- materiales ----------

/**
 * Lo que hay que comprar: cada equipo, el kit de instalación de los aires, el caño de la salamandra y los paneles.
 * @returns {{ sistema: 'equipos', nombre, materiales: { nombre, unidad, cantidad, precio, total }[], total, puntos, tramos: [] }}
 */
export function materialesDeEquipos(params, estructura) {
  const eq = completarEquipos(params.equipos);
  const lista = new Map();
  const agregar = (nombre, cantidad, unidad = 'u') => {
    if (!(cantidad > 0)) return;
    const m = lista.get(nombre) ?? { nombre, unidad, cantidad: 0 };
    m.cantidad += cantidad;
    lista.set(nombre, m);
  };
  eq.aires.forEach((a) => {
    agregar(`Aire split frío/calor ${a.frigorias.toLocaleString('es-AR')} frigorías`, 1);
    agregar('Caño de cobre ¼" + ⅜" con aislación', Math.ceil(a.distanciaCondensadora + 1), 'm');
    agregar('Ménsula para condensadora', 1, 'juego');
    agregar('Manguera de desagüe del split', Math.ceil(a.distanciaCondensadora + 1), 'm');
    agregar('Cable tipo taller 3x2,5 mm²', Math.ceil(a.distanciaCondensadora + 2), 'm');
  });
  eq.salamandras.forEach((s) => {
    const c = canoDeSalida(s, params, estructura);
    agregar(`Salamandra ${s.kcal.toLocaleString('es-AR')} kcal/h`, 1);
    agregar(`Caño de chapa ${s.diametro}" (tramos de 1 m)`, Math.ceil(c.metros - 1e-9), 'tramos');
    if (c.codos) agregar(`Codo ${s.diametro}" a 90°`, c.codos);
    agregar(`Sombrerete ${s.diametro}"`, 1);
    agregar(s.salida === 'techo' ? `Babeta / pasatecho ${s.diametro}"` : `Pasamuro ${s.diametro}" con aislación`, 1);
    agregar('Placa de apoyo ignífuga', 1);
  });
  if (eq.solar.activo) {
    const d = dimensionarSolar(eq.solar, estructura);
    agregar(`Panel solar ${PANEL_SOLAR.potencia} W`, d.paneles);
    agregar('Soporte de aluminio para panel', d.paneles);
    if (d.paneles > 0) agregar(`Inversor ${Math.max(1, Math.ceil(d.potenciaKw))} kW`, 1);
    if (eq.solar.termotanque > 0) agregar(`Termotanque solar ${eq.solar.termotanque} l`, 1);
  }
  const precioDe = (nombre) => (Number.isFinite(eq.precios[nombre]) ? eq.precios[nombre] : 0);
  const materiales = [...lista.values()].map((m) => ({ ...m, precio: precioDe(m.nombre), total: precioDe(m.nombre) * m.cantidad }));
  const cuantos = eq.aires.length + eq.salamandras.length + (eq.solar.activo ? 1 : 0);
  return { sistema: 'equipos', nombre: 'Equipos', materiales, total: materiales.reduce((a, m) => a + m.total, 0), puntos: cuantos, tramos: [] };
}

// ---------- validación y proyectos de antes ----------

const entre = (n, min, max) => Number.isFinite(n) && n >= min && n <= max;

export function validarEquipos(eq) {
  if (!eq || !Array.isArray(eq.aires) || !Array.isArray(eq.salamandras) || !eq.solar || typeof eq.precios !== 'object' || eq.precios === null) {
    return { equipos: 'Equipos inválidos' };
  }
  const errores = {};
  eq.aires.forEach((a, i) => {
    let e = null;
    if (typeof a.nombre !== 'string' || a.nombre.length > 40) e = 'El nombre puede tener hasta 40 letras';
    else if (!LADOS.includes(a.lado) || !['piso', 'piso2'].includes(a.nivel)) e = 'Elegí la pared y el piso';
    else if (!entre(a.distancia, 0, 100) || !entre(a.altura, 0, 6)) e = 'Distancia de 0 a 100 m y altura de 0 a 6 m';
    else if (!entre(a.frigorias, 500, 50000)) e = 'Frigorías de 500 a 50.000';
    else if (!entre(a.ambienteM2, 0, 2000)) e = 'Ambiente de 0 a 2000 m²';
    else if (!entre(a.factor, 0.5, 2)) e = 'Factor de 0,5 a 2';
    else if (!entre(a.distanciaCondensadora, 0, 50)) e = 'De 0 a 50 m hasta la condensadora';
    if (e) errores[`equipos.aires.${i}`] = e;
  });
  eq.salamandras.forEach((s, i) => {
    let e = null;
    if (typeof s.nombre !== 'string' || s.nombre.length > 40) e = 'El nombre puede tener hasta 40 letras';
    else if (!['piso', 'piso2'].includes(s.nivel) || !entre(s.desdeLateral, 0, 100) || !entre(s.desdeFrente, 0, 100)) e = 'Revisá dónde va';
    else if (!entre(s.kcal, 1000, 50000)) e = 'De 1000 a 50.000 kcal/h';
    else if (!DIAMETROS_CANO.some(([d]) => d === s.diametro) || !SALIDAS_CANO.some(([v]) => v === s.salida)) e = 'Elegí el caño y por dónde sale';
    else if (!entre(s.sobreTecho, 0.3, 5)) e = 'Sobre el techo: de 0,3 a 5 m';
    if (e) errores[`equipos.salamandras.${i}`] = e;
  });
  const so = eq.solar;
  if (typeof so.activo !== 'boolean' || !entre(so.consumoMensual, 0, 100000) || !entre(so.horasSolPico, 1, 8) || !(Number.isInteger(so.paneles) && so.paneles >= 0 && so.paneles <= 500)
    || !entre(so.termotanque, 0, 1000) || !entre(so.kgTermotanqueVacio, 0, 500)) errores['equipos.solar'] = 'Revisá los datos del solar';
  if (Object.values(eq.precios).some((v) => !entre(v, 0, 1e10))) errores['equipos.precios'] = 'Los precios no pueden ser negativos';
  return errores;
}

export function completarEquipos(eq) {
  const base = eq && typeof eq === 'object' ? eq : {};
  return {
    aires: Array.isArray(base.aires) ? base.aires : [],
    salamandras: Array.isArray(base.salamandras) ? base.salamandras : [],
    solar: { ...EQUIPOS_INICIALES.solar, ...(base.solar && typeof base.solar === 'object' ? base.solar : {}) },
    precios: base.precios && typeof base.precios === 'object' ? base.precios : {},
  };
}
