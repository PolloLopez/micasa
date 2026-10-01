// ==========================================================
// PRESUPUESTO
// ----------------------------------------------------------
// Convierte la estructura (piezas y superficies) en cantidades a
// comprar, usando el catálogo (largo comercial y precio de cada insumo).
//
// El catálogo tiene dos partes:
//   - Insumos FIJOS (perfiles, OSB, pilotines): IDs fijos porque el
//     cálculo sabe qué pieza va con cada uno.
//   - TIPOS DE PANEL (categoria 'panel'): lista libre; cada pared y el
//     techo eligen uno. Se pueden agregar o quitar.
// ==========================================================

import { optimizarCortes } from './optimizadorCortes.js';
import { INSUMO, PLACA_OSB, DESPERDICIO_PLACAS } from './constantes.js';

/** Insumos fijos. El perfil y el precio se editan desde la pantalla. */
export const CATALOGO_FIJO = [
  { id: INSUMO.COLUMNA, categoria: 'perfil', nombre: 'Columnas y vanos', perfil: 'Caño estructural 100x100x1.6', unidad: 'barra', largoBarra: 6, precio: 38000 },
  { id: INSUMO.MARCO, categoria: 'perfil', nombre: 'Marcos y soleras', perfil: 'Perfil C 120x50x2.0', unidad: 'barra', largoBarra: 6, precio: 35000 },
  { id: INSUMO.PISO, categoria: 'perfil', nombre: 'Estructura de piso', perfil: 'Perfil C 100x45x2.0', unidad: 'barra', largoBarra: 6, precio: 26000 },
  { id: INSUMO.TRANSVERSAL_PISO, categoria: 'perfil', nombre: 'Transversales de piso', perfil: 'Perfil C 80x40x1.6', unidad: 'barra', largoBarra: 6, precio: 22000 },
  { id: INSUMO.PISO_2, categoria: 'perfil', nombre: 'Estructura de piso 2', perfil: 'Perfil C 100x45x2.0', unidad: 'barra', largoBarra: 6, precio: 26000 },
  { id: INSUMO.TRANSVERSAL_PISO_2, categoria: 'perfil', nombre: 'Transversales de piso 2', perfil: 'Perfil C 80x40x1.6', unidad: 'barra', largoBarra: 6, precio: 22000 },
  { id: INSUMO.CORREA, categoria: 'perfil', nombre: 'Horizontales de pared', perfil: 'Perfil C 80x40x1.6', unidad: 'barra', largoBarra: 6, precio: 22000 },
  { id: INSUMO.VIGA_TECHO, categoria: 'perfil', nombre: 'Vigas de techo', perfil: 'Perfil C 120x50x2.0', unidad: 'barra', largoBarra: 6, precio: 35000 },
  { id: INSUMO.CORREA_TECHO, categoria: 'perfil', nombre: 'Correas de techo', perfil: 'Perfil C 80x40x1.6', unidad: 'barra', largoBarra: 6, precio: 22000 },
  { id: INSUMO.OSB, categoria: 'placa', nombre: 'Placas OSB', perfil: 'OSB 18 mm 2.44x1.22', unidad: 'placa', largoBarra: null, precio: 28000 },
  { id: INSUMO.PILOTIN, categoria: 'unidad', nombre: 'Pilotines', perfil: 'Pilotín de hormigón', unidad: 'u', largoBarra: null, precio: 15000 },
];

/** Tipos de panel iniciales: uno para paredes y otro para el techo. */
export const TIPOS_PANEL_INICIALES = [
  { id: 'panelMuros', categoria: 'panel', nombre: 'Panel de pared', perfil: 'Panel PUR 50 mm', unidad: 'm²', largoBarra: null, precio: 35000, color: '#10b981' },
  { id: 'panelTecho', categoria: 'panel', nombre: 'Panel de techo', perfil: 'Panel PUR techo 50 mm', unidad: 'm²', largoBarra: null, precio: 38000, color: '#14b8a6' },
];

export const CATALOGO_INICIAL = [...CATALOGO_FIJO, ...TIPOS_PANEL_INICIALES];

/** Tipos de panel del catálogo. */
export const tiposDePanel = (catalogo) => catalogo.filter((p) => p.categoria === 'panel');

const buscar = (catalogo, id) => catalogo.find((p) => p.id === id);
const largos = (piezas) => piezas.map((p) => p.largo);

