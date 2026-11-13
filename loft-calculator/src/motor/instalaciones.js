// ==========================================================
// INSTALACIONES (v1.57): eléctrica, agua, desagües y gas
// ----------------------------------------------------------
// Pedido de Leandro (12/11): tablero, tomas y lámparas; cañería de agua para
// la grifería, la ducha y el lavamanos; termotanque, cisterna y bomba;
// desagües; la garrafa para la cocina. Cada plano se prende y se apaga, y se
// exporta con medidas y la lista de materiales (cajas, uniones, curvas,
// cuplas, terminales).
//
// Decisiones (respuestas del 12/11):
//   - PUNTOS + RECORRIDO QUE TRAZÁS VOS: cada punto (una toma, una canilla)
//     se ubica como los muebles: en una pared, a una distancia de su esquina
//     izquierda (vista desde afuera), a una altura y, si hace falta, a una
//     distancia hacia adentro (una lámpara en el medio del techo).
//     Un TRAMO une dos puntos del mismo sistema.
//   - VAN POR FUERA, ATORNILLADAS A LA ESTRUCTURA: el tramo sale del punto,
//     atraviesa la pared, sube o baja a la altura del recorrido, da la vuelta
//     por afuera de la casa (por el lado más corto) y entra al otro punto.
//   - Canalización eléctrica ELEGIBLE POR TRAMO (bandeja, caño rígido de PVC,
//     caño metálico o cablecanal); agua en termofusión 20 o 25 mm y desagües
//     en PVC 40 a 110 mm (editables por tramo).
//   - Lo que va afuera de la casa (hasta la cámara, la garrafa o el pilar) se
//     carga como "largo extra" del tramo.
//
// Los precios son de ejemplo y se editan en la lista de materiales; el
// total de cada sistema va al presupuesto como un renglón.
// ==========================================================

import { geometriaLados } from './geometria.js';
import { LADOS } from './constantes.js';

export const SISTEMAS = [
  ['electrica', 'Eléctrica', '#facc15'],
  ['agua', 'Agua', '#38bdf8'],
  ['desague', 'Desagües', '#a16207'],
  ['gas', 'Gas', '#f97316'],
];
export const nombreSistema = (s) => SISTEMAS.find(([v]) => v === s)?.[1] ?? s;
export const colorSistema = (s) => SISTEMAS.find(([v]) => v === s)?.[2] ?? '#94a3b8';

/**
 * Qué se puede poner en cada sistema: nombre, altura de fábrica (del piso) y lo que lleva el punto
 * ([material, cantidad, unidad]).
 */
