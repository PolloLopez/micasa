// ==========================================================
// PreciosProveedores (v1.25): el precio de UN material en cada proveedor
// ----------------------------------------------------------
//   Proveedor        | Efectivo  | Tarjeta
//   Hierros Mercedes | 38000     | (auto $42.560)
//   Corralón Centro  |           | ← vacío = ese proveedor no lo tiene
//
// Tarjeta vacía = efectivo + el recargo del proveedor (se muestra en gris).
// Ver motor/proveedores.js.
// ==========================================================

import { useContext, useState } from 'react';
import { ContextoAgregarProveedor } from './contextoProveedores.js';
import { precioEn, precioBarraPorKg, enDolares, leerPrecio } from '../motor/proveedores.js';
import { kgPorMetro } from '../motor/perfiles.js';
import { esPrecioDeEjemplo } from '../motor/resumenPrecios.js';

const pesos = (n) => n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

/**
 * Campo de precio que puede quedar vacío (= sin precio).
 * Guarda al salir del campo o con Enter; si lo escrito no es un número >= 0 avisa y no guarda.
 */
export function CampoPrecio({ etiqueta, valor, ayuda, onCambio }) {
  const [texto, setTexto] = useState(null); // null = no se está editando: muestra el valor guardado
  const [error, setError] = useState(null);
  // v1.81: con decimales (los dólares: "245,50"), con coma como se escribe acá.
  const mostrado = texto ?? (valor === null || valor === undefined ? '' : String(valor).replace('.', ','));

  const guardar = () => {
    if (texto === null) return;
    if (texto.trim() === '') {
      onCambio(null);
    } else {
      const n = leerPrecio(texto); // "38.000", "38000", "245,50" o "245.5"
      if (n === null) {
        setError('Precio inválido');
        return;
      }
      onCambio(n);
    }
    setError(null);
    setTexto(null);
  };

  return (
    <span className={`campo-precio${error ? ' con-error' : ''}`}>
      <input type="text" inputMode="numeric" value={mostrado} aria-label={etiqueta} placeholder={ayuda}
        aria-invalid={Boolean(error)} onChange={(e) => setTexto(e.target.value)} onBlur={guardar}
        onKeyDown={(e) => {
          if (e.key === 'Enter') guardar();
          if (e.key === 'Escape') { setTexto(null); setError(null); }
        }} />
      {error && <small className="error" role="alert">{error}</small>}
    </span>
  );
}


/**
 * @param material     el renglón del catálogo (con `precios` y `nombre`)
 * @param proveedores  lista de proveedores
 * @param unidad       'barra', 'm²', 'placa', 'u'… (para el título: "Precio por barra")
 * @param onCambiar    (idProveedor, 'efectivo' | 'tarjeta', valor | null) => void
 * v1.72 (Leandro: "en precio por no deben aparecer todos, es muy extensa la lista"): se ven solo los proveedores
 * que tienen precio de este material; "+ Precio en otro proveedor" suma uno (o uno nuevo).
 */
