// ==========================================================
// BarraPestanas (v1.18; v1.62 rediseñada): elige qué sección del panel se ve
// ----------------------------------------------------------
// v1.62 (pedido de Leandro: "fuimos agregando y ya no es claro ni sencillo"):
// una barra tipo "segmentada", en UN renglón: cada pestaña con su ícono y su
// nombre corto; la elegida, resaltada. Si el panel es ancho (se puede
// ensanchar arrastrando el borde del 3D), se ve el nombre completo. El
// total del presupuesto y lo pagado van como un dato chico abajo.
// En el celular va fija abajo, con una más ("3D"). Accesible: role="tab" +
// aria-selected; con el teclado se pasa de una a otra con ← y →.
// v1.73.1: mide su alto y lo deja en --alto-pestanas (la barra de sub-pestañas se pega justo debajo).
// ==========================================================

import { useEffect, useRef } from 'react';

/** Un ícono por sección (los emojis se ven en cualquier compu y celular, sin bajar nada). */
const ICONOS = {
  '3d': '🧊', estructura: '🏗️', paredes: '🧱', materiales: '🔩', presupuesto: '💲', instalaciones: '🔌', planos: '📐', obra: '📋',
};

/**
 * @param pestanas [{ clave, nombre, corto?, detalle?, detalleCompleto?, soloMovil? }]
 *   corto: nombre para poco lugar; detalle: el dato chico de abajo (ej. el total).
 * @param activa   clave de la pestaña elegida
 */
export default function BarraPestanas({ pestanas, activa, onElegir }) {
  // El alto de la barra (cambia con el ancho del panel): las sub-pestañas se pegan debajo (App.css, --alto-pestanas).
  const ref = useRef(null);
  useEffect(() => {
    const barra = ref.current;
    if (!barra || typeof ResizeObserver === 'undefined') return undefined;
    const medir = () => barra.parentElement?.style.setProperty('--alto-pestanas', `${barra.offsetHeight + 4}px`);
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(barra);
    return () => observador.disconnect();
  }, []);
  /** ← / →: pasa a la pestaña de al lado (patrón de pestañas accesibles). */
  const alTeclear = (ev, i) => {
    const paso = ev.key === 'ArrowRight' ? 1 : ev.key === 'ArrowLeft' ? -1 : 0;
    if (!paso) return;
    ev.preventDefault();
    const siguiente = pestanas[(i + paso + pestanas.length) % pestanas.length];
    onElegir(siguiente.clave);
    document.getElementById(`boton-${siguiente.clave}`)?.focus();
  };

  return (
    <nav ref={ref} className="pestanas no-print" role="tablist" aria-label="Secciones del proyecto">
      {pestanas.map((p, i) => (
        <button key={p.clave} id={`boton-${p.clave}`} type="button" role="tab"
          className={`pestana-boton${p.soloMovil ? ' solo-movil' : ''}`}
          aria-selected={activa === p.clave} aria-controls={p.soloMovil ? undefined : `pestana-${p.clave}`}
          tabIndex={activa === p.clave ? 0 : -1} title={p.detalle ? `${p.nombre} · ${p.detalleCompleto ?? p.detalle}` : p.nombre}
          aria-label={p.detalle ? `${p.nombre}, ${p.detalleCompleto ?? p.detalle}` : p.nombre}
          onClick={() => onElegir(p.clave)} onKeyDown={(ev) => alTeclear(ev, i)}>
          <span className="icono-pestana" aria-hidden="true">{ICONOS[p.clave] ?? '•'}</span>
          <span className="nombre-largo">{p.nombre}</span>
          <span className="nombre-corto">{p.corto ?? p.nombre}</span>
          {p.detalle && <span className="detalle-pestana">{p.detalle}</span>}
        </button>
      ))}
    </nav>
  );
}
