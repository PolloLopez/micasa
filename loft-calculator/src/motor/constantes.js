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
  TRANSVERSAL: 'transversal',
  CORREA: 'correa',
  VIGA_TECHO: 'vigaTecho',
  CORREA_TECHO: 'correaTecho',
  OSB: 'osb',
  PANEL_MUROS: 'panelMuros',
  PANEL_TECHO: 'panelTecho',
  PILOTIN: 'pilotin',
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
  separacionTransversales: { min: 0.3, max: 6, opcional: true },
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
