// ==========================================================
// PROVEEDORES Y PRECIOS (v1.25): comparar presupuestos
// ----------------------------------------------------------
// Antes cada material tenía UN precio. Ahora el herrero carga sus
// proveedores y, en cada material, el precio de cada uno:
//
//   proveedor (en el catálogo, categoria 'proveedor'):
//     { id, categoria: 'proveedor', nombre, recargoTarjeta, nota, flete, fleteGratisDesde }
//       recargoTarjeta   = % que cobra de más con tarjeta (ej. 12)
//       flete            = $ por pedido (v1.29), se suma una vez si se le compra algo
//       fleteGratisDesde = compra desde la que no cobra flete (0 = siempre cobra)
//
//   Material SIN precio en un proveedor = ese proveedor NO LO VENDE (v1.29).
//
//   material con precio (perfil de la lista, revestimiento, OSB, pilotines…):
//     precios: { <idProveedor>: { efectivo, tarjeta } }
//       efectivo = precio en efectivo (null = ese proveedor no lo tiene / no lo pasó)
//       tarjeta  = precio con tarjeta propio; null = efectivo + recargo del proveedor
//
// El presupuesto se calcula con UN proveedor y una forma de pago
// (`aplicarProveedor` deja el precio elegido en `precio`, que es lo que
// lee el resto del motor), o con "el más barato de cada material".
//
// Los usos de un perfil (Columnas, Zanca…) no tienen precio propio: toman
// el de su perfil (ver perfiles.js / resolverCatalogo).
// ==========================================================

export const FORMAS_DE_PAGO = ['efectivo', 'tarjeta'];
/** Proveedor "virtual": cada material con el proveedor que lo tiene más barato. */
export const MAS_BARATO = 'mas-barato';
export const LIMITES_RECARGO = { min: 0, max: 100 }; // %
export const LIMITES_FLETE = { min: 0, max: 100000000 }; // $ (v1.29)

/** Proveedor con el que arranca un proyecto (y al que pasan los precios de antes de v1.25). */
export const PROVEEDOR_INICIAL = { id: 'prov-1', categoria: 'proveedor', nombre: 'Mi proveedor', recargoTarjeta: 0, nota: '', flete: 0, fleteGratisDesde: 0 };

export const esProveedor = (item) => item?.categoria === 'proveedor';
export const proveedoresDe = (catalogo) => catalogo.filter(esProveedor);

/**
 * ¿Este renglón del catálogo tiene precios por proveedor?
 * Todos menos los usos de perfil ('perfil': el precio es de su perfil de la lista) y los proveedores.
 */
export const llevaPrecios = (item) => item && item.categoria !== 'perfil' && item.categoria !== 'proveedor';

const esPrecio = (n) => Number.isFinite(n) && n >= 0;
const esMonto = (n) => Number.isFinite(n) && n >= LIMITES_FLETE.min && n <= LIMITES_FLETE.max;

/** Precio en efectivo o con tarjeta de un material en un proveedor; null si ese proveedor no lo tiene. */
export function precioEn(item, proveedor, pago) {
  const p = item.precios?.[proveedor?.id];
  if (!p || !esPrecio(p.efectivo)) return null;
  if (pago !== 'tarjeta') return p.efectivo;
  if (esPrecio(p.tarjeta)) return p.tarjeta;
  return Math.round(p.efectivo * (1 + (proveedor.recargoTarjeta ?? 0) / 100));
}

/**
 * Catálogo con el precio del proveedor y la forma de pago elegidos en `precio`.
 * Cada material marca `sinPrecio` si ese proveedor no lo tiene (cuenta $0 y la pantalla avisa).
 * Con MAS_BARATO, cada material toma el menor precio entre los proveedores que lo tienen
 * y guarda de quién es (`proveedorDelPrecio`).
 */
