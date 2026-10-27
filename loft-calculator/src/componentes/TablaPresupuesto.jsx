// ==========================================================
// TablaPresupuesto: cantidades, precios editables, subtotales,
// total y el diagrama de cortes de cada perfil.
// Desde v1.15 el perfil, el largo de barra y el excedente se cargan
// en la tarjeta Materiales: acá solo se cuenta y se pone precio.
// ==========================================================

import { useState } from 'react';
import CampoNumero from './CampoNumero.jsx';
import CampoSelect from './CampoSelect.jsx';
import { MAS_BARATO, faltanPrecios, usaPlanDeCompra, textoPedido } from '../motor/proveedores.js';
import Tarjeta from './Tarjeta.jsx';
import { BotonResaltar } from './Resaltar.jsx';
import { useResaltar, criterioDeRenglon as criterioDe } from './contextoResaltado.js';

const pesos = (n) => n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

/** Validadores para los campos del catálogo. */
const validarPrecio = (actualizar) => (v) => {
  if (v < 0) return 'No puede ser negativo';
  actualizar(Math.round(v));
  return null;
};

/**
 * Dibujo de cómo cortar cada barra, por grupo de cortes (v1.19.1).
 * Un grupo es un renglón solo o varios renglones del mismo perfil que comparten barras;
 * en ese caso cada pieza se pinta del color de su renglón.
 */
