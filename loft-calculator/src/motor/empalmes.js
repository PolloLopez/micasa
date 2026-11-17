// ==========================================================
// EMPALMES (v1.68)
// ----------------------------------------------------------
// Pedido de Leandro: "mejorar los cortes de las tiras de fierro", con
// "empalmes inteligentes". Una pieza más larga que la barra (ej. una
// correa de 7,50 m con barras de 6 m) va en tramos soldados. Antes se
// partía siempre en barra entera + el resto, y la unión caía donde caía.
// Ahora:
//   1. La unión va SOBRE UN APOYO: donde la pieza cruza otra (una viga,
//      un transversal, una columna), así la soldadura queda apoyada.
//   2. Se prueban dos formas (tramo largo primero o tramos parejos) y el
//      optimizador se queda con la que gasta menos barras (ver
//      optimizadorCortes.js): el tramo corto puede salir de un retazo.
// ==========================================================

const TOLERANCIA_APOYO = 0.12; // m: dos ejes a menos de esto se tocan (perfiles de 8-10 cm)
const PUNTA = 0.05; // m: un apoyo en la punta no sirve para empalmar

const resta = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const punto = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/**
 * Dónde cruza `p` a las otras piezas (sus apoyos posibles para un empalme), en m desde `p.desde`.
 * Solo cruces de verdad: la otra pieza no es paralela y sus ejes pasan a menos de TOLERANCIA_APOYO.
 * @param todas  todas las piezas de la estructura
 * @returns {number[]} posiciones ordenadas (al cm), sin las puntas
 */
export function apoyosDePieza(p, todas) {
  const d = resta(p.hasta, p.desde);
  const L = Math.hypot(...d);
  if (!(L > 0)) return [];
  const u = d.map((c) => c / L);
  const posiciones = new Set();
  todas.forEach((q) => {
    if (q.id === p.id || !q.desde || !q.hasta) return;
    const e = resta(q.hasta, q.desde);
    const M = Math.hypot(...e);
    if (!(M > 0)) return;
    const v = e.map((c) => c / M);
    const coseno = punto(u, v);
    if (Math.abs(coseno) > 0.5) return; // casi paralelas: no es un apoyo
    // Puntos más cercanos entre las dos rectas (s sobre p, t sobre q).
    const w = resta(p.desde, q.desde);
    const a = 1;
    const b = coseno;
    const c = 1;
    const dd = punto(u, w);
    const ee = punto(v, w);
    const den = a * c - b * b;
    const s = (b * ee - c * dd) / den;
    const t = (a * ee - b * dd) / den;
    if (s < PUNTA || s > L - PUNTA || t < -TOLERANCIA_APOYO || t > M + TOLERANCIA_APOYO) return;
    const enP = p.desde.map((x, i) => x + u[i] * s);
    const enQ = q.desde.map((x, i) => x + v[i] * t);
    if (Math.hypot(...resta(enP, enQ)) > TOLERANCIA_APOYO) return;
    posiciones.add(Math.round(s * 100) / 100);
  });
  return [...posiciones].sort((x, y) => x - y);
}

/**
 * Cómo partir una pieza de largo L en tramos de hasta `barra`, con las uniones sobre apoyos.
 * @param estrategia 'largo': cada tramo lo más largo posible (el corto al final);
 *                   'parejo': la menor cantidad de tramos y lo más parecidos entre sí
 * @returns {{ tramos: number[], sobreApoyo: boolean }} sobreApoyo = false si alguna unión no encontró apoyo
 */