export function aplicarProveedor(catalogo, idProveedor, pago = 'efectivo') {
  const proveedores = proveedoresDe(catalogo);
  if (proveedores.length === 0) return catalogo; // catálogos de prueba o viejos sin proveedores
  const elegido = proveedores.find((p) => p.id === idProveedor) ?? proveedores[0];
  return catalogo.map((item) => {
    if (!llevaPrecios(item)) return item;
    if (idProveedor === MAS_BARATO) {
      const opciones = proveedores
        .map((p) => ({ proveedor: p, precio: precioEn(item, p, pago) }))
        .filter((o) => o.precio !== null)
        .sort((a, b) => a.precio - b.precio);
      if (opciones.length === 0) return { ...item, precio: 0, sinPrecio: true, proveedorDelPrecio: null, idProveedorDelPrecio: null };
      return { ...item, precio: opciones[0].precio, sinPrecio: false, proveedorDelPrecio: opciones[0].proveedor.nombre, idProveedorDelPrecio: opciones[0].proveedor.id };
    }
    const precio = precioEn(item, elegido, pago);
    return { ...item, precio: precio ?? 0, sinPrecio: precio === null, proveedorDelPrecio: elegido.nombre, idProveedorDelPrecio: precio === null ? null : elegido.id };
  });
}

// ---------- Guardado y migración ----------

/** Proveedor guardado: se conserva si es válido (null si no). */
function normalizarProveedor(p) {
  if (typeof p?.id !== 'string' || !p.id) return null;
  const recargo = Number.isFinite(p.recargoTarjeta) && p.recargoTarjeta >= LIMITES_RECARGO.min && p.recargoTarjeta <= LIMITES_RECARGO.max
    ? p.recargoTarjeta : 0;
  return {
    id: p.id,
    categoria: 'proveedor',
    nombre: typeof p.nombre === 'string' && p.nombre.trim() ? p.nombre.slice(0, 60) : 'Proveedor',
    recargoTarjeta: recargo,
    nota: typeof p.nota === 'string' ? p.nota.slice(0, 120) : '',
    // v1.29: flete (los de antes, sin flete).
    flete: esMonto(p.flete) ? p.flete : 0,
    fleteGratisDesde: esMonto(p.fleteGratisDesde) ? p.fleteGratisDesde : 0,
  };
}

/** Precios guardados de un material: solo los de proveedores que existen y con números válidos. */
function normalizarPrecios(precios, idsProveedores) {
  if (!precios || typeof precios !== 'object') return {};
  return Object.fromEntries(Object.entries(precios)
    .filter(([id, p]) => idsProveedores.has(id) && p && typeof p === 'object')
    .map(([id, p]) => [id, { efectivo: esPrecio(p.efectivo) ? p.efectivo : null, tarjeta: esPrecio(p.tarjeta) ? p.tarjeta : null }]));
}

/**
 * Agrega o revisa los proveedores de un catálogo (lo usa normalizarCatalogo).
 * Catálogos de antes de v1.25 (sin proveedores): se crea "Mi proveedor" y el precio
 * de cada material pasa a ser su precio en efectivo ahí. Nada se pierde.
 * @param {object[]} catalogo   ya normalizado (renglones, paneles y lista de perfiles)
 * @param {object[]} guardados  lo que vino guardado (para leer los proveedores)
 */
export function conProveedores(catalogo, guardados = []) {
  const vistos = new Set();
  let proveedores = guardados.filter(esProveedor).map(normalizarProveedor).filter(Boolean)
    .filter((p) => !vistos.has(p.id) && vistos.add(p.id));
  const habiaProveedores = proveedores.length > 0;
  if (!habiaProveedores) proveedores = [{ ...PROVEEDOR_INICIAL }];
  const ids = new Set(proveedores.map((p) => p.id));
  const primero = proveedores[0].id;

  const materiales = catalogo.filter((i) => !esProveedor(i)).map((item) => {
    if (!llevaPrecios(item)) return item;
    const guardado = guardados.find((g) => g.id === item.id);
    const precios = normalizarPrecios(guardado?.precios ?? item.precios, ids);
    // Proyecto de antes de v1.25 (el material no tiene `precios`): su precio de siempre, en efectivo, en el primero.
    // Uno nuevo (precios: {}) queda sin precio hasta que se cargue.
    const sinPrecios = !guardado?.precios && !item.precios;
    if (sinPrecios && esPrecio(item.precio)) precios[primero] = { efectivo: item.precio, tarjeta: null };
    return { ...item, precios };
  });
  return [...materiales, ...proveedores];
}

