// ==========================================================
// ESCALERA
// ----------------------------------------------------------
// Escalera recta o en L que llega al BORDE LIBRE del entrepiso.
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
//   - En L: `escalonesHastaDescanso` (contrahuellas debajo del descanso)
//     y `giroHacia` (pared hacia la que baja el segundo tramo).
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
  forma: 'recta', // 'recta' | 'L'
  bajaHacia: 'A',
  posicion: 0.6,
  ancho: 0.8,
  huella: 0.27,
  contrahuellaObjetivo: 0.18,
  alturaTotal: 0, // 0 = automática (piso 2 + espesor del piso)
  escalonesHastaDescanso: 6,
  giroHacia: 'B',
  tipoApoyo: 'angulos', // 'angulos' | 'cano'
  apoyosPorEscalon: 2,
  largoApoyo: 0.76,
  apoyosIntermedios: 1, // columnas bajo la zanca, por tramo
  columnasDescanso: 1, // 1 central, 2 o 4
};

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
 * @returns {{ piezas, escalones, descanso, resumen }}
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
      huellasEnPlanta.push({ centro, f, largo: h, ancho: esc.ancho });
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

  let descanso = null;
  if (esc.forma === 'L') {
    const m = esc.escalonesHastaDescanso;
    const f2 = dirHacia(lados, esc.giroHacia);
    // Tramo de arriba: pisadas m+1 .. n-1.
    const { pie: bordeDescanso, corrida: corridaArriba } = tramo(2, arriba, f1, m + 1, n);
    // Descanso cuadrado, del ancho de la escalera, a la altura m·C.
    const centroDescanso = sumar(bordeDescanso, f1, esc.ancho / 2);
    const yDescanso = y0 + m * C;
    const w1 = lateral(f1);
    const esquina = (a, b) => sumar(sumar(centroDescanso, f1, a * esc.ancho / 2), w1, b * esc.ancho / 2);
    const esquinas = [esquina(-1, -1), esquina(1, -1), esquina(1, 1), esquina(-1, 1)];
    const yMarco = yDescanso - BAJO_DESCANSO;
    esquinas.forEach((e, i) => {
      piezas.push(pieza(`esc-marco-descanso:${i}`, 'marco-descanso', grupos, p3(e, yMarco), p3(esquinas[(i + 1) % 4], yMarco)));
    });
    const apoyosDescanso = esc.columnasDescanso === 1 ? [centroDescanso]
      : esc.columnasDescanso === 2 ? [esquina(1, -1), esquina(1, 1)] : esquinas;
    apoyosDescanso.forEach((p, i) => piezas.push(pieza(`esc-col-descanso:${i}`, 'columna-escalera', grupos, p3(p, y0), p3(p, yMarco))));
    huellasEnPlanta.push({ centro: centroDescanso, f: f1, largo: esc.ancho, ancho: esc.ancho });
    descanso = { centro: p3(centroDescanso, yDescanso), direccion: f1, lado: esc.ancho, superficie: esc.ancho * esc.ancho };
    // Tramo de abajo: arranca en el borde del descanso hacia `giroHacia`; pisadas 1 .. m-1.
    const topeAbajo = sumar(centroDescanso, f2, esc.ancho / 2);
    tramo(1, topeAbajo, f2, 1, m);
    datos.corridaArriba = corridaArriba;
  } else {
    tramo(1, arriba, f1, 1, n);
  }

  return {
    piezas,
    escalones,
    descanso,
    resumen: { ...datos, perpendicular, avisos: avisosEscalera(params, datos, huellasEnPlanta, entrepiso) },
  };
}

// ---------------- Avisos (no bloquean: informan) ----------------

/** Esquinas de un rectángulo en planta (centro, dirección f, largo sobre f, ancho). */
function esquinasRect({ centro, f, largo, ancho }) {
  const w = lateral(f);
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => sumar(sumar(centro, f, a * largo / 2), w, b * ancho / 2));
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
  // ¿Invade el entrepiso? (algún punto claramente del lado del entrepiso)
  const { origen, u, v, largoU, largoV } = entrepiso;
  const adentroDelEntrepiso = ([px, pz]) => {
    const dx = px - origen[0];
    const dz = pz - origen[1];
    const a = dx * u[0] + dz * u[1];
    const b = dx * v[0] + dz * v[1];
    return a > TOLERANCIA && a < largoU - TOLERANCIA && b > TOLERANCIA && b < largoV - TOLERANCIA;
  };
  if (puntos.some(adentroDelEntrepiso)) {
    avisos.push('La escalera queda debajo del entrepiso: revisá hacia dónde baja.');
  }
  return avisos;
}