export default function PreciosProveedores({ material, proveedores, unidad, onCambiar }) {
  const agregarProveedor = useContext(ContextoAgregarProveedor);
  const [agregados, setAgregados] = useState([]); // los que se sumaron recién (todavía sin precio)
  const [nombreNuevo, setNombreNuevo] = useState(null); // null = no se está creando uno
  const tienePrecio = (p) => {
    const precio = material.precios?.[p.id];
    return precio && (precio.efectivo !== null && precio.efectivo !== undefined || (precio.tarjeta !== null && precio.tarjeta !== undefined)
      || Number.isFinite(precio.porKg)); // v1.77: o por kilo
  };
  const visibles = proveedores.filter((p) => tienePrecio(p) || agregados.includes(p.id));
  const otros = proveedores.filter((p) => !visibles.includes(p));
  const elegir = (v) => {
    if (v === '__nuevo') setNombreNuevo('');
    else if (v) setAgregados((a) => [...a, v]);
  };
  const crear = () => {
    const nombre = (nombreNuevo ?? '').trim();
    if (!nombre || !agregarProveedor) return;
    const id = agregarProveedor(nombre);
    if (id) setAgregados((a) => [...a, id]);
    setNombreNuevo(null);
  };
  // v1.77: los hierros también se pueden cotizar por kilo (la barra sale de su peso).
  const esHierro = material.categoria === 'hierro';
  const kgBarra = esHierro ? kgPorMetro(material) * (material.largoBarra || 0) : 0;
  const kg = (n) => n.toLocaleString('es-AR', { maximumFractionDigits: 1 });
  return (
    <div className="precios-material">
    {esHierro && (
      <p className="nota nota-kg">
        {kgBarra > 0 ? `Pesa ${kg(kgPorMetro(material))} kg/m · ${kg(kgBarra)} kg la barra de ${kg(material.largoBarra)} m: si te lo cotizan por kilo, cargalo en "$/kg".`
          : 'Este perfil no tiene peso (cargá sus kg/m) para cotizarlo por kilo.'}
      </p>
    )}
    {visibles.length > 0 ? (
    <table className="tabla-precios">
      <thead>
        <tr><th>Precio por {unidad}</th><th>Efectivo</th><th>Tarjeta</th>{esHierro && kgBarra > 0 && <th>o $/kg</th>}</tr>
      </thead>
      <tbody>
        {visibles.map((p) => {
          const precio = material.precios?.[p.id] ?? {};
          const porKg = esHierro ? precioBarraPorKg(material, precio.porKg) : null;
          const conRecargo = precioEn({ ...material, precios: { [p.id]: { efectivo: precio.efectivo, tarjeta: null, porKg: precio.porKg } } }, p, 'tarjeta');
          // v1.81: un proveedor en dólares: se carga en US$ (como lo pasa) y abajo dice cuánto da en pesos.
          const usd = enDolares(p);
          const enPesos = usd ? precioEn(material, p, 'efectivo') : null;
          return (
            <tr key={p.id}>
              <td className="nombre-proveedor">{p.nombre}{usd && <small> · en US$ (a {pesos(p.dolar ?? 0)})</small>}
                {esPrecioDeEjemplo(material, p.id) && <small className="falta"> ⚠ de ejemplo</small>}</td>
              <td>
                <CampoPrecio etiqueta={`Precio en efectivo de ${material.nombre} en ${p.nombre}${usd ? ' (en dólares)' : ''}`} valor={precio.efectivo}
                  ayuda={usd ? 'US$' : porKg !== null ? `${pesos(porKg)} (por kg)` : 'no lo vende'} onCambio={(v) => onCambiar(p.id, 'efectivo', v)} />
                {usd && enPesos !== null && <small className="en-pesos">= {pesos(enPesos)}{p.dolar > 0 ? '' : ' (falta el dólar)'}</small>}
              </td>
              <td>
                <CampoPrecio etiqueta={`Precio con tarjeta de ${material.nombre} en ${p.nombre}`} valor={precio.tarjeta}
                  ayuda={conRecargo !== null ? `auto ${pesos(conRecargo)}` : '—'} onCambio={(v) => onCambiar(p.id, 'tarjeta', v)} />
              </td>
              {esHierro && kgBarra > 0 && (
                <td>
                  <CampoPrecio etiqueta={`Precio por kilo de ${material.nombre} en ${p.nombre}`} valor={precio.porKg}
                    ayuda="$/kg" onCambio={(v) => onCambiar(p.id, 'porKg', v)} />
                </td>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
    ) : <p className="vacio">Sin precio en ningún proveedor.</p>}
    <div className="agregar-precio no-print">
      {nombreNuevo === null ? (
        <select value="" aria-label={`Agregar el precio de ${material.nombre} en otro proveedor`} onChange={(e) => elegir(e.target.value)}>
          <option value="">+ Precio en otro proveedor…</option>
          {otros.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          {agregarProveedor && <option value="__nuevo">+ Proveedor nuevo…</option>}
        </select>
      ) : (
        <span className="proveedor-nuevo">
          <input type="text" maxLength={60} autoFocus value={nombreNuevo} placeholder="Nombre del proveedor" aria-label="Nombre del proveedor nuevo"
            onChange={(e) => setNombreNuevo(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') crear(); if (e.key === 'Escape') setNombreNuevo(null); }} />
          <button type="button" className="btn-mini" onClick={crear} disabled={!nombreNuevo.trim()}>Agregar</button>
          <button type="button" className="btn-mini" onClick={() => setNombreNuevo(null)}>Cancelar</button>
        </span>
      )}
    </div>
    </div>
  );
}