// ---------- Comparar ----------

/**
 * Lo que no se puede comprar: renglones que se usan (cantidad > 0) y ese proveedor no vende
 * (con "lo más barato", los que no vende ninguno).
 */
export const faltanPrecios = (items) => items.filter((i) => i.cantidad > 0 && i.sinPrecio).map((i) => i.nombre);

// ---------- Flete y plan de compra (v1.29) ----------

/** Flete de un pedido: nada si no se le compra; gratis desde cierto monto, si el proveedor lo tiene. */
export function costoFlete(proveedor, compra) {
  if (!(compra > 0) || !(proveedor?.flete > 0)) return 0;
  return proveedor.fleteGratisDesde > 0 && compra >= proveedor.fleteGratisDesde ? 0 : proveedor.flete;
}

/**
 * Renglones de flete de un presupuesto ya calculado: uno por proveedor al que se le compra algo.
 * @param items     renglones con precio (cada uno sabe de qué proveedor es: idProveedorDelPrecio)
 * @returns {object[]} renglones { id: 'flete:<prov>', categoria: 'flete', nombre, cantidad, precio, subtotal }
 */
export function renglonesDeFlete(items, catalogo) {
  const compras = new Map();
  items.forEach((i) => {
    if (!(i.cantidad > 0) || i.sinPrecio || !i.idProveedorDelPrecio) return;
    compras.set(i.idProveedorDelPrecio, (compras.get(i.idProveedorDelPrecio) ?? 0) + i.cantidad * (i.precio || 0));
  });
  return proveedoresDe(catalogo).flatMap((p) => {
    const compra = compras.get(p.id) ?? 0;
    const flete = costoFlete(p, compra);
    if (!(compra > 0) || !(p.flete > 0)) return [];
    const detalle = flete === 0 ? `gratis (compra desde ${p.fleteGratisDesde.toLocaleString('es-AR')})` : 'por pedido';
    return [{ id: `flete:${p.id}`, categoria: 'flete', nombre: `Flete ${p.nombre}`, unidad: 'viaje', cantidad: 1, precio: flete, subtotal: flete, detalle, cortes: null }];
  });
}

/** Material con precios de un renglón del presupuesto: el perfil de la lista (usos) o el mismo renglón. */
const materialDe = (item, catalogo) => catalogo.find((m) => m.id === (item.perfilId ?? item.id));

/**
 * Quién vende más barato cada renglón (sin contar el flete), para la columna del presupuesto.
 * @returns {{ id, nombre, precio } | null}  null si nadie lo vende o hay un solo proveedor
 */
export function masBaratoEn(item, catalogo, pago = 'efectivo') {
  const proveedores = proveedoresDe(catalogo);
  const material = materialDe(item, catalogo);
  if (proveedores.length < 2 || !material || !llevaPrecios(material)) return null;
  const opciones = proveedores.map((p) => ({ id: p.id, nombre: p.nombre, precio: precioEn(material, p, pago) }))
    .filter((o) => o.precio !== null).sort((a, b) => a.precio - b.precio);
  return opciones[0] ?? null;
}

const MAXIMO_PROVEEDORES_PLAN = 12; // 2^12 combinaciones: instantáneo

