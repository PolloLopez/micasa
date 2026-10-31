// ==========================================================
// EJES (v1.36): que las cargas bajen derecho
// ----------------------------------------------------------
// Tres opciones (decisión de Leandro, 28/10), en params.ejes:
//   modulo              una MEDIDA ÚNICA (ej. 1,25 m) que arma una grilla desde la
//                       esquina de la planta: las columnas van en las líneas de la
//                       grilla, las vigas de techo y los tirantes también (y si su
//                       separación es menor, se reparten parejo DENTRO de cada módulo)
//                       y los pilotines en los cruces. 0 = sin modulación.
//   vigasSobreColumnas  sin módulo: cada viga de techo arranca sobre una columna del
//                       lado bajo; entre dos columnas se reparten parejas.
//   pilotinesBajoColumnas sin módulo: un pilotín bajo cada columna; la grilla de
//                       pilotines de siempre completa el resto (sin repetir cerca).
// La grilla se mide desde la esquina de la planta de menor x y menor z, así las
// paredes de enfrente quedan alineadas (aunque se recorran al revés).
// ==========================================================

export const EJES_INICIALES = { modulo: 0, vigasSobreColumnas: false, pilotinesBajoColumnas: false };

const EPSILON = 0.01;
const CERCA_DE_COLUMNA = 0.3; // un pilotín de la grilla a menos de 30 cm de una columna no se repite

/** Líneas de la grilla en un largo: 0, m, 2m… y el largo (si no cae justo). */
export function lineasDelModulo(largo, m) {
  const lineas = [];
  for (let x = 0; x < largo - EPSILON; x += m) lineas.push(Number(x.toFixed(4)));
  lineas.push(largo);
  return lineas;
}

/**
 * Entre cada par de marcas seguidas, puntos parejos a no más de `separacion`.
 * Devuelve las marcas y los puntos, ordenados (sin repetir).
 */
export function subdividir(marcas, separacion) {
  const ordenadas = [...new Set(marcas.map((m) => Number(m.toFixed(4))))].sort((a, b) => a - b);
  const puntos = [];
  ordenadas.forEach((a, i) => {
    puntos.push(a);
    const b = ordenadas[i + 1];
    if (b === undefined || !(separacion > 0)) return;
    const tramos = Math.max(1, Math.ceil((b - a) / separacion - EPSILON));
    for (let k = 1; k < tramos; k++) puntos.push(a + ((b - a) * k) / tramos);
  });
  return puntos;
}

/**
 * Posiciones de la grilla sobre un eje que arranca en `origen` (coordenada de mundo) y avanza en `signo`
 * (+1 o −1) a lo largo de `largo`: distancias desde el origen donde cae una línea del módulo.
 * @param minimo coordenada de mundo donde arranca la grilla (la esquina de la planta)
 * @param total  largo total de la planta en ese eje
 */
export function marcasDelModulo(origen, signo, largo, minimo, total, m) {
  return lineasDelModulo(total, m)
    .map((g) => (minimo + g - origen) * signo)
    .filter((d) => d > -EPSILON && d < largo + EPSILON)
    .map((d) => Math.min(largo, Math.max(0, d)));
}

/** Completa la configuración (proyectos de antes: sin ejes). */
export function completarEjes(e) {
  const base = e && typeof e === 'object' ? e : {};
  return {
    modulo: Number.isFinite(base.modulo) && base.modulo >= 0 ? base.modulo : 0,
    vigasSobreColumnas: base.vigasSobreColumnas === true,
    pilotinesBajoColumnas: base.pilotinesBajoColumnas === true,
  };
}

/** Errores de carga. */
export function validarEjes(e) {
  const errores = {};
  if (!e || typeof e !== 'object') return { ejes: 'Faltan los datos de los ejes' };
  if (!Number.isFinite(e.modulo) || (e.modulo !== 0 && (e.modulo < 0.5 || e.modulo > 6))) errores['ejes.modulo'] = 'Entre 0,5 y 6 m';
  ['vigasSobreColumnas', 'pilotinesBajoColumnas'].forEach((c) => {
    if (typeof e[c] !== 'boolean') errores[`ejes.${c}`] = 'Valor inválido';
  });
  return errores;
}

/** Pilotines de la grilla de siempre más uno bajo cada columna (sin repetir los que caen cerca). */
export function unirPilotines(deGrilla, columnas) {
  const bajoColumnas = columnas.map(({ x, z }) => ({ x, z, bajoColumna: true }));
  const resto = deGrilla.filter((p) => !columnas.some((c) => Math.hypot(c.x - p.x, c.z - p.z) < CERCA_DE_COLUMNA));
  return [...bajoColumnas, ...resto];
}

// ---------- Forma de los pilotines ----------

export const PILOTIN_INICIAL = { forma: 'redondo', medida: 0.3 }; // diámetro (redondo) o lado (cuadrado), en m

export function completarPilotin(p) {
  const base = p && typeof p === 'object' ? p : {};
  return {
    forma: base.forma === 'cuadrado' ? 'cuadrado' : 'redondo',
    medida: Number.isFinite(base.medida) && base.medida > 0 ? base.medida : PILOTIN_INICIAL.medida,
  };
}

export function validarPilotin(p) {
  const errores = {};
  if (!p || typeof p !== 'object') return { pilotin: 'Faltan los datos del pilotín' };
  if (!['redondo', 'cuadrado'].includes(p.forma)) errores['pilotin.forma'] = 'Elegí redondo o cuadrado';
  if (!Number.isFinite(p.medida) || p.medida < 0.1 || p.medida > 1.5) errores['pilotin.medida'] = 'Entre 0,10 y 1,50 m';
  return errores;
}

/** "ø 30 cm" o "30 x 30 cm" (para el presupuesto y el resumen). */
export function textoPilotin(p) {
  const { forma, medida } = completarPilotin(p);
  const cm = Math.round(medida * 100);
  return forma === 'cuadrado' ? `${cm} x ${cm} cm` : `ø ${cm} cm`;
}
