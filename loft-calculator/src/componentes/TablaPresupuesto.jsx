// ==========================================================
// TablaPresupuesto: cantidades, precios editables, subtotales,
// total y el diagrama de cortes de cada perfil.
// Desde v1.15 el perfil, el largo de barra y el excedente se cargan
// en la tarjeta Materiales: acá solo se cuenta y se pone precio.
// ==========================================================

import CampoNumero from './CampoNumero.jsx';
import Tarjeta from './Tarjeta.jsx';

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

export default function TablaPresupuesto({ items, total, gruposCortes = [], onCambiarInsumo }) {
  // Peso de lo que se compra: barras x largo nominal x kg/m de su perfil (v1.21).
  const kilos = items.reduce((acc, i) => acc + (i.cortes && i.kgm ? i.cantidad * i.largoBarra * i.kgm : 0), 0);

  return (
    <Tarjeta id="presupuesto" titulo="Presupuesto de materiales" className="presupuesto">
      <p className="nota">Cantidades a comprar y precios. Qué es cada material se carga en la tarjeta <strong>Materiales</strong>.</p>
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
              <tr key={item.id}>
                <td>
                  <div className="item-name">{item.nombre}</div>
                  {item.perfil && <div className="perfil-texto">{item.perfil}{item.cortes ? ` · barra de ${item.largoBarra} m` : ''}</div>}
                  <small className="detalle">{item.detalle}</small>
                </td>
                <td className="num">{item.cantidad} {item.unidad}</td>
                <td>
                  {/* v1.21: el precio de una barra es del perfil de la lista: cambiarlo acá lo cambia en todas sus partes. */}
                  <CampoNumero etiqueta="" sufijo="$" decimales={0} valor={item.precio}
                    onCambio={validarPrecio((v) => onCambiarInsumo(item.perfilId ?? item.id, 'precio', v))} />
                </td>
                <td className="num sub">{pesos(item.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="total"><span>TOTAL</span><span>{pesos(total)}</span></div>
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
