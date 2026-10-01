// ==========================================================
// PanelAberturas: alta y baja de puertas/ventanas.
// La abertura nueva solo se agrega si entra en su pared.
// ==========================================================

import { useState } from 'react';
import CampoNumero from './CampoNumero.jsx';
import { validarAbertura } from '../motor/validacion.js';

const ABERTURA_NUEVA = {
  tipo: 'ventana', pared: 'frente', ladoReferencia: 'izquierda',
  offsetHorizontal: 1, alturaAntepecho: 1, ancho: 1.2, alto: 1,
};

const NOMBRE_PARED = { frente: 'Frente', fondo: 'Fondo', izquierda: 'Lat. izq.', derecha: 'Lat. der.' };

/** Para los campos de medida: solo se rechazan negativos. */
const noNegativo = (actualizar) => (valor) => {
  if (valor < 0) return 'No puede ser negativo';
  actualizar(valor);
  return null;
};

export default function PanelAberturas({ aberturas, params, unidad, onAgregar, onQuitar }) {
  const [nueva, setNueva] = useState(ABERTURA_NUEVA);
  const [error, setError] = useState(null);

  const cambiar = (campo, valor) => {
    setNueva((prev) => {
      const actualizada = { ...prev, [campo]: valor };
      // Una puerta arranca desde el piso.
      if (campo === 'tipo' && valor === 'puerta') actualizada.alturaAntepecho = 0;
      return actualizada;
    });
    setError(null);
  };

  const agregar = () => {
    const problema = validarAbertura(nueva, params);
    if (problema) {
      setError(problema);
      return;
    }
    onAgregar({ ...nueva, id: Date.now() });
  };

  return (
    <section className="card">
      <h2>Aberturas</h2>
      <div className="grid-params">
        <div className="group">
          <label htmlFor="ab-tipo">Tipo</label>
          <select id="ab-tipo" value={nueva.tipo} onChange={(e) => cambiar('tipo', e.target.value)}>
            <option value="ventana">Ventana</option>
            <option value="puerta">Puerta</option>
          </select>
        </div>
        <div className="group">
          <label htmlFor="ab-pared">Pared</label>
          <select id="ab-pared" value={nueva.pared} onChange={(e) => cambiar('pared', e.target.value)}>
            {Object.entries(NOMBRE_PARED).map(([valor, nombre]) => (
              <option key={valor} value={valor}>{nombre}</option>
            ))}
          </select>
        </div>
        <div className="group">
          <label htmlFor="ab-lado">Medir desde</label>
          <select id="ab-lado" value={nueva.ladoReferencia} onChange={(e) => cambiar('ladoReferencia', e.target.value)}>
            <option value="izquierda">Esquina izquierda</option>
            <option value="derecha">Esquina derecha</option>
          </select>
        </div>
        <CampoNumero etiqueta="Dist. a esquina" unidad={unidad} valor={nueva.offsetHorizontal}
          onCambio={noNegativo((v) => cambiar('offsetHorizontal', v))} />
        <CampoNumero etiqueta="Ancho" unidad={unidad} valor={nueva.ancho}
          onCambio={noNegativo((v) => cambiar('ancho', v))} />
        <CampoNumero etiqueta="Alto" unidad={unidad} valor={nueva.alto}
          onCambio={noNegativo((v) => cambiar('alto', v))} />
        {nueva.tipo === 'ventana' && (
          <CampoNumero etiqueta="Antepecho" unidad={unidad} valor={nueva.alturaAntepecho}
            onCambio={noNegativo((v) => cambiar('alturaAntepecho', v))} />
        )}
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      <button className="btn-add no-print" onClick={agregar}>+ Agregar abertura</button>

      <ul className="opening-list">
        {aberturas.length === 0 && <li className="vacio">Sin aberturas</li>}
        {aberturas.map((op) => (
          <li key={op.id}>
            <span>
              <strong>{op.tipo === 'puerta' ? 'Puerta' : 'Ventana'}</strong> · {NOMBRE_PARED[op.pared]} ·{' '}
              {op.ancho.toFixed(2)} × {op.alto.toFixed(2)} m · a {op.offsetHorizontal.toFixed(2)} m de la esq. {op.ladoReferencia}
              {op.alturaAntepecho > 0 && ` · antepecho ${op.alturaAntepecho.toFixed(2)} m`}
            </span>
            <button className="btn-del no-print" onClick={() => onQuitar(op.id)} aria-label="Quitar abertura">✕</button>
          </li>
        ))}
      </ul>
    </section>
  );
}
