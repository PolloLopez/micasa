// ==========================================================
// CampoSeparacion (v1.27)
// ----------------------------------------------------------
// Una separación que se puede cargar de dos maneras:
//   [Medida]    "Sep. columnas 2.50 m"  → abajo: "= 4 columnas"
//   [Cantidad]  "Columnas 4 u"          → abajo: "cada 2.50 m"
// Al cambiar de modo se pasa el valor de uno al otro (ver cambiarModo en
// App.jsx), así no salta la estructura.
//
// Con `casilla` (campos opcionales, ej. montantes) primero va la casilla
// "Lleva montantes"; el selector de modo aparece cuando está tildada.
// ==========================================================

import { useRef, useState } from 'react';
import CampoNumero from './CampoNumero.jsx';

const FACTOR = { m: 1, cm: 100, mm: 1000 };
const DECIMALES = { m: 2, cm: 1, mm: 0 };
const formatearMedida = (metros, unidad) => `${(metros * FACTOR[unidad]).toFixed(DECIMALES[unidad])} ${unidad}`;

/** Texto de abajo: lo que sale del otro modo. */
function textoDerivado({ porCantidad, info, piezas, unidad }) {
  if (porCantidad) {
    if (info.porVano) return 'repartidos parejo en cada vano entre columnas';
    if (info.separacion > 0) return `una cada ${formatearMedida(info.separacion, unidad)}`;
    return info.separacion === null ? 'repartidas parejo en cada borde' : '';
  }
  return info.cantidad > 0 ? `= ${info.cantidad} ${info.cantidad === 1 ? piezas[0] : piezas[1]}` : '';
}

export default function CampoSeparacion({
  etiqueta, etiquetaCantidad, piezas, valor, cantidad, info, unidad,
  onCambioMedida, onCambioCantidad, onCambiarModo, casilla, valorPorDefecto,
}) {
  const porCantidad = cantidad !== null;
  const ultimoValor = useRef(null); // medida que tenía al destildar
  const [errorCasilla, setErrorCasilla] = useState(null);
  const activo = !casilla || valor > 0 || cantidad > 0;

  const alCambiarCantidad = (n) => {
    if (!Number.isInteger(n)) return 'Ingresá un número entero';
    if (casilla && n === 0) return 'Para que no lleve, destildá la casilla';
    return onCambioCantidad(n);
  };

  const selectorModo = (
    <div className="modo-separacion" role="group" aria-label={`Cargar ${piezas[1]} por`}>
      <button type="button" aria-pressed={!porCantidad} onClick={() => porCantidad && onCambiarModo('medida')}>Medida</button>
      <button type="button" aria-pressed={porCantidad} onClick={() => !porCantidad && onCambiarModo('cantidad')}>Cantidad</button>
    </div>
  );

  const derivado = textoDerivado({ porCantidad, info, piezas, unidad });

  /** Casilla de los opcionales: destildar = no lleva (medida 0, sin cantidad); tildar = vuelve el último valor. */
  const alTildar = (e) => {
    if (e.target.checked) {
      setErrorCasilla(onCambioMedida(ultimoValor.current ?? valorPorDefecto));
      return;
    }
    if (!porCantidad) ultimoValor.current = valor;
    setErrorCasilla(onCambiarModo('sin'));
  };
  const alCambiarMedida = (v) => (casilla && !(v > 0) ? 'Para que no lleve, destildá la casilla' : onCambioMedida(v));

  return (
    <div className={`campo-separacion${activo ? '' : ' apagado'}`}>
      {casilla && (
        <label className="casilla-opcional">
          <input type="checkbox" checked={activo} onChange={alTildar} />
          {casilla}
        </label>
      )}
      {errorCasilla && <small className="error" role="alert">{errorCasilla}</small>}
      {activo && selectorModo}
      {activo && (porCantidad
        ? <CampoNumero etiqueta={etiquetaCantidad} valor={cantidad} decimales={0} sufijo="u" onCambio={alCambiarCantidad} />
        : <CampoNumero etiqueta={etiqueta} unidad={unidad} valor={valor} onCambio={alCambiarMedida} />)}
      {activo && derivado && <small className="derivado" aria-live="polite">{derivado}</small>}
    </div>
  );
}
