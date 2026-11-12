// ==========================================================
// CierrePresupuesto (v1.46): de "materiales" a "precio de la obra"
// ----------------------------------------------------------
// Mano de obra, imprevistos, ganancia e IVA (ver motor/cierre.js), con el
// detalle de cómo se llega al precio. De fábrica todo en 0 (no cambia nada).
// Cada cambio se valida en App (cambiar) y se guarda en el proyecto.
// ==========================================================

import CampoNumero from './CampoNumero.jsx';
import CampoSelect from './CampoSelect.jsx';
import { MODOS_MANO_DE_OBRA, IVAS, MODOS_SEGMENTO, segmentoNuevo, manoDeObra, completarCierre } from '../motor/cierre.js';

const pesos = (n) => n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
const SUFIJO = { global: '$', porM2: '$/m²', porKg: '$/kg', porcentaje: '%', porM2Revestimiento: '$/m²', porMetroTabique: '$/m', porPilotin: '$/u' };
const ETIQUETA_VALOR = { global: 'Monto', porM2: 'Precio por m²', porKg: 'Precio por kg', porcentaje: 'Porcentaje' };

/**
 * v1.53: mano de obra por segmento (pilotines, estructura, revestimiento, tabiques, tapial, pozo séptico, electricista,
 * plomero…): nombre, cómo se cobra, cuánto y lo que da con las medidas de la obra. Se agregan y se quitan.
 */
function Segmentos({ segmentos, medidas, materiales, cambiar }) {
  const cambiarSegmento = (i, cambios) => cambiar('cierre.segmentos')(segmentos.map((x, k) => (k === i ? { ...x, ...cambios } : x)));
  return (
    <div className="segmentos-mano-de-obra">
      <h4 className="subtitulo-pared">Mano de obra por segmento</h4>
      <p className="nota">Lo que cobra cada uno. En 0 no suma. En la pestaña Obra, "Armar desde el presupuesto" crea un rubro por cada uno para cargarle los pagos.</p>
      <table className="tabla-segmentos">
        <thead><tr><th>Segmento</th><th>Se cobra</th><th className="num">Precio</th><th className="num">Da</th><th /></tr></thead>
        <tbody>
          {segmentos.map((x, i) => (
            <tr key={x.id}>
              <td><input type="text" maxLength={40} value={x.nombre} aria-label="Nombre del segmento" onChange={(e) => cambiarSegmento(i, { nombre: e.target.value })} /></td>
              <td>
                <select value={x.modo} aria-label={`Cómo se cobra ${x.nombre}`} onChange={(e) => cambiarSegmento(i, { modo: e.target.value })}>
                  {MODOS_SEGMENTO.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
                </select>
              </td>
              <td className="num">
                <CampoNumero etiqueta="" sufijo={SUFIJO[x.modo]} decimales={x.modo === 'porcentaje' ? 1 : 0} valor={x.valor}
                  onCambio={(v) => { if (v < 0) return 'No puede ser negativo'; cambiarSegmento(i, { valor: v }); return null; }} />
              </td>
              <td className="num" title={manoDeObra(x, materiales, medidas).detalle}>{pesos(manoDeObra(x, materiales, medidas).monto)}</td>
              <td><button type="button" className="btn-del" aria-label={`Quitar ${x.nombre}`} title="Quitar"
                onClick={() => cambiar('cierre.segmentos')(segmentos.filter((_, k) => k !== i))}>✕</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" className="btn-sec" onClick={() => cambiar('cierre.segmentos')([...segmentos, segmentoNuevo(segmentos)])}>+ Segmento</button>
    </div>
  );
}

/**
 * @param cierre    params.cierre
 * @param resultado lo que devuelve cerrarPresupuesto (renglones y total)
 * @param medidas   { m2, kg, m2Revestimiento, mTabiques, pilotines } para explicar de dónde sale la mano de obra
 */
export default function CierrePresupuesto({ cierre: guardado, resultado, medidas, cambiar }) {
  const cierre = completarCierre(guardado);
  const modo = cierre.manoDeObra.modo;
  const materiales = resultado.renglones.find((r) => r.clave === 'materiales')?.monto ?? 0;
  return (
    <details className="cierre-presupuesto" open={resultado.conCierre || undefined}>
      <summary>
        <strong>Mano de obra, imprevistos, ganancia e IVA</strong>
        <small>{resultado.conCierre ? ` · precio de la obra ${pesos(resultado.total)}` : ' · para pasar de materiales a precio de la obra'}</small>
      </summary>
      <div className="grid-params">
        <CampoSelect etiqueta="Mano de obra general" valor={modo} opciones={MODOS_MANO_DE_OBRA} onCambio={cambiar('cierre.manoDeObra.modo')} />
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
      <Segmentos segmentos={cierre.segmentos} medidas={medidas} materiales={materiales} cambiar={cambiar} />
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
