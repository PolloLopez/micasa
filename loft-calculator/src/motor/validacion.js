// ==========================================================
// VALIDACIÓN DE PARÁMETROS Y ABERTURAS
// ----------------------------------------------------------
// Devuelve un objeto { campo: 'mensaje de error' }.
// Si el objeto está vacío, los datos son válidos.
// El cálculo y el visor 3D SOLO se ejecutan con datos válidos:
// así un "0" en un paso no puede colgar el navegador.
// ==========================================================

import { LIMITES, ALTURA_PISO_ALTILLO } from './constantes.js';

export function validarParametros(params) {
  const errores = {};

  Object.entries(LIMITES).forEach(([campo, { min, max, entero }]) => {
    const valor = params[campo];
    if (typeof valor !== 'number' || !Number.isFinite(valor)) {
      errores[campo] = 'Ingresá un número';
    } else if (entero && !Number.isInteger(valor)) {
      errores[campo] = 'Debe ser un número entero';
    } else if (valor < min) {
      errores[campo] = `Mínimo ${min}`;
    } else if (valor > max) {
      errores[campo] = `Máximo ${max}`;
    }
  });

  // Reglas que relacionan dos campos.
  if (!errores.anchoMezzanine && !errores.frente && params.anchoMezzanine > params.frente) {
    errores.anchoMezzanine = 'No puede superar el frente';
  }
  if (!errores.altura && params.anchoMezzanine > 0 && params.altura < ALTURA_PISO_ALTILLO + 0.5) {
    errores.altura = `Con altillo, la altura mínima es ${ALTURA_PISO_ALTILLO + 0.5} m`;
  }

  return errores;
}

/** Largo de la pared donde va la abertura. */
export function largoDePared(pared, params) {
  return pared === 'frente' || pared === 'fondo' ? params.frente : params.profundidad;
}

/**
 * Verifica que la abertura entre en su pared.
 * Devuelve un texto con el problema, o null si está bien.
 */
export function validarAbertura(abertura, params) {
  const { ancho, alto, offsetHorizontal, alturaAntepecho, pared } = abertura;
  if (!(ancho > 0) || !(alto > 0)) return 'Ancho y alto deben ser mayores a 0';
  if (offsetHorizontal < 0 || alturaAntepecho < 0) return 'Las distancias no pueden ser negativas';

  const largo = largoDePared(pared, params);
  if (offsetHorizontal + ancho > largo + 1e-9) {
    return `No entra en la pared (${largo.toFixed(2)} m): distancia + ancho = ${(offsetHorizontal + ancho).toFixed(2)} m`;
  }
  if (alturaAntepecho + alto > params.altura + 1e-9) {
    return `Supera la altura (${params.altura.toFixed(2)} m)`;
  }
  return null;
}
