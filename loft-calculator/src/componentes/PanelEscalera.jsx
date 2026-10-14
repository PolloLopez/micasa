// ==========================================================
// PanelEscalera: datos de la escalera y su resumen (cantidad y
// medida de escalones, regla de comodidad, avisos).
// Cada cambio se valida en App (cambiar) igual que el resto.
// ==========================================================

import { useId, useState } from 'react';
import CampoNumero from './CampoNumero.jsx';
import SelectorLado from './SelectorLado.jsx';

/** Select simple con etiqueta y mensaje de error. */
function CampoOpciones({ etiqueta, valor, opciones, onCambio }) {
  const id = useId();
  const [error, setError] = useState(null);
  return (
    <div className={`group${error ? ' con-error' : ''}`}>
      <label htmlFor={id}>{etiqueta}</label>
      <select id={id} value={String(valor)} onChange={(e) => setError(onCambio(e.target.value))}>
        {opciones.map(([v, texto]) => <option key={v} value={v}>{texto}</option>)}
      </select>
      {error && <small className="error" role="alert">{error}</small>}
    </div>
  );
}

const cm = (m) => `${(m * 100).toFixed(1)} cm`;

export default function PanelEscalera({ params, resumen, unidad, cambiar, cambiarEscalera }) {
  const esc = params.escalera;
  const [errorActiva, setErrorActiva] = useState(null);
  const medida = (campo, etiqueta) => (
    <CampoNumero key={campo} etiqueta={etiqueta} unidad={unidad} valor={esc[campo]} onCambio={cambiar(`escalera.${campo}`)} />
  );
  const entero = (campo, etiqueta) => (
    <CampoNumero key={campo} etiqueta={etiqueta} sufijo="u" decimales={0} valor={esc[campo]} onCambio={cambiar(`escalera.${campo}`)} />
  );

  // Cambiar el tipo de apoyo también pone valores típicos (después se editan).
  const cambiarTipoApoyo = (tipo) =>
    cambiarEscalera(tipo === 'cano'
      ? { tipoApoyo: 'cano', apoyosPorEscalon: 1, largoApoyo: 0.3 }
      : { tipoApoyo: 'angulos', apoyosPorEscalon: 2, largoApoyo: Number((esc.ancho - 0.04).toFixed(2)) });

  return (
    <section className="card">
      <h2>Escalera</h2>
      <label className="capa">
        <input type="checkbox" checked={esc.activa} aria-label="Lleva escalera"
          onChange={(e) => setErrorActiva(cambiar('escalera.activa')(e.target.checked))} />
        Lleva escalera (llega al borde del entrepiso)
      </label>
      {errorActiva && <p className="error" role="alert">{errorActiva}</p>}

      {esc.activa && (
        <>
          <h3 className="subtitulo">Ubicación y forma</h3>
          <div className="grid-params">
            <CampoOpciones etiqueta="Forma" valor={esc.forma} onCambio={cambiar('escalera.forma')}
              opciones={[['recta', 'Recta'], ['L', 'En L (con descanso)']]} />
            <SelectorLado etiqueta="Baja hacia" valor={esc.bajaHacia} params={params} onCambio={cambiar('escalera.bajaHacia')} />
            {medida('posicion', 'Posición sobre el borde')}
            {esc.forma === 'L' && entero('escalonesHastaDescanso', 'Contrahuellas hasta el descanso')}
            {esc.forma === 'L' && (
              <SelectorLado etiqueta="2º tramo baja hacia" valor={esc.giroHacia} params={params} onCambio={cambiar('escalera.giroHacia')} />
            )}
          </div>

          <h3 className="subtitulo">Medidas</h3>
          <div className="grid-params">
            {medida('ancho', 'Ancho')}
            {medida('huella', 'Huella (profundidad)')}
            {medida('contrahuellaObjetivo', 'Contrahuella objetivo')}
            {medida('alturaTotal', 'Altura total (0 = automática)')}
          </div>

          <h3 className="subtitulo">Estructura</h3>
          <div className="grid-params">
            <CampoOpciones etiqueta="Apoyo de escalón" valor={esc.tipoApoyo} onCambio={cambiarTipoApoyo}
              opciones={[['angulos', 'Ángulos'], ['cano', 'Recorte de caño central']]} />
            {entero('apoyosPorEscalon', 'Apoyos por escalón')}
            {medida('largoApoyo', 'Largo de cada apoyo')}
            {entero('apoyosIntermedios', 'Columnas bajo la zanca (por tramo)')}
            {esc.forma === 'L' && (
              <CampoOpciones etiqueta="Columnas del descanso" valor={esc.columnasDescanso}
                onCambio={(v) => cambiar('escalera.columnasDescanso')(Number(v))}
                opciones={[['1', '1 (central)'], ['2', '2 (lado de afuera)'], ['4', '4 (esquinas)']]} />
            )}
          </div>

          {resumen && (
            <div className="resumen-escalera" role="status">
              <strong>{resumen.contrahuellas} contrahuellas de {cm(resumen.contrahuella)}</strong>
              {' · '}{resumen.pisadas} pisadas de {cm(resumen.huella)}
              {' · '}altura {resumen.alturaTotal.toFixed(2)} m
              <br />
              2 contrahuellas + huella = {cm(resumen.blondel)}{' '}
              {resumen.avisos.length === 0 ? <span className="ok">✓ cómoda y entra en la planta</span> : null}
              {resumen.avisos.map((a) => <p key={a} className="error">{a}</p>)}
            </div>
          )}
          <p className="nota">
            Zanca central por tramo. Los escalones son de madera y van sobre los apoyos. La baranda y el hueco
            en el entrepiso quedan para una próxima versión.
          </p>
        </>
      )}
    </section>
  );
}
