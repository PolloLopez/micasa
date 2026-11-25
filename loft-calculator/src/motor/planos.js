// ==========================================================
// PLANOS PARA EXPORTAR (v1.26): cada pared y cada planta en 2D
// ----------------------------------------------------------
// Pasa las piezas 3D de la estructura a dibujos de taller:
//
//   vistaDePared(e, params, lado, catalogo)  pared vista DESDE AFUERA:
//       x = distancia desde la punta 1 (la esquina izquierda vista desde
//       afuera, como las aberturas), y = altura desde el piso.
//   vistaDePlanta(e, params, nivel, catalogo)  piso, entrepiso o techo
//       vistos desde arriba: x a lo largo (lado A), y a lo ancho.
//
// Cada vista trae sus piezas (con perfil y largo), las cotas y la lista
// de piezas agrupada ("Montante · 60x60 · 1,85 m · 4 u") para cortar.
// Las dibuja PlanosParaImprimir.jsx y las exporta exportarExcel.js.
// ==========================================================

import { panosDeLaPared, panosDelTecho } from './tramosPanel.js'; // v1.96
import { INSUMO, LADOS } from './constantes.js';
import { inicioAbertura } from './validacion.js';
import { cortesDeTiras, retazosEntreParedes, pedazosDeLaTira, rellenosDeLaObra } from './cortesPaneles.js';
import { geometriaLados, nombreDePared } from './geometria.js';
import { listarPiezas, NOMBRE_TIPO_PIEZA } from './estructura.js';
import { INSUMO_DE_TIPO } from './piezasAgregadas.js';
import { nombrePerfil } from './perfiles.js';
import { tirasDePano, placasDePano, resumirLargos, REVESTIMIENTO_POR_DEFECTO, encimadosDePano, juntasDePano, tiraDeCadaPedazo } from './revestimientos.js';
import { panosPorRevestimiento } from './presupuesto.js';
import { ubicarMueble, tramosDeMesada, TIPOS_MUEBLE } from './interiores.js';
import { ubicarTabique, inicioDePuerta, MEDIO_ESPESOR_TABIQUE } from './tabiques.js';

const cm = (n) => Math.round(n * 100) / 100; // redondeo al cm (metros)
const unicos = (lista) => [...new Set(lista.map(cm))].sort((a, b) => a - b);

/**
 * Perfil con el que se hace una pieza (texto), mirando en este orden:
 * el elegido a mano (`insumo`), el de su pared (`perfilPared`), el de esquina o el de su tipo.
 * @param catalogo  catálogo RESUELTO (los usos ya tienen el nombre de su perfil)
 */
export function perfilDePieza(p, catalogo) {
  if ((!p.insumo || p.ladoPared === 'editada a mano') && p.perfilPared) { // v1.88: lo elegido a mano manda
    const deLaPared = catalogo.find((i) => i.categoria === 'hierro' && i.id === p.perfilPared);
    if (deLaPared) return nombrePerfil(deLaPared);
  }
  const id = p.insumo ?? (p.esquina ? INSUMO.COLUMNA_ESQUINA : INSUMO_DE_TIPO[p.tipo]);
  return catalogo.find((i) => i.id === id)?.perfil ?? '';
}

/** Nombre de taller de un tipo de pieza ("Columna", "Horizontal (faja)"…). */
export const nombreDeTipo = (p) => (p.esquina ? 'Columna de esquina' : NOMBRE_TIPO_PIEZA[p.tipo] ?? p.tipo);

/**
 * Lista para cortar: las piezas iguales (mismo tipo, perfil y largo al cm) juntas.
 * @returns {{ nombre, perfil, largo, cantidad }[]} de la más larga a la más corta, por tipo
 */
export function listaDePiezas(piezas, catalogo) {
  const grupos = new Map();
  piezas.forEach((p) => {
    const nombre = nombreDeTipo(p);
    const perfil = perfilDePieza(p, catalogo);
    const largo = cm(p.largo);
    const clave = `${nombre}|${perfil}|${largo}`;
    if (!grupos.has(clave)) grupos.set(clave, { nombre, perfil, largo, cantidad: 0 });
    grupos.get(clave).cantidad++;
  });
  return [...grupos.values()].sort((a, b) => a.nombre.localeCompare(b.nombre) || b.largo - a.largo);
}

