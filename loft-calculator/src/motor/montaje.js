// ==========================================================
// MONTAJE INDUSTRIAL (proyecto propio, params.tipoProyecto = 'montaje')
// ----------------------------------------------------------
// Un montaje es una lista de COMPONENTES paramétricos ubicados en la
// planta: cada uno tiene su posición (x, z), su giro (0° o 90°) y sus
// medidas. Por ahora:
//   - MESA / BASTIDOR: patas (esquinas + intermedias), marco superior,
//     marco inferior opcional, travesaños bajo la tapa, riostras en cruz
//     y tapa (sin tapa, chapa o madera).
//   - TANQUE CILÍNDRICO: vertical u horizontal, envolvente de chapa,
//     tapas planas (ninguna, una o dos), patas (vertical) o cunas
//     (horizontal). Calcula chapas, soldadura, peso y volumen.
//
// Cada componente arma sus piezas en coordenadas LOCALES (centro en
// 0,0) y después se giran y se mueven a su lugar. Los ids llevan el id
// del componente (ej. "c2:pata:0") para poder eliminarlas o editarlas.
// ==========================================================

import { pieza, cruz } from './segmentos.js';

/** Chapa comercial (m). */
export const CHAPA = { largo: 2.44, ancho: 1.22 };
const DENSIDAD_ACERO = 7850; // kg/m³
const SUBE_PATA = 0.3; // las patas de un tanque vertical suben 30 cm por la envolvente (para soldar)

export const MESA_INICIAL = {
  tipo: 'mesa',
  nombre: 'Mesa',
  x: 0, z: 0, rotacion: 0,
  largo: 2, ancho: 1, alto: 0.9,
  separacionPatas: 0, // patas intermedias en los lados largos (0 = solo esquinas)
  marcoInferior: true,
  alturaMarcoInferior: 0.15,
  separacionTravesanos: 0.6, // travesaños bajo la tapa (0 = sin)
  riostras: 'no', // 'no' | 'cabeceras' | 'todas'
  tapa: 'chapa', // 'ninguna' | 'chapa' | 'madera'
};

export const TANQUE_INICIAL = {
  tipo: 'tanque',
  nombre: 'Tanque',
  x: 0, z: 0, rotacion: 0,
  orientacion: 'vertical', // 'vertical' | 'horizontal'
  diametro: 1.2,
  largo: 1.5, // alto si es vertical, largo si es horizontal
  espesorChapa: 3, // mm
  tapas: 'dos', // 'ninguna' | 'una' | 'dos'
  alturaSoporte: 0.6, // altura de la base del tanque sobre el piso
  apoyos: 4, // patas (vertical) o cunas (horizontal)
};

/** Montaje de ejemplo: una mesa y al lado un tanque vertical sobre patas. */
export const MONTAJE_INICIAL = {
  componentes: [
    { ...MESA_INICIAL, id: 'c1', nombre: 'Mesa de trabajo', x: -1.5 },
    { ...TANQUE_INICIAL, id: 'c2', nombre: 'Tanque de agua', x: 1.2 },
  ],
};

// ---------------- Ubicación ----------------

/** Gira (0° o 90°, alrededor del eje vertical) y mueve un punto local a la planta. */
function ubicar(componente, [x, y, z]) {
  const [xg, zg] = componente.rotacion === 90 ? [-z, x] : [x, z];
  return [xg + componente.x, y, zg + componente.z];
}

/** Pieza en coordenadas locales del componente, ya ubicada en la planta. */
function piezaDe(componente, nombre, tipo, desde, hasta) {
  const p = pieza(`${componente.id}:${nombre}`, tipo, ['montaje', `comp:${componente.id}`],
    ubicar(componente, desde), ubicar(componente, hasta));
  return { ...p, componente: componente.nombre };
}

// ---------------- Mesa / bastidor ----------------

