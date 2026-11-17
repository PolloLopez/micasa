// ==========================================================
// OPTIMIZADOR DE CORTES 1D
// ----------------------------------------------------------
// Problema: tengo una lista de piezas (ej. 4,50 m, 4,50 m, 0,90 m...)
// y barras comerciales de largo fijo (ej. 6 m). ¿Cuántas barras compro?
//
// Algoritmo "First Fit Decreasing" (FFD = primer ajuste decreciente):
//   1. Ordeno las piezas de mayor a menor.
//   2. Cada pieza va a la primera barra donde entre.
//   3. Si no entra en ninguna, abro una barra nueva.
// No siempre da el óptimo matemático, pero queda muy cerca y es simple.
// ==========================================================

import { MERMA_POR_CORTE } from './constantes.js';
import { opcionesDeEmpalme } from './empalmes.js';

const TOLERANCIA = 1e-9; // evita errores de redondeo de punto flotante
/** v1.63: un sobrante desde este largo es un retazo que se guarda (no se cuenta como tirado). */
export const RETAZO_UTIL = 0.3;

/**
 * Divide una pieza más larga que la barra en tramos que sí entran.
 * Ej: correa de 7,50 m con barras de 6 m => [6, 1.5] (va empalmada).
 */
export function dividirPiezaLarga(largoPieza, largoBarra) {
  const tramos = [];
  let restante = largoPieza;
  while (restante > largoBarra + TOLERANCIA) {
    tramos.push(largoBarra);
    restante -= largoBarra;
  }
  if (restante > TOLERANCIA) tramos.push(Number(restante.toFixed(4)));
  return tramos;
}

/**
 * Calcula cuántas barras hacen falta y cómo cortar cada una.
 * @param {Array<number|{largo:number, origen:string}>} piezas - largos en metros; con `origen`
 *   (v1.19.1) se sabe de qué renglón es cada pieza cuando varios renglones comparten barras.
 *   Cada barra devuelve `piezas` (largos) y `origenes` (en el mismo orden; null si no se pasó).
 * @param {number} largoBarra - largo comercial de la barra en metros
 * @param {number} merma - material perdido por cada corte
 * @returns {{barras, totalBarras, metrosNetos, metrosDesperdicio, porcentajeDesperdicio, piezasEmpalmadas}}
 */
/**
 * v1.68: el tercer parámetro puede ser la merma (como antes) o las opciones del herrero:
 *   { merma: m que se lleva el disco por corte, retazoUtil: m desde los que un sobrante se guarda }
 * Cada pieza puede traer `id` (para numerarla en la hoja de corte y en el 3D) y `apoyos` (dónde cruza otras
 * piezas: si es más larga que la barra, el empalme va sobre uno de ellos, ver empalmes.js).
 * Cada barra devuelve además `ids` y `tramos` (en el mismo orden que `piezas`).
 */
export function optimizarCortes(piezas, largoBarra, opciones = MERMA_POR_CORTE) {
  const { merma = MERMA_POR_CORTE, retazoUtil = RETAZO_UTIL } = typeof opciones === 'number' ? { merma: opciones } : (opciones ?? {});
  const vacio = {
    barras: [],
    totalBarras: 0,
    metrosNetos: 0,
    metrosDesperdicio: 0,
    porcentajeDesperdicio: 0,
    piezasEmpalmadas: 0,
    retazos: [],
    metrosRetazos: 0,
    metrosTirados: 0,
    empalmes: [],
    retazoUtil,
  };
  if (!Array.isArray(piezas) || piezas.length === 0 || !(largoBarra > 0)) return vacio;

  // 0) Todo a la forma { largo, origen } (se aceptan números sueltos, como antes).
  const conOrigen = piezas.map((p) => (typeof p === 'number' ? { largo: p, origen: null } : { origen: null, ...p }));
  // v1.68: probar empalmes cuesta: el mismo pedido (ej. el presupuesto con cada proveedor) sale de la memoria.
  const clave = `${largoBarra}|${merma}|${retazoUtil}|${conOrigen.map((p) => `${p.largo}:${p.id ?? ''}:${p.origen ?? ''}:${(p.apoyos ?? []).join(',')}`).join(';')}`;
  if (MEMORIA.has(clave)) return MEMORIA.get(clave);
  const resultado = optimizarSinMemoria(conOrigen, largoBarra, merma, retazoUtil);
  MEMORIA.set(clave, resultado);
  if (MEMORIA.size > 200) MEMORIA.delete(MEMORIA.keys().next().value); // se olvida el más viejo
  return resultado;
}

