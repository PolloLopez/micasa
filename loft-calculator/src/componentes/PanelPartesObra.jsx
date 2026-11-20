// ==========================================================
// PanelPartesObra (v1.70): cada parte de la obra, terminada o no, y sus extras
// ----------------------------------------------------------
// Pedido de Leandro: "los pilotines ya quedaron finalizados y en el cálculo
// siguen faltando materiales; debería poder agregar elementos al rubro que
// necesite (manguera de riego para el asentamiento, tanza para alinearlos)".
//   - Terminada: sus materiales ya no faltan (salen de "falta comprar" y de
//     la lista para pedir). Lo que se compró queda como gastado.
//   - Extras: nombre, cantidad, unidad y precio; suman al presupuesto y a la
//     lista de materiales.
// Las cuentas están en motor/partesObra.js.
// ==========================================================

import Tarjeta from './Tarjeta.jsx';
import FichaPlegable from './FichaPlegable.jsx';
import CampoNumero from './CampoNumero.jsx';
import { extraNuevo, trabajosDeLaParte } from '../motor/partesObra.js';
import { cotizacionNueva, cotizacionesDeLaParte, elegirCotizacion, nombreDeCotizacion } from '../motor/manoDeObraPartes.js';
import { completarCierre } from '../motor/cierre.js';
import PreciosProveedores from './PreciosProveedores.jsx';
import { cuentasDelRubro, estadoSegunAvance, hoy } from '../motor/seguimiento.js';
import { esDeMateriales } from '../motor/compras.js';
import NotaPlegable from './NotaPlegable.jsx';

const pesos = (n) => n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
const cantidad = (n) => n.toLocaleString('es-AR', { maximumFractionDigits: 2 });

/**
 * v1.74: los trabajos (rubros del seguimiento) unidos a la parte: quién, cuánto está hecho y cuánto se pagó.
 * Si la parte está terminada y el trabajo no llegó al 100 %, se ofrece completarlo. También se une uno que no tenga parte.
 */
function TrabajosDeLaParte({ parte, seguimiento, partesPresupuesto, cambiar }) {
  const rubros = seguimiento.rubros ?? [];
  const trabajos = trabajosDeLaParte(rubros, parte.clave);
  const sueltos = rubros.filter((r) => !r.parteObra && !esDeMateriales(r));
  const nombreDe = (r) => (seguimiento.contratistas ?? []).find((x) => x.id === r.contratista)?.nombre || r.quien || 'sin contratista';
  const indice = (r) => rubros.findIndex((x) => x.id === r.id);
  const unir = (id) => { const i = rubros.findIndex((x) => x.id === Number(id)); if (i >= 0) cambiar(`seguimiento.rubros.${i}.parteObra`)(parte.clave); };
  const completar = (r) => cambiar(`seguimiento.rubros.${indice(r)}`)({ ...r, avance: 100, estado: estadoSegunAvance(100, r.estado), fechaFin: r.fechaFin || hoy() });
  return (<>
    <h4 className="subtitulo-pared">Mano de obra</h4>
    {trabajos.length === 0 && <p className="vacio">Ningún trabajo unido a esta parte.</p>}
    {trabajos.length > 0 && (
      <ul className="trabajos-parte">
        {trabajos.map((r) => {
          const c = cuentasDelRubro(r, partesPresupuesto, seguimiento.compras);
          const avance = Math.round(r.avance ?? 0);
          return (
            <li key={r.id}>
              <strong>{r.nombre}</strong> · {nombreDe(r)} · {avance} % hecho · pagado {pesos(c.pagado)} de {pesos(c.contratado)}
              {c.saldo > 0 && <span className="falta"> · falta {pesos(c.saldo)}</span>}
              {parte.terminada && avance < 100 && (
                <button type="button" className="btn-mini" onClick={() => completar(r)}>Marcar el trabajo terminado (100 %)</button>
              )}
              <button type="button" className="btn-mini" onClick={() => cambiar(`seguimiento.rubros.${indice(r)}.parteObra`)(null)}>Separar</button>
            </li>
          );
        })}
      </ul>
    )}
    {sueltos.length > 0 && (
      <label className="unir-trabajo no-print">Unir un trabajo{' '}
        <select value="" onChange={(e) => e.target.value && unir(e.target.value)}>
          <option value="">elegir del seguimiento…</option>
          {sueltos.map((r) => <option key={r.id} value={r.id}>{r.nombre} · {nombreDe(r)}</option>)}
        </select>
      </label>
    )}
  </>);
}