export function tramosDeEmpalme(L, barra, apoyos = [], estrategia = 'largo') {
  const EPS = 1e-6;
  if (L <= barra + EPS) return { tramos: [L], sobreApoyo: true };
  const cortes = [0, ...apoyos.filter((x) => x > EPS && x < L - EPS), L];
  // Mínima cantidad de tramos posible usando solo apoyos (camino más corto; si no hay, null).
  const n = cortes.length;
  const pasos = new Array(n).fill(Infinity);
  const previo = new Array(n).fill(-1);
  const peor = new Array(n).fill(Infinity); // el tramo más largo del camino (para 'parejo': cuanto más chico, más parejo)
  pasos[0] = 0;
  peor[0] = 0;
  for (let j = 1; j < n; j++) {
    for (let i = 0; i < j; i++) {
      const largo = cortes[j] - cortes[i];
      if (largo > barra + EPS || pasos[i] === Infinity) continue;
      const k = pasos[i] + 1;
      // 'largo': entre caminos de igual cantidad, el que hace el tramo de antes lo más largo posible (i más chico).
      const pk = estrategia === 'parejo' ? Math.max(peor[i], largo) : 0;
      if (k < pasos[j] || (k === pasos[j] && (estrategia === 'parejo' ? pk < peor[j] - EPS : false))) {
        pasos[j] = k;
        previo[j] = i;
        peor[j] = pk;
      }
    }
  }
  if (pasos[n - 1] === Infinity) {
    // Algún tramo entre apoyos es más largo que la barra: como antes, barra entera + el resto (sin apoyo).
    const tramos = [];
    let resta2 = L;
    while (resta2 > barra + EPS) { tramos.push(barra); resta2 -= barra; }
    tramos.push(Number(resta2.toFixed(4)));
    return { tramos, sobreApoyo: false };
  }
  if (estrategia === 'largo') {
    // Desde la punta: el apoyo más lejano que entra en la barra, sin pasarse de la cantidad mínima de tramos.
    const tramos = [];
    let i = 0;
    let quedan = pasos[n - 1];
    while (i < n - 1) {
      let elegido = -1;
      for (let j = n - 1; j > i; j--) {
        if (cortes[j] - cortes[i] > barra + EPS) continue;
        // ¿Desde j se llega al final con los tramos que quedan?
        if (llegaEn(cortes, j, barra, quedan - 1)) { elegido = j; break; }
      }
      tramos.push(Number((cortes[elegido] - cortes[i]).toFixed(4)));
      i = elegido;
      quedan--;
    }
    return { tramos, sobreApoyo: true };
  }
  const indices = [];
  for (let j = n - 1; j > 0; j = previo[j]) indices.unshift(j);
  let desde = 0;
  const tramos = indices.map((j) => { const t = Number((cortes[j] - cortes[desde]).toFixed(4)); desde = j; return t; });
  return { tramos, sobreApoyo: true };
}

/** ¿Desde el corte `i` se llega al final en `k` tramos o menos? */
function llegaEn(cortes, i, barra, k) {
  const n = cortes.length;
  if (i === n - 1) return k >= 0;
  if (k <= 0) return false;
  let alcanzo = i;
  for (let paso = 0; paso < k; paso++) {
    let lejos = alcanzo;
    for (let j = alcanzo + 1; j < n && cortes[j] - cortes[alcanzo] <= barra + 1e-6; j++) lejos = j;
    if (lejos === alcanzo) return false;
    alcanzo = lejos;
    if (alcanzo === n - 1) return true;
  }
  return false;
}

/**
 * v1.68: las formas posibles de empalmar una pieza con las uniones sobre apoyos, para que el optimizador elija la
 * que mejor acomoda los tramos en las barras (y en los retazos). La primera es la de "tramo largo primero".
 * Solo las de menos tramos (más uniones = más soldadura). Como mucho `maximo`.
 * @returns {{ tramos: number[], sobreApoyo: boolean }[]}
 */
export function opcionesDeEmpalme(L, barra, apoyos = [], maximo = 8) {
  const primera = tramosDeEmpalme(L, barra, apoyos, 'largo');
  if (!primera.sobreApoyo) return [primera];
  const cortes = [0, ...apoyos.filter((x) => x > 1e-6 && x < L - 1e-6), L];
  const n = cortes.length;
  const cuantos = primera.tramos.length;
  const opciones = [];
  const vistas = new Set([primera.tramos.join('|')]);
  const buscar = (i, camino) => {
    if (opciones.length >= maximo - 1) return;
    if (i === n - 1) {
      const clave = camino.join('|');
      if (!vistas.has(clave)) { vistas.add(clave); opciones.push({ tramos: camino, sobreApoyo: true }); }
      return;
    }
    if (camino.length >= cuantos) return;
    for (let j = n - 1; j > i; j--) {
      const largo = cortes[j] - cortes[i];
      if (largo > barra + 1e-6) continue;
      buscar(j, [...camino, Number(largo.toFixed(4))]);
    }
  };
  buscar(0, []);
  return [primera, ...opciones];
}
