// ==========================================================
// PanelGrada: datos de una grada para espectadores (proyecto de
// tipo 'grada') y su resumen: altura, profundidad, pórticos,
// capacidad estimada y avisos. Cada cambio se valida en App
// (cambiar) igual que el resto.
// ==========================================================

import { useId, useState } from 'react';
import CampoNumero from './CampoNumero.jsx';
import Tarjeta from './Tarjeta.jsx';

export default function PanelGrada({ params, resumen, unidad, cambiar }) {
  const grada = params.grada;
  const idRiostras = useId();
  const [errorRiostras, setErrorRiostras] = useState(null);
  const medida = (campo, etiqueta) => (
    <CampoNumero key={campo} etiqueta={etiqueta} unidad={unidad} valor={grada[campo]} onCambio={cambiar(`grada.${campo}`)} />
  );
  const entero = (campo, etiqueta, sufijo = 'u') => (
    <CampoNumero key={campo} etiqueta={etiqueta} sufijo={sufijo} decimales={0} valor={grada[campo]} onCambio={cambiar(`grada.${campo}`)} />
  );

  return (
    <Tarjeta id="grada" titulo="Grada para espectadores">
      <p className="nota">
        La fila 1 (la más baja) queda adelante, del lado del <strong>Frente (A)</strong>; las filas suben hacia atrás.
        Se sienta en el tablón de adelante de cada fila y se apoyan los pies en la fila de abajo.
      </p>

      <h3 className="subtitulo">Filas</h3>
      <div className="grid-params">
        {entero('filas', 'Cantidad de filas')}
        {medida('largoFila', 'Largo de cada fila')}
        {medida('huella', 'Profundidad de fila')}
        {medida('contrahuella', 'Altura de fila')}
        {medida('anchoAsiento', 'Tablón de asiento (ancho)')}
        {medida('anchoPie', 'Tablón de pie (ancho)')}
      </div>

      <h3 className="subtitulo">Estructura</h3>
      <div className="grid-params">
        {medida('separacionPorticos', 'Separación de pórticos')}
        {entero('parantesCadaFilas', 'Parantes cada (filas, 0 = sin)', 'filas')}
        {entero('vigasPorFila', 'Vigas longitudinales por fila')}
        <div className={`group${errorRiostras ? ' con-error' : ''}`}>
          <label htmlFor={idRiostras}>Riostras en cruz (atrás)</label>
          <select id={idRiostras} value={grada.riostras} onChange={(e) => setErrorRiostras(cambiar('grada.riostras')(e.target.value))}>
            <option value="no">Sin riostras</option>
            <option value="extremos">En los vanos de los extremos</option>
            <option value="todos">En todos los vanos</option>
          </select>
          {errorRiostras && <small className="error" role="alert">{errorRiostras}</small>}
        </div>
      </div>

      {resumen && (
        <div className="resumen-escalera" role="status">
          <strong>{resumen.filas} filas · {resumen.alturaTotal.toFixed(2)} m de alto · {resumen.profundidad.toFixed(2)} m de profundidad</strong>
          <br />
          {resumen.porticos} pórticos · capacidad aprox. {resumen.capacidad} personas (45 cm por persona)
          {resumen.avisos.length === 0 && <span className="ok"> ✓</span>}
          {resumen.avisos.map((a) => <p key={a} className="error">{a}</p>)}
        </div>
      )}
      <p className="nota">
        Cada pórtico lleva una zanca inclinada, un apoyo por fila y parantes en las líneas de fila. Las vigas
        longitudinales unen los pórticos y las riostras en cruz evitan que la grada se mueva de costado. La baranda
        todavía no se calcula.
      </p>
    </Tarjeta>
  );
}
