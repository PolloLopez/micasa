// ==========================================================
// TRAMOS DE PANEL (v1.96): un panel distinto en una parte de la pared o del techo
// ----------------------------------------------------------
// Pedido de Leandro (25/11): "algunos van a ser un modelo distinto, sin
// revestimiento interior, chapa-foil en cocina y baño (después revisto), y
// chapa-chapa en el resto". Eligió: por tramos (desde X hasta Y m de una
// pared), y en el techo también por tramos.
//
// Cada pared guarda su panel de siempre (params.paredes[lado].panel) y, si
// hace falta, tramosPanel: [{ desde, hasta, panel }] en m desde la esquina
// izquierda vista desde afuera (la punta 1, como las aberturas y los planos).
// El techo: params.tramosPanelTecho, en m a lo largo del techo (desde la
// esquina izquierda mirándolo desde el lado bajo).
// Lo que no cae en ningún tramo lleva el panel de la pared (o del techo).
//
// De ahí salen los "paños" de cada panel (una pared con un tramo de chapa-foil
// en el medio son 3 paños: chapa-chapa, chapa-foil y chapa-chapa), que usan el
// presupuesto, el 3D y los planos.
// ==========================================================

const EPS = 1e-6;
const redondo = (n) => Math.round(n * 1000) / 1000;

/** Deja solo los tramos válidos (los proyectos de antes: ninguno). */
export function normalizarTramosPanel(tramos) {
  if (!Array.isArray(tramos)) return [];
  return tramos.slice(0, 20).filter((t) => t && Number.isFinite(t.desde) && Number.isFinite(t.hasta) && t.hasta - t.desde > 0.01
    && t.desde >= 0 && t.hasta <= 100 && typeof t.panel === 'string' && t.panel.length > 0 && t.panel.length <= 60)
    .map((t) => ({ desde: redondo(t.desde), hasta: redondo(t.hasta), panel: t.panel }));
}

/** Error de un tramo (para el formulario), o null. */
export function errorDeTramo(t, largo) {
  if (!(Number.isFinite(t.desde) && Number.isFinite(t.hasta))) return 'Poné desde y hasta';
  if (t.desde < 0 || t.hasta > largo + EPS) return `Tiene que caer entre 0 y ${largo.toFixed(2).replace('.', ',')} m`;
  if (t.hasta - t.desde < 0.05) return 'El hasta tiene que ser más que el desde (5 cm o más)';
  return null;
}

/**
 * Los segmentos de un paño de largo `largo`: cada tramo con su panel y lo demás con el de base. Si dos tramos se
 * pisan, manda el último cargado. Los segmentos seguidos con el mismo panel se juntan.
 * @returns {{ x0, x1, panel }[]} de 0 a largo, en orden
 */
export function segmentosDePanel(largo, panelBase, tramos = []) {
  const cortes = new Set([0, largo]);
  const validos = tramos.map((t) => ({ ...t, desde: Math.max(0, t.desde), hasta: Math.min(largo, t.hasta) })).filter((t) => t.hasta - t.desde > EPS);
  validos.forEach((t) => { cortes.add(t.desde); cortes.add(t.hasta); });
  const xs = [...cortes].sort((a, b) => a - b);
  const segmentos = [];
  for (let i = 0; i < xs.length - 1; i++) {
    const [x0, x1] = [xs[i], xs[i + 1]];
    if (x1 - x0 < EPS) continue;
    const medio = (x0 + x1) / 2;
    const tramo = [...validos].reverse().find((t) => t.desde <= medio && t.hasta >= medio);
    const panel = tramo ? tramo.panel : panelBase;
    const ultimo = segmentos[segmentos.length - 1];
    if (ultimo && ultimo.panel === panel) ultimo.x1 = x1;
    else segmentos.push({ x0, x1, panel });
  }
  return segmentos.filter((s) => s.panel);
}

