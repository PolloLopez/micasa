// ==========================================================
// BarraPestanas (v1.18): elige qué sección del panel se ve
// (Estructura · Paredes y aberturas · Materiales · Presupuesto).
// En la compu va arriba del panel; en el celular, fija abajo y con
// una pestaña más, "3D", para pasar del modelo a los datos con el
// pulgar (ver App.css). Accesible: role="tab" + aria-selected, y
// con el teclado se pasa de una pestaña a otra con ← y →.
// ==========================================================

/**
 * @param pestanas [{ clave, nombre, corto?, detalle?, soloMovil? }]
 *   corto: nombre para el celular (poco lugar); detalle: segunda línea (ej. el total).
 * @param activa   clave de la pestaña elegida
 */
export default function BarraPestanas({ pestanas, activa, onElegir }) {
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
    <nav className="pestanas no-print" role="tablist" aria-label="Secciones del proyecto">
      {pestanas.map((p, i) => (
        <button key={p.clave} id={`boton-${p.clave}`} type="button" role="tab"
          className={`pestana-boton${p.soloMovil ? ' solo-movil' : ''}`}
          aria-selected={activa === p.clave} aria-controls={p.soloMovil ? undefined : `pestana-${p.clave}`}
          tabIndex={activa === p.clave ? 0 : -1}
          onClick={() => onElegir(p.clave)} onKeyDown={(ev) => alTeclear(ev, i)}>
          <span className="nombre-largo">{p.nombre}</span>
          <span className="nombre-corto">{p.corto ?? p.nombre}</span>
          {p.detalle && <span className="detalle-pestana">{p.detalle}</span>}
        </button>
      ))}
    </nav>
  );
}
