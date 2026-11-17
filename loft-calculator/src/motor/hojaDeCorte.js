// ==========================================================
// HOJA DE CORTE (v1.68)
// ----------------------------------------------------------
// Pedido de Leandro: "hoja de corte para el taller: cada barra numerada con
// sus piezas, y cada pieza con el mismo número en el 3D y en los planos".
// Cada pieza que sale de una barra recibe un código:
//
//   2.3b  = grupo de corte 2 (un perfil), barra 3, pieza b (de izquierda a derecha en la barra)
//
// Una pieza empalmada sale de dos barras: "2.1a + 2.4c".
// ==========================================================

const LETRAS = 'abcdefghijklmnopqrstuvwxyz';

/**
 * Los códigos de corte de todas las piezas de la obra.
 * @param gruposCortes  presupuesto.gruposCortes (cada uno con cortes.barras[].ids y .tramos)
 * @returns {Map<string, { codigo, grupo, barra, letra, largo, tramo, perfil }[]>}  id de la pieza → sus pedazos
 */
export function codigosDeCorte(gruposCortes = []) {
  const codigos = new Map();
  gruposCortes.filter((g) => g.cortes?.barras?.length).forEach((g, gi) => {
    g.cortes.barras.forEach((b) => {
      b.piezas.forEach((largo, i) => {
        const id = b.ids?.[i];
        if (!id) return;
        const letra = LETRAS[i] ?? String(i + 1);
        const pedazo = { codigo: `${gi + 1}.${b.numero}${letra}`, grupo: gi + 1, barra: b.numero, letra, largo, tramo: b.tramos?.[i] ?? null, perfil: g.perfil };
        codigos.set(id, [...(codigos.get(id) ?? []), pedazo]);
      });
    });
  });
  // Los tramos de una empalmada, en orden (tramo 1, 2…).
  codigos.forEach((lista) => lista.sort((a, b) => (a.tramo?.n ?? 0) - (b.tramo?.n ?? 0)));
  return codigos;
}

/** "2.3b" o, si va empalmada, "2.1a + 2.4c". */
export const textoDeCodigo = (pedazos) => (pedazos ?? []).map((p) => p.codigo).join(' + ');

/** La letra de cada pieza en una barra (para el diagrama). */
export const letraDePieza = (i) => LETRAS[i] ?? String(i + 1);
