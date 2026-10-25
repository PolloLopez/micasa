// ==========================================================
// TarjetaMateriales: QUÉ es cada material (v1.15).
// ----------------------------------------------------------
// Acá el herrero carga cada material una vez:
//   - Perfiles (v1.21): la lista de hierros (tipo, medidas, barra, precio,
//     peso) y qué perfil va en cada parte de la obra.
//   - Otros materiales: descripción (OSB, pilotines, madera…).
//   - Revestimientos (paneles, chapas, placas, durlock): cómo se vende
//     (a medida o en placas estándar), sus medidas, el espesor, dónde
//     va respecto de la estructura y sus dos colores.
// El presupuesto (TablaPresupuesto) queda solo con cantidades y precios.
// Todo se guarda en el catálogo (viaja con el proyecto).
// ==========================================================

import CampoNumero from './CampoNumero.jsx';
import CampoOpcional from './CampoOpcional.jsx';
import CampoSelect from './CampoSelect.jsx';
import Tarjeta from './Tarjeta.jsx';
import ListaPerfiles from './ListaPerfiles.jsx';
import SelectorPerfil from './SelectorPerfil.jsx';
import { LIMITES_ACCESORIO } from '../motor/presupuesto.js';
import { BotonResaltar } from './Resaltar.jsx';
import { useResaltar, criterioDeRenglon as criterioDe } from './contextoResaltado.js';
import { LIMITES_REVESTIMIENTO } from '../motor/revestimientos.js';
import { perfilesDeLista } from '../motor/perfiles.js';
import { aplicarProveedor, proveedoresDe } from '../motor/proveedores.js';
import PreciosProveedores from './PreciosProveedores.jsx';
import ListaProveedores from './ListaProveedores.jsx';

/** Valida un número contra sus límites y, si está bien, lo guarda. */
const conLimites = ({ min, max }, actualizar, enTexto = (n) => `${n} m`) => (v) => {
  if (!Number.isFinite(v) || v < min) return `Mínimo ${enTexto(min)}`;
  if (v > max) return `Máximo ${enTexto(max)}`;
  actualizar(v);
  return null;
};

/** Un tipo de revestimiento con todos sus datos. */
function Revestimiento({ tipo, unidad, usos, unicoQueda, proveedores, onCambiar, onQuitar, onCambiarPrecio }) {
  const cambiar = (campo) => (valor) => onCambiar(tipo.id, campo, valor);
  const medida = (campo, etiqueta) => (
    <CampoNumero key={campo} etiqueta={etiqueta} unidad={unidad} valor={tipo[campo]}
      onCambio={conLimites(LIMITES_REVESTIMIENTO[campo], cambiar(campo))} />
  );
  const motivoNoBorrar = usos.length > 0 ? `En uso: ${usos.join(', ')}` : unicoQueda ? 'Tiene que quedar al menos uno' : null;

  return (
    <li className="abertura">
      <div className="abertura-titulo">
        {/* Dos colores: la cara de afuera y la de adentro (se ven distintas en el 3D). */}
        <label className="color-cara" title="Color exterior">
          <input type="color" className="muestra" value={tipo.color} aria-label={`Color exterior de ${tipo.nombre}`}
            onChange={(e) => cambiar('color')(e.target.value)} />
          <span>Ext.</span>
        </label>
        <label className="color-cara" title="Color interior">
          <input type="color" className="muestra" value={tipo.colorInterior} aria-label={`Color interior de ${tipo.nombre}`}
            onChange={(e) => cambiar('colorInterior')(e.target.value)} />
          <span>Int.</span>
        </label>
        <input className="perfil nombre-panel" value={tipo.nombre} aria-label="Nombre del revestimiento"
          onChange={(e) => cambiar('nombre')(e.target.value)} />
      </div>
      <div className="grid-params">
        <div className="group">
          <label htmlFor={`desc-${tipo.id}`}>Descripción</label>
          <input id={`desc-${tipo.id}`} value={tipo.perfil} placeholder="ej. Panel PUR 50 mm"
            onChange={(e) => cambiar('perfil')(e.target.value)} />
        </div>
        <CampoSelect etiqueta="Cómo se vende" valor={tipo.venta} onCambio={cambiar('venta')}
          opciones={[['medida', 'A medida'], ['estandar', 'Placa fija']]} />
        {tipo.venta === 'medida' ? (<>
          {medida('anchoUtil', 'Ancho útil')}
          {medida('largoMaximo', 'Largo máximo')}
          <CampoOpcional casilla="Con solape (si no, a tope)" etiqueta="Solape" unidad={unidad} valor={tipo.solape} valorPorDefecto={0.15}
            onCambio={conLimites({ ...LIMITES_REVESTIMIENTO.solape, max: Math.min(LIMITES_REVESTIMIENTO.solape.max, tipo.largoMaximo - 0.01) }, cambiar('solape'))} />
        </>) : (<>
          {medida('anchoPlaca', 'Ancho de placa')}
          {medida('largoPlaca', 'Largo de placa')}
        </>)}
        <CampoNumero etiqueta="Espesor" sufijo="mm" decimales={0} valor={tipo.espesor}
          onCambio={conLimites(LIMITES_REVESTIMIENTO.espesor, cambiar('espesor'), (n) => `${n} mm`)} />
        <CampoSelect etiqueta="Ubicación" valor={tipo.ubicacion} onCambio={cambiar('ubicacion')}
          opciones={[['cara', 'Sobre los perfiles'], ['eje', 'Entre perfiles']]} />
      </div>
      {/* v1.25: precio en cada proveedor. A medida se cobra por m²; placa fija, por placa. */}
      <PreciosProveedores material={tipo} proveedores={proveedores} unidad={tipo.venta === 'estandar' ? 'placa' : 'm²'}
        onCambiar={(idProveedor, campo, valor) => onCambiarPrecio(tipo.id, idProveedor, campo, valor)} />
      {/* v1.27: Eliminar en el pie (antes un ✕ al lado del nombre, que parecía "cerrar"). */}
      <small className="detalle">{usos.length > 0 ? `Usado en: ${usos.join(', ')}` : 'Sin uso'}</small>
      <div className="pie-acciones no-print">
        <button className="btn-del eliminar-aparte" onClick={() => onQuitar(tipo.id)}
          disabled={Boolean(motivoNoBorrar)} title={motivoNoBorrar ?? 'Eliminar revestimiento'}
          aria-label={`Eliminar ${tipo.nombre}`}>Eliminar</button>
      </div>
    </li>
  );
}