/**
 * v1.79: los presupuestos de mano de obra de la parte (ej. dos albañiles para el tapial). El más barato se marca;
 * "Elegir" lo pasa al cierre del Presupuesto (segmento de la parte) y al seguimiento (su trabajo, con el contratista).
 */
function PresupuestosManoDeObra({ parte, params, cambiar, cambiarVarios }) {
  const seguimiento = params.seguimiento ?? {};
  const cotizaciones = seguimiento.cotizaciones ?? [];
  const contratistas = seguimiento.contratistas ?? [];
  const deLaParte = cotizacionesDeLaParte(cotizaciones, parte.clave);
  const indice = (id) => cotizaciones.findIndex((c) => c.id === id);
  const elegir = (c) => {
    const r = elegirCotizacion({ seguimiento, cierre: params.cierre, cotizacion: c, parteNombre: parte.nombre });
    cambiarVarios([['seguimiento.cotizaciones', r.cotizaciones], ['cierre', { ...completarCierre(params.cierre), segmentos: r.segmentos }], ['seguimiento.rubros', r.rubros]]);
  };
  const cambiarQuien = (c, quien) => {
    const x = contratistas.find((k) => k.nombre.trim().toLowerCase() === quien.trim().toLowerCase());
    cambiar(`seguimiento.cotizaciones.${indice(c.id)}`)({ ...c, quien, contratista: x ? x.id : null });
  };
  // El monto de la elegida sigue al presupuesto (si cambia, se vuelve a elegir con el monto nuevo).
  const cambiarMonto = (c) => (monto) => (c.elegida ? elegir({ ...c, monto }) : cambiar(`seguimiento.cotizaciones.${indice(c.id)}.monto`)(monto));
  return (<>
    <h4 className="subtitulo-pared">Mano de obra: presupuestos</h4>
    {deLaParte.length === 0 && <p className="vacio">Cargá lo que te cobra cada uno (ej. dos albañiles) para comparar.</p>}
    <datalist id={`contratistas-${parte.clave}`}>{contratistas.map((x) => <option key={x.id} value={x.nombre} />)}</datalist>
    {deLaParte.map((c) => (
      <div key={c.id} className={`cotizacion${c.elegida ? ' elegida' : ''}`}>
        <div className="grid-params">
          <div className="group"><label>Quién
            <input type="text" maxLength={60} value={nombreDeCotizacion(c, contratistas) === 'Sin nombre' ? '' : nombreDeCotizacion(c, contratistas)}
              list={`contratistas-${parte.clave}`} placeholder="ej. José (albañil)" onChange={(e) => cambiarQuien(c, e.target.value)} />
          </label></div>
          <CampoNumero etiqueta="Me cobra (total)" sufijo="$" decimales={0} valor={c.monto} onCambio={cambiarMonto(c)} />
        </div>
        <div className="acciones-cotizacion">
          {c.masBarata && <span className="chip-compra ok">el más barato</span>}
          {c.elegida ? <span className="chip-compra ok">✓ elegido (en el Presupuesto y el seguimiento)</span>
            : <button type="button" className="btn-mini" disabled={!(c.monto > 0)} onClick={() => elegir(c)}>Elegir</button>}
          <button type="button" className="btn-mini" onClick={() => cambiar('seguimiento.cotizaciones')(cotizaciones.filter((x) => x.id !== c.id))}>Quitar</button>
        </div>
      </div>
    ))}
    <button type="button" className="btn-sec" onClick={() => cambiar('seguimiento.cotizaciones')([...cotizaciones, cotizacionNueva(cotizaciones, parte.clave)])}>
      + Presupuesto de mano de obra
    </button>
  </>);
}

