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
// v1.4 -> v1.5:
//   - nuevo: piezasEliminadas (IDs de piezas quitadas a mano).
// v1.6 -> v1.7:
//   - nuevo: escalera (se agrega desactivada).
// v1.7 -> v1.8:
//   - escalera.escalonesHastaDescanso (un número) pasa a escalera.descansos (lista).
//   - nuevo: piezasEditadas (recortes, movimientos y perfil de piezas sueltas).
//   - cada pared: etiqueta del 3D (texto propio) y si se muestra.
// v1.8 -> v1.9:
//   - nuevo: tipoProyecto ('construccion' | 'grada') y datos de la grada.
//   - escalera.riostras (cruces entre parantes), desactivada.
// v1.11 -> v1.12:
//   - tipos de panel: colorInterior (cara de adentro); los viejos toman el gris claro de fábrica.
// v1.10 -> v1.11:
//   - nuevo: montaje industrial (componentes); los proyectos viejos traen el de ejemplo, sin usarlo.
// v1.16 -> v1.17:
//   - cada pared: separacionMontantes (0 = sin) y riostras ('no' | 'extremos' | 'todos').
//   - las aberturas pueden traer etiqueta y mostrarEtiqueta (si faltan: sin texto, se muestra el número).
// v1.15 -> v1.16:
//   - nuevo: piezasAgregadas (piezas duplicadas a mano, ver motor/piezasAgregadas.js).
// v1.14 -> v1.15:
//   - tipos de panel = revestimientos: venta (a medida / estándar), ancho útil, largo máximo, solape,
//     medida de placa, espesor y ubicación. Los viejos pasan a "a medida", 1 m de ancho útil.
//   - cada pared: panelInterior ('' = sin revestimiento interior).
// v1.13 -> v1.14:
//   - entrepiso parcial: largoEntrepiso (0 = todo el lado, como antes), referencia y distancia.
//   - separacionColumnasEntrepiso: los proyectos viejos toman la de las verticales de la pared
//     donde se apoya el entrepiso, que era la regla de antes => mismas columnas.
// ==========================================================

import { LADOS, INSUMO, CAMPOS_PERFIL_PARED } from './constantes.js';
import { PARAMS_INICIALES } from './parametrosIniciales.js';
import { CATALOGO_FIJO, TIPOS_PANEL_INICIALES } from './presupuesto.js';
import { ESCALERA_INICIAL } from './escalera.js';
import { GRADA_INICIAL } from './grada.js';
import { MONTAJE_INICIAL } from './montaje.js';
import { REVESTIMIENTO_POR_DEFECTO, LIMITES_REVESTIMIENTO, VENTAS, UBICACIONES } from './revestimientos.js';
import { TIPOS_PERFIL, LIMITES_PERFIL, revisarPerfil, armarListaDePerfiles } from './perfiles.js';

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
  nuevos.compartirCortes = nuevos.compartirCortes !== false; // v1.19.1: por defecto sí (solo un false explícito lo apaga)
  nuevos.panelTecho ??= PARAMS_INICIALES.panelTecho;
  nuevos.piezasEliminadas ??= []; // v1.5
  // v1.7: los proyectos viejos se abren SIN escalera (no se agrega nada que no tenían).
  nuevos.escalera = esObjeto(nuevos.escalera) ? { ...ESCALERA_INICIAL, activa: false, ...nuevos.escalera } : { ...ESCALERA_INICIAL, activa: false };
  // v1.8: el descanso único de la L pasa a una lista de descansos.
  const escaleraGuardada = esObjeto(params.escalera) ? params.escalera : {};
  const { escalonesHastaDescanso, ...escaleraSinCampoViejo } = nuevos.escalera;
  nuevos.escalera = {
    ...escaleraSinCampoViejo,
    descansos: Array.isArray(escaleraGuardada.descansos) ? [...escaleraGuardada.descansos]
      : Number.isInteger(escalonesHastaDescanso) ? [escalonesHastaDescanso]
        : [...ESCALERA_INICIAL.descansos],
  };
  nuevos.piezasEditadas ??= {}; // v1.8
  nuevos.piezasAgregadas ??= []; // v1.16: piezas duplicadas a mano
  nuevos.escalera.riostras ??= false; // v1.9
  nuevos.tipoProyecto ??= 'construccion'; // v1.9: todo lo anterior es una construcción
  nuevos.grada = esObjeto(nuevos.grada) ? { ...GRADA_INICIAL, ...nuevos.grada } : { ...GRADA_INICIAL };
  nuevos.montaje = esObjeto(nuevos.montaje) ? nuevos.montaje : structuredClone(MONTAJE_INICIAL); // v1.11
  // v1.14: entrepiso parcial. Sin estos datos el entrepiso sigue ocupando todo el lado.
  nuevos.largoEntrepiso ??= 0;
  nuevos.referenciaEntrepiso ??= 'izquierda';
  nuevos.distanciaEntrepiso ??= 0;
  nuevos.separacionColumnasEntrepiso ??=
    nuevos.paredes?.[nuevos.ladoEntrepiso]?.separacionVerticales ?? PARAMS_INICIALES.separacionColumnasEntrepiso;

  if (esObjeto(nuevos.paredes)) {
    nuevos.paredes = Object.fromEntries(
      LADOS.map((lado) => {
        const pared = nuevos.paredes[lado];
        return [lado, esObjeto(pared) ? {
          ...pared,
          panel: pared.panel ?? PARAMS_INICIALES.paredes[lado].panel,
          panelInterior: typeof pared.panelInterior === 'string' ? pared.panelInterior : '', // v1.15: '' = sin revestimiento interior
          separacionMontantes: pared.separacionMontantes ?? 0, // v1.17: sin montantes (como antes)
          riostras: pared.riostras ?? 'no', // v1.17: sin riostras en cruz (como antes)
          etiqueta: pared.etiqueta ?? '', // v1.8: '' = nombre automático (Frente, Lateral…)
          mostrarEtiqueta: pared.mostrarEtiqueta ?? true,
          // v1.22: perfiles por pared; '' = el general (como antes).
          ...Object.fromEntries(CAMPOS_PERFIL_PARED.map((c) => [c, typeof pared[c] === 'string' ? pared[c] : ''])),
        } : pared];
      })
    );
  }
  return nuevos;
}

