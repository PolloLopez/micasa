// ==========================================================
// VALORES POR DEFECTO DEL LOFT DE REFERENCIA
// Los usan la app (estado inicial / "Restablecer") y los tests.
// ==========================================================

/** Configuración de una pared (panel). */
export const PARED_INICIAL = {
  separacionVerticales: 2.5, // columnas a lo largo de la pared (eje X)
  separacionHorizontales: 0.8, // horizontales en altura (eje Y)
  panel: 'panelMuros', // id del tipo de panel (ver TIPOS_PANEL_INICIALES en presupuesto.js)
};

export const PARAMS_INICIALES = {
  // Planta y altura
  largo: 7.5, // lados A y C (eje X)
  ancho: 4.5, // lados B y D (eje Z)
  altura: 4.5, // altura del lado bajo del techo
  elevacion: 0.5, // piso sobre el terreno
  ladoFrente: 'A',

  // Paredes: una configuración por lado
  paredes: {
    A: { ...PARED_INICIAL },
    B: { ...PARED_INICIAL },
    C: { ...PARED_INICIAL },
    D: { ...PARED_INICIAL },
  },

  // Pisos
  separacionPiso: 0.4,
  ladoEntrepiso: 'D', // lateral izquierdo si el frente es A
  anchoEntrepiso: 3,
  separacionPiso2: 0.4,
  separacionTransversalesPiso: 1.5, // 0 = sin transversales (la define el herrero)
  separacionTransversalesPiso2: 1.5,

  // Techo a una agua
  caidaTecho: 'C', // cae hacia el fondo si el frente es A
  pendienteTecho: 10, // %
  separacionVigasTecho: 1,
  separacionCorreasTecho: 0.8,
  panelTecho: 'panelTecho',

  // Compras
  excedenteBarras: 1, // % que las barras traen de más (vienen entre 1 % y 2 % más largas)

  // Fundación
  filasPilotines: 4,
  pilotinesPorFila: 3,
};

export const ABERTURAS_INICIALES = [
  { id: 1, tipo: 'puerta', lado: 'A', ladoReferencia: 'izquierda', offsetHorizontal: 1, alturaAntepecho: 0, ancho: 0.9, alto: 2.05 },
  { id: 2, tipo: 'ventana', lado: 'A', ladoReferencia: 'derecha', offsetHorizontal: 1.2, alturaAntepecho: 1.1, ancho: 1.5, alto: 0.6 },
];