// ---------------- Paredes ----------------

/**
 * v1.66 (Leandro: "en el 2do piso el marco queda sobre el frente reutilizando un estructural, y en el plano del
 * frente no sale"): las piezas del entrepiso (grupo 'piso2') que quedan EN el plano de una pared (el borde del
 * entrepiso apoyado sobre ella) también son de esa pared: se ven en su plano. Tolerancia: medio caño de la pared.
 */
const TOLERANCIA_PLANO = 0.1;
function enElPlanoDeLaPared(p, geo) {
  if (!geo || !p.grupos.includes('piso2')) return false;
  const [dx, dz] = geo.direccion;
  const fuera = ([x, , z]) => Math.abs(-(x - geo.p1[0]) * dz + (z - geo.p1[1]) * dx); // distancia a la línea de la pared
  const aLoLargo = ([x, , z]) => (x - geo.p1[0]) * dx + (z - geo.p1[1]) * dz; // desde la esquina p1
  const dentro = (q) => aLoLargo(q) > -TOLERANCIA_PLANO && aLoLargo(q) < geo.largo + TOLERANCIA_PLANO;
  return [p.desde, p.hasta].every((q) => fuera(q) < TOLERANCIA_PLANO && dentro(q));
}

/** ¿La pieza es de esta pared? (el marco de piso está en el grupo 'piso': su pared sale del id). */
const esDeLaPared = (p, lado, geo = null) => p.grupos.includes(lado) || p.id === `marco-piso:${lado}` || enElPlanoDeLaPared(p, geo);

/**
 * Tiras o placas de un revestimiento en una pared (con las aberturas descontadas).
 * @returns {{ cara, nombre, detalle } | null}
 */
function revestimientoDePared(pared, idTipo, cara, catalogo) {
  const tipo = catalogo.find((i) => i.id === idTipo);
  if (!tipo) return null;
  const t = { ...REVESTIMIENTO_POR_DEFECTO, ...tipo };
  const pano = { largo: pared.largo, h1: pared.alturas[0], h2: pared.alturas[1], huecos: pared.huecos ?? [] };
  if (t.venta === 'estandar') {
    const { placas } = placasDePano(pano, t);
    return { cara, nombre: tipo.nombre, detalle: `${placas} placas de ${t.anchoPlaca.toFixed(2)} x ${t.largoPlaca.toFixed(2)} m` };
  }
  const tiras = tirasDePano(pano, t);
  const m2 = tiras.reduce((a, l) => a + l, 0) * t.anchoUtil;
  return { cara, nombre: tipo.nombre, detalle: `${resumirLargos(tiras)} (ancho útil ${t.anchoUtil.toFixed(2)} m) = ${m2.toFixed(2)} m²` };
}

/**
 * v1.63: los paneles del exterior de una pared (a medida): cada tira con su ancho, lo que se pide y sus cortes, y
 * dónde caen las juntas (para dibujarlas y acomodar las aberturas). null si el revestimiento es de placas o no hay.
 */
