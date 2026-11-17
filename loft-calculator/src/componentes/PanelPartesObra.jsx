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
import { extraNuevo } from '../motor/partesObra.js';

const pesos = (n) => n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
const cantidad = (n) => n.toLocaleString('es-AR', { maximumFractionDigits: 2 });

/**
 * @param partes partesDeLaObra(…) (con sus renglones, su obra civil, sus extras y si está terminada)
 */
export default function PanelPartesObra({ params, partes, cambiar }) {
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
      <p className="nota">
        Tildá <strong>Terminada</strong> cuando una parte está hecha: sus materiales ya no cuentan en "falta comprar" ni en la lista
        para pedir. En cada parte podés <strong>agregar lo que haga falta</strong> (ej. manguera de riego para el nivel, tanza para
        alinear): suma al presupuesto y a la lista de materiales.
      </p>
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
                {p.renglones.map((r) => <li key={r.id}>{cantidad(r.cantidad)} {r.unidad} · {r.nombre}</li>)}
                {p.obraCivil && <li>{p.obraCivil.nombre}: {p.obraCivil.detalle} (cemento, arena, piedra y hierro de obra civil)</li>}
              </ul>
            )}
            <h4 className="subtitulo-pared">Extras</h4>
            {p.extras.length === 0 && <p className="vacio">Nada agregado.</p>}
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
            <button type="button" className="btn-sec" onClick={() => agregarExtra(p.clave)}>+ Agregar a {p.nombre}</button>
            <p className="nota">Si ya lo compraste, cargalo también en Compras hechas (elegilo de la lista de materiales).</p>
          </FichaPlegable>
        );
      })}
    </Tarjeta>
  );
}
