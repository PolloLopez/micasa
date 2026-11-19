// ==========================================================
// DURLOCK DE LOS TABIQUES (v1.76)
// ----------------------------------------------------------
// Pendiente (PENDIENTES 🟡): "soleras y montantes van en un mismo renglón con
// el mismo perfil; en obra la solera es PGU y el montante PGC. Faltan
// tornillos T1/T2, cinta y masilla por m² de placa".
//   - Las soleras (abajo, arriba) y el dintel de la puerta van a su renglón
//     "Soleras de tabiques" (PGU); los montantes quedan en "Estructura de
//     tabiques" (PGC). Ver tabiques.js (pieza.insumo).
//   - Tornillos, cinta y masilla salen de los m² de placa de cada cara y de
//     la cantidad de montantes, con rendimientos editables (de fábrica,
//     orientativos: a validar con el durlero).
// ==========================================================

/** Rendimientos de fábrica (orientativos). */
export const RENDIMIENTO_DURLOCK = {
  t2PorM2: 20, // tornillos T2 (placa con perfil) por m² de placa, por cara
  t1PorMontante: 4, // tornillos T1 (perfil con perfil): 2 arriba y 2 abajo de cada montante
  cintaPorM2: 1.5, // metros de cinta de papel por m² de placa
  masillaPorM2: 0.9, // kg de masilla por m² de placa
};

export const LIMITES_DURLOCK = {
  t2PorM2: { min: 0, max: 100, nombre: 'Tornillos T2 por m²' },
  t1PorMontante: { min: 0, max: 20, nombre: 'Tornillos T1 por montante' },
  cintaPorM2: { min: 0, max: 10, nombre: 'Cinta por m²' },
  masillaPorM2: { min: 0, max: 5, nombre: 'Masilla por m²' },
};

const valido = (campo, v) => Number.isFinite(v) && v >= LIMITES_DURLOCK[campo].min && v <= LIMITES_DURLOCK[campo].max;

/** Los rendimientos del proyecto (lo que falte o esté mal, de fábrica). */
export function completarDurlock(d) {
  const r = { ...RENDIMIENTO_DURLOCK };
  if (d && typeof d === 'object') Object.keys(r).forEach((k) => { if (valido(k, d[k])) r[k] = d[k]; });
  return r;
}

/** Errores para validarParametros: { 'durlock.t2PorM2': '…' }. */
export function validarDurlock(d) {
  if (!d || typeof d !== 'object' || Array.isArray(d)) return { durlock: 'Rendimientos de Durlock inválidos' };
  const errores = {};
  Object.entries(LIMITES_DURLOCK).forEach(([k, l]) => {
    if (d[k] !== undefined && !valido(k, d[k])) errores[`durlock.${k}`] = `${l.nombre}: entre ${l.min} y ${l.max}`;
  });
  return errores;
}

const arriba = (n) => (n > 0 ? Math.ceil(n - 1e-9) : 0);

/**
 * Lo que llevan los tabiques además de perfiles y placas.
 * @param tabiques  estructura.tabiques (generarTabique: piezas y panos de cada cara con placa)
 * @returns {{ m2Placa, montantes, t1, t2, cinta, masilla }}  cantidades ya redondeadas hacia arriba
 */
export function materialesDeDurlock(tabiques = [], rendimiento = RENDIMIENTO_DURLOCK) {
  const m2Placa = tabiques.reduce((a, t) => a + t.panos.reduce((b, p) => b + (p.neto ?? 0), 0), 0);
  const montantes = tabiques.reduce((a, t) => a + t.piezas.filter((p) => /:montante(-corto)?:/.test(p.id)).length, 0);
  return {
    m2Placa: Math.round(m2Placa * 100) / 100,
    montantes,
    t1: arriba(montantes * rendimiento.t1PorMontante),
    t2: arriba(m2Placa * rendimiento.t2PorM2),
    cinta: arriba(m2Placa * rendimiento.cintaPorM2),
    masilla: arriba(m2Placa * rendimiento.masillaPorM2),
  };
}