function panelesDePared(pared, catalogo, donde, e = null, claveTiras = `lado ${pared.lado}`, opciones = {}) {
  const tipo = catalogo.find((i) => i.id === pared.panel);
  if (!tipo) return null;
  // v1.91 (Leandro: "poder seleccionar si agrega los cortes de abertura, o no"): para el proveedor, las tiras enteras
  // (las aberturas se cortan en obra), aunque el panel esté cargado descontándolas.
  const t = { ...REVESTIMIENTO_POR_DEFECTO, ...tipo, ...(opciones.sinCortesAberturas ? { descontarAberturas: false } : {}) };
  if (t.venta === 'estandar') return null;
  const pano = { largo: pared.largo, h1: pared.alturas[0], h2: pared.alturas[1], huecos: pared.huecos ?? [], donde };
  const c = cortesDeTiras(pano, t);
  // v1.67: el plano de cada pedazo a pedir (medidas, recortes, lado que superpone).
  let despiece = c.tiras.flatMap((tira) => pedazosDeLaTira(pano, t, tira).map((p) => ({ ...p, tira: tira.n })));
  // v1.91: tiras enteras para el proveedor: sin los recortes de las aberturas (se hacen en obra; el dibujo de la pared
  // igual muestra dónde van).
  if (opciones.sinCortesAberturas) {
    c.tiras = c.tiras.map((tira) => {
      const cortes = tira.cortes.filter((x) => !x.startsWith('recortar'));
      return { ...tira, cortes, aberturasEnObra: tira.cortes.length - cortes.length };
    });
    despiece = despiece.map((d) => ({ ...d, recortes: [] }));
  }
  // v1.82: dónde termina cada tramo (horizontales) y las franjas donde un panel monta sobre otro.
  const { horizontales } = juntasDePano(pano, t);
  // v1.82.2: por tira entera, cada pedazo con la tira de donde sale (lo mismo que el 3D y la hoja de corte).
  const porTira = e ? tiraDeCadaPedazo(t, panosPorRevestimiento(e)[tipo.id]) : null; // (con `t`: lo mismo que se dibuja)
  return { nombre: tipo.nombre, anchoUtil: t.anchoUtil, ...c, juntas: c.tiras.slice(1).map((x) => x.x0), pano, tipo: t, despiece,
    horizontales, encimados: encimadosDePano(pano, t), pedazosTira: porTira ? porTira.pedazosDe(claveTiras) : null };
}

/**
 * Una pared vista desde afuera, lista para dibujar y acotar.
 * @param aberturas  las del proyecto (para numerarlas igual que en la pantalla: #1, #2…)
 */
export function vistaDePared(e, params, lado, catalogo, aberturas = [], opciones = {}) {
  const geo = geometriaLados(params)[lado];
  const pared = e.paredes.find((p) => p.lado === lado);
  const y0 = params.elevacion;
  // Coordenadas de la pared: x a lo largo desde p1, y desde el piso.
  const enPared = ([x, y, z]) => [
    (x - geo.p1[0]) * geo.direccion[0] + (z - geo.p1[1]) * geo.direccion[1],
    y - y0,
  ];
  const piezas = listarPiezas(e).filter((p) => esDeLaPared(p, lado, geo)).map((p) => {
    const [x1, y1] = enPared(p.desde);
    const [x2, y2] = enPared(p.hasta);
    return { id: p.id, tipo: p.tipo, esquina: Boolean(p.esquina), nombre: nombreDeTipo(p), perfil: perfilDePieza(p, catalogo), largo: p.largo, x1, y1, x2, y2 };
  });
  const verticales = piezas.filter((p) => ['columna', 'jamba'].includes(p.tipo) && Math.abs(p.x1 - p.x2) < 1e-6);
  const fajas = piezas.filter((p) => p.tipo === 'horizontal');
  // v1.66: el borde del entrepiso apoyado en la pared también se acota en altura (como una faja).
  const delEntrepiso = piezas.filter((p) => p.tipo === 'marco-piso2' && Math.abs(p.y1 - p.y2) < 1e-6);
  const numeroDe = (op) => aberturas.findIndex((a) => a.id === op.id) + 1;
  return {
    lado,
    largo: geo.largo,
    alturas: pared?.alturas ?? [0, 0],
    piezas,
    huecos: pared?.huecos ?? [],
    // v1.60: cada abertura con su lugar en la pared. Las "a futuro" no tienen hueco (la pared va revestida entera):
    // los huecos de la pared son solo las demás, en el mismo orden (antes se emparejaban mal por posición).
    aberturas: aberturas.filter((op) => op.lado === lado).map((op) => {
      const desde = inicioAbertura(op, params);
      const antepecho = op.alturaAntepecho ?? 0;
      return { numero: numeroDe(op), tipo: op.tipo, etiqueta: op.etiqueta ?? '', ancho: op.ancho, alto: op.alto, antepecho, desde,
        hasta: desde + op.ancho, arriba: antepecho + op.alto, futura: op.futura === true };
    }),
    cotas: {
      columnas: unicos([0, geo.largo, ...verticales.map((p) => p.x1)]), // posiciones a lo largo
      fajas: unicos([...fajas, ...delEntrepiso].map((p) => Math.min(p.y1, p.y2))), // alturas de las horizontales (y del entrepiso)
    },
    lista: listaDePiezas(listarPiezas(e).filter((p) => esDeLaPared(p, lado, geo)), catalogo),
    // v1.63: tamaños y cortes; v1.96: uno por tramo de panel (`panelesTramos`, cada uno con `offsetX` desde la esquina
    // izquierda). `paneles` = el primero (el de toda la pared si no tiene tramos).
    ...(() => {
      const tramos = pared ? panelesPorTramo(pared, catalogo, nombreDePared(lado, params), e, opciones) : [];
      return { paneles: tramos[0] ?? null, panelesTramos: tramos };
    })(),
    revestimiento: pared ? [
      ...revestimientoPorTramo(pared, catalogo),
      pared.panelInterior ? revestimientoDePared(pared, pared.panelInterior, 'interior', catalogo) : null,
    ].filter(Boolean) : [],
  };
}

