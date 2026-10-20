// ==========================================================
// SelectorPerfil (v1.21): desplegable para que un uso (Columnas,
// Zanca, Caño de parantes…) elija un perfil de la lista de perfiles.
// ==========================================================

import { useId } from 'react';
import { nombrePerfil } from '../motor/perfiles.js';

const pesos = (n) => n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

/** Desplegable para elegir un perfil de la lista. `valor` = id del perfil (o null). */
export default function SelectorPerfil({ etiqueta, valor, perfiles, onElegir, conEtiqueta = true }) {
  const id = useId();
  const existe = perfiles.some((p) => p.id === valor);
  return (
    <div className="group">
      {conEtiqueta && <label htmlFor={id}>{etiqueta}</label>}
      <select id={id} value={existe ? valor : ''} aria-label={conEtiqueta ? undefined : etiqueta}
        onChange={(e) => onElegir(e.target.value || null)}>
        {!existe && <option value="">— Elegí un perfil —</option>}
        {perfiles.map((p) => (
          <option key={p.id} value={p.id}>{nombrePerfil(p) || 'Perfil sin nombre'} · barra {p.largoBarra} m · {pesos(p.precio)}</option>
        ))}
      </select>
    </div>
  );
}