/** Posiciones a lo largo de un lado, desde -largo/2 a +largo/2 cada `separacion` (0 = solo extremos). */
function posiciones(largo, separacion) {
  const vanos = separacion > 0 ? Math.max(1, Math.ceil(largo / separacion - 1e-9)) : 1;
  return Array.from({ length: vanos + 1 }, (_, k) => -largo / 2 + (largo * k) / vanos);
}

export function generarMesa(m) {
  const piezas = [];
  const [L, A, H] = [m.largo, m.ancho, m.alto];
  const xs = posiciones(L, m.separacionPatas); // patas a lo largo (en los dos lados largos)
  const lados = [-A / 2, A / 2];
  const add = (...args) => piezas.push(piezaDe(m, ...args));

  // Patas.
  xs.forEach((x, i) => lados.forEach((z, j) => add(`pata:${i}:${j}`, 'mont-pata', [x, 0, z], [x, H, z])));
  // Marco superior (perímetro) y marco inferior opcional.
  const marco = (nombre, y) => {
    add(`${nombre}:frente`, 'mont-marco', [-L / 2, y, A / 2], [L / 2, y, A / 2]);
    add(`${nombre}:fondo`, 'mont-marco', [-L / 2, y, -A / 2], [L / 2, y, -A / 2]);
    add(`${nombre}:izq`, 'mont-marco', [-L / 2, y, -A / 2], [-L / 2, y, A / 2]);
    add(`${nombre}:der`, 'mont-marco', [L / 2, y, -A / 2], [L / 2, y, A / 2]);
  };
  marco('marco-sup', H);
  if (m.marcoInferior) marco('marco-inf', m.alturaMarcoInferior);
  // Travesaños bajo la tapa, de lado a lado (sin repetir los de las cabeceras).
  if (m.separacionTravesanos > 0) {
    posiciones(L, m.separacionTravesanos).slice(1, -1).forEach((x, i) =>
      add(`travesano:${i}`, 'mont-travesano', [x, H, -A / 2], [x, H, A / 2]));
  }
  // Riostras en cruz entre patas: en las cabeceras o en todos los vanos.
  const abajo = m.marcoInferior ? m.alturaMarcoInferior : 0.05;
  const arriba = H - 0.05;
  if (m.riostras !== 'no') {
    [-L / 2, L / 2].forEach((x, k) => piezas.push(...cruz(`${m.id}:riostra-cab:${k}`, 'riostra', ['montaje', `comp:${m.id}`],
      ubicar(m, [x, abajo, -A / 2]), ubicar(m, [x, arriba, -A / 2]), ubicar(m, [x, abajo, A / 2]), ubicar(m, [x, arriba, A / 2]))));
  }
  if (m.riostras === 'todas') {
    for (let i = 0; i + 1 < xs.length; i++) {
      lados.forEach((z, j) => piezas.push(...cruz(`${m.id}:riostra:${i}:${j}`, 'riostra', ['montaje', `comp:${m.id}`],
        ubicar(m, [xs[i], abajo, z]), ubicar(m, [xs[i], arriba, z]), ubicar(m, [xs[i + 1], abajo, z]), ubicar(m, [xs[i + 1], arriba, z]))));
    }
  }
  piezas.forEach((p) => { p.componente = m.nombre; });

  // Tapa: chapas comerciales que hacen falta (la mejor de las dos orientaciones) o m² de madera.
  const area = L * A;
  const chapasTapa = m.tapa === 'chapa'
    ? Math.min(Math.ceil(L / CHAPA.largo - 1e-9) * Math.ceil(A / CHAPA.ancho - 1e-9), Math.ceil(L / CHAPA.ancho - 1e-9) * Math.ceil(A / CHAPA.largo - 1e-9))
    : 0;
  const placas = m.tapa === 'ninguna' ? [] : [{ id: `${m.id}:tapa`, material: m.tapa, centro: ubicar(m, [0, H + 0.01, 0]), largo: L, ancho: A, rotacion: m.rotacion }];

  const avisos = [];
  if (L > 2.5 + 1e-9 && m.separacionPatas === 0) avisos.push('Más de 2,5 m de largo sin patas intermedias: puede flechar.');
  if (H > 1.2 + 1e-9 && m.riostras === 'no') avisos.push('Mesa alta sin riostras: conviene arriostrar al menos las cabeceras.');

  return {
    piezas, placas, cilindros: [],
    cantidades: { chapasMesa: chapasTapa, m2Madera: m.tapa === 'madera' ? area : 0, chapasTanque: 0, soldadura: 0 },
    resumen: { texto: `${L.toFixed(2)} x ${A.toFixed(2)} m, ${H.toFixed(2)} m de alto · ${xs.length * 2} patas`, avisos },
  };
}

