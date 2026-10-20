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
import { LIMITES_REVESTIMIENTO } from '../motor/revestimientos.js';
import { perfilesDeLista } from '../motor/perfiles.js';

/** Valida un número contra sus límites y, si está bien, lo guarda. */
const conLimites = ({ min, max }, actualizar, enTexto = (n) => `${n} m`) => (v) => {
  if (!Number.isFinite(v) || v < min) return `Mínimo ${enTexto(min)}`;
  if (v > max) return `Máximo ${enTexto(max)}`;
  actualizar(v);
  return null;
};

/** Un tipo de revestimiento con todos sus datos. */
function Revestimiento({ tipo, unidad, usos, unicoQueda, onCambiar, onQuitar }) {
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
        <button className="btn-del no-print" onClick={() => onQuitar(tipo.id)}
          disabled={Boolean(motivoNoBorrar)} title={motivoNoBorrar ?? 'Quitar revestimiento'}
          aria-label={`Quitar ${tipo.nombre}`}>✕</button>
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
      <small className="detalle">{usos.length > 0 ? `Usado en: ${usos.join(', ')}` : 'Sin uso'}</small>
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
}) {
  const perfiles = perfilesDeLista(catalogo);
  const usosPerfil = items.filter((i) => i.categoria === 'perfil'); // Columnas, Zanca… (los de este proyecto)
  const otros = items.filter((i) => i.categoria !== 'panel' && i.categoria !== 'perfil'); // OSB, pilotines, madera…
  // Qué renglones de ESTE proyecto usa cada perfil (para "Usado en" y para no borrar uno en uso).
  const usadoEn = {};
  usosPerfil.forEach((i) => i.perfilId && (usadoEn[i.perfilId] ??= []).push(i.nombre));
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

      {/* v1.21: lista de perfiles. Cada parte de la obra elige uno; el precio y el largo de barra son del perfil. */}
      <h3 className="subtitulo">Perfiles (los hierros que usás)</h3>
      <p className="nota">
        Cargá cada hierro una sola vez: tipo, medidas en mm, largo de barra y precio. El peso sale de las medidas
        (aproximado). Las partes que usan el mismo perfil comparten barras y precio.
      </p>
      <ListaPerfiles perfiles={visibles} usadoEn={usadoEn}
        onActualizar={onActualizarPerfil} onAgregar={onAgregarPerfil} onQuitar={onQuitarPerfil} />

      <h3 className="subtitulo">Qué perfil va en cada parte</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Parte</th><th>Perfil</th></tr>
          </thead>
          <tbody>
            {usosPerfil.map((item) => (
              <tr key={item.id}>
                <td className="item-name">{item.nombre}</td>
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>)}

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
              unicoQueda={revestimientos.length === 1} onCambiar={onCambiarInsumo} onQuitar={onQuitarRevestimiento} />
          ))}
        </ul>
        <button className="btn-add no-print" onClick={onAgregarRevestimiento}>+ Agregar revestimiento</button>
      </>)}
    </Tarjeta>
  );
}