/** Los huecos de las aberturas que caen en [x0, x1], corridos para que el segmento empiece en 0. */
function huecosEn(huecos, x0, x1) {
  return (huecos ?? []).filter((h) => h.hasta > x0 + EPS && h.desde < x1 - EPS)
    .map((h) => ({ ...h, desde: Math.max(h.desde, x0) - x0, hasta: Math.min(h.hasta, x1) - x0 }));
}

/**
 * Los paños de revestimiento EXTERIOR de una pared (uno por segmento). `donde` es "lado A" si es uno solo (como
 * siempre), o "lado A · 2" si la pared tiene tramos (así cada paño tiene sus pedazos y sus tiras).
 * @param pared la de la estructura ({ lado, largo, alturas, huecos, panel, tramosPanel, superficieNeta })
 * @returns {{ x0, x1, largo, h1, h2, huecos, neto, panel, donde }[]}
 */
export function panosDeLaPared(pared) {
  const [a1, a2] = pared.alturas;
  const altoEn = (x) => a1 + ((a2 - a1) * x) / pared.largo;
  const segmentos = segmentosDePanel(pared.largo, pared.panel, pared.tramosPanel ?? []);
  const varios = segmentos.length > 1;
  return segmentos.map((s, k) => {
    const largo = s.x1 - s.x0;
    const h1 = altoEn(s.x0);
    const h2 = altoEn(s.x1);
    const huecos = huecosEn(pared.huecos, s.x0, s.x1);
    const bruta = (largo * (h1 + h2)) / 2;
    const aberturas = huecos.reduce((acc, h) => acc + (h.hasta - h.desde) * (h.arriba - h.abajo), 0);
    return { x0: s.x0, x1: s.x1, largo, h1, h2, huecos, panel: s.panel, donde: varios ? `lado ${pared.lado} · ${k + 1}` : `lado ${pared.lado}`,
      neto: varios ? Math.max(0, bruta - aberturas) : pared.superficieNeta ?? Math.max(0, bruta - aberturas) };
  });
}

/**
 * Los paños del techo (uno por segmento, a lo largo del techo). `donde` = "techo" o "techo · 2".
 * @param techo el de la estructura ({ largo, largoFaldon, superficie, panel, tramosPanel })
 */
export function panosDelTecho(techo) {
  if (!techo?.panel && !(techo?.tramosPanel?.length)) return [];
  const segmentos = segmentosDePanel(techo.largo, techo.panel, techo.tramosPanel ?? []);
  const varios = segmentos.length > 1;
  return segmentos.map((s, k) => {
    const largo = s.x1 - s.x0;
    return { x0: s.x0, x1: s.x1, largo, h1: techo.largoFaldon, h2: techo.largoFaldon, huecos: [], panel: s.panel,
      donde: varios ? `techo · ${k + 1}` : 'techo', neto: varios ? largo * techo.largoFaldon : techo.superficie };
  });
}

/**
 * v1.97 (Leandro: "quiero editar desde la tira tocada en el 3D"): poner un panel de `desde` a `hasta` (ej. la tira
 * tocada) y devolver los tramos mínimos que quedan: los segmentos que no llevan el panel de base, juntos. Así, volver a
 * poner el de base en una parte achica o borra el tramo, sin dejar tramos de más.
 */
export function tramosConPanel(largo, panelBase, tramos, desde, hasta, panel) {
  const segmentos = segmentosDePanel(largo, panelBase, [...tramos, { desde, hasta, panel }]);
  return segmentos.filter((s) => s.panel !== panelBase).map((s) => ({ desde: redondo(s.x0), hasta: redondo(s.x1), panel: s.panel }));
}

/** El paño (de una pared o del techo) que contiene la posición x a lo largo, o el último. */
export const panoEn = (panos, x) => panos.find((p) => x >= p.x0 - EPS && x <= p.x1 + EPS) ?? panos[panos.length - 1] ?? null;
