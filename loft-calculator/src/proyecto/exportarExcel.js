// ==========================================================
// Excel de la obra (v1.26; v1.28: 4 hojas como máximo, según lo elegido)
// ----------------------------------------------------------
// Arma las hojas (filas y columnas) a partir de lo que ya calcula la app.
// El archivo en sí lo hace xlsx.js.
//
//   Obra      datos de la obra, medidas del 3D y presupuesto (cantidad, precio, subtotal)
//   Paredes   cada pared: cotas, piezas (perfil, largo, cantidad), aberturas y revestimiento
//   Plantas   piso, entrepiso y techo: piezas de cada uno
//   Cortes    cómo cortar cada barra
// ==========================================================

import { crearXlsx } from './xlsx.js';
import { nombreLado } from '../motor/geometria.js';
import { NOMBRE_PLANTA } from '../motor/planos.js';
import { agruparBarras } from './cortesAgrupados.js';

const m = (n) => Math.round(n * 100) / 100; // metros con 2 decimales

/** Tabla de piezas agrupadas (la lista para cortar de una pared o planta). */
const filasDePiezas = (lista) => [
  { negrita: true, celdas: ['Pieza', 'Perfil', 'Largo (m)', 'Cantidad', 'Metros'] },
  ...lista.map((g) => [g.nombre, g.perfil, g.largo, g.cantidad, m(g.largo * g.cantidad)]),
  { negrita: true, celdas: ['Total', '', '', lista.reduce((a, g) => a + g.cantidad, 0), m(lista.reduce((a, g) => a + g.largo * g.cantidad, 0))] },
];

/** Nombre de una pared como en la pantalla: "Frente (A)" o la etiqueta propia "Patio (B)". */
export function nombreDePared(lado, params) {
  const propia = params.paredes?.[lado]?.etiqueta?.trim();
  return `${propia || nombreLado(lado, params.ladoFrente)} (${lado})`;
}

/** Filas de una pared (para la hoja "Paredes", una abajo de la otra). */
function filasDePared(v, params) {
  const [h1, h2] = v.alturas;
  return [
    { negrita: true, celdas: [`Pared ${nombreDePared(v.lado, params)} — vista desde afuera`, `Largo ${m(v.largo)} m · alto ${m(h1)} m${Math.abs(h1 - h2) > 0.005 ? ` a ${m(h2)} m` : ''}`] },
    ['Columnas y jambas en (m desde la esquina izq.)', ...v.cotas.columnas],
    ['Horizontales (fajas) a (m desde el piso)', ...(v.cotas.fajas.length ? v.cotas.fajas : ['sin fajas'])],
    ...filasDePiezas(v.lista),
    ...(v.aberturas.length ? [
      { negrita: true, celdas: ['Abertura', 'Tipo', 'Ancho (m)', 'Alto (m)', 'Antepecho (m)', 'Desde esquina izq. (m)'] },
      ...v.aberturas.map((a) => [`#${a.numero}${a.etiqueta ? ` ${a.etiqueta}` : ''}`, a.tipo, a.ancho, a.alto, a.antepecho, m(a.desde)]),
    ] : []),
    ...(v.revestimiento.length ? [
      { negrita: true, celdas: ['Revestimiento', 'Tipo', 'Qué pedir'] },
      ...v.revestimiento.map((r) => [r.cara, r.nombre, r.detalle]),
    ] : []),
    [],
  ];
}

/** Qué partes van, si no se dice (el Excel completo). */
export const PARTES_EXCEL = { resumen: true, medidas: true, presupuesto: true, cortes: true, paredes: true, plantas: true };

/**
 * Hojas del libro (v1.28: pocas hojas, como el PDF): "Obra" (datos, medidas y presupuesto),
 * "Paredes" (todas, una abajo de la otra), "Plantas" y "Cortes", según lo elegido.
 * @param {object} datos { nombre, params, vistas: { paredes, plantas }, items, total, gruposCortes, proveedor, pago, resumen, medidas }
 * @param {object} partes { resumen, medidas, presupuesto, cortes, paredes, plantas } (true = va)
 */
