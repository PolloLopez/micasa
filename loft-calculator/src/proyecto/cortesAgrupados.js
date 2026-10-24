// ==========================================================
// Cortes agrupados (v1.28): las barras que se cortan igual, juntas
// ----------------------------------------------------------
// El optimizador devuelve barra por barra; en la obra muchas se cortan
// igual ("6.06" dieciséis veces). Para el PDF y el Excel se juntan:
//   { piezas: [4.95, 1.10], sobra: 0.01, veces: 3 }
// así la lista de cortes entra en una hoja.
// ==========================================================

const cm = (n) => Math.round(n * 100) / 100;

/**
 * @param {{ barras: { piezas: number[], usado: number }[] }} cortes  resultado del optimizador
 * @param {number} largoReal  largo real de la barra (con el excedente)
 * @returns {{ piezas: number[], sobra: number, veces: number }[]}  en el orden en que aparecen
 */
export function agruparBarras(cortes, largoReal) {
  const grupos = new Map();
  cortes.barras.forEach((b) => {
    const piezas = b.piezas.map(cm);
    const sobra = cm(largoReal - b.usado);
    const clave = `${piezas.join('+')}|${sobra}`;
    if (!grupos.has(clave)) grupos.set(clave, { piezas, sobra, veces: 0 });
    grupos.get(clave).veces++;
  });
  return [...grupos.values()];
}

/** "3 × 4.95 + 1.10" (o sin "1 ×" si es una sola). */
export const textoBarra = (g) => `${g.veces > 1 ? `${g.veces} × ` : ''}${g.piezas.map((p) => p.toFixed(2)).join(' + ')}`;
