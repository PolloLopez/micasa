// ==========================================================
// RESUMEN DE LA OBRA (v1.28)
// ----------------------------------------------------------
// Los datos que se cargaron, en pocos renglones, para la primera hoja
// del PDF y del Excel (antes se imprimían todos los formularios: 13 hojas).
//   [['Planta', '7.50 x 4.50 m'], ['Techo', 'cae hacia Fondo (C) · …'], …]
// ==========================================================

import { resumenDeTerreno } from '../motor/terreno.js';
import { LADOS } from '../motor/constantes.js';
import { nombreLado, geometriaLados, alturasPared, alturaMaxima } from '../motor/geometria.js';
import { infoSeparacion } from '../motor/estructura.js';

const m = (n) => `${Number(n).toFixed(2)} m`;

/** "cada 0.60 m (18)" o "6 (cada 0.75 m)" según cómo se cargó, o null si no lleva. */
function separacion(params, ruta, valor) {
  const info = infoSeparacion(params, ruta);
  const porCantidad = params.cantidades?.[ruta] !== undefined;
  if (porCantidad) {
    if (info.cantidad === 0) return null;
    if (info.porVano) return `${info.cantidad} por vano`;
    return info.separacion > 0 ? `${info.cantidad} (cada ${m(info.separacion)})` : `${info.cantidad}`;
  }
  if (!(valor > 0)) return null;
  return info.cantidad > 0 ? `cada ${m(valor)} (${info.cantidad})` : `cada ${m(valor)}`;
}

/** Nombre de un revestimiento del catálogo. */
const nombreDe = (catalogo, id) => catalogo.find((i) => i.id === id)?.nombre ?? '';

/**
 * @param {{ params, estructura, aberturas, catalogo }} datos
 * @returns {[string, string][]} renglones [qué, cómo]
 */
export function resumenDeObra({ params, estructura, aberturas = [], catalogo = [] }) {
  if (params.tipoProyecto === 'grada') return [['Tipo', 'Grada para espectadores']];
  if (params.tipoProyecto === 'montaje') return [['Tipo', 'Montaje industrial']];
  const lados = geometriaLados(params);
  const filas = [];
  const frente = (lado) => `${params.paredes?.[lado]?.etiqueta?.trim() || nombreLado(lado, params.ladoFrente)} (${lado})`;

  filas.push(['Planta', `${m(params.largo)} x ${m(params.ancho)} · frente: lado ${params.ladoFrente}`]);
  filas.push(['Alturas', `lado bajo ${m(params.altura)} · lado alto ${m(alturaMaxima(params))} · elevación ${m(params.elevacion)}`]);
  filas.push(...resumenDeTerreno(params)); // v1.32: el lote y la ubicación (si se cargó)

  const techo = [
    `cae hacia ${frente(params.caidaTecho)}`,
    `pendiente ${params.pendienteTecho} %`,
    `vigas ${separacion(params, 'separacionVigasTecho', params.separacionVigasTecho)}`,
    `correas ${separacion(params, 'separacionCorreasTecho', params.separacionCorreasTecho)}`,
    params.techoConBorde ? 'con marco perimetral' : null,
    nombreDe(catalogo, params.panelTecho),
  ];
  filas.push(['Techo', techo.filter(Boolean).join(' · ')]);

  const piso = (sufijo) => [
    `tirantes ${separacion(params, `separacionPiso${sufijo}`, params[`separacionPiso${sufijo}`])}`,
    (() => {
      const t = separacion(params, `separacionTransversalesPiso${sufijo}`, params[`separacionTransversalesPiso${sufijo}`]);
      return t ? `transversales ${t}` : 'sin transversales';
    })(),
  ].join(' · ');
  filas.push(['Piso planta baja', piso('')]);
  if (params.anchoEntrepiso > 0) {
    const largo = params.largoEntrepiso > 0 ? m(params.largoEntrepiso) : `todo el lado (${m(lados[params.ladoEntrepiso].largo)})`;
    filas.push(['Entrepiso', `${m(params.anchoEntrepiso)} de profundidad x ${largo}, sobre ${frente(params.ladoEntrepiso)} · ${piso('2')}`]);
  } else {
    filas.push(['Entrepiso', 'no lleva']);
  }

  LADOS.forEach((lado) => {
    const pared = params.paredes[lado];
    const ruta = (campo) => `paredes.${lado}.${campo}`;
    const [h1, h2] = alturasPared(lados[lado], params);
    const montantes = separacion(params, ruta('separacionMontantes'), pared.separacionMontantes);
    const partes = [
      `${m(lados[lado].largo)} x ${m(h1)}${Math.abs(h1 - h2) > 0.005 ? ` a ${m(h2)}` : ''}`,
      `columnas ${separacion(params, ruta('separacionVerticales'), pared.separacionVerticales)}`,
      `fajas ${separacion(params, ruta('separacionHorizontales'), pared.separacionHorizontales)}`,
      montantes ? `montantes ${montantes}` : null,
      pared.riostras && pared.riostras !== 'no' ? `riostras ${pared.riostras === 'todos' ? 'en todos los vanos' : 'en las puntas'}` : null,
      nombreDe(catalogo, pared.panel) + (pared.panelInterior ? ` / int. ${nombreDe(catalogo, pared.panelInterior)}` : ''),
    ];
    filas.push([`Pared ${frente(lado)}`, partes.filter(Boolean).join(' · ')]);
  });

  if (aberturas.length) {
    filas.push(['Aberturas', aberturas.map((op, i) =>
      `#${i + 1} ${op.tipo} ${op.ancho.toFixed(2)}x${op.alto.toFixed(2)}${op.alturaAntepecho > 0 ? ` (antep. ${op.alturaAntepecho.toFixed(2)})` : ''} en ${op.lado}`
    ).join(' · ')]);
  }
  const escalera = estructura?.escalera?.resumen;
  if (escalera) {
    filas.push(['Escalera', `${escalera.contrahuellas} contrahuellas de ${(escalera.contrahuella * 100).toFixed(1)} cm · huella ${(escalera.huella * 100).toFixed(1)} cm`]);
  }
  return filas;
}
