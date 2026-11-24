// ==========================================================
// BUSCAR (v1.84): el mismo buscador en todas las listas largas
// ----------------------------------------------------------
// Pedido de Leandro (24/11): "en piezas eliminadas y editadas necesito un
// buscador, y fijate dónde más sirve". Se escriben palabras sueltas, en
// cualquier orden, sin importar mayúsculas ni tildes: quedan las filas que
// tienen TODAS esas palabras ("columna frente 4,33", "1.15", "ALPANEL panel").
// Las medidas valen con coma o con punto ("4,33" = "4.33").
// ==========================================================

/** Sin mayúsculas, sin tildes y la coma de los decimales como punto. */
export const normalizarBusqueda = (texto) => String(texto ?? '').toLowerCase().normalize('NFD')
  .replace(/[̀-ͯ]/g, '').replace(/(\d),(\d)/g, '$1.$2');

/** ¿El texto tiene todas las palabras de la búsqueda? (búsqueda vacía = sí) */
export function coincide(texto, busqueda) {
  const palabras = normalizarBusqueda(busqueda).split(/\s+/).filter(Boolean);
  if (palabras.length === 0) return true;
  const donde = normalizarBusqueda(texto);
  return palabras.every((p) => donde.includes(p));
}

/** Las filas que coinciden; `texto(fila)` arma lo que se busca de cada una. */
export const filtrarPor = (filas, busqueda, texto) => (normalizarBusqueda(busqueda).trim() ? filas.filter((f) => coincide(texto(f), busqueda)) : filas);
