// ==========================================================
// COMPARTIR SIN LA PARTE DE PLATA (v1.76)
// ----------------------------------------------------------
// De la auditoría del 18/11: el link de Compartir llevaba todo el proyecto,
// también lo que pagaste, a quién, tus créditos y a quién le debés. Quien
// tuviera el link de VER lo leía.
//
// "Sin la parte de plata" saca del proyecto que se comparte:
//   - seguimiento.rubros       (trabajos, lo contratado y cada pago)
//   - seguimiento.compras      (lo que ya compraste y lo que debés)
//   - seguimiento.contratistas (nombres y teléfonos)
//   - finanzas                 (terreno en cuotas, créditos, acreedores)
// Lo demás queda (medidas, materiales, precios, partes terminadas, extras y
// el proveedor elegido de cada renglón): el que lo abre ve el mismo
// presupuesto de materiales.
// ==========================================================

import { FINANZAS_INICIALES } from '../motor/finanzas.js';

/** El proyecto { nombre, params, aberturas, catalogo, colores } sin la parte de plata. */
export function sinLaPlata(proyecto) {
  const s = proyecto.params.seguimiento ?? {};
  return {
    ...proyecto,
    params: {
      ...proyecto.params,
      seguimiento: { ...s, rubros: [], compras: [], contratistas: [] },
      finanzas: { ...FINANZAS_INICIALES },
    },
  };
}

/**
 * Al abrir tu propio link (subido sin la plata) en la compu donde lo guardaste: el proyecto del link + la plata
 * que tenés guardada acá (si no, abrir el link la borraría).
 * @param delLink  el proyecto que vino del link
 * @param local    el mismo proyecto guardado en Mis proyectos (o null)
 */
export function conLaPlataDe(delLink, local) {
  if (!local) return delLink;
  const s = local.params.seguimiento ?? {};
  return {
    ...delLink,
    params: {
      ...delLink.params,
      seguimiento: { ...(delLink.params.seguimiento ?? {}), rubros: s.rubros ?? [], compras: s.compras ?? [], contratistas: s.contratistas ?? [] },
      finanzas: local.params.finanzas ?? { ...FINANZAS_INICIALES },
    },
  };
}
