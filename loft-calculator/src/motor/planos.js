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

import { INSUMO, LADOS } from './constantes.js';
import { geometriaLados } from './geometria.js';
import { listarPiezas, NOMBRE_TIPO_PIEZA } from './estructura.js';
import { INSUMO_DE_TIPO } from './piezasAgregadas.js';
import { nombrePerfil } from './perfiles.js';
import { tirasDePano, placasDePano, resumirLargos, REVESTIMIENTO_POR_DEFECTO } from './revestimientos.js';
import { ubicarMueble, tramosDeMesada, TIPOS_MUEBLE } from './interiores.js';
import { ubicarTabique, MEDIO_ESPESOR_TABIQUE } from './tabiques.js';

const cm = (n) => Math.round(n * 100) / 100; // redondeo al cm (metros)
const unicos = (lista) => [...new Set(lista.map(cm))].sort((a, b) => a - b);

/**
 * Perfil con el que se hace una pieza (texto), mirando en este orden:
 * el elegido a mano (`insumo`), el de su pared (`perfilPared`), el de esquina o el de su tipo.
 * @param catalogo  catálogo RESUELTO (los usos ya tienen el nombre de su perfil)
 */
export function perfilDePieza(p, catalogo) {
  if (!p.insumo && p.perfilPared) {
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

/** ¿La pieza es de esta pared? (el marco de piso está en el grupo 'piso': su pared sale del id). */
const esDeLaPared = (p, lado) => p.grupos.includes(lado) || p.id === `marco-piso:${lado}`;

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
 * Una pared vista desde afuera, lista para dibujar y acotar.
 * @param aberturas  las del proyecto (para numerarlas igual que en la pantalla: #1, #2…)
 */
export function vistaDePared(e, params, lado, catalogo, aberturas = []) {
  const geo = geometriaLados(params)[lado];
  const pared = e.paredes.find((p) => p.lado === lado);
  const y0 = params.elevacion;
  // Coordenadas de la pared: x a lo largo desde p1, y desde el piso.
  const enPared = ([x, y, z]) => [
    (x - geo.p1[0]) * geo.direccion[0] + (z - geo.p1[1]) * geo.direccion[1],
    y - y0,
  ];
  const piezas = listarPiezas(e).filter((p) => esDeLaPared(p, lado)).map((p) => {
    const [x1, y1] = enPared(p.desde);
    const [x2, y2] = enPared(p.hasta);
    return { id: p.id, tipo: p.tipo, esquina: Boolean(p.esquina), nombre: nombreDeTipo(p), perfil: perfilDePieza(p, catalogo), largo: p.largo, x1, y1, x2, y2 };
  });
  const verticales = piezas.filter((p) => ['columna', 'jamba'].includes(p.tipo) && Math.abs(p.x1 - p.x2) < 1e-6);
  const fajas = piezas.filter((p) => p.tipo === 'horizontal');
  const numeroDe = (op) => aberturas.findIndex((a) => a.id === op.id) + 1;
  return {
    lado,
    largo: geo.largo,
    alturas: pared?.alturas ?? [0, 0],
    piezas,
    huecos: pared?.huecos ?? [],
    aberturas: aberturas.filter((op) => op.lado === lado).map((op, i) => {
      const h = pared?.huecos?.[i];
      return { numero: numeroDe(op), tipo: op.tipo, etiqueta: op.etiqueta ?? '', ancho: op.ancho, alto: op.alto, antepecho: op.alturaAntepecho, desde: h?.desde ?? 0 };
    }),
    cotas: {
      columnas: unicos([0, geo.largo, ...verticales.map((p) => p.x1)]), // posiciones a lo largo
      fajas: unicos(fajas.map((p) => Math.min(p.y1, p.y2))), // alturas de las horizontales
    },
    lista: listaDePiezas(listarPiezas(e).filter((p) => esDeLaPared(p, lado)), catalogo),
    revestimiento: pared ? [
      revestimientoDePared(pared, pared.panel, 'exterior', catalogo),
      pared.panelInterior ? revestimientoDePared(pared, pared.panelInterior, 'interior', catalogo) : null,
    ].filter(Boolean) : [],
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
  return { nivel, largo, ancho, contorno, piezas, lista: listaDePiezas(piezasReales, catalogo), ...extrasDePlanta(e, params, nivel, enPlanta) };
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
    const tramos = conPuerta ? [[0, t.puerta.desde], [t.puerta.desde + t.puerta.ancho, t.largo]] : [[0, t.largo]];
    return {
      nombre: t.nombre, espesor: MEDIO_ESPESOR_TABIQUE * 2,
      tramos: tramos.filter(([a, b]) => b - a > 0.01).map(([a, b]) => [punto(a), punto(b)]),
      puerta: conPuerta ? { tipo: t.puerta.tipo, desde: punto(t.puerta.desde), hasta: punto(t.puerta.desde + t.puerta.ancho) } : null,
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
export function todasLasVistas(e, params, catalogo, aberturas) {
  if (!e.paredes?.length) return { paredes: [], plantas: [] };
  return {
    paredes: LADOS.map((lado) => vistaDePared(e, params, lado, catalogo, aberturas)),
    plantas: ['piso', 'piso2', 'techo'].map((nivel) => vistaDePlanta(e, params, nivel, catalogo)).filter(Boolean),
  };
}
