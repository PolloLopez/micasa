// ==========================================================
// SelectorPerfil (v1.21): desplegable para que un uso (Columnas,
// Zanca, Caño de parantes…) elija un perfil de la lista de perfiles.
// ==========================================================

import { useId } from 'react';
import { nombrePerfil } from '../motor/perfiles.js';

const pesos = (n) => n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

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
        {perfiles.map((p) => (
          // "Caño estructural" se acorta a "Caño" para que entre en el desplegable.
          <option key={p.id} value={p.id}>
            {(nombrePerfil(p) || 'Perfil sin nombre').replace('Caño estructural ', 'Caño ')} · {p.largoBarra} m · {pesos(p.precio)}
          </option>
        ))}
      </select>
    </div>
  );
}

