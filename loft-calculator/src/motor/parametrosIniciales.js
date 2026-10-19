// ==========================================================
// VALORES POR DEFECTO DEL LOFT DE REFERENCIA
// Los usan la app (estado inicial / "Restablecer") y los tests.
// ==========================================================

import { GRADA_INICIAL } from './grada.js';
import { MONTAJE_INICIAL } from './montaje.js';
import { ESCALERA_INICIAL } from './escalera.js';

/** Configuración de una pared (panel). */
export const PARED_INICIAL = {
  separacionVerticales: 2.5, // columnas a lo largo de la pared (eje X)
  separacionHorizontales: 0.8, // horizontales (fajas) en altura (eje Y)
  separacionMontantes: 0, // v1.17: montantes (verticales livianos) entre columnas; 0 = sin
  riostras: 'no', // v1.17: riostras en cruz: 'no' | 'extremos' | 'todos'
  panel: 'panelMuros', // revestimiento exterior: id del tipo (ver TIPOS_PANEL_INICIALES en presupuesto.js)
  panelInterior: '', // revestimiento interior (v1.15): id del tipo, '' = sin
  etiqueta: '', // texto del cartel en el 3D; '' = nombre automático (Frente, Lateral…)
  mostrarEtiqueta: true,
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
  anchoEntrepiso: 3, // profundidad del entrepiso (desde la pared donde se apoya)
  largoEntrepiso: 0, // 0 = ocupa todo el lado; si no, entrepiso parcial (v1.14)
  referenciaEntrepiso: 'izquierda', // desde qué esquina se mide la distancia (como las aberturas)
  distanciaEntrepiso: 0, // distancia de esa esquina al comienzo del entrepiso
  separacionColumnasEntrepiso: 2.5, // columnas del borde libre cada X m (0 = solo en las puntas)
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

  // Piezas que el usuario eliminó a mano (IDs de motor/estructura.js)
  tipoProyecto: 'construccion', // 'construccion' | 'grada' | 'montaje'
  grada: { ...GRADA_INICIAL }, // solo se usa si tipoProyecto = 'grada'
  montaje: structuredClone(MONTAJE_INICIAL), // solo se usa si tipoProyecto = 'montaje'
  piezasEliminadas: [],
  piezasAgregadas: [], // v1.16: [{ id: 'agr:1', tipo, grupos, desde, hasta, insumo }] (duplicadas a mano)
  piezasEditadas: {}, // { idPieza: { recorteInicio, recorteFin, moverX, moverY, moverZ, perfil } }

  // Escalera al borde del entrepiso (ver motor/escalera.js)
  escalera: { ...ESCALERA_INICIAL },
};

export const ABERTURAS_INICIALES = [
  { id: 1, tipo: 'puerta', lado: 'A', ladoReferencia: 'izquierda', offsetHorizontal: 1, alturaAntepecho: 0, ancho: 0.9, alto: 2.05 },
  { id: 2, tipo: 'ventana', lado: 'A', ladoReferencia: 'derecha', offsetHorizontal: 1.2, alturaAntepecho: 1.1, ancho: 1.5, alto: 0.6 },
];
