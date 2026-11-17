// ==========================================================
// ListaDeCompras (v1.72): los materiales para tildar lo comprado
// ----------------------------------------------------------
// Pedido de Leandro: "ver los materiales en lista para marcar comprados, ver
// cantidades; a cada proveedor eliminar / agregarle productos, por rubro;
// marcar si fue comprado y registrar si lo retiré y no fue abonado".
//   - Agrupada por proveedor y, dentro, por parte de la obra.
//   - "Se lo compro a…": cambia el proveedor de ese renglón (o ninguno).
//   - Cantidad (de fábrica, lo que falta) + "Retirado" (queda como deuda) o
//     "Pagado": crea sola la compra en Obra → Compras hechas.
//   - "Pagar lo retirado": la deuda de ese renglón pasa a pagada.
// La usan el Presupuesto (sub-pestaña) y la pestaña Obra. Cuentas en
// motor/listaCompras.js.
// ==========================================================

import { useState } from 'react';
import { agruparLista, compraDesdeLista, pagarRetirado, PROPIO } from '../motor/listaCompras.js';
import { NINGUNO, cantidadPedida } from '../motor/proveedores.js';
import { useEstadoGuardado } from '../hooks/useEstadoGuardado.js';

const pesos = (n) => n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
const num = (n) => n.toLocaleString('es-AR', { maximumFractionDigits: 2 });

/** El estado de un renglón en palabras (y su clase para el color). */
function estadoDe(f) {
  if (f.terminada) return ['✓ parte terminada', 'ok'];
  if (f.sinPagar > 0) return [`retirado ${num(f.sinPagar)} sin pagar${f.falta > 0 ? ` · faltan ${num(f.falta)}` : ''}`, 'debe'];
  if (f.retirado > 0 && f.falta === 0) return ['✓ comprado y pagado', 'ok'];
  if (f.retirado > 0) return [`${num(f.retirado)} de ${num(f.cantidad)} · faltan ${num(f.falta)}`, 'parcial'];
  return ['falta', 'falta'];
}

function Fila({ f, proveedores, opcionesDe, onAsignar, onMarcar, onPagarRetirado }) {
  const [cantidad, setCantidad] = useState(null); // null = lo que falta
  const valor = cantidad ?? f.falta;
  const [texto, clase] = estadoDe(f);
  const sinProveedor = f.proveedor !== PROPIO && !proveedores.some((p) => p.id === f.proveedor);
  return (
    <tr className={`fila-compra estado-${clase}`}>
      <td>
        <div className="item-name">{f.material}</div>
        <small className="detalle">{f.nombre}</small>
      </td>
      <td className="num">{cantidadPedida({ cantidad: f.cantidad, unidad: f.unidad, largoBarra: f.largoBarra })}
        {f.precio ? <small className="detalle"> · {pesos(f.subtotal)}</small> : null}</td>
      <td><span className={`chip-compra ${clase}`}>{texto}</span></td>
      <td>
        {f.proveedor === PROPIO ? <small className="detalle">precio propio</small> : (
          <select value={f.aMano ?? ''} aria-label={`Proveedor de ${f.material}`} onChange={(e) => onAsignar(f.id, e.target.value || null)}
            className={sinProveedor ? 'falta' : ''}>
            <option value="">Automático{f.aMano ? '' : ` (${proveedores.find((p) => p.id === f.proveedor)?.nombre ?? 'nadie lo vende'})`}</option>
            {opcionesDe(f).map((o) => <option key={o.id} value={o.id}>{o.texto}</option>)}
            <option value={NINGUNO}>No se lo compro a nadie (lo consigo yo / ya lo tengo)</option>
          </select>
        )}
      </td>
      <td className="acciones-compra no-print">
        {!f.terminada && f.falta > 0 && (<>
          <input type="number" min="0" step="any" value={valor} aria-label={`Cantidad de ${f.material}`}
            onChange={(e) => setCantidad(e.target.value === '' ? 0 : Number(e.target.value))} />
          <button type="button" className="btn-mini" disabled={!(valor > 0)} title="Lo retiraste y queda debiéndose"
            onClick={() => { onMarcar(f, valor, false); setCantidad(null); }}>Retirado</button>
          <button type="button" className="btn-mini" disabled={!(valor > 0)} title="Lo compraste y lo pagaste"
            onClick={() => { onMarcar(f, valor, true); setCantidad(null); }}>Pagado</button>
        </>)}
        {f.sinPagar > 0 && <button type="button" className="btn-mini" onClick={() => onPagarRetirado(f.id)}>Pagar lo retirado</button>}
      </td>
    </tr>
  );
}

