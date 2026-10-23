// ==========================================================
// Excel de la obra (v1.26): presupuesto, cada pared, cada planta y cortes
// ----------------------------------------------------------
// Arma las hojas (filas y columnas) a partir de lo que ya calcula la app.
// El archivo en sí lo hace xlsx.js.
//
//   Presupuesto          renglones con cantidad, precio y subtotal
//   <cada pared>         medidas, piezas (perfil, largo, cantidad),
//                        aberturas y revestimiento
//   Piso / Entrepiso / Techo   piezas de cada planta
//   Cortes               cómo cortar cada barra
// ==========================================================

import { crearXlsx } from './xlsx.js';
import { nombreLado } from '../motor/geometria.js';
import { NOMBRE_PLANTA } from '../motor/planos.js';

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

/**
 * Hojas del libro.
 * @param {object} datos { nombre, params, vistas: { paredes, plantas }, items, total, gruposCortes, proveedor, pago }
 */
export function hojasDeObra({ nombre, params, vistas, items, total, gruposCortes = [], proveedor = '', pago = '' }) {
  const fecha = new Date().toLocaleDateString('es-AR');
  const hojas = [];

  hojas.push({
    nombre: 'Presupuesto',
    anchos: [34, 34, 10, 10, 14, 16],
    filas: [
      { negrita: true, celdas: [nombre || 'Proyecto sin nombre'] },
      [`Pollo Calculator · ${fecha}${proveedor ? ` · ${proveedor}` : ''}${pago ? ` · ${pago}` : ''}`],
      [`Planta ${params.largo} x ${params.ancho} m · altura ${params.altura} m`],
      [],
      { negrita: true, celdas: ['Insumo', 'Perfil o descripción', 'Cantidad', 'Unidad', 'Precio unit.', 'Subtotal'] },
      ...items.filter((i) => i.cantidad > 0).map((i) => [
        i.nombre, i.perfil ?? '', i.cantidad, i.unidad ?? '', { pesos: i.precio }, { pesos: i.subtotal },
      ]),
      { negrita: true, celdas: ['TOTAL', '', '', '', '', { pesos: total }] },
    ],
  });

  vistas.paredes.forEach((v) => {
    const [h1, h2] = v.alturas;
    hojas.push({
      nombre: `Pared ${nombreDePared(v.lado, params)}`,
      anchos: [28, 32, 12, 10, 12, 14],
      filas: [
        { negrita: true, celdas: [`Pared ${nombreDePared(v.lado, params)} — vista desde afuera`] },
        [`Largo ${m(v.largo)} m · alto ${m(h1)} m${Math.abs(h1 - h2) > 0.005 ? ` a ${m(h2)} m` : ''}`],
        ['Medidas desde la esquina izquierda (vista desde afuera) y desde el piso.'],
        [],
        { negrita: true, celdas: ['Columnas y jambas en (m desde la esquina izq.)'] },
        v.cotas.columnas.map((x) => x),
        { negrita: true, celdas: ['Horizontales (fajas) a (m desde el piso)'] },
        v.cotas.fajas.length ? v.cotas.fajas : ['sin fajas'],
        [],
        ...filasDePiezas(v.lista),
        [],
        ...(v.aberturas.length ? [
          { negrita: true, celdas: ['Abertura', 'Tipo', 'Ancho (m)', 'Alto (m)', 'Antepecho (m)', 'Desde esquina izq. (m)'] },
          ...v.aberturas.map((a) => [`#${a.numero}${a.etiqueta ? ` ${a.etiqueta}` : ''}`, a.tipo, a.ancho, a.alto, a.antepecho, m(a.desde)]),
          [],
        ] : []),
        ...(v.revestimiento.length ? [
          { negrita: true, celdas: ['Revestimiento', 'Tipo', 'Qué pedir'] },
          ...v.revestimiento.map((r) => [r.cara, r.nombre, r.detalle]),
        ] : []),
      ],
    });
  });

  vistas.plantas.forEach((p) => {
    hojas.push({
      nombre: NOMBRE_PLANTA[p.nivel],
      anchos: [28, 32, 12, 10, 12],
      filas: [
        { negrita: true, celdas: [`${NOMBRE_PLANTA[p.nivel]} — vista desde arriba`] },
        [`${m(p.largo)} x ${m(p.ancho)} m`],
        [],
        ...filasDePiezas(p.lista),
      ],
    });
  });

  if (gruposCortes.length) {
    const filas = [{ negrita: true, celdas: ['Cómo cortar cada barra'] }, []];
    gruposCortes.filter((g) => g.cortes.totalBarras > 0).forEach((g) => {
      filas.push({ negrita: true, celdas: [`${g.renglones.map((r) => r.nombre).join(' + ')} — ${g.perfil}`, `${g.cortes.totalBarras} barras de ${g.largoBarra} m`] });
      filas.push({ negrita: true, celdas: ['Barra', 'Piezas (m)', 'Sobrante (m)'] });
      g.cortes.barras.forEach((b) => filas.push([`#${b.numero}`, b.piezas.map((x) => x.toFixed(2)).join(' + '), m(g.largoReal - b.usado)]));
      filas.push([]);
    });
    hojas.push({ nombre: 'Cortes', anchos: [40, 50, 14], filas });
  }
  return hojas;
}

/** El archivo .xlsx de la obra. */
export const libroDeObra = (datos) => crearXlsx(hojasDeObra(datos));
