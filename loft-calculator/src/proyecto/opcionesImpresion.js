// Qué sale al imprimir o exportar (v1.28). Lo usan DialogoImprimir.jsx y App.jsx.

export const OPCIONES_IMPRESION_INICIALES = {
  vista3D: true, vistasFijas: true, cotas: true, medidas: true,
  resumen: true, presupuesto: true, cortes: false, paredes: true, plantas: true, formularios: false,
};

/** Lo guardado sirve si tiene todas las claves con true/false. */
export const opcionesImpresionValidas = (o) => o !== null && typeof o === 'object'
  && Object.keys(OPCIONES_IMPRESION_INICIALES).every((k) => typeof o[k] === 'boolean');
