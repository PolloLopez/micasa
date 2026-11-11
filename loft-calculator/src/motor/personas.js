// ==========================================================
// PERSONAS (v1.45): gente para recorrer la casa en el 3D
// ----------------------------------------------------------
// Pedido de Leandro (11/11): agregar personas con su altura y sexo, que
// caminen por la casa y se agachen a buscar cosas ("algo básico como Los
// Sims"). Se guardan en el proyecto solo sus datos (nombre, altura, sexo,
// nivel y color de la ropa); dónde están parados es de la sesión (arrancan
// en el medio del piso). No van al presupuesto.
// ==========================================================

import { colorOpcional } from './interiores.js';

export const SEXOS = [['mujer', 'Mujer'], ['hombre', 'Hombre']];

/** Altura de fábrica según el sexo (promedios redondeados). */
export const ALTURA_SEGUN_SEXO = { mujer: 1.62, hombre: 1.75 };

const COLORES_ROPA = ['#2563eb', '#dc2626', '#16a34a', '#9333ea', '#ea580c', '#0891b2'];

/** Persona nueva: se alternan mujer y hombre para que las primeras dos ya se distingan. */
export function personaNueva(personas, id) {
  const sexo = personas.length % 2 === 0 ? 'mujer' : 'hombre';
  return {
    id, nombre: `Persona ${personas.length + 1}`, sexo, altura: ALTURA_SEGUN_SEXO[sexo], nivel: 'piso',
    colorRopa: COLORES_ROPA[personas.length % COLORES_ROPA.length],
  };
}

export function validarPersona(p, params) {
  if (!SEXOS.some(([v]) => v === p.sexo)) return 'Elegí mujer u hombre';
  if (!(Number.isFinite(p.altura) && p.altura >= 0.5 && p.altura <= 2.3)) return 'La altura va de 0,50 a 2,30 m';
  if (!['piso', 'piso2'].includes(p.nivel)) return 'Elegí planta baja o piso 2';
  if (p.nivel === 'piso2' && !(params.anchoEntrepiso > 0)) return 'No hay entrepiso';
  if (typeof p.nombre !== 'string' || p.nombre.length > 40) return 'El nombre puede tener hasta 40 letras';
  if (!colorOpcional(p.colorRopa)) return 'Color inválido';
  return null;
}

/** Completa una persona guardada (por si en otra versión se agregan campos). */
export function completarPersona(p) {
  return { nivel: 'piso', colorRopa: '', ...p };
}
