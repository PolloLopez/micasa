// ==========================================================
// EditorPieza: recortar, mover o cambiar el perfil de UNA pieza
// seleccionada en el 3D. Cada cambio válido se aplica al momento
// (igual que el resto de los campos): el 3D y el presupuesto se
// actualizan solos. "Deshacer cambios" vuelve a la pieza original.
//
// Los recortes se miden sobre la pieza ORIGINAL (la que arma el
// motor con los parámetros), no sobre la ya recortada.
// ==========================================================

import { useId } from 'react';
import CampoNumero from './CampoNumero.jsx';
import { nombreLado } from '../motor/geometria.js';
import {
  EDICION_VACIA, PERFILES_CONSTRUCCION, PERFILES_GRADA, PERFILES_MONTAJE, esEdicionVacia, esVertical, revisarEdicionDePieza,
} from '../motor/edicionPiezas.js';

/**
 * Nombre de cada extremo de la pieza según hacia dónde apunta:
 * vertical => abajo / arriba; si no, la pared hacia la que mira cada punta.
 */
function nombresExtremos(original, ladoFrente) {
  const d = original.hasta.map((v, i) => v - original.desde[i]);
  const eje = [0, 1, 2].reduce((mayor, i) => (Math.abs(d[i]) > Math.abs(d[mayor]) ? i : mayor), 0);
  const positivo = { 0: `hacia ${nombreLado('B', ladoFrente)} (B)`, 1: 'arriba', 2: `hacia ${nombreLado('A', ladoFrente)} (A)` }[eje];
  const negativo = { 0: `hacia ${nombreLado('D', ladoFrente)} (D)`, 1: 'abajo', 2: `hacia ${nombreLado('C', ladoFrente)} (C)` }[eje];
  // `desde` está del lado negativo si d[eje] > 0.
  return d[eje] > 0 ? { inicio: negativo, fin: positivo } : { inicio: positivo, fin: negativo };
}

/**
 * @param pieza       pieza actual (puede venir ya editada; trae `original`)
 * @param edicion     edición guardada de esta pieza (o undefined)
 * @param catalogo    para mostrar nombre y perfil de cada renglón
 * @param ladoFrente  para nombrar las paredes
 * @param alturaPiso2 altura de la estructura del piso 2 (null si no hay entrepiso)
 * @param elevacion   altura del piso del loft sobre el suelo (las alturas se muestran desde ese piso)
 * @param onEditar    (id, edicion) => error | null
 */
