// ==========================================================
// NotaPlegable (v1.79): las notas de ayuda, en una sola línea
// ----------------------------------------------------------
// Pedido de Leandro (notas de ayuda más cortas): cada nota gris de las tarjetas
// muestra solo su primera línea; si es larga, al lado va "más ▾" y al tocarlo
// se ve entera. Las cortas se ven igual que siempre (sin botón).
// Al imprimir salen enteras (ver @media print en App.css).
// ==========================================================

import { useEffect, useRef, useState } from 'react';

// A partir de cuántas letras la nota se pliega (en el panel entran ~65 por línea).
const LARGO_PARA_PLEGAR = 70;

export default function NotaPlegable({ children }) {
  const [abierta, setAbierta] = useState(false);
  const [esLarga, setEsLarga] = useState(false);
  const texto = useRef(null);

  // Se mide el texto ya dibujado (textContent anda aunque la sub-pestaña esté escondida).
  useEffect(() => {
    setEsLarga((texto.current?.textContent ?? '').trim().length > LARGO_PARA_PLEGAR);
  }, [children]);

  const plegada = esLarga && !abierta;
  return (
    <p className={`nota nota-plegable${plegada ? ' plegada' : ''}`}>
      <span ref={texto} className="texto-nota">{children}</span>
      {esLarga && (
        <button type="button" className="mas-nota no-print" aria-expanded={abierta}
          onClick={() => setAbierta(!abierta)}>{abierta ? 'menos ▴' : 'más ▾'}</button>
      )}
    </p>
  );
}
