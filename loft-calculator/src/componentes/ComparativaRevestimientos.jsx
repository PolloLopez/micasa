// ==========================================================
// ComparativaRevestimientos (v1.59): ¿con qué panel sale más barato?
// ----------------------------------------------------------
// Plegada de fábrica (calcular la obra con cada panel lleva un momento):
// al abrirla, arma la obra con cada tipo de panel del catálogo en todas las
// paredes y muestra cuánto se necesita, el total y la diferencia con lo de
// ahora. "Usar en las 4 paredes" lo elige. Cuentas en motor/comparativa.js.
// ==========================================================

import { useMemo, useState } from 'react';
import { compararRevestimientos } from '../motor/comparativa.js';
import { LADOS } from '../motor/constantes.js';
import NotaPlegable from './NotaPlegable.jsx';

const pesos = (n) => n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

export default function ComparativaRevestimientos({ params, aberturas, catalogo, opciones, cambiarVarios }) {
  const [abierta, setAbierta] = useState(false);
  const filas = useMemo(() => (abierta ? compararRevestimientos(params, aberturas, catalogo, opciones) : []),
    // v1.74.1: + disco, retazo y empalmes (faltaban: la comparación no los seguía).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [abierta, params, aberturas, catalogo, opciones.proveedor, opciones.pago, opciones.excedenteBarras, opciones.compartir,
      opciones.mermaCorte, opciones.retazoMinimo, opciones.empalmesSobreApoyo]);
  if (catalogo.filter((i) => i.categoria === 'panel').length < 2) return null;
  const usar = (id) => cambiarVarios(LADOS.map((l) => [`paredes.${l}.panel`, id]));
  return (
    <details className="comparativa-revestimientos no-print" open={abierta} onToggle={(e) => setAbierta(e.currentTarget.open)}>
      <summary><strong>Comparar revestimientos</strong> <small>· la obra con cada panel en las 4 paredes (el techo queda como está)</small></summary>
      <table className="tabla-segmentos">
        <thead><tr><th>Panel</th><th className="num">Espesor</th><th className="num">Hace falta</th><th className="num">Total de la obra</th>
          <th className="num">Mano de obra</th><th className="num">Diferencia</th><th /></tr></thead>
        <tbody>
          {filas.map((f) => (
            <tr key={f.id} className={f.actual ? 'fila-actual' : ''}>
              <td>{f.nombre}<br /><small>{f.perfil}{f.sinPrecio ? ' · ⚠ sin precio en este proveedor' : ''}</small>
                {/* v1.102: lo que lleva además (capas y el interior que va con él), con su plata. */}
                {f.capas.length > 0 && <div className="capas-comparativa">+ {f.capas.map((c) =>
                  `${c.cantidad.toLocaleString('es-AR', { maximumFractionDigits: 2 })} ${c.unidad} ${c.nombre.toLowerCase()}${c.subtotal > 0 ? ` (${pesos(c.subtotal)})` : ' (sin precio)'}`).join(' · ')}</div>}</td>
              <td className="num" data-etiqueta="Espesor">{f.espesor ? `${f.espesor} mm` : '—'}</td>
              <td className="num" data-etiqueta="Hace falta">{f.cantidad.toLocaleString('es-AR', { maximumFractionDigits: 2 })} {f.unidad}</td>
              <td className="num" data-etiqueta="Total de la obra">{pesos(f.total)}</td>
              <td className="num" data-etiqueta="Mano de obra">{f.manoDeObra > 0 ? <>{pesos(f.manoDeObra)}<br /><small>{Math.round(f.m2)} m² · total {pesos(f.totalConManoDeObra)}</small></> : <small>sin cargar</small>}</td>
              <td className="num" data-etiqueta="Diferencia">{f.actual ? 'el de ahora' : `${f.diferencia > 0 ? '+' : ''}${pesos(f.diferencia)}`}</td>
              <td className="accion-fila">{!f.actual && <button type="button" className="btn-mini" onClick={() => usar(f.id)}>Usar en las 4 paredes</button>}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <NotaPlegable>Para comparar otro panel (ej. uno de 10 mm), agregalo en Materiales → Revestimientos con su precio. Para comparar
        proveedores, mirá "Precios y detalle" (el total con cada uno). <strong>Por capas</strong> (v1.102): en Materiales →
        Revestimientos, "+ Sistema por capas: chapa + lana + fenólico" arma la chapa con el fenólico por dentro y sus capas
        (lana, membrana, listones y tacos); cargá sus precios y la <strong>mano de obra por m²</strong> de cada revestimiento
        (también la del panel) y la diferencia la incluye.</NotaPlegable>
    </details>
  );
}
