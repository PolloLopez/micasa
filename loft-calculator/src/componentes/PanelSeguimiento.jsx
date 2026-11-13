// ==========================================================
// PanelSeguimiento (v1.47): lo pagado, lo contratado y lo terminado
// ----------------------------------------------------------
// Arriba el resumen de la obra (presupuestado, contratado, pagado, saldo);
// abajo cada rubro con su estado, quién lo hace, el monto cerrado, sus
// fechas y sus pagos. "Armar desde el presupuesto" agrega un rubro por
// proveedor y la mano de obra (lo presupuestado se actualiza solo).
// Las cuentas están en motor/seguimiento.js; cada cambio se valida en App.
// ==========================================================

import { useState } from 'react';
import Tarjeta from './Tarjeta.jsx';
import FichaPlegable from './FichaPlegable.jsx';
import CampoNumero from './CampoNumero.jsx';
import { MEDIOS_PAGO, hoy, rubroNuevo, pagoNuevo, rubrosDesdePresupuesto, cuentasDelRubro, resumenSeguimiento,
  etapaDelRubro, estadoSegunAvance, totalesPorQuien } from '../motor/seguimiento.js';
import { PlanDeCuotas, EstadoDeCuotas, SelectorCuota, SelectorAcreedor } from './Cuotas.jsx';

const pesos = (n) => n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

/** Una fecha (input nativo del navegador: en el celular abre el calendario). */
function CampoFecha({ etiqueta, valor, onCambio }) {
  return (
    <div className="group">
      <label>{etiqueta}
        <input type="date" value={valor} onChange={(e) => onCambio(e.target.value)} />
      </label>
    </div>
  );
}

/** Barra de lo pagado contra lo contratado. */
function BarraPagado({ pagado, contratado }) {
  const porcentaje = contratado > 0 ? Math.min(100, (pagado / contratado) * 100) : 0;
  return (
    <div className="barra-pagado" role="img" aria-label={`Pagado ${Math.round(porcentaje)} %`}>
      <span style={{ width: `${porcentaje}%` }} />
    </div>
  );
}

