// ==========================================================
// MIGRACIÓN DE DATOS ENTRE VERSIONES
// ----------------------------------------------------------
// Los datos guardados (navegador o archivo .json) pueden venir de
// una versión anterior. Estas funciones los llevan a la forma actual
// SIN perder lo que el usuario cargó. Después igual se validan.
//
// v1.2 -> v1.3:
//   - separacionTransversales (una para todo) pasa a una por piso.
//   - cada pared y el techo eligen un tipo de panel.
//   - nuevo: excedenteBarras (% de largo extra de las barras).
//   - catálogo: el renglón "transversal" se divide en piso y piso 2;
//     los paneles pasan a ser "tipos de panel" con color.
// ==========================================================

import { LADOS, INSUMO } from './constantes.js';
import { PARAMS_INICIALES } from './parametrosIniciales.js';
import { CATALOGO_FIJO, TIPOS_PANEL_INICIALES } from './presupuesto.js';

const esObjeto = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
const esColor = (c) => typeof c === 'string' && /^#[0-9a-fA-F]{6}$/.test(c);
const esPrecio = (n) => Number.isFinite(n) && n >= 0;

/** Completa/renombra parámetros de versiones anteriores. */
export function migrarParams(params) {
  if (!esObjeto(params)) return params;
  const nuevos = { ...params };

  if ('separacionTransversales' in nuevos) {
    nuevos.separacionTransversalesPiso ??= nuevos.separacionTransversales;
    nuevos.separacionTransversalesPiso2 ??= nuevos.separacionTransversales;
    delete nuevos.separacionTransversales;
  }
  nuevos.excedenteBarras ??= PARAMS_INICIALES.excedenteBarras;
  nuevos.panelTecho ??= PARAMS_INICIALES.panelTecho;

  if (esObjeto(nuevos.paredes)) {
    nuevos.paredes = Object.fromEntries(
      LADOS.map((lado) => {
        const pared = nuevos.paredes[lado];
        return [lado, esObjeto(pared) ? { ...pared, panel: pared.panel ?? PARAMS_INICIALES.paredes[lado].panel } : pared];
      })
    );
  }
  return nuevos;
}

/**
 * Devuelve un catálogo completo y ordenado a partir de uno guardado:
 *   - insumos fijos en su orden, con el perfil/largo/precio guardados
 *     (si son válidos) o los de fábrica;
 *   - tipos de panel guardados (válidos); si no hay ninguno, los iniciales.
 * Acepta catálogos de v1.2 (renglón "transversal" único).
 */
export function normalizarCatalogo(catalogo) {
  const guardado = Array.isArray(catalogo) ? catalogo.filter(esObjeto) : [];
  const delGuardado = (id) => {
    const item = guardado.find((p) => p.id === id);
    // v1.2 tenía un solo renglón de transversales: sirve para los dos pisos.
    if (!item && (id === INSUMO.TRANSVERSAL_PISO || id === INSUMO.TRANSVERSAL_PISO_2)) {
      return guardado.find((p) => p.id === 'transversal');
    }
    return item;
  };

  const fijos = CATALOGO_FIJO.map((base) => {
    const item = delGuardado(base.id);
    if (!item) return base;
    return {
      ...base,
      perfil: typeof item.perfil === 'string' ? item.perfil : base.perfil,
      precio: esPrecio(item.precio) ? item.precio : base.precio,
      largoBarra: base.largoBarra === null ? null
        : Number.isFinite(item.largoBarra) && item.largoBarra >= 1 && item.largoBarra <= 12 ? item.largoBarra : base.largoBarra,
    };
  });

  const ids = new Set();
  const paneles = guardado
    // v1.2: los paneles eran 'panelMuros' y 'panelTecho' sin categoría.
    .filter((p) => p.categoria === 'panel' || p.id === 'panelMuros' || p.id === 'panelTecho')
    .filter((p) => typeof p.id === 'string' && p.id && !ids.has(p.id) && ids.add(p.id))
    .map((p) => {
      const base = TIPOS_PANEL_INICIALES.find((t) => t.id === p.id) ?? TIPOS_PANEL_INICIALES[0];
      return {
        id: p.id,
        categoria: 'panel',
        nombre: typeof p.nombre === 'string' && p.nombre.trim() ? p.nombre : base.nombre,
        perfil: typeof p.perfil === 'string' ? p.perfil : base.perfil,
        unidad: 'm²',
        largoBarra: null,
        precio: esPrecio(p.precio) ? p.precio : base.precio,
        color: esColor(p.color) ? p.color : base.color,
      };
    });

  return [...fijos, ...(paneles.length > 0 ? paneles : TIPOS_PANEL_INICIALES)];
}
