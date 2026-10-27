// ==========================================================
// LISTA DE PERFILES (v1.21): los hierros que usa el herrero
// ----------------------------------------------------------
// Antes cada renglón del presupuesto (Columnas, Zanca…) tenía su perfil
// escrito a mano, con su largo de barra y su precio. Problemas:
//   - "80x80x2" y "80x80x2.0" parecían hierros distintos;
//   - el mismo hierro podía quedar con dos precios;
//   - no se podía calcular el peso.
//
// Ahora hay una LISTA DE PERFILES y cada uso ELIGE uno:
//
//   perfil (en el catálogo, categoria 'hierro'):
//     { id, categoria: 'hierro', tipo, a, b, c, espesor, texto, kgm, largoBarra, precio, revisarPrecio? }
//       tipo     'cuadrado' | 'rectangular' | 'redondo' | 'c' | 'u' | 'angulo' | 'planchuela' | 'otro'
//       a, b, c  medidas en mm (qué es cada una depende del tipo, ver TIPOS_PERFIL)
//       texto    descripción libre (solo tipo 'otro')
//       kgm      kg por metro cargado a mano (solo tipo 'otro'; en los demás se calcula)
//
//   uso (renglón del catálogo, categoria 'perfil'): { id, nombre, perfilId, … }
//
// `resolverCatalogo` copia a cada uso el nombre, el largo de barra y el
// precio de su perfil: así el resto del motor (presupuesto, cortes, 3D)
// sigue leyendo `perfil`, `largoBarra` y `precio` como siempre.
// ==========================================================

/** Acero: 7850 kg/m³ => 1 mm² de sección pesa 0,00785 kg por metro. */
const KG_POR_MM2_POR_M = 0.00785;
const PULGADA_MM = 25.4;

/**
 * Tipos de perfil y qué medidas pide cada uno (en mm).
 * `opcional`: puede quedar en 0 (el labio del perfil C).
 */
export const TIPOS_PERFIL = {
  cuadrado: { nombre: 'Caño cuadrado', medidas: [['a', 'Lado'], ['espesor', 'Espesor']] },
  rectangular: { nombre: 'Caño rectangular', medidas: [['a', 'Alto'], ['b', 'Ancho'], ['espesor', 'Espesor']] },
  redondo: { nombre: 'Caño redondo', medidas: [['a', 'Diámetro'], ['espesor', 'Espesor']] },
  c: { nombre: 'Perfil C', medidas: [['a', 'Alto'], ['b', 'Ala'], ['c', 'Labio', { opcional: true }], ['espesor', 'Espesor']] },
  u: { nombre: 'Perfil U', medidas: [['a', 'Alto'], ['b', 'Ala'], ['espesor', 'Espesor']] },
  angulo: { nombre: 'Ángulo', medidas: [['a', 'Ala'], ['b', 'Otra ala'], ['espesor', 'Espesor']] },
  planchuela: { nombre: 'Planchuela', medidas: [['a', 'Ancho'], ['espesor', 'Espesor']] },
  otro: { nombre: 'Otro (texto libre)', medidas: [] },
};

/** Límites de cada medida (mm), largo de barra (m) y kg/m. */
export const LIMITES_PERFIL = {
  medida: { min: 5, max: 400 },
  espesor: { min: 0.5, max: 30 },
  largoBarra: { min: 1, max: 12 },
  kgm: { min: 0, max: 200 },
};

/** Perfil nuevo por defecto (lo que aparece al tocar "+ Agregar perfil"). */
export const PERFIL_NUEVO = {
  categoria: 'hierro', tipo: 'cuadrado', a: 50, b: 50, c: 0, espesor: 2, texto: '', kgm: 0, largoBarra: 6, precio: 0,
};

// ---------- Nombre ----------

/** 80 -> "80"; 38.1 -> "38.1" (sin ceros de más). */
const mm = (n) => String(Number(Number(n).toFixed(2)));
/** Espesor siempre con un decimal, como se vende: 2 -> "2.0", 1.6 -> "1.6". */
const esp = (n) => Number(n).toFixed(Number.isInteger(Number((n * 10).toFixed(4))) ? 1 : 2);

/** Medida en pulgadas si es una fracción común (múltiplo de 1/16"): 38.1 -> '1 1/2"'. Si no, null. */
export function enPulgadas(milimetros) {
  const dieciseisavos = (milimetros / PULGADA_MM) * 16;
  const n = Math.round(dieciseisavos);
  if (n <= 0 || Math.abs(dieciseisavos - n) > 0.02) return null;
  const entero = Math.floor(n / 16);
  let num = n % 16;
  let den = 16;
  while (num > 0 && num % 2 === 0) { num /= 2; den /= 2; }
  const fraccion = num > 0 ? `${num}/${den}` : '';
  return `${[entero || '', fraccion].filter(Boolean).join(' ')}"`;
}