/**
 * Plan de compra: a qué proveedor comprarle cada material para gastar lo menos posible
 * CONTANDO EL FLETE. Prueba todas las combinaciones de proveedores (son pocos) y en cada una
 * le compra cada material al más barato de los elegidos. Gana la que deja menos materiales sin
 * comprar y, entre esas, la más barata. Así, si un proveedor ahorra menos que su flete, no se usa.
 * @param items  renglones de un presupuesto (las cantidades)
 * @returns {{ compras: { proveedor, renglones, subtotal, flete, total }[], total, nadieVende: string[] } | null}
 */
export function planDeCompra(items, catalogo, pago = 'efectivo') {
  const proveedores = proveedoresDe(catalogo).slice(0, MAXIMO_PROVEEDORES_PLAN);
  if (proveedores.length === 0) return null;
  // Cada renglón con lo que cuesta en cada proveedor (null = no lo vende).
  const renglones = items.filter((i) => i.cantidad > 0 && i.categoria !== 'flete').map((i) => {
    const material = materialDe(i, catalogo);
    const precios = proveedores.map((p) => (material && llevaPrecios(material) ? precioEn(material, p, pago) : null));
    return { item: i, precios };
  }).filter((r) => materialDe(r.item, catalogo) && llevaPrecios(materialDe(r.item, catalogo)));

  let mejor = null;
  for (let mascara = 1; mascara < 1 << proveedores.length; mascara++) {
    const usa = (k) => (mascara >> k) & 1;
    const asignacion = renglones.map((r) => {
      let k = -1;
      r.precios.forEach((precio, j) => { if (usa(j) && precio !== null && (k < 0 || precio < r.precios[k])) k = j; });
      return k;
    });
    const faltan = asignacion.filter((k) => k < 0).length;
    const compra = proveedores.map(() => 0);
    asignacion.forEach((k, i) => { if (k >= 0) compra[k] += renglones[i].item.cantidad * renglones[i].precios[k]; });
    const total = compra.reduce((a, c, k) => a + c + costoFlete(proveedores[k], c), 0);
    if (!mejor || faltan < mejor.faltan || (faltan === mejor.faltan && total < mejor.total)) mejor = { faltan, total, asignacion, compra };
  }

  const compras = proveedores.map((p, k) => {
    const suyos = renglones.filter((_, i) => mejor.asignacion[i] === k).map((r) => ({
      id: r.item.id, nombre: r.item.nombre, cantidad: r.item.cantidad, unidad: r.item.unidad,
      precio: r.precios[k], subtotal: r.item.cantidad * r.precios[k],
    }));
    const subtotal = mejor.compra[k];
    const flete = costoFlete(p, subtotal);
    return { proveedor: { id: p.id, nombre: p.nombre }, renglones: suyos, subtotal, flete, total: subtotal + flete };
  }).filter((c) => c.renglones.length > 0);
  return {
    compras,
    total: Math.round(mejor.total),
    nadieVende: renglones.filter((_, i) => mejor.asignacion[i] < 0).map((r) => r.item.nombre),
  };
}

/**
 * Total de la obra (v1.30.2): lo que cuesta TODO.
 * Con más de un proveedor es el total del plan de compra (cada material donde conviene, con flete), porque el
 * total de un solo proveedor deja afuera lo que ese no vende (ej. los paneles de otro proveedor).
 * Con uno solo (o sin plan), es el total del presupuesto de siempre.
 * @param {number} totalProveedor  total con el proveedor elegido (calcularPresupuesto)
 * @param {object|null} plan       resultado de planDeCompra
 * @param {number} cantidadProveedores
 */
export function totalDeLaObra(totalProveedor, plan, cantidadProveedores) {
  return usaPlanDeCompra(plan, cantidadProveedores) ? plan.total : totalProveedor;
}

/** ¿El total de la obra sale del plan de compra? (más de un proveedor y algo para comprar) */
export const usaPlanDeCompra = (plan, cantidadProveedores) => cantidadProveedores > 1 && Boolean(plan?.compras?.length);
