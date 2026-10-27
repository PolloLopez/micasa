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

import { PlanoDePared, PlanoDePlanta } from './Planos.jsx';
import { agruparBarras, textoBarra } from '../proyecto/cortesAgrupados.js';

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

export default function HojasImpresion({
  opciones, capturas, nombre, subtitulo, leyenda3D, resumen, items, total, gruposCortes, vistas, params, plan = null,
}) {
  const fotos = capturas ?? { actual: null, fijas: [], medidas: [] };
  const conParedes = opciones.paredes && vistas.paredes.length > 0;
  const conPlantas = opciones.plantas && vistas.plantas.length > 0;
  return (
    <div className="hojas-impresion solo-impresion">
      <section className="hoja-impresion">
        <header className="cabecera-impresion">
          <h1>🐤 {nombre || 'Proyecto sin nombre'}</h1>
          <p>{subtitulo}</p>
        </header>

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

      {(opciones.presupuesto || conPlantas) && (
        <section className="hoja-impresion">
          {opciones.presupuesto && (
            <>
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
                      {c.materiales.map((m) => `${m.nombre}: ${m.cantidad} ${m.unidad ?? ''}`.trim() + (m.medidas ? ` (${m.medidas})` : '')).join(' · ')}
                    </p>
                  ))}
                  {plan.nadieVende.length > 0 && <p>Ningún proveedor vende: {plan.nadieVende.join(', ')}.</p>}
                </div>
              )}
            </>
          )}
          {conPlantas && (
            <div className="bloque-plantas">
              <h2>Plantas (vistas desde arriba)</h2>
              <div className="grilla-planos grilla-plantas">
                {vistas.plantas.map((p) => <div key={p.nivel} className="plano-impresion"><PlanoDePlanta vista={p} /></div>)}
              </div>
            </div>
          )}
        </section>
      )}

      {conParedes && (
        <section className="hoja-impresion">
          <h2>Paredes (vistas desde afuera)</h2>
          <div className="grilla-planos">
            {vistas.paredes.map((v) => <div key={v.lado} className="plano-impresion"><PlanoDePared vista={v} params={params} /></div>)}
          </div>
        </section>
      )}

      {opciones.cortes && gruposCortes.length > 0 && (
        <section className="hoja-impresion hoja-cortes">
          <h2>Cómo cortar cada barra</h2>
          <CortesCompactos grupos={gruposCortes} />
        </section>
      )}
    </div>
  );
}
