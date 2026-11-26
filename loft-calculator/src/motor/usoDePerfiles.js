// ==========================================================
// PERFILES: CUÁNTOS SE USARON Y CUÁNTOS FALTAN (v1.101)
// ----------------------------------------------------------
// Pedido de Leandro (26/11): "me falta ver cuántos perfiles usé y cuántos me
// faltan, para comparar con la realidad y verificar si es cierto".
//
// Por perfil (Caño 80×80, C 80×40…), con el plan de corte (qué pieza sale de
// qué barra), lo marcado en Armado (puesta) y lo comprado:
//   - barras que lleva la obra y barras compradas (→ faltan comprar);
//   - barras EMPEZADAS: las que tienen al menos un corte ya puesto;
//   - barras sin tocar: ningún corte de ellas está puesto;
//   - en la obra deberían quedar: compradas − empezadas barras ENTERAS
//     (más los sobrantes de las empezadas). Eso se cuenta en el lote y se compara.
//   - piezas y metros puestos / por poner.
// Es una estimación: supone que se cortó como dice la hoja de corte.
// ==========================================================

const redondo = (n) => Math.round(n * 100) / 100;
const idBase = (id) => String(id).split('~')[0];

/**
 * @param gruposCortes  los del presupuesto ({ perfil, largoBarra, cortes: { barras: [{ numero, piezas, ids }] } })
 * @param avance        params.avancePiezas ({ id: { instalada } })
 * @param materiales    resumenPorMaterial / filas de la lista ({ clave, material, largoBarra }) para saber la clave de cada perfil
 * @param compras       seguimiento.compras (sus renglones con material = clave y cantidad en barras)
 * @returns {{ perfil, clave, largoBarra, barras, compradas, faltanComprar, sobran, empezadas, sinTocar, enObra, piezas, puestas, metros, metrosPuestos }[]}
 */
export function usoDePerfiles(gruposCortes = [], avance = {}, materiales = [], compras = []) {
  const puesta = (id) => Boolean(avance[id]?.instalada || avance[idBase(id)]?.instalada);
  const comprado = new Map();
  compras.forEach((c) => (c.renglones ?? []).filter((r) => r.material).forEach((r) => comprado.set(r.material, redondo((comprado.get(r.material) ?? 0) + r.cantidad))));
  const por = new Map();
  gruposCortes.filter((g) => g.cortes?.barras?.length).forEach((g) => {
    const clave = `${g.perfil}|${g.largoBarra}`;
    const x = por.get(clave) ?? { perfil: g.perfil, largoBarra: g.largoBarra, barras: 0, empezadas: 0, piezas: new Set(), puestas: new Set(), metros: 0, metrosPuestos: 0 };
    g.cortes.barras.forEach((b) => {
      x.barras += 1;
      let algunaPuesta = false;
      b.piezas.forEach((largo, i) => {
        const id = b.ids?.[i];
        if (!id) return; // retazo o sobrante
        x.metros += largo;
        x.piezas.add(idBase(id));
        if (puesta(id)) { algunaPuesta = true; x.metrosPuestos += largo; x.puestas.add(idBase(id)); }
      });
      if (algunaPuesta) x.empezadas += 1;
    });
    por.set(clave, x);
  });
  return [...por.values()].map((x) => {
    // La clave del material en la lista de compras: el mismo nombre de perfil (y largo de barra, si lo hay).
    const material = materiales.find((m) => m.material === x.perfil && (!m.largoBarra || m.largoBarra === x.largoBarra))
      ?? materiales.find((m) => m.material === x.perfil);
    const compradas = material ? comprado.get(material.clave) ?? 0 : 0;
    return {
      perfil: x.perfil, clave: material?.clave ?? null, largoBarra: x.largoBarra,
      barras: x.barras, compradas, faltanComprar: Math.max(0, redondo(x.barras - compradas)), sobran: Math.max(0, redondo(compradas - x.barras)),
      empezadas: x.empezadas, sinTocar: x.barras - x.empezadas,
      // Las barras enteras que tendrían que estar en el lote (si se cortó como dice la hoja de corte).
      enObra: Math.max(0, redondo(compradas - x.empezadas)),
      piezas: x.piezas.size, puestas: x.puestas.size, metros: redondo(x.metros), metrosPuestos: redondo(x.metrosPuestos),
    };
  }).sort((a, b) => b.barras - a.barras);
}