/**
 * v1.79: los materiales que se agregan a la parte (ej. el tapial), con su precio en cada proveedor como cualquier
 * material: entran al presupuesto, al plan de compra y a la lista de compras. Son "accesorios" con `parte`.
 */
function MaterialesDeLaParte({ parte, materiales, proveedores, onActualizar, onAgregar, onQuitar, onCambiarPrecio }) {
  const deLaParte = materiales.filter((m) => m.parte === parte.clave);
  return (<>
    <h4 className="subtitulo-pared">Materiales que agregás (precio por proveedor)</h4>
    {deLaParte.length === 0 && <p className="vacio">Nada agregado.</p>}
    {deLaParte.map((m) => (
      <FichaPlegable key={m.id} clave={`accesorio:${m.id}`} className="rubro" abiertaAlInicio={m.nombre === 'Material nuevo'}
        encabezado={<><strong>{m.nombre}</strong><small>{cantidad(m.cantidad)} {m.unidad}</small></>}>
        <div className="grid-params">
          <div className="group"><label>Qué es
            <input type="text" maxLength={60} value={m.nombre} placeholder="ej. Ladrillo hueco 8x18x33" onChange={(e) => onActualizar(m.id, { nombre: e.target.value })} />
          </label></div>
          <CampoNumero etiqueta="Cantidad" decimales={2} valor={m.cantidad} onCambio={(v) => (v >= 0 ? (onActualizar(m.id, { cantidad: v }), null) : 'No puede ser negativa')} />
          <div className="group"><label>Unidad
            <input type="text" maxLength={15} value={m.unidad} placeholder="u, m, bolsa…" onChange={(e) => onActualizar(m.id, { unidad: e.target.value })} />
          </label></div>
        </div>
        <PreciosProveedores material={m} proveedores={proveedores} unidad={m.unidad || 'u'}
          onCambiar={(idProveedor, campo, valor) => onCambiarPrecio(m.id, idProveedor, campo, valor)} />
        <div className="pie-acciones no-print">
          <button type="button" className="btn-del eliminar-aparte" onClick={() => onQuitar(m.id)}>Quitar material</button>
        </div>
      </FichaPlegable>
    ))}
    <button type="button" className="btn-sec" onClick={() => onAgregar(parte.clave)}>+ Material para {parte.nombre}</button>
  </>);
}

/**
 * @param partes partesDeLaObra(…) (con sus renglones, su obra civil, sus extras y si está terminada)
 * @param partesPresupuesto lo presupuestado de cada rubro (partesDelPresupuesto), para las cuentas de la mano de obra
 */
