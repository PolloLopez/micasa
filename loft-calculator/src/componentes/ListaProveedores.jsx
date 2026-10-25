// ==========================================================
// Lista de proveedores (v1.25), en la pestaña Materiales
// ----------------------------------------------------------
// Cada proveedor: nombre, recargo con tarjeta (%), flete (v1.29) y una nota
// (teléfono, dirección…). Los precios de cada material se cargan en ese material;
// un material sin precio en un proveedor = ese proveedor no lo vende.
// ==========================================================

import CampoNumero from './CampoNumero.jsx';
import { LIMITES_RECARGO, LIMITES_FLETE } from '../motor/proveedores.js';

export default function ListaProveedores({ proveedores, onActualizar, onAgregar, onQuitar }) {
  const cambiarRecargo = (id) => (v) => {
    if (v < LIMITES_RECARGO.min || v > LIMITES_RECARGO.max) return `Entre ${LIMITES_RECARGO.min} y ${LIMITES_RECARGO.max} %`;
    onActualizar(id, { recargoTarjeta: v });
    return null;
  };
  /** Flete y "gratis desde": montos en pesos, 0 = sin. */
  const cambiarMonto = (id, campo) => (v) => {
    if (v < LIMITES_FLETE.min || v > LIMITES_FLETE.max) return 'Monto inválido';
    onActualizar(id, { [campo]: Math.round(v) });
    return null;
  };
  return (
    <>
      <ul className="lista-proveedores">
        {proveedores.map((p) => (
          <li key={p.id} className="fila-proveedor">
            <div className="group">
              <label htmlFor={`nombre-${p.id}`}>Proveedor</label>
              <input id={`nombre-${p.id}`} type="text" maxLength={60} value={p.nombre}
                onChange={(e) => onActualizar(p.id, { nombre: e.target.value })} />
            </div>
            <CampoNumero etiqueta="Recargo con tarjeta" sufijo="%" decimales={1} valor={p.recargoTarjeta ?? 0}
              onCambio={cambiarRecargo(p.id)} />
            {/* v1.29: flete por pedido (0 = sin flete) y desde qué compra no lo cobra (0 = siempre). */}
            <CampoNumero etiqueta="Flete por pedido" sufijo="$" decimales={0} valor={p.flete ?? 0}
              onCambio={cambiarMonto(p.id, 'flete')} />
            {p.flete > 0 && (
              <CampoNumero etiqueta="Flete gratis desde (0 = nunca)" sufijo="$" decimales={0} valor={p.fleteGratisDesde ?? 0}
                onCambio={cambiarMonto(p.id, 'fleteGratisDesde')} />
            )}
            <div className="group nota-proveedor">
              <label htmlFor={`nota-${p.id}`}>Nota (teléfono, dirección…)</label>
              <input id={`nota-${p.id}`} type="text" maxLength={120} value={p.nota ?? ''}
                onChange={(e) => onActualizar(p.id, { nota: e.target.value })} />
            </div>
            <button type="button" className="btn-del" onClick={() => onQuitar(p.id)} disabled={proveedores.length === 1}
              aria-label={`Quitar ${p.nombre}`} title={proveedores.length === 1 ? 'Tiene que quedar al menos uno' : 'Quitar proveedor'}>Eliminar</button>
          </li>
        ))}
      </ul>
      <button type="button" className="btn-sec" onClick={onAgregar}>+ Agregar proveedor</button>
    </>
  );
}