/** v1.96: los paneles de cada tramo de la pared (o del techo), cada uno con dónde arranca (offsetX) y su nombre. */
function panelesPorTramo(pared, catalogo, nombre, e, opciones = {}) {
  const panos = pared.lado === 'techo' ? panosDelTecho(pared.techo) : panosDeLaPared(pared);
  return panos.map((s, k) => {
    const sub = { lado: pared.lado, largo: s.largo, alturas: [s.h1, s.h2], huecos: s.huecos, panel: s.panel };
    const p = panelesDePared(sub, catalogo, panos.length > 1 ? `${nombre} · tramo ${k + 1}` : nombre, e, s.donde, opciones);
    return p && { ...p, offsetX: s.x0, tramo: panos.length > 1 ? k + 1 : null };
  }).filter(Boolean);
}

/** v1.96: qué pedir de revestimiento exterior, por tramo ("exterior, tramo 2 (de 2,40 a 4,40 m)"). */
function revestimientoPorTramo(pared, catalogo) {
  const panos = pared.lado === 'techo' ? panosDelTecho(pared.techo) : panosDeLaPared(pared);
  const m = (n) => n.toFixed(2).replace('.', ',');
  return panos.map((s, k) => revestimientoDePared({ largo: s.largo, alturas: [s.h1, s.h2], huecos: s.huecos }, s.panel,
    panos.length > 1 ? `exterior, tramo ${k + 1} (de ${m(s.x0)} a ${m(s.x1)} m)` : 'exterior', catalogo));
}

/**
 * v1.91 (Leandro: "no necesito mostrarle la estructura de hierros, solo los 5 paneles para revestir"): el techo como
 * un paño más, igual que una pared: a lo largo (x) y a lo largo del faldón (y, desde el borde bajo, con el alero),
 * con sus tiras y de qué tira entera sale cada pedazo. null si el techo no lleva panel.
 */
export function vistaDelTecho(e, params, catalogo) {
  const t = e.techo;
  if (!t?.panel || !(t.largo > 0) || !(t.largoFaldon > 0)) return null;
  const pared = { lado: 'techo', largo: t.largo, alturas: [t.largoFaldon, t.largoFaldon], huecos: [], panel: t.panel, techo: t };
  const tramos = panelesPorTramo(pared, catalogo, 'Techo', e); // v1.96: por tramo de panel
  return {
    lado: 'techo', esTecho: true, largo: t.largo, alturas: pared.alturas, piezas: [], huecos: [], aberturas: [],
    cotas: { columnas: [0, t.largo], fajas: [] }, lista: [],
    alero: t.alero ?? null, caida: params.caidaTecho ?? null,
    paneles: tramos[0] ?? null, panelesTramos: tramos,
    revestimiento: revestimientoPorTramo(pared, catalogo).filter(Boolean),
  };
}

// ---------------- Plantas ----------------