export const TIPOS_PUNTO = {
  electrica: {
    tablero: { nombre: 'Tablero', altura: 1.6, lleva: [['Tablero 12 módulos', 1, 'u'], ['Disyuntor diferencial 2x40 A', 1, 'u'], ['Térmica 2x16 A', 2, 'u'], ['Térmica 2x10 A', 1, 'u'], ['Jabalina con caja y morseto', 1, 'u']] },
    toma: { nombre: 'Toma', altura: 0.3, lleva: [['Caja rectangular 5x10', 1, 'u'], ['Toma 10 A con bastidor y tapa', 1, 'u']] },
    tomaDoble: { nombre: 'Toma doble', altura: 1.1, lleva: [['Caja rectangular 5x10', 1, 'u'], ['Toma doble 10 A con bastidor y tapa', 1, 'u']] },
    interruptor: { nombre: 'Interruptor', altura: 1.1, lleva: [['Caja rectangular 5x10', 1, 'u'], ['Interruptor con bastidor y tapa', 1, 'u']] },
    lampara: { nombre: 'Lámpara', altura: 2.4, lleva: [['Caja octogonal', 1, 'u'], ['Portalámpara', 1, 'u'], ['Lámpara LED 12 W', 1, 'u']] },
    aplique: { nombre: 'Aplique de pared', altura: 2, lleva: [['Caja octogonal', 1, 'u'], ['Aplique', 1, 'u']] },
    cajaPaso: { nombre: 'Caja de paso', altura: 2.4, lleva: [['Caja de paso 10x10 estanca', 1, 'u']] },
  },
  agua: {
    canilla: { nombre: 'Canilla', altura: 0.6, lleva: [['Canilla ½"', 1, 'u']] },
    pileta: { nombre: 'Pileta de cocina', altura: 1.1, lleva: [['Grifería de pileta de cocina', 1, 'u'], ['Flexible ½" x 40 cm', 2, 'u']] },
    lavamanos: { nombre: 'Lavamanos', altura: 0.6, lleva: [['Grifería de lavatorio', 1, 'u'], ['Flexible ½" x 40 cm', 2, 'u']] },
    ducha: { nombre: 'Ducha', altura: 1.1, lleva: [['Grifería de ducha (mezcladora)', 1, 'u'], ['Flor de ducha con brazo', 1, 'u']] },
    inodoro: { nombre: 'Inodoro (depósito)', altura: 0.25, lleva: [['Llave de paso ½"', 1, 'u'], ['Flexible ½" x 40 cm', 1, 'u']] },
    lavarropas: { nombre: 'Lavarropas', altura: 1, lleva: [['Canilla de lavarropas ¾"', 1, 'u']] },
    termotanque: { nombre: 'Termotanque', altura: 0.5, lleva: [['Termotanque', 1, 'u'], ['Válvula de seguridad', 1, 'u'], ['Llave de paso ½"', 2, 'u']] },
    cisterna: { nombre: 'Cisterna / tanque', altura: 0, lleva: [['Tanque de agua 1000 l', 1, 'u'], ['Flotante', 1, 'u'], ['Llave de paso ¾"', 1, 'u']] },
    bomba: { nombre: 'Bomba presurizadora', altura: 0.2, lleva: [['Bomba presurizadora', 1, 'u'], ['Llave de paso ¾"', 2, 'u']] },
    entrada: { nombre: 'Entrada de agua (red)', altura: 0.3, lleva: [['Llave de paso ¾"', 1, 'u']] },
  },
  desague: {
    inodoro: { nombre: 'Inodoro', altura: 0, lleva: [['Codo de inodoro ø110', 1, 'u']] },
    ducha: { nombre: 'Ducha (rejilla)', altura: 0, lleva: [['Pileta de patio ø63 con rejilla', 1, 'u']] },
    lavamanos: { nombre: 'Lavamanos', altura: 0.45, lleva: [['Sifón ø40', 1, 'u']] },
    pileta: { nombre: 'Pileta de cocina', altura: 0.6, lleva: [['Sifón ø50', 1, 'u']] },
    lavarropas: { nombre: 'Lavarropas', altura: 0.6, lleva: [['Sifón ø40', 1, 'u']] },
    camara: { nombre: 'Cámara de inspección', altura: -0.5, lleva: [['Cámara de inspección 60x60', 1, 'u']] },
    ventilacion: { nombre: 'Ventilación (al techo)', altura: 3, lleva: [['Sombrerete ø63', 1, 'u']] },
  },
  gas: {
    garrafa: { nombre: 'Garrafa (afuera)', altura: 0, lleva: [['Garrafa 10 kg', 1, 'u'], ['Regulador de garrafa', 1, 'u'], ['Gabinete para garrafa', 1, 'u']] },
    cocina: { nombre: 'Cocina', altura: 0.6, lleva: [['Llave de paso de gas ½"', 1, 'u'], ['Flexible de gas aprobado', 1, 'u']] },
    calefon: { nombre: 'Calefón / termotanque a gas', altura: 1.4, lleva: [['Llave de paso de gas ½"', 1, 'u'], ['Flexible de gas aprobado', 1, 'u']] },
  },
};

/**
 * Cómo se arma cada canalización o caño: largo de barra, y cómo se llaman sus accesorios.
 * grampaCada: una grampa (o soporte) cada tantos metros; terminal: lo que va en cada punta del tramo.
 */
