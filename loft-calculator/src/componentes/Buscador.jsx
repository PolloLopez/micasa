// ==========================================================
// Buscador (v1.84): la cajita "🔍 Buscar…" de las listas largas, con
// cuántas quedan ("12 de 230") y ✕ para borrar. Las cuentas en motor/buscar.js.
// ==========================================================

/**
 * @param valor, onCambio  lo escrito
 * @param ayuda            el texto gris de adentro ("columna, frente, 4,33…")
 * @param quedan, total    cuántas filas quedan y cuántas hay (para "12 de 230")
 */
export default function Buscador({ valor, onCambio, ayuda = 'Buscar…', quedan = null, total = null, etiqueta = 'Buscar en la lista' }) {
  return (
    <div className="buscador no-print" role="search">
      <span aria-hidden="true">🔍</span>
      <input type="search" value={valor} placeholder={ayuda} aria-label={etiqueta} onChange={(e) => onCambio(e.target.value)} />
      {valor && <button type="button" className="btn-mini" aria-label="Borrar la búsqueda" onClick={() => onCambio('')}>✕</button>}
      {valor && quedan !== null && <small className={quedan === 0 ? 'falta' : ''}>{quedan === 0 ? 'nada' : `${quedan}${total !== null ? ` de ${total}` : ''}`}</small>}
    </div>
  );
}
