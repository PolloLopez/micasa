// ==========================================================
// EditorPieza: recortar, mover o cambiar el perfil de UNA pieza
// seleccionada en el 3D. Cada cambio válido se aplica al momento
// (igual que el resto de los campos): el 3D y el presupuesto se
// actualizan solos. "Deshacer cambios" vuelve a la pieza original.
//
// Los recortes se miden sobre la pieza ORIGINAL (la que arma el
// motor con los parámetros), no sobre la ya recortada.
// ==========================================================

import { nombrePerfil } from '../motor/perfiles.js';
import { INSUMO_DE_TIPO } from '../motor/piezasAgregadas.js';
import { useId } from 'react';
import CampoNumero from './CampoNumero.jsx';
import { nombreDePared } from '../motor/geometria.js';
import {
  EDICION_VACIA, esEdicionVacia, esVertical, revisarEdicionDePieza, ALARGAR_MAXIMO,
} from '../motor/edicionPiezas.js';
import NotaPlegable from './NotaPlegable.jsx';
import { nombreCorto } from './PerfilesDeLasPartes.jsx';

/**
 * Nombre de cada extremo de la pieza según hacia dónde apunta:
 * vertical => abajo / arriba; si no, la pared hacia la que mira cada punta.
 */
/** ¿La pieza tiene un perfil elegido a mano? */
const perfilElegidoOriginal = (edicion) => Boolean(edicion?.perfilLista || edicion?.perfil);

export function nombresExtremos(original, obra) {
  const d = original.hasta.map((v, i) => v - original.desde[i]);
  const eje = [0, 1, 2].reduce((mayor, i) => (Math.abs(d[i]) > Math.abs(d[mayor]) ? i : mayor), 0);
  const positivo = { 0: `hacia ${nombreDePared('B', obra)} (B)`, 1: 'arriba', 2: `hacia ${nombreDePared('A', obra)} (A)` }[eje];
  const negativo = { 0: `hacia ${nombreDePared('D', obra)} (D)`, 1: 'abajo', 2: `hacia ${nombreDePared('C', obra)} (C)` }[eje];
  // `desde` está del lado negativo si d[eje] > 0.
  return d[eje] > 0 ? { inicio: negativo, fin: positivo } : { inicio: positivo, fin: negativo };
}

/**
 * @param pieza       pieza actual (puede venir ya editada; trae `original`)
 * @param edicion     edición guardada de esta pieza (o undefined)
 * @param catalogo    para mostrar nombre y perfil de cada renglón
 * @param ladoFrente, paredes  para nombrar las paredes (con su etiqueta)
 * @param alturaPiso2 altura de la estructura del piso 2 (null si no hay entrepiso)
 * @param elevacion   altura del piso del loft sobre el suelo (las alturas se muestran desde ese piso)
 * @param onEditar    (id, edicion) => error | null
 */
