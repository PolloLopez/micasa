// ==========================================================
// ESCALERA
// ----------------------------------------------------------
// Escalera recta, en L, en U o de 3/4 de vuelta que llega al BORDE
// LIBRE del entrepiso.
// Estructura: zanca central por tramo, apoyos de escalón (ángulos o
// recorte de caño), columnas bajo la zanca y bajo el descanso, y
// escalones de madera.
//
// Cómo se ubica:
//   - `bajaHacia`: pared hacia la que baja el primer tramo (mirando
//     desde arriba). La de enfrente del entrepiso => baja perpendicular
//     al borde; una de los costados => baja paralela al borde.
//   - `posicion`: dónde está el escalón de arriba, medido sobre el borde
//     del entrepiso desde su extremo inicial.
//   - Con descansos (L = 1, U = 2, 3/4 de vuelta = 3): `descansos`
//     dice en qué contrahuella (contando desde abajo) va cada descanso,
//     y `giroHacia` la pared hacia la que baja el segundo tramo. Los
//     giros siguientes siguen en el MISMO sentido (como un caracol),
//     cada uno de 90° y con un descanso plano de ancho x ancho.
//
// Escalones: con la altura total y la contrahuella objetivo se elige la
// cantidad de contrahuellas (n) para que TODAS sean iguales. Hay n - 1
// pisadas: la última "pisada" es el piso del entrepiso.
// ==========================================================

import { ALTURA_PISO_2 } from './constantes.js';
import { pieza, haciaAdentro } from './segmentos.js';

// Espesor desde el eje de la estructura del entrepiso hasta el piso terminado.
export const ESPESOR_PISO_2 = 0.08;
const BAJO_ZANCA = 0.1; // la zanca va 10 cm debajo de la línea de los escalones
const BAJO_APOYO = 0.03; // los apoyos van justo debajo de la madera
const BAJO_DESCANSO = 0.06; // marco del descanso, debajo de la madera
const TOLERANCIA = 0.01;

// Rangos de la regla de comodidad (2 contrahuellas + 1 huella).
export const BLONDEL = { min: 0.6, max: 0.65 };

/** Escalera de ejemplo (la que trae el loft). */
export const ESCALERA_INICIAL = {
  activa: true,
  forma: 'recta', // 'recta' | 'L' | 'U' | '3/4'
  bajaHacia: 'A',
  posicion: 0.6,
  ancho: 0.8,
  huella: 0.27,
  contrahuellaObjetivo: 0.18,
  alturaTotal: 0, // 0 = automática (piso 2 + espesor del piso)
  descansos: [6], // contrahuella (desde abajo) donde va cada descanso; se usan tantos como pida la forma
  giroHacia: 'B',
  tipoApoyo: 'angulos', // 'angulos' | 'cano'
  apoyosPorEscalon: 2,
  largoApoyo: 0.76,
  apoyosIntermedios: 1, // columnas bajo la zanca, por tramo
  columnasDescanso: 1, // 1 central, 2 o 4
};

/** Cantidad de descansos de cada forma. */
export const DESCANSOS_POR_FORMA = { recta: 0, L: 1, U: 2, '3/4': 3 };

/** Altura de paso libre mínima bajo un tramo que pasa por arriba (2 m). */
export const PASO_LIBRE = 2;

/**
 * Descansos repartidos parejo para una forma (ej. 13 contrahuellas en U => [4, 9]).
 * Cada tramo queda con al menos 2 contrahuellas.
 */
export function repartirDescansos(cantidadDescansos, contrahuellas) {
  const tramos = cantidadDescansos + 1;
  return Array.from({ length: cantidadDescansos }, (_, i) =>
    Math.min(contrahuellas - 2 * (cantidadDescansos - i), Math.max(2 * (i + 1), Math.round((contrahuellas * (i + 1)) / tramos))));
}

/** Altura que tiene que salvar la escalera. */
export function alturaEscalera(escalera) {
  return escalera.alturaTotal > 0 ? escalera.alturaTotal : ALTURA_PISO_2 + ESPESOR_PISO_2;
}

/**
 * Cantidad y medida de los escalones.
 * @returns {{ contrahuellas, contrahuella, huella, pisadas, alturaTotal, blondel }}
 */