export const MATERIALES_TRAMO = {
  electrica: {
    bandeja: { nombre: 'Bandeja portacables perforada 100 mm', barra: 3, union: 'Unión de bandeja', curva: 'Curva de bandeja 90°', grampa: 'Ménsula de bandeja', grampaCada: 1.5, terminal: 'Bajada de bandeja a caja' },
    pvc: { nombre: 'Caño rígido PVC ø20 mm', barra: 3, union: 'Cupla PVC ø20', curva: 'Curva PVC ø20', grampa: 'Grampa omega ø20', grampaCada: 0.8, terminal: 'Conector PVC ø20 a caja' },
    metal: { nombre: 'Caño semipesado ¾"', barra: 3, union: 'Cupla semipesado ¾"', curva: 'Curva semipesado ¾"', grampa: 'Grampa omega ¾"', grampaCada: 1, terminal: 'Conector ¾" a caja' },
    cablecanal: { nombre: 'Cablecanal 20x10', barra: 2, union: 'Unión de cablecanal', curva: 'Ángulo de cablecanal', grampa: 'Tarugo y tornillo', grampaCada: 0.5, terminal: 'Tapa final de cablecanal' },
  },
  agua: {
    ppr20: { nombre: 'Caño termofusión ø20', barra: 4, union: 'Cupla termofusión ø20', curva: 'Codo 90° termofusión ø20', grampa: 'Grampa ø20', grampaCada: 1, terminal: 'Codo con rosca hembra ø20 x ½"' },
    ppr25: { nombre: 'Caño termofusión ø25', barra: 4, union: 'Cupla termofusión ø25', curva: 'Codo 90° termofusión ø25', grampa: 'Grampa ø25', grampaCada: 1, terminal: 'Codo con rosca hembra ø25 x ¾"' },
  },
  desague: {
    pvc40: { nombre: 'Caño PVC ø40', barra: 4, union: 'Cupla PVC ø40', curva: 'Curva 90° PVC ø40', grampa: 'Grampa ø40', grampaCada: 1, terminal: 'Ramal 45° PVC ø40' },
    pvc50: { nombre: 'Caño PVC ø50', barra: 4, union: 'Cupla PVC ø50', curva: 'Curva 90° PVC ø50', grampa: 'Grampa ø50', grampaCada: 1, terminal: 'Ramal 45° PVC ø50' },
    pvc63: { nombre: 'Caño PVC ø63', barra: 4, union: 'Cupla PVC ø63', curva: 'Curva 90° PVC ø63', grampa: 'Grampa ø63', grampaCada: 1, terminal: 'Ramal 45° PVC ø63' },
    pvc110: { nombre: 'Caño PVC ø110', barra: 4, union: 'Cupla PVC ø110', curva: 'Curva 90° PVC ø110', grampa: 'Grampa ø110', grampaCada: 1.2, terminal: 'Ramal 45° PVC ø110' },
  },
  gas: {
    epoxi12: { nombre: 'Caño epoxi ½"', barra: 6.4, union: 'Cupla epoxi ½"', curva: 'Codo epoxi ½"', grampa: 'Grampa ½"', grampaCada: 1, terminal: 'Unión doble ½"' },
    epoxi34: { nombre: 'Caño epoxi ¾"', barra: 6.4, union: 'Cupla epoxi ¾"', curva: 'Codo epoxi ¾"', grampa: 'Grampa ¾"', grampaCada: 1, terminal: 'Unión doble ¾"' },
  },
};
export const MATERIAL_DE_FABRICA = { electrica: 'pvc', agua: 'ppr20', desague: 'pvc110', gas: 'epoxi12' };
/** Altura del recorrido por afuera (desde el piso del punto de salida): la luz arriba, el agua abajo, los desagües bajo el piso. */
export const ALTURA_RECORRIDO = { electrica: 2.4, agua: 0.3, desague: -0.3, gas: 0.3 };
/** Cable de cada tramo eléctrico (mm²) y cuántos conductores (fase, neutro y tierra). */
export const SECCIONES_CABLE = [1.5, 2.5, 4, 6];
const CONDUCTORES = 3;
const PASANTE = 0.15; // m: lo que se pierde al atravesar la pared (de adentro hacia afuera)
const SEPARACION_PARED = 0.06; // m: el caño corre a 6 cm de la pared, por afuera
const DESPERDICIO_CABLE = 0.3; // m de cable de más en cada punta (para conectar)

/** Precios de ejemplo de los materiales (se editan en la lista). */
export const PRECIOS_EJEMPLO = {
  'Caño rígido PVC ø20 mm': 2500, 'Bandeja portacables perforada 100 mm': 18000, 'Caño semipesado ¾"': 9000, 'Cablecanal 20x10': 1800,
  'Caño termofusión ø20': 4500, 'Caño termofusión ø25': 6500, 'Caño PVC ø40': 6000, 'Caño PVC ø50': 7500, 'Caño PVC ø63': 9500,
  'Caño PVC ø110': 16000, 'Caño epoxi ½"': 22000, 'Caño epoxi ¾"': 30000,
  'Cable 1,5 mm²': 700, 'Cable 2,5 mm²': 1000, 'Cable 4 mm²': 1600, 'Cable 6 mm²': 2400,
};

// ---------- puntos y tramos ----------

const siguienteId = (lista) => Math.max(0, ...lista.map((x) => x.id)) + 1;

