// ==========================================================
// SubPestanas (v1.73): las pestañas de adentro de cada pestaña
// ----------------------------------------------------------
// Pedido de Leandro: "dentro de cada tab dale otras tabs, es difícil
// navegar dentro de cada una". Cada pestaña (Estructura, Paredes,
// Materiales, Instalaciones, Obra) se parte en pocas sub-pestañas; se ve
// una por vez y se recuerda la última de cada una en este navegador.
// Lo que no se ve queda montado (hidden): así no se pierde lo abierto ni
// lo escrito al cambiar. Si en el 3D se elige algo de otra sub-pestaña
// (una pared, una mesada), App pasa sola a esa (subDeTarjeta).
// ==========================================================

import { useEstadoGuardado } from '../hooks/useEstadoGuardado.js';

/**
 * La sub-pestaña activa de un grupo, recordada en este navegador.
 * @param grupo     'estructura', 'paredes'… (para recordarla)
 * @param opciones  [{ clave, nombre, tarjetas?: string[] }]  tarjetas = ids de las tarjetas que tiene (para el 3D)
 */
export function useSubPestana(grupo, opciones) {
  const valida = (v) => opciones.some((o) => o.clave === v);
  const [activa, setActiva] = useEstadoGuardado(`subPestana.${grupo}`, opciones[0]?.clave, valida);
  return [valida(activa) ? activa : opciones[0]?.clave, setActiva];
}

/** La sub-pestaña que tiene una tarjeta (lo elegido en el 3D, ver contextoFoco.js), o null. */
export const subDeTarjeta = (opciones, tarjeta) => opciones.find((o) => o.tarjetas?.includes(tarjeta))?.clave ?? null;

/** La barra de sub-pestañas (con flechas del teclado, como las de arriba). */
export function BarraSubPestanas({ grupo, opciones, activa, onElegir }) {
  const alTeclear = (ev) => {
    const paso = ev.key === 'ArrowRight' ? 1 : ev.key === 'ArrowLeft' ? -1 : 0;
    if (!paso) return;
    ev.preventDefault();
    const i = opciones.findIndex((o) => o.clave === activa);
    const siguiente = opciones[(i + paso + opciones.length) % opciones.length];
    onElegir(siguiente.clave);
    document.getElementById(`sub-${grupo}-${siguiente.clave}`)?.focus();
  };
  return (
    <div className="subpestanas no-print" role="tablist" aria-label="Partes de esta pestaña" onKeyDown={alTeclear}>
      {opciones.map((o) => (
        <button key={o.clave} id={`sub-${grupo}-${o.clave}`} type="button" role="tab" aria-selected={activa === o.clave}
          aria-controls={`panel-${grupo}-${o.clave}`} tabIndex={activa === o.clave ? 0 : -1} title={o.ayuda}
          className={activa === o.clave ? 'activa' : ''} onClick={() => onElegir(o.clave)}>
          {o.icono && <span aria-hidden="true">{o.icono}</span>}{o.nombre}
          {o.marca ? <small className="marca-sub">{o.marca}</small> : null}
        </button>
      ))}
    </div>
  );
}

/** Lo de una sub-pestaña (montado siempre; se esconde si no es la activa). activa = null: sin sub-pestañas, se ve todo. */
export function PanelSub({ grupo, clave, activa, children }) {
  if (activa === null) return children;
  return (
    <div id={`panel-${grupo}-${clave}`} role="tabpanel" aria-labelledby={`sub-${grupo}-${clave}`}
      className={`panel-sub${activa === clave ? '' : ' oculto-sub'}`}>
      {children}
    </div>
  );
}