export default function EditorPieza({ pieza, edicion, catalogo, unidad, ladoFrente, alturaPiso2, elevacion = 0, onEditar }) {
  const idPerfil = useId();
  const original = pieza.original ?? pieza;
  const actual = { ...EDICION_VACIA, ...edicion };
  const extremos = nombresExtremos(original, ladoFrente);

  /** Cambia un campo: valida contra la pieza original y aplica. */
  const cambiarCampo = (campo) => (valor) => {
    const nueva = { ...actual, [campo]: valor };
    return revisarEdicionDePieza(original, nueva) ?? onEditar(pieza.id, nueva);
  };

  // Atajo para columnas: que terminen en el piso 2 (ej. la del centro del altillo).
  const yArriba = Math.max(original.desde[1], original.hasta[1]);
  const yAbajo = Math.min(original.desde[1], original.hasta[1]);
  const puedeTerminarEnPiso2 = esVertical(original) && alturaPiso2 !== null && alturaPiso2 > yAbajo + 0.05 && alturaPiso2 < yArriba - 0.01;
  const terminarEnPiso2 = () => {
    const campoArriba = original.hasta[1] > original.desde[1] ? 'recorteFin' : 'recorteInicio';
    cambiarCampo(campoArriba)(Number((yArriba - alturaPiso2).toFixed(4)));
  };

  // Vertical: qué punta es la de abajo (los recortes se guardan por punta "desde" / "hasta").
  const campoAbajo = original.desde[1] <= original.hasta[1] ? 'recorteInicio' : 'recorteFin';
  const campoArriba = campoAbajo === 'recorteInicio' ? 'recorteFin' : 'recorteInicio';

  // Solo los renglones que existen en este tipo de proyecto (construcción o grada).
  const asignables = pieza.grupos.includes('grada') ? PERFILES_GRADA
    : pieza.grupos.includes('montaje') ? PERFILES_MONTAJE : PERFILES_CONSTRUCCION;
  const perfiles = asignables.map((id) => catalogo.find((p) => p.id === id)).filter(Boolean);

  return (
    <div className="editor-pieza">
      <p className="nota">
        Largo original {original.largo.toFixed(2)} m · ahora {pieza.largo.toFixed(2)} m.
        {pieza.recorteIgnorado && <strong className="error"> El recorte ya no entra (cambió una medida): revisalo.</strong>}
      </p>

      {esVertical(original) ? (<>
        {/* Vertical (v1.16): se dice directo a qué altura arranca y termina, medida desde el piso del loft. */}
        <h3 className="subtitulo">Altura</h3>
        <p className="nota">
          Medida desde el piso del loft. La pieza original va de {(yAbajo - elevacion).toFixed(2)} a {(yArriba - elevacion).toFixed(2)} m:
          se puede acortar, no alargar (para alargarla, duplicala o movela).
        </p>
        <div className="grid-params">
          <CampoNumero etiqueta="Arranca a" unidad={unidad} valor={yAbajo - elevacion + actual[campoAbajo]}
            onCambio={(v) => (v < yAbajo - elevacion - 1e-9
              ? `No puede arrancar más abajo que la original (${(yAbajo - elevacion).toFixed(2)} m)`
              : cambiarCampo(campoAbajo)(Number((v - (yAbajo - elevacion)).toFixed(4))))} />
          <CampoNumero etiqueta="Termina a" unidad={unidad} valor={yArriba - elevacion - actual[campoArriba]}
            onCambio={(v) => (v > yArriba - elevacion + 1e-9
              ? `No puede terminar más arriba que la original (${(yArriba - elevacion).toFixed(2)} m)`
              : cambiarCampo(campoArriba)(Number((yArriba - elevacion - v).toFixed(4))))} />
        </div>
      </>) : (<>
      <h3 className="subtitulo">Acortar</h3>
      <p className="nota">Cuánto se le saca a cada punta de la pieza.</p>
      <div className="grid-params">
        <CampoNumero etiqueta={`Acortar la punta ${extremos.inicio === 'abajo' || extremos.inicio === 'arriba' ? `de ${extremos.inicio}` : extremos.inicio}`}
          unidad={unidad} valor={actual.recorteInicio} onCambio={cambiarCampo('recorteInicio')} />
        <CampoNumero etiqueta={`Acortar la punta ${extremos.fin === 'abajo' || extremos.fin === 'arriba' ? `de ${extremos.fin}` : extremos.fin}`}
          unidad={unidad} valor={actual.recorteFin} onCambio={cambiarCampo('recorteFin')} />
      </div>
      </>)}
      {puedeTerminarEnPiso2 && (
        <button type="button" className="btn-sec" onClick={terminarEnPiso2}>Que termine en el piso 2</button>
      )}

      <h3 className="subtitulo">Mover (negativo = para el otro lado)</h3>
      <div className="grid-params">
        <CampoNumero etiqueta={`Hacia ${nombreLado('B', ladoFrente)} (B)`} unidad={unidad} valor={actual.moverX} onCambio={cambiarCampo('moverX')} />
        <CampoNumero etiqueta={`Hacia ${nombreLado('A', ladoFrente)} (A)`} unidad={unidad} valor={actual.moverZ} onCambio={cambiarCampo('moverZ')} />
        <CampoNumero etiqueta="Subir" unidad={unidad} valor={actual.moverY} onCambio={cambiarCampo('moverY')} />
      </div>

      <h3 className="subtitulo">Perfil</h3>
      <p className="nota">Con qué perfil se hace esta pieza. Se compra y se cotiza en ese renglón del presupuesto.</p>
      <div className="group">
        <label htmlFor={idPerfil}>Perfil de esta pieza</label>
        <select id={idPerfil} value={actual.perfil ?? ''} onChange={(e) => cambiarCampo('perfil')(e.target.value || null)}>
          <option value="">El de su tipo de pieza (sin cambiar)</option>
          {perfiles.map((p) => <option key={p.id} value={p.id}>{p.nombre}{p.perfil ? ` · ${p.perfil}` : ''}</option>)}
        </select>
      </div>

      {!esEdicionVacia(actual) && (
        <button type="button" className="btn-sec" onClick={() => onEditar(pieza.id, EDICION_VACIA)}>Deshacer cambios</button>
      )}
    </div>
  );
}
