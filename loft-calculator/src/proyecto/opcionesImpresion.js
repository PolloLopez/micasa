// Qué sale al imprimir o exportar (v1.28). Lo usan DialogoImprimir.jsx y App.jsx.

export const OPCIONES_IMPRESION_INICIALES = {
  vista3D: true, vistasFijas: true, cotas: true, medidas: true,
  vistasPartes: false, // v1.44: cada piso desde arriba y el adentro desde cada lado (sin esa pared)
  resumen: true, presupuesto: true, cortes: false, paredes: true, plantas: true, formularios: false,
  // v1.42: con los planos, la lista de caños y perfiles (tipo y cantidad) y la de aberturas.
  listaCanos: true, listaAberturas: true,
  // v1.42: qué partes de la obra salen en los planos y en la lista de caños (las paredes, con sus aberturas, siempre).
  partePisos: true, parteEntrepiso: true, parteTecho: true, parteInteriores: true,
  // v1.50: lo contratado, lo pagado y lo que falta de la obra (sale si hay rubros cargados).
  seguimiento: true,
  // v1.57: el plano de cada instalación con sus tramos y su lista de materiales (sale si tiene puntos).
  instElectrica: true, instAgua: true, instDesague: true, instGas: true,
};

/** v1.42: "Solo planos": las paredes, las plantas y sus listas; nada del 3D ni del presupuesto. */
export const SOLO_PLANOS = Object.fromEntries(Object.keys(OPCIONES_IMPRESION_INICIALES)
  .map((k) => [k, ['paredes', 'plantas', 'listaCanos', 'listaAberturas'].includes(k) || k.startsWith('parte') || k.startsWith('inst')]));

/** Lo guardado sirve si tiene todas las claves con true/false. */
export const opcionesImpresionValidas = (o) => o !== null && typeof o === 'object'
  && Object.keys(OPCIONES_IMPRESION_INICIALES).every((k) => typeof o[k] === 'boolean');

/** v1.42: lo guardado por versiones de antes se completa con las opciones nuevas (así no se pierde lo elegido). */
export const completarOpcionesImpresion = (o) => (o !== null && typeof o === 'object'
  ? { ...OPCIONES_IMPRESION_INICIALES, ...Object.fromEntries(Object.entries(o).filter(([, v]) => typeof v === 'boolean')) }
  : o);
