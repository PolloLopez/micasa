// ==========================================================
// CONSUMIBLES ESTIMADOS (v1.48)
// ----------------------------------------------------------
// Revisión del 11/11 (🔴): tornillería, electrodos y selladores arrancaban
// en 0 y no sumaban nada al presupuesto. Ahora cada accesorio puede ser:
//   - "a mano" (como antes: la cantidad la cargás vos), o
//   - "estimado": cantidad = medida de la obra x coeficiente, redondeada
//     hacia arriba. Las medidas salen de la estructura:
//       kgHierro   kilos de hierro (largo de cada pieza x kg/m de su perfil)
//       m2Hierro   superficie de hierro a pintar (sale del peso y el espesor)
//       m2Paneles  m² de paredes (netos) y techo
// Los coeficientes de fábrica son orientativos (a validar con el herrero)
// y se cambian en cada accesorio.
// ==========================================================

export const BASES_CONSUMIBLE = {
  kgHierro: { nombre: 'kg de hierro', unidad: 'kg' },
  m2Hierro: { nombre: 'm² de hierro a pintar', unidad: 'm²' },
  m2Paneles: { nombre: 'm² de paneles (paredes y techo)', unidad: 'm²' },
};

/**
 * Estimación de fábrica de los accesorios de siempre (por id). `ayuda` explica el coeficiente.
 * Electrodos: ~1 kg cada 80 kg de hierro. Autoperforantes: ~6 por m² de panel, en cajas de 100.
 * Sellador: ~1 cartucho cada 12 m² de panel. Antióxido: 2 manos, ~12 m² por litro y mano.
 */
export const ESTIMACION_DE_FABRICA = {
  'acc-electrodos': { base: 'kgHierro', coeficiente: 0.0125, ayuda: '1 kg cada 80 kg de hierro' },
  'acc-tornilleria': { base: 'm2Paneles', coeficiente: 0.06, ayuda: '6 autoperforantes por m², cajas de 100' },
  'acc-selladores': { base: 'm2Paneles', coeficiente: 0.08, ayuda: '1 cartucho cada 12 m² de panel' },
  'acc-antioxido': { base: 'm2Hierro', coeficiente: 0.17, ayuda: '2 manos, 12 m² por litro y mano' },
};

const DENSIDAD_ACERO = 7.85; // kg por dm³: 1 m² de chapa de 1 mm pesa 7,85 kg

/**
 * Medidas de la obra para estimar.
 * @param items     renglones de perfiles del presupuesto (con `largosPiezas` y `kgm`)
 * @param catalogo  catálogo resuelto (perfiles de la lista con su `espesor` en mm)
 * @param superficies estructura.superficies (murosNetos, techo)
 */
export function medidasParaConsumibles(items, catalogo, superficies = {}) {
  const espesorDe = (item) => catalogo.find((c) => c.categoria === 'hierro' && c.id === item.perfilId)?.espesor ?? 0;
  let kgHierro = 0;
  let m2Hierro = 0;
  items.filter((i) => i.cortes && i.largosPiezas?.length).forEach((i) => {
    const kg = i.largosPiezas.reduce((a, l) => a + l, 0) * (i.kgm ?? 0);
    kgHierro += kg;
    const espesor = espesorDe(i);
    // Un caño o perfil de chapa: su superficie por metro es su perímetro = kg/m ÷ (espesor x densidad).
    if (espesor > 0) m2Hierro += kg / (espesor * DENSIDAD_ACERO);
  });
  const m2Paneles = (superficies.murosNetos ?? 0) + (superficies.techo ?? 0);
  return { kgHierro, m2Hierro, m2Paneles };
}

/** ¿El accesorio se estima solo? (si no, se carga a mano). */
export const esEstimado = (a) => a.modo === 'estimado' && Boolean(BASES_CONSUMIBLE[a.base]);

/**
 * Cantidad de un accesorio y cómo se llegó. A mano: la cargada. Estimado: medida x coeficiente, hacia arriba.
 * @returns {{ cantidad, detalle }}
 */
export function cantidadDeConsumible(a, medidas) {
  if (!esEstimado(a)) return { cantidad: a.cantidad, detalle: 'cantidad cargada a mano' };
  const medida = medidas[a.base] ?? 0;
  const cantidad = medida > 0 && a.coeficiente > 0 ? Math.ceil(medida * a.coeficiente - 1e-9) : 0;
  const base = BASES_CONSUMIBLE[a.base];
  const n = (v, d) => v.toLocaleString('es-AR', { maximumFractionDigits: d });
  return { cantidad, detalle: `estimado: ${n(medida, medida < 100 ? 1 : 0)} ${base.unidad} x ${n(a.coeficiente, 4)} ${a.unidad} por ${base.unidad}` };
}

/**
 * Completa un accesorio guardado. Los de fábrica que estaban en 0 pasan a estimados; los que tenían cantidad
 * cargada se quedan a mano (no cambia lo que ya cargaste).
 */
export function completarConsumible(a) {
  if (a.modo === 'manual' || a.modo === 'estimado') {
    return { base: '', coeficiente: 0, ...a, ...(a.modo === 'estimado' && !BASES_CONSUMIBLE[a.base] ? { modo: 'manual' } : {}) };
  }
  const fabrica = ESTIMACION_DE_FABRICA[a.id];
  if (fabrica && !(a.cantidad > 0)) return { ...a, modo: 'estimado', base: fabrica.base, coeficiente: fabrica.coeficiente };
  return { ...a, modo: 'manual', base: fabrica?.base ?? '', coeficiente: fabrica?.coeficiente ?? 0 };
}
