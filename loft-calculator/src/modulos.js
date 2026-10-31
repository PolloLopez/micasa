// ==========================================================
// MÓDULOS (v1.32.0): qué partes grandes del sistema están prendidas
// ----------------------------------------------------------
// Cada función grande (Terreno, y después Sol, Muebles…) es un MÓDULO que se
// puede apagar. Apagado, no se ve nada de él (tarjeta, capa del 3D, planos,
// resumen), pero los datos del proyecto se conservan: si se vuelve a prender,
// aparece todo igual.
//
// Hoy se decide POR INSTALACIÓN (decisión de Leandro, opción A): quien publica
// elige qué va prendido. Dos formas:
//   1) Editar ACTIVOS_EN_ESTA_INSTALACION acá abajo.
//   2) Sin tocar código, al compilar: VITE_MODULOS_APAGADOS="terreno,muebles"
//      (útil para publicar una versión "solo estructuras").
// Más adelante (usuarios y permisos, opción C) los mismos interruptores pueden
// venir del superadmin: moduloActivo() es el único lugar que pregunta.
// ==========================================================

/** Los módulos que existen, con lo que se le muestra a quien administra. */
export const MODULOS = {
  terreno: {
    nombre: 'Terreno e implantación',
    descripcion: 'Lote, ubicación de la casa, retiros, pozo, árboles, accesos y norte (3D, Planos y PDF).',
    desde: '1.32.0',
  },
  sol: {
    nombre: 'Sol',
    descripcion: 'Luz del sol de un día y una hora, sombras, animación del día y por qué aberturas entra.',
    desde: '1.37.0',
  },
};

// 👉 Lo que va prendido en esta publicación (pollolopez.github.io/micasa).
const ACTIVOS_EN_ESTA_INSTALACION = {
  terreno: true,
  sol: true,
};

const entorno = typeof import.meta !== 'undefined' ? import.meta.env ?? {} : {};

/** Lista "a, b,c" → ['a', 'b', 'c'] (sin espacios ni vacíos). */
const lista = (texto) => String(texto ?? '').split(',').map((s) => s.trim()).filter(Boolean);

/**
 * Arma la configuración: lo del archivo, menos lo que se apague al compilar.
 * Un módulo que no está en el archivo queda apagado (lo nuevo no aparece solo).
 */
export function configDeModulos(activos = ACTIVOS_EN_ESTA_INSTALACION, apagados = lista(entorno.VITE_MODULOS_APAGADOS)) {
  return Object.fromEntries(Object.keys(MODULOS).map((clave) => [clave, activos[clave] === true && !apagados.includes(clave)]));
}

const CONFIG = configDeModulos();

/** ¿Está prendido este módulo? (el único lugar de la app que lo decide) */
export const moduloActivo = (clave, config = CONFIG) => config[clave] === true;

/** Los módulos prendidos, para mostrarlos en la ayuda. */
export const modulosActivos = (config = CONFIG) => Object.keys(MODULOS).filter((c) => moduloActivo(c, config));
