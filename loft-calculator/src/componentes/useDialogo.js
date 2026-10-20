// ==========================================================
// useDialogo (v1.19): abre los diálogos propios de Dialogo.jsx y
// devuelve la respuesta como promesa. Ver el ejemplo en Dialogo.jsx.
// (Va en un archivo aparte porque Vite recarga en caliente mejor los
// archivos que exportan solo componentes.)
// ==========================================================

import { createElement, useCallback, useState } from 'react';
import Dialogo from './Dialogo.jsx';

/** Hook (función de React que guarda estado): da el diálogo para dibujar y las funciones para abrirlo. */
export function useDialogo() {
  const [pedido, setPedido] = useState(null);

  // Abre la ventana y devuelve una promesa que se cumple cuando el usuario responde.
  const abrir = useCallback((datos) => new Promise((resolver) => setPedido({ ...datos, resolver })), []);

  const confirmar = useCallback((datos) => abrir({ ...datos, tipo: 'confirmar' }), [abrir]);
  const pedirTexto = useCallback((datos) => abrir({ ...datos, tipo: 'texto' }), [abrir]);
  const mostrarTexto = useCallback((datos) => abrir({ aceptar: 'Listo', ...datos, tipo: 'mostrar' }), [abrir]);

  const responder = (respuesta) => {
    pedido?.resolver(respuesta);
    setPedido(null);
  };

  // `key` nueva por pedido: cada diálogo arranca con su propio texto.
  const dialogo = pedido && createElement(Dialogo, { key: pedido.titulo + (pedido.valorInicial ?? ''), pedido, onResponder: responder });
  return { dialogo, confirmar, pedirTexto, mostrarTexto };
}

/** ¿Hay un diálogo abierto? (para que los atajos de teclado globales no actúen debajo). */
export const hayDialogoAbierto = () => Boolean(document.querySelector('dialog.dialogo[open]'));
