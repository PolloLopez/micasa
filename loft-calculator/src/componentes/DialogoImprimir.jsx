// ==========================================================
// DialogoImprimir (v1.28): qué sale en el PDF o en el Excel
// ----------------------------------------------------------
// Un solo lugar para imprimir y exportar: casillas para cada parte y dos
// botones (Imprimir / PDF y Excel). Lo elegido se recuerda en el navegador.
// Usa <dialog> como los otros diálogos (Esc o clic afuera cierran).
// ==========================================================

import { useEffect, useRef } from 'react';

/** Las partes, agrupadas como se ven en la ventana. `soloPdf`: no existen en el Excel. */
const GRUPOS = [
  {
    titulo: '3D', partes: [
      ['vista3D', 'Vista actual (con lo resaltado y lo seleccionado)', true],
      ['vistasFijas', 'Vistas fijas: frente, lateral y desde arriba', true],
      ['cotas', 'Cotas generales (largo, ancho y altos)', true],
      ['medidas', 'Medidas fijadas con 📏'],
    ],
  },
  { titulo: 'Datos', partes: [['resumen', 'Datos de la obra'], ['presupuesto', 'Presupuesto'], ['cortes', 'Cómo cortar cada barra']] },
  { titulo: 'Planos', partes: [['paredes', 'Paredes acotadas (las 4 juntas)'], ['plantas', 'Piso, entrepiso y techo']] },
  { titulo: 'Además', partes: [['formularios', 'Todos los formularios (como antes: muchas hojas)', true]] },
];

export default function DialogoImprimir({ opciones, onCambiar, cantidadMedidas, esConstruccion, onImprimir, onExcel, onCerrar }) {
  const ventanaRef = useRef(null);
  useEffect(() => {
    const ventana = ventanaRef.current;
    if (ventana && !ventana.open) ventana.showModal();
  }, []);

  const algoParaPdf = Object.entries(opciones).some(([k, v]) => v && k !== 'cotas');
  const algoParaExcel = ['resumen', 'presupuesto', 'cortes', 'paredes', 'plantas', 'medidas'].some((k) => opciones[k]);
  const deshabilitada = (clave) => (clave === 'medidas' && cantidadMedidas === 0)
    || (!esConstruccion && ['paredes', 'plantas', 'cotas', 'vistasFijas'].includes(clave));

  return (
    <dialog ref={ventanaRef} className="dialogo dialogo-imprimir no-print" aria-labelledby="imprimir-titulo"
      onCancel={(e) => { e.preventDefault(); onCerrar(); }}
      onClick={(e) => e.target === ventanaRef.current && onCerrar()}>
      <h2 id="imprimir-titulo">Imprimir o exportar</h2>
      <p className="nota">Elegí qué sale. Con lo de siempre entra en 2 o 3 hojas A4.</p>
      {GRUPOS.map((g) => (
        <fieldset key={g.titulo} className="grupo-imprimir">
          <legend>{g.titulo}</legend>
          {g.partes.map(([clave, texto, soloPdf]) => (
            <label key={clave} className="casilla-opcional">
              <input type="checkbox" checked={opciones[clave] && !deshabilitada(clave)} disabled={deshabilitada(clave)}
                onChange={(e) => onCambiar({ ...opciones, [clave]: e.target.checked })} />
              {texto}
              {clave === 'medidas' && ` (${cantidadMedidas})`}
              {soloPdf && <small className="solo-pdf"> · solo PDF</small>}
            </label>
          ))}
        </fieldset>
      ))}
      <div className="dialogo-botones">
        <button type="button" className="btn-sec" onClick={onCerrar}>Cancelar</button>
        <button type="button" className="btn-sec" onClick={onExcel} disabled={!algoParaExcel}>Excel</button>
        <button type="button" className="btn-print" onClick={onImprimir} disabled={!algoParaPdf} autoFocus>Imprimir / PDF</button>
      </div>
    </dialog>
  );
}