/** Nombre que se muestra y que usa el resto de la app: "Caño estructural 80x80x2.0". */
export function nombrePerfil(p) {
  if (!p) return '';
  const b = p.b || p.a;
  switch (p.tipo) {
    case 'cuadrado': return `Caño estructural ${mm(p.a)}x${mm(p.a)}x${esp(p.espesor)}`;
    case 'rectangular': return `Caño estructural ${mm(p.a)}x${mm(b)}x${esp(p.espesor)}`;
    case 'redondo': return `Caño redondo ${mm(p.a)}x${esp(p.espesor)}`;
    case 'c': return `Perfil C ${mm(p.a)}x${mm(b)}${p.c > 0 ? `x${mm(p.c)}` : ''}x${esp(p.espesor)}`;
    case 'u': return `Perfil U ${mm(p.a)}x${mm(b)}x${esp(p.espesor)}`;
    case 'angulo': {
      // Los ángulos se piden en pulgadas: si las medidas son fracciones comunes, se muestran así.
      const ala = enPulgadas(p.a);
      const otra = enPulgadas(b);
      const e = enPulgadas(p.espesor);
      if (ala && otra && e) return ala === otra ? `Ángulo ${ala} x ${e}` : `Ángulo ${ala} x ${otra} x ${e}`;
      return `Ángulo ${mm(p.a)}x${mm(b)}x${esp(p.espesor)}`;
    }
    case 'planchuela': return `Planchuela ${mm(p.a)}x${esp(p.espesor)}`;
    default: return (p.texto ?? '').trim();
  }
}

// ---------- Peso ----------

/**
 * Sección de acero (mm²), aproximada con esquinas en canto vivo.
 * Alcanza para el peso de compra (las tablas del fabricante dan un poco menos).
 */
export function seccionMm2(p) {
  const e = p.espesor;
  const b = p.b || p.a;
  switch (p.tipo) {
    case 'cuadrado': return p.a * p.a - (p.a - 2 * e) ** 2;
    case 'rectangular': return p.a * b - (p.a - 2 * e) * (b - 2 * e);
    case 'redondo': return (Math.PI / 4) * (p.a ** 2 - (p.a - 2 * e) ** 2);
    // Chapa plegada: largo desarrollado x espesor (cada esquina se cuenta una vez).
    case 'c': return e * (p.a + 2 * b + 2 * (p.c || 0) - (p.c > 0 ? 4 : 2) * e);
    case 'u': return e * (p.a + 2 * b - 2 * e);
    case 'angulo': return e * (p.a + b - e);
    case 'planchuela': return p.a * e;
    default: return 0;
  }
}

/** Kilos por metro: calculado, o el cargado a mano en "otro". */
export function kgPorMetro(p) {
  if (!p) return 0;
  if (p.tipo === 'otro') return Number.isFinite(p.kgm) ? p.kgm : 0;
  return Math.max(0, seccionMm2(p) * KG_POR_MM2_POR_M);
}

// ---------- Validación ----------

/** Revisa las medidas de un perfil. @returns {string|null} error */
export function revisarPerfil(p) {
  if (!p || !TIPOS_PERFIL[p.tipo]) return 'Tipo de perfil inválido';
  if (p.tipo === 'otro') return typeof p.texto === 'string' ? null : 'Escribí la descripción';
  for (const [campo, etiqueta, opciones] of TIPOS_PERFIL[p.tipo].medidas) {
    const v = p[campo];
    const { min, max } = campo === 'espesor' ? LIMITES_PERFIL.espesor : LIMITES_PERFIL.medida;
    if (opciones?.opcional && v === 0) continue;
    if (!Number.isFinite(v) || v < min || v > max) return `${etiqueta}: entre ${min} y ${max} mm`;
  }
  const lados = TIPOS_PERFIL[p.tipo].medidas.map(([c]) => c).filter((c) => c !== 'espesor' && c !== 'c').map((c) => p[c]);
  if (['cuadrado', 'rectangular', 'redondo'].includes(p.tipo) && 2 * p.espesor >= Math.min(...lados)) {
    return 'El espesor es demasiado grande para ese caño';
  }
  return null;
}

// ---------- Leer los textos viejos ----------

const numero = (t) => Number(t.replace(',', '.'));
const NUM = '(\\d+(?:[.,]\\d+)?)';

/** "1 1/2" -> 1.5 ; "3/16" -> 0.1875 ; "2" -> 2 */
function pulgadas(texto) {
  return texto.trim().split(/\s+/).reduce((acc, parte) => {
    if (parte.includes('/')) {
      const [n, d] = parte.split('/').map(Number);
      return acc + n / d;
    }
    return acc + Number(parte);
  }, 0);
}

