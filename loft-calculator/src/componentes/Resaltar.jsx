// ==========================================================
// Resaltar en el 3D (v1.27): contexto, "pasar el mouse" y botón 👁
// ----------------------------------------------------------
// App.jsx guarda qué se resalta y lo comparte con un CONTEXTO de React
// (un valor que cualquier componente de adentro puede leer sin pasarlo
// de mano en mano por props). Así un renglón del presupuesto o un perfil
// de la lista pueden resaltar sin que App los conozca.
//
//   const pasar = usePasarParaResaltar(criterio);  <tr {...pasar}>
//   <BotonResaltar criterio={criterio} />           fija / suelta
//
// Criterios: ver motor/resaltado.js. `nombre` es el texto del cartel del 3D.
// ==========================================================

import { useContext } from 'react';
import { mismoCriterio } from '../motor/resaltado.js';
import { ContextoResaltado, usePasarParaResaltar } from './contextoResaltado.js';

/** Botón 👁: fija el resaltado (otro toque lo suelta). En el celular además muestra el 3D. */
export function BotonResaltar({ criterio, className = '' }) {
  const contexto = useContext(ContextoResaltado);
  if (!contexto || !criterio) return null;
  const fijado = mismoCriterio(contexto.fijo, criterio);
  return (
    <button type="button" className={`btn-resaltar no-print ${className}`.trim()} aria-pressed={fijado}
      title={fijado ? 'Dejar de resaltar en el 3D' : `Resaltar ${criterio.nombre} en el 3D`}
      aria-label={fijado ? `Dejar de resaltar ${criterio.nombre}` : `Ver ${criterio.nombre} en el 3D`}
      onClick={(e) => { e.stopPropagation(); contexto.alternarFijo(criterio); }}>
      <span aria-hidden="true">👁</span>
    </button>
  );
}

/** Un bloque (ej. una pared) que resalta sus piezas mientras el mouse está encima. */
export function ZonaResaltable({ criterio, className, children }) {
  const pasar = usePasarParaResaltar(criterio);
  return <div className={className} {...pasar}>{children}</div>;
}

