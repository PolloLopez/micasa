// ==========================================================
// Diálogos propios (v1.19): reemplazan window.confirm / window.prompt
// ----------------------------------------------------------
// Los cuadros del navegador son grises, no dicen bien qué se borra y
// congelan el 3D mientras están abiertos. Estos usan <dialog> (el
// elemento de HTML para ventanas modales: bloquea lo de atrás, Esc
// cierra y el foco queda adentro) con el estilo de la app.
//
// Se usan con promesas (Promise: un valor que llega más tarde), así el
// código que los llama se lee igual que con window.confirm:
//
//   const { dialogo, confirmar, pedirTexto, mostrarTexto } = useDialogo();  // (useDialogo.js)
//   if (!(await confirmar({ titulo: '¿Borrar?', mensaje: '…', aceptar: 'Borrar', peligro: true }))) return;
//   const nombre = await pedirTexto({ titulo: 'Guardar como', valorInicial: 'Loft' }); // null si cancela
//   ...
//   return <>{…}{dialogo}</>;   // el diálogo se dibuja donde se ponga {dialogo}
// ==========================================================

import { useEffect, useRef, useState } from 'react';

/** La ventana en sí. `pedido.tipo`: 'confirmar' | 'texto' | 'mostrar'. */
export default function Dialogo({ pedido, onResponder }) {
  const ventanaRef = useRef(null);
  const [texto, setTexto] = useState(pedido.valorInicial ?? '');
  // Lo que devuelve si se cancela (Esc, clic afuera o "Cancelar").
  const respuestaCancelar = pedido.tipo === 'confirmar' ? false : null;

  // showModal() la abre como modal (con fondo oscuro y foco adentro).
  useEffect(() => {
    const ventana = ventanaRef.current;
    if (ventana && !ventana.open) ventana.showModal();
    // Para 'texto' y 'mostrar': el texto ya seleccionado, listo para escribir encima o copiar.
    ventana?.querySelector('input')?.select();
  }, []);

  const alEnviar = (e) => {
    e.preventDefault();
    if (pedido.tipo === 'confirmar') onResponder(true);
    else if (pedido.tipo === 'texto') onResponder(texto);
    else onResponder(null);
  };

  return (
    <dialog ref={ventanaRef} className="dialogo no-print" aria-labelledby="dialogo-titulo"
      // Esc: el navegador dispara "cancel"; lo manejamos nosotros para avisar la respuesta.
      onCancel={(e) => { e.preventDefault(); onResponder(respuestaCancelar); }}
      // Clic en el fondo oscuro (fuera de la caja) = cancelar.
      onClick={(e) => e.target === ventanaRef.current && onResponder(respuestaCancelar)}>
      <form onSubmit={alEnviar}>
        <h2 id="dialogo-titulo">{pedido.titulo}</h2>
        {pedido.mensaje && <p>{pedido.mensaje}</p>}
        {pedido.tipo !== 'confirmar' && (
          <input type="text" value={texto} readOnly={pedido.tipo === 'mostrar'}
            aria-label={pedido.etiqueta ?? pedido.titulo} maxLength={pedido.largoMaximo}
            onChange={(e) => setTexto(e.target.value)} />
        )}
        <div className="dialogo-botones">
          {pedido.tipo !== 'mostrar' && (
            <button type="button" className="btn-sec" onClick={() => onResponder(respuestaCancelar)}>
              {pedido.cancelar ?? 'Cancelar'}
            </button>
          )}
          <button type="submit" className={pedido.peligro ? 'btn-peligro' : 'btn-print'} autoFocus={pedido.tipo === 'confirmar'}>
            {pedido.aceptar ?? 'Aceptar'}
          </button>
        </div>
      </form>
    </dialog>
  );
}
