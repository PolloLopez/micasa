// ==========================================================
// PanelCompras (v1.69): las compras que ya se hicieron
// ----------------------------------------------------------
// Pedido de Leandro: "quiero ir ingresando las compras que ya realicé
// (x bolsas de cemento para los pilotines, los fierros que ya compré) y que
// vaya descontando del total". Cada compra: fecha, proveedor y renglones.
// Un renglón es un material de la lista del presupuesto (descuenta cantidad
// y plata) o un ticket suelto (descuenta solo plata). Queda pagada entera
// al cargarla; si quedó algo por pagar, se destilda y se pone cuánto.
// Las cuentas están en motor/compras.js; el Presupuesto muestra gastado y
// lo que falta.
// ==========================================================

import { useState } from 'react';
import Tarjeta from './Tarjeta.jsx';
import FichaPlegable from './FichaPlegable.jsx';
import CampoNumero from './CampoNumero.jsx';
import { compraNueva, renglonNuevo, cuentasDeCompra, resumenDeCompras } from '../motor/compras.js';
import { cantidadPedida } from '../motor/proveedores.js';
import NotaPlegable from './NotaPlegable.jsx';

const pesos = (n) => n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
const fecha = (f) => f.split('-').reverse().join('/');
// Para qué se usó: sugerencias (se puede escribir cualquier cosa).
const PARA = ['Pilotines', 'Zapatas', 'Estructura', 'Piso', 'Entrepiso', 'Paredes', 'Techo', 'Revestimiento', 'Tabiques', 'Escalera',
  'Obra civil', 'Pilar de luz', 'Pozo séptico', 'Instalación eléctrica', 'Agua', 'Desagües', 'Gas', 'Herramientas'];

/** Un renglón: el material (o "otro" = ticket suelto), cantidad, lo que se pagó y para qué. */
function Renglon({ r, ruta, materiales, cambiar, onQuitar }) {
  const material = materiales.find((m) => m.clave === r.material);
  const elegirMaterial = (clave) => {
    const m = materiales.find((x) => x.clave === clave);
    // Al elegir un material: su nombre, su unidad y, si no se cargó monto, el del presupuesto.
    cambiar(ruta)(m
      ? { ...r, material: m.clave, nombre: m.nombre, unidad: m.unidad, monto: r.monto || Math.round((m.cantidad > 0 ? m.subtotal / m.cantidad : m.precio) * (r.cantidad || 1)), cantidad: r.cantidad || 1 }
      : { ...r, material: '', unidad: '' });
  };
  return (
    <li className="renglon-compra">
      <div className="grid-params">
        <div className="group">
          <label>Material
            <select value={r.material} onChange={(e) => elegirMaterial(e.target.value)}>
              <option value="">Otro (ticket: descuenta solo la plata)</option>
              {materiales.map((m) => <option key={m.clave} value={m.clave}>{m.nombre}</option>)}
              {r.material && !material && <option value={r.material}>{r.nombre} (ya no está en la lista)</option>}
            </select>
          </label>
        </div>
        {!r.material && (
          <div className="group">
            <label>Qué es
              <input type="text" maxLength={80} value={r.nombre} placeholder="ej. Fierros varios, flete, herramientas"
                onChange={(e) => cambiar(`${ruta}.nombre`)(e.target.value)} />
            </label>
          </div>
        )}
        {r.material && (
          <CampoNumero etiqueta={`Cantidad${r.unidad ? ` (${r.unidad})` : ''}`} decimales={2} valor={r.cantidad} onCambio={cambiar(`${ruta}.cantidad`)} />
        )}
        <CampoNumero etiqueta="Pagado (total del renglón)" sufijo="$" decimales={0} valor={r.monto} onCambio={cambiar(`${ruta}.monto`)} />
        <div className="group">
          <label>Para qué
            <input type="text" maxLength={60} value={r.para} list="lista-para-compras" placeholder="ej. Pilotines"
              onChange={(e) => cambiar(`${ruta}.para`)(e.target.value)} />
          </label>
        </div>
      </div>
      {material && (
        <small className="nota">En la obra van {cantidadPedida(material)}{material.comprado > 0 ? ` · comprado en total ${material.comprado} · faltan ${material.faltaCantidad}` : ''}</small>
      )}
      <button type="button" className="btn-del eliminar-aparte" onClick={onQuitar} aria-label="Quitar el renglón">Quitar</button>
    </li>
  );
}

/**
 * @param materiales  la lista de materiales del presupuesto (listaDeMateriales)
 * @param proveedores los de Materiales (para sugerir el nombre)
 * @param totalMateriales total de materiales del presupuesto
 */
