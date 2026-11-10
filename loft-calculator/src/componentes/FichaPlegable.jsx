// ==========================================================
// FichaPlegable (v1.42.1): la ficha de una mesada, un tabique o un mueble
// ----------------------------------------------------------
// Se pliega tocando su título (queda solo el renglón con el nombre y las
// medidas). Arranca cerrada, salvo la recién agregada. Elegida en el 3D se
// abre sola y, al soltarla, vuelve a como estaba.
// ==========================================================

import { useId, useState } from 'react';
import { useEnFoco } from './contextoFoco.js';

/**
 * @param clave    'mesada:1', 'tabique:2', 'mueble:3' (la misma que arma focoDe)
 * @param encabezado lo que se ve siempre (nombre, medidas); el ✕ y otros botones van en `acciones`
 * @param abiertaAlInicio true para la recién agregada
 */
export default function FichaPlegable({ clave, className = '', encabezado, acciones = null, abiertaAlInicio = false, children }) {
  const [abierta, setAbierta] = useState(abiertaAlInicio);
  const { enFoco, ref } = useEnFoco({ item: clave });
  const visible = abierta || enFoco;
  const idCuerpo = useId();
  return (
    <section ref={ref} className={`elemento-terreno ficha-plegable ${className}${visible ? '' : ' cerrada'}${enFoco ? ' en-foco' : ''}`}>
      <header>
        <button type="button" className="titulo-ficha" aria-expanded={visible} aria-controls={idCuerpo} onClick={() => setAbierta(!visible)}>
          <span className="flecha" aria-hidden="true">▸</span>
          {encabezado}
        </button>
        {acciones}
      </header>
      {visible && <div id={idCuerpo} className="cuerpo-ficha">{children}</div>}
    </section>
  );
}
