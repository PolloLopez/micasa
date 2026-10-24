// ==========================================================
// PROYECTOS BASE
// ----------------------------------------------------------
// - proyectoVacio(): lo que carga el botón "Nuevo". Sin aberturas,
//   sin entrepiso, sin transversales, techo plano, precios en $0,
//   perfiles y descripciones vacíos y un solo tipo de panel genérico.
//   Las medidas son las mínimas para que el 3D tenga algo que dibujar
//   (caja de 3 x 3 x 2,40 m).
// - proyectoEjemplo(): el loft de referencia (botón "Ejemplo").
// - gradaNueva() / gradaEjemplo(): proyectos de tipo grada (precios en $0 / con precios).
// - montajeNuevo() / montajeEjemplo(): montaje industrial (una mesa / mesa + tanque con precios).
// Son funciones (no constantes) para devolver siempre copias nuevas.
// ==========================================================

import { REVESTIMIENTO_POR_DEFECTO } from '../motor/revestimientos.js';
import { PARAMS_INICIALES, ABERTURAS_INICIALES } from '../motor/parametrosIniciales.js';
import { CATALOGO_FIJO, CATALOGO_INICIAL } from '../motor/presupuesto.js';
import { COLORES_INICIALES } from '../capas.js';
import { ESCALERA_INICIAL } from '../motor/escalera.js';
import { GRADA_INICIAL } from '../motor/grada.js';
import { MONTAJE_INICIAL } from '../motor/montaje.js';

const ID_PANEL_GENERICO = 'panel';

/** Proyecto sin datos (botón "Nuevo"). */
export function proyectoVacio() {
  const pared = {
    separacionVerticales: 3, separacionHorizontales: 0.8, separacionMontantes: 0, riostras: 'no',
    panel: ID_PANEL_GENERICO, panelInterior: '', etiqueta: '', mostrarEtiqueta: true,
    perfilColumnas: '', perfilHorizontales: '', perfilMontantes: '', perfilMarcos: '', // v1.22: el general
  };
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
      largoEntrepiso: 0, // si se agrega, ocupa todo el lado
      referenciaEntrepiso: 'izquierda',
      distanciaEntrepiso: 0,
      separacionColumnasEntrepiso: 3, // igual que las verticales de las paredes
      separacionPiso2: 0.4,
      separacionTransversalesPiso: 0, // sin transversales
      separacionTransversalesPiso2: 0,
      caidaTecho: 'C',
      pendienteTecho: 0, // techo plano
      separacionVigasTecho: 1,
      separacionCorreasTecho: 0.8,
      panelTecho: ID_PANEL_GENERICO,
      excedenteBarras: PARAMS_INICIALES.excedenteBarras, // dato del proveedor, no del proyecto
      compartirCortes: true,
      proveedorElegido: '',
      formaPago: 'efectivo',
      cantidades: {},
      techoConBorde: true,
      filasPilotines: 2,
      pilotinesPorFila: 2,
      piezasEliminadas: [],
      piezasEditadas: {},
      piezasAgregadas: [], // v1.16
      escalera: { ...ESCALERA_INICIAL, activa: false }, // sin escalera (no hay entrepiso)
      tipoProyecto: 'construccion',
      grada: { ...GRADA_INICIAL },
      montaje: structuredClone(MONTAJE_INICIAL),
    },
    aberturas: [],
    catalogo: [
      ...CATALOGO_FIJO.map((insumo) => ({ ...insumo, perfil: '', precio: 0 })),
      { id: ID_PANEL_GENERICO, categoria: 'panel', nombre: 'Panel', perfil: '', unidad: 'm²', largoBarra: null, precio: 0, color: '#10b981', colorInterior: '#e5e7eb', ...REVESTIMIENTO_POR_DEFECTO },
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

/** Grada nueva (botón "+ Grada nueva"): la grada de 6 filas, sin precios ni perfiles. */
export function gradaNueva() {
  const vacio = proyectoVacio();
  return { ...vacio, params: { ...vacio.params, tipoProyecto: 'grada', grada: { ...GRADA_INICIAL } } };
}

/** Grada de ejemplo (botón "Ejemplo: grada"): 6 filas de 6 m con precios de referencia. */
export function gradaEjemplo() {
  const ejemplo = proyectoEjemplo();
  return {
    ...ejemplo,
    nombre: 'Ejemplo: grada 6 filas x 6 m',
    params: { ...ejemplo.params, tipoProyecto: 'grada', grada: { ...GRADA_INICIAL } },
    aberturas: [],
  };
}

/** Montaje nuevo (botón "+ Montaje nuevo"): una mesa, sin precios ni perfiles. */
export function montajeNuevo() {
  const vacio = proyectoVacio();
  const mesa = structuredClone(MONTAJE_INICIAL.componentes[0]);
  return { ...vacio, params: { ...vacio.params, tipoProyecto: 'montaje', montaje: { componentes: [{ ...mesa, x: 0, nombre: 'Mesa' }] } } };
}

/** Montaje de ejemplo (botón "Ejemplo: montaje"): mesa de trabajo + tanque vertical con precios. */
export function montajeEjemplo() {
  const ejemplo = proyectoEjemplo();
  return {
    ...ejemplo,
    nombre: 'Ejemplo: mesa + tanque',
    params: { ...ejemplo.params, tipoProyecto: 'montaje', montaje: structuredClone(MONTAJE_INICIAL) },
    aberturas: [],
  };
}