export default function PanelPartesObra({ params, partes, cambiar, cambiarVarios, partesPresupuesto = [],
  materiales = [], proveedores = [], onActualizarMaterial, onAgregarMaterial, onQuitarMaterial, onCambiarPrecio }) {
  const seguimiento = params.seguimiento ?? {};
  const terminadas = seguimiento.terminadas ?? [];
  const extras = seguimiento.extras ?? [];
  const alternar = (clave, si) => cambiar('seguimiento.terminadas')(si ? [...terminadas, clave] : terminadas.filter((t) => t !== clave));
  const agregarExtra = (parte) => cambiar('seguimiento.extras')([...extras, extraNuevo(extras, parte)]);
  const quitarExtra = (id) => cambiar('seguimiento.extras')(extras.filter((x) => x.id !== id));
  const indiceDe = (id) => extras.findIndex((x) => x.id === id);
  const hechas = partes.filter((p) => p.terminada).length;
  return (
    <Tarjeta id="partes-obra" titulo={`Partes de la obra (${hechas} de ${partes.length} terminadas)`}>
      <NotaPlegable>
        Tildá <strong>Terminada</strong> cuando una parte está hecha: sus materiales ya no cuentan en "falta comprar" ni en la lista
        para pedir. En cada parte: <strong>los materiales que agregás</strong> con su precio en cada proveedor (para comparar
        corralones) y <strong>los presupuestos de mano de obra</strong> (para comparar albañiles y elegir uno).
      </NotaPlegable>
      {partes.map((p) => {
        const totalExtras = p.extras.reduce((a, x) => a + x.cantidad * x.precio, 0);
        return (
          <FichaPlegable key={p.clave} clave={`parte:${p.clave}`} className={`rubro${p.terminada ? ' parte-terminada' : ''}`}
            encabezado={<>
              <span className={`chip-estado ${p.terminada ? 'etapa-finalizadoPagado' : 'etapa-presupuestado'}`}>{p.terminada ? 'Terminada ✓' : 'Falta'}</span>
              <strong>{p.nombre}</strong>
              {/* Los montos de los materiales están en el Presupuesto (con el proveedor que conviene); acá, los de los extras. */}
              <small>{p.renglones.length + (p.obraCivil ? 1 : 0)} materiales{p.extras.length ? ` + ${p.extras.length} extra${p.extras.length > 1 ? 's' : ''} (${pesos(totalExtras)})` : ''}</small>
            </>}>
            <label className="casilla-opcional">
              <input type="checkbox" checked={p.terminada} onChange={(e) => alternar(p.clave, e.target.checked)} />
              Terminada (lo que lleva ya no falta comprar)
            </label>
            {(p.renglones.length > 0 || p.obraCivil) && (
              <ul className="materiales-parte">
                {p.renglones.filter((r) => !materiales.some((m) => m.id === r.id && m.parte === p.clave)) // los agregados van abajo, editables
                  .map((r) => <li key={r.id}>{cantidad(r.cantidad)} {r.unidad} · {r.nombre}</li>)}
                {p.obraCivil && <li>{p.obraCivil.nombre}: {p.obraCivil.detalle} (cemento, arena, piedra y hierro de obra civil)</li>}
              </ul>
            )}
            {onAgregarMaterial && (
              <MaterialesDeLaParte parte={p} materiales={materiales} proveedores={proveedores} onActualizar={onActualizarMaterial}
                onAgregar={onAgregarMaterial} onQuitar={onQuitarMaterial} onCambiarPrecio={onCambiarPrecio} />
            )}
            {cambiarVarios && <PresupuestosManoDeObra parte={p} params={params} cambiar={cambiar} cambiarVarios={cambiarVarios} />}
            <TrabajosDeLaParte parte={p} seguimiento={seguimiento} partesPresupuesto={partesPresupuesto} cambiar={cambiar} />
            {/* Los extras de antes (v1.70, precio único): se siguen viendo y editando; los nuevos van arriba, por proveedor. */}
            {p.extras.length > 0 && <h4 className="subtitulo-pared">Extras con precio único (cargados antes)</h4>}
            {p.extras.map((x) => {
              const ruta = `seguimiento.extras.${indiceDe(x.id)}`;
              return (
                <div key={x.id} className="extra-parte">
                  <div className="grid-params">
                    <div className="group"><label>Qué es
                      <input type="text" maxLength={80} value={x.nombre} placeholder="ej. Manguera de riego (nivel)" onChange={(e) => cambiar(`${ruta}.nombre`)(e.target.value)} />
                    </label></div>
                    <CampoNumero etiqueta="Cantidad" decimales={2} valor={x.cantidad} onCambio={cambiar(`${ruta}.cantidad`)} />
                    <div className="group"><label>Unidad
                      <input type="text" maxLength={20} value={x.unidad} placeholder="m, rollo, u…" onChange={(e) => cambiar(`${ruta}.unidad`)(e.target.value)} />
                    </label></div>
                    <CampoNumero etiqueta="Precio por unidad" sufijo="$" decimales={0} valor={x.precio} onCambio={cambiar(`${ruta}.precio`)} />
                  </div>
                  <small className="nota">{pesos(x.cantidad * x.precio)}</small>
                  <button type="button" className="btn-mini" onClick={() => quitarExtra(x.id)}>Quitar</button>
                </div>
              );
            })}
            {!onAgregarMaterial && <button type="button" className="btn-sec" onClick={() => agregarExtra(p.clave)}>+ Agregar a {p.nombre}</button>}
            <NotaPlegable>Si ya lo compraste, cargalo también en Compras hechas (elegilo de la lista de materiales).</NotaPlegable>
          </FichaPlegable>
        );
      })}
    </Tarjeta>
  );
}
