// ==========================================================
// HojasImpresion (v1.28): lo que sale en el PDF, en 2-3 hojas
// ----------------------------------------------------------
// Antes "Imprimir" sacaba todos los formularios de la pantalla (20 hojas en el
// ejemplo). Ahora sale una impresión armada para leer en la obra:
//   Hoja 1   nombre, 3D (vista actual + frente/lateral/arriba), medidas
//            tomadas y datos de la obra
//   Hoja 2   presupuesto + piso, entrepiso y techo
//   Hoja 3   las 4 paredes acotadas (2 x 2)
//   Hoja 4   cómo cortar cada barra (si se pide)
// Qué parte sale lo elige el usuario en DialogoImprimir. En pantalla no se ve
// (clase solo-impresion); los formularios salen solo si se los pide.
// ==========================================================

import { cantidadPedida } from '../motor/proveedores.js';
import { PlanoDePared, PlanoDePlanta } from './Planos.jsx';
import PlanoImplantacion from './PlanoImplantacion.jsx';
import { agruparBarras, textoBarra } from '../proyecto/cortesAgrupados.js';
import { listaDePerfiles, listaDeAberturas, resumenDeAberturas, plantasElegidas } from '../proyecto/listasDePlanos.js';
import { TablaCierre } from './CierrePresupuesto.jsx';
import { fechaLegible } from '../motor/seguimiento.js';

const pesos = (n) => n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

/** Presupuesto en una tabla chica: solo lo que se compra. */
function PresupuestoCompacto({ items, total, etiquetaTotal = 'TOTAL' }) {
  return (
    <table className="tabla-impresion">
      <thead><tr><th>Insumo</th><th>Perfil o descripción</th><th className="num">Cant.</th><th className="num">Unit.</th><th className="num">Subtotal</th></tr></thead>
      <tbody>
        {items.filter((i) => i.cantidad > 0).map((i) => (
          <tr key={i.id}>
            <td>{i.nombre}</td>
            <td>{i.perfil ?? ''}{i.cortes ? ` · barra ${i.largoBarra} m` : ''}</td>
            <td className="num">{i.cantidad} {i.unidad}</td>
            <td className="num">{i.sinPrecio ? '—' : pesos(i.precio)}</td>
            <td className="num">{pesos(i.subtotal)}</td>
          </tr>
        ))}
        <tr className="fila-total"><td colSpan={4}>{etiquetaTotal}</td><td className="num">{pesos(total)}</td></tr>
      </tbody>
    </table>
  );
}

