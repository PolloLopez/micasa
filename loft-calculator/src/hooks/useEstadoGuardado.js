// ==========================================================
// useEstadoGuardado
// ----------------------------------------------------------
// Igual que useState, pero guarda el valor en localStorage
// (memoria del navegador) para que no se pierda al recargar.
//
// localStorage puede fallar (modo incógnito, almacenamiento
// bloqueado), por eso todo va dentro de try/catch: si falla,
// la app sigue andando sin guardar.
// ==========================================================

import { useEffect, useState } from 'react';

const PREFIJO = 'micasa.v2.'; // v2: lados A-D, paredes por panel y techo (2026-10). Cambiar si cambia la forma de los datos

function leer(clave, inicial, esValido, migrar) {
  try {
    const crudo = localStorage.getItem(PREFIJO + clave);
    if (crudo === null) return inicial;
    const valor = migrar(JSON.parse(crudo)); // datos de una versión anterior => forma actual
    return esValido(valor) ? valor : inicial;
  } catch {
    return inicial;
  }
}

/**
 * @param {string} clave - nombre con el que se guarda
 * @param {*} inicial - valor por defecto
 * @param {(valor) => boolean} esValido - descarta datos rotos
 * @param {(valor) => valor} migrar - convierte datos de versiones anteriores
 */
export function useEstadoGuardado(clave, inicial, esValido = () => true, migrar = (v) => v) {
  const [valor, setValor] = useState(() => leer(clave, inicial, esValido, migrar));

  useEffect(() => {
    try {
      localStorage.setItem(PREFIJO + clave, JSON.stringify(valor));
    } catch {
      // Sin almacenamiento disponible: no pasa nada, solo no se guarda.
    }
  }, [clave, valor]);

  return [valor, setValor];
}
