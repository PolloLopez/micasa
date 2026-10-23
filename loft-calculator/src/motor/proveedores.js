// ==========================================================
// PROVEEDORES Y PRECIOS (v1.25): comparar presupuestos
// ----------------------------------------------------------
// Antes cada material tenía UN precio. Ahora el herrero carga sus
// proveedores y, en cada material, el precio de cada uno:
//
//   proveedor (en el catálogo, categoria 'proveedor'):
//     { id, categoria: 'proveedor', nombre, recargoTarjeta, nota }
//       recargoTarjeta = % que cobra de más con tarjeta (ej. 12)
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

/** Proveedor con el que arranca un proyecto (y al que pasan los precios de antes de v1.25). */
export const PROVEEDOR_INICIAL = { id: 'prov-1', categoria: 'proveedor', nombre: 'Mi proveedor', recargoTarjeta: 0, nota: '' };

export const esProveedor = (item) => item?.categoria === 'proveedor';
export const proveedoresDe = (catalogo) => catalogo.filter(esProveedor);

/**
 * ¿Este renglón del catálogo tiene precios por proveedor?
 * Todos menos los usos de perfil ('perfil': el precio es de su perfil de la lista) y los proveedores.
 */
export const llevaPrecios = (item) => item && item.categoria !== 'perfil' && item.categoria !== 'proveedor';

const esPrecio = (n) => Number.isFinite(n) && n >= 0;

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
      if (opciones.length === 0) return { ...item, precio: 0, sinPrecio: true, proveedorDelPrecio: null };
      return { ...item, precio: opciones[0].precio, sinPrecio: false, proveedorDelPrecio: opciones[0].proveedor.nombre };
    }
    const precio = precioEn(item, elegido, pago);
    return { ...item, precio: precio ?? 0, sinPrecio: precio === null, proveedorDelPrecio: elegido.nombre };
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
 * Cuánto falta para que un presupuesto esté completo: renglones que se usan
 * (cantidad > 0) y no tienen precio en ese proveedor.
 */
export const faltanPrecios = (items) => items.filter((i) => i.cantidad > 0 && i.sinPrecio).map((i) => i.nombre);
