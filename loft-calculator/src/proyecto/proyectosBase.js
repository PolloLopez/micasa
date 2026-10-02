// ==========================================================
// PROYECTOS BASE
// ----------------------------------------------------------
// - proyectoVacio(): lo que carga el botón "Nuevo". Sin aberturas,
//   sin entrepiso, sin transversales, techo plano, precios en $0,
//   perfiles y descripciones vacíos y un solo tipo de panel genérico.
//   Las medidas son las mínimas para que el 3D tenga algo que dibujar
//   (caja de 3 x 3 x 2,40 m).
// - proyectoEjemplo(): el loft de referencia (botón "Ejemplo").
// Son funciones (no constantes) para devolver siempre copias nuevas.
// ==========================================================

import { PARAMS_INICIALES, ABERTURAS_INICIALES } from '../motor/parametrosIniciales.js';
import { CATALOGO_FIJO, CATALOGO_INICIAL } from '../motor/presupuesto.js';
import { COLORES_INICIALES } from '../capas.js';

const ID_PANEL_GENERICO = 'panel';

/** Proyecto sin datos (botón "Nuevo"). */
export function proyectoVacio() {
  const pared = { separacionVerticales: 3, separacionHorizontales: 0.8, panel: ID_PANEL_GENERICO };
  return {
    nombre: '',
    params: {
      largo: 3,
      ancho: 3,
      altura: 2.4,
      elevacion: 0,
      ladoFrente: 'A',
      paredes: { A: { ...pared }, B: { ...pared }, C: { ...pared }, D: { ...pared } },
      separacionPiso: 0.4,
      ladoEntrepiso: 'D',
      anchoEntrepiso: 0, // sin entrepiso
      separacionPiso2: 0.4,
      separacionTransversalesPiso: 0, // sin transversales
      separacionTransversalesPiso2: 0,
      caidaTecho: 'C',
      pendienteTecho: 0, // techo plano
      separacionVigasTecho: 1,
      separacionCorreasTecho: 0.8,
      panelTecho: ID_PANEL_GENERICO,
      excedenteBarras: PARAMS_INICIALES.excedenteBarras, // dato del proveedor, no del proyecto
      filasPilotines: 2,
      pilotinesPorFila: 2,
    },
    aberturas: [],
    catalogo: [
      ...CATALOGO_FIJO.map((insumo) => ({ ...insumo, perfil: '', precio: 0 })),
      { id: ID_PANEL_GENERICO, categoria: 'panel', nombre: 'Panel', perfil: '', unidad: 'm²', largoBarra: null, precio: 0, color: '#10b981' },
    ],
    colores: { ...COLORES_INICIALES },
  };
}

/** Loft de referencia (botón "Ejemplo"). */
export function proyectoEjemplo() {
  return {
    nombre: 'Ejemplo: loft 7,50 x 4,50',
    params: structuredClone(PARAMS_INICIALES),
    aberturas: structuredClone(ABERTURAS_INICIALES),
    catalogo: structuredClone(CATALOGO_INICIAL),
    colores: { ...COLORES_INICIALES },
  };
}
