// ==========================================================
// CierrePresupuesto (v1.46): de "materiales" a "precio de la obra"
// ----------------------------------------------------------
// Mano de obra, imprevistos, ganancia e IVA (ver motor/cierre.js), con el
// detalle de cómo se llega al precio. De fábrica todo en 0 (no cambia nada).
// Cada cambio se valida en App (cambiar) y se guarda en el proyecto.
// ==========================================================

import CampoNumero from './CampoNumero.jsx';
import CampoSelect from './CampoSelect.jsx';
import { MODOS_MANO_DE_OBRA, IVAS } from '../motor/cierre.js';

const pesos = (n) => n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
const SUFIJO = { global: '$', porM2: '$/m²', porKg: '$/kg', porcentaje: '%' };
const ETIQUETA_VALOR = { global: 'Monto', porM2: 'Precio por m²', porKg: 'Precio por kg', porcentaje: 'Porcentaje' };

/**
 * @param cierre    params.cierre
 * @param resultado lo que devuelve cerrarPresupuesto (renglones y total)
 * @param medidas   { m2, kg } para explicar de dónde sale la mano de obra
 */
export default function CierrePresupuesto({ cierre, resultado, medidas, cambiar }) {
  const modo = cierre.manoDeObra.modo;
  return (
    <details className="cierre-presupuesto" open={resultado.conCierre || undefined}>
      <summary>
        <strong>Mano de obra, imprevistos, ganancia e IVA</strong>
        <small>{resultado.conCierre ? ` · precio de la obra ${pesos(resultado.total)}` : ' · para pasar de materiales a precio de la obra'}</small>
      </summary>
      <div className="grid-params">
        <CampoSelect etiqueta="Mano de obra" valor={modo} opciones={MODOS_MANO_DE_OBRA} onCambio={cambiar('cierre.manoDeObra.modo')} />
        {modo !== 'ninguna' && (
          <CampoNumero etiqueta={ETIQUETA_VALOR[modo]} sufijo={SUFIJO[modo]} decimales={modo === 'porcentaje' ? 1 : 0}
            valor={cierre.manoDeObra.valor} onCambio={cambiar('cierre.manoDeObra.valor')} />
        )}
        <CampoNumero etiqueta="Imprevistos" sufijo="%" decimales={1} valor={cierre.imprevistos} onCambio={cambiar('cierre.imprevistos')} />
        <CampoNumero etiqueta="Ganancia" sufijo="%" decimales={1} valor={cierre.ganancia} onCambio={cambiar('cierre.ganancia')} />
        <CampoSelect etiqueta="IVA" valor={String(cierre.iva)}
          opciones={IVAS.map((v) => [String(v), v === 0 ? 'Sin IVA' : `${String(v).replace('.', ',')} %${v === 10.5 ? ' (vivienda)' : ''}`])}
          onCambio={(v) => cambiar('cierre.iva')(Number(v))} />
      </div>
      {modo === 'porM2' && <p className="nota">Superficie cubierta: {medidas.m2.toFixed(2).replace('.', ',')} m² (planta baja + entrepiso).</p>}
      {modo === 'porKg' && <p className="nota">Hierro: ≈ {Math.round(medidas.kg).toLocaleString('es-AR')} kg (barras enteras, como en la lista de materiales).</p>}
      {resultado.conCierre && <TablaCierre resultado={resultado} />}
    </details>
  );
}

/** Cómo se llega al precio: cada suma y los subtotales. También la usa el PDF. */
export function TablaCierre({ resultado }) {
  return (
    <table className="tabla-cierre">
      <tbody>
        {resultado.renglones.map((r) => (
          <tr key={r.clave} className={r.subtotal ? 'subtotal-cierre' : ''}>
            <td>{r.subtotal ? '= ' : r.clave === 'materiales' ? '' : '+ '}{r.concepto}{r.detalle && <small> ({r.detalle})</small>}</td>
            <td className="num">{pesos(r.monto)}</td>
          </tr>
        ))}
        <tr className="fila-total"><td>PRECIO DE LA OBRA</td><td className="num">{pesos(resultado.total)}</td></tr>
      </tbody>
    </table>
  );
}
