// ==========================================================
// CampoNumero
// ----------------------------------------------------------
// Input numérico que:
//   - muestra el valor en la unidad elegida (m / cm / mm) o sin unidad;
//   - mientras escribís, NO reformatea (antes "7." saltaba a "7.00");
//   - acepta coma o punto decimal;
//   - solo guarda valores válidos: `onCambio` devuelve un mensaje de
//     error (y entonces no se guarda) o null si está todo bien;
//   - si lo escrito no vale, al salir del campo NO se borra: queda lo
//     escrito con el aviso (y el aviso dice qué valor se sigue usando)
//     hasta que se corrija; Esc vuelve al último valor válido (v1.18.1).
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

  // Con un error a la vista se sigue mostrando lo escrito (antes volvía solo al valor anterior, sin avisar).
  const mostrado = editando || error ? texto : formatear(valor, unidad, decimales);

  const alEnfocar = () => {
    if (!error) setTexto(formatear(valor, unidad, decimales)); // con error se sigue editando lo escrito
    setEditando(true);
  };

  /** Esc: descarta lo escrito y vuelve al último valor válido. */
  const alTeclear = (e) => {
    if (e.key !== 'Escape' || !error) return;
    setError(null);
    setTexto(formatear(valor, unidad, decimales));
  };

  const alEscribir = (e) => {
    const nuevoTexto = e.target.value;
    setTexto(nuevoTexto);
    const numero = interpretar(nuevoTexto, unidad);
    setError(Number.isFinite(numero) ? onCambio(numero) : 'Ingresá un número');
  };

  const alSalir = () => setEditando(false); // el error (si hay) queda a la vista

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
        onKeyDown={alTeclear}
        aria-invalid={Boolean(error)}
      />
      {error && (
        <small className="error" role="alert">
          {error}{!editando && ` · se sigue usando ${formatear(valor, unidad, decimales)} (Esc para volver)`}
        </small>
      )}
    </div>
  );
}
