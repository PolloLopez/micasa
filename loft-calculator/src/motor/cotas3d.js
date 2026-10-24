// ==========================================================
// COTAS GENERALES DEL 3D (v1.28)
// ----------------------------------------------------------
// Las medidas grandes de la obra dibujadas en el 3D (y en el PDF):
//   - el largo del frente y el largo del lateral derecho, en el suelo,
//     un poco afuera de la pared;
//   - el alto de las paredes en las esquinas del frente y en la esquina
//     del fondo del lateral derecho (con techo inclinado salen distintas);
//   - la elevación del piso sobre el terreno.
// Solo geometría (puntos y textos); LoftCanvas las dibuja con Three.js.
// ==========================================================

import { LADOS } from './constantes.js';
import { geometriaLados, alturasPared } from './geometria.js';

const SEPARACION = 2; // m: cuánto afuera de la pared va la cota (más que los carteles de los lados, a 1.3 m)
const TIC = 0.15; // m: largo de las rayitas de las puntas

const f2 = (n) => `${n.toFixed(2)} m`;
const mas = (a, b) => a.map((v, i) => v + b[i]);
const por = (v, k) => v.map((c) => c * k);

/**
 * @returns {{ desde: number[], hasta: number[], texto: string, ticks: [number[], number[]][] }[]}
 *   cada cota con sus dos puntas (x, y, z), el texto y las rayitas de las puntas
 */
export function cotasGenerales(params) {
  const lados = geometriaLados(params);
  const frente = params.ladoFrente;
  const derecho = LADOS[(LADOS.indexOf(frente) + 1) % 4];
  const y0 = params.elevacion;
  const cotas = [];

  // Una cota horizontal en el suelo, paralela al lado y corrida hacia afuera.
  const horizontal = (lado) => {
    const geo = lados[lado];
    const afuera = [-geo.direccion[1], 0, geo.direccion[0]]; // en 3D: (x, y, z)
    const corrida = por(afuera, SEPARACION);
    const desde = mas([geo.p1[0], 0.02, geo.p1[1]], corrida);
    const hasta = mas([geo.p2[0], 0.02, geo.p2[1]], corrida);
    const tic = por(afuera, TIC);
    cotas.push({
      desde, hasta, texto: f2(geo.largo),
      ticks: [[mas(desde, por(tic, -1)), mas(desde, tic)], [mas(hasta, por(tic, -1)), mas(hasta, tic)]],
    });
  };
  horizontal(frente);
  horizontal(derecho);

  // Altos de pared (desde el piso del loft hasta la solera), en una esquina, corridos hacia afuera.
  const vertical = (lado, punta) => {
    const geo = lados[lado];
    const alto = alturasPared(geo, params)[punta === 'p1' ? 0 : 1];
    const afuera = [-geo.direccion[1], 0, geo.direccion[0]];
    const [x, z] = geo[punta];
    const base = mas([x, y0, z], por(afuera, 0.6));
    const tope = mas(base, [0, alto, 0]);
    const tic = por(afuera, TIC);
    cotas.push({
      desde: base, hasta: tope, texto: f2(alto),
      ticks: [[mas(base, por(tic, -1)), mas(base, tic)], [mas(tope, por(tic, -1)), mas(tope, tic)]],
    });
  };
  vertical(frente, 'p1');
  vertical(frente, 'p2');
  vertical(derecho, 'p2'); // la esquina del fondo, del lado derecho

  // Elevación del piso sobre el terreno (si hay).
  if (y0 > 0.005) {
    const geo = lados[frente];
    const afuera = [-geo.direccion[1], 0, geo.direccion[0]];
    const base = mas([geo.p1[0], 0, geo.p1[1]], por(afuera, 0.6));
    const tic = por(afuera, TIC);
    const tope = mas(base, [0, y0, 0]);
    cotas.push({
      desde: base, hasta: tope, texto: `elev. ${f2(y0)}`,
      ticks: [[mas(base, por(tic, -1)), mas(base, tic)]],
    });
  }
  return cotas;
}
