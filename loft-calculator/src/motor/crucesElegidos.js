// ==========================================================
// CRUCES ELEGIDOS UNO POR UNO (v1.88)
// ----------------------------------------------------------
// Pedido de Leandro (24/11): "también debería poder ingresar dónde se une
// y dónde no, en cada cruce, no en general. También para poder ponerlo
// debajo del otro fierro. Me pasa en Transversal de piso".
//
// Hasta la v1.87 se elegía por regla (Uniones: "tirantes enteros",
// "transversales enteros"…) o por pieza ("Entera en sus cruces"). Ahora cada
// cruce entre dos piezas puede tener lo suyo. Se guarda en
// params.crucesElegidos, con la clave de las dos piezas (sus ids enteros, sin
// el "~2" de los tramos, en orden alfabético: "piso:116|transv-piso:fila:226"):
//
//   { forma: 'corta',  entera: idQuePasa }            una pasa entera y la otra se corta contra ella
//   { forma: 'debajo', abajo: idDeAbajo, mueve: id }  las dos enteras: una va debajo de la otra
//                                                     (`mueve` = la que se corre de altura: baja la
//                                                     de abajo o sube la de arriba)
//   { union: 'cubrejunta' | 'chapa' }                 donde se corta, cómo se une (se suma a lo anterior)
//
// Lo que no está elegido sigue la regla de siempre. Lo aplica aplicarUniones (uniones.js).
// ==========================================================

/** El id de la pieza entera ("piso:3~2" es el tramo 2 de "piso:3"). */
export const idBase = (id) => String(id).split('~')[0];

/** La clave de un cruce: los dos ids enteros en orden (así da lo mismo desde cuál pieza se mire). */
export const claveCruce = (a, b) => [idBase(a), idBase(b)].sort().join('|');

/** Deja solo lo válido (los proyectos de antes: vacío). */
export function normalizarCrucesElegidos(c) {
  if (!c || typeof c !== 'object' || Array.isArray(c)) return {};
  return Object.fromEntries(Object.entries(c).slice(0, 3000).map(([clave, v]) => {
    const ids = String(clave).split('|');
    if (ids.length !== 2 || clave.length > 170 || !v || typeof v !== 'object') return null;
    const esDeEste = (id) => ids.includes(id);
    const forma = v.forma === 'corta' && esDeEste(v.entera) ? { forma: 'corta', entera: v.entera }
      : v.forma === 'debajo' && esDeEste(v.abajo) && esDeEste(v.mueve) ? { forma: 'debajo', abajo: v.abajo, mueve: v.mueve } : {};
    const union = ['cubrejunta', 'chapa'].includes(v.union) && forma.forma !== 'debajo' ? { union: v.union } : {};
    const limpio = { ...forma, ...union };
    return Object.keys(limpio).length ? [clave, limpio] : null;
  }).filter(Boolean));
}

/**
 * Las opciones de un cruce para la lista, mirado desde una pieza ("esta") hacia la otra.
 * El valor de cada opción es un texto corto (para un <select>); `deOpcion` lo vuelve a armar.
 */
export const OPCIONES_DE_CRUCE = [
  ['', 'Como la regla general'],
  ['corta:otra', 'Se corta esta (pasa entera la otra)'],
  ['corta:esta', 'Pasa entera esta (se corta la otra)'],
  ['debajo:esta:esta', 'Esta va debajo (baja esta)'],
  ['debajo:esta:otra', 'Esta va debajo (sube la otra)'],
  ['debajo:otra:otra', 'La otra va debajo (baja la otra)'],
  ['debajo:otra:esta', 'La otra va debajo (sube esta)'],
];

/** Lo elegido en un cruce → el valor de su opción (mirado desde `esta`). */
export function aOpcion(elegido, esta) {
  const quien = (id) => (id === idBase(esta) ? 'esta' : 'otra');
  if (elegido?.forma === 'corta') return `corta:${quien(elegido.entera)}`;
  if (elegido?.forma === 'debajo') return `debajo:${quien(elegido.abajo)}:${quien(elegido.mueve)}`;
  return '';
}

/** El valor de una opción → lo que se guarda (sin la unión). '' = como la regla. */
export function deOpcion(opcion, esta, otra) {
  const id = (q) => (q === 'esta' ? idBase(esta) : idBase(otra));
  const [forma, a, b] = String(opcion).split(':');
  if (forma === 'corta' && a) return { forma: 'corta', entera: id(a) };
  if (forma === 'debajo' && a && b) return { forma: 'debajo', abajo: id(a), mueve: id(b) };
  return {};
}

/**
 * Cambia lo elegido en uno o varios cruces y devuelve el objeto nuevo.
 * @param cambios { clave: cambio } donde cambio es { forma… } (lo que había de unión se conserva), {} (vuelve a la
 *                regla, con su unión) o { union } (se conserva la forma; null o 'soldada' = la de la pieza)
 */
export function cambiarCrucesElegidos(cruces, cambios) {
  const nuevo = { ...cruces };
  Object.entries(cambios).forEach(([clave, cambio]) => {
    const antes = nuevo[clave] ?? {};
    const forma = 'union' in cambio
      ? (antes.forma ? { forma: antes.forma, entera: antes.entera, abajo: antes.abajo, mueve: antes.mueve } : {})
      : cambio;
    const union = 'union' in cambio ? cambio.union : antes.union;
    const limpio = Object.fromEntries(Object.entries({ ...forma,
      ...(union && union !== 'soldada' && forma.forma !== 'debajo' ? { union } : {}) }).filter(([, v]) => v !== undefined));
    if (Object.keys(limpio).length) nuevo[clave] = limpio; else delete nuevo[clave];
  });
  return nuevo;
}