export default function PanelCompras({ params, materiales, proveedores, totalMateriales, terminado = new Map(), cambiar }) {
  const compras = params.seguimiento?.compras ?? [];
  const [recien, setRecien] = useState(null);
  const resumen = resumenDeCompras(materiales, compras, totalMateriales, terminado);
  const conCompras = resumen.materiales;
  const agregar = () => {
    const nueva = { ...compraNueva(compras), renglones: [renglonNuevo([])] };
    setRecien(nueva.id);
    cambiar('seguimiento.compras')([nueva, ...compras]); // la más nueva arriba
  };
  // Las más nuevas primero (sin tocar el orden guardado).
  const ordenadas = compras.map((c, i) => ({ c, i })).sort((a, b) => b.c.fecha.localeCompare(a.c.fecha) || b.c.id - a.c.id);
  return (
    <Tarjeta id="compras" titulo={`Compras hechas (${compras.length})`}>
      <NotaPlegable>
        Lo que ya compraste. Elegí el material de la lista (descuenta la cantidad y la plata de lo que falta) o "Otro" para un
        ticket suelto (descuenta solo la plata). Queda <strong>pagada</strong>; si dejaste una seña, destildala y poné cuánto falta.
      </NotaPlegable>
      <div className="resumen-seguimiento">
        <div><small>Materiales (presupuesto)</small><strong>{pesos(totalMateriales)}</strong></div>
        <div><small>Ya gastado</small><strong>{pesos(resumen.gastado)}</strong></div>
        <div><small>Falta comprar</small><strong>{pesos(resumen.falta)}</strong></div>
        {resumen.deuda > 0 && <div><small>Debés de compras</small><strong className="falta">{pesos(resumen.deuda)}</strong></div>}
      </div>
      <datalist id="lista-para-compras">{PARA.map((p) => <option key={p} value={p} />)}</datalist>
      <datalist id="lista-proveedores-compras">{proveedores.map((p) => <option key={p.id} value={p.nombre} />)}</datalist>
      <button type="button" className="btn-sec" onClick={agregar}>+ Compra</button>
      {ordenadas.map(({ c, i }) => {
        const ruta = `seguimiento.compras.${i}`;
        const cuentas = cuentasDeCompra(c);
        const quitarRenglon = (id) => cambiar(`${ruta}.renglones`)(c.renglones.filter((r) => r.id !== id));
        const descripcion = c.renglones.map((r) => (r.material ? `${r.cantidad} ${r.unidad} ${r.nombre}` : r.nombre || 'ticket')).join(', ');
        return (
          <FichaPlegable key={c.id} clave={`compra:${c.id}`} className="rubro" abiertaAlInicio={c.id === recien}
            encabezado={<>
              <strong>{fecha(c.fecha)} · {c.proveedor || 'Sin proveedor'}</strong>
              <small>{pesos(cuentas.total)} · {cuentas.falta > 0 ? <span className="falta">falta pagar {pesos(cuentas.falta)}</span> : 'pagada ✓'}{descripcion ? ` · ${descripcion}` : ''}</small>
            </>}>
            <div className="grid-params">
              <div className="group"><label>Fecha<input type="date" value={c.fecha} onChange={(e) => cambiar(`${ruta}.fecha`)(e.target.value)} /></label></div>
              <div className="group">
                <label>Proveedor
                  <input type="text" maxLength={60} value={c.proveedor} list="lista-proveedores-compras" placeholder="ej. Corralón Centro"
                    onChange={(e) => cambiar(`${ruta}.proveedor`)(e.target.value)} />
                </label>
              </div>
              <div className="group">
                <label>Nota<input type="text" maxLength={120} value={c.nota} placeholder="factura, remito…" onChange={(e) => cambiar(`${ruta}.nota`)(e.target.value)} /></label>
              </div>
            </div>
            <ul className="lista-renglones-compra">
              {c.renglones.map((r, k) => (
                <Renglon key={r.id} r={r} ruta={`${ruta}.renglones.${k}`} materiales={conCompras} cambiar={cambiar} onQuitar={() => quitarRenglon(r.id)} />
              ))}
            </ul>
            <button type="button" className="btn-sec" onClick={() => cambiar(`${ruta}.renglones`)([...c.renglones, renglonNuevo(c.renglones)])}>+ Renglón</button>
            <label className="casilla-opcional">
              <input type="checkbox" checked={c.pagada} onChange={(e) => cambiar(ruta)({ ...c, pagada: e.target.checked, faltaPagar: e.target.checked ? 0 : c.faltaPagar })} />
              Pagada entera
            </label>
            {!c.pagada && (
              <div className="grid-params">
                <CampoNumero etiqueta="Falta pagar" sufijo="$" decimales={0} valor={c.faltaPagar} onCambio={cambiar(`${ruta}.faltaPagar`)} />
              </div>
            )}
            <p className="nota resumen-mesada">Total {pesos(cuentas.total)} · pagado {pesos(cuentas.pagado)}{cuentas.falta > 0 ? ` · falta ${pesos(cuentas.falta)}` : ''}</p>
            <div className="pie-acciones no-print">
              <button type="button" className="btn-del eliminar-aparte" onClick={() => cambiar('seguimiento.compras')(compras.filter((x) => x.id !== c.id))}>Eliminar compra</button>
            </div>
          </FichaPlegable>
        );
      })}
    </Tarjeta>
  );
}
