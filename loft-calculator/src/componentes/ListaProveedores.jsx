// ==========================================================
// Lista de proveedores (v1.25), en la pestaña Materiales
// ----------------------------------------------------------
// Cada proveedor: nombre, recargo con tarjeta (%), flete (v1.29) y una nota
// (teléfono, dirección…). Un material sin precio en un proveedor = ese
// proveedor no lo vende.
// v1.65: cada proveedor es una ficha plegable ("centrosider.com.ar · 14 de 22
// precios") y adentro tiene TODOS los precios de la obra en ese proveedor:
// con la lista de precios de un corralón en la mano, se cargan de una vez
// (sin abrir material por material).
// ==========================================================

import { useState } from 'react';
import CampoNumero from './CampoNumero.jsx';
import FichaPlegable from './FichaPlegable.jsx';
import { CampoPrecio } from './PreciosProveedores.jsx';
import { LIMITES_RECARGO, LIMITES_FLETE, precioEn } from '../motor/proveedores.js';
import { preciosCargados, PRECIO_SOSPECHOSO, antiguedadDePrecios, DIAS_PRECIO_VIEJO } from '../motor/resumenPrecios.js';
import { hoy } from '../motor/seguimiento.js';

const pesos = (n) => n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

/** Tabla: cada material de la obra con su precio en ESTE proveedor (vacío = no lo vende). */
function PreciosDelProveedor({ proveedor, materiales, onCambiarPrecio }) {
  // v1.72 (Leandro: "es al revés: solo me interesan los que SÍ tienen precio"): de fábrica, solo lo que vende;
  // tildando, también los demás (para cargarle un precio nuevo).
  const [verTodos, setVerTodos] = useState(false);
  const conPrecio = materiales.filter((m) => precioEn(m, proveedor, 'efectivo') !== null);
  const visibles = verTodos ? materiales : conPrecio;
  return (
    <>
      <label className="casilla-opcional">
        <input type="checkbox" checked={verTodos} onChange={(e) => setVerTodos(e.target.checked)} />
        Ver también lo que no tiene precio acá (para cargarle uno)
      </label>
      <div className="table-wrap">
        <table className="tabla-precios tabla-precios-proveedor">
          <thead><tr><th>Material</th><th>Por</th><th>Efectivo</th><th>Tarjeta</th></tr></thead>
          <tbody>
            {visibles.map((m) => {
              const precio = m.precios?.[proveedor.id] ?? {};
              const conRecargo = precioEn({ precios: { [proveedor.id]: { efectivo: precio.efectivo, tarjeta: null } } }, proveedor, 'tarjeta');
              return (
                <tr key={m.id}>
                  <td>{m.nombre}{precio.efectivo >= PRECIO_SOSPECHOSO && <small className="falta"> ⚠ revisá este precio</small>}</td>
                  <td>{m.unidadPrecio}</td>
                  <td><CampoPrecio etiqueta={`Precio en efectivo de ${m.nombre} en ${proveedor.nombre}`} valor={precio.efectivo}
                    ayuda="no lo vende" onCambio={(v) => onCambiarPrecio(m.id, proveedor.id, 'efectivo', v)} /></td>
                  <td><CampoPrecio etiqueta={`Precio con tarjeta de ${m.nombre} en ${proveedor.nombre}`} valor={precio.tarjeta}
                    ayuda={conRecargo !== null ? `auto ${pesos(conRecargo)}` : '—'} onCambio={(v) => onCambiarPrecio(m.id, proveedor.id, 'tarjeta', v)} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {visibles.length === 0 && <p className="nota">{proveedor.nombre} todavía no tiene precios de esta obra: tildá "Ver también" para cargarlos.</p>}
    </>
  );
}

/**
 * @param materiales  renglones del catálogo que usa esta obra, con `unidadPrecio` ('barra', 'm²'…)
 * @param idElegido   el proveedor con que calcula el Presupuesto (para marcarlo)
 */
export default function ListaProveedores({ proveedores, materiales = [], idElegido = null, onActualizar, onAgregar, onQuitar, onCambiarPrecio }) {
  const [recienAgregado, setRecienAgregado] = useState(false); // el nuevo arranca abierto
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
  // v1.70: los descartados van aparte (abajo), sin precios ni cuentas; se pueden volver a usar.
  const activos = proveedores.filter((p) => !p.descartado);
  const descartados = proveedores.filter((p) => p.descartado);
  return (
    <>
      <div className="lista-proveedores">
        {activos.map((p, i) => {
          const { cargados, total, sospechosos } = preciosCargados(p, materiales);
          const antiguedad = antiguedadDePrecios(p, hoy()); // v1.74
          return (
            <FichaPlegable key={p.id} clave={`proveedor:${p.id}`} className="rubro ficha-proveedor"
              abiertaAlInicio={recienAgregado && i === activos.length - 1}
              encabezado={<><strong>{p.nombre || 'Sin nombre'}</strong>
                <small className={cargados === 0 ? 'falta' : ''}>
                  {p.id === idElegido ? 'elegido en el Presupuesto · ' : ''}{cargados} de {total} precios
                  {p.recargoTarjeta ? ` · tarjeta +${p.recargoTarjeta} %` : ''}{p.flete ? ` · flete ${pesos(p.flete)}` : ''}
                  {sospechosos > 0 ? ` · ⚠ ${sospechosos} precio${sospechosos === 1 ? '' : 's'} para revisar` : ''}
                  {cargados > 0 && (antiguedad
                    ? <span className={antiguedad.vieja ? 'falta' : ''}> · {antiguedad.vieja ? '⚠ ' : ''}{antiguedad.texto}</span>
                    : ' · precios sin fecha')}
                </small></>}
>
              <div className="grid-params">
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
              </div>
              {/* v1.74: la fecha de los precios (se pone sola al cambiar uno; o a mano si siguen iguales). */}
              {cargados > 0 && (
                <p className={`nota fecha-precios${antiguedad?.vieja ? ' falta' : ''}`}>
                  {antiguedad ? `${antiguedad.texto[0].toUpperCase()}${antiguedad.texto.slice(1)}.` : 'Estos precios no tienen fecha (se cargaron antes de que la app la guardara).'}
                  {antiguedad?.vieja && ` Tienen más de ${DIAS_PRECIO_VIEJO} días: con la inflación, conviene pedir la lista nueva.`}{' '}
                  {antiguedad?.dias !== 0 && (
                    <button type="button" className="btn-mini no-print" onClick={() => onActualizar(p.id, { preciosAl: hoy() })}
                      title="Si le preguntaste y no cambiaron, la fecha pasa a hoy sin tocar los precios">Siguen iguales hoy</button>
                  )}
                </p>
              )}
              {onCambiarPrecio && materiales.length > 0 && (<>
                <h4 className="subtitulo-pared">Precios en {p.nombre || 'este proveedor'}</h4>
                <PreciosDelProveedor proveedor={p} materiales={materiales} onCambiarPrecio={onCambiarPrecio} />
              </>)}
              {/* Eliminar en el pie (como en las aberturas, v1.27: un ✕ arriba parece "cerrar"). */}
              <div className="pie-acciones no-print">
                {/* v1.70: descartado = no aparece más (presupuesto, más barato, precios); se guarda por si vuelve. */}
                <button type="button" className="btn-sec" onClick={() => onActualizar(p.id, { descartado: true })} disabled={activos.length === 1}
                  title={activos.length === 1 ? 'Tiene que quedar al menos uno' : 'No aparece más en el presupuesto ni en las listas (se guarda abajo)'}>Descartar</button>
                <button type="button" className="btn-del eliminar-aparte" onClick={() => onQuitar(p.id)} disabled={proveedores.length === 1}
                  aria-label={`Quitar ${p.nombre}`} title={proveedores.length === 1 ? 'Tiene que quedar al menos uno' : 'Quitar proveedor'}>Eliminar</button>
              </div>
            </FichaPlegable>
          );
        })}
      </div>
      <button type="button" className="btn-sec" onClick={() => { setRecienAgregado(true); onAgregar(); }}>+ Agregar proveedor</button>
      {descartados.length > 0 && (
        <details className="proveedores-descartados">
          <summary>Descartados ({descartados.length}): no aparecen en el presupuesto ni en las listas</summary>
          <ul>
            {descartados.map((p) => (
              <li key={p.id}>
                <span>{p.nombre}</span>
                <button type="button" className="btn-mini" onClick={() => onActualizar(p.id, { descartado: false })}>Volver a usar</button>
                <button type="button" className="btn-mini" onClick={() => onQuitar(p.id)}>Borrar del todo</button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </>
  );
}