export function puntoNuevo(puntos, sistema, tipo) {
  const t = TIPOS_PUNTO[sistema][tipo];
  const iguales = puntos.filter((p) => p.sistema === sistema && p.tipo === tipo).length;
  return {
    id: siguienteId(puntos), sistema, tipo, nombre: iguales ? `${t.nombre} ${iguales + 1}` : t.nombre,
    nivel: 'piso', lado: 'A', distancia: 0.5 + iguales * 0.5, altura: t.altura, adentro: tipo === 'lampara' ? 1 : 0,
  };
}

export function tramoNuevo(tramos, sistema, desde = null, hasta = null) {
  return {
    id: siguienteId(tramos), sistema, desde, hasta, material: MATERIAL_DE_FABRICA[sistema],
    alturaRecorrido: ALTURA_RECORRIDO[sistema], largoExtra: 0, ...(sistema === 'electrica' ? { seccion: 2.5 } : {}),
  };
}

/** Posición de un punto: el lado, el tramo del perímetro donde cae y su altura absoluta. */
function ubicar(p, geo, perimetroAntes, pisoDe) {
  const lado = geo[p.lado];
  const t = Math.max(0, Math.min(lado.largo, p.distancia));
  return { s: perimetroAntes[p.lado] + t, t, lado, y: pisoDe(p.nivel) + p.altura };
}

/**
 * El recorrido de un tramo por afuera de la casa: los vértices en 3D ([x, y, z]), el largo y las curvas.
 * @param pisoDe (nivel) => altura del piso de ese nivel (elevación o entrepiso)
 * @returns {{ puntos: number[][], largo, horizontal, vertical, curvas, esquinas } | null}  null si falta un punto
 */
export function recorridoDelTramo(tramo, puntos, params, pisoDe) {
  const a = puntos.find((p) => p.id === tramo.desde);
  const b = puntos.find((p) => p.id === tramo.hasta);
  if (!a || !b) return null;
  const geo = geometriaLados(params);
  const perimetroAntes = {};
  let acumulado = 0;
  LADOS.forEach((l) => { perimetroAntes[l] = acumulado; acumulado += geo[l].largo; });
  const perimetro = acumulado;
  const normal = (l) => [-geo[l].direccion[1], geo[l].direccion[0]]; // hacia afuera
  const ua = ubicar(a, geo, perimetroAntes, pisoDe);
  const ub = ubicar(b, geo, perimetroAntes, pisoDe);
  const yr = pisoDe(a.nivel) + tramo.alturaRecorrido;

  // Por el lado más corto del perímetro.
  let delta = ub.s - ua.s;
  if (Math.abs(delta) > perimetro / 2) delta -= Math.sign(delta) * perimetro;
  const horizontal = Math.abs(delta);
  // Las esquinas que se cruzan (en el sentido del recorrido).
  const esquinas = [];
  const paso = Math.sign(delta);
  if (paso !== 0) {
    LADOS.forEach((l, i) => {
      // La esquina al final del lado l está en s = perimetroAntes[l] + largo (y es el arranque del siguiente).
      const sEsq = perimetroAntes[l] + geo[l].largo;
      [sEsq, sEsq - perimetro, sEsq + perimetro].forEach((s) => {
        const entre = paso > 0 ? s > ua.s + 1e-9 && s < ua.s + delta - 1e-9 : s < ua.s - 1e-9 && s > ua.s + delta + 1e-9;
        if (entre) esquinas.push({ s, l, siguiente: LADOS[(i + 1) % 4] });
      });
    });
    esquinas.sort((x, y) => (x.s - y.s) * paso);
  }

  // Vértices: adentro del punto → afuera de la pared → altura del recorrido → por afuera → …
  const o = SEPARACION_PARED;
  const enPared = (u, l, desplazamiento) => {
    const n = normal(l);
    const base = [geo[l].p1[0] + geo[l].direccion[0] * u.t, geo[l].p1[1] + geo[l].direccion[1] * u.t];
    return [base[0] + n[0] * desplazamiento, base[1] + n[1] * desplazamiento];
  };
  const v3 = ([x, z], y) => [x, y, z];
  const salida = (p, u) => {
    const adentro = enPared(u, p.lado, -Math.max(0, p.adentro));
    return [v3(adentro, u.y), v3(enPared(u, p.lado, 0), u.y), v3(enPared(u, p.lado, o), u.y)];
  };
  const ida = salida(a, ua);
  const vuelta = salida(b, ub).reverse();
  const vertices = [...ida, v3(enPared(ua, a.lado, o), yr)];
  esquinas.forEach(({ l, siguiente }) => {
    const esquina = geo[l].p2; // la esquina al final del lado l (= el arranque del siguiente), en cualquier sentido
    const n1 = normal(l);
    const n2 = normal(siguiente);
    vertices.push([esquina[0] + (n1[0] + n2[0]) * o, yr, esquina[1] + (n1[1] + n2[1]) * o]);
  });
  vertices.push(v3(enPared(ub, b.lado, o), yr), ...vuelta);
  // Sin puntos repetidos (ej. sin "adentro" o con el punto a la altura del recorrido).
  const limpios = vertices.filter((v, i) => i === 0 || Math.hypot(v[0] - vertices[i - 1][0], v[1] - vertices[i - 1][1], v[2] - vertices[i - 1][2]) > 1e-6);

  const vertical = Math.abs(ua.y - yr) + Math.abs(ub.y - yr);
  const extremos = [[a, ua], [b, ub]];
  const largo = horizontal + vertical + extremos.reduce((s, [p]) => s + PASANTE + Math.max(0, p.adentro), 0) + (tramo.largoExtra ?? 0);
  // Curvas: cada esquina, y en cada punta el giro de la pared al recorrido (más el de la bajada o subida y el de "adentro").
  const curvas = esquinas.length + extremos.reduce((s, [p, u]) => s + 1 + (Math.abs(u.y - yr) > 0.01 && horizontal > 0.01 ? 1 : 0) + (p.adentro > 0 ? 1 : 0), 0);
  return { puntos: limpios, largo, horizontal, vertical, curvas, esquinas: esquinas.length, desde: a, hasta: b };
}