export function calcularEscalones(escalera) {
  const alturaTotal = alturaEscalera(escalera);
  const contrahuellas = Math.max(2, Math.round(alturaTotal / escalera.contrahuellaObjetivo));
  const contrahuella = alturaTotal / contrahuellas;
  return {
    contrahuellas,
    contrahuella,
    huella: escalera.huella,
    pisadas: contrahuellas - 1,
    alturaTotal,
    blondel: 2 * contrahuella + escalera.huella,
  };
}

// ---------------- Vectores en planta (x, z) ----------------

const sumar = (p, d, k) => [p[0] + d[0] * k, p[1] + d[1] * k];
const lateral = (f) => [-f[1], f[0]]; // perpendicular en planta
/** Dirección (en planta) hacia una pared: su normal hacia afuera. */
const dirHacia = (lados, lado) => {
  const adentro = haciaAdentro(lados[lado]);
  return [-adentro[0], -adentro[1]];
};
const esParalela = (a, b) => Math.abs(a[0] * b[1] - a[1] * b[0]) < 1e-9;

/** Borde libre del entrepiso: punto de inicio, dirección y largo. */
export function bordeEntrepiso(entrepiso) {
  return {
    inicio: sumar(entrepiso.origen, entrepiso.v, entrepiso.largoV),
    u: entrepiso.u,
    v: entrepiso.v, // del entrepiso hacia el ambiente
    largo: entrepiso.largoU,
  };
}

/** ¿Baja perpendicular al borde (hacia la pared de enfrente)? */
export function bajaPerpendicular(lados, entrepiso, bajaHacia) {
  return esParalela(dirHacia(lados, bajaHacia), entrepiso.v);
}

// ---------------- Generador ----------------

/**
 * Arma la escalera. Precondición: params validados y entrepiso existente.
 * @returns {{ piezas, escalones, descansos, resumen }}
 */
