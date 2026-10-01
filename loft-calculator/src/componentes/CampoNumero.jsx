// ==========================================================
// CampoNumero
// ----------------------------------------------------------
// Input numérico que:
//   - muestra el valor en la unidad elegida (m / cm / mm) o sin unidad;
//   - mientras escribís, NO reformatea (antes "7." saltaba a "7.00");
//   - acepta coma o punto decimal;
//   - solo guarda valores válidos: `onCambio` devuelve un mensaje de
//     error (y entonces no se guarda) o null si está todo bien;
//   - al salir del campo, vuelve a mostrar el último valor válido.
// ==========================================================

import { useId, useState } from 'react';

const FACTOR = { m: 1, cm: 100, mm: 1000 };
const DECIMALES = { m: 2, cm: 1, mm: 0 };

/** Metros -> texto en la unidad elegida. Sin unidad: número tal cual. */
function formatear(valor, unidad, decimales) {
  if (!unidad) return String(Number(valor.toFixed(decimales ?? 2)));
  return (valor * FACTOR[unidad]).toFixed(DECIMALES[unidad]);
}

/** Texto -> metros (o número sin unidad). NaN si no es un número. */
function interpretar(texto, unidad) {
  const limpio = texto.trim().replace(',', '.');
  if (limpio === '' || !/^-?\d*\.?\d*$/.test(limpio)) return NaN;
  const numero = parseFloat(limpio);
  return unidad ? numero / FACTOR[unidad] : numero;
}

export default function CampoNumero({ etiqueta, valor, unidad, onCambio, decimales, sufijo }) {
  const id = useId();
  const [texto, setTexto] = useState('');
  const [editando, setEditando] = useState(false);
  const [error, setError] = useState(null);

  const mostrado = editando ? texto : formatear(valor, unidad, decimales);

  const alEnfocar = () => {
    setTexto(formatear(valor, unidad, decimales));
    setEditando(true);
  };

  const alEscribir = (e) => {
    const nuevoTexto = e.target.value;
    setTexto(nuevoTexto);
    const numero = interpretar(nuevoTexto, unidad);
    setError(Number.isFinite(numero) ? onCambio(numero) : 'Ingresá un número');
  };

  const alSalir = () => {
    setEditando(false);
    setError(null);
  };

  return (
    <div className={`group${error ? ' con-error' : ''}`}>
      <label htmlFor={id}>
        {etiqueta}
        {(unidad || sufijo) && <span className="unidad"> ({unidad || sufijo})</span>}
      </label>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        value={mostrado}
        onFocus={alEnfocar}
        onChange={alEscribir}
        onBlur={alSalir}
        aria-invalid={Boolean(error)}
      />
      {error && <small className="error" role="alert">{error}</small>}
    </div>
  );
}
