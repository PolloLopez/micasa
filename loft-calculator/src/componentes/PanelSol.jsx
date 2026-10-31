// ==========================================================
// PanelSol (v1.37): el día y la hora del sol en el 3D
// ----------------------------------------------------------
// Se abre con "☀ Sol" en el visor. Fecha, hora (con animación del día) y
// atajos (invierno, verano, equinoccio). Muestra dónde está el sol y por
// qué aberturas entra. El cálculo está en motor/sol.js; la luz y las
// sombras las pone LoftCanvas.
// ==========================================================

import { rumboDelAzimut } from '../motor/sol.js';

const hhmm = (h) => {
  const total = Math.round(h * 60);
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

/** Fechas de referencia (hemisferio sur): el sol más bajo, el más alto y el del medio. */
const ATAJOS = [['Invierno', '06-21'], ['Verano', '12-21'], ['Equinoccio', '03-20']];

/**
 * @param estado  { fecha: 'AAAA-MM-DD', hora: número, animando: bool }
 * @param info    { altura, azimut, salida, puesta, aberturas: [{ numero, abertura }] }
 * @param sinTerreno true si la obra no tiene terreno: el norte se elige acá (es el mismo dato del terreno)
 */
export default function PanelSol({ estado, onCambiar, info, sinTerreno, orientacion, onOrientacion, onCerrar }) {
  const anio = estado.fecha.slice(0, 4);
  const deNoche = info.altura <= 0;
  return (
    <div className="panel-sol no-print" role="dialog" aria-label="Sol">
      <div className="panel-sol-titulo">
        <strong>☀ Sol</strong>
        <button type="button" className="btn-cerrar" onClick={onCerrar} aria-label="Cerrar el sol" title="Apagar el sol (vuelve la luz de siempre)">✕</button>
      </div>
      <div className="fila-sol">
        <label>Día <input type="date" value={estado.fecha} onChange={(e) => e.target.value && onCambiar({ fecha: e.target.value })} /></label>
        {ATAJOS.map(([nombre, mmdd]) => (
          <button key={nombre} type="button" className="btn-mini" onClick={() => onCambiar({ fecha: `${anio}-${mmdd}` })}>{nombre}</button>
        ))}
      </div>
      <div className="fila-sol">
        <button type="button" className="btn-ctrl" aria-pressed={estado.animando}
          onClick={() => onCambiar({ animando: !estado.animando, ...(deNoche && !estado.animando ? { hora: info.salida } : {}) })}>
          {estado.animando ? '⏸' : '▶'} Día
        </button>
        <label className="hora-sol">
          <span>{hhmm(estado.hora)}</span>
          {/* En minutos (de 5 en 5): así el control no tiene decimales raros. */}
          <input type="range" min="0" max="1440" step="5" value={Math.round(estado.hora * 12) * 5} aria-label="Hora"
            onChange={(e) => onCambiar({ hora: Number(e.target.value) / 60, animando: false })} />
        </label>
      </div>
      <p className="dato-sol">
        {deNoche
          ? `De noche · sale ${hhmm(info.salida)}, se pone ${hhmm(info.puesta)}`
          : `Altura ${Math.round(info.altura)}° · desde el ${rumboDelAzimut(info.azimut)} (${Math.round(info.azimut)}°) · sale ${hhmm(info.salida)}, se pone ${hhmm(info.puesta)}`}
      </p>
      {!deNoche && (
        <p className="dato-sol">
          {info.aberturas.length
            ? <>Entra sol por: {info.aberturas.map((a) => `#${a.numero}${a.abertura.etiqueta?.trim() ? ` ${a.abertura.etiqueta.trim()}` : ''}`).join(', ')}</>
            : 'No entra sol directo por ninguna abertura.'}
        </p>
      )}
      {sinTerreno && (
        <label className="fila-sol">
          El frente mira al
          <select value={orientacion} onChange={(e) => onOrientacion(Number(e.target.value))}>
            {[['N', 0], ['NE', 45], ['E', 90], ['SE', 135], ['S', 180], ['SO', 225], ['O', 270], ['NO', 315]].map(([r, g]) => <option key={r} value={g}>{r}</option>)}
          </select>
        </label>
      )}
    </div>
  );
}
