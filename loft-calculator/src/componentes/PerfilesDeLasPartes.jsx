// ==========================================================
// PerfilesDeLasPartes (v1.83): qué perfil lleva cada parte del piso
// ----------------------------------------------------------
// Pedido de Leandro (23/11): "mejorá cómo edito los elementos de los pisos,
// cuáles son de qué perfil. Recordá que solo trabajo con dos materiales:
// 80 x 80 y 80 x 40". Antes eran desplegables mezclados con el resto de los
// campos, con el nombre largo cortado ("Caño 80×80×2.0 · 6 m · $ 97.4…").
// Ahora, una fila por parte (borde, tirantes, transversales…) con cuántas
// piezas y metros lleva, y un botón por cada perfil de trabajo (los que ya
// usa la estructura: 80×80 y 80×40). "Otro…" para cualquier otro de la lista.
// ==========================================================

import { nombrePerfil } from '../motor/perfiles.js';
import { abreviarPerfil } from '../motor/coloresPerfil.js';
import { INSUMO_DE_TIPO } from '../motor/piezasAgregadas.js';

/** "Caño estructural 80×80×2.0" → "80×80"; "Perfil C 80×40×15×1.6" → "C 80×40" (v1.88: el texto lo abrevia el motor). */
export function nombreCorto(perfil) {
  return abreviarPerfil(nombrePerfil(perfil));
}

/**
 * @param filas      [{ id: INSUMO del uso, nombre: 'Borde', ayuda?: 'el contorno del piso' }]
 * @param catalogo   catálogo resuelto (cada uso con su perfilId)
 * @param perfiles   la lista de perfiles (categoría 'hierro')
 * @param deTrabajo  ids de los perfiles con botón propio (los que ya usa la estructura)
 * @param items      renglones del presupuesto (para contar piezas y metros de cada uso)
 * @param onElegir   (idUso, idPerfil)
 */
export default function PerfilesDeLasPartes({ titulo = 'Qué perfil lleva cada parte', filas, catalogo, perfiles, deTrabajo, items = [], piezas: todas = [], onElegir, onVolverAlDeLaParte = null }) {
  const porId = new Map(perfiles.map((p) => [p.id, p]));
  const botones = deTrabajo.map((id) => porId.get(id)).filter(Boolean);
  return (
    <div className="perfiles-partes">
      <h4 className="subtitulo-pared">{titulo}</h4>
      {filas.map((f) => {
        const elegido = catalogo.find((i) => i.id === f.id)?.perfilId ?? '';
        // El renglón del uso y los que se separan por pared con otro perfil ("bordePiso@perfil-3").
        const piezas = items.filter((i) => i.id === f.id || String(i.id).startsWith(`${f.id}@`)).flatMap((i) => i.largosPiezas ?? []);
        const metros = piezas.reduce((a, l) => a + l, 0);
        const esOtro = elegido && !botones.some((p) => p.id === elegido);
        // Las piezas de esta parte con otro perfil elegido a mano (en el 3D, pieza por pieza): no siguen a la fila.
        const aMano = todas.filter((p) => INSUMO_DE_TIPO[p.tipo] === f.id && ((p.insumo && p.insumo !== f.id) || p.ladoPared === 'editada a mano'));
        const conQue = [...new Set(aMano.map((p) => (p.insumo ? catalogo.find((i) => i.id === p.insumo)?.nombre : null)
          ?? nombrePerfil(perfiles.find((x) => x.id === p.perfilPared)) ?? 'otro'))].join(', ');
        return (
          <div key={f.id} className="fila-perfil-parte">
            <div className="nombre-parte">
              <strong>{f.nombre}</strong>
              <small>{piezas.length > 0 ? `${piezas.length} pieza${piezas.length === 1 ? '' : 's'} · ${metros.toFixed(1).replace('.', ',')} m` : 'no lleva'}{f.ayuda ? ` · ${f.ayuda}` : ''}</small>
            </div>
            <div className="botones-perfil" role="group" aria-label={`Perfil de ${f.nombre}`}>
              {botones.map((p) => (
                <button key={p.id} type="button" className={`btn-perfil${elegido === p.id ? ' activo' : ''}`} aria-pressed={elegido === p.id}
                  title={nombrePerfil(p)} onClick={() => onElegir(f.id, p.id)}>{nombreCorto(p)}</button>
              ))}
              <select className={`otro-perfil${esOtro ? ' activo' : ''}`} value={esOtro ? elegido : ''} aria-label={`Otro perfil para ${f.nombre}`}
                onChange={(e) => e.target.value && onElegir(f.id, e.target.value)}>
                <option value="">{esOtro ? '' : 'otro…'}</option>
                {perfiles.map((p) => <option key={p.id} value={p.id}>{nombrePerfil(p)}</option>)}
              </select>
            </div>
            {aMano.length > 0 && (
              <p className="aviso-a-mano">
                ⚠ {aMano.length} pieza{aMano.length === 1 ? '' : 's'} de esta parte tiene{aMano.length === 1 ? '' : 'n'} otro perfil elegido a mano ({conQue}):
                no cambia{aMano.length === 1 ? '' : 'n'} con estos botones.
                {onVolverAlDeLaParte && <> <button type="button" className="btn-mini" onClick={() => onVolverAlDeLaParte(aMano.map((p) => p.id))}>
                  Pasarla{aMano.length === 1 ? '' : 's'} al de esta fila</button></>}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
