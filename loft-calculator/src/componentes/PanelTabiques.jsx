// ==========================================================
// PanelTabiques (v1.41): divisiones de Durlock (baño, antebaño, ducha)
// ----------------------------------------------------------
// Cada tabique sale de una pared (perpendicular) o corre al lado de ella
// (paralelo), a una distancia de la esquina vista desde afuera, como las
// aberturas. Perfil de la lista, revestimiento por cara de la lista y puerta
// de abrir o corrediza tipo granero. Las cuentas están en motor/tabiques.js;
// cada cambio se valida en App (cambiar).
// ==========================================================

import { useState } from 'react';
import Tarjeta from './Tarjeta.jsx';
import FichaPlegable from './FichaPlegable.jsx';
import CampoNumero from './CampoNumero.jsx';
import CampoSelect from './CampoSelect.jsx';
import SelectorPerfil from './SelectorPerfil.jsx';
import { LADOS } from '../motor/constantes.js';
import { nombreLado, ladoOpuesto } from '../motor/geometria.js';
import { tabiqueNuevo, carasDelTabique, altosDelTabique, TIPOS_PUERTA, SENTIDOS_PUERTA, distanciasDelTabique } from '../motor/tabiques.js';
import { puertasTapadas } from '../motor/recorrido.js';

const f2 = (n) => n.toFixed(2).replace('.', ',');

