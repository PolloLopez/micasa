// ==========================================================
// Cuotas (v1.54): el plan de cuotas y su estado
// ----------------------------------------------------------
// Lo usan los rubros de la obra y los compromisos (terreno, créditos).
// Plan: cantidad, monto de cada cuota, mes de la primera y los meses del
// año en que la cuota es doble (de fábrica junio y diciembre). Las cuentas
// están en motor/finanzas.js.
// ==========================================================

import CampoNumero from './CampoNumero.jsx';
import { MESES, planDeCuotasNuevo, estadoDeCuotas, textoDeCuotas, mesLegible, plata } from '../motor/finanzas.js';

/**
 * Editor del plan. `plan` null = sin cuotas (muestra el botón para pasarlo a cuotas).
 * @param ruta  ruta del plan en params (ej. 'seguimiento.rubros.2.cuotas')
 * @param montoSugerido para la primera vez: lo que falta pagar, repartido en 12 cuotas con 2 dobles (/ 14)
 */
export function PlanDeCuotas({ plan, ruta, cambiar, moneda = 'ARS', montoSugerido = 0, permitirQuitar = true }) {
  if (!plan) {
    return (
      <button type="button" className="btn-sec" onClick={() => cambiar(ruta)(planDeCuotasNuevo(Math.round(montoSugerido / 14)))}>
        Pagar en cuotas
      </button>
    );
  }
  const alternarMes = (m) => cambiar(`${ruta}.mesesDobles`)(plan.mesesDobles.includes(m)
    ? plan.mesesDobles.filter((x) => x !== m) : [...plan.mesesDobles, m].sort((a, b) => a - b));
  return (
    <div className="plan-cuotas">
      <div className="grid-params">
        <CampoNumero etiqueta="Cantidad de cuotas" decimales={0} valor={plan.cantidad}
          onCambio={(v) => (Number.isInteger(v) ? cambiar(`${ruta}.cantidad`)(v) : 'Un número entero')} />
        <CampoNumero etiqueta="Cada cuota" sufijo={moneda === 'USD' ? 'USD' : '$'} decimales={0} valor={plan.monto} onCambio={cambiar(`${ruta}.monto`)} />
        <div className="group">
          <label>Primera cuota (mes)
            <input type="month" value={plan.inicio} onChange={(e) => e.target.value && cambiar(`${ruta}.inicio`)(e.target.value)} />
          </label>
        </div>
      </div>
      <fieldset className="meses-dobles">
        <legend>Meses en que la cuota es doble</legend>
        {MESES.map((nombre, i) => (
          <label key={nombre} className="check-mes">
            <input type="checkbox" checked={plan.mesesDobles.includes(i + 1)} onChange={() => alternarMes(i + 1)} />{nombre}
          </label>
        ))}
      </fieldset>
      {permitirQuitar && <button type="button" className="btn-mini" onClick={() => cambiar(ruta)(null)}>Sin cuotas</button>}
    </div>
  );
}

/** El estado: "3 de 12 cuotas pagas · debés 1 vencida · próxima…" y la lista de cuotas (plegada). */
export function EstadoDeCuotas({ plan, pagos, moneda = 'ARS', totalEsperado = null }) {
  if (!plan) return null;
  const e = estadoDeCuotas(plan, pagos);
  if (e.cuotas.length === 0) return null;
  return (
    <details className="estado-cuotas">
      <summary className={e.vencidasImpagas > 0 ? 'falta' : 'nota'}>{textoDeCuotas(e, moneda)} · total en cuotas {plata(e.totalCuotas, moneda)}
        {totalEsperado !== null && Math.abs(totalEsperado - e.totalCuotas) > plan.cantidad * 2 &&  ` (⚠ no da ${plata(totalEsperado, moneda)}: revisá el monto o la cantidad)`}</summary>
      <table className="tabla-cuotas">
        <thead><tr><th>Cuota</th><th>Mes</th><th className="num">Monto</th><th className="num">Pagado</th><th /></tr></thead>
        <tbody>
          {e.cuotas.map((c) => (
            <tr key={c.n} className={c.paga ? 'cuota-paga' : c.vencida ? 'cuota-vencida' : ''}>
              <td>{c.n}{c.doble ? ' (doble)' : ''}</td>
              <td>{mesLegible(c.mes)}</td>
              <td className="num">{plata(c.monto, moneda)}</td>
              <td className="num">{plata(c.pagado, moneda)}</td>
              <td>{c.paga ? '✓' : c.vencida ? '⚠ vencida' : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

/** Selector "a qué cuota va" de un pago (con anticipo opcional). */
export function SelectorCuota({ plan, valor, onCambio, conAnticipo = false }) {
  if (!plan && !conAnticipo) return null;
  const cuotas = plan ? Array.from({ length: plan.cantidad }, (_, i) => i + 1) : [];
  return (
    <select value={valor ?? ''} aria-label="A qué cuota va" onChange={(e) => onCambio(e.target.value === '' ? null : Number(e.target.value))}>
      <option value="">{plan ? 'Cuota: en orden' : 'Pago suelto'}</option>
      {conAnticipo && <option value="0">Anticipo</option>}
      {cuotas.map((n) => <option key={n} value={n}>Cuota {n}</option>)}
    </select>
  );
}

/** Selector "¿quién lo pagó?": vos o un acreedor (entonces se lo debés). */
export function SelectorAcreedor({ acreedores, valor, onCambio }) {
  if (!acreedores || acreedores.length === 0) return null;
  return (
    <select value={valor ?? ''} aria-label="Quién lo pagó" onChange={(e) => onCambio(e.target.value === '' ? null : Number(e.target.value))}>
      <option value="">Lo pagué yo</option>
      {acreedores.map((a) => <option key={a.id} value={a.id}>Lo pagó {a.nombre} (se lo debo)</option>)}
    </select>
  );
}
