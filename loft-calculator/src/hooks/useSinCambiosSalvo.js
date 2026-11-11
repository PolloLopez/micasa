// ==========================================================
// useSinCambiosSalvo (v1.47)
// ----------------------------------------------------------
// Devuelve el MISMO objeto que la vez anterior si solo cambiaron las claves
// de `ignorar` (comparando cada clave de arriba con ===). Sirve para que
// cargar un pago del seguimiento no vuelva a calcular la estructura, el
// presupuesto y el 3D (que dependen de `params`, pero no del seguimiento).
// Funciona porque cada cambio crea objetos nuevos solo en el camino que
// cambia (ver conValor): lo demás conserva su identidad.
// ==========================================================

import { useState } from 'react';

/** ¿a y b tienen lo mismo en todas las claves de arriba, salvo las de `ignorar`? */
export function igualesSalvo(a, b, ignorar) {
  if (a === b) return true;
  if (!a || !b) return false;
  const claves = new Set([...Object.keys(a), ...Object.keys(b)]);
  return [...claves].every((k) => ignorar.includes(k) || a[k] === b[k]);
}

export function useSinCambiosSalvo(objeto, ignorar) {
  // Se guarda el último objeto "distinto" en un estado; actualizarlo durante el render es el patrón que React
  // recomienda para "acordarse del valor anterior" (vuelve a renderizar enseguida, sin efectos de por medio).
  const [guardado, setGuardado] = useState(objeto);
  if (igualesSalvo(guardado, objeto, ignorar)) return guardado;
  setGuardado(objeto);
  return objeto;
}