/** Un accesorio (v1.29): nombre, descripción, cantidad, unidad y precio por proveedor. */
function Accesorio({ accesorio: a, proveedores, onCambiar, onQuitar, onCambiarPrecio }) {
  const texto = (campo, largo) => (e) => onCambiar(a.id, { [campo]: e.target.value.slice(0, largo) });
  const cambiarCantidad = (v) => {
    const { min, max } = LIMITES_ACCESORIO.cantidad;
    if (v < min || v > max) return `Entre ${min} y ${max}`;
    onCambiar(a.id, { cantidad: v });
    return null;
  };
  return (
    <li className="abertura accesorio">
      <div className="grid-params">
        <div className="group">
          <label htmlFor={`acc-nombre-${a.id}`}>Accesorio</label>
          <input id={`acc-nombre-${a.id}`} type="text" maxLength={60} value={a.nombre} onChange={texto('nombre', 60)} />
        </div>
        <div className="group">
          <label htmlFor={`acc-desc-${a.id}`}>Descripción</label>
          <input id={`acc-desc-${a.id}`} type="text" maxLength={120} value={a.perfil} placeholder="ej. T2 punta mecha 14x1" onChange={texto('perfil', 120)} />
        </div>
        <CampoNumero etiqueta="Cantidad" decimales={2} valor={a.cantidad} onCambio={cambiarCantidad} />
        <div className="group">
          <label htmlFor={`acc-unidad-${a.id}`}>Unidad</label>
          <input id={`acc-unidad-${a.id}`} type="text" maxLength={15} value={a.unidad} placeholder="caja, kg, u…" onChange={texto('unidad', 15)} />
        </div>
      </div>
      <PreciosProveedores material={a} proveedores={proveedores} unidad={a.unidad}
        onCambiar={(idProveedor, campo, valor) => onCambiarPrecio(a.id, idProveedor, campo, valor)} />
      <div className="pie-acciones no-print">
        <button className="btn-del eliminar-aparte" onClick={() => onQuitar(a.id)} aria-label={`Eliminar ${a.nombre}`}>Eliminar</button>
      </div>
    </li>
  );
}

