// ==========================================================
// Ayuda (v1.19): primeros pasos y atajos de teclado
// ----------------------------------------------------------
// Se abre con el botón "?" del encabezado (o la tecla ?), y sola la
// primera vez que alguien entra a la app (bienvenida).
// Usa <dialog> como los diálogos propios: Esc o clic afuera cierran.
// ==========================================================

import { useEffect, useRef } from 'react';

/** Atajos: [teclas, qué hacen]. Si se agrega uno en la app, sumarlo acá. */
const ATAJOS = [
  ['Ctrl + Z', 'Deshacer el último cambio (medidas, paredes, aberturas, materiales y precios)'],
  ['Ctrl + Y  ·  Ctrl + Shift + Z', 'Rehacer lo que deshiciste'],
  ['Ctrl + C  /  Ctrl + V', 'Copiar y pegar la abertura o el hierro seleccionado en el 3D (aparece al lado)'],
  ['Esc', 'Soltar la selección o el resaltado (👁) del 3D, cerrar una ventana o, en un campo con error, volver al último valor válido'],
  ['←  /  →', 'Pasar de una pestaña a otra (con el foco en las pestañas)'],
  ['?', 'Abrir esta ayuda'],
];

/** Los 3 pasos para armar un presupuesto (también es la bienvenida). */
const PASOS = [
  ['Estructura', 'Medidas de la planta y la altura, pisos, entrepiso, escalera y techo.'],
  ['Paredes y aberturas', 'En cada pared: columnas, fajas, montantes, revestimiento y sus puertas y ventanas.'],
  ['Materiales y Presupuesto', 'Perfiles, largo de barra y precios; el total y la lista de cortes salen solos. Después, "Guardar".'],
];

export default function Ayuda({ primeraVez, onCerrar }) {
  const ventanaRef = useRef(null);

  useEffect(() => {
    const ventana = ventanaRef.current;
    if (ventana && !ventana.open) ventana.showModal();
    // Foco en el botón sin bajar el scroll (con autoFocus, en el celular arrancaba mostrando el final).
    ventana?.querySelector('.dialogo-botones button')?.focus({ preventScroll: true });
    if (ventana) ventana.scrollTop = 0;
  }, []);

  return (
    <dialog ref={ventanaRef} className="dialogo dialogo-ayuda no-print" aria-labelledby="ayuda-titulo"
      onCancel={(e) => { e.preventDefault(); onCerrar(); }}
      onClick={(e) => e.target === ventanaRef.current && onCerrar()}>
      <h2 id="ayuda-titulo">{primeraVez ? '🐤 Bienvenido a Pollo Calculator' : 'Ayuda'}</h2>
      {primeraVez && (
        <p>Calcula hierros, cortes y presupuesto de una estructura. Ya hay un loft de ejemplo cargado para que
          pruebes: cambiá cualquier medida y mirá cómo se actualiza el 3D y el total.</p>
      )}

      <h3>Primeros pasos</h3>
      <ol className="pasos-ayuda">
        {PASOS.map(([titulo, texto]) => (
          <li key={titulo}><strong>{titulo}</strong>: {texto}</li>
        ))}
      </ol>

      {/* En el celular no hay teclado físico: los atajos no se muestran. */}
      <div className="solo-escritorio">
      <h3>Atajos de teclado</h3>
      <dl className="atajos">
        {ATAJOS.map(([teclas, que]) => (
          <div key={teclas}>
            <dt><kbd>{teclas}</kbd></dt>
            <dd>{que}</dd>
          </div>
        ))}
      </dl>
      </div>
      <p className="nota">En el 3D: arrastrá para girar, rueda (o dos dedos) para el zoom y tocá un hierro o una
        abertura para editarlo. "Medir" toma la distancia entre dos puntos.</p>

      <div className="dialogo-botones">
        <button type="button" className="btn-print" onClick={onCerrar}>
          {primeraVez ? 'Empezar' : 'Cerrar'}
        </button>
      </div>
    </dialog>
  );
}
