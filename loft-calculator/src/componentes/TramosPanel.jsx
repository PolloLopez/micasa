// ==========================================================
// TramosPanel (v1.96): otro panel en una parte de la pared o del techo
// ----------------------------------------------------------
// Pedido de Leandro (25/11): "algunos van a ser un modelo distinto, sin
// revestimiento interior, chapa-foil en cocina y baño, y chapa-chapa en el
// resto". Cada tramo: desde, hasta (m) y el panel; lo demás lleva el panel
// de la pared (o del techo). La cuenta está en motor/tramosPanel.js.
// ==========================================================

import CampoNumero from './CampoNumero.jsx';
import { errorDeTramo, segmentosDePanel } from '../motor/tramosPanel.js';

const m = (n) => n.toFixed(2).replace('.', ',');

/**
 * @param tramos     los guardados ([{ desde, hasta, panel }])
 * @param largo      el largo de la pared (o del techo)
 * @param panelBase  el panel de la pared (lo que no cae en un tramo)
 * @param paneles    los tipos de panel del catálogo
 * @param desdeDonde cómo se mide ("desde la esquina izquierda, vista desde afuera")
 * @param onCambiar  (tramosNuevos) => void
 */
export default function TramosPanel({ tramos = [], largo, panelBase, paneles, desdeDonde, unidad, onCambiar }) {
  const nombre = (id) => paneles.find((p) => p.id === id)?.nombre ?? id;
  const cambiarTramo = (i, cambio) => {
    const nuevo = { ...tramos[i], ...cambio };
    const error = errorDeTramo(nuevo, largo);
    if (error) return error;
    onCambiar(tramos.map((t, k) => (k === i ? nuevo : t)));
    return null;
  };
  const otroPanel = paneles.find((p) => p.id !== panelBase)?.id ?? panelBase;
  const agregar = () => {
    // El tramo nuevo arranca donde termina el último (o en la mitad), de 1 m.
    const desde = Math.min(largo - 0.5, tramos.length ? Math.max(...tramos.map((t) => t.hasta)) : largo / 2);
    onCambiar([...tramos, { desde: Math.max(0, desde), hasta: Math.min(largo, desde + 1), panel: otroPanel }]);
  };
  const segmentos = segmentosDePanel(largo, panelBase, tramos);
  return (
    <div className="tramos-panel">
      <h4 className="subtitulo-pared">Otro panel en una parte <small>({desdeDonde})</small></h4>
      {tramos.map((t, i) => (
        <div key={i} className="fila-tramo-panel">
          <CampoNumero etiqueta="Desde" unidad={unidad} valor={t.desde} onCambio={(v) => cambiarTramo(i, { desde: v })} />
          <CampoNumero etiqueta="Hasta" unidad={unidad} valor={t.hasta} onCambio={(v) => cambiarTramo(i, { hasta: v })} />
          <div className="group">
            <label>Panel
              <select value={t.panel} onChange={(e) => cambiarTramo(i, { panel: e.target.value })}>
                {paneles.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </label>
          </div>
          <button type="button" className="btn-del" aria-label={`Quitar el tramo de ${m(t.desde)} a ${m(t.hasta)} m`} title="Quitar"
            onClick={() => onCambiar(tramos.filter((_, k) => k !== i))}>✕</button>
        </div>
      ))}
      <button type="button" className="btn-sec" onClick={agregar}>+ Tramo con otro panel</button>
      {tramos.length > 0 && (
        <p className="nota">Queda: {segmentos.map((s) => `${m(s.x0)}–${m(s.x1)} m ${nombre(s.panel)}`).join(' · ')}</p>
      )}
    </div>
  );
}
