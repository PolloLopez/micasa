// ==========================================================
// SelectorLado: elige uno de los 4 lados (A, B, C, D) mostrando
// su nombre según el frente actual ("Fondo · lado C · 7,50 m").
// Igual que CampoNumero, `onCambio` devuelve un error o null.
// ==========================================================

import { useId, useState } from 'react';
import { LADOS } from '../motor/constantes.js';
import { nombreLado, largoLado } from '../motor/geometria.js';

export default function SelectorLado({ etiqueta, valor, params, onCambio, ocultarFrente = false }) {
  const id = useId();
  const [error, setError] = useState(null);

  const alCambiar = (e) => setError(onCambio(e.target.value));

  return (
    <div className={`group${error ? ' con-error' : ''}`}>
      <label htmlFor={id}>{etiqueta}</label>
      <select id={id} value={valor} onChange={alCambiar}>
        {LADOS.map((lado) => (
          <option key={lado} value={lado}>
            {ocultarFrente ? '' : `${nombreLado(lado, params.ladoFrente)} · `}lado {lado} · {largoLado(lado, params).toFixed(2)} m
          </option>
        ))}
      </select>
      {error && <small className="error" role="alert">{error}</small>}
    </div>
  );
}