// ---------------- Tanque cilíndrico ----------------

/** Chapas, soldadura, peso y volumen de un tanque. */
export function cuentasTanque(t) {
  const D = t.diametro;
  const perimetro = Math.PI * D;
  const cantidadTapas = { ninguna: 0, una: 1, dos: 2 }[t.tapas];
  // Envolvente: anillos (virolas) del ancho de la chapa; cada anillo lleva las chapas necesarias para la vuelta.
  const anillos = Math.ceil(t.largo / CHAPA.ancho - 1e-9);
  const chapasPorAnillo = Math.ceil(perimetro / CHAPA.largo - 1e-9);
  const chapasEnvolvente = anillos * chapasPorAnillo;
  // Tapas: cada disco sale de un cuadrado de D x D. Si no entra en una chapa, va en partes.
  const tapaEnPartes = D > CHAPA.ancho + 1e-9;
  const porChapa = tapaEnPartes ? 0 : Math.floor(CHAPA.largo / D + 1e-9) * Math.floor(CHAPA.ancho / D + 1e-9);
  const chapasTapas = cantidadTapas === 0 ? 0
    : tapaEnPartes ? Math.ceil((cantidadTapas * D * D) / (CHAPA.largo * CHAPA.ancho) - 1e-9)
      : Math.ceil(cantidadTapas / porChapa - 1e-9);
  // Soldadura: costuras a lo largo (una por chapa de cada anillo) + uniones entre anillos + perímetro de cada tapa.
  const soldadura = chapasPorAnillo * t.largo + (anillos - 1) * perimetro + cantidadTapas * perimetro;
  const areaChapa = perimetro * t.largo + (cantidadTapas * Math.PI * D * D) / 4;
  return {
    anillos, chapasPorAnillo, chapasEnvolvente, chapasTapas, tapaEnPartes,
    chapas: chapasEnvolvente + chapasTapas,
    soldadura,
    pesoChapa: areaChapa * (t.espesorChapa / 1000) * DENSIDAD_ACERO,
    volumenLitros: Math.PI * (D / 2) ** 2 * t.largo * 1000,
  };
}

