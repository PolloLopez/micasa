// ==========================================================
// PanelFinanzas (v1.54): terreno en cuotas, créditos y acreedores
// ----------------------------------------------------------
// Va en la pestaña Obra, debajo del seguimiento. Cada compromiso (el
// terreno, un crédito) tiene su moneda y NO se convierte: los dólares
// se suman con dólares. Un pago puede decir "lo pagó X": entonces se lo
// debés a X (ver la lista de acreedores). Cuentas en motor/finanzas.js.
// ==========================================================

import { useState } from 'react';
import Tarjeta from './Tarjeta.jsx';
import FichaPlegable from './FichaPlegable.jsx';
import CampoNumero from './CampoNumero.jsx';
import CampoSelect from './CampoSelect.jsx';
import { PlanDeCuotas, EstadoDeCuotas, SelectorCuota, SelectorAcreedor } from './Cuotas.jsx';
import {
  MONEDAS, TIPOS_COMPROMISO, compromisoNuevo, pagoDeCompromisoNuevo, cuentasDelCompromiso, acreedorNuevo, devolucionNueva,
  deudasConAcreedores, resumenDeFinanzas, plata, completarFinanzas,
} from '../motor/finanzas.js';
import { fechaLegible } from '../motor/seguimiento.js';

function Compromiso({ c, i, acreedores, cambiar, onQuitar, abiertaAlInicio }) {
  const ruta = `finanzas.compromisos.${i}`;
  const k = cuentasDelCompromiso(c);
  const agregarPago = () => {
    // El pago nuevo: el anticipo si no se pagó, si no la próxima cuota.
    const anticipo = c.anticipo > 0 && k.anticipoPagado < c.anticipo;
    const proxima = k.cuotas.proxima;
    const monto = anticipo ? c.anticipo - k.anticipoPagado : proxima ? proxima.monto - proxima.pagado : k.falta;
    cambiar(`${ruta}.pagos`)([...c.pagos, pagoDeCompromisoNuevo(c.pagos, { monto: Math.round(monto), cuota: anticipo ? 0 : proxima?.n ?? null })]);
  };
  const quitarPago = (id) => cambiar(`${ruta}.pagos`)(c.pagos.filter((p) => p.id !== id));
  const sufijo = c.moneda === 'USD' ? 'USD' : '$';
  return (
    <FichaPlegable clave={`compromiso:${c.id}`} className="rubro compromiso" abiertaAlInicio={abiertaAlInicio}
      encabezado={<>
        <span className="chip-estado">{c.tipo === 'credito' ? 'Crédito' : 'En cuotas'}</span>
        <strong>{c.nombre}</strong>
        <small>pagado {plata(k.pagado, c.moneda)} de {plata(k.total, c.moneda)}{k.cuotas.vencidasImpagas > 0 ? ` · ⚠ ${k.cuotas.vencidasImpagas} vencida(s)` : ''}</small>
      </>}
      acciones={<button type="button" className="btn-del" onClick={onQuitar} aria-label={`Quitar ${c.nombre}`} title="Quitar">✕</button>}>
      <div className="grid-params">
        <div className="group">
          <label>Nombre
            <input type="text" maxLength={60} value={c.nombre} onChange={(e) => cambiar(`${ruta}.nombre`)(e.target.value)} />
          </label>
        </div>
        <CampoSelect etiqueta="Tipo" valor={c.tipo} opciones={TIPOS_COMPROMISO} onCambio={cambiar(`${ruta}.tipo`)} />
        <CampoSelect etiqueta="Moneda" valor={c.moneda} opciones={MONEDAS} onCambio={cambiar(`${ruta}.moneda`)} />
        <CampoNumero etiqueta={c.tipo === 'credito' ? 'Total a devolver (0 = las cuotas)' : 'Precio total (0 = anticipo + cuotas)'} sufijo={sufijo}
          decimales={0} valor={c.total} onCambio={cambiar(`${ruta}.total`)} />
        <CampoNumero etiqueta="Anticipo (cuota inicial)" sufijo={sufijo} decimales={0} valor={c.anticipo} onCambio={cambiar(`${ruta}.anticipo`)} />
      </div>
      {c.tipo === 'credito' && <p className="nota">Crédito: cargá en "Cada cuota" lo que devolvés por mes. Lo que te prestaron va en la nota.</p>}
      <textarea className="detalle-rubro" maxLength={300} rows={2} value={c.nota} placeholder="Nota (vendedor, lote, condiciones, interés…)"
        aria-label="Nota" onChange={(e) => cambiar(`${ruta}.nota`)(e.target.value)} />
      <h4 className="subtitulo-pared">Cuotas</h4>
      <PlanDeCuotas plan={c.cuotas} ruta={`${ruta}.cuotas`} cambiar={cambiar} moneda={c.moneda} montoSugerido={k.falta} />
      <EstadoDeCuotas plan={c.cuotas} pagos={c.pagos} moneda={c.moneda} />
      {c.anticipo > 0 && (
        <p className={k.anticipoPagado >= c.anticipo ? 'nota' : 'falta'}>
          Anticipo: pagado {plata(k.anticipoPagado, c.moneda)} de {plata(c.anticipo, c.moneda)}{k.anticipoPagado >= c.anticipo ? ' ✓' : ''}
        </p>
      )}
      <h4 className="subtitulo-pared">Pagos</h4>
      {c.pagos.length === 0 && <p className="vacio">Sin pagos todavía.</p>}
      <ul className="lista-pagos">
        {c.pagos.map((p, n) => {
          const rp = `${ruta}.pagos.${n}`;
          return (
            <li key={p.id} className="pago">
              <input type="date" value={p.fecha} aria-label="Fecha del pago" onChange={(e) => e.target.value && cambiar(`${rp}.fecha`)(e.target.value)} />
              <CampoNumero etiqueta="" sufijo={sufijo} decimales={0} valor={p.monto} onCambio={cambiar(`${rp}.monto`)} />
              <SelectorCuota plan={c.cuotas} valor={p.cuota} onCambio={cambiar(`${rp}.cuota`)} conAnticipo />
              <SelectorAcreedor acreedores={acreedores} valor={p.acreedor} onCambio={cambiar(`${rp}.acreedor`)} />
              <input type="text" maxLength={120} value={p.nota} placeholder="Nota (recibo…)" aria-label="Nota del pago"
                onChange={(e) => cambiar(`${rp}.nota`)(e.target.value)} />
              <button type="button" className="btn-del" onClick={() => quitarPago(p.id)} aria-label="Quitar el pago" title="Quitar">✕</button>
            </li>
          );
        })}
      </ul>
      <p className="nota resumen-mesada" role="status">Pagado {plata(k.pagado, c.moneda)} · falta {plata(k.falta, c.moneda)}</p>
      <button type="button" className="btn-sec" onClick={agregarPago}>+ Pago</button>
      {acreedores.length === 0 && <p className="nota">¿Alguien pagó una cuota por vos? Agregalo abajo en Acreedores y acá elegís "Lo pagó…".</p>}
    </FichaPlegable>
  );
}