export function hojasDeObra({ nombre, params, vistas, items, total, gruposCortes = [], proveedor = '', pago = '', resumen = [], medidas = [] }, partes = PARTES_EXCEL) {
  const fecha = new Date().toLocaleDateString('es-AR');
  const hojas = [];

  const obra = [
    { negrita: true, celdas: [nombre || 'Proyecto sin nombre'] },
    [`Pollo Calculator · ${fecha}${proveedor ? ` · ${proveedor}` : ''}${pago ? ` · ${pago}` : ''}`],
    [],
  ];
  if (partes.resumen && resumen.length) {
    obra.push({ negrita: true, celdas: ['Datos de la obra'] }, ...resumen.map(([que, como]) => [que, como]), []);
  }
  if (partes.medidas && medidas.length) {
    obra.push({ negrita: true, celdas: ['Medidas tomadas en el 3D'] }, ...medidas.map((md) => [md.nombre, md.texto]), []);
  }
  if (partes.presupuesto) {
    obra.push(
      { negrita: true, celdas: ['Insumo', 'Perfil o descripción', 'Cantidad', 'Unidad', 'Precio unit.', 'Subtotal'] },
      ...items.filter((i) => i.cantidad > 0).map((i) => [
        i.nombre, i.perfil ?? '', i.cantidad, i.unidad ?? '', { pesos: i.precio }, { pesos: i.subtotal },
      ]),
      { negrita: true, celdas: ['TOTAL', '', '', '', '', { pesos: total }] },
    );
  }
  if (obra.length > 3) hojas.push({ nombre: 'Obra', anchos: [30, 60, 10, 10, 14, 16], filas: obra });

  if (partes.paredes && vistas.paredes.length) {
    hojas.push({
      nombre: 'Paredes',
      anchos: [40, 32, 12, 10, 12, 14],
      filas: [
        ['Cada pared vista desde afuera: medidas desde la esquina izquierda y desde el piso.'],
        [],
        ...vistas.paredes.flatMap((v) => filasDePared(v, params)),
      ],
    });
  }

  if (partes.plantas && vistas.plantas.length) {
    hojas.push({
      nombre: 'Plantas',
      anchos: [28, 32, 12, 10, 12],
      filas: vistas.plantas.flatMap((p) => [
        { negrita: true, celdas: [`${NOMBRE_PLANTA[p.nivel]} — vista desde arriba`, `${m(p.largo)} x ${m(p.ancho)} m`] },
        ...filasDePiezas(p.lista),
        [],
      ]),
    });
  }

  if (partes.cortes && gruposCortes.length) {
    const filas = [{ negrita: true, celdas: ['Cómo cortar cada barra'] }, []];
    gruposCortes.filter((g) => g.cortes.totalBarras > 0).forEach((g) => {
      filas.push({ negrita: true, celdas: [`${g.renglones.map((r) => r.nombre).join(' + ')} — ${g.perfil}`, `${g.cortes.totalBarras} barras de ${g.largoBarra} m`] });
      // v1.28: las barras que se cortan igual, juntas ("16 barras: 6.06").
      filas.push({ negrita: true, celdas: ['Barras', 'Piezas (m)', 'Sobrante (m)'] });
      agruparBarras(g.cortes, g.largoReal).forEach((b) => filas.push([b.veces, b.piezas.map((x) => x.toFixed(2)).join(' + '), b.sobra]));
      filas.push([]);
    });
    hojas.push({ nombre: 'Cortes', anchos: [40, 50, 14], filas });
  }
  return hojas;
}

/** El archivo .xlsx de la obra (con las partes elegidas). */
export const libroDeObra = (datos, partes) => crearXlsx(hojasDeObra(datos, partes));
