// ==========================================================
// SelectorColor (v1.38.2): el cuadradito de color de toda la app
// ----------------------------------------------------------
// Un <input type="color"> chico (clase "muestra") y, si el color es propio
// (distinto del de fábrica), un botón ↺ para volver al de fábrica.
// Lo usan la leyenda de capas, cada mueble y cada mesada: un solo lugar
// para el mismo control.
// ==========================================================

/**
 * @param valor        color elegido ('#rrggbb'), o '' = el de fábrica
 * @param porDefecto   color de fábrica (el que se muestra si valor es '')
 * @param onCambio     recibe el color nuevo ('#rrggbb')
 * @param onRestablecer vuelve al de fábrica (si falta, no hay botón ↺)
 * @param nombre       para los textos de ayuda ("Color de la tapa")
 */
export default function SelectorColor({ valor, porDefecto, onCambio, onRestablecer, nombre }) {
  const mostrado = valor || porDefecto;
  const propio = Boolean(onRestablecer) && mostrado.toLowerCase() !== porDefecto.toLowerCase();
  return (
    <span className="selector-color">
      <input type="color" className="muestra" value={mostrado} aria-label={`Color de ${nombre}`}
        title={`Cambiar el color de ${nombre}`} onChange={(e) => onCambio(e.target.value)} />
      {propio && (
        <button type="button" className="btn-restablecer" onClick={onRestablecer}
          aria-label={`Volver al color de fábrica de ${nombre}`} title="Volver al color de fábrica">↺</button>
      )}
    </span>
  );
}
