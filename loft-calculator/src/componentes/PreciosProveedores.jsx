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

import { useState } from 'react';
import { precioEn } from '../motor/proveedores.js';

const pesos = (n) => n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

/**
 * Campo de precio que puede quedar vacío (= sin precio).
 * Guarda al salir del campo o con Enter; si lo escrito no es un número >= 0 avisa y no guarda.
 */
function CampoPrecio({ etiqueta, valor, ayuda, onCambio }) {
  const [texto, setTexto] = useState(null); // null = no se está editando: muestra el valor guardado
  const [error, setError] = useState(null);
  const mostrado = texto ?? (valor === null || valor === undefined ? '' : String(valor));

  const guardar = () => {
    if (texto === null) return;
    const limpio = texto.trim().replace(/\./g, '').replace(',', '.'); // "38.000" o "38000"
    if (limpio === '') {
      onCambio(null);
    } else {
      const n = Number(limpio);
      if (!Number.isFinite(n) || n < 0) {
        setError('Precio inválido');
        return;
      }
      onCambio(Math.round(n));
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
 */
export default function PreciosProveedores({ material, proveedores, unidad, onCambiar }) {
  return (
    <table className="tabla-precios">
      <thead>
        <tr><th>Precio por {unidad}</th><th>Efectivo</th><th>Tarjeta</th></tr>
      </thead>
      <tbody>
        {proveedores.map((p) => {
          const precio = material.precios?.[p.id] ?? {};
          const conRecargo = precioEn({ precios: { [p.id]: { efectivo: precio.efectivo, tarjeta: null } } }, p, 'tarjeta');
          return (
            <tr key={p.id}>
              <td className="nombre-proveedor">{p.nombre}</td>
              <td>
                <CampoPrecio etiqueta={`Precio en efectivo de ${material.nombre} en ${p.nombre}`} valor={precio.efectivo}
                  ayuda="no lo vende" onCambio={(v) => onCambiar(p.id, 'efectivo', v)} />
              </td>
              <td>
                <CampoPrecio etiqueta={`Precio con tarjeta de ${material.nombre} en ${p.nombre}`} valor={precio.tarjeta}
                  ayuda={conRecargo !== null ? `auto ${pesos(conRecargo)}` : '—'} onCambio={(v) => onCambiar(p.id, 'tarjeta', v)} />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
