// ==========================================================
// Tarjeta: sección del panel que se puede plegar/desplegar
// tocando su título. Recuerda si estaba abierta (por navegador).
//
// Plegada, el contenido se oculta con CSS pero sigue montado:
// así no se pierde lo que se estaba escribiendo y al imprimir
// sale completo (ver @media print en App.css).
// ==========================================================

import { useId } from 'react';
import { useEstadoGuardado } from '../hooks/useEstadoGuardado.js';
import { BotonResaltar } from './Resaltar.jsx';
import { usePasarParaResaltar } from './contextoResaltado.js';

const esBooleano = (v) => typeof v === 'boolean';

/**
 * @param {string} id - nombre corto y fijo para recordar el estado (ej. 'paredes')
 * @param {React.ReactNode} titulo - texto del encabezado
 * @param {string} [className] - clases extra de la tarjeta (ej. 'presupuesto')
 * @param {object} [resaltar] - v1.27: criterio para resaltar sus piezas en el 3D (ver Resaltar.jsx)
 */
export default function Tarjeta({ id, titulo, className = '', resaltar = null, children }) {
  const [abierta, setAbierta] = useEstadoGuardado(`tarjeta.${id}`, true, esBooleano);
  const idCuerpo = useId();
  const pasar = usePasarParaResaltar(resaltar);

  return (
    <section className={`card ${className}${abierta ? '' : ' cerrada'}`.trim()} {...pasar}>
      <h2 className={resaltar ? 'con-resaltar' : undefined}>
        {/* aria-expanded: le dice a lectores de pantalla si está abierta o cerrada */}
        <button type="button" className="titulo-tarjeta" aria-expanded={abierta} aria-controls={idCuerpo}
          onClick={() => setAbierta((a) => !a)}>
          <span className="flecha" aria-hidden="true">▸</span>
          {titulo}
        </button>
        <BotonResaltar criterio={resaltar} />
      </h2>
      <div className="cuerpo-tarjeta" id={idCuerpo}>{children}</div>
    </section>
  );
}
