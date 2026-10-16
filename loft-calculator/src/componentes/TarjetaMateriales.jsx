// ==========================================================
// TarjetaMateriales: QUÉ es cada material (v1.15).
// ----------------------------------------------------------
// Acá el herrero carga cada material una vez:
//   - Perfiles y otros: perfil o descripción y largo de barra.
//   - Revestimientos (paneles, chapas, placas, durlock): cómo se vende
//     (a medida o en placas estándar), sus medidas, el espesor, dónde
//     va respecto de la estructura y sus dos colores.
// El presupuesto (TablaPresupuesto) queda solo con cantidades y precios.
// Todo se guarda en el catálogo (viaja con el proyecto).
// ==========================================================

import CampoNumero from './CampoNumero.jsx';
import CampoSelect from './CampoSelect.jsx';
import Tarjeta from './Tarjeta.jsx';
import { LIMITES_REVESTIMIENTO } from '../motor/revestimientos.js';

/** Valida un número contra sus límites y, si está bien, lo guarda. */
const conLimites = ({ min, max }, actualizar, enTexto = (n) => `${n} m`) => (v) => {
  if (!Number.isFinite(v) || v < min) return `Mínimo ${enTexto(min)}`;
  if (v > max) return `Máximo ${enTexto(max)}`;
  actualizar(v);
  return null;
};
const LIMITES_BARRA = { min: 1, max: 12 };

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
          <CampoNumero etiqueta="Solape (0 = a tope)" unidad={unidad} valor={tipo.solape}
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
 * @param revestimientos tipos de revestimiento del catálogo (null = el proyecto no usa: grada, montaje)
 */
export default function TarjetaMateriales({
  items, catalogo, revestimientos, unidad, usosDeRevestimiento, excedenteBarras,
  onCambiarExcedente, onCambiarInsumo, onAgregarRevestimiento, onQuitarRevestimiento,
}) {
  const largoDe = (id) => catalogo.find((p) => p.id === id)?.largoBarra;
  const otros = items.filter((i) => i.categoria !== 'panel');

  return (
    <Tarjeta id="materiales" titulo="Materiales">
      <p className="nota">
        Qué es cada material: perfil, medidas y cómo se vende. Las cantidades y los precios están en el
        <strong> Presupuesto</strong>.
      </p>

      <h3 className="subtitulo">Perfiles y otros</h3>
      <div className="grid-params">
        <CampoNumero etiqueta="Excedente de las barras" sufijo="%" decimales={1}
          valor={excedenteBarras} onCambio={onCambiarExcedente} />
      </div>
      <p className="nota">
        Las barras suelen venir entre 1 % y 2 % más largas que su medida nominal, <strong>según el proveedor</strong>:
        cargá el de tu proveedor. El optimizador corta sobre ese largo real.
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Material</th><th>Perfil o descripción</th><th>Largo de barra</th></tr>
          </thead>
          <tbody>
            {otros.map((item) => (
              <tr key={item.id}>
                <td className="item-name">{item.nombre}</td>
                <td>
                  <input className="perfil" type="text" value={item.perfil}
                    aria-label={`Perfil o material de ${item.nombre}`}
                    onChange={(e) => onCambiarInsumo(item.id, 'perfil', e.target.value)} />
                </td>
                <td>
                  {item.cortes ? (
                    <CampoNumero etiqueta="" sufijo="m" valor={largoDe(item.id)}
                      onCambio={conLimites(LIMITES_BARRA, (v) => onCambiarInsumo(item.id, 'largoBarra', v))} />
                  ) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