/** Cortes en texto, las barras iguales juntas: "16 × 6.06 · sobra 0.00". Cabe mucho más que el dibujo. */
function CortesCompactos({ grupos }) {
  return (
    <div className="cortes-impresion">
      {grupos.filter((g) => g.cortes.totalBarras > 0).map((g) => (
        <div key={g.id} className="grupo-cortes">
          <strong>{g.renglones.map((r) => r.nombre).join(' + ')}</strong> · {g.perfil} · {g.cortes.totalBarras} barras de {g.largoBarra} m
          <ul>
            {agruparBarras(g.cortes, g.largoReal).map((b) => (
              <li key={textoBarra(b) + b.sobra}>{textoBarra(b)} <span className="sobra">· sobra {b.sobra.toFixed(2)}</span></li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

/** v1.42: caños y perfiles (para comprar y dónde va cada uno) y aberturas, con los planos. */
function ListasDePlanos({ perfiles, aberturas }) {
  return (
    <>
      {perfiles && perfiles.compra.length > 0 && (
        <>
          <h2>Caños y perfiles</h2>
          <table className="tabla-impresion">
            <thead><tr><th>Perfil</th><th>Tipo, medidas y espesor</th><th className="num">Barras</th><th className="num">Largo de barra</th><th className="num">Peso</th></tr></thead>
            <tbody>
              {perfiles.compra.map((c) => (
                <tr key={c.perfil + c.largoBarra}><td>{c.perfil}</td><td>{c.ficha}</td><td className="num">{c.barras}</td><td className="num">{c.largoBarra} m</td><td className="num">{c.kilos ? `${c.kilos} kg` : ''}</td></tr>
              ))}
            </tbody>
          </table>
          <table className="tabla-impresion">
            <thead><tr><th>Dónde va</th><th>Perfil</th><th className="num">Piezas</th><th className="num">Metros</th></tr></thead>
            <tbody>
              {perfiles.usos.map((u) => (
                <tr key={u.parte + u.perfil}><td>{u.parte}</td><td>{u.perfil}</td><td className="num">{u.piezas}</td><td className="num">{u.metros.toFixed(2)} m</td></tr>
              ))}
            </tbody>
          </table>
        </>
      )}
      {aberturas && aberturas.length > 0 && (
        <>
          <h2>Aberturas ({resumenDeAberturas(aberturas)})</h2>
          <table className="tabla-impresion">
            <thead><tr><th>#</th><th>Tipo</th><th>Pared</th><th className="num">Ancho</th><th className="num">Alto</th><th className="num">Antepecho</th><th>Dónde (vista desde afuera)</th></tr></thead>
            <tbody>
              {aberturas.map((a) => (
                <tr key={a.numero}>
                  <td>{a.numero}</td><td>{a.tipo}{a.etiqueta ? ` · ${a.etiqueta}` : ''}</td><td>{a.pared}</td>
                  <td className="num">{a.ancho.toFixed(2)} m</td><td className="num">{a.alto.toFixed(2)} m</td><td className="num">{a.antepecho.toFixed(2)} m</td>
                  <td>{a.ubicacion}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </>
  );
}

/** v1.50: el seguimiento de la obra en el PDF. */
function InformeSeguimiento({ informe }) {
  const r = informe.resumen;
  return (
    <div className="bloque-seguimiento">
      <h2>Seguimiento de la obra</h2>
      <p>Presupuestado {pesos(r.presupuestado)} · Contratado {pesos(r.contratado)} · <strong>Pagado {pesos(r.pagado)}</strong> ·
        {' '}<strong>Falta pagar {pesos(r.saldo)}</strong> · Terminados {r.terminados} de {r.rubros}</p>
      <table className="tabla-impresion">
        <thead><tr><th>Rubro</th><th>Quién</th><th>Estado</th><th className="num">Contratado</th><th className="num">Pagado</th><th className="num">Falta</th></tr></thead>
        <tbody>
          {informe.rubros.map((x, i) => (
            <tr key={i}>
              <td>{x.nombre}
                {x.pagos.length > 0 && <small className="detalle"><br />{x.pagos.map((p) => `${fechaLegible(p.fecha)} ${pesos(p.monto)} (${p.medio}${p.nota ? `, ${p.nota}` : ''})`).join(' · ')}</small>}
              </td>
              <td>{x.quien}</td>
              <td>{x.estado}{x.fechaFin ? ` (${fechaLegible(x.fechaFin)})` : ''}</td>
              <td className="num">{pesos(x.contratado)}</td>
              <td className="num">{pesos(x.pagado)}</td>
              <td className="num">{x.deMas > 0 ? `de más ${pesos(x.deMas)}` : pesos(x.falta)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function HojasImpresion({
  opciones, capturas, nombre, subtitulo, leyenda3D, resumen, items, total, gruposCortes, vistas, params, plan = null, materiales = [], implantacion = null,
  aberturas = [], cierre = null, seguimiento = null,
}) {
  const fotos = capturas ?? { actual: null, fijas: [], medidas: [] };
  const conParedes = opciones.paredes && vistas.paredes.length > 0;
  // v1.42: solo las plantas de las partes elegidas (ej. sin entrepiso para quien cotiza los paneles).
  const plantas = plantasElegidas(vistas.plantas, opciones);
  const conPlantas = opciones.plantas && plantas.length > 0;
  // v1.42: caños y aberturas con los planos.
  const perfiles = opciones.listaCanos ? listaDePerfiles(items, materiales, opciones) : null;
  const listaAberturas = opciones.listaAberturas && params.tipoProyecto === 'construccion' ? listaDeAberturas(aberturas, params) : [];
  const conListas = (perfiles && perfiles.compra.length > 0) || listaAberturas.length > 0;
  // v1.42: la hoja 1 (3D y datos) sale solo si tiene algo; si no, el nombre va arriba de la primera hoja que salga
  // (con "solo planos" ya no sale una hoja con el título solo).
  const conHoja1 = (opciones.vista3D && fotos.actual) || (opciones.vistasFijas && fotos.fijas.length > 0)
    || (opciones.medidas && fotos.medidas.length > 0) || (opciones.resumen && resumen.length > 0);
  const conHoja2 = opciones.presupuesto || conPlantas;
  const partes = opciones.vistasPartes ? (fotos.partes ?? []) : []; // v1.44
  const primera = conHoja1 ? 1 : conHoja2 ? 2 : partes.length > 0 ? 2.5 : conParedes ? 3 : conListas ? 4 : 5;
  const cabecera = (
    <header className="cabecera-impresion">
      <h1>🐤 {nombre || 'Proyecto sin nombre'}</h1>
      <p>{subtitulo}</p>
    </header>
  );
  return (
    <div className="hojas-impresion solo-impresion">
      {conHoja1 && (
      <section className="hoja-impresion">
        {cabecera}

        {opciones.vista3D && fotos.actual && (
          <figure className="foto-3d">
            <img src={fotos.actual} alt="Vista 3D de la estructura" />
            {leyenda3D && <figcaption>{leyenda3D}</figcaption>}
          </figure>
        )}
        {opciones.vistasFijas && fotos.fijas.length > 0 && (
          <div className="vistas-fijas">
            {fotos.fijas.map((v) => (
              <figure key={v.clave}><img src={v.imagen} alt={`Vista ${v.titulo}`} /><figcaption>{v.titulo}</figcaption></figure>
            ))}
          </div>
        )}
        {opciones.medidas && fotos.medidas.length > 0 && (
          <p className="medidas-impresion"><strong>Medidas tomadas:</strong> {fotos.medidas.map((md) => `${md.nombre} ${md.texto}`).join(' · ')}</p>
        )}

        {opciones.resumen && resumen.length > 0 && (
          <>
            <h2>Datos de la obra</h2>
            <table className="tabla-impresion tabla-resumen">
              <tbody>{resumen.map(([que, como]) => <tr key={que}><th>{que}</th><td>{como}</td></tr>)}</tbody>
            </table>
          </>
        )}
      </section>
      )}

      {conHoja2 && (
        <section className="hoja-impresion">
          {primera === 2 && cabecera}
          {opciones.presupuesto && (
            <>
              {/* v1.31.0: primero la lista de materiales (todo, sin proveedor). */}
              {materiales.length > 0 && (
                <>
                  <h2>Lista de materiales</h2>
                  <table className="tabla-impresion">
                    <thead><tr><th>Cantidad</th><th>Material</th><th>Tipo, medidas y espesor</th><th className="num">Peso</th></tr></thead>
                    <tbody>
                      {materiales.map((m) => (
                        <tr key={m.clave}>
                          <td>{cantidadPedida(m)}</td><td>{m.nombre}</td>
                          <td>{[m.ficha, m.medidas && `Medidas: ${m.medidas}`].filter(Boolean).join(' — ')}</td>
                          <td className="num">{m.kgPorBarra ? `${Math.round(m.kgPorBarra * m.cantidad)} kg` : ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
              <h2>Presupuesto de materiales</h2>
              {/* v1.30.2: con plan de compra, la tabla es la del proveedor elegido y el total de la obra es el del plan. */}
              <PresupuestoCompacto items={items} total={total}
                etiquetaTotal={plan && plan.compras.length > 0 ? 'Total con el proveedor elegido (sin lo que no vende)' : 'TOTAL'} />
              {/* v1.29: con más de un proveedor, a quién comprarle cada cosa (contando el flete). */}
              {plan && plan.compras.length > 0 && (
                <div className="plan-impresion">
                  <h2>TOTAL DE LA OBRA — plan de compra (contando el flete): {pesos(plan.total)}</h2>
                  {plan.compras.map((c) => (
                    <p key={c.proveedor.id}>
                      <strong>{c.proveedor.nombre} — {pesos(c.total)}</strong>
                      {c.flete > 0 ? ` (flete ${pesos(c.flete)})` : ''}:{' '}
                      {/* v1.30.3: por material (lo que se le pide al proveedor), no por dónde se usa */}
                      {c.materiales.map((m) => `${cantidadPedida(m)} ${m.nombre}` + (m.ficha ? ` (${m.ficha})` : '') + (m.medidas ? ` — medidas: ${m.medidas}` : '')).join(' · ')}
                    </p>
                  ))}
                  {plan.nadieVende.length > 0 && <p>Ningún proveedor vende: {plan.nadieVende.join(', ')}.</p>}
                </div>
              )}
              {/* v1.46: de los materiales al precio de la obra. */}
              {cierre?.conCierre && (<>
                <h2>Precio de la obra</h2>
                <TablaCierre resultado={cierre} />
              </>)}
            </>
          )}
          {/* v1.50: seguimiento de la obra (contratado, pagado y lo que falta, con los pagos de cada rubro). */}
          {opciones.seguimiento && seguimiento?.rubros.length > 0 && <InformeSeguimiento informe={seguimiento} />}
          {/* v1.32: implantación (la casa en su lote), con las plantas. */}
          {conPlantas && implantacion && params.terreno?.activo && (
            <div className="bloque-implantacion plano-impresion">
              <h2>Implantación (la calle abajo)</h2>
              <PlanoImplantacion imp={implantacion} terreno={params.terreno} />
            </div>
          )}
          {conPlantas && (
            <div className="bloque-plantas">
              <h2>Plantas (vistas desde arriba)</h2>
              <div className="grilla-planos grilla-plantas">
                {/* v1.50: sin "Interiores" (ej. para quien cotiza los paneles) las plantas salen sin tabiques, mesadas ni muebles. */}
                {plantas.map((p) => <div key={p.nivel} className="plano-impresion"><PlanoDePlanta vista={opciones.parteInteriores === false ? { ...p, tabiques: [], mesadas: [], muebles: [] } : p} /></div>)}
              </div>
            </div>
          )}
        </section>
      )}

      {/* v1.44: el 3D por partes (cada piso desde arriba, el adentro desde cada lado sin esa pared). */}
      {partes.length > 0 && (
        <section className="hoja-impresion">
          {!conHoja1 && !conHoja2 && cabecera}
          <h2>Vistas por partes</h2>
          <div className="vistas-fijas vistas-partes">
            {partes.map((v) => (
              <figure key={v.clave}><img src={v.imagen} alt={v.titulo} /><figcaption>{v.titulo}</figcaption></figure>
            ))}
          </div>
        </section>
      )}

      {conParedes && (
        <section className="hoja-impresion">
          {primera === 3 && cabecera}
          <h2>Paredes (vistas desde afuera)</h2>
          <div className="grilla-planos">
            {vistas.paredes.map((v) => <div key={v.lado} className="plano-impresion"><PlanoDePared vista={v} params={params} /></div>)}
          </div>
        </section>
      )}

      {conListas && (
        <section className="hoja-impresion">
          {primera === 4 && cabecera}
          <ListasDePlanos perfiles={perfiles} aberturas={listaAberturas} />
        </section>
      )}

      {opciones.cortes && gruposCortes.length > 0 && (
        <section className="hoja-impresion hoja-cortes">
          {primera === 5 && cabecera}
          <h2>Cómo cortar cada barra</h2>
          <CortesCompactos grupos={gruposCortes} />
        </section>
      )}
    </div>
  );
}
