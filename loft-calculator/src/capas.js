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
  columnas: { nombre: 'Columnas', color: '#ef4444' },
  marcos: { nombre: 'Marcos', color: '#3b82f6' },
  piso: { nombre: 'Piso', color: '#06b6d4' },
  piso2: { nombre: 'Piso 2', color: '#22d3ee' },
  transversales: { nombre: 'Transversales', color: '#f0abfc' },
  correas: { nombre: 'Horizontales', color: '#eab308' },
  techo: { nombre: 'Techo', color: '#f97316' },
  osb: { nombre: 'OSB', color: '#d97706' },
  paneles: { nombre: 'Paneles', color: '#10b981' },
  aberturas: { nombre: 'Aberturas', color: '#38bdf8' },
};

/** Colores por defecto: { capa: '#rrggbb' }. */
export const COLORES_INICIALES = Object.fromEntries(
  Object.entries(CAPAS).map(([clave, { color }]) => [clave, color])
);

/** true si es un color '#rrggbb' válido. */
export const esColorValido = (c) => typeof c === 'string' && /^#[0-9a-fA-F]{6}$/.test(c);

/** Valida un objeto de colores guardado: debe tener todas las capas. */
export const coloresValidos = (colores) =>
  colores && typeof colores === 'object' && Object.keys(CAPAS).every((clave) => esColorValido(colores[clave]));
