// ==========================================================
// SelectorPerfil (v1.21): desplegable para que un uso (Columnas,
// Zanca, Caño de parantes…) elija un perfil de la lista de perfiles.
// ==========================================================

import { useId } from 'react';
import { nombrePerfil } from '../motor/perfiles.js';

const pesos = (n) => n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

// v1.74.1: el texto de cada perfil se arma una vez por objeto (WeakMap: se olvida solo cuando el perfil ya no se usa).
// Hay ~40 desplegables con ~10 perfiles cada uno: armar los nombres en cada dibujo era lo más lento del panel.
const textos = new WeakMap();
function textoDePerfil(p) {
  let texto = textos.get(p);
  if (texto === undefined) {
    // "Caño estructural" se acorta a "Caño" para que entre en el desplegable.
    texto = `${(nombrePerfil(p) || 'Perfil sin nombre').replace('Caño estructural ', 'Caño ')} · ${p.largoBarra} m · ${pesos(p.precio)}`;
    textos.set(p, texto);
  }
  return texto;
}

/** Desplegable para elegir un perfil de la lista. `valor` = id del perfil (o null). */
/**
 * @param opcionGeneral  texto de la opción vacía ('' = usar el general), ej. "General: Caño 100x100x1.6".
 *                       Sin ella, '' se muestra como "— Elegí un perfil —".
 */
export default function SelectorPerfil({ etiqueta, valor, perfiles, onElegir, conEtiqueta = true, opcionGeneral = null }) {
  const id = useId();
  const existe = perfiles.some((p) => p.id === valor);
  return (
    <div className="group">
      {conEtiqueta && <label htmlFor={id}>{etiqueta}</label>}
      <select id={id} value={existe ? valor : ''} aria-label={conEtiqueta ? undefined : etiqueta}
        onChange={(e) => onElegir(e.target.value || null)}>
        {opcionGeneral !== null ? <option value="">{opcionGeneral}</option> : !existe && <option value="">— Elegí un perfil —</option>}
        {perfiles.map((p) => <option key={p.id} value={p.id}>{textoDePerfil(p)}</option>)}
      </select>
    </div>
  );
}

