// ==========================================================
// CONSTANTES DEL SISTEMA CONSTRUCTIVO (loft steel frame)
// ----------------------------------------------------------
// Todos los "números mágicos" viven acá, con nombre y unidad.
// Si cambia un supuesto de obra, se cambia en un solo lugar.
// Todas las medidas están en METROS salvo que se indique.
// ==========================================================

// Altura del piso del altillo (mezzanine) medida desde el piso del loft.
export const ALTURA_PISO_ALTILLO = 2.3;

// Espesor que se pierde en cada corte con disco (kerf = ancho del disco).
export const MERMA_POR_CORTE = 0.003;

// Placa OSB comercial: 2,44 m x 1,22 m.
export const PLACA_OSB = { largo: 2.44, ancho: 1.22 };

// Desperdicio estimado al cortar placas OSB (recortes en bordes y huecos).
export const DESPERDICIO_PLACAS = 0.1; // 10 %

// Factor por pendiente del techo: el faldón es un poco más largo que la planta.
export const FACTOR_PENDIENTE_TECHO = 1.05;

// IDs fijos del catálogo: el cálculo sabe qué insumo usar para cada pieza.
export const INSUMO = {
  COLUMNA: 'columna',
  MARCO: 'marco',
  TIRANTE: 'tirante',
  CORREA: 'correa',
  OSB: 'osb',
  PUR: 'pur',
  PILOTIN: 'pilotin',
};

// Límites de validación (ver motor/validacion.js).
// Evitan valores que cuelguen el visor (paso 0 => bucle infinito)
// o que no tengan sentido constructivo.
export const LIMITES = {
  frente: { min: 2, max: 30 },
  profundidad: { min: 2, max: 30 },
  altura: { min: 2.4, max: 8 },
  elevacion: { min: 0, max: 2 },
  anchoMezzanine: { min: 0, max: 30 },
  distanciaColumnas: { min: 0.5, max: 10 },
  pasoTirantesPiso: { min: 0.2, max: 2 },
  pasoTirantesAltillo: { min: 0.2, max: 2 },
  separacionCorreas: { min: 0.2, max: 2 },
  filasPilotines: { min: 2, max: 20, entero: true },
  pilotinesPorFila: { min: 2, max: 20, entero: true },
};
