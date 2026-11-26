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
//   - v1.74: "↶ Deshacer": borra la última marca de ese renglón.
// La usan el Presupuesto (sub-pestaña) y la pestaña Obra. Cuentas en
// motor/listaCompras.js.
// ==========================================================

import { useState } from 'react';
import { agruparLista, compraDesdeLista, pagarRetirado, ultimaDesdeLista, deshacerMarca, estadoDeFila, PROPIO, resumenPorMaterial } from '../motor/listaCompras.js';
import { NINGUNO, A_FUTURO, cantidadPedida } from '../motor/proveedores.js';
import { useEstadoGuardado } from '../hooks/useEstadoGuardado.js';
import NotaPlegable from './NotaPlegable.jsx';
import Buscador from './Buscador.jsx'; // v1.84
import { filtrarPor } from '../motor/buscar.js';

const pesos = (n) => n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
const num = (n) => n.toLocaleString('es-AR', { maximumFractionDigits: 2 });

const estadoDe = estadoDeFila; // v1.74: la cuenta vive en el motor (también la usan el PDF y el Excel)

function Fila({ f, proveedores, opcionesDe, onAsignar, onMarcar, onPagarRetirado, ultima, onDeshacer }) {
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
      <td><span className={`chip-compra ${clase}`}>{texto}</span>
        {/* v1.92: lo que cubre una compra anotada en otro renglón del mismo material. */}
        {f.deOtros > 0 && <small className="detalle"> · {num(f.deOtros)} de compras de otro renglón del mismo material</small>}</td>
      <td>
        {f.proveedor === PROPIO ? <small className="detalle">precio propio</small> : (
          <select value={f.aMano ?? ''} aria-label={`Proveedor de ${f.material}`} onChange={(e) => onAsignar(f.id, e.target.value || null)}
            className={sinProveedor ? 'falta' : ''}>
            <option value="">Automático{f.aMano ? '' : ` (${proveedores.find((p) => p.id === f.proveedor)?.nombre ?? 'nadie lo vende'})`}</option>
            {opcionesDe(f).map((o) => <option key={o.id} value={o.id}>{o.texto}</option>)}
            <option value={A_FUTURO}>A futuro (todavía no: no entra en el total)</option>
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
        {/* v1.74: deshacer la última marca de este renglón (borra esa compra de Compras hechas). */}
        {ultima && (
          <button type="button" className="btn-mini btn-deshacer" onClick={() => onDeshacer(f.id)}
            title={`Borra la compra del ${ultima.fecha.split('-').reverse().join('/')}: ${num(ultima.renglones[0].cantidad)} ${ultima.pagada ? 'pagado' : 'retirado'}`}>
            ↶ Deshacer {num(ultima.renglones[0].cantidad)} {ultima.pagada ? 'pagado' : 'retirado'}
          </button>
        )}
      </td>
    </tr>
  );
}

/**
 * @param filas        filasDeLaLista(…)
 * @param proveedores  los activos (para elegir y nombrar)
 * @param precioEnProveedor (fila, idProveedor) => precio | null (para el desplegable)
 */
/**
 * @param asignaciones   las elegidas a mano (las guardadas, sin las de las partes a futuro)
 * @param futuras        v1.100: las partes de la obra a futuro (Set de claves)
 * @param onParteAFuturo v1.100: (clave, siONo, idsDeSusRenglones) => void: el mismo cambio que en Obra → Partes
 */
export default function ListaDeCompras({ filas, proveedores, compras, asignaciones = {}, futuras = new Set(), onParteAFuturo = null, precioEnProveedor, cambiar }) {
  const [ver, setVer] = useEstadoGuardado('listaComprasVer', 'todo', (v) => ['todo', 'falta', 'debe'].includes(v));
  // v1.84: buscador (material, parte de la obra o proveedor).
  const [buscar, setBuscar] = useState('');
  const visibles = filtrarPor(filas.filter((f) => (ver === 'falta' ? f.falta > 0 : ver === 'debe' ? f.sinPagar > 0 : true)), buscar,
    (f) => `${f.nombre} ${f.perfil ?? ''} ${f.parteNombre ?? f.parte ?? ''} ${proveedores.find((p) => p.id === f.proveedor)?.nombre ?? ''}`);
  const grupos = agruparLista(visibles, proveedores);
  // v1.93: lo de "a futuro" no suma al total ni a lo que falta (se muestra aparte).
  const todosLosGrupos = agruparLista(filas, proveedores);
  const totales = todosLosGrupos.filter((g) => g.proveedor !== A_FUTURO).reduce((a, g) => ({ total: a.total + g.total, falta: a.falta + g.falta, sinPagar: a.sinPagar + g.sinPagar }),
    { total: 0, falta: 0, sinPagar: 0 });
  const aFuturo = todosLosGrupos.find((g) => g.proveedor === A_FUTURO);
  // v1.93: toda una parte de la obra (ej. el tapial) a futuro, o de vuelta a comprar.
  // (todos los renglones de esa parte, de cualquier proveedor: el tapial tiene cemento de un lado y ladrillos de otro)
  const parteAFuturo = (clave, futuro) => {
    // v1.100: la parte entera se pone a futuro en un solo lugar (seguimiento.aFuturo / el tapial), igual que en Obra → Partes.
    if (onParteAFuturo) { onParteAFuturo(clave, futuro, filas.filter((f) => f.parte === clave).map((f) => f.id)); return; }
    const nuevas = { ...asignaciones };
    filas.filter((f) => f.parte === clave && f.proveedor !== PROPIO && (futuro || nuevas[f.id] === A_FUTURO))
      .forEach((f) => { if (futuro) nuevas[f.id] = A_FUTURO; else delete nuevas[f.id]; });
    cambiar('seguimiento.asignaciones')(nuevas);
  };
  const porMaterial = resumenPorMaterial(filas, compras); // v1.92
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
  const deshacer = (idRenglon) => cambiar('seguimiento.compras')(deshacerMarca(compras, idRenglon));
  const opcionesDe = (f) => proveedores.map((p) => {
    const precio = precioEnProveedor(f, p.id);
    return { id: p.id, texto: `${p.nombre}${precio !== null ? ` · ${pesos(precio)}` : ' (sin precio)'}` };
  });
  return (
    <div className="lista-compras">
      <NotaPlegable>
        Cada material con su proveedor (el que conviene, o el que elijas en "Se lo compro a…") y por parte de la obra. Poné cuánto
        retiraste y tocá <strong>Retirado</strong> (queda como deuda) o <strong>Pagado</strong>: se anota solo en Obra → Compras hechas.
      </NotaPlegable>
      <div className="resumen-seguimiento">
        <div><small>Total</small><strong>{pesos(totales.total)}</strong></div>
        <div><small>Falta comprar</small><strong>{pesos(totales.falta)}</strong></div>
        {totales.sinPagar > 0 && <div><small>Retirado sin pagar</small><strong className="falta">{pesos(totales.sinPagar)}</strong></div>}
        {aFuturo && <div><small>A futuro (no suma)</small><strong>{pesos(aFuturo.total)}</strong></div>}
      </div>
      {/* v1.92 (Leandro: "recalcular en los que cargué y los necesarios para ver si realmente siguen faltando"): por
          material, sumando todos sus renglones (columnas, soleras, bordes…). */}
      {porMaterial.length > 0 && (
        <div className="table-wrap">
          <table className="tabla-plano resumen-por-material">
            <caption>Por material (todos sus usos juntos)</caption>
            <thead><tr><th>Material</th><th className="num">Lleva la obra</th><th className="num">Comprado</th><th className="num">Falta</th></tr></thead>
            <tbody>
              {porMaterial.map((m) => (
                <tr key={m.clave}>
                  <td data-etiqueta="Material">{m.material}{m.largoBarra ? <small className="detalle"> · barra de {num(m.largoBarra)} m</small> : null}</td>
                  <td className="num" data-etiqueta="Lleva la obra">{cantidadPedida({ cantidad: m.lleva, unidad: m.unidad })}</td>
                  <td className="num" data-etiqueta="Comprado">{num(m.comprado)}</td>
                  <td className="num" data-etiqueta="Falta">{m.falta > 0 ? <strong className="falta">{num(m.falta)}</strong> : '✓'}{m.sobra > 0 ? <small> · sobran {num(m.sobra)}</small> : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="grupo-ctrl filtro-lista no-print" role="group" aria-label="Qué ver">
        {[['todo', 'Todo'], ['falta', 'Lo que falta'], ['debe', 'Retirado sin pagar']].map(([v, t]) => (
          <button key={v} type="button" className={`btn-ctrl${ver === v ? ' activo' : ''}`} aria-pressed={ver === v} onClick={() => setVer(v)}>{t}</button>
        ))}
      </div>
      <Buscador valor={buscar} onCambio={setBuscar} ayuda="cemento, caño 80x80, tapial, ALPANEL…" etiqueta="Buscar en la lista de compras"
        quedan={visibles.length} total={filas.length} />
      {grupos.length === 0 && <p className="vacio">{buscar ? `Nada con "${buscar}".` : `No hay nada ${ver === 'debe' ? 'retirado sin pagar' : 'que falte'}.`}</p>}
      {grupos.map((g) => (
        <details key={g.proveedor ?? 'sin'} className="grupo-proveedor" open>
          <summary>
            <strong>{g.nombre}</strong>
            <small> · {g.partes.reduce((a, p) => a + p.filas.length, 0)} materiales{g.total > 0 ? ` · ${pesos(g.total)}` : ''}{g.falta > 0 ? ` · falta ${pesos(g.falta)}` : g.total > 0 ? ' · ✓' : ''}{g.sinPagar > 0 ? ` · debés ${pesos(g.sinPagar)}` : ''}</small>
          </summary>
          {g.partes.map((p) => (
            <div key={p.clave} className="parte-lista">
              <h4 className="subtitulo-pared">{p.nombre}
                {(p.filas.some((f) => f.proveedor !== PROPIO) || futuras.has(p.clave)) && (
                  <button type="button" className="btn-mini no-print" onClick={() => parteAFuturo(p.clave, g.proveedor !== A_FUTURO)}
                    title={g.proveedor === A_FUTURO ? 'Vuelve a la lista para comprar (con el proveedor automático)' : 'Todavía no se compra: sale del total y de lo que falta'}>
                    {g.proveedor === A_FUTURO ? '↶ Volver a comprar' : 'Toda esta parte a futuro'}</button>
                )}</h4>
              <div className="table-wrap">
                <table className="tabla-compras">
                  <thead><tr><th>Material</th><th className="num">Cantidad</th><th>Estado</th><th>Se lo compro a</th><th className="no-print">Marcar</th></tr></thead>
                  <tbody>
                    {p.filas.map((f) => (
                      <Fila key={f.id} f={f} proveedores={proveedores} opcionesDe={opcionesDe} onAsignar={asignar} onMarcar={marcar} onPagarRetirado={pagar}
                        ultima={ultimaDesdeLista(compras, f.id)} onDeshacer={deshacer} />
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
