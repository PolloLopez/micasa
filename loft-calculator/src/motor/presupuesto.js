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
export const CATALOGO_INICIAL = [
  { id: INSUMO.COLUMNA, nombre: 'Caño estructural 100x100x1.6 (columnas y vanos)', unidad: 'barra', largoBarra: 6, precio: 38000 },
  { id: INSUMO.MARCO, nombre: 'Perfil C 120x50x2.0 (marcos)', unidad: 'barra', largoBarra: 6, precio: 35000 },
  { id: INSUMO.TIRANTE, nombre: 'Perfil C 100x45x2.0 (tirantes)', unidad: 'barra', largoBarra: 6, precio: 26000 },
  { id: INSUMO.CORREA, nombre: 'Perfil C 80x40x1.6 (correas)', unidad: 'barra', largoBarra: 6, precio: 22000 },
  { id: INSUMO.OSB, nombre: 'Placa OSB 18 mm 2.44x1.22', unidad: 'placa', largoBarra: null, precio: 28000 },
  { id: INSUMO.PUR, nombre: 'Panel PUR 50 mm (muros + techo)', unidad: 'm²', largoBarra: null, precio: 35000 },
  { id: INSUMO.PILOTIN, nombre: 'Pilotín de hormigón', unidad: 'u', largoBarra: null, precio: 15000 },
];

const buscar = (catalogo, id) => catalogo.find((p) => p.id === id);

/** Ítem de perfil: cantidad de barras sale del optimizador de cortes. */
function itemPerfil(producto, piezas) {
  const cortes = optimizarCortes(piezas, producto.largoBarra);
  return {
    id: producto.id,
    nombre: producto.nombre,
    unidad: producto.unidad,
    cantidad: cortes.totalBarras,
    precio: producto.precio,
    detalle: `${piezas.length} piezas · desperdicio ${cortes.porcentajeDesperdicio.toFixed(1)} %` +
      (cortes.piezasEmpalmadas > 0 ? ` · ${cortes.piezasEmpalmadas} empalmadas` : ''),
    cortes,
  };
}

/** Ítem simple: cantidad ya calculada. */
function itemSimple(producto, cantidad, detalle) {
  return {
    id: producto.id,
    nombre: producto.nombre,
    unidad: producto.unidad,
    cantidad,
    precio: producto.precio,
    detalle,
    cortes: null,
  };
}

/**
 * @param {object} estructura - resultado de generarEstructura()
 * @param {object[]} catalogo - insumos con id, largoBarra y precio
 * @returns {{items: object[], total: number}}
 */
export function calcularPresupuesto(estructura, catalogo) {
  const { columnas, marcos, tirantes, correas, refuerzosAberturas, pilotines, superficies } = estructura;
  const s = superficies;

  // Perfiles: se optimizan las piezas reales que se dibujan en 3D.
  const piezasColumnas = [...columnas.map((c) => c.largo), ...refuerzosAberturas];
  const items = [
    itemPerfil(buscar(catalogo, INSUMO.COLUMNA), piezasColumnas),
    itemPerfil(buscar(catalogo, INSUMO.MARCO), marcos.map((m) => m.largo)),
    itemPerfil(buscar(catalogo, INSUMO.TIRANTE), tirantes.map((t) => t.largo)),
    itemPerfil(buscar(catalogo, INSUMO.CORREA), correas.map((c) => c.largo)),
  ];

  // Placas OSB: superficie / placa, + desperdicio de recortes.
  const areaPlaca = PLACA_OSB.largo * PLACA_OSB.ancho;
  const areaOsb = s.pisoOsb + s.altilloOsb;
  const placas = Math.ceil((areaOsb * (1 + DESPERDICIO_PLACAS)) / areaPlaca);
  items.push(
    itemSimple(buscar(catalogo, INSUMO.OSB), placas,
      `${areaOsb.toFixed(2)} m² + ${DESPERDICIO_PLACAS * 100} % recortes`)
  );

  // Paneles PUR en m²: muros netos (sin aberturas) + techo.
  const m2Pur = Math.ceil(s.murosNetos + s.techo);
  items.push(
    itemSimple(buscar(catalogo, INSUMO.PUR), m2Pur,
      `muros ${s.murosNetos.toFixed(2)} m² (−${s.aberturas.toFixed(2)} aberturas) + techo ${s.techo.toFixed(2)} m²`)
  );

  items.push(itemSimple(buscar(catalogo, INSUMO.PILOTIN), pilotines.length, 'grilla de fundación'));

  // Subtotales y total.
  items.forEach((item) => {
    item.subtotal = item.cantidad * (item.precio || 0);
  });
  const total = items.reduce((acc, item) => acc + item.subtotal, 0);

  return { items, total };
}