export function generarTanque(t) {
  const piezas = [];
  const r = t.diametro / 2;
  const h = t.alturaSoporte;
  const add = (...args) => piezas.push(piezaDe(t, ...args));
  let cilindro;

  if (t.orientacion === 'vertical') {
    // Patas repartidas alrededor, pegadas a la envolvente; suben un poco por el costado para soldarlas.
    const sube = Math.min(SUBE_PATA, t.largo / 3);
    for (let i = 0; i < t.apoyos; i++) {
      const ang = (2 * Math.PI * i) / t.apoyos + Math.PI / 4;
      const p = [Math.cos(ang) * r, Math.sin(ang) * r];
      add(`pata:${i}`, 'mont-pata', [p[0], 0, p[1]], [p[0], h + sube, p[1]]);
    }
    cilindro = { centro: ubicar(t, [0, h + t.largo / 2, 0]), eje: 'y' };
  } else {
    // Cunas (silletas): dos patas y un travesaño debajo del tanque, repartidas a lo largo.
    const yApoyo = h + r * (1 - Math.sqrt(1 - 0.7 * 0.7)); // donde la pata toca la envolvente (a 0,7 r del centro)
    for (let i = 0; i < t.apoyos; i++) {
      const x = -t.largo / 2 + (t.largo * (i + 0.5)) / t.apoyos;
      [-1, 1].forEach((s, j) => add(`cuna:${i}:${j}`, 'mont-pata', [x, 0, s * 0.7 * r], [x, yApoyo, s * 0.7 * r]));
      add(`cuna:${i}:travesano`, 'mont-travesano', [x, h, -0.7 * r], [x, h, 0.7 * r]);
    }
    cilindro = { centro: ubicar(t, [0, h + r, 0]), eje: t.rotacion === 90 ? 'z' : 'x' };
  }

  const c = cuentasTanque(t);
  const avisos = [];
  if (c.tapaEnPartes && t.tapas !== 'ninguna') avisos.push(`Diámetro mayor que el ancho de la chapa (${CHAPA.ancho} m): cada tapa va en partes soldadas.`);
  if (t.orientacion === 'vertical' && t.largo / t.diametro > 3) avisos.push('Tanque esbelto (alto mayor que 3 diámetros): revisá las patas y el anclaje.');

  return {
    piezas,
    placas: [],
    cilindros: [{
      id: `${t.id}:envolvente`, ...cilindro, radio: r, largo: t.largo, tapas: t.tapas,
      grupo: `comp:${t.id}`,
    }],
    cantidades: { chapasMesa: 0, m2Madera: 0, chapasTanque: c.chapas, soldadura: c.soldadura },
    resumen: {
      texto: `Ø ${t.diametro.toFixed(2)} x ${t.largo.toFixed(2)} m · ${Math.round(c.volumenLitros)} litros · `
        + `${c.chapas} chapas (${c.anillos} anillo${c.anillos === 1 ? '' : 's'} de ${c.chapasPorAnillo} + ${c.chapasTapas} de tapas) · `
        + `${c.soldadura.toFixed(1)} m de soldadura · ~${Math.round(c.pesoChapa)} kg de chapa`,
      avisos,
    },
  };
}

// ---------------- Montaje completo ----------------

const GENERADORES = { mesa: generarMesa, tanque: generarTanque };

/**
 * Arma todos los componentes. Precondición: params.montaje validado.
 * @returns {{ piezas, placas, cilindros, cantidades, resumenes, medidas }}
 */
export function generarMontaje(montaje) {
  const partes = montaje.componentes.map((c) => ({ id: c.id, ...GENERADORES[c.tipo](c) }));
  const sumar = (campo) => partes.reduce((acc, p) => acc + p.cantidades[campo], 0);
  const piezas = partes.flatMap((p) => p.piezas);
  const placas = partes.flatMap((p) => p.placas);
  const cilindros = partes.flatMap((p) => p.cilindros);
  return {
    piezas, placas, cilindros,
    cantidades: { chapasMesa: sumar('chapasMesa'), chapasTanque: sumar('chapasTanque'), m2Madera: sumar('m2Madera'), soldadura: sumar('soldadura') },
    resumenes: Object.fromEntries(partes.map((p) => [p.id, p.resumen])),
    medidas: medidasMontaje(montaje),
  };
}

/** Caja que ocupa el montaje (para ubicar la cámara). */
function medidasMontaje(montaje) {
  let [ancho, profundidad, alto] = [2, 2, 1];
  montaje.componentes.forEach((c) => {
    const tamano = c.tipo === 'mesa' ? Math.max(c.largo, c.ancho) : Math.max(c.largo, c.diametro);
    ancho = Math.max(ancho, 2 * (Math.abs(c.x) + tamano / 2));
    profundidad = Math.max(profundidad, 2 * (Math.abs(c.z) + tamano / 2));
    alto = Math.max(alto, c.tipo === 'mesa' ? c.alto : c.alturaSoporte + (c.orientacion === 'vertical' ? c.largo : c.diametro));
  });
  return { largo: ancho, profundidad, alturaTotal: alto };
}

/** Id libre para un componente nuevo ("c1", "c2", ...). */
export function idNuevoComponente(componentes) {
  const usados = componentes.map((c) => Number(String(c.id).slice(1))).filter(Number.isFinite);
  return `c${Math.max(0, ...usados) + 1}`;
}
