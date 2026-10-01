// ==========================================================
// PanelTiposPanel: lista editable de tipos de panel (ej. "Panel PUR
// 50 mm", "Chapa trapezoidal"). Cada pared y el techo eligen uno.
// Cada tipo tiene nombre, descripción, precio por m² y color (el 3D
// pinta cada pared con el color de su panel).
// Un tipo que está en uso no se puede borrar.
// ==========================================================

import CampoNumero from './CampoNumero.jsx';

const validarPrecio = (actualizar) => (v) => {
  if (v < 0) return 'No puede ser negativo';
  actualizar(Math.round(v));
  return null;
};

export default function PanelTiposPanel({ paneles, usosDePanel, onCambiar, onAgregar, onQuitar }) {
  return (
    <section className="card">
      <h2>Tipos de panel</h2>
      <p className="nota">Cada pared y el techo eligen su tipo de panel. El presupuesto suma los m² por tipo.</p>
      <ul className="opening-list">
        {paneles.map((panel) => {
          const usos = usosDePanel(panel.id);
          const motivoNoBorrar = usos.length > 0 ? `En uso: ${usos.join(', ')}` : paneles.length === 1 ? 'Tiene que quedar al menos uno' : null;
          return (
            <li key={panel.id} className="abertura">
              <div className="abertura-titulo">
                <input type="color" className="muestra" value={panel.color} aria-label={`Color de ${panel.nombre}`}
                  onChange={(e) => onCambiar(panel.id, 'color', e.target.value)} />
                <input className="perfil nombre-panel" value={panel.nombre} aria-label="Nombre del tipo de panel"
                  onChange={(e) => onCambiar(panel.id, 'nombre', e.target.value)} />
                <button className="btn-del no-print" onClick={() => onQuitar(panel.id)}
                  disabled={Boolean(motivoNoBorrar)} title={motivoNoBorrar ?? 'Quitar tipo de panel'}
                  aria-label={`Quitar ${panel.nombre}`}>✕</button>
              </div>
              <div className="grid-params">
                <div className="group">
                  <label htmlFor={`desc-${panel.id}`}>Descripción</label>
                  <input id={`desc-${panel.id}`} value={panel.perfil}
                    onChange={(e) => onCambiar(panel.id, 'perfil', e.target.value)} />
                </div>
                <CampoNumero etiqueta="Precio por m²" sufijo="$" decimales={0} valor={panel.precio}
                  onCambio={validarPrecio((v) => onCambiar(panel.id, 'precio', v))} />
              </div>
              <small className="detalle">{usos.length > 0 ? `Usado en: ${usos.join(', ')}` : 'Sin uso'}</small>
            </li>
          );
        })}
      </ul>
      <button className="btn-add no-print" onClick={onAgregar}>+ Agregar tipo de panel</button>
    </section>
  );
}