function Acreedor({ a, i, deuda, cambiar, onQuitar }) {
  const ruta = `finanzas.acreedores.${i}`;
  const monedas = Object.keys(deuda.porMoneda);
  const resumen = monedas.length === 0 ? 'sin préstamos cargados'
    : monedas.map((m) => `le debés ${plata(deuda.porMoneda[m].debes, m)}`).join(' · ');
  const agregar = () => cambiar(`${ruta}.devoluciones`)([...a.devoluciones, devolucionNueva(a.devoluciones, { moneda: monedas[0] ?? 'USD',
    monto: Math.round(deuda.porMoneda[monedas[0]]?.debes ?? 0) })]);
  return (
    <FichaPlegable clave={`acreedor:${a.id}`} className="rubro acreedor"
      encabezado={<><strong>{a.nombre}</strong><small>{resumen}</small></>}
      acciones={<button type="button" className="btn-del" onClick={onQuitar} aria-label={`Quitar ${a.nombre}`} title="Quitar">✕</button>}>
      <div className="grid-params">
        <div className="group">
          <label>Nombre
            <input type="text" maxLength={60} value={a.nombre} onChange={(e) => cambiar(`${ruta}.nombre`)(e.target.value)} />
          </label>
        </div>
        <div className="group">
          <label>Nota
            <input type="text" maxLength={300} value={a.nota} placeholder="Teléfono, condiciones…" onChange={(e) => cambiar(`${ruta}.nota`)(e.target.value)} />
          </label>
        </div>
      </div>
      {monedas.map((m) => (
        <p key={m} className="nota">{m === 'USD' ? 'Dólares' : 'Pesos'}: pagó por vos {plata(deuda.porMoneda[m].prestado, m)} · le devolviste {plata(deuda.porMoneda[m].devuelto, m)} · <strong>le debés {plata(deuda.porMoneda[m].debes, m)}</strong></p>
      ))}
      {deuda.detalle.length > 0 && (
        <ul className="lista-prestamos">
          {deuda.detalle.map((d, n) => <li key={n}>{fechaLegible(d.fecha)} · {d.que} · {plata(d.monto, d.moneda)}</li>)}
        </ul>
      )}
      <h4 className="subtitulo-pared">Lo que le devolviste</h4>
      <ul className="lista-pagos">
        {a.devoluciones.map((d, n) => {
          const rd = `${ruta}.devoluciones.${n}`;
          return (
            <li key={d.id} className="pago">
              <input type="date" value={d.fecha} aria-label="Fecha" onChange={(e) => e.target.value && cambiar(`${rd}.fecha`)(e.target.value)} />
              <CampoNumero etiqueta="" sufijo={d.moneda === 'USD' ? 'USD' : '$'} decimales={0} valor={d.monto} onCambio={cambiar(`${rd}.monto`)} />
              <select value={d.moneda} aria-label="Moneda" onChange={(e) => cambiar(`${rd}.moneda`)(e.target.value)}>
                {MONEDAS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
              </select>
              <input type="text" maxLength={120} value={d.nota} placeholder="Nota" aria-label="Nota" onChange={(e) => cambiar(`${rd}.nota`)(e.target.value)} />
              <button type="button" className="btn-del" aria-label="Quitar" title="Quitar"
                onClick={() => cambiar(`${ruta}.devoluciones`)(a.devoluciones.filter((x) => x.id !== d.id))}>✕</button>
            </li>
          );
        })}
      </ul>
      <button type="button" className="btn-sec" onClick={agregar}>+ Devolución</button>
    </FichaPlegable>
  );
}

export default function PanelFinanzas({ params, cambiar, cambiarVarios }) {
  const f = completarFinanzas(params.finanzas);
  const [recien, setRecien] = useState(null);
  const [aviso, setAviso] = useState(null);
  const resumen = resumenDeFinanzas(f);
  const deudas = deudasConAcreedores(f, params.seguimiento?.rubros ?? []);
  const agregar = (tipo) => {
    const nuevo = compromisoNuevo(f.compromisos, { tipo, moneda: tipo === 'credito' ? 'ARS' : 'USD' });
    setRecien(nuevo.id);
    setAviso(cambiar('finanzas.compromisos')([...f.compromisos, nuevo]));
  };
  const quitarAcreedor = (id) => {
    // Los pagos que decían "lo pagó X" pasan a "lo pagué yo" (no queda un acreedor que no existe).
    const sinEl = (pagos) => pagos.map((p) => (p.acreedor === id ? { ...p, acreedor: null } : p));
    setAviso(cambiarVarios([
      ['finanzas', { compromisos: f.compromisos.map((c) => ({ ...c, pagos: sinEl(c.pagos) })), acreedores: f.acreedores.filter((a) => a.id !== id) }],
      ['seguimiento.rubros', (params.seguimiento?.rubros ?? []).map((r) => ({ ...r, pagos: sinEl(r.pagos) }))],
    ]));
  };
  return (
    <Tarjeta id="finanzas" titulo="Terreno, créditos y acreedores">
      <p className="nota">Lo que pagás en cuotas aparte de la obra (el terreno, un crédito). Cada uno en su moneda: los dólares
        no se convierten ni se suman con los pesos.</p>
      {Object.keys(resumen).length > 0 && (
        <div className="resumen-seguimiento">
          {Object.entries(resumen).map(([m, r]) => (
            <div key={m}><small>{m === 'USD' ? 'En dólares' : 'En pesos'}</small>
              <strong>pagado {plata(r.pagado, m)} · falta {plata(r.falta, m)}</strong>
              {r.cuotasVencidas > 0 && <small className="falta">⚠ {r.cuotasVencidas} cuota(s) vencida(s)</small>}
            </div>
          ))}
        </div>
      )}
      {f.compromisos.length === 0 && <p className="vacio">Todavía no cargaste el terreno ni créditos.</p>}
      {f.compromisos.map((c, i) => (
        <Compromiso key={c.id} c={c} i={i} acreedores={f.acreedores} cambiar={cambiar} abiertaAlInicio={c.id === recien}
          onQuitar={() => cambiar('finanzas.compromisos')(f.compromisos.filter((x) => x.id !== c.id))} />
      ))}
      <div className="acciones-seguimiento">
        <button type="button" className="btn-sec" onClick={() => agregar('compra')}>+ Compra en cuotas (terreno)</button>
        <button type="button" className="btn-sec" onClick={() => agregar('credito')}>+ Crédito</button>
      </div>

      <h3 className="subtitulo-pared">Acreedores (a quién le debés)</h3>
      <p className="nota">Si alguien pagó una cuota o un gasto por vos, agregalo acá y en ese pago elegí "Lo pagó…".</p>
      {f.acreedores.map((a, i) => (
        <Acreedor key={a.id} a={a} i={i} deuda={deudas[i]} cambiar={cambiar} onQuitar={() => quitarAcreedor(a.id)} />
      ))}
      <button type="button" className="btn-sec" onClick={() => setAviso(cambiar('finanzas.acreedores')([...f.acreedores, acreedorNuevo(f.acreedores)]))}>+ Acreedor</button>
      {aviso && <p className="error" role="alert">{aviso}</p>}
    </Tarjeta>
  );
}