/**
 * @param items          renglones del presupuesto (para mostrar solo los materiales de este proyecto)
 * @param catalogo       catálogo guardado (con la lista de perfiles, categoria 'hierro')
 * @param revestimientos tipos de revestimiento del catálogo (null = el proyecto no usa: grada, montaje)
 */
export default function TarjetaMateriales({
  items, catalogo, revestimientos, unidad, usosDeRevestimiento, excedenteBarras,
  onCambiarExcedente, onCambiarInsumo, onAgregarRevestimiento, onQuitarRevestimiento,
  compartirCortes, onCambiarCompartir, onActualizarPerfil, onAgregarPerfil, onQuitarPerfil,
  proveedor, pago, onCambiarPrecio, onActualizarProveedor, onAgregarProveedor, onQuitarProveedor,
  onAgregarAccesorio, onQuitarAccesorio,
}) {
  // v1.25: para mostrar, cada material con el precio del proveedor y la forma de pago elegidos.
  const conPrecios = aplicarProveedor(catalogo, proveedor, pago);
  const pasar = useResaltar(); // v1.27: resaltar en el 3D las piezas de cada renglón
  const proveedores = proveedoresDe(catalogo);
  const perfiles = perfilesDeLista(conPrecios);
  // Columnas, Zanca… (los de este proyecto). Los renglones "por pared" (v1.22) se eligen en cada pared.
  const usosPerfil = items.filter((i) => i.categoria === 'perfil' && !i.derivadoDe);
  // OSB, pilotines, madera… (los accesorios y el flete tienen su lugar propio).
  const otros = items.filter((i) => !['panel', 'perfil', 'accesorio', 'flete'].includes(i.categoria));
  const accesorios = catalogo.filter((i) => i.categoria === 'accesorio');
  // Qué renglones de ESTE proyecto usa cada perfil (para "Usado en" y para no borrar uno en uso).
  const usadoEn = {};
  items.filter((i) => i.categoria === 'perfil').forEach((i) => i.perfilId && (usadoEn[i.perfilId] ??= []).push(i.nombre));
  // Perfiles que solo usan los renglones de OTRO tipo de proyecto (ej. los caños de la grada en un loft):
  // no se muestran en la lista para no llenarla, pero se pueden elegir en el desplegable.
  const deOtroProyecto = new Set(catalogo
    .filter((i) => i.categoria === 'perfil' && i.perfilId && !usosPerfil.some((u) => u.id === i.id))
    .map((i) => i.perfilId)
    .filter((id) => !usadoEn[id]));
  const visibles = perfiles.filter((p) => !deOtroProyecto.has(p.id));

  return (
    <Tarjeta id="materiales" titulo="Materiales">
      <p className="nota">
        Qué es cada material: perfil, medidas y cómo se vende. Las cantidades están en el <strong>Presupuesto</strong>.
      </p>

      {/* v1.25: proveedores. Los precios de cada material se cargan en ese material. */}
      <h3 className="subtitulo">Proveedores</h3>
      <p className="nota">
        Cargá tus proveedores y, en cada material, el precio de cada uno (efectivo y, si cambia, con tarjeta).
        En el <strong>Presupuesto</strong> elegís con cuál calcular y comparás los totales.
      </p>
      <ListaProveedores proveedores={proveedores} onActualizar={onActualizarProveedor}
        onAgregar={onAgregarProveedor} onQuitar={onQuitarProveedor} />

      {/* v1.21: lista de perfiles. Cada parte de la obra elige uno; el precio y el largo de barra son del perfil. */}
      <h3 className="subtitulo">Perfiles (los hierros que usás)</h3>
      <p className="nota">
        Cargá cada hierro una sola vez: tipo, medidas en mm, largo de barra y precio. El peso sale de las medidas
        (aproximado). Las partes que usan el mismo perfil comparten barras y precio.
      </p>
      <ListaPerfiles perfiles={visibles} todos={perfiles} usadoEn={usadoEn} proveedores={proveedores} onCambiarPrecio={onCambiarPrecio}
        onActualizar={onActualizarPerfil} onAgregar={onAgregarPerfil} onQuitar={onQuitarPerfil} />

      <h3 className="subtitulo">Qué perfil va en cada parte</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Parte</th><th>Perfil</th></tr>
          </thead>
          <tbody>
            {usosPerfil.map((item) => (
              <tr key={item.id} {...pasar(criterioDe(item))}>
                <td className="item-name">
                  {item.nombre}
                  {item.largosPiezas?.length > 0 && <BotonResaltar criterio={criterioDe(item)} />}
                </td>
                <td>
                  <SelectorPerfil etiqueta={`Perfil de ${item.nombre}`} conEtiqueta={false} valor={item.perfilId}
                    perfiles={perfiles} onElegir={(id) => onCambiarInsumo(item.id, 'perfilId', id)} />
                  {/* Con qué otras partes corta de las mismas barras. */}
                  {item.compartenCon && (
                    <small className="comparte" title={item.compartenCon.join(', ')}>
                      Comparte barras con {item.compartenCon.length > 2 ? `otros ${item.compartenCon.length} renglones del mismo perfil` : item.compartenCon.join(', ')}
                    </small>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid-params">
        <CampoNumero etiqueta="Excedente de las barras" sufijo="%" decimales={1}
          valor={excedenteBarras} onCambio={onCambiarExcedente} />
      </div>
      <p className="nota">
        Las barras suelen venir entre 1 % y 2 % más largas que su medida nominal, <strong>según el proveedor</strong>:
        cargá el de tu proveedor. El optimizador corta sobre ese largo real.
      </p>
      {/* v1.20: las partes del mismo perfil cortan de las mismas barras (como en el taller). */}
      <label className="casilla-opcional">
        <input type="checkbox" checked={compartirCortes} onChange={(e) => onCambiarCompartir(e.target.checked)} />
        Compartir barras entre partes del mismo perfil
      </label>

      {otros.length > 0 && (<>
        <h3 className="subtitulo">Otros materiales</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Material</th><th>Descripción</th></tr>
            </thead>
            <tbody>
              {otros.map((item) => (
                <tr key={item.id}>
                  <td className="item-name">{item.nombre}</td>
                  <td>
                    <input className="perfil" type="text" value={item.perfil}
                      aria-label={`Descripción de ${item.nombre}`}
                      onChange={(e) => onCambiarInsumo(item.id, 'perfil', e.target.value)} />
                    {/* v1.25: precio en cada proveedor (el renglón del catálogo, no el del presupuesto). */}
                    <PreciosProveedores material={catalogo.find((c) => c.id === item.id) ?? item} proveedores={proveedores}
                      unidad={item.unidad} onCambiar={(idProveedor, campo, valor) => onCambiarPrecio(item.id, idProveedor, campo, valor)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>)}

      {/* v1.29: accesorios. La cantidad se carga a mano (no sale de la estructura). */}
      <h3 className="subtitulo">Accesorios (tornillería, electrodos, selladores…)</h3>
      <p className="nota">
        Lo que se compra aparte de la estructura. Cargá cuánto vas a necesitar y el precio de cada proveedor
        (sin precio = ese proveedor no lo vende). Con cantidad 0 no entra al presupuesto.
      </p>
      <ul className="opening-list">
        {accesorios.map((a) => (
          <Accesorio key={a.id} accesorio={a} proveedores={proveedores} onCambiar={onActualizarPerfil}
            onQuitar={onQuitarAccesorio} onCambiarPrecio={onCambiarPrecio} />
        ))}
      </ul>
      <button className="btn-add no-print" onClick={onAgregarAccesorio}>+ Agregar accesorio</button>

      {revestimientos && (<>
        <h3 className="subtitulo">Revestimientos (paneles, chapas, placas)</h3>
        <p className="nota">
          Cada pared elige su revestimiento exterior y, si lleva, el interior; el techo, el suyo.
          <strong> A medida</strong>: se piden tiras del alto de la pared (si pasa el largo máximo, van en tramos).
          <strong> Placa fija</strong>: se cuentan placas enteras. <strong>Ubicación</strong>: sobre los perfiles (tapa
          la estructura) o embutido entre perfiles; lo decide el herrero según el revestimiento.
        </p>
        <ul className="opening-list">
          {revestimientos.map((tipo) => (
            <Revestimiento key={tipo.id} tipo={tipo} unidad={unidad} usos={usosDeRevestimiento(tipo.id)}
              unicoQueda={revestimientos.length === 1} onCambiar={onCambiarInsumo} onQuitar={onQuitarRevestimiento}
              proveedores={proveedores} onCambiarPrecio={onCambiarPrecio} />
          ))}
        </ul>
        <button className="btn-add no-print" onClick={onAgregarRevestimiento}>+ Agregar revestimiento</button>
      </>)}
    </Tarjeta>
  );
}