/**
 * @param filas        filasDeLaLista(…)
 * @param proveedores  los activos (para elegir y nombrar)
 * @param precioEnProveedor (fila, idProveedor) => precio | null (para el desplegable)
 */
export default function ListaDeCompras({ filas, proveedores, compras, asignaciones = {}, precioEnProveedor, cambiar }) {
  const [ver, setVer] = useEstadoGuardado('listaComprasVer', 'todo', (v) => ['todo', 'falta', 'debe'].includes(v));
  const visibles = filas.filter((f) => (ver === 'falta' ? f.falta > 0 : ver === 'debe' ? f.sinPagar > 0 : true));
  const grupos = agruparLista(visibles, proveedores);
  const totales = agruparLista(filas, proveedores).reduce((a, g) => ({ total: a.total + g.total, falta: a.falta + g.falta, sinPagar: a.sinPagar + g.sinPagar }),
    { total: 0, falta: 0, sinPagar: 0 });
  const nombreDe = (id) => proveedores.find((p) => p.id === id)?.nombre ?? '';
  const asignar = (idRenglon, proveedor) => {
    const nuevas = { ...asignaciones };
    if (proveedor) nuevas[idRenglon] = proveedor; else delete nuevas[idRenglon];
    cambiar('seguimiento.asignaciones')(nuevas);
  };
  const marcar = (f, cantidad, pagada) => {
    const nombre = f.proveedor === PROPIO ? '' : nombreDe(f.proveedor);
    cambiar('seguimiento.compras')([compraDesdeLista(compras, f, cantidad, nombre, pagada), ...compras]);
  };
  const pagar = (idRenglon) => cambiar('seguimiento.compras')(pagarRetirado(compras, idRenglon));
  const opcionesDe = (f) => proveedores.map((p) => {
    const precio = precioEnProveedor(f, p.id);
    return { id: p.id, texto: `${p.nombre}${precio !== null ? ` · ${pesos(precio)}` : ' (sin precio)'}` };
  });
  return (
    <div className="lista-compras">
      <p className="nota">
        Cada material con su proveedor (el que conviene, o el que elijas en "Se lo compro a…") y por parte de la obra. Poné cuánto
        retiraste y tocá <strong>Retirado</strong> (queda como deuda) o <strong>Pagado</strong>: se anota solo en Obra → Compras hechas.
      </p>
      <div className="resumen-seguimiento">
        <div><small>Total</small><strong>{pesos(totales.total)}</strong></div>
        <div><small>Falta comprar</small><strong>{pesos(totales.falta)}</strong></div>
        {totales.sinPagar > 0 && <div><small>Retirado sin pagar</small><strong className="falta">{pesos(totales.sinPagar)}</strong></div>}
      </div>
      <div className="grupo-ctrl filtro-lista no-print" role="group" aria-label="Qué ver">
        {[['todo', 'Todo'], ['falta', 'Lo que falta'], ['debe', 'Retirado sin pagar']].map(([v, t]) => (
          <button key={v} type="button" className={`btn-ctrl${ver === v ? ' activo' : ''}`} aria-pressed={ver === v} onClick={() => setVer(v)}>{t}</button>
        ))}
      </div>
      {grupos.length === 0 && <p className="vacio">No hay nada {ver === 'debe' ? 'retirado sin pagar' : 'que falte'}.</p>}
      {grupos.map((g) => (
        <details key={g.proveedor ?? 'sin'} className="grupo-proveedor" open>
          <summary>
            <strong>{g.nombre}</strong>
            <small> · {g.partes.reduce((a, p) => a + p.filas.length, 0)} materiales{g.total > 0 ? ` · ${pesos(g.total)}` : ''}{g.falta > 0 ? ` · falta ${pesos(g.falta)}` : g.total > 0 ? ' · ✓' : ''}{g.sinPagar > 0 ? ` · debés ${pesos(g.sinPagar)}` : ''}</small>
          </summary>
          {g.partes.map((p) => (
            <div key={p.clave} className="parte-lista">
              <h4 className="subtitulo-pared">{p.nombre}</h4>
              <div className="table-wrap">
                <table className="tabla-compras">
                  <thead><tr><th>Material</th><th className="num">Cantidad</th><th>Estado</th><th>Se lo compro a</th><th className="no-print">Marcar</th></tr></thead>
                  <tbody>
                    {p.filas.map((f) => (
                      <Fila key={f.id} f={f} proveedores={proveedores} opcionesDe={opcionesDe} onAsignar={asignar} onMarcar={marcar} onPagarRetirado={pagar} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </details>
      ))}
    </div>
  );
}