export function generarEscalera(params, lados, entrepiso) {
  const esc = params.escalera;
  const datos = calcularEscalones(esc);
  const { contrahuellas: n, contrahuella: C, huella: h } = datos;
  const y0 = params.elevacion;
  const borde = bordeEntrepiso(entrepiso);
  const f1 = dirHacia(lados, esc.bajaHacia);
  const perpendicular = esParalela(f1, borde.v);

  // Punto de arriba de la línea central (donde está la última contrahuella).
  const arriba = perpendicular
    ? sumar(borde.inicio, borde.u, esc.posicion)
    : sumar(sumar(borde.inicio, borde.u, esc.posicion), borde.v, esc.ancho / 2);

  const piezas = [];
  const escalones = [];
  const huellasEnPlanta = []; // rectángulos ocupados (para ver si entra)
  const p3 = (p, y) => [p[0], y, p[1]];
  const grupos = ['escalera'];

  /** Un tramo: pisadas `desde`..`hasta` (alturas), bajando desde `tope` en dirección `f`. */
  const tramo = (numero, tope, f, desde, hasta) => {
    const w = lateral(f);
    const ultima = hasta; // contrahuella que llega a `tope`
    for (let j = desde; j <= hasta - 1; j++) {
      const distanciaCentro = (ultima - j - 0.5) * h;
      const centro = sumar(tope, f, distanciaCentro);
      const yPisada = y0 + j * C;
      escalones.push({ id: `esc-escalon:${j}`, centro: p3(centro, yPisada), direccion: f, ancho: esc.ancho, huella: h });
      huellasEnPlanta.push({ centro, f, largo: h, ancho: esc.ancho, y: yPisada });
      // Apoyos del escalón: atraviesan el ancho.
      const posiciones = esc.apoyosPorEscalon === 1 ? [0] : esc.apoyosPorEscalon === 2 ? [-h / 4, h / 4] : [-h / 3, 0, h / 3];
      posiciones.forEach((desplazamiento, k) => {
        const c = sumar(centro, f, desplazamiento);
        const y = yPisada - BAJO_APOYO;
        piezas.push(pieza(`esc-apoyo:${j}:${k}`, 'apoyo-escalon', grupos,
          p3(sumar(c, w, -esc.largoApoyo / 2), y), p3(sumar(c, w, esc.largoApoyo / 2), y)));
      });
    }
    // Zanca central: del pie del tramo a la contrahuella de arriba.
    const corrida = (hasta - desde) * h;
    const pie = sumar(tope, f, corrida);
    const yPie = y0 + (desde - 1) * C;
    const yTope = y0 + hasta * C - BAJO_ZANCA;
    const zanca = pieza(`esc-zanca:${numero}`, 'zanca', grupos, p3(pie, yPie), p3(tope, yTope));
    piezas.push(zanca);
    // Columnas intermedias bajo la zanca, repartidas parejo.
    for (let i = 1; i <= esc.apoyosIntermedios; i++) {
      const t = i / (esc.apoyosIntermedios + 1);
      const punto = sumar(pie, f, -corrida * t);
      const y = yPie + (yTope - yPie) * t;
      if (y - y0 > 0.05) piezas.push(pieza(`esc-col-zanca:${numero}:${i}`, 'columna-escalera', grupos, p3(punto, y0), p3(punto, y)));
    }
    return { pie, corrida };
  };

  /** Descanso nº d: marco perimetral, columnas y piso de madera. */
  const armarDescanso = (d, centro, f, yDescanso) => {
    const w = lateral(f);
    const esquina = (a, b) => sumar(sumar(centro, f, a * esc.ancho / 2), w, b * esc.ancho / 2);
    const esquinas = [esquina(-1, -1), esquina(1, -1), esquina(1, 1), esquina(-1, 1)];
    const yMarco = yDescanso - BAJO_DESCANSO;
    esquinas.forEach((e, i) => {
      piezas.push(pieza(`esc-marco-descanso:${d}:${i}`, 'marco-descanso', grupos, p3(e, yMarco), p3(esquinas[(i + 1) % 4], yMarco)));
    });
    // 1 = al centro; 2 = del lado de afuera (el más alejado del tramo de arriba); 4 = esquinas.
    const columnas = esc.columnasDescanso === 1 ? [centro]
      : esc.columnasDescanso === 2 ? [esquina(1, -1), esquina(1, 1)] : esquinas;
    columnas.forEach((p, i) => piezas.push(pieza(`esc-col-descanso:${d}:${i}`, 'columna-escalera', grupos, p3(p, y0), p3(p, yMarco))));
    huellasEnPlanta.push({ centro, f, largo: esc.ancho, ancho: esc.ancho, y: yDescanso });
    return { numero: d, centro: p3(centro, yDescanso), direccion: f, lado: esc.ancho, superficie: esc.ancho * esc.ancho };
  };

  // Tramos de arriba hacia abajo: tope = descanso más alto, luego los demás.
  const k = DESCANSOS_POR_FORMA[esc.forma];
  const marcas = esc.descansos.slice(0, k); // contrahuellas (desde abajo) de cada descanso, en orden creciente
  const descansos = [];
  if (k > 0) {
    // Sentido del giro: el primero lo define `giroHacia`; los demás giran igual (caracol).
    const f2 = dirHacia(lados, esc.giroHacia);
    const sentido = Math.abs(f2[0] - lateral(f1)[0]) < 1e-9 && Math.abs(f2[1] - lateral(f1)[1]) < 1e-9 ? 1 : -1;
    const girar = (f) => [sentido * lateral(f)[0], sentido * lateral(f)[1]];

    let tope = arriba;
    let f = f1;
    let hasta = n;
    for (let d = k; d >= 1; d--) {
      const m = marcas[d - 1];
      // Tramo d + 1: pisadas m+1 .. hasta-1, baja desde `tope` en dirección f.
      const { pie } = tramo(d + 1, tope, f, m + 1, hasta);
      // Descanso d: cuadrado del ancho de la escalera, a la altura m·C, a continuación del tramo.
      const centro = sumar(pie, f, esc.ancho / 2);
      const yDescanso = y0 + m * C;
      descansos.unshift(armarDescanso(d, centro, f, yDescanso));
      // Gira 90° y el tramo de abajo arranca en el borde del descanso.
      f = girar(f);
      tope = sumar(centro, f, esc.ancho / 2);
      hasta = m;
    }
    tramo(1, tope, f, 1, hasta);
  } else {
    tramo(1, arriba, f1, 1, n);
  }

  return {
    piezas,
    escalones,
    descansos,
    resumen: { ...datos, perpendicular, avisos: avisosEscalera(params, datos, huellasEnPlanta, entrepiso) },
  };
}

// ---------------- Avisos (no bloquean: informan) ----------------

/** Esquinas de un rectángulo en planta (centro, dirección f, largo sobre f, ancho). */
function esquinasRect({ centro, f, largo, ancho }) {
  const w = lateral(f);
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => sumar(sumar(centro, f, a * largo / 2), w, b * ancho / 2));
}

