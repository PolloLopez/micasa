// ==========================================================
// FilaPiezaCambiada (v1.64): un renglón de "Piezas agregadas, eliminadas y
// editadas". Pedido de Leandro: "antes de elegir si quiero restaurarla
// debería aparecerme sombreada y los detalles de sus características".
//   - Con el mouse encima (o el 👁 en el celular) la pieza se pinta en el
//     3D; si está eliminada se dibuja como fantasma en su lugar.
//   - Debajo, sus características: perfil, largo, si es vertical u
//     horizontal y a qué altura.
// Va en un componente aparte porque usa el contexto de resaltado, que App
// provee pero no puede leer desde adentro de sí mismo.
// ==========================================================

import { usePasarParaResaltar } from './contextoResaltado.js';
import { BotonResaltar } from './Resaltar.jsx';

/**
 * @param id        id de la pieza (el mismo que guarda params)
 * @param titulo    texto principal (ej. "Columna · Frente · 2,45 m")
 * @param detalles  características (string[]); vacío si la pieza ya no existe
 * @param accion    { texto, alHacer } el botón (Restaurar, Quitar, Deshacer)
 */
export default function FilaPiezaCambiada({ id, titulo, detalles = [], accion, children }) {
  const criterio = detalles.length > 0 ? { tipo: 'pieza', id: [id], nombre: titulo } : null;
  const pasar = usePasarParaResaltar(criterio);
  return (
    <li className="abertura pieza-eliminada" {...pasar}>
      <span>
        {titulo}{children}
        <small className="detalle"> · {id}</small>
        {detalles.length > 0 && <small className="detalles-pieza">{detalles.join(' · ')}</small>}
      </span>
      <span className="acciones-pieza">
        <BotonResaltar criterio={criterio} />
        <button className="btn-sec no-print" onClick={accion.alHacer}>{accion.texto}</button>
      </span>
    </li>
  );
}
