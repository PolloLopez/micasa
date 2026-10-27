// ==========================================================
// TablaPresupuesto: el total de la obra arriba y, en sub-pestañas (v1.31.0),
// Materiales (todo, sin proveedor) · Por proveedor (plan de compra) ·
// Cortes · Precios y detalle (comparar proveedores y editar precios).
// Desde v1.15 el perfil, el largo de barra y el excedente se cargan
// en la tarjeta Materiales: acá solo se cuenta y se pone precio.
// ==========================================================

import { useState } from 'react';
import CampoNumero from './CampoNumero.jsx';
import CampoSelect from './CampoSelect.jsx';
import { MAS_BARATO, faltanPrecios, usaPlanDeCompra, textoPedido, cantidadPedida, kilosDeMateriales, textoDeMateriales } from '../motor/proveedores.js';
import { useEstadoGuardado } from '../hooks/useEstadoGuardado.js';
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
function ComparacionProveedores({ proveedores, proveedor, pago, comparacion, onElegirProveedor }) {
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
        así que para comparar mirá <strong>Por proveedor</strong>. Los totales incluyen el flete de cada uno.
        Los precios y el flete se cargan en <strong>Materiales</strong>; acá se puede corregir el precio del proveedor elegido.
      </p>
    </div>
  );
}

/** Botón "Copiar pedido" (v1.30.3): la lista de un proveedor en texto (sin precios), para WhatsApp o mail. */
function BotonCopiarPedido({ compra, nombreProyecto }) {
  return <BotonCopiar etiqueta="Copiar pedido" ayuda="Copia la lista (sin precios) para mandársela al proveedor"
    texto={() => textoPedido(compra, nombreProyecto)} />;
}

/**
 * Detalle por uso (v1.31.0, antes era la tabla principal): cada renglón dice para qué es, con el precio
 * del proveedor elegido (editable) y el subtotal. Pasar el mouse resalta esas piezas en el 3D.
 */
function TablaPorUso({ items, proveedor, onCambiarPrecio, masBaratoDe }) {
  const pasar = useResaltar(); // v1.27: resaltar en el 3D las piezas de cada renglón
  return (
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
  );
}