/** v1.57: dónde está un punto en el 3D ([x, y, z]): en su pared por dentro, corrido "adentro" si tiene. */
export function posicionDelPunto(p, params, pisoDe) {
  const geo = geometriaLados(params);
  const lado = geo[p.lado];
  const t = Math.max(0, Math.min(lado.largo, p.distancia));
  const n = [-lado.direccion[1], lado.direccion[0]];
  const adentro = Math.max(0, p.adentro);
  return [lado.p1[0] + lado.direccion[0] * t - n[0] * adentro, pisoDe(p.nivel) + p.altura, lado.p1[1] + lado.direccion[1] * t - n[1] * adentro];
}

/** La altura del piso de cada nivel. */
export const pisoDeLaObra = (params, estructura) => (nivel) => (nivel === 'piso2' && estructura?.entrepiso ? estructura.entrepiso.y : params.elevacion ?? 0);

// ---------- materiales ----------

/**
 * La lista de materiales de un sistema: lo de cada punto y lo de cada tramo (caños o canalización, uniones, curvas,
 * grampas, terminales y, en la eléctrica, el cable).
 * @returns {{ tramos: { id, nombre, largo, curvas, material }[], materiales: { nombre, unidad, cantidad, precio, total }[], total }}
 */
export function materialesDelSistema(params, estructura, sistema) {
  const inst = completarInstalaciones(params.instalaciones);
  const pisoDe = pisoDeLaObra(params, estructura);
  const lista = new Map();
  const agregar = (nombre, cantidad, unidad = 'u') => {
    if (!(cantidad > 0)) return;
    const m = lista.get(nombre) ?? { nombre, unidad, cantidad: 0 };
    m.cantidad += cantidad;
    lista.set(nombre, m);
  };
  const puntos = inst.puntos.filter((p) => p.sistema === sistema);
  puntos.forEach((p) => (TIPOS_PUNTO[sistema][p.tipo]?.lleva ?? []).forEach(([nombre, n, u]) => agregar(nombre, n, u)));
  const tramos = inst.tramos.filter((t) => t.sistema === sistema).map((t) => {
    const r = recorridoDelTramo(t, inst.puntos, params, pisoDe);
    const mat = MATERIALES_TRAMO[sistema][t.material];
    if (!r || !mat) return { id: t.id, nombre: 'Tramo sin puntas', largo: 0, curvas: 0, material: mat?.nombre ?? '' };
    const barras = Math.ceil(r.largo / mat.barra - 1e-9);
    agregar(`${mat.nombre} (barra de ${String(mat.barra).replace('.', ',')} m)`, barras, 'barras');
    agregar(mat.union, Math.max(0, barras - 1), 'u');
    agregar(mat.curva, r.curvas, 'u');
    agregar(mat.grampa, Math.ceil(r.largo / mat.grampaCada), 'u');
    agregar(mat.terminal, 2, 'u');
    if (sistema === 'electrica') {
      agregar(`Cable ${String(t.seccion ?? 2.5).replace('.', ',')} mm²`, Math.ceil((r.largo + 2 * DESPERDICIO_CABLE) * CONDUCTORES), 'm');
    }
    return { id: t.id, nombre: `${r.desde.nombre} → ${r.hasta.nombre}`, largo: r.largo, curvas: r.curvas, material: mat.nombre };
  });
  const precioDe = (nombre) => {
    const guardado = inst.precios[nombre];
    if (Number.isFinite(guardado)) return guardado;
    const base = Object.keys(PRECIOS_EJEMPLO).find((k) => nombre.startsWith(k));
    return base ? PRECIOS_EJEMPLO[base] : 0;
  };
  const materiales = [...lista.values()].map((m) => ({ ...m, precio: precioDe(m.nombre), total: precioDe(m.nombre) * m.cantidad }));
  return { tramos, materiales, total: materiales.reduce((a, m) => a + m.total, 0), puntos: puntos.length };
}