const PIEZAS_DE_PLANTA = {
  piso: (e) => [...e.piso.tirantes, ...e.piso.transversales, ...e.marcos.filter((p) => p.tipo === 'marco-piso')],
  piso2: (e) => [...e.piso2.tirantes, ...e.piso2.transversales, ...e.marcos.filter((p) => ['marco-piso2', 'viga-cierre', 'viga-apoyo'].includes(p.tipo))],
  techo: (e) => [...(e.techo.bordes ?? []), ...e.techo.vigas, ...e.techo.correas],
};
export const NOMBRE_PLANTA = { piso: 'Piso (planta baja)', piso2: 'Entrepiso (piso 2)', techo: 'Techo' };

/**
 * Una planta vista desde arriba: x a lo largo (de la esquina A-D a la A-B), y a lo ancho (desde el lado A).
 * @returns {{ nivel, largo, ancho, contorno, piezas, lista } | null}  null si no hay piezas (ej. sin entrepiso)
 */
export function vistaDePlanta(e, params, nivel, catalogo) {
  const piezasReales = PIEZAS_DE_PLANTA[nivel](e);
  if (piezasReales.length === 0) return null;
  const { largo, ancho } = params;
  // Vista desde arriba con el lado A abajo: x crece hacia B, y crece hacia C.
  const enPlanta = ([x, , z]) => [x + largo / 2, ancho / 2 - z];
  const piezas = piezasReales.map((p) => {
    const [x1, y1] = enPlanta(p.desde);
    const [x2, y2] = enPlanta(p.hasta);
    return { id: p.id, tipo: p.tipo, nombre: nombreDeTipo(p), perfil: perfilDePieza(p, catalogo), largo: p.largo, x1, y1, x2, y2 };
  });
  const contorno = nivel === 'piso2' && e.entrepiso
    ? e.entrepiso.esquinas.map(([x, z]) => enPlanta([x, 0, z]))
    : [[0, 0], [largo, 0], [largo, ancho], [0, ancho]];
  // v1.52: el nombre de cada pared (su etiqueta o el automático) para escribirlo alrededor de la planta.
  const nombres = Object.fromEntries(LADOS.map((l) => [l, `${nombreDePared(l, params)} (${l})`]));
  return { nivel, largo, ancho, contorno, piezas, nombres, lista: listaDePiezas(piezasReales, catalogo), ...extrasDePlanta(e, params, nivel, enPlanta) };
}

/**
 * v1.50: lo que se dibuja arriba de la estructura en cada planta (pedido de Leandro): en la planta baja los pilotines y
 * las zapatas (punteados: van debajo); en cada piso sus tabiques (con el hueco de la puerta), mesadas y muebles.
 * Todo en las mismas coordenadas que las piezas (x a lo largo desde la esquina A-D, y a lo ancho desde el lado A).
 */
