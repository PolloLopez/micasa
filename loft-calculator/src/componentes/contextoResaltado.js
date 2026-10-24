// Contexto y hooks de "resaltar en el 3D" (v1.27). Los botones están en Resaltar.jsx.
import { createContext, useContext } from 'react';

export const ContextoResaltado = createContext(null);

/**
 * Manejadores para resaltar mientras el mouse está encima (o el foco adentro, con teclado).
 * Solo con mouse: en una pantalla táctil el "mouseenter" que inventa el navegador
 * al tocar dejaría el resaltado pegado; ahí se usa el 👁.
 */
function manejadores(contexto, criterio) {
  if (!contexto || !criterio) return {};
  const { alPasar } = contexto;
  return {
    onPointerEnter: (e) => { if (e.pointerType === 'mouse') alPasar(criterio); },
    onPointerLeave: (e) => { if (e.pointerType === 'mouse') alPasar(null); },
    onFocus: () => alPasar(criterio),
    // El foco que pasa de un campo a otro de adentro no suelta (evita redibujar el 3D dos veces).
    onBlur: (e) => { if (!e.currentTarget.contains(e.relatedTarget)) alPasar(null); },
  };
}

/** Para un solo bloque: `<section {...usePasarParaResaltar(criterio)}>`. */
export function usePasarParaResaltar(criterio) {
  return manejadores(useContext(ContextoResaltado), criterio);
}

/** Para una lista (los hooks no van dentro de un map): `const pasar = useResaltar(); <tr {...pasar(criterio)}>`. */
export function useResaltar() {
  const contexto = useContext(ContextoResaltado);
  return (criterio) => manejadores(contexto, criterio);
}

/** Criterio de un renglón del presupuesto: solo los de hierro (con piezas en el 3D). */
export const criterioDeRenglon = (item) =>
  (item.largosPiezas?.length > 0 ? { tipo: 'renglon', id: item.id, nombre: item.nombre } : null);