/** Datos de venta/ubicación de un tipo de revestimiento: los válidos se guardan, el resto de fábrica. */
function datosDeRevestimiento(p) {
  const d = REVESTIMIENTO_POR_DEFECTO;
  const numero = (campo) => {
    const { min, max } = LIMITES_REVESTIMIENTO[campo];
    return Number.isFinite(p[campo]) && p[campo] >= min && p[campo] <= max ? p[campo] : d[campo];
  };
  const largoMaximo = numero('largoMaximo');
  const solape = numero('solape');
  return {
    venta: VENTAS.includes(p.venta) ? p.venta : d.venta,
    anchoUtil: numero('anchoUtil'),
    largoMaximo,
    solape: solape < largoMaximo ? solape : 0, // un solape igual al largo no avanzaría nunca
    anchoPlaca: numero('anchoPlaca'),
    largoPlaca: numero('largoPlaca'),
    espesor: numero('espesor'),
    ubicacion: UBICACIONES.includes(p.ubicacion) ? p.ubicacion : d.ubicacion,
  };
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
    // v1.22: antes las esquinas eran columnas comunes: arrancan con el mismo perfil y precio que Columnas.
    if (!item && id === INSUMO.COLUMNA_ESQUINA) {
      const columna = guardado.find((p) => p.id === INSUMO.COLUMNA);
      return columna && { ...columna, id: INSUMO.COLUMNA_ESQUINA };
    }
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
      // v1.21: el perfil de la lista que usa (si no hay, se arma desde el texto de abajo).
      ...(typeof item.perfilId === 'string' || item.perfilId === null ? { perfilId: item.perfilId } : {}),
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
        // v1.12: color de la cara interior (antes un solo color).
        colorInterior: esColor(p.colorInterior) ? p.colorInterior : base.colorInterior,
        // v1.15: cómo se vende y dónde va. Los viejos pasan a "a medida" de 1 m de ancho útil.
        ...datosDeRevestimiento(p),
      };
    });

  // v1.21: lista de perfiles. Los guardados válidos se conservan; los usos sin perfil
  // de la lista (proyectos viejos) arman la suya desde el texto que tenían.
  const perfilesGuardados = guardado.filter((p) => p.categoria === 'hierro').map(normalizarPerfil).filter(Boolean)
    .filter((p, i, lista) => lista.findIndex((q) => q.id === p.id) === i);
  const { usos, perfiles } = armarListaDePerfiles(fijos.filter((i) => i.categoria === 'perfil'), perfilesGuardados);
  const conPerfil = fijos.map((i) => usos.find((u) => u.id === i.id) ?? i);

  return [...conPerfil, ...(paneles.length > 0 ? paneles : TIPOS_PANEL_INICIALES), ...perfiles];
}

/** Un perfil de la lista guardado: se conserva si es válido; si no, se descarta (null). */
function normalizarPerfil(p) {
  if (typeof p.id !== 'string' || !p.id || !TIPOS_PERFIL[p.tipo]) return null;
  const num = (v) => (Number.isFinite(v) ? v : 0);
  const perfil = {
    id: p.id,
    categoria: 'hierro',
    tipo: p.tipo,
    a: num(p.a), b: num(p.b), c: num(p.c), espesor: num(p.espesor),
    texto: typeof p.texto === 'string' ? p.texto.slice(0, 120) : '',
    kgm: Number.isFinite(p.kgm) && p.kgm >= LIMITES_PERFIL.kgm.min && p.kgm <= LIMITES_PERFIL.kgm.max ? p.kgm : 0,
    largoBarra: Number.isFinite(p.largoBarra) && p.largoBarra >= LIMITES_PERFIL.largoBarra.min && p.largoBarra <= LIMITES_PERFIL.largoBarra.max ? p.largoBarra : 6,
    precio: esPrecio(p.precio) ? p.precio : 0,
    ...(p.revisarPrecio === true ? { revisarPrecio: true } : {}),
  };
  return revisarPerfil(perfil) ? null : perfil;
}