/** Caja en planta (x, z) de un rectángulo. Los tramos siempre van paralelos a las paredes. */
function cajaEnPlanta(rect) {
  const esquinas = esquinasRect(rect);
  const xs = esquinas.map((p) => p[0]);
  const zs = esquinas.map((p) => p[1]);
  return { x1: Math.min(...xs), x2: Math.max(...xs), z1: Math.min(...zs), z2: Math.max(...zs) };
}

/**
 * Menor altura libre entre una pisada (o descanso) y otra que le pasa por
 * arriba en planta. null si ninguna se superpone.
 */
export function pasoLibreMinimo(rectangulos) {
  const cajas = rectangulos.map((r) => ({ ...cajaEnPlanta(r), y: r.y }));
  const seSuperponen = (a, b) =>
    a.x1 < b.x2 - TOLERANCIA && b.x1 < a.x2 - TOLERANCIA && a.z1 < b.z2 - TOLERANCIA && b.z1 < a.z2 - TOLERANCIA;
  let menor = null;
  cajas.forEach((a, i) => cajas.forEach((b, j) => {
    if (i === j || b.y <= a.y || !seSuperponen(a, b)) return;
    const paso = b.y - a.y;
    if (menor === null || paso < menor) menor = paso;
  }));
  return menor;
}

function avisosEscalera(params, datos, rectangulos, entrepiso) {
  const avisos = [];
  const { blondel, contrahuella, huella } = datos;
  if (blondel < BLONDEL.min - 1e-9 || blondel > BLONDEL.max + 1e-9) {
    avisos.push(`Regla de comodidad: 2 contrahuellas + huella = ${(blondel * 100).toFixed(1)} cm (lo cómodo es entre 60 y 65 cm).`);
  }
  if (contrahuella > 0.2) avisos.push(`Contrahuella alta: ${(contrahuella * 100).toFixed(1)} cm (más de 20 cm cansa).`);
  if (huella < 0.25) avisos.push(`Huella corta: ${(huella * 100).toFixed(0)} cm (menos de 25 cm no entra el pie entero).`);

  const x = params.largo / 2;
  const z = params.ancho / 2;
  const puntos = rectangulos.flatMap(esquinasRect);
  if (puntos.some(([px, pz]) => Math.abs(px) > x + TOLERANCIA || Math.abs(pz) > z + TOLERANCIA)) {
    avisos.push('La escalera se sale de la planta: corré la posición, cambiá hacia dónde baja o usá forma en L.');
  }
  // Paso libre bajo el entrepiso: una pisada o descanso que queda debajo del entrepiso
  // (pasa en U o 3/4 de vuelta) necesita 2 m hasta la estructura del piso 2.
  const { origen, u, v, largoU, largoV } = entrepiso;
  const adentroDelEntrepiso = ([px, pz]) => {
    const dx = px - origen[0];
    const dz = pz - origen[1];
    const a = dx * u[0] + dz * u[1];
    const b = dx * v[0] + dz * v[1];
    return a > TOLERANCIA && a < largoU - TOLERANCIA && b > TOLERANCIA && b < largoV - TOLERANCIA;
  };
  const debajo = rectangulos.filter((r) => esquinasRect(r).some(adentroDelEntrepiso));
  if (debajo.length > 0) {
    const paso = entrepiso.y - Math.max(...debajo.map((r) => r.y));
    if (paso < PASO_LIBRE - 1e-9) {
      avisos.push(`Paso libre bajo el entrepiso de ${Math.max(paso, 0).toFixed(2)} m (lo mínimo es ${PASO_LIBRE.toFixed(2)} m): `
        + 'cambiá hacia dónde baja, dónde van los descansos o usá otra forma.');
    }
  }
  // Paso libre entre tramos: en U o 3/4 un tramo de abajo puede pasar por debajo de uno de arriba.
  const menorPaso = pasoLibreMinimo(rectangulos);
  if (menorPaso !== null && menorPaso < PASO_LIBRE - 1e-9) {
    avisos.push(`Paso libre de ${menorPaso.toFixed(2)} m: un tramo pasa por debajo de otro (lo mínimo es ${PASO_LIBRE.toFixed(2)} m). Cambiá dónde van los descansos o el ancho.`);
  }
  return avisos;
}