function DiagramaCortes({ grupo }) {
  const { cortes, largoReal: largo, renglones } = grupo;
  const indice = (origen) => Math.max(0, renglones.findIndex((r) => r.id === origen)); // color por renglón
  const nombreDe = (origen) => renglones.find((r) => r.id === origen)?.nombre ?? renglones[0].nombre;
  const ahorro = grupo.barrasSeparadas - cortes.totalBarras;
  const titulo = renglones.map((r) => r.nombre).join(' + ');
  return (
    <details className="bar-details">
      <summary>
        {titulo} ({grupo.perfil}): {cortes.totalBarras} barras de {grupo.largoBarra} m (reales {largo.toFixed(2)} m)
        {grupo.compartido && ahorro > 0 && <strong className="ahorro"> · comparten barras: {ahorro} menos</strong>}
      </summary>
      {grupo.compartido && (
        <div className="leyenda-cortes">
          {renglones.map((r, i) => <span key={r.id}><span className={`muestra-origen origen-${i % 4}`} />{r.nombre}</span>)}
        </div>
      )}
      <div className="bar-cuts-container">
        {cortes.barras.map((b) => (
          <div key={b.numero} className="bar-item">
            <div className="bar-title">
              Barra #{b.numero} · sobrante {(largo - b.usado).toFixed(2)} m
            </div>
            <div className="bar-graphic">
              {b.piezas.map((p, i) => (
                <div key={i} className={`piece-block${grupo.compartido ? ` origen-${indice(b.origenes?.[i]) % 4}` : ''}`}
                  style={{ width: `${(p / largo) * 100}%` }}
                  title={grupo.compartido ? `${p} m · ${nombreDe(b.origenes?.[i])}` : `${p} m`}>
                  {p.toFixed(2)}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </details>
  );
}

/**
 * Con qué proveedor y forma de pago se calcula, y la tabla para comparar (v1.25).
 * Tocar una fila de la tabla elige ese proveedor.
 */
function ComparacionProveedores({ proveedores, proveedor, pago, comparacion, onElegirProveedor, onElegirPago }) {
  const opciones = [...proveedores.map((p) => [p.id, p.nombre]), [MAS_BARATO, 'Lo más barato de cada material']];
  const masBarato = Math.min(...comparacion.filter((c) => c.id !== MAS_BARATO && c[pago].faltan.length === 0).map((c) => c[pago].total));
  const celda = (c, forma) => (
    <td className="num">
      {pesos(c[forma].total)}
      {c[forma].faltan.length > 0 && (
        <small className="falta" title={`No vende: ${c[forma].faltan.join(', ')}`}> · no vende {c[forma].faltan.length}</small>
      )}
    </td>
  );
  return (
    <div className="comparacion">
      <div className="grid-params">
        <CampoSelect etiqueta="Proveedor" valor={proveedor} opciones={opciones} onCambio={onElegirProveedor} />
        <CampoSelect etiqueta="Forma de pago" valor={pago} opciones={[['efectivo', 'Efectivo'], ['tarjeta', 'Tarjeta']]} onCambio={onElegirPago} />
      </div>
      {comparacion.length > 2 && (
        <div className="table-wrap">
          <table className="tabla-comparacion">
            <thead><tr><th>Comparar</th><th className="num">Efectivo</th><th className="num">Tarjeta</th></tr></thead>
            <tbody>
              {comparacion.map((c) => (
                <tr key={c.id} className={`${c.id === proveedor ? 'elegido' : ''}${c[pago].total === masBarato ? ' mas-barato' : ''}`}
                  onClick={() => onElegirProveedor(c.id)} title="Calcular con este">
                  <td>{c.nombre}{c[pago].total === masBarato && c.id !== MAS_BARATO && <small> · el más barato</small>}</td>
                  {celda(c, 'efectivo')}
                  {celda(c, 'tarjeta')}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="nota">
        Un material sin precio en un proveedor es porque <strong>no lo vende</strong>: ese total no lo incluye ("no vende N"),
        así que para comparar mirá el <strong>plan de compra</strong>. Los totales incluyen el flete de cada uno.
        Los precios y el flete se cargan en <strong>Materiales</strong>; acá se puede corregir el precio del proveedor elegido.
      </p>
    </div>
  );
}

/**
 * Plan de compra (v1.29): a quién comprarle cada material para gastar menos, contando el flete.
 * Una tarjetita por proveedor con lo que se le compra, el subtotal, el flete y el total.
 */
/** Botón "Copiar pedido" (v1.30.3): la lista de un proveedor en texto, para WhatsApp o mail. */
function BotonCopiarPedido({ compra, nombreProyecto }) {
  const [copiado, setCopiado] = useState(false);
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(textoPedido(compra, nombreProyecto));
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setCopiado(false); // sin permiso para copiar: no pasa nada
    }
  };
  return (
    <button type="button" className="btn-sec btn-pedido" onClick={copiar} title="Copia la lista (sin precios) para mandársela al proveedor">
      {copiado ? '✓ Copiado' : 'Copiar pedido'}
    </button>
  );
}

function PlanDeCompra({ plan, mejorUnico, nombreProyecto }) {
  if (!plan || plan.compras.length === 0) return null;
  const ahorro = mejorUnico ? mejorUnico.total - plan.total : 0;
  return (
    <div className="plan-compra">
      <h3 className="subtitulo">Plan de compra: dónde conviene cada material</h3>
      <p className="nota">
        La combinación más barata <strong>contando el flete</strong>: si un proveedor ahorra menos que lo que cobra de
        flete, no se usa. Total del plan: <strong>{pesos(plan.total)}</strong>
        {ahorro > 0 && mejorUnico && <> · {pesos(ahorro)} menos que comprar todo en {mejorUnico.nombre}</>}.
      </p>
      {plan.nadieVende.length > 0 && <p className="falta">⚠ Ningún proveedor vende: {plan.nadieVende.join(', ')}.</p>}
      <div className="compras-plan">
        {plan.compras.map((c) => (
          <section key={c.proveedor.id} className="compra-proveedor">
            <h4>{c.proveedor.nombre} <span>{pesos(c.total)}</span></h4>
            {/* v1.30.3: por material (lo que se le pide), no por dónde se usa; el uso queda en el globito. */}
            <ul>
              {c.materiales.map((m) => (
                <li key={m.clave} title={`Para: ${m.usos.join(', ')}`}>
                  <span>{m.nombre}{m.medidas && <small className="detalle medidas-pedido">{m.medidas}</small>}</span>
                  <small>{m.cantidad} {m.unidad} × {pesos(m.precio)}</small> <span className="num">{pesos(m.subtotal)}</span>
                </li>
              ))}
              <li className="flete-plan"><span>Flete</span> <span className="num">{c.flete > 0 ? pesos(c.flete) : 'sin cargo'}</span></li>
            </ul>
            <BotonCopiarPedido compra={c} nombreProyecto={nombreProyecto} />
          </section>
        ))}
      </div>
    </div>
  );
}

export default function TablaPresupuesto({
  items, total, gruposCortes = [], proveedores = [], proveedor, pago = 'efectivo', comparacion = [],
  onElegirProveedor, onElegirPago, onCambiarPrecio, plan = null, masBaratoDe = () => null, nombreProyecto = '',
}) {
  // Peso de lo que se compra: barras x largo nominal x kg/m de su perfil (v1.21).
  const pasar = useResaltar(); // v1.27: resaltar en el 3D las piezas de cada renglón
  const kilos = items.reduce((acc, i) => acc + (i.cortes && i.kgm ? i.cantidad * i.largoBarra * i.kgm : 0), 0);

  return (
    <Tarjeta id="presupuesto" titulo="Presupuesto de materiales" className="presupuesto">
      <p className="nota">Cantidades a comprar y precios. Qué es cada material se carga en la tarjeta <strong>Materiales</strong>.</p>
      {proveedores.length > 0 && (
        <ComparacionProveedores proveedores={proveedores} proveedor={proveedor} pago={pago} comparacion={comparacion}
          onElegirProveedor={onElegirProveedor} onElegirPago={onElegirPago} />
      )}
      {proveedores.length > 1 && (
        <PlanDeCompra plan={plan} nombreProyecto={nombreProyecto} mejorUnico={comparacion.filter((c) => c.id !== MAS_BARATO && c[pago].faltan.length === 0)
          .map((c) => ({ nombre: c.nombre, total: c[pago].total })).sort((a, b) => a.total - b.total)[0]} />
      )}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Insumo</th>
              <th className="num">Cant.</th>
              <th>Precio unit.</th>
              <th className="num">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} {...pasar(criterioDe(item))}>
                <td>
                  <div className="item-name">
                    {item.nombre}
                    <BotonResaltar criterio={criterioDe(item)} />
                  </div>
                  {item.perfil && <div className="perfil-texto">{item.perfil}{item.cortes ? ` · barra de ${item.largoBarra} m` : ''}</div>}
                  <small className="detalle">{item.detalle}</small>
                </td>
                <td className="num">{item.cantidad} {item.unidad}</td>
                <td>
                  {/* v1.21: el precio de una barra es del perfil de la lista: cambiarlo acá lo cambia en todas sus partes.
                      v1.25: se guarda en el proveedor y la forma de pago elegidos; con "lo más barato" no se edita. */}
                  {/* v1.29: el flete se carga en el proveedor (Materiales), no acá. */}
                  {proveedor === MAS_BARATO || item.categoria === 'flete' ? (
                    <span>{item.sinPrecio ? '—' : pesos(item.precio)}{item.proveedorDelPrecio && <small className="detalle"> {item.proveedorDelPrecio}</small>}</span>
                  ) : (
                    <CampoNumero etiqueta="" sufijo="$" decimales={0} valor={item.precio}
                      onCambio={validarPrecio((v) => onCambiarPrecio(item, v))} />
                  )}
                  {item.sinPrecio && item.cantidad > 0 && <small className="falta">no lo vende {item.proveedorDelPrecio ?? 'ningún proveedor'}</small>}
                  {(() => {
                    // v1.29: si otro proveedor lo vende más barato, se avisa (sin contar el flete).
                    const barato = item.cantidad > 0 && item.categoria !== 'flete' ? masBaratoDe(item) : null;
                    if (!barato || barato.id === item.idProveedorDelPrecio || (!item.sinPrecio && barato.precio >= item.precio)) return null;
                    return <small className="mas-barato-en">más barato en {barato.nombre}: {pesos(barato.precio)}</small>;
                  })()}
                </td>
                <td className="num sub">{pesos(item.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {usaPlanDeCompra(plan, proveedores.length) ? (
        <>
          {/* v1.30.2: el total de un proveedor deja afuera lo que no vende; el de la obra es el del plan de compra. */}
          <div className="total total-proveedor">
            <span>Con {proveedor === MAS_BARATO ? 'lo más barato de cada material' : proveedores.find((p) => p.id === proveedor)?.nombre}
              {faltanPrecios(items).length > 0 && <small> (sin lo que no vende: {faltanPrecios(items).join(', ')})</small>}</span>
            <span>{pesos(total)}</span>
          </div>
          <div className="total"><span>TOTAL DE LA OBRA <small>(plan de compra, con flete)</small></span><span>{pesos(plan.total)}</span></div>
        </>
      ) : (
        <div className="total"><span>TOTAL</span><span>{pesos(total)}</span></div>
      )}
      {kilos > 0 && (
        <p className="peso-total">
          Peso del hierro a comprar: <strong>≈ {Math.round(kilos).toLocaleString('es-AR')} kg</strong>
          <small> (barras enteras; medidas de la lista de perfiles, sin redondeo de esquinas)</small>
        </p>
      )}
      <p className="nota">
        Las barras salen del optimizador de cortes (merma de 3 mm por corte). Las piezas más largas que la barra se empalman.
        Las partes con el mismo perfil comparten barras (se puede apagar en Materiales). El precio de una barra es el
        de su perfil: cambiarlo acá lo cambia en todas las partes que lo usan.
      </p>

      <h3 className="subtitulo">Diagrama de cortes</h3>
      {gruposCortes.filter((g) => g.cortes.totalBarras > 0).map((g) => <DiagramaCortes key={g.id} grupo={g} />)}
    </Tarjeta>
  );
}
