// ==========================================================
// CampoSelect: lista desplegable con etiqueta.
// Se usa en las aberturas (tipo, desde qué esquina) y en el
// entrepiso parcial. Si `onCambio` devuelve un texto, es un error
// de validación y se muestra debajo (igual que CampoNumero).
// ==========================================================

import { useId, useState } from 'react';

export default function CampoSelect({ etiqueta, valor, opciones, onCambio }) {
  const id = useId();
  const [error, setError] = useState(null);
  return (
    <div className={`group${error ? ' con-error' : ''}`}>
      <label htmlFor={id}>{etiqueta}</label>
      <select id={id} value={valor} onChange={(e) => setError(onCambio(e.target.value) ?? null)}>
        {opciones.map(([v, texto]) => <option key={v} value={v}>{texto}</option>)}
      </select>
      {error && <small className="error" role="alert">{error}</small>}
    </div>
  );
}
