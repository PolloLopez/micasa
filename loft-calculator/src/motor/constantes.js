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
  COLUMNA_ESQUINA: 'columnaEsquina', // v1.22: las de esquina son de dos paredes: perfil propio
  MONTANTE: 'montante', // vertical liviano entre columnas (v1.17)
  MARCO_ABERTURA: 'marcoAbertura', // dintel, jambas y alféizar de puertas y ventanas (v1.14.1)
  MARCO: 'marco', // v1.28: solo las soleras (arriba de las paredes); antes también el marco de piso
  BORDE_PISO: 'bordePiso', // v1.28: marco de piso de planta baja y entrepiso
  PISO: 'piso',
  PISO_2: 'piso2',
  VIGA_CIERRE: 'vigaCierre', // borde libre del entrepiso (v1.14)
  TRANSVERSAL_PISO: 'transversalPiso',
  TRANSVERSAL_PISO_2: 'transversalPiso2',
  CORREA: 'correa',
  VIGA_TECHO: 'vigaTecho',
  CORREA_TECHO: 'correaTecho',
  BORDE_TECHO: 'bordeTecho', // v1.28: marco perimetral del techo (vigas de las puntas + correas de los bordes)
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
  GRADA_TABLON: 'gradaTablon', // asiento y pie del mismo tablón, o tablón único
  GRADA_UNION: 'gradaUnion', // caño bajo que une los parantes
  GRADA_RESPALDO: 'gradaRespaldo', // tabla de respaldo sobre la contrahuella
  GRADA_BULON: 'gradaBulon', // bulones para unir módulos
  GRADA_TORNILLO: 'gradaTornillo', // tornillos de tablones (filas atornillables)
  // Montaje industrial
  MONTAJE_PATA: 'montajePata',
  MONTAJE_MARCO: 'montajeMarco',
  MONTAJE_CHAPA_TANQUE: 'montajeChapaTanque',
  MONTAJE_CHAPA_MESA: 'montajeChapaMesa',
  MONTAJE_MADERA: 'montajeMadera',
  MONTAJE_SOLDADURA: 'montajeSoldadura',
};

// Límites de los componentes de un montaje (ver motor/montaje.js).
export const LIMITES_COMPONENTE = {
  x: { min: -50, max: 50 },
  z: { min: -50, max: 50 },
};
export const LIMITES_MESA = {
  largo: { min: 0.3, max: 20 },
  ancho: { min: 0.3, max: 5 },
  alto: { min: 0.2, max: 5 },
  separacionPatas: { min: 0.5, max: 20, opcional: true }, // 0 = solo esquinas
  alturaMarcoInferior: { min: 0.05, max: 2 },
  separacionTravesanos: { min: 0.2, max: 5, opcional: true }, // 0 = sin
};
export const LIMITES_TANQUE = {
  diametro: { min: 0.2, max: 6 },
  largo: { min: 0.2, max: 20 },
  espesorChapa: { min: 0.5, max: 25 },
  alturaSoporte: { min: 0, max: 10 },
  apoyos: { min: 2, max: 8, entero: true },
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
  anchoTablon: { min: 0.1, max: 0.6 },
  tablonesPorFila: { min: 1, max: 6, entero: true },
  alturaUnion: { min: 0.05, max: 1 },
  anchoRespaldo: { min: 0.08, max: 0.6 },
  modulos: { min: 1, max: 20, entero: true },
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
  largoEntrepiso: { min: 1, max: 30, opcional: true }, // 0 = todo el lado
  distanciaEntrepiso: { min: 0, max: 30 },
  separacionColumnasEntrepiso: { min: 0.5, max: 30, opcional: true }, // 0 = solo en las puntas
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
  separacionMontantes: { min: 0.2, max: 5, opcional: true }, // v1.17: 0 = sin montantes
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

/**
 * v1.22: perfiles que puede cambiar cada pared (campo en params.paredes.<lado>)
 * y el renglón del catálogo que reemplaza cada uno.
 */
export const PERFILES_DE_PARED = {
  perfilColumnas: INSUMO.COLUMNA,
  perfilHorizontales: INSUMO.CORREA,
  perfilMontantes: INSUMO.MONTANTE,
  perfilMarcos: INSUMO.MARCO,
};
export const CAMPOS_PERFIL_PARED = Object.keys(PERFILES_DE_PARED);