/**
 * Ítem de perfil: la cantidad de barras sale del optimizador de cortes.
 * Las barras vienen un `excedente` % más largas que su largo nominal,
 * y el optimizador corta sobre ese largo real.
 */
function itemPerfil(producto, piezas, excedente) {
  const largoReal = producto.largoBarra * (1 + excedente / 100);
  const cortes = optimizarCortes(piezas, largoReal);
  const detalle = piezas.length === 0
    ? 'no lleva'
    : `${piezas.length} piezas · desperdicio ${cortes.porcentajeDesperdicio.toFixed(1)} %` +
      (cortes.piezasEmpalmadas > 0 ? ` · ${cortes.piezasEmpalmadas} empalmadas` : '');
  return { ...producto, cantidad: cortes.totalBarras, detalle, cortes, largoReal };
}

/** Ítem simple: cantidad ya calculada. */
function itemSimple(producto, cantidad, detalle) {
  return { ...producto, cantidad, detalle, cortes: null };
}

/** m² de cada tipo de panel: suma de paredes (netas) y techo que lo usan. */
function metrosPorPanel(estructura) {
  const metros = {};
  const sumar = (id, m2, donde) => {
    metros[id] ??= { m2: 0, donde: [] };
    metros[id].m2 += m2;
    metros[id].donde.push(donde);
  };
  estructura.paredes.forEach((p) => sumar(p.panel, p.superficieNeta, `lado ${p.lado}`));
  sumar(estructura.techo.panel, estructura.techo.superficie, 'techo');
  return metros;
}

/**
 * @param {object} estructura - resultado de generarEstructura()
 * @param {object[]} catalogo - insumos fijos + tipos de panel
 * @param {{ excedenteBarras?: number }} opciones - % extra de largo de las barras
 * @returns {{items: object[], total: number}}
 */
export function calcularPresupuesto(estructura, catalogo, { excedenteBarras = 0 } = {}) {
  const e = estructura;
  const s = e.superficies;
  const insumo = (id) => buscar(catalogo, id);
  const perfil = (id, piezas) => itemPerfil(insumo(id), largos(piezas), excedenteBarras);

  const items = [
    itemPerfil(insumo(INSUMO.COLUMNA), [...largos(e.columnas), ...e.refuerzosAberturas], excedenteBarras),
    perfil(INSUMO.MARCO, e.marcos),
    perfil(INSUMO.PISO, e.piso.tirantes),
    perfil(INSUMO.TRANSVERSAL_PISO, e.piso.transversales),
    perfil(INSUMO.PISO_2, e.piso2.tirantes),
    perfil(INSUMO.TRANSVERSAL_PISO_2, e.piso2.transversales),
    perfil(INSUMO.CORREA, e.correas),
    perfil(INSUMO.VIGA_TECHO, e.techo.vigas),
    perfil(INSUMO.CORREA_TECHO, e.techo.correas),
  ];

  // Placas OSB: superficie / placa, + desperdicio de recortes.
  const areaPlaca = PLACA_OSB.largo * PLACA_OSB.ancho;
  const areaOsb = s.piso + s.piso2;
  items.push(
    itemSimple(insumo(INSUMO.OSB), Math.ceil((areaOsb * (1 + DESPERDICIO_PLACAS)) / areaPlaca),
      `${areaOsb.toFixed(2)} m² (piso + piso 2) + ${DESPERDICIO_PLACAS * 100} % recortes`)
  );

  // Paneles: un renglón por tipo, con los m² de las paredes y el techo que lo usan.
  const metros = metrosPorPanel(e);
  tiposDePanel(catalogo).forEach((tipo) => {
    const uso = metros[tipo.id];
    items.push(
      uso
        ? itemSimple(tipo, Math.ceil(uso.m2), `${uso.m2.toFixed(2)} m² · ${uso.donde.join(', ')}`)
        : itemSimple(tipo, 0, 'sin uso')
    );
  });

  items.push(itemSimple(insumo(INSUMO.PILOTIN), e.pilotines.length, 'grilla de fundación'));

  items.forEach((item) => {
    item.subtotal = item.cantidad * (item.precio || 0);
  });
  const total = items.reduce((acc, item) => acc + item.subtotal, 0);

  return { items, total };
}