export default function EditorPieza({ pieza, edicion, catalogo, unidad, ladoFrente, paredes = null, alturaPiso2, elevacion = 0, onEditar, perfilesDeTrabajo = [] }) {
  const obra = { ladoFrente, paredes }; // v1.52: las paredes con su etiqueta ("Patio")
  const idPerfil = useId();
  const original = pieza.original ?? pieza;
  const actual = { ...EDICION_VACIA, ...edicion };
  const extremos = nombresExtremos(original, obra);
  // v1.72: el perfil de la lista elegido (los de antes guardaban el renglón: se muestra el perfil de ese renglón).
  const listaDePerfiles = catalogo.filter((i) => i.categoria === 'hierro');
  const deRenglon = (id) => catalogo.find((i) => i.id === id)?.perfilId ?? '';
  const perfilElegido = actual.perfilLista ?? (actual.perfil ? deRenglon(actual.perfil) : '');
  const renglonDeSuTipo = catalogo.find((i) => i.id === (pieza.esquina ? 'columnaEsquina' : INSUMO_DE_TIPO[pieza.tipo]));
  // v1.87: "el de su tipo" es el de su pared si la pared tiene uno elegido (sin editar la pieza, es el que trae).
  // Con un perfil elegido a mano no se sabe si su pared tiene otro: se dice sin nombre.
  const perfilDeSuTipo = perfilElegidoOriginal(actual) ? ''
    : pieza.perfilPared ? nombrePerfil(catalogo.find((i) => i.id === pieza.perfilPared))
      : renglonDeSuTipo?.perfilId ? nombrePerfil(catalogo.find((i) => i.id === renglonDeSuTipo.perfilId)) : '';

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


  return (
    <div className="editor-pieza">
      <NotaPlegable>
        Largo original {original.largo.toFixed(2)} m · ahora {pieza.largo.toFixed(2)} m.
        {pieza.recorteIgnorado && <strong className="error"> El recorte ya no entra (cambió una medida): revisalo.</strong>}
      </NotaPlegable>

      {esVertical(original) ? (<>
        {/* Vertical (v1.16): se dice directo a qué altura arranca y termina, medida desde el piso del loft. */}
        <h3 className="subtitulo">Altura</h3>
        <NotaPlegable>
          Medida desde el piso del loft. La pieza original va de {(yAbajo - elevacion).toFixed(2)} a {(yArriba - elevacion).toFixed(2)} m:
          se puede acortar o alargar (hasta {ALARGAR_MAXIMO} m por punta).
        </NotaPlegable>
        <div className="grid-params">
          <CampoNumero etiqueta="Arranca a" unidad={unidad} valor={yAbajo - elevacion + actual[campoAbajo]}
            onCambio={(v) => cambiarCampo(campoAbajo)(Number((v - (yAbajo - elevacion)).toFixed(4)))} />
          <CampoNumero etiqueta="Termina a" unidad={unidad} valor={yArriba - elevacion - actual[campoArriba]}
            onCambio={(v) => cambiarCampo(campoArriba)(Number((yArriba - elevacion - v).toFixed(4)))} />
        </div>
      </>) : (<>
      <h3 className="subtitulo">Acortar o alargar</h3>
      <NotaPlegable>Cuánto se le saca a cada punta de la pieza. Con un número negativo se alarga (ej. −0,10 = 10 cm más; hasta {ALARGAR_MAXIMO} m).</NotaPlegable>
      <div className="grid-params">
        <CampoNumero etiqueta={`Acortar (− alarga) la punta ${extremos.inicio === 'abajo' || extremos.inicio === 'arriba' ? `de ${extremos.inicio}` : extremos.inicio}`}
          unidad={unidad} valor={actual.recorteInicio} onCambio={cambiarCampo('recorteInicio')} />
        <CampoNumero etiqueta={`Acortar (− alarga) la punta ${extremos.fin === 'abajo' || extremos.fin === 'arriba' ? `de ${extremos.fin}` : extremos.fin}`}
          unidad={unidad} valor={actual.recorteFin} onCambio={cambiarCampo('recorteFin')} />
      </div>
      </>)}
      {puedeTerminarEnPiso2 && (
        <button type="button" className="btn-sec" onClick={terminarEnPiso2}>Que termine en el piso 2</button>
      )}

      <h3 className="subtitulo">Mover (negativo = para el otro lado)</h3>
      <div className="grid-params">
        <CampoNumero etiqueta={`Hacia ${nombreDePared('B', obra)} (B)`} unidad={unidad} valor={actual.moverX} onCambio={cambiarCampo('moverX')} />
        <CampoNumero etiqueta={`Hacia ${nombreDePared('A', obra)} (A)`} unidad={unidad} valor={actual.moverZ} onCambio={cambiarCampo('moverZ')} />
        <CampoNumero etiqueta="Subir" unidad={unidad} valor={actual.moverY} onCambio={cambiarCampo('moverY')} />
      </div>

      <h3 className="subtitulo">Perfil</h3>
      {/* v1.72 (Leandro: "debe mostrarme los tipos de materiales que tengo, no la lista de dónde lo uso"): los perfiles
          de la lista (Caño 80x80x2.0, Perfil C 80x40…). La pieza se compra con ese perfil. */}
      <NotaPlegable>Con qué hierro se hace esta pieza (de tu lista de perfiles, en Materiales).</NotaPlegable>
      {/* v1.87 (Leandro: "al editar una pieza sigue preguntándome entre todas las opciones; quiero elegir entre los
          materiales"): un botón por cada perfil de trabajo (80×80, C 80×40), "el de su tipo" y "otro…" para el resto. */}
      {(() => {
        const elegir = (id) => onEditar(pieza.id, { ...actual, perfil: null, perfilLista: id || null });
        const botones = perfilesDeTrabajo.map((id) => listaDePerfiles.find((p) => p.id === id)).filter(Boolean);
        const esOtro = perfilElegido && !botones.some((p) => p.id === perfilElegido);
        return (
          <div className="botones-perfil" role="group" aria-label="Perfil de esta pieza">
            <button type="button" className={`btn-perfil${!perfilElegido ? ' activo' : ''}`} aria-pressed={!perfilElegido} onClick={() => elegir(null)}
              title="El que tiene elegido su tipo de pieza (o su pared)">El de su tipo o pared{perfilDeSuTipo ? ` (${nombreCorto(listaDePerfiles.find((p) => nombrePerfil(p) === perfilDeSuTipo)) || perfilDeSuTipo})` : ''}</button>
            {botones.map((p) => (
              <button key={p.id} type="button" className={`btn-perfil${perfilElegido === p.id ? ' activo' : ''}`} aria-pressed={perfilElegido === p.id}
                title={`${nombrePerfil(p)} · barra ${p.largoBarra} m`} onClick={() => elegir(p.id)}>{nombreCorto(p)}</button>
            ))}
            <select id={idPerfil} className={`otro-perfil${esOtro ? ' activo' : ''}`} value={esOtro ? perfilElegido : ''} aria-label="Otro perfil de tu lista"
              onChange={(e) => e.target.value && elegir(e.target.value)}>
              <option value="">{esOtro ? '' : 'otro…'}</option>
              {listaDePerfiles.map((p) => <option key={p.id} value={p.id}>{nombrePerfil(p)} · barra {p.largoBarra} m</option>)}
            </select>
          </div>
        );
      })()}
      {actual.perfil && !actual.perfilLista && (
        <small className="detalle">Elegido antes como "{catalogo.find((i) => i.id === actual.perfil)?.nombre}": se compra con {perfilElegido ? nombrePerfil(catalogo.find((i) => i.id === perfilElegido)) : 'su perfil'}.</small>
      )}
      {/* v1.22: de dónde sale el perfil cuando no se cambió a mano. */}
      {!actual.perfil && pieza.esquina && <small className="detalle">Columna de esquina: va en el renglón "Columnas de esquina".</small>}
      {!perfilElegidoOriginal(actual) && pieza.perfilPared && (
        <small className="detalle">
          Usa el perfil elegido para su pared: {nombrePerfil(catalogo.find((i) => i.id === pieza.perfilPared)) || 'el general'}.
        </small>
      )}

      {!esEdicionVacia(actual) && (
        <button type="button" className="btn-sec" onClick={() => onEditar(pieza.id, EDICION_VACIA)}>Deshacer cambios</button>
      )}
    </div>
  );
}
