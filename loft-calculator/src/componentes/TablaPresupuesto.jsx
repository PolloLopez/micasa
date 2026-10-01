// ==========================================================
// TablaPresupuesto: cantidades, precios editables, subtotales,
// total y el diagrama de cortes de cada perfil.
// ==========================================================

import CampoNumero from './CampoNumero.jsx';

const pesos = (n) => n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

/** Validadores para los campos del catálogo. */
const validarPrecio = (actualizar) => (v) => {
  if (v < 0) return 'No puede ser negativo';
  actualizar(Math.round(v));
  return null;
};
const validarLargo = (actualizar) => (v) => {
  if (v < 1) return 'Mínimo 1 m';
  if (v > 12) return 'Máximo 12 m';
  actualizar(v);
  return null;
};

/** Dibujo de cómo cortar cada barra. */
function DiagramaCortes({ item }) {
  const { cortes } = item;
  const largo = item.largoReal; // largo nominal + excedente
  return (
    <details className="bar-details">
      <summary>{item.nombre} ({item.perfil}): {cortes.totalBarras} barras de {item.largoBarra} m (reales {largo.toFixed(2)} m)</summary>
      <div className="bar-cuts-container">
        {cortes.barras.map((b) => (
          <div key={b.numero} className="bar-item">
            <div className="bar-title">
              Barra #{b.numero} · sobrante {(largo - b.usado).toFixed(2)} m
            </div>
            <div className="bar-graphic">
              {b.piezas.map((p, i) => (
                <div key={i} className="piece-block" style={{ width: `${(p / largo) * 100}%` }} title={`${p} m`}>
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

export default function TablaPresupuesto({ items, total, catalogo, onCambiarInsumo, excedenteBarras, onCambiarExcedente }) {
  const largoDe = (id) => catalogo.find((p) => p.id === id)?.largoBarra;
  const perfiles = items.filter((i) => i.cortes);

  return (
    <section className="card presupuesto">
      <h2>Presupuesto de materiales</h2>
      <div className="grid-params">
        <CampoNumero etiqueta="Excedente de las barras" sufijo="%" decimales={1}
          valor={excedenteBarras} onCambio={onCambiarExcedente} />
      </div>
      <p className="nota">
        Las barras vienen entre 1 % y 2 % más largas que su medida nominal: el optimizador corta sobre ese largo real.
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Insumo</th>
              <th className="num">Cant.</th>
              <th>Largo barra</th>
              <th>Precio unit.</th>
              <th className="num">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>
                  <div className="item-name">{item.nombre}</div>
                  <input
                    className="perfil"
                    type="text"
                    value={item.perfil}
                    aria-label={`Perfil o material de ${item.nombre}`}
                    onChange={(e) => onCambiarInsumo(item.id, 'perfil', e.target.value)}
                  />
                  <small className="detalle">{item.detalle}</small>
                </td>
                <td className="num">{item.cantidad} {item.unidad}</td>
                <td>
                  {item.cortes ? (
                    <CampoNumero etiqueta="" sufijo="m" valor={largoDe(item.id)}
                      onCambio={validarLargo((v) => onCambiarInsumo(item.id, 'largoBarra', v))} />
                  ) : '—'}
                </td>
                <td>
                  <CampoNumero etiqueta="" sufijo="$" decimales={0} valor={item.precio}
                    onCambio={validarPrecio((v) => onCambiarInsumo(item.id, 'precio', v))} />
                </td>
                <td className="num sub">{pesos(item.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="total"><span>TOTAL</span><span>{pesos(total)}</span></div>
      <p className="nota">
        Las barras salen del optimizador de cortes (merma de 3 mm por corte). Las piezas más largas que la barra se empalman.
      </p>

      <h3 className="subtitulo">Diagrama de cortes</h3>
      {perfiles.filter((i) => i.cantidad > 0).map((item) => <DiagramaCortes key={item.id} item={item} />)}
    </section>
  );
}