function extrasDePlanta(e, params, nivel, enPlanta) {
  const en2D = ([x, z]) => enPlanta([x, 0, z]);
  const rect = (centro, u, v, mu, mv) => [[-1, -1], [1, -1], [1, 1], [-1, 1]]
    .map(([a, b]) => en2D([centro[0] + u[0] * mu * a + v[0] * mv * b, centro[1] + u[1] * mu * a + v[1] * mv * b]));
  if (nivel === 'techo') return { pilotines: [], tabiques: [], mesadas: [], muebles: [] };
  const pilotines = nivel === 'piso' ? (e.pilotines ?? []).map(({ x, z }) => {
    const [px, py] = en2D([x, z]);
    return { x: px, y: py, forma: e.pilotin?.forma ?? 'redondo', medida: e.pilotin?.medida ?? 0.3, zapata: e.zapata?.lado ?? 0 };
  }) : [];
  const delNivel = (lista) => (lista ?? []).filter((x) => (x.nivel ?? 'piso') === nivel);
  const tabiques = delNivel(params.tabiques).map((t) => {
    const { inicio, direccion } = ubicarTabique(params, t);
    const punto = (d) => en2D([inicio[0] + direccion[0] * d, inicio[1] + direccion[1] * d]);
    const conPuerta = t.puerta && t.puerta.tipo !== 'ninguna';
    const pa = conPuerta ? inicioDePuerta(t) : 0;
    const tramos = conPuerta ? [[0, pa], [pa + t.puerta.ancho, t.largo]] : [[0, t.largo]];
    return {
      nombre: t.nombre, espesor: MEDIO_ESPESOR_TABIQUE * 2,
      tramos: tramos.filter(([a, b]) => b - a > 0.01).map(([a, b]) => [punto(a), punto(b)]),
      puerta: conPuerta ? { tipo: t.puerta.tipo, desde: punto(pa), hasta: punto(pa + t.puerta.ancho) } : null,
      medio: punto(t.largo / 2),
    };
  });
  const mesadas = delNivel(params.mesadas).flatMap((m) => tramosDeMesada(params, m).map((t) => {
    const fondo = m.profundidad;
    const centro = [t.origen[0] + t.alongo[0] * t.largo / 2 + t.adentro[0] * fondo / 2, t.origen[1] + t.alongo[1] * t.largo / 2 + t.adentro[1] * fondo / 2];
    return { nombre: m.nombre, puntos: rect(centro, t.alongo, t.adentro, t.largo / 2, fondo / 2), medio: en2D(centro) };
  }));
  const muebles = delNivel(params.muebles).map((m) => {
    const { centro, angulo } = ubicarMueble(params, m);
    const [c, s] = [Math.cos(angulo), Math.sin(angulo)];
    return { nombre: m.nombre || TIPOS_MUEBLE[m.tipo]?.nombre, puntos: rect(centro, [c, -s], [s, c], m.ancho / 2, m.profundidad / 2), medio: en2D(centro),
      colgado: (m.elevacion ?? 0) > 0.3 }; // colgado o arriba de una mesada: punteado
  });
  return { pilotines, tabiques, mesadas, muebles };
}

/** Todas las vistas de una construcción (para imprimir y para el Excel). */
/** @param opciones v1.91: { sinCortesAberturas } las tiras enteras, para el proveedor de paneles */
export function todasLasVistas(e, params, catalogo, aberturas, opciones = {}) {
  if (!e.paredes?.length) return { paredes: [], plantas: [], techo: null };
  const paredes = LADOS.map((lado) => vistaDePared(e, params, lado, catalogo, aberturas, opciones));
  // v1.63: las tiras angostas que salen del retazo de otra pared (del mismo panel), marcadas en cada una.
  const porTipo = new Map();
  // v1.96: cada tramo de panel cuenta como una "vista" (con su propio tipo).
  paredes.flatMap((v) => v.panelesTramos ?? []).forEach((pn) => porTipo.set(pn.tipo.id, [...(porTipo.get(pn.tipo.id) ?? []), { paneles: pn }]));
  porTipo.forEach((vistas) => {
    const tipo = vistas[0].paneles.tipo;
    const panos = vistas.map((v) => v.paneles.pano);
    let sobrantes = [];
    if (vistas.length > 1 && tipo.aprovecharRetazos !== false) {
      const r = retazosEntreParedes(panos, tipo);
      sobrantes = r.sobrantes;
      r.reusos.forEach((x) => vistas.forEach((v) => v.paneles.tiras.forEach((t) => {
        if (`${v.paneles.pano.donde}, tira ${t.n}` === x.para) t.deRetazo = x.de;
      })));
    }
    // v1.68: de dónde sale cada relleno al costado de una abertura (un recorte, o se compra).
    const { rellenos } = rellenosDeLaObra(panos, tipo, sobrantes);
    vistas.forEach((v) => v.paneles.tiras.forEach((t) => (t.rellenos ?? []).forEach((r) => {
      const asignado = rellenos.find((x) => x.para === `${v.paneles.pano.donde}, tira ${t.n} (costado ${r.lado})`);
      r.de = asignado?.de ?? null; // null = se compra
    })));
  });
  return {
    paredes,
    plantas: ['piso', 'piso2', 'techo'].map((nivel) => vistaDePlanta(e, params, nivel, catalogo)).filter(Boolean),
    techo: vistaDelTecho(e, params, catalogo), // v1.91: el panel del techo, para el proveedor de paneles
  };
}