/** Todos los sistemas con algo cargado. */
export function materialesDeInstalaciones(params, estructura) {
  return SISTEMAS.map(([s]) => ({ sistema: s, nombre: nombreSistema(s), ...materialesDelSistema(params, estructura, s) }))
    .filter((x) => x.puntos > 0 || x.tramos.length > 0);
}

// ---------- validación y proyectos de antes ----------

export const INSTALACIONES_INICIALES = { puntos: [], tramos: [], precios: {} };
const entre = (n, min, max) => Number.isFinite(n) && n >= min && n <= max;

export function validarInstalaciones(inst) {
  if (!inst || !Array.isArray(inst.puntos) || !Array.isArray(inst.tramos) || typeof inst.precios !== 'object' || inst.precios === null) {
    return { instalaciones: 'Instalaciones inválidas' };
  }
  const errores = {};
  inst.puntos.forEach((p, i) => {
    let e = null;
    if (!TIPOS_PUNTO[p?.sistema]?.[p.tipo]) e = 'Tipo desconocido';
    else if (typeof p.nombre !== 'string' || p.nombre.length > 40) e = 'El nombre puede tener hasta 40 letras';
    else if (!LADOS.includes(p.lado)) e = 'Elegí la pared';
    else if (!['piso', 'piso2'].includes(p.nivel)) e = 'Elegí el piso';
    else if (!entre(p.distancia, 0, 100)) e = 'Distancia de 0 a 100 m';
    else if (!entre(p.altura, -3, 10)) e = 'Altura de -3 a 10 m';
    else if (!entre(p.adentro, 0, 50)) e = 'Hacia adentro: de 0 a 50 m';
    if (e) errores[`instalaciones.puntos.${i}`] = e;
  });
  inst.tramos.forEach((t, i) => {
    let e = null;
    const punta = (id) => id === null || inst.puntos.some((p) => p.id === id && p.sistema === t.sistema);
    if (!MATERIALES_TRAMO[t?.sistema]?.[t.material]) e = 'Material desconocido';
    else if (!punta(t.desde) || !punta(t.hasta)) e = 'Cada punta tiene que ser un punto del mismo sistema';
    else if (t.desde !== null && t.desde === t.hasta) e = 'Las dos puntas son el mismo punto';
    else if (!entre(t.alturaRecorrido, -3, 10)) e = 'Altura del recorrido de -3 a 10 m';
    else if (!entre(t.largoExtra, 0, 500)) e = 'Largo extra de 0 a 500 m';
    else if (t.sistema === 'electrica' && !SECCIONES_CABLE.includes(t.seccion)) e = 'Sección de cable inválida';
    if (e) errores[`instalaciones.tramos.${i}`] = e;
  });
  if (Object.values(inst.precios).some((v) => !entre(v, 0, 1e10))) errores['instalaciones.precios'] = 'Los precios no pueden ser negativos';
  return errores;
}

export function completarInstalaciones(inst) {
  const base = inst && typeof inst === 'object' ? inst : {};
  return {
    puntos: Array.isArray(base.puntos) ? base.puntos : [],
    tramos: Array.isArray(base.tramos) ? base.tramos : [],
    precios: base.precios && typeof base.precios === 'object' ? base.precios : {},
  };
}
