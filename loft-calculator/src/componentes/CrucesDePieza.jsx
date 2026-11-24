// ==========================================================
// CrucesDePieza (v1.88): los cruces de la pieza tocada, uno por uno
// ----------------------------------------------------------
// Pedido de Leandro (24/11): "debería poder ingresar dónde se une y dónde
// no, en cada cruce, no en general. También para poder ponerlo debajo del
// otro fierro" (le pasaba con las transversales de piso).
//
// Una fila por cruce (con qué pieza y a cuántos metros de la punta), con lo
// que pasa hoy (✂ se corta · entera · ⤓ va debajo) y para elegir:
//   - qué pasa en ese cruce (se corta una u otra, o una va debajo de la otra
//     y cuál se mueve),
//   - cómo se une donde se corta (soldada, cubrejunta o chapa),
//   - "a todas": lo mismo en todos sus cruces con ese tipo de pieza.
// En el 3D, cada cruce es un punto: tocarlo marca su fila acá.
// ==========================================================

import { useEffect, useRef } from 'react';
import { NOMBRE_TIPO_PIEZA } from '../motor/estructura.js';
import { FORMAS_DE_UNION } from '../motor/armado.js';
import { OPCIONES_DE_CRUCE, aOpcion, deOpcion, idBase } from '../motor/crucesElegidos.js';

/** Cómo se muestra lo que pasa en el cruce (desde esta pieza). */
const RESULTADO = {
  'se corta': ['✂ se corta', 'cruce-corta'],
  entera: ['pasa entera', 'cruce-entera'],
  debajo: ['⤓ va debajo', 'cruce-debajo'],
  arriba: ['⤒ va arriba', 'cruce-debajo'],
};

const metros = (n) => n.toFixed(2).replace('.', ',');

/**
 * @param pieza       la pieza tocada (o uno de sus tramos)
 * @param cruces      estructura.crucesDePiezas (todas)
 * @param elegidos    params.crucesElegidos
 * @param activo      clave del cruce tocado en el 3D (se marca y se abre la lista)
 * @param onCambiar   ({ clave: cambio }) => void (ver cambiarCrucesElegidos)
 * @param punta       el nombre de la punta desde donde se miden los metros
 */
export default function CrucesDePieza({ pieza, cruces = {}, elegidos = {}, activo = null, onCambiar, punta }) {
  const base = idBase(pieza.id);
  const lista = cruces[base] ?? [];
  const filaActiva = useRef(null);
  useEffect(() => { filaActiva.current?.scrollIntoView({ block: 'nearest' }); }, [activo]);
  if (lista.length === 0) return null;
  const elegidosAca = lista.filter((c) => elegidos[c.clave]).length;
  // ¿la otra pieza se corta en este cruce? (para saber si la unión importa)
  const seCortaLaOtra = (c) => cruces[c.otra]?.find((x) => x.clave === c.clave)?.resultado === 'se corta';
  return (
    <details className="cruces-de-pieza" open={Boolean(activo && lista.some((c) => c.clave === activo)) || undefined}>
      <summary>Sus cruces ({lista.length}){elegidosAca ? ` · ${elegidosAca} elegido${elegidosAca > 1 ? 's' : ''} a mano` : ''}</summary>
      <small className="nota-cruces">Metros desde la punta {punta}. Tocá un punto del 3D para ver ese cruce.</small>
      <ul>
        {lista.map((c) => {
          const elegido = elegidos[c.clave];
          const opcion = aOpcion(elegido, base);
          const [texto, clase] = RESULTADO[c.resultado] ?? [c.resultado, ''];
          const tipo = NOMBRE_TIPO_PIEZA[c.tipoOtra] ?? c.tipoOtra;
          const mismas = lista.filter((x) => x.tipoOtra === c.tipoOtra);
          const hayCorte = c.resultado === 'se corta' || seCortaLaOtra(c);
          return (
            <li key={c.clave} ref={c.clave === activo ? filaActiva : null} className={c.clave === activo ? 'activo' : ''}>
              <div className="fila-cruce">
                <span>con <strong>{tipo}</strong> a {metros(c.en)} m <small>({c.otra})</small></span>
                <span className={`chip-cruce ${clase}`}>{texto}</span>
              </div>
              <div className="fila-cruce">
                <select aria-label={`Qué pasa en el cruce con ${tipo} a ${metros(c.en)} m`} value={opcion}
                  onChange={(e) => onCambiar({ [c.clave]: deOpcion(e.target.value, base, c.otra) })}>
                  {OPCIONES_DE_CRUCE.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
                </select>
                {hayCorte && elegido?.forma !== 'debajo' && (
                  <select aria-label={`Cómo se une en el cruce con ${tipo} a ${metros(c.en)} m`} value={elegido?.union ?? ''}
                    onChange={(e) => onCambiar({ [c.clave]: { union: e.target.value || null } })}>
                    <option value="">Unión: como la pieza</option>
                    {FORMAS_DE_UNION.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
                  </select>
                )}
                {mismas.length > 1 && (
                  <button type="button" className="btn-mini" title={`Lo mismo en sus ${mismas.length} cruces con ${tipo}`}
                    onClick={() => onCambiar(Object.fromEntries(mismas.map((x) => [x.clave, deOpcion(opcion, base, x.otra)])))}>
                    a todas ({mismas.length})
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </details>
  );
}