function Pago({ p, ruta, cambiar, onQuitar, plan, acreedores }) {
  return (
    <li className="pago">
      <input type="date" value={p.fecha} aria-label="Fecha del pago" onChange={(e) => cambiar(`${ruta}.fecha`)(e.target.value)} />
      <CampoNumero etiqueta="" sufijo="$" decimales={0} valor={p.monto} onCambio={cambiar(`${ruta}.monto`)} />
      <select value={p.medio} aria-label="Medio de pago" onChange={(e) => cambiar(`${ruta}.medio`)(e.target.value)}>
        {MEDIOS_PAGO.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
      </select>
      <input type="text" maxLength={120} value={p.nota} placeholder="Nota (seña, cuota 2, recibo 0012…)" aria-label="Nota del pago"
        onChange={(e) => cambiar(`${ruta}.nota`)(e.target.value)} />
      <SelectorCuota plan={plan} valor={p.cuota} onCambio={cambiar(`${ruta}.cuota`)} />
      <SelectorAcreedor acreedores={acreedores} valor={p.acreedor} onCambio={cambiar(`${ruta}.acreedor`)} />
      <button type="button" className="btn-del" onClick={onQuitar} aria-label="Quitar el pago" title="Quitar">✕</button>
    </li>
  );
}

function Rubro({ r, i, partes, acreedores, cambiar, onQuitar, abiertaAlInicio }) {
  const ruta = `seguimiento.rubros.${i}`;
  const c = cuentasDelRubro(r, partes);
  const agregarPago = () => {
    // Con cuotas, el pago nuevo es la próxima cuota (con lo que le falta); si no, lo que falta pagar.
    const proxima = r.cuotas ? etapaDelRubro(r, c).cuotas?.proxima : null;
    const pago = pagoNuevo(r.pagos, proxima ? Math.round(proxima.monto - proxima.pagado) : c.saldo);
    cambiar(`${ruta}.pagos`)([...r.pagos, proxima ? { ...pago, cuota: proxima.n } : pago]);
  };
  const quitarPago = (id) => cambiar(`${ruta}.pagos`)(r.pagos.filter((p) => p.id !== id));
  // v1.54: la etapa sale sola del avance (a mano) y de lo pagado. Al llegar a 100 % se anota la fecha de hoy si no
  // tenía (se puede cambiar). El estado viejo se mantiene al día para los proyectos de antes.
  const etapa = etapaDelRubro(r, c);
  const cambiarAvance = (avance) => {
    if (!(avance >= 0 && avance <= 100)) return 'De 0 a 100 %';
    return cambiar(ruta)({ ...r, avance, estado: estadoSegunAvance(avance, r.estado),
      fechaFin: avance >= 100 && !r.fechaFin ? hoy() : r.fechaFin });
  };
  return (
    <FichaPlegable clave={`rubro:${r.id}`} className={`rubro estado-${r.estado}`} abiertaAlInicio={abiertaAlInicio}
      encabezado={<>
        <span className={`chip-estado etapa-${etapa.etapa}`}>{etapa.texto.split(' · ')[0]}</span>
        <strong>{r.nombre}</strong>
        <small>{c.pagadoTodo ? 'pagado ✓' : `pagado ${pesos(c.pagado)} de ${pesos(c.contratado)}`}{r.avance > 0 && r.avance < 100 ? ` · ${Math.round(r.avance)} % hecho` : ''}</small>
      </>}
      acciones={<button type="button" className="btn-del" onClick={onQuitar} aria-label={`Quitar ${r.nombre}`} title="Quitar">✕</button>}>
      <p className="etapa-rubro" role="status">{etapa.texto}</p>
      <BarraPagado pagado={c.pagado} contratado={c.contratado} />
      <div className="barra-avance" role="img" aria-label={`Hecho ${Math.round(r.avance ?? 0)} %`}><span style={{ width: `${r.avance ?? 0}%` }} /></div>
      <div className="grid-params">
        <div className="group">
          <label>Nombre
            <input type="text" maxLength={60} value={r.nombre} onChange={(e) => cambiar(`${ruta}.nombre`)(e.target.value)} />
          </label>
        </div>
        <div className="group">
          <label>Quién (proveedor o contratista)
            <input type="text" maxLength={60} value={r.quien} onChange={(e) => cambiar(`${ruta}.quien`)(e.target.value)} />
          </label>
        </div>
        <CampoNumero etiqueta="Avance (cuánto está hecho)" sufijo="%" decimales={0} valor={r.avance ?? 0} onCambio={cambiarAvance} />
        {!r.origen && (
          <CampoNumero etiqueta="Presupuestado" sufijo="$" decimales={0} valor={r.presupuestado} onCambio={cambiar(`${ruta}.presupuestado`)} />
        )}
        <CampoNumero etiqueta="Monto contratado" sufijo="$" decimales={0} valor={c.contratado}
          onCambio={(v) => cambiar(`${ruta}.contratado`)(v)} />
        <CampoFecha etiqueta="Fecha de contrato" valor={r.fechaContrato} onCambio={cambiar(`${ruta}.fechaContrato`)} />
        <CampoFecha etiqueta="Terminado el" valor={r.fechaFin} onCambio={cambiar(`${ruta}.fechaFin`)} />
      </div>
      <p className="nota">
        {r.origen ? `Presupuestado: ${pesos(c.presupuestado)} (sale del presupuesto, se actualiza solo)` : `Presupuestado: ${pesos(c.presupuestado)}`}
        {r.contratado !== null && r.contratado !== c.presupuestado && (<>
          {' · '}contratado {c.contratado > c.presupuestado ? 'por encima' : 'por debajo'} ({pesos(Math.abs(c.contratado - c.presupuestado))}){' '}
          <button type="button" className="btn-mini" onClick={() => cambiar(`${ruta}.contratado`)(null)}>usar lo presupuestado</button>
        </>)}
      </p>
      {c.sinOrigen && <p className="falta">⚠ Esta parte ya no está en el presupuesto (¿se quitó el proveedor?). Lo presupuestado queda en 0.</p>}
      <textarea className="detalle-rubro" maxLength={300} rows={2} value={r.detalle} placeholder="Detalle (qué incluye, condiciones, contacto…)"
        aria-label="Detalle" onChange={(e) => cambiar(`${ruta}.detalle`)(e.target.value)} />

      <h4 className="subtitulo-pared">Cuotas</h4>
      <PlanDeCuotas plan={r.cuotas} ruta={`${ruta}.cuotas`} cambiar={cambiar} montoSugerido={c.saldo} />
      <EstadoDeCuotas plan={r.cuotas} pagos={r.pagos} totalEsperado={c.contratado} />

      <h4 className="subtitulo-pared">Pagos</h4>
      {r.pagos.length === 0 && <p className="vacio">Sin pagos todavía.</p>}
      <ul className="lista-pagos">
        {r.pagos.map((p, k) => (
          <Pago key={p.id} p={p} ruta={`${ruta}.pagos.${k}`} cambiar={cambiar} onQuitar={() => quitarPago(p.id)} plan={r.cuotas} acreedores={acreedores} />
        ))}
      </ul>
      <p className="nota resumen-mesada" role="status">
        Pagado {pesos(c.pagado)} · {c.deMas > 0 ? `pagado de más ${pesos(c.deMas)}` : `falta ${pesos(c.saldo)}`}
      </p>
      <button type="button" className="btn-sec" onClick={agregarPago}>+ Pago</button>
    </FichaPlegable>
  );
}

/**
 * @param partes  lo que dice el presupuesto de cada parte (partesDelPresupuesto)
 * @param precioObra el precio de la obra (cierre), para comparar
 */
export default function PanelSeguimiento({ params, partes, precioObra, cambiar }) {
  const seguimiento = params.seguimiento ?? { rubros: [] };
  const rubros = seguimiento.rubros;
  const [recien, setRecien] = useState(null);
  const [aviso, setAviso] = useState(null);
  const resumen = resumenSeguimiento(seguimiento, partes);
  const faltanDelPresupuesto = partes.filter((p) => !rubros.some((r) => r.origen === p.origen));
  const armar = () => setAviso(cambiar('seguimiento.rubros')(rubrosDesdePresupuesto(rubros, partes)));
  const agregar = () => {
    const nuevo = rubroNuevo(rubros, {});
    setRecien(nuevo.id);
    setAviso(cambiar('seguimiento.rubros')([...rubros, nuevo]));
  };
  const quitar = (id) => cambiar('seguimiento.rubros')(rubros.filter((r) => r.id !== id));
  const acreedores = params.finanzas?.acreedores ?? [];
  // v1.54: en proceso primero, después lo presupuestado y al final lo finalizado (sin cambiar el orden guardado).
  const orden = { enProceso: 0, finalizadoFaltaPagar: 1, pagadoSinFinalizar: 2, presupuestado: 3, finalizadoPagado: 4 };
  const etapaDe = (r) => etapaDelRubro(r, cuentasDelRubro(r, partes)).etapa;
  const ordenados = rubros.map((r, i) => ({ r, i })).sort((a, b) => orden[etapaDe(a.r)] - orden[etapaDe(b.r)] || a.i - b.i);
  const porQuien = totalesPorQuien(seguimiento, partes);

  return (
    <Tarjeta id="seguimiento" titulo="Seguimiento de la obra">
      <p className="nota">
        Lo contratado, lo pagado (en partes o todo) y lo terminado, por rubro. Se guarda con el proyecto. No es
        contabilidad: es para saber cuánto se pagó y cuánto falta.
      </p>
      <div className="resumen-seguimiento">
        <div><small>Presupuestado</small><strong>{pesos(resumen.presupuestado)}</strong></div>
        <div><small>Contratado</small><strong>{pesos(resumen.contratado)}</strong></div>
        <div><small>Pagado</small><strong>{pesos(resumen.pagado)}</strong></div>
        <div><small>Falta pagar</small><strong>{pesos(resumen.saldo)}</strong></div>
        <div><small>Finalizados</small><strong>{resumen.terminados} de {resumen.rubros}</strong></div>
      </div>
      {resumen.rubros > 0 && <BarraPagado pagado={resumen.pagado} contratado={resumen.contratado} />}
      {precioObra > 0 && Math.abs(precioObra - resumen.presupuestado) > 1 && resumen.rubros > 0 && (
        <p className="nota">El precio de la obra es {pesos(precioObra)}: la diferencia con lo presupuestado acá son los
          imprevistos, la ganancia y el IVA (o rubros que todavía no agregaste).</p>
      )}
      {rubros.length === 0 && <p className="vacio">Todavía no hay rubros. Armalos desde el presupuesto o agregá uno a mano.</p>}
      {ordenados.map(({ r, i }) => (
        <Rubro key={r.id} r={r} i={i} partes={partes} acreedores={acreedores} cambiar={cambiar} onQuitar={() => quitar(r.id)} abiertaAlInicio={r.id === recien} />
      ))}
      <div className="acciones-seguimiento">
        {faltanDelPresupuesto.length > 0 && (
          <button type="button" className="btn-sec" onClick={armar}
            title={`Agrega: ${faltanDelPresupuesto.map((p) => p.nombre).join(', ')}`}>
            Armar desde el presupuesto ({faltanDelPresupuesto.length})
          </button>
        )}
        <button type="button" className="btn-sec" onClick={agregar}>+ Rubro a mano</button>
      </div>
      {aviso && <p className="error" role="alert">{aviso}</p>}
      {porQuien.length > 0 && (
        <details className="por-quien">
          <summary><strong>Por proveedor o contratista</strong> <small>· cuánto es de cada uno, lo pagado y lo que falta</small></summary>
          <table className="tabla-segmentos">
            <thead><tr><th>Quién</th><th>Rubros</th><th className="num">Total</th><th className="num">Pagado</th><th className="num">Falta</th></tr></thead>
            <tbody>
              {porQuien.map((g) => (
                <tr key={g.quien}><td>{g.quien}</td><td><small>{g.rubros.join(', ')}</small></td>
                  <td className="num">{pesos(g.contratado)}</td><td className="num">{pesos(g.pagado)}</td><td className="num">{pesos(g.falta)}</td></tr>
              ))}
            </tbody>
          </table>
          <p className="nota">Se agrupa por lo que escribiste en "Quién" (sin importar mayúsculas).</p>
        </details>
      )}
    </Tarjeta>
  );
}