/**
 * Plan de compra (v1.29): a quién comprarle cada material para gastar menos, contando el flete.
 * Una tarjetita por proveedor con lo que se le compra, el subtotal, el flete y el total.
 */
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
      {/* "Ningún proveedor vende" se avisa arriba, junto al total (v1.31.0). */}
      <div className="compras-plan">
        {plan.compras.map((c) => (
          <section key={c.proveedor.id} className="compra-proveedor">
            <h4>{c.proveedor.nombre} <span>{pesos(c.total)}</span></h4>
            {/* v1.30.3: por material (lo que se le pide), no por dónde se usa; el uso queda en el globito. */}
            <ul>
              {c.materiales.map((m) => (
                <li key={m.clave} title={`Para: ${m.usos.join(', ')}`}>
                  {/* v1.30.4: primero cantidad y barra, después qué es (tipo, medidas, espesor) y los kilos. */}
                  <span>
                    <strong>{cantidadPedida(m)}</strong> · {m.nombre}
                    {(m.ficha || m.kgPorBarra > 0) && (
                      <small className="detalle medidas-pedido">
                        {[m.ficha, m.kgPorBarra > 0 && `≈ ${Math.round(m.kgPorBarra * m.cantidad)} kg`].filter(Boolean).join(' · ')}
                      </small>
                    )}
                    <MasInfo material={m} />
                  </span>
                  <small>× {pesos(m.precio)}</small> <span className="num">{pesos(m.subtotal)}</span>
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

/**
 * Lo largo de cada material, plegado (v1.31.0): las medidas a cortar (paneles) y dónde se usa.
 * Plegado para que la lista se lea de un vistazo; en el celular no hay "pasar el mouse", por eso no va en un globito.
 */
function MasInfo({ material: m }) {
  return (
    <details className="mas-info">
      <summary>{m.medidas ? 'Medidas a cortar y dónde va' : 'Dónde va'}</summary>
      {m.medidas && <p>Medidas: {m.medidas}</p>}
      <p>Para: {m.usos.join(', ')}</p>
    </details>
  );
}

/** Las sub-pestañas del presupuesto (v1.31.0): una cosa por vez, en el orden en que se usan. */
const SUBPESTANAS = [
  { clave: 'materiales', nombre: 'Lista de materiales', ayuda: 'Todo lo que lleva la obra, sin proveedor' },
  { clave: 'proveedores', nombre: 'Por proveedor', ayuda: 'Qué comprarle a cada uno' },
  { clave: 'cortes', nombre: 'Cortes', ayuda: 'Cómo cortar cada barra' },
  { clave: 'precios', nombre: 'Precios y detalle', ayuda: 'Comparar proveedores y editar precios' },
];

/** Botón genérico para copiar un texto, con "✓ Copiado" un rato. */
function BotonCopiar({ texto, etiqueta, ayuda }) {
  const [copiado, setCopiado] = useState(false);
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(texto());
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setCopiado(false); // sin permiso para copiar: no pasa nada
    }
  };
  return <button type="button" className="btn-sec btn-pedido" onClick={copiar} title={ayuda}>{copiado ? '✓ Copiado' : etiqueta}</button>;
}

/** Barra de sub-pestañas accesible: flechas izquierda/derecha para moverse (como las pestañas de arriba). */
function BarraSubpestanas({ activa, onElegir }) {
  const alTeclear = (ev) => {
    const i = SUBPESTANAS.findIndex((t) => t.clave === activa);
    const paso = ev.key === 'ArrowRight' ? 1 : ev.key === 'ArrowLeft' ? -1 : 0;
    if (!paso) return;
    ev.preventDefault();
    const siguiente = SUBPESTANAS[(i + paso + SUBPESTANAS.length) % SUBPESTANAS.length];
    onElegir(siguiente.clave);
    document.getElementById(`sub-${siguiente.clave}`)?.focus();
  };
  return (
    <div className="subpestanas no-print" role="tablist" aria-label="Partes del presupuesto" onKeyDown={alTeclear}>
      {SUBPESTANAS.map((t) => (
        <button key={t.clave} id={`sub-${t.clave}`} type="button" role="tab" aria-selected={activa === t.clave}
          aria-controls={`panel-sub-${t.clave}`} tabIndex={activa === t.clave ? 0 : -1} title={t.ayuda}
          className={activa === t.clave ? 'activa' : ''} onClick={() => onElegir(t.clave)}>
          {t.nombre}
        </button>
      ))}
    </div>
  );
}

/** "Materiales" (v1.31.0): todo lo que hay que comprar, por material y sin proveedor ni precios. */
function ListaMateriales({ materiales, nombreProyecto }) {
  if (materiales.length === 0) return <p className="vacio">Todavía no hay nada para comprar: cargá las medidas en Estructura.</p>;
  const kilos = kilosDeMateriales(materiales);
  return (
    <>
      <p className="nota">Todo lo que lleva la obra, sumado por material, sin importar dónde lo compres.</p>
      <div className="table-wrap">
        <table className="tabla-materiales">
          <thead><tr><th>Cantidad</th><th>Material</th><th className="num">Peso</th></tr></thead>
          <tbody>
            {materiales.map((m) => (
              <tr key={m.clave} title={`Para: ${m.usos.join(', ')}`}>
                <td className="cantidad-material">{cantidadPedida(m)}</td>
                <td>
                  <div className="item-name">{m.nombre}</div>
                  {m.ficha && <small className="detalle">{m.ficha}</small>}
                  <MasInfo material={m} />
                </td>
                <td className="num">{m.kgPorBarra > 0 ? `${Math.round(m.kgPorBarra * m.cantidad)} kg` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="pie-lista">
        {kilos > 0 && <p className="peso-total">Hierro: <strong>≈ {Math.round(kilos).toLocaleString('es-AR')} kg</strong> <small>(barras enteras)</small></p>}
        <BotonCopiar etiqueta="Copiar lista" ayuda="Copia la lista (sin precios) para mandarla por WhatsApp o mail"
          texto={() => textoDeMateriales(`Materiales${nombreProyecto ? ` — ${nombreProyecto}` : ''}`, materiales)} />
      </div>
    </>
  );
}

export default function TablaPresupuesto({
  items, total, gruposCortes = [], proveedores = [], proveedor, pago = 'efectivo', comparacion = [],
  onElegirProveedor, onElegirPago, onCambiarPrecio, plan = null, masBaratoDe = () => null, nombreProyecto = '',
  materiales = [],
}) {
  // v1.31.0: la sub-pestaña elegida se recuerda en este navegador.
  const [subpestana, setSubpestana] = useEstadoGuardado('subpestanaPresupuesto', 'materiales',
    (v) => SUBPESTANAS.some((t) => t.clave === v));
  const conPlan = usaPlanDeCompra(plan, proveedores.length);
  const totalObra = conPlan ? plan.total : total;
  const kilos = kilosDeMateriales(materiales);
  const nombreProveedor = proveedor === MAS_BARATO ? 'lo más barato de cada material' : proveedores.find((p) => p.id === proveedor)?.nombre;
  const faltan = faltanPrecios(items);
  const mejorUnico = comparacion.filter((c) => c.id !== MAS_BARATO && c[pago].faltan.length === 0)
    .map((c) => ({ nombre: c.nombre, total: c[pago].total })).sort((a, b) => a.total - b.total)[0];
  const gruposConBarras = gruposCortes.filter((g) => g.cortes.totalBarras > 0);
  const panel = (clave) => ({ id: `panel-sub-${clave}`, role: 'tabpanel', 'aria-labelledby': `sub-${clave}`, hidden: subpestana !== clave });

  return (
    <Tarjeta id="presupuesto" titulo="Presupuesto de materiales" className="presupuesto">
      {/* v1.31.0: el total de la obra siempre arriba, con la forma de pago (cambia todos los precios). */}
      <div className="resumen-presupuesto">
        <div className="total total-obra">
          <span>{conPlan ? 'TOTAL DE LA OBRA' : 'TOTAL'}
            <small>{conPlan ? 'comprando cada material donde conviene, con flete' : nombreProveedor ? `con ${nombreProveedor}` : ''}</small>
          </span>
          <span>{pesos(totalObra)}</span>
        </div>
        <div className="datos-resumen">
          {kilos > 0 && <span>≈ {Math.round(kilos).toLocaleString('es-AR')} kg de hierro</span>}
          {conPlan && <span>{plan.compras.length} {plan.compras.length === 1 ? 'proveedor' : 'proveedores'}</span>}
          <CampoSelect etiqueta="Pago" valor={pago} opciones={[['efectivo', 'Efectivo'], ['tarjeta', 'Tarjeta']]} onCambio={onElegirPago} />
        </div>
        {conPlan && plan.nadieVende.length > 0 && <p className="falta">⚠ Ningún proveedor vende: {plan.nadieVende.join(', ')} (no está en el total).</p>}
      </div>

      <BarraSubpestanas activa={subpestana} onElegir={setSubpestana} />

      <div {...panel('materiales')}>
        <ListaMateriales materiales={materiales} nombreProyecto={nombreProyecto} />
      </div>

      <div {...panel('proveedores')}>
        {proveedores.length === 0 || !plan || plan.compras.length === 0 ? (
          <p className="vacio">Cargá tus proveedores y sus precios en <strong>Materiales → Proveedores</strong> para ver qué comprarle a cada uno.</p>
        ) : (
          <PlanDeCompra plan={plan} nombreProyecto={nombreProyecto} mejorUnico={proveedores.length > 1 ? mejorUnico : null} />
        )}
      </div>

      <div {...panel('cortes')}>
        <p className="nota">
          Cómo cortar cada barra (optimizador de cortes, merma de 3 mm por corte). Las piezas más largas que la barra se
          empalman; las partes con el mismo perfil comparten barras (se puede apagar en Materiales). Tocá un grupo para abrirlo.
        </p>
        {gruposConBarras.length === 0
          ? <p className="vacio">No hay barras para cortar.</p>
          : gruposConBarras.map((g) => <DiagramaCortes key={g.id} grupo={g} />)}
      </div>

      <div {...panel('precios')}>
        {proveedores.length > 0 && (
          <ComparacionProveedores proveedores={proveedores} proveedor={proveedor} pago={pago} comparacion={comparacion}
            onElegirProveedor={onElegirProveedor} />
        )}
        <TablaPorUso items={items} proveedor={proveedor} onCambiarPrecio={onCambiarPrecio} masBaratoDe={masBaratoDe} />
        <div className="total total-proveedor">
          <span>{conPlan ? `Todo con ${nombreProveedor}` : 'Total'}
            {faltan.length > 0 && <small> (sin lo que no vende: {faltan.join(', ')})</small>}</span>
          <span>{pesos(total)}</span>
        </div>
        <p className="nota">
          El precio de una barra es el de su perfil: cambiarlo acá lo cambia en todas las partes que lo usan (y se guarda
          en el proveedor elegido). Pasá el mouse por un renglón para verlo en el 3D.
        </p>
      </div>
    </Tarjeta>
  );
}