/**
 * Convierte un perfil escrito a mano (proyectos de antes de v1.21) en un perfil de la lista.
 * Lo que no se reconoce queda como tipo 'otro' con el texto tal cual (nada se pierde).
 */
export function perfilDesdeTexto(texto) {
  const t = String(texto ?? '').trim();
  const s = t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[×*]/g, 'x');
  const base = { ...PERFIL_NUEVO, a: 0, b: 0, c: 0, espesor: 0 };
  let m;

  if (/redondo/.test(s) && (m = s.match(new RegExp(`${NUM}\\s*x\\s*${NUM}`)))) {
    return { ...base, tipo: 'redondo', a: numero(m[1]), espesor: numero(m[2]) };
  }
  if (/cano|tubo/.test(s) && (m = s.match(new RegExp(`${NUM}\\s*x\\s*${NUM}\\s*x\\s*${NUM}`)))) {
    const [a, b, e] = [m[1], m[2], m[3]].map(numero);
    return a === b ? { ...base, tipo: 'cuadrado', a, b: a, espesor: e } : { ...base, tipo: 'rectangular', a, b, espesor: e };
  }
  if ((m = s.match(new RegExp(`perfil\\s+([cu])\\s*${NUM}\\s*x\\s*${NUM}\\s*x\\s*${NUM}(?:\\s*x\\s*${NUM})?`)))) {
    const nums = [m[2], m[3], m[4], m[5]].filter(Boolean).map(numero);
    // 4 números: alto x ala x labio x espesor; 3: alto x ala x espesor (sin labio).
    const [a, b, c, e] = nums.length === 4 ? nums : [nums[0], nums[1], 0, nums[2]];
    return m[1] === 'u' ? { ...base, tipo: 'u', a, b, espesor: e } : { ...base, tipo: 'c', a, b, c, espesor: e };
  }
  if (/angulo/.test(s)) {
    // En pulgadas: 'Ángulo 1 1/2" x 3/16"' (alas iguales) o '2" x 1 1/2" x 3/16"'.
    const enPulg = [...s.matchAll(/(\d+(?:\s+\d+\/\d+)?|\d+\/\d+)\s*"/g)].map((x) => pulgadas(x[1]) * PULGADA_MM);
    if (enPulg.length === 2) return { ...base, tipo: 'angulo', a: enPulg[0], b: enPulg[0], espesor: enPulg[1] };
    if (enPulg.length === 3) return { ...base, tipo: 'angulo', a: enPulg[0], b: enPulg[1], espesor: enPulg[2] };
    if ((m = s.match(new RegExp(`${NUM}\\s*x\\s*${NUM}\\s*x\\s*${NUM}`)))) {
      const [a, b, e] = [m[1], m[2], m[3]].map(numero);
      return { ...base, tipo: 'angulo', a, b, espesor: e };
    }
  }
  if (/planchuela/.test(s) && (m = s.match(new RegExp(`${NUM}\\s*x\\s*${NUM}`)))) {
    return { ...base, tipo: 'planchuela', a: numero(m[1]), espesor: numero(m[2]) };
  }
  return { ...base, tipo: 'otro', texto: t };
}

/** Clave para reconocer el mismo perfil: su nombre normalizado (80x80x2 = 80x80x2.0). */
const claveDe = (p) => nombrePerfil(p).toLowerCase();

// ---------- Catálogo ----------

export const esPerfilDeLista = (item) => item?.categoria === 'hierro';
export const perfilesDeLista = (catalogo) => catalogo.filter(esPerfilDeLista);

/** Precio que más se repite; si empatan, el más alto (no subestimar). */
function precioMasUsado(precios) {
  const veces = new Map();
  precios.forEach((p) => veces.set(p, (veces.get(p) ?? 0) + 1));
  return [...veces.entries()].sort((x, y) => y[1] - x[1] || y[0] - x[0])[0][0];
}

/**
 * Arma la lista de perfiles de un catálogo que no la tiene (o le faltan perfiles):
 * cada uso con su perfil escrito a mano pasa a apuntar a un perfil de la lista.
 * Los usos con el mismo perfil (80x80x2 = 80x80x2.0) y el mismo largo de barra
 * comparten UN perfil; si tenían precios distintos, toma el más usado y lo marca
 * `revisarPrecio` (la pantalla avisa una vez).
 *
 * @param {object[]} usos - renglones 'perfil' (con perfil, largoBarra, precio y quizás perfilId)
 * @param {object[]} perfiles - perfiles de la lista ya guardados
 * @returns {{ usos: object[], perfiles: object[] }}
 */
export function armarListaDePerfiles(usos, perfiles = []) {
  const lista = [...perfiles];
  const ids = new Set(lista.map((p) => p.id));
  let siguiente = 1;
  const idNuevo = () => {
    while (ids.has(`perfil-${siguiente}`)) siguiente++;
    ids.add(`perfil-${siguiente}`);
    return `perfil-${siguiente}`;
  };

  // Usos sin perfil válido: se agrupan por perfil leído + largo de barra.
  const sinPerfil = usos.filter((u) => !(u.perfilId && ids.has(u.perfilId)) && String(u.perfil ?? '').trim());
  const grupos = new Map();
  sinPerfil.forEach((u) => {
    const perfil = perfilDesdeTexto(u.perfil);
    const clave = `${claveDe(perfil)}|${u.largoBarra}`;
    if (!grupos.has(clave)) grupos.set(clave, { perfil, largoBarra: u.largoBarra, usos: [] });
    grupos.get(clave).usos.push(u);
  });

  const asignado = new Map(); // id del uso -> id del perfil
  grupos.forEach(({ perfil, largoBarra, usos: delGrupo }) => {
    // Si ya hay en la lista un perfil igual (mismo nombre y largo), se usa ese.
    const existente = lista.find((p) => claveDe(p) === claveDe(perfil) && p.largoBarra === largoBarra);
    let id = existente?.id;
    if (!id) {
      const precios = delGrupo.map((u) => u.precio).filter((p) => Number.isFinite(p));
      const distintos = new Set(precios).size > 1;
      id = idNuevo();
      lista.push({
        ...perfil, id, largoBarra: Number.isFinite(largoBarra) ? largoBarra : PERFIL_NUEVO.largoBarra,
        precio: precios.length ? precioMasUsado(precios) : 0,
        ...(distintos ? { revisarPrecio: true } : {}),
      });
    }
    delGrupo.forEach((u) => asignado.set(u.id, id));
  });

  return {
    perfiles: lista,
    usos: usos.map((u) => {
      if (u.perfilId && ids.has(u.perfilId)) return u;
      return { ...u, perfilId: asignado.get(u.id) ?? null };
    }),
  };
}

/**
 * Catálogo "resuelto": cada uso con el nombre, largo de barra y precio de su perfil.
 * Un uso sin perfil elegido queda sin nombre y en $0 (el presupuesto lo muestra así).
 */
export function resolverCatalogo(catalogo) {
  const porId = new Map(perfilesDeLista(catalogo).map((p) => [p.id, p]));
  if (porId.size === 0) return catalogo; // catálogos de prueba o viejos sin lista
  return catalogo.map((item) => {
    if (item.categoria !== 'perfil') return item;
    const p = porId.get(item.perfilId);
    if (!p) return { ...item, perfil: '', precio: 0, largoBarra: item.largoBarra ?? PERFIL_NUEVO.largoBarra, kgm: 0 };
    return { ...item, perfil: nombrePerfil(p), largoBarra: p.largoBarra, precio: p.precio, sinPrecio: p.sinPrecio, proveedorDelPrecio: p.proveedorDelPrecio, idProveedorDelPrecio: p.idProveedorDelPrecio, kgm: kgPorMetro(p) };
  });
}

/** Qué usos tiene cada perfil: { idPerfil: ['Columnas', 'Zanca…'] }. */
export function usosDePerfiles(catalogo) {
  const usos = {};
  catalogo.filter((i) => i.categoria === 'perfil' && i.perfilId).forEach((i) => {
    (usos[i.perfilId] ??= []).push(i.nombre);
  });
  return usos;
}

/**
 * Ficha de un perfil para el pedido al proveedor (v1.30.4): el tipo y cada medida con su nombre, para que no haya
 * dudas de qué se pide. Ej. Perfil C → "Alto 80 mm · Ala 40 mm · Espesor 1.6 mm"; los ángulos, también en pulgadas.
 * @returns {{ tipo: string, medidas: string, kgPorBarra: number }}
 */
export function fichaDePerfil(p) {
  if (!p) return { tipo: '', medidas: '', kgPorBarra: 0 };
  const tipo = TIPOS_PERFIL[p.tipo];
  if (!tipo || p.tipo === 'otro') return { tipo: tipo?.nombre ?? '', medidas: (p.texto ?? '').trim(), kgPorBarra: kgPorMetro(p) * (p.largoBarra || 0) };
  const medidas = tipo.medidas
    .filter(([clave, , opciones]) => !(opciones?.opcional && !(p[clave] > 0)))
    .map(([clave, nombre]) => {
      const valor = clave === 'b' && !p.b ? p.a : p[clave]; // sin "b" es igual a "a" (cuadrados)
      const pulgadas = p.tipo === 'angulo' ? enPulgadas(valor) : null;
      return `${nombre} ${clave === 'espesor' ? esp(valor) : mm(valor)} mm${pulgadas ? ` (${pulgadas})` : ''}`;
    })
    .join(' · ');
  return { tipo: tipo.nombre, medidas, kgPorBarra: kgPorMetro(p) * (p.largoBarra || 0) };
}
