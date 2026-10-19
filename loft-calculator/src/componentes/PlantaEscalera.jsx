// ==========================================================
// PlantaEscalera (v1.16): la escalera vista DESDE ARRIBA, dentro de
// su tarjeta, para entender de un vistazo dónde arranca (escalón 1,
// el más bajo) y dónde llega (el más alto, en el borde del entrepiso).
// Dibuja la planta, el entrepiso, cada escalón y los descansos con un
// SVG simple (sin librerías): x = largo de la planta, z = ancho.
// El frente elegido queda ABAJO del dibujo, como si estuvieras parado
// frente a la casa mirando el plano.
// ==========================================================

import { LADOS } from '../motor/constantes.js';
import { nombreLado } from '../motor/geometria.js';

const MARGEN = 0.9; // m alrededor de la planta (para los nombres de las paredes)

/** Gira un punto (x, z) para que el lado de frente quede abajo del dibujo. */
function rotador(ladoFrente) {
  // A (z+) es "abajo" sin girar; cada lado siguiente gira 90°.
  const vueltas = LADOS.indexOf(ladoFrente);
  return ([x, z]) => {
    let p = [x, z];
    for (let i = 0; i < vueltas; i++) p = [-p[1], p[0]]; // 90°: el lado siguiente pasa a estar abajo
    return p;
  };
}

/** Las 4 esquinas de un rectángulo centrado en `centro`, largo `l` en dirección `f` y ancho `a`. */
function rectangulo(centro, f, l, a) {
  const w = [-f[1], f[0]];
  return [[1, 1], [1, -1], [-1, -1], [-1, 1]].map(([s, t]) => [
    centro[0] + f[0] * (l / 2) * s + w[0] * (a / 2) * t,
    centro[2] + f[1] * (l / 2) * s + w[1] * (a / 2) * t,
  ]);
}

export default function PlantaEscalera({ params, escalera, entrepiso }) {
  if (!escalera || !entrepiso) return null;
  const girar = rotador(params.ladoFrente);
  const enPantalla = ([x, z]) => girar([x, z]);
  const puntos = (lista) => lista.map((p) => enPantalla(p).map((v) => v.toFixed(3)).join(',')).join(' ');

  const { largo, ancho } = params;
  const esquinasPlanta = [[-largo / 2, -ancho / 2], [largo / 2, -ancho / 2], [largo / 2, ancho / 2], [-largo / 2, ancho / 2]];
  const enPlanta = esquinasPlanta.map(enPantalla);
  const xs = enPlanta.map((p) => p[0]);
  const zs = enPlanta.map((p) => p[1]);
  const caja = [Math.min(...xs) - MARGEN, Math.min(...zs) - MARGEN, Math.max(...xs) - Math.min(...xs) + 2 * MARGEN, Math.max(...zs) - Math.min(...zs) + 2 * MARGEN];

  // Escalones de abajo hacia arriba (el id termina en el número de contrahuella).
  const escalones = [...escalera.escalones].sort((a, b) => a.centro[1] - b.centro[1]);
  const primero = escalones[0];
  const ultimo = escalones[escalones.length - 1];
  const recorrido = escalones.map((s) => enPantalla([s.centro[0], s.centro[2]]));

  // Nombre de cada pared, afuera de la planta, en el medio de su lado.
  const nombres = LADOS.map((lado) => {
    const centro = { A: [0, ancho / 2], B: [largo / 2, 0], C: [0, -ancho / 2], D: [-largo / 2, 0] }[lado];
    const afuera = { A: [0, 0.45], B: [0.45, 0], C: [0, -0.45], D: [-0.45, 0] }[lado];
    const punto = enPantalla([centro[0] + afuera[0], centro[1] + afuera[1]]);
    const medio = enPantalla(centro);
    // Los lados que quedan a la izquierda o a la derecha del dibujo van con el texto vertical (si no, se cortan).
    const deCostado = Math.abs(punto[0] - medio[0]) > Math.abs(punto[1] - medio[1]);
    return { lado, punto, deCostado };
  });

  return (
    <figure className="planta-escalera">
      <svg viewBox={caja.map((v) => v.toFixed(3)).join(' ')} role="img"
        aria-label={`Planta de la escalera: arranca en el escalón 1 y sube ${escalones.length} pisadas hasta el entrepiso`}>
        <defs>
          <marker id="flecha-sube" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" className="flecha" />
          </marker>
        </defs>
        <polygon points={puntos(esquinasPlanta)} className="planta" />
        <polygon points={puntos(entrepiso.esquinas)} className="entrepiso" />
        {escalera.descansos.map((d) => (
          <polygon key={d.numero} points={puntos(rectangulo(d.centro, d.direccion, d.lado, d.lado))} className="descanso" />
        ))}
        {escalones.map((s) => (
          <polygon key={s.id} points={puntos(rectangulo(s.centro, s.direccion, s.huella, s.ancho))}
            className={s === primero ? 'escalon primero' : s === ultimo ? 'escalon ultimo' : 'escalon'} />
        ))}
        {recorrido.length > 1 && (
          <polyline points={recorrido.map((p) => p.map((v) => v.toFixed(3)).join(',')).join(' ')}
            className="recorrido" markerEnd="url(#flecha-sube)" />
        )}
        <text x={recorrido[0][0]} y={recorrido[0][1]} className="numero">1</text>
        <text x={recorrido[recorrido.length - 1][0]} y={recorrido[recorrido.length - 1][1]} className="numero">{escalones.length}</text>
        {nombres.map(({ lado, punto, deCostado }) => (
          <text key={lado} x={punto[0]} y={punto[1]} className={lado === params.ladoFrente ? 'pared frente' : 'pared'}
            transform={deCostado ? `rotate(-90 ${punto[0]} ${punto[1]})` : undefined}>
            {nombreLado(lado, params.ladoFrente)}
          </text>
        ))}
      </svg>
      <figcaption>
        Vista desde arriba (el frente abajo). <strong className="txt-primero">1</strong> = escalón más bajo (arranque) ·{' '}
        <strong className="txt-ultimo">{escalones.length}</strong> = el más alto, llega al entrepiso (celeste). La flecha sube.
      </figcaption>
    </figure>
  );
}