function Tabique({ t, i, params, unidad, cambiar, onQuitar, paneles, perfiles, perfilGeneral, generado, abiertaAlInicio }) {
  const ruta = `tabiques.${i}`;
  const medida = (campo, etiqueta, base = t, rutaBase = ruta) => (
    <CampoNumero etiqueta={etiqueta} unidad={unidad} valor={base[campo]} onCambio={cambiar(`${rutaBase}.${campo}`)} />
  );
  const caras = carasDelTabique(t);
  const d = distanciasDelTabique(params, t);
  const [h0, h1] = altosDelTabique(params, t);
  const selectorRev = (campo, etiqueta) => (
    <CampoSelect etiqueta={etiqueta} valor={t[campo]} opciones={[['', 'Sin placa'], ...paneles.map((p) => [p.id, p.nombre])]}
      onCambio={cambiar(`${ruta}.${campo}`)} />
  );
  const metros = generado ? generado.piezas.reduce((acc, p) => acc + p.largo, 0) : 0;
  const tapada = puertasTapadas(params, t.nivel ?? 'piso').find((x) => x.tabique === t.nombre);
  const m2 = generado ? generado.panos.reduce((acc, p) => acc + p.neto, 0) : 0;
  return (
    <FichaPlegable clave={`tabique:${t.id}`} className="tabique" abiertaAlInicio={abiertaAlInicio}
      encabezado={<>
          <strong>{t.nombre}</strong>
          <small>{t.orientacion === 'paralelo' ? 'Paralelo a' : 'Desde'} {nombreLado(t.lado, params.ladoFrente)} · {f2(t.largo)} m</small>
      </>}
      acciones={<button type="button" className="btn-del" onClick={onQuitar} aria-label={`Quitar ${t.nombre}`} title="Quitar">✕</button>}>
      <div className="etiqueta-pared">
        <label className="capa">
          <input type="checkbox" checked={t.mostrarEtiqueta !== false} aria-label={`Mostrar la etiqueta de ${t.nombre || 'el tabique'} en el 3D`}
            onChange={(e) => cambiar(`${ruta}.mostrarEtiqueta`)(e.target.checked)} />
          Etiqueta en el 3D
        </label>
        <input type="text" className="perfil" maxLength={40} value={t.nombre} aria-label="Nombre"
          onChange={(e) => cambiar(`${ruta}.nombre`)(e.target.value)} />
      </div>
      <div className="grid-params">
        <CampoSelect etiqueta="Pared" valor={t.lado} opciones={LADOS.map((l) => [l, `${nombreLado(l, params.ladoFrente)} (${l})`])}
          onCambio={cambiar(`${ruta}.lado`)} />
        <CampoSelect etiqueta="Cómo va" valor={t.orientacion}
          opciones={[['perpendicular', 'Sale de la pared (perpendicular)'], ['paralelo', 'Al lado de la pared (paralelo)']]}
          onCambio={cambiar(`${ruta}.orientacion`)} />
        <CampoSelect etiqueta="Medida desde la esquina" valor={t.ladoReferencia}
          opciones={[['izquierda', 'Izquierda (vista desde afuera)'], ['derecha', 'Derecha (vista desde afuera)']]}
          onCambio={(v) => cambiar(ruta)({ ...t, ladoReferencia: v, desde: Math.round((v === 'izquierda' ? d.izquierda : d.derecha) * 100) / 100 })} />
        {medida('desde', 'Distancia a la esquina')}
        {/* v1.51: como los muebles, la separación se mide desde su pared o desde la de enfrente. */}
        {t.orientacion === 'paralelo' && (
          <CampoSelect etiqueta="Separación medida desde" valor={t.separacionDesde ?? 'pared'}
            opciones={[['pared', `Su pared (${nombreLado(t.lado, params.ladoFrente)})`], ['enfrente', `La de enfrente (${nombreLado(ladoOpuesto(t.lado), params.ladoFrente)})`]]}
            onCambio={(v) => cambiar(ruta)({ ...t, separacionDesde: v, separacion: Math.round((v === 'enfrente' ? d.aEnfrente : d.aSuPared) * 100) / 100 })} />
        )}
        {t.orientacion === 'paralelo' && medida('separacion', 'Separación')}
        {medida('largo', 'Largo')}
        <CampoSelect etiqueta="Alto" valor={t.alto}
          opciones={[['techo', 'Hasta el techo'], ...(params.anchoEntrepiso > 0 ? [['piso2', 'Hasta el piso 2']] : []), ['medida', 'Una medida']]}
          onCambio={cambiar(`${ruta}.alto`)} />
        {t.alto === 'medida' && medida('altoMedida', 'Alto del tabique')}
        {params.anchoEntrepiso > 0 && (
          <CampoSelect etiqueta="Nivel" valor={t.nivel} opciones={[['piso', 'Planta baja'], ['piso2', 'Piso 2 (entrepiso)']]} onCambio={cambiar(`${ruta}.nivel`)} />
        )}
      </div>
      {/* v1.51: las otras distancias, calculadas (como en los muebles). */}
      <p className="nota distancias-mueble" role="status">
        Queda a <strong>{f2(d.izquierda)} m</strong> de la esquina izquierda y a <strong>{f2(d.derecha)} m</strong> de la derecha (vista desde afuera)
        {t.orientacion === 'paralelo'
          ? <>, a <strong>{f2(d.aSuPared)} m</strong> de su pared y a <strong>{f2(d.aEnfrente)} m</strong> de la de enfrente.</>
          : <>; de su punta a la pared de enfrente quedan <strong>{f2(d.alaPunta)} m</strong>.</>}
        {d.puertaDesdeArranque !== undefined && <> La puerta, a {f2(d.puertaDesdeArranque)} m del arranque y a {f2(d.puertaDesdePunta)} m de la punta.</>}
      </p>
      <p className="nota">Alto: {f2(h0)}{Math.abs(h0 - h1) > 0.005 ? ` a ${f2(h1)}` : ''} m. {t.orientacion === 'perpendicular'
        ? 'La distancia a la esquina es al eje del tabique; sale desde la cara de adentro de la pared.'
        : 'La separación es de la cara de adentro de la pared al eje del tabique.'}</p>

      <h4 className="subtitulo-pared">Estructura y placas</h4>
      <div className="grid-params">
        <SelectorPerfil etiqueta="Perfil" valor={t.perfil} perfiles={perfiles}
          opcionGeneral={`General (${perfilGeneral || 'sin elegir'})`} onElegir={(id) => cambiar(`${ruta}.perfil`)(id ?? '')} />
        {medida('separacionMontantes', 'Montantes cada')}
        {selectorRev('revestimientoA', `Cara A (${caras.A})`)}
        {selectorRev('revestimientoB', `Cara B (${caras.B})`)}
      </div>

      <h4 className="subtitulo-pared">Puerta</h4>
      {t.puerta.tipo !== 'ninguna' && <p className="nota">Izquierda y derecha: parado del lado de la cara A ({caras.A}), mirando el tabique.</p>}
      <div className="grid-params">
        <CampoSelect etiqueta="Tipo" valor={t.puerta.tipo} opciones={TIPOS_PUERTA} onCambio={cambiar(`${ruta}.puerta.tipo`)} />
        {t.puerta.tipo !== 'ninguna' && (<>
          {/* v1.51: la puerta se ubica desde el arranque o desde la punta del tabique, y se elige su sentido. */}
          <CampoSelect etiqueta="Puerta medida desde" valor={t.puerta.medidaDesde ?? 'arranque'}
            opciones={[['arranque', 'El arranque del tabique (contra la pared)'], ['punta', 'La punta del tabique']]}
            onCambio={(v) => cambiar(`${ruta}.puerta`)({ ...t.puerta, medidaDesde: v,
              desde: Math.round((v === 'punta' ? d.puertaDesdePunta : d.puertaDesdeArranque) * 100) / 100 })} />
          {medida('desde', 'Distancia', t.puerta, `${ruta}.puerta`)}
          {medida('ancho', 'Ancho', t.puerta, `${ruta}.puerta`)}
          {medida('alto', 'Alto', t.puerta, `${ruta}.puerta`)}
          <CampoSelect etiqueta={t.puerta.tipo === 'granero' ? 'Corre del lado' : 'Abre hacia'} valor={t.puerta.cara}
            opciones={[['A', `A (${caras.A})`], ['B', `B (${caras.B})`]]} onCambio={cambiar(`${ruta}.puerta.cara`)} />
          <CampoSelect etiqueta={t.puerta.tipo === 'granero' ? 'Abre corriendo' : 'Abre (la bisagra a la izquierda o a la derecha)'}
            valor={t.puerta.sentido ?? 'izqDer'} opciones={SENTIDOS_PUERTA} onCambio={cambiar(`${ruta}.puerta.sentido`)} />
        </>)}
      </div>
      {/* v1.50: si la puerta queda tapada (mesada, mueble, pared), las personas no pueden pasar. */}
      {tapada && <p className="aviso-mueble aviso-choque" role="alert">⚠ La puerta queda tapada por {tapada.con.join(', ')}: no se puede pasar. Corré la puerta o lo que la tapa.</p>}
      {generado && (
        <p className="nota resumen-mesada" role="status">
          {generado.piezas.length} piezas ({f2(metros)} m de perfil){m2 > 0 ? ` · ${f2(m2)} m² de placa` : ''}
          {generado.puerta ? ` · puerta ${generado.puerta === 'granero' ? 'granero' : 'de abrir'}` : ''}
        </p>
      )}
    </FichaPlegable>
  );
}

