// ==========================================================
// FOCO DESDE EL 3D (v1.42.1)
// ----------------------------------------------------------
// Al elegir algo en el 3D (un hierro, una abertura, un mueble), su tarjeta
// se abre en la pestaña donde se edita, se ve en pantalla y, si es una mesada,
// un tabique o un mueble, también se abre su ficha. Al soltarlo (clic afuera o
// en otra cosa), todo vuelve a como estaba: lo que estaba cerrado se cierra.
//   foco = { pestana, tarjeta, item } (item ej. 'mesada:1', 'pared:B', 'mueble:3')
// ==========================================================

import { createContext, useContext, useEffect, useRef } from 'react';

export const ContextoFoco = createContext(null);

/** ¿Esta tarjeta (o ficha) está en foco? Y, si recién entró, la trae a la vista. */
export function useEnFoco({ tarjeta = null, item = null }) {
  const foco = useContext(ContextoFoco);
  const ref = useRef(null);
  const enFoco = Boolean(foco && ((item && foco.item === item) || (!item && tarjeta && foco.tarjeta === tarjeta)));
  // La ficha (item) es la que se lleva a la vista; si no hay ficha, la tarjeta.
  const traer = enFoco && (item || !foco.item);
  useEffect(() => {
    if (traer) ref.current?.scrollIntoView?.({ block: 'start', behavior: 'smooth' });
  }, [traer, foco]);
  return { enFoco, ref };
}

/**
 * Pestaña, tarjeta y ficha que corresponden a lo elegido en el 3D.
 * @param elegido { pieza } | { abertura } | { mueble } | null
 */
export function focoDe(elegido) {
  if (!elegido) return null;
  if (elegido.mueble) return { pestana: 'paredes', tarjeta: 'muebles', item: `mueble:${elegido.mueble}` };
  if (elegido.abertura) return { pestana: 'paredes', tarjeta: 'paredes', item: `pared:${elegido.abertura.lado}` };
  const p = elegido.pieza;
  if (!p) return null;
  if (p.tipo === 'mesada') return { pestana: 'paredes', tarjeta: 'mesadas', item: `mesada:${p.mesada ?? p.id.split(':')[1]}` };
  if (p.tipo === 'tabique') return { pestana: 'paredes', tarjeta: 'tabiques', item: `tabique:${p.tabique ?? p.id.split(':')[1]}` };
  const grupos = p.grupos ?? [];
  if (grupos.includes('escalera')) return { pestana: 'estructura', tarjeta: 'escalera', item: null };
  if (grupos.includes('techo')) return { pestana: 'estructura', tarjeta: 'techo', item: null };
  if (grupos.includes('piso') || grupos.includes('piso2')) return { pestana: 'estructura', tarjeta: 'pisos', item: null };
  const lado = ['A', 'B', 'C', 'D'].find((l) => grupos.includes(l));
  if (lado) return { pestana: 'paredes', tarjeta: 'paredes', item: `pared:${lado}` };
  if (grupos.includes('grada')) return { pestana: 'estructura', tarjeta: 'grada', item: null };
  if (grupos.includes('montaje')) return { pestana: 'estructura', tarjeta: 'montaje', item: null };
  return null;
}
