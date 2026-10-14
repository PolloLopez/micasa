// ==========================================================
// CONSTANTES DEL SISTEMA CONSTRUCTIVO (loft steel frame)
// ----------------------------------------------------------
// Todos los "números mágicos" viven acá, con nombre y unidad.
// Si cambia un supuesto de obra, se cambia en un solo lugar.
// Todas las medidas están en METROS salvo que se indique.
// ==========================================================

// Altura del piso del entrepiso (piso 2) medida desde el piso del loft.
export const ALTURA_PISO_2 = 2.3;

// Espesor que se pierde en cada corte con disco (kerf = ancho del disco).
export const MERMA_POR_CORTE = 0.003;

// Placa OSB comercial: 2,44 m x 1,22 m.
export const PLACA_OSB = { largo: 2.44, ancho: 1.22 };

// Desperdicio estimado al cortar placas OSB (recortes en bordes y huecos).
export const DESPERDICIO_PLACAS = 0.1; // 10 %

// Los 4 lados de la planta, en orden recorriendo el perímetro.
// El nombre (frente, fondo, laterales) depende de cuál se elija como frente.
export const LADOS = ['A', 'B', 'C', 'D'];

// IDs fijos del catálogo: el cálculo sabe qué insumo usar para cada pieza.
export const INSUMO = {
  COLUMNA: 'columna',
  MARCO: 'marco',
  PISO: 'piso',
  PISO_2: 'piso2',
  TRANSVERSAL_PISO: 'transversalPiso',
  TRANSVERSAL_PISO_2: 'transversalPiso2',
  CORREA: 'correa',
  VIGA_TECHO: 'vigaTecho',
  CORREA_TECHO: 'correaTecho',
  OSB: 'osb',
  PILOTIN: 'pilotin',
  ZANCA: 'zanca',
  APOYO_ESCALON: 'apoyoEscalon',
  COLUMNA_ESCALERA: 'columnaEscalera',
  ESCALON: 'escalon',
  PISO_DESCANSO: 'pisoDescanso',
  RIOSTRA: 'riostra', // escalera y grada
  // Grada
  GRADA_ZANCA: 'gradaZanca',
  GRADA_PARANTE: 'gradaParante',
  GRADA_APOYO: 'gradaApoyo',
  GRADA_VIGA: 'gradaViga',
  GRADA_ASIENTO: 'gradaAsiento',
  GRADA_PIE: 'gradaPie',
};

// Límites de la grada (ver motor/grada.js).
export const LIMITES_GRADA = {
  filas: { min: 1, max: 30, entero: true },
  largoFila: { min: 1, max: 60 },
  huella: { min: 0.5, max: 1.2 },
  contrahuella: { min: 0.2, max: 0.6 },
  separacionPorticos: { min: 0.8, max: 4 },
  parantesCadaFilas: { min: 0, max: 30, entero: true },
  vigasPorFila: { min: 0, max: 3, entero: true },
  anchoAsiento: { min: 0.15, max: 0.6 },
  anchoPie: { min: 0.15, max: 0.6 },
};

// Límites de validación (ver motor/validacion.js).
// Evitan valores que cuelguen el visor (separación 0 => bucle infinito)
// o que no tengan sentido constructivo.
// `opcional: true` => el 0 se acepta y significa "no lleva".
export const LIMITES = {
  largo: { min: 2, max: 30 },
  ancho: { min: 2, max: 30 },
  altura: { min: 2.4, max: 8 },
  elevacion: { min: 0, max: 2 },
  separacionPiso: { min: 0.2, max: 2 },
  anchoEntrepiso: { min: 0, max: 30 },
  separacionPiso2: { min: 0.2, max: 2 },
  separacionTransversalesPiso: { min: 0.3, max: 6, opcional: true },
  separacionTransversalesPiso2: { min: 0.3, max: 6, opcional: true },
  excedenteBarras: { min: 0, max: 5 }, // % que las barras traen de más sobre su largo nominal
  pendienteTecho: { min: 0, max: 60 }, // en %
  separacionVigasTecho: { min: 0.3, max: 3 },
  separacionCorreasTecho: { min: 0.2, max: 2 },
  filasPilotines: { min: 2, max: 20, entero: true },
  pilotinesPorFila: { min: 2, max: 20, entero: true },
};

// Límites de la configuración de cada pared (panel).
export const LIMITES_PARED = {
  separacionVerticales: { min: 0.3, max: 10 },
  separacionHorizontales: { min: 0.2, max: 2 },
};

// Límites de la escalera (ver motor/escalera.js).
export const LIMITES_ESCALERA = {
  posicion: { min: 0, max: 30 },
  ancho: { min: 0.6, max: 1.5 },
  huella: { min: 0.2, max: 0.4 },
  contrahuellaObjetivo: { min: 0.12, max: 0.22 },
  alturaTotal: { min: 1, max: 6, opcional: true }, // 0 = automática
  apoyosPorEscalon: { min: 1, max: 3, entero: true },
  largoApoyo: { min: 0.1, max: 1.5 },
  apoyosIntermedios: { min: 0, max: 12, entero: true },
};
