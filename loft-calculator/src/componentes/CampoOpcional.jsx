// ==========================================================
// CampoOpcional (v1.19)
// ----------------------------------------------------------
// Reemplaza los campos "(0 = sin)": una CASILLA dice si la cosa va o no
// ("☑ Lleva montantes") y, si va, aparece el número ("cada 0.60 m").
//
// En el proyecto se sigue guardando igual que antes: 0 = no lleva. Así
// los proyectos viejos se abren sin migrar nada.
//
//   - Destildar  -> guarda 0.
//   - Tildar     -> vuelve al último valor que tuvo (o a `valorPorDefecto`).
//   - Con la casilla tildada no se acepta 0: para sacarlo se destilda.
//     (Si no, al escribir "0.6" el "0" del principio apagaría la casilla.)
// ==========================================================

import { useRef, useState } from 'react';
import CampoNumero from './CampoNumero.jsx';

export default function CampoOpcional({
  casilla, etiqueta, valor, onCambio, valorPorDefecto, unidad, sufijo, decimales,
}) {
  const activo = valor > 0;
  // Valor que tenía al destildar: para devolverlo al volver a tildar.
  const ultimoValor = useRef(null);
  // Si tildar o destildar no se puede (ej. el valor ya no entra), se avisa al lado de la casilla.
  const [errorCasilla, setErrorCasilla] = useState(null);

  const alTildar = (e) => {
    if (e.target.checked) {
      setErrorCasilla(onCambio(ultimoValor.current ?? valorPorDefecto));
    } else {
      const error = onCambio(0);
      if (!error) ultimoValor.current = valor;
      setErrorCasilla(error);
    }
  };

  const alCambiarNumero = (numero) =>
    numero > 0 ? onCambio(numero) : 'Para que no lleve, destildá la casilla';

  return (
    <div className={`campo-opcional${activo ? '' : ' apagado'}`}>
      <label className="casilla-opcional">
        <input type="checkbox" checked={activo} onChange={alTildar} />
        {casilla}
      </label>
      {errorCasilla && <small className="error" role="alert">{errorCasilla}</small>}
      {activo && (
        <CampoNumero etiqueta={etiqueta} valor={valor} onCambio={alCambiarNumero}
          unidad={unidad} sufijo={sufijo} decimales={decimales} />
      )}
    </div>
  );
}
