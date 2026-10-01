// ==========================================================
// PRESUPUESTO
// ----------------------------------------------------------
// Convierte la estructura (piezas y superficies) en cantidades a
// comprar, usando el catálogo (largo comercial y precio de cada insumo).
// ==========================================================

import { optimizarCortes } from './optimizadorCortes.js';
import { INSUMO, PLACA_OSB, DESPERDICIO_PLACAS } from './constantes.js';

// Catálogo inicial. Los IDs son fijos porque el cálculo los usa
// para saber qué perfil corresponde a cada tipo de pieza.
// El perfil y el precio de cada renglón se editan desde la pantalla.
export const CATALOGO_INICIAL = [
  { id: INSUMO.COLUMNA, nombre: 'Columnas y vanos', perfil: 'Caño estructural 100x100x1.6', unidad: 'barra', largoBarra: 6, precio: 38000 },
  { id: INSUMO.MARCO, nombre: 'Marcos y soleras', perfil: 'Perfil C 120x50x2.0', unidad: 'barra', largoBarra: 6, precio: 35000 },
  { id: INSUMO.PISO, nombre: 'Estructura de piso', perfil: 'Perfil C 100x45x2.0', unidad: 'barra', largoBarra: 6, precio: 26000 },
  { id: INSUMO.PISO_2, nombre: 'Estructura de piso 2', perfil: 'Perfil C 100x45x2.0', unidad: 'barra', largoBarra: 6, precio: 26000 },
  { id: INSUMO.TRANSVERSAL, nombre: 'Transversales', perfil: 'Perfil C 80x40x1.6', unidad: 'barra', largoBarra: 6, precio: 22000 },
  { id: INSUMO.CORREA, nombre: 'Horizontales de pared', perfil: 'Perfil C 80x40x1.6', unidad: 'barra', largoBarra: 6, precio: 22000 },
  { id: INSUMO.VIGA_TECHO, nombre: 'Vigas de techo', perfil: 'Perfil C 120x50x2.0', unidad: 'barra', largoBarra: 6, precio: 35000 },
  { id: INSUMO.CORREA_TECHO, nombre: 'Correas de techo', perfil: 'Perfil C 80x40x1.6', unidad: 'barra', largoBarra: 6, precio: 22000 },
  { id: INSUMO.OSB, nombre: 'Placas OSB', perfil: 'OSB 18 mm 2.44x1.22', unidad: 'placa', largoBarra: null, precio: 28000 },
  { id: INSUMO.PANEL_MUROS, nombre: 'Panel de muros', perfil: 'Panel PUR 50 mm', unidad: 'm²', largoBarra: null, precio: 35000 },
  { id: INSUMO.PANEL_TECHO, nombre: 'Panel de techo', perfil: 'Panel PUR 50 mm', unidad: 'm²', largoBarra: null, precio: 35000 },
  { id: INSUMO.PILOTIN, nombre: 'Pilotines', perfil: 'Pilotín de hormigón', unidad: 'u', largoBarra: null, precio: 15000 },
];

const buscar = (catalogo, id) => catalogo.find((p) => p.id === id);
const largos = (piezas) => piezas.map((p) => p.largo);

/** Ítem de perfil: la cantidad de barras sale del optimizador de cortes. */
function itemPerfil(producto, piezas) {
  const cortes = optimizarCortes(piezas, producto.largoBarra);
  const detalle = piezas.length === 0
    ? 'no lleva'
    : `${piezas.length} piezas · desperdicio ${cortes.porcentajeDesperdicio.toFixed(1)} %` +
      (cortes.piezasEmpalmadas > 0 ? ` · ${cortes.piezasEmpalmadas} empalmadas` : '');
  return { ...producto, cantidad: cortes.totalBarras, detalle, cortes };
}

/** Ítem simple: cantidad ya calculada. */
function itemSimple(producto, cantidad, detalle) {
  return { ...producto, cantidad, detalle, cortes: null };
}

/**
 * @param {object} estructura - resultado de generarEstructura()
 * @param {object[]} catalogo - insumos con id, largoBarra y precio
 * @returns {{items: object[], total: number}}
 */
export function calcularPresupuesto(estructura, catalogo) {
  const e = estructura;
  const s = e.superficies;
  const insumo = (id) => buscar(catalogo, id);

  const items = [
    itemPerfil(insumo(INSUMO.COLUMNA), [...largos(e.columnas), ...e.refuerzosAberturas]),
    itemPerfil(insumo(INSUMO.MARCO), largos(e.marcos)),
    itemPerfil(insumo(INSUMO.PISO), largos(e.piso.tirantes)),
    itemPerfil(insumo(INSUMO.PISO_2), largos(e.piso2.tirantes)),
    itemPerfil(insumo(INSUMO.TRANSVERSAL), largos([...e.piso.transversales, ...e.piso2.transversales])),
    itemPerfil(insumo(INSUMO.CORREA), largos(e.correas)),
    itemPerfil(insumo(INSUMO.VIGA_TECHO), largos(e.techo.vigas)),
    itemPerfil(insumo(INSUMO.CORREA_TECHO), largos(e.techo.correas)),
  ];

  // Placas OSB: superficie / placa, + desperdicio de recortes.
  const areaPlaca = PLACA_OSB.largo * PLACA_OSB.ancho;
  const areaOsb = s.piso + s.piso2;
  items.push(
    itemSimple(insumo(INSUMO.OSB), Math.ceil((areaOsb * (1 + DESPERDICIO_PLACAS)) / areaPlaca),
      `${areaOsb.toFixed(2)} m² (piso + piso 2) + ${DESPERDICIO_PLACAS * 100} % recortes`)
  );

  items.push(
    itemSimple(insumo(INSUMO.PANEL_MUROS), Math.ceil(s.murosNetos),
      `${s.murosNetos.toFixed(2)} m² netos (−${s.aberturas.toFixed(2)} m² de aberturas)`)
  );
  items.push(
    itemSimple(insumo(INSUMO.PANEL_TECHO), Math.ceil(s.techo),
      `${s.techo.toFixed(2)} m² medidos sobre la pendiente`)
  );
  items.push(itemSimple(insumo(INSUMO.PILOTIN), e.pilotines.length, 'grilla de fundación'));

  items.forEach((item) => {
    item.subtotal = item.cantidad * (item.precio || 0);
  });
  const total = items.reduce((acc, item) => acc + item.subtotal, 0);

  return { items, total };
}
