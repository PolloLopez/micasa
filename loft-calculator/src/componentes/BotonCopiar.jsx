// ==========================================================
// BotonCopiar: copia un texto al portapapeles y dice "✓ Copiado" un rato.
// (Estaba dentro de TablaPresupuesto; v1.79.1 lo usa también "Copiar pedido
// para cotizar" en cada parte de la obra.)
// ==========================================================

import { useState } from 'react';

/**
 * @param texto   función que arma el texto (se llama recién al tocar, así no se calcula de más)
 * @param etiqueta lo que dice el botón
 * @param ayuda   el cartelito al pasar el mouse
 */
export default function BotonCopiar({ texto, etiqueta, ayuda }) {
  const [copiado, setCopiado] = useState(false);
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(texto());
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setCopiado(false); // sin permiso para copiar: no pasa nada
    }
  };
  return <button type="button" className="btn-sec btn-pedido" onClick={copiar} title={ayuda}>{copiado ? '✓ Copiado' : etiqueta}</button>;
}
