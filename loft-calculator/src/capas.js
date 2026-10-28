// ==========================================================
// CAPAS DEL VISOR 3D
// ----------------------------------------------------------
// Cada capa tiene un nombre visible y un color por defecto.
// El color se puede cambiar desde la leyenda del visor; los
// colores elegidos se guardan en el navegador y en el archivo
// de proyecto.
// ==========================================================

export const CAPAS = {
  pilotines: { nombre: 'Pilotines', color: '#94a3b8' },
  zapatas: { nombre: 'Zapatas', color: '#78716c' }, // v1.35: bajo tierra, debajo de cada pilotín
  columnas: { nombre: 'Columnas', color: '#ef4444' },
  marcos: { nombre: 'Marcos', color: '#3b82f6' },
  piso: { nombre: 'Piso', color: '#06b6d4' },
  piso2: { nombre: 'Piso 2', color: '#22d3ee' },
  transversales: { nombre: 'Transversales', color: '#f0abfc' },
  correas: { nombre: 'Horizontales', color: '#eab308' },
  techo: { nombre: 'Techo', color: '#f97316' },
  osb: { nombre: 'OSB', color: '#d97706' },
  paneles: { nombre: 'Paneles', color: '#10b981', colorPorTipo: true }, // color: el de cada tipo de panel
  aberturas: { nombre: 'Aberturas', color: '#38bdf8' },
  escalera: { nombre: 'Escalera', color: '#e11d48' }, // hierros de la escalera
  escalones: { nombre: 'Escalones y tablones', color: '#b45309' }, // madera (escalera y grada)
  grada: { nombre: 'Grada', color: '#a855f7' }, // hierros de la grada
  montaje: { nombre: 'Estructura', color: '#f59e0b' }, // hierros de un montaje (mesas, patas de tanques)
  chapa: { nombre: 'Chapa', color: '#cbd5e1' }, // tanques y tapas de chapa (semitransparente)
};

/** Capas que se muestran en la leyenda de un proyecto de grada (el resto no tiene piezas). */
export const CAPAS_GRADA = ['grada', 'escalones'];
/** Capas de un montaje industrial. */
export const CAPAS_MONTAJE = ['montaje', 'chapa', 'escalones'];
/** Capas que solo existen en grada o montaje (no se muestran en una construcción). */
export const CAPAS_SOLO_PROYECTOS_SUELTOS = ['grada', 'montaje', 'chapa'];

/**
 * Grupos de la leyenda (v1.19): antes eran 16 casillas sueltas.
 *   Estructura  = hierros; Superficies = lo que cierra (paneles, OSB, aberturas, madera, chapa);
 *   Ayudas      = dibujos que no son piezas (juntas, etiquetas).
 * Cada grupo tiene "todo / nada". Las capas que no existen en el tipo de proyecto no se muestran.
 */
/** Las casillas del terreno (una por parte, ver terreno3d.js PARTES_TERRENO). */
export const CAPAS_TERRENO = ['terrenoLote', 'terrenoCalle', 'terrenoRetiros', 'terrenoPozos', 'terrenoArboles', 'terrenoConstrucciones', 'terrenoAccesos', 'terrenoNorte'];

export const GRUPOS_LEYENDA = [
  { titulo: 'Estructura', capas: ['pilotines', 'zapatas', 'columnas', 'marcos', 'piso', 'piso2', 'transversales', 'correas', 'techo', 'escalera', 'grada', 'montaje'] },
  { titulo: 'Superficies', capas: ['paneles', 'osb', 'aberturas', 'escalones', 'chapa'] },
  { titulo: 'Ayudas', capas: ['juntas', 'cotas', 'medidasFijas'] },
  // v1.34.3: cada parte del terreno por separado (solo si la obra tiene terreno).
  { titulo: 'Terreno', capas: CAPAS_TERRENO },
  // v1.33.1: todos los carteles juntos, para sacarlos con "nada" (fotos limpias, PDF).
  { titulo: 'Etiquetas', capas: ['etiquetasParedes', 'etiquetasAberturas', 'etiquetasTerreno'] },
];

/** Ayudas del visor: se prenden y apagan como capas, pero no tienen color. */
export const AYUDAS = {
  juntas: { nombre: 'Juntas de paneles', titulo: 'Dónde termina cada tira o placa: para acomodar las aberturas' },
  etiquetasParedes: { nombre: 'Paredes', titulo: 'Frente, Lateral… (cada pared puede tener su texto en Paredes)' },
  etiquetasAberturas: { nombre: 'Aberturas', titulo: 'El número o la etiqueta de cada puerta y ventana' },
  etiquetasTerreno: { nombre: 'Terreno', titulo: 'Línea municipal, calle, norte y lo que cargaste en el terreno' },
  cotas: { nombre: 'Cotas generales', titulo: 'Largo, ancho y altos de la obra (v1.28)' },
  medidasFijas: { nombre: 'Medidas fijadas', titulo: 'Las medidas que dejaste fijas con 📏 Medir → 📌 (v1.28)' },
  // v1.34.3: el terreno por partes (antes era una sola casilla).
  terrenoLote: { nombre: 'Lote', titulo: 'El pasto y el contorno del lote' },
  terrenoCalle: { nombre: 'Calle y línea municipal' },
  terrenoRetiros: { nombre: 'Retiros', titulo: 'Las líneas punteadas de los retiros que cargaste' },
  terrenoPozos: { nombre: 'Pozo y cámara' },
  terrenoArboles: { nombre: 'Árboles' },
  terrenoConstrucciones: { nombre: 'Construcciones' },
  terrenoAccesos: { nombre: 'Accesos y veredas' },
  terrenoNorte: { nombre: 'Norte', titulo: 'La flecha del norte' },
};

/**
 * ¿Se muestra esta capa en la leyenda de este tipo de proyecto?
 * @param tipo 'construccion' | 'grada' | 'montaje'
 */
export function capaDelProyecto(clave, tipo) {
  if (tipo === 'grada') return CAPAS_GRADA.includes(clave);
  if (tipo === 'montaje') return CAPAS_MONTAJE.includes(clave);
  return !CAPAS_SOLO_PROYECTOS_SUELTOS.includes(clave); // construcción: también paneles y ayudas
}

/** Colores por defecto: { capa: '#rrggbb' }. */
export const COLORES_INICIALES = Object.fromEntries(
  Object.entries(CAPAS).map(([clave, { color }]) => [clave, color])
);

/** true si es un color '#rrggbb' válido. */
export const esColorValido = (c) => typeof c === 'string' && /^#[0-9a-fA-F]{6}$/.test(c);

/** Valida un objeto de colores guardado: debe tener todas las capas. */
export const coloresValidos = (colores) =>
  colores && typeof colores === 'object' && Object.keys(CAPAS).every((clave) => esColorValido(colores[clave]));

/**
 * Completa un objeto de colores guardado: conserva los válidos y usa el de
 * fábrica para los que falten (por ejemplo, capas nuevas de una versión
 * posterior). Así nadie pierde sus colores al actualizar la app.
 */
export function completarColores(colores) {
  const guardados = colores && typeof colores === 'object' ? colores : {};
  return Object.fromEntries(
    Object.keys(CAPAS).map((clave) => [clave, esColorValido(guardados[clave]) ? guardados[clave] : COLORES_INICIALES[clave]])
  );
}