/**
 * @param generados e.tabiques (piezas y paños) para el resumen
 * @param perfilGeneral texto del perfil del renglón "Estructura de tabiques"
 */
export default function PanelTabiques({ params, unidad, cambiar, paneles, perfiles, perfilGeneral, generados }) {
  const tabiques = params.tabiques;
  const [aviso, setAviso] = useState(null);
  const [recien, setRecien] = useState(null); // v1.42.1
  const agregar = () => {
    const id = Math.max(0, ...tabiques.map((t) => t.id)) + 1;
    setRecien(id); // el recién agregado arranca abierto
    setAviso(cambiar('tabiques')([...tabiques, tabiqueNuevo(tabiques, id)]));
  };
  const quitar = (id) => cambiar('tabiques')(tabiques.filter((t) => t.id !== id));
  return (
    <Tarjeta id="tabiques" titulo={`Tabiques (${tabiques.length})`} resaltar={{ tipo: 'grupo', id: 'tabique', nombre: 'Tabiques' }}>
      <p className="nota">
        Divisiones de Durlock (baño, antebaño, cerramiento de la ducha): estructura con un perfil de tu lista, placa por
        cara de tus revestimientos y puerta de abrir o corrediza tipo granero. Van al presupuesto y al diagrama de cortes.
      </p>
      {tabiques.length === 0 && <p className="vacio">Todavía no hay tabiques.</p>}
      {tabiques.map((t, i) => (
        <Tabique key={t.id} t={t} i={i} params={params} unidad={unidad} cambiar={cambiar} onQuitar={() => quitar(t.id)}
          paneles={paneles} perfiles={perfiles} perfilGeneral={perfilGeneral} generado={generados?.find((g) => g.id === t.id)} abiertaAlInicio={t.id === recien} />
      ))}
      <button type="button" className="btn-sec" onClick={agregar}>+ Tabique</button>
      {aviso && <p className="error" role="alert">{aviso}</p>}
    </Tarjeta>
  );
}
