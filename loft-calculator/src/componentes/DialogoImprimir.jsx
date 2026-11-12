// ==========================================================
// DialogoImprimir (v1.28): qué sale en el PDF o en el Excel
// ----------------------------------------------------------
// Un solo lugar para imprimir y exportar: casillas para cada parte y dos
// botones (Imprimir / PDF y Excel). Lo elegido se recuerda en el navegador.
// Usa <dialog> como los otros diálogos (Esc o clic afuera cierran).
// ==========================================================

import { useEffect, useRef } from 'react';
import { SOLO_PLANOS } from '../proyecto/opcionesImpresion.js';

/** Las partes, agrupadas como se ven en la ventana. `soloPdf`: no existen en el Excel. */
const GRUPOS = [
  {
    titulo: '3D', partes: [
      ['vista3D', 'Vista actual (con lo resaltado y lo seleccionado)', true],
      ['vistasFijas', 'Vistas fijas: frente, lateral y desde arriba', true],
      ['vistasPartes', 'Por partes: cada piso desde arriba y el adentro desde cada lado (sin esa pared)', true],
      ['cotas', 'Cotas generales (largo, ancho y altos)', true],
      ['medidas', 'Medidas fijadas con 📏'],
    ],
  },
  { titulo: 'Datos', partes: [['resumen', 'Datos de la obra'], ['presupuesto', 'Presupuesto'], ['cortes', 'Cómo cortar cada barra'],
    ['seguimiento', 'Seguimiento de la obra: contratado, pagado y lo que falta (pestaña Obra)']] },
  { titulo: 'Planos', partes: [['paredes', 'Paredes acotadas (las 4 juntas)'], ['plantas', 'Piso, entrepiso y techo'],
    // v1.42: las listas que acompañan a los planos.
    ['listaCanos', 'Caños y perfiles: tipo, barras y dónde va cada uno'], ['listaAberturas', 'Aberturas: tipo, medidas y ubicación']] },
  // v1.42: qué partes de la obra van en los planos y en los caños (ej. quien cotiza los paneles exteriores solo quiere
  // las paredes con la estructura de las aberturas: sin pisos, altillo ni divisiones interiores). Las paredes van siempre.
  { titulo: 'Partes de la obra (planos y caños)', partes: [['partePisos', 'Piso de planta baja'], ['parteEntrepiso', 'Entrepiso (altillo) y escalera'],
    ['parteTecho', 'Techo'], ['parteInteriores', 'Divisiones interiores (tabiques y mesadas)']], nota: 'Las paredes con la estructura de las aberturas van siempre.' },
  { titulo: 'Además', partes: [['formularios', 'Todos los formularios (como antes: muchas hojas)', true]] },
];

export default function DialogoImprimir({ opciones, onCambiar, cantidadMedidas, esConstruccion, onImprimir, onExcel, onCerrar }) {
  const ventanaRef = useRef(null);
  useEffect(() => {
    const ventana = ventanaRef.current;
    if (ventana && !ventana.open) ventana.showModal();
  }, []);

  const algoParaPdf = Object.entries(opciones).some(([k, v]) => v && k !== 'cotas' && !k.startsWith('parte'));
  const algoParaExcel = ['resumen', 'presupuesto', 'cortes', 'paredes', 'plantas', 'medidas', 'listaCanos', 'listaAberturas', 'seguimiento'].some((k) => opciones[k]);
  const deshabilitada = (clave) => (clave === 'medidas' && cantidadMedidas === 0)
    || (!esConstruccion && ['paredes', 'plantas', 'cotas', 'vistasFijas', 'vistasPartes', 'listaAberturas'].includes(clave));

  return (
    <dialog ref={ventanaRef} className="dialogo dialogo-imprimir no-print" aria-labelledby="imprimir-titulo"
      onCancel={(e) => { e.preventDefault(); onCerrar(); }}
      onClick={(e) => e.target === ventanaRef.current && onCerrar()}>
      <h2 id="imprimir-titulo">Imprimir o exportar</h2>
      <p className="nota">Elegí qué sale. Con lo de siempre entra en 2 o 3 hojas A4.</p>
      {/* v1.42: atajo para sacar solo los planos (paredes, plantas, caños y aberturas). */}
      <div className="fila-casillas">
        <button type="button" className="btn-mini" onClick={() => onCambiar({ ...SOLO_PLANOS })}>Solo planos</button>
        <button type="button" className="btn-mini" title="Paredes con sus aberturas, sin pisos, altillo, techo ni divisiones"
          onClick={() => onCambiar({ ...SOLO_PLANOS, plantas: false, partePisos: false, parteEntrepiso: false, parteTecho: false, parteInteriores: false })}>
          Para quien cotiza paneles</button>
        <button type="button" className="btn-mini" onClick={() => onCambiar(Object.fromEntries(Object.keys(opciones).map((k) => [k, k !== 'formularios'])))}>Todo</button>
      </div>
      {GRUPOS.map((g) => (
        <fieldset key={g.titulo} className="grupo-imprimir">
          <legend>{g.titulo}</legend>
          {g.nota && <p className="nota">{g.nota}</p>}
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