const MEMORIA = new Map();

function optimizarSinMemoria(conOrigen, largoBarra, merma, retazoUtil) {
  // v1.68: cada pieza más larga que la barra con sus formas posibles de empalmar (uniones sobre apoyos, o como antes).
  const formas = conOrigen.map((p) => (p.largo > largoBarra + TOLERANCIA
    ? (p.apoyos?.length ? opcionesDeEmpalme(p.largo, largoBarra, p.apoyos) : [])
    : null));
  const conFormas = formas.map((f, i) => (f && f.length > 1 ? i : -1)).filter((i) => i >= 0);
  const eleccion = formas.map((f) => (f && f.length ? f[0] : null)); // de arranque: tramo largo primero
  const mejor = (a, b) => (b.totalBarras < a.totalBarras || (b.totalBarras === a.totalBarras && b.metrosTirados < a.metrosTirados - 1e-6) ? b : a);
  let res = resolver(conOrigen, largoBarra, merma, retazoUtil, eleccion);
  // Una pasada: a cada pieza larga se le prueban sus otras formas y queda la que gasta menos barras (y tira menos).
  // Se limita la cantidad de pruebas para no trabar la pantalla.
  let pruebas = 0;
  conFormas.forEach((i) => formas[i].slice(1).forEach((forma) => {
    if (pruebas++ > 40) return;
    const otra = eleccion.map((e, k) => (k === i ? forma : e));
    const r = resolver(conOrigen, largoBarra, merma, retazoUtil, otra);
    if (mejor(res, r) === r) { res = r; eleccion[i] = forma; }
  }));
  return res;
}

