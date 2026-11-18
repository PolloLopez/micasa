// ==========================================================
// SeccionPlegable (v1.65): un apartado de la pestaña Materiales
// (Proveedores, Perfiles, Revestimientos…) que se pliega tocando su título.
// Plegado queda el título con un resumen ("9 proveedores", "3 sin precio").
// Lo plegado se recuerda en este navegador (no viaja con el proyecto).
// ==========================================================

import { useId } from 'react';
import { useEstadoGuardado } from '../hooks/useEstadoGuardado.js';

/**
 * @param clave    nombre corto para recordar si quedó abierta ('proveedores', 'perfiles'…)
 * @param titulo   el título del apartado
 * @param resumen  lo que se ve al lado del título (también plegada)
 * @param plana    sin título ni plegado (cuando es lo único de su sub-pestaña)
 */
export default function SeccionPlegable({ clave, titulo, resumen = null, abiertaAlInicio = true, plana = false, children }) {
  const [abierta, setAbierta] = useEstadoGuardado(`seccionMateriales.${clave}`, abiertaAlInicio, (v) => typeof v === 'boolean');
  const idCuerpo = useId();
  // v1.73: sola en su sub-pestaña (el título ya lo dice la tarjeta): sin plegar ni repetir el título.
  if (plana) return <section className="seccion-plegable">{children}</section>;
  return (
    <section className={`seccion-plegable${abierta ? '' : ' cerrada'}`}>
      <h3 className="subtitulo">
        <button type="button" className="titulo-seccion" aria-expanded={abierta} aria-controls={idCuerpo} onClick={() => setAbierta(!abierta)}>
          <span className="flecha" aria-hidden="true">▸</span>
          {titulo}
          {resumen && <small className="resumen-seccion">{resumen}</small>}
        </button>
      </h3>
      {abierta && <div id={idCuerpo}>{children}</div>}
    </section>
  );
}
