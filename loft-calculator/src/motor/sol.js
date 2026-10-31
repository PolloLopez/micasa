// ==========================================================
// SOL (v1.37): dónde está el sol un día y una hora, y por dónde entra
// ----------------------------------------------------------
// Fórmulas astronómicas de la NOAA (las de sus planillas de cálculo solar),
// sin librerías: con la latitud, la longitud, el huso horario, el día del año
// y la hora del reloj dan la altura del sol sobre el horizonte y su azimut
// (desde el norte, en sentido horario: 90° = este). Alcanza con ±1° para ver
// sombras y la entrada del sol por las aberturas.
//
// El norte de la obra sale del terreno (hacia dónde mira la calle), así el
// sol del 3D y el de los planos coinciden con el lote real.
// ==========================================================

import { geometriaLados } from './geometria.js';

/** De fábrica: Mercedes, provincia de Buenos Aires (UTC−3, sin horario de verano). */
export const SOL_INICIAL = { latitud: -34.65, longitud: -59.43, huso: -3 };

const RAD = Math.PI / 180;

/** Día del año (1 = 1 de enero) de una fecha "AAAA-MM-DD". */
export function diaDelAnio(fecha) {
  const [a, m, d] = fecha.split('-').map(Number);
  return Math.round((Date.UTC(a, m - 1, d) - Date.UTC(a, 0, 1)) / 86400000) + 1;
}

/**
 * Posición del sol.
 * @param dia   día del año (1–366)
 * @param hora  hora del reloj (ej. 14.5 = 14:30)
 * @returns {{ altura: number, azimut: number }} en grados (altura < 0 = de noche)
 */
export function posicionDelSol({ latitud, longitud, huso }, dia, hora) {
  const g = ((2 * Math.PI) / 365) * (dia - 1 + (hora - 12) / 24); // año fraccionario
  const ecuacionDelTiempo = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g)
    - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g)); // minutos
  const declinacion = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g)
    + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g); // radianes
  const horaSolar = hora * 60 + ecuacionDelTiempo + 4 * longitud - 60 * huso; // minutos de tiempo solar verdadero
  const angulo = (horaSolar / 4 - 180) * RAD; // ángulo horario
  const lat = latitud * RAD;
  const cosCenit = Math.sin(lat) * Math.sin(declinacion) + Math.cos(lat) * Math.cos(declinacion) * Math.cos(angulo);
  const cenit = Math.acos(Math.max(-1, Math.min(1, cosCenit)));
  const azimut = (Math.atan2(Math.sin(angulo), Math.cos(angulo) * Math.sin(lat) - Math.tan(declinacion) * Math.cos(lat)) / RAD + 180 + 360) % 360;
  return { altura: 90 - cenit / RAD, azimut };
}

/** Salida y puesta del sol (horas del reloj, buscando cuándo la altura cruza 0). */
export function salidaYPuesta(lugar, dia) {
  const cruce = (desde, hasta) => {
    let a = desde;
    let b = hasta;
    for (let i = 0; i < 40; i++) {
      const m = (a + b) / 2;
      if ((posicionDelSol(lugar, dia, a).altura < 0) === (posicionDelSol(lugar, dia, m).altura < 0)) a = m; else b = m;
    }
    return (a + b) / 2;
  };
  // Mediodía solar: la hora más alta (se busca en pasos de 10 min).
  let mediodia = 12;
  for (let h = 8; h <= 16; h += 1 / 6) {
    if (posicionDelSol(lugar, dia, h).altura > posicionDelSol(lugar, dia, mediodia).altura) mediodia = h;
  }
  return { salida: cruce(0, mediodia), puesta: cruce(mediodia, 24), mediodia };
}

/**
 * Dirección HACIA el sol en el 3D ([x, y, z], de largo 1).
 * @param norte vector [x, z] del norte en el 3D (implantacion(params).norte)
 */
export function direccionDelSol({ altura, azimut }, norte) {
  const este = [-norte[1], norte[0]]; // el norte girado 90° en sentido horario, visto desde arriba
  const a = azimut * RAD;
  const h = altura * RAD;
  const horizontal = [Math.cos(a) * norte[0] + Math.sin(a) * este[0], Math.cos(a) * norte[1] + Math.sin(a) * este[1]];
  return [horizontal[0] * Math.cos(h), Math.sin(h), horizontal[1] * Math.cos(h)];
}

/** "N", "NE"… del azimut (para leer en pantalla). */
export function rumboDelAzimut(azimut) {
  const rumbos = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
  return rumbos[Math.round((((azimut % 360) + 360) % 360) / 45) % 8];
}

/**
 * Por qué aberturas entra el sol: las de las paredes que el sol "ve" (de frente o de costado),
 * con el sol arriba del horizonte. Devuelve la abertura y qué tan de frente le da (0 a 1).
 */
export function aberturasConSol(params, aberturas, direccion) {
  if (direccion[1] <= 0) return [];
  const lados = geometriaLados(params);
  const horizontal = Math.hypot(direccion[0], direccion[2]) || 1;
  return aberturas.map((op, i) => {
    const geo = lados[op.lado];
    const afuera = [-geo.direccion[1], geo.direccion[0]]; // normal hacia afuera de esa pared
    const deFrente = (afuera[0] * direccion[0] + afuera[1] * direccion[2]) / horizontal;
    return { abertura: op, numero: i + 1, deFrente };
  }).filter((a) => a.deFrente > 0.05);
}

/** Completa y valida el lugar (proyectos de antes: Mercedes). */
export function completarSol(s) {
  const base = s && typeof s === 'object' ? s : {};
  const num = (v, def) => (Number.isFinite(v) ? v : def);
  return { latitud: num(base.latitud, SOL_INICIAL.latitud), longitud: num(base.longitud, SOL_INICIAL.longitud), huso: num(base.huso, SOL_INICIAL.huso) };
}

export function validarSol(s) {
  const errores = {};
  if (!s || typeof s !== 'object') return { sol: 'Faltan los datos del lugar' };
  if (!Number.isFinite(s.latitud) || Math.abs(s.latitud) > 66) errores['sol.latitud'] = 'Entre -66° y 66°';
  if (!Number.isFinite(s.longitud) || Math.abs(s.longitud) > 180) errores['sol.longitud'] = 'Entre -180° y 180°';
  if (!Number.isFinite(s.huso) || Math.abs(s.huso) > 14) errores['sol.huso'] = 'Entre -14 y 14 horas';
  return errores;
}