/** Una forma de empalmar las piezas largas (`eleccion[i]`: los tramos de la pieza i) y su mejor acomodo en barras. */
function resolver(conOrigen, largoBarra, merma, retazoUtil, eleccion) {

  // 1) Piezas más largas que la barra se parten en tramos (empalme); cada tramo conserva su origen.
  let piezasEmpalmadas = 0;
  const piezasCortables = [];
  const empalmes = [];
  conOrigen
    .forEach((p, indice) => {
      if (!(p.largo > 0)) return;
      if (p.largo > largoBarra + TOLERANCIA) {
        piezasEmpalmadas++;
        const { tramos, sobreApoyo } = eleccion[indice] ?? { tramos: dividirPiezaLarga(p.largo, largoBarra), sobreApoyo: false };
        empalmes.push({ id: p.id ?? null, origen: p.origen, largo: p.largo, tramos, sobreApoyo });
        tramos.forEach((tramo, k) => piezasCortables.push({ largo: tramo, origen: p.origen, id: p.id ?? null, tramo: { n: k + 1, de: tramos.length } }));
      } else {
        piezasCortables.push({ ...p, id: p.id ?? null, tramo: null });
      }
    });

  // 2) v1.63: se prueban dos formas de acomodar (primer ajuste y mejor ajuste, de la pieza más larga a la más corta),
  // después se intenta vaciar las barras menos usadas pasando sus piezas a los huecos de las otras, y se queda con
  // la que usa menos barras; si empatan, la que deja los sobrantes más largos (sirven como retazos, no se tiran).
  const ordenadas = [...piezasCortables].sort((a, b) => b.largo - a.largo);
  const entra = (b, pieza) => b.usado + (b.piezas.length ? merma : 0) + pieza <= largoBarra + TOLERANCIA;
  const poner = (b, { largo: pieza, origen, id = null, tramo = null }) => {
    b.usado += (b.piezas.length ? merma : 0) + pieza; // cada pieza adicional suma un corte (merma)
    b.piezas.push(pieza);
    b.origenes.push(origen);
    b.ids.push(id);
    b.tramos.push(tramo);
  };
  const acomodar = (elegir, orden = ordenadas) => {
    const lista = [];
    orden.forEach((p) => {
      const b = elegir(lista.filter((x) => entra(x, p.largo)));
      if (b) poner(b, p); else { const nueva = { piezas: [], origenes: [], ids: [], tramos: [], usado: 0 }; poner(nueva, p); lista.push(nueva); }
    });
    return lista;
  };
  const primerAjuste = acomodar((sirven) => sirven[0]);
  const mejorAjuste = acomodar((sirven) => sirven.reduce((m, b) => (!m || b.usado > m.usado ? b : m), null));
  /** Vaciar la barra menos usada repartiendo sus piezas (de la más larga) en las otras, mientras se pueda. */
  const compactar = (lista) => {
    const barrasC = lista.map((b) => ({ piezas: [...b.piezas], origenes: [...b.origenes], ids: [...b.ids], tramos: [...b.tramos], usado: b.usado }));
    for (let intento = 0; intento < barrasC.length; intento++) {
      const orden = [...barrasC].sort((a, b) => a.usado - b.usado);
      const victima = orden[0];
      const otras = barrasC.filter((b) => b !== victima).map((b) => ({ piezas: [...b.piezas], origenes: [...b.origenes], ids: [...b.ids], tramos: [...b.tramos], usado: b.usado }));
      const piezasV = victima.piezas.map((largo, k) => ({ largo, origen: victima.origenes[k], id: victima.ids[k], tramo: victima.tramos[k] })).sort((a, b) => b.largo - a.largo);
      const todas = piezasV.every((p) => {
        const destino = otras.filter((b) => entra(b, p.largo)).reduce((m, b) => (!m || b.usado > m.usado ? b : m), null);
        if (!destino) return false;
        poner(destino, p);
        return true;
      });
      if (!todas) break;
      barrasC.splice(0, barrasC.length, ...otras);
    }
    return barrasC;
  };
  /**
   * Una barra por vez: la pieza más larga que queda y, con lo que sobra, la combinación de piezas que más la llena
   * (suma de subconjuntos, al cm, redondeando para no pasarse). Encuentra arreglos que el primer ajuste no ve
   * (ej. barras de 10: 5+3+2 y 4+3+3, en vez de 5+4 / 3+3+3 / 2).
   */
  const llenarCadaBarra = () => {
    if (ordenadas.length > 400) return null; // con muchísimas piezas alcanza con las otras formas
    const quedan = [...ordenadas];
    const lista = [];
    while (quedan.length > 0) {
      const primera = quedan.shift();
      const b = { piezas: [], origenes: [], ids: [], tramos: [], usado: 0 };
      poner(b, primera);
      const lugar = Math.floor((largoBarra - b.usado) * 100 + 1e-6); // cm libres
      const costo = quedan.map((p) => Math.ceil((p.largo + merma) * 100 - 1e-6)); // cada pieza con su corte, al cm (hacia arriba)
      if (lugar > 0 && quedan.length > 0) {
        // alcanzable[c] = índice de la última pieza usada para llegar a c cm (o -1); de[c] = c anterior.
        const ultima = new Int32Array(lugar + 1).fill(-2);
        const de = new Int32Array(lugar + 1).fill(-1);
        ultima[0] = -1;
        costo.forEach((c, k) => {
          for (let x = lugar; x >= c; x--) if (ultima[x] === -2 && ultima[x - c] !== -2) { ultima[x] = k; de[x] = x - c; }
        });
        let mejor = lugar;
        while (mejor > 0 && ultima[mejor] === -2) mejor--;
        const elegidas = [];
        for (let x = mejor; x > 0; x = de[x]) elegidas.push(ultima[x]);
        elegidas.sort((x, y) => y - x).forEach((k) => {
          if (entra(b, quedan[k].largo)) { poner(b, quedan[k]); quedan.splice(k, 1); }
        });
      }
      lista.push(b);
    }
    return lista;
  };
  // Los sobrantes más largos primero (un sobrante grande es un retazo; muchos chicos, desperdicio).
  const puntaje = (lista) => lista.reduce((a, b) => a + (largoBarra - b.usado) ** 2, 0);
  const porBarra = llenarCadaBarra();
  const candidatas = [primerAjuste, mejorAjuste, compactar(primerAjuste), compactar(mejorAjuste), ...(porBarra ? [porBarra, compactar(porBarra)] : [])];
  // Varias veces más, con el orden apenas mezclado (siempre igual: la "semilla" es fija, así el resultado no cambia
  // de una vez a la otra). Con pocas piezas se prueba mucho; con muchas, menos (para no trabar la pantalla).
  const minimo = Math.ceil(piezasCortables.reduce((a, p) => a + p.largo, 0) / largoBarra - TOLERANCIA);
  let semilla = 12345;
  const azar = () => { semilla = (semilla * 1103515245 + 12345) % 2147483648; return semilla / 2147483648; };
  const vueltas = ordenadas.length <= 40 ? 120 : ordenadas.length <= 150 ? 40 : 8;
  let mejorHasta = Math.min(...candidatas.map((c) => c.length));
  for (let v = 0; v < vueltas && mejorHasta > minimo; v++) {
    const orden = [...ordenadas];
    for (let k = 0; k < orden.length - 1; k++) if (azar() < 0.35) [orden[k], orden[k + 1]] = [orden[k + 1], orden[k]];
    const prueba = acomodar((sirven) => sirven[0], orden);
    if (prueba.length < mejorHasta) { candidatas.push(prueba); mejorHasta = prueba.length; }
  }
  const barras = candidatas.reduce((m, c) => (!m || c.length < m.length || (c.length === m.length && puntaje(c) > puntaje(m)) ? c : m), null)
    .map((b, i) => ({ numero: i + 1, ...b }));

  // 3) Resumen.
  const metrosComprados = barras.length * largoBarra;
  const metrosNetos = piezasCortables.reduce((acc, p) => acc + p.largo, 0);
  const metrosDesperdicio = metrosComprados - metrosNetos;

  // v1.63: lo que sobra de cada barra: desde RETAZO_UTIL es un retazo que se guarda (sirve para otra cosa); lo más
  // corto, desperdicio. La merma de los cortes también es desperdicio.
  const sobrantes = barras.map((b) => Math.max(0, largoBarra - b.usado));
  const retazos = sobrantes.filter((x) => x >= retazoUtil - TOLERANCIA).map((x) => Number(x.toFixed(3))).sort((a, b) => b - a);
  const metrosRetazos = retazos.reduce((a, x) => a + x, 0);
  return {
    barras,
    totalBarras: barras.length,
    metrosNetos,
    metrosDesperdicio,
    porcentajeDesperdicio: metrosComprados > 0 ? (metrosDesperdicio / metrosComprados) * 100 : 0,
    piezasEmpalmadas,
    retazos, // largos de los sobrantes que sirven
    metrosRetazos,
    metrosTirados: Math.max(0, metrosDesperdicio - metrosRetazos), // lo que de verdad se tira
    empalmes, // v1.68: cada pieza empalmada, en qué tramos y si las uniones caen sobre un apoyo
    retazoUtil,
  };
}
