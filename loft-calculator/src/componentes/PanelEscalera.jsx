// ==========================================================
// PanelEscalera: datos de la escalera y su resumen (cantidad y
// medida de escalones, regla de comodidad, avisos).
// Cada cambio se valida en App (cambiar) igual que el resto.
// ==========================================================

import { useId, useState } from 'react';
import CampoNumero from './CampoNumero.jsx';
import SelectorLado from './SelectorLado.jsx';
import { DESCANSOS_POR_FORMA, calcularEscalones, repartirDescansos } from '../motor/escalera.js';
import { LADOS } from '../motor/constantes.js';
import Tarjeta from './Tarjeta.jsx';
import PlantaEscalera from './PlantaEscalera.jsx';

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

/**
 * Pared hacia la que gira el 2º tramo: tiene que ser de costado respecto de
 * `bajaHacia` (giro de 90°). Si la actual ya sirve se mantiene; si no, se
 * elige un costado, preferentemente no el del entrepiso.
 */
function giroCompatible(bajaHacia, giroActual, ladoEntrepiso) {
  const i = LADOS.indexOf(bajaHacia);
  const costados = [LADOS[(i + 1) % 4], LADOS[(i + 3) % 4]];
  if (costados.includes(giroActual)) return giroActual;
  return costados.find((l) => l !== ladoEntrepiso) ?? costados[0];
}

export default function PanelEscalera({ params, resumen, unidad, cambiar, cambiarEscalera, escalera, entrepiso }) {
  const esc = params.escalera;
  const [errorActiva, setErrorActiva] = useState(null);
  const medida = (campo, etiqueta) => (
    <CampoNumero key={campo} etiqueta={etiqueta} unidad={unidad} valor={esc[campo]} onCambio={cambiar(`escalera.${campo}`)} />
  );
  const entero = (campo, etiqueta) => (
    <CampoNumero key={campo} etiqueta={etiqueta} sufijo="u" decimales={0} valor={esc[campo]} onCambio={cambiar(`escalera.${campo}`)} />
  );

  const cantidadDescansos = DESCANSOS_POR_FORMA[esc.forma] ?? 0;

  // Cambiar la forma reparte los descansos parejo (después se editan uno por uno).
  const cambiarForma = (forma) => {
    const { contrahuellas } = calcularEscalones(esc);
    const k = DESCANSOS_POR_FORMA[forma];
    const descansos = k === 0 ? esc.descansos : repartirDescansos(k, contrahuellas);
    return cambiarEscalera({ forma, descansos, giroHacia: giroCompatible(esc.bajaHacia, esc.giroHacia, params.ladoEntrepiso) });
  };

  // Cambiar hacia dónde baja también acomoda el giro (si no, quedaría un giro imposible).
  const cambiarBajaHacia = (bajaHacia) =>
    cambiarEscalera({ bajaHacia, giroHacia: giroCompatible(bajaHacia, esc.giroHacia, params.ladoEntrepiso) });

  // Cambiar el tipo de apoyo también pone valores típicos (después se editan).
  const cambiarTipoApoyo = (tipo) =>
    cambiarEscalera(tipo === 'cano'
      ? { tipoApoyo: 'cano', apoyosPorEscalon: 1, largoApoyo: 0.3 }
      : { tipoApoyo: 'angulos', apoyosPorEscalon: 2, largoApoyo: Number((esc.ancho - 0.04).toFixed(2)) });

  return (
    <Tarjeta id="escalera" titulo="Escalera">
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
            <CampoOpciones etiqueta="Forma" valor={esc.forma} onCambio={cambiarForma}
              opciones={[['recta', 'Recta'], ['L', 'En L (1 descanso)'], ['U', 'En U (2 descansos)'], ['3/4', '3/4 de vuelta (3 descansos)']]} />
            <SelectorLado etiqueta="Baja hacia (lado del escalón 1)" valor={esc.bajaHacia} params={params} onCambio={cambiarBajaHacia} />
            {medida('posicion', 'Posición sobre el borde')}
            {cantidadDescansos > 0 && (
              <SelectorLado etiqueta="2º tramo baja hacia" valor={esc.giroHacia} params={params} onCambio={cambiar('escalera.giroHacia')} />
            )}
            {/* Un campo por descanso: en qué contrahuella va, contando desde el piso. */}
            {esc.descansos.slice(0, cantidadDescansos).map((m, i) => (
              <CampoNumero key={`descanso-${i}`} etiqueta={cantidadDescansos === 1 ? 'Contrahuellas hasta el descanso' : `Descanso ${i + 1}: en la contrahuella`}
                sufijo="nº" decimales={0} valor={m} onCambio={cambiar(`escalera.descansos.${i}`)} />
            ))}
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
            {entero('apoyosIntermedios', 'Parantes bajo la zanca (por tramo)')}
            <label className="capa casilla-campo">
              <input type="checkbox" checked={esc.riostras} aria-label="Riostras en cruz entre parantes"
                onChange={(e) => cambiar('escalera.riostras')(e.target.checked)} />
              Riostras en cruz entre parantes
            </label>
            {cantidadDescansos > 0 && (
              <CampoOpciones etiqueta={cantidadDescansos === 1 ? 'Columnas del descanso' : 'Columnas de cada descanso'} valor={esc.columnasDescanso}
                onCambio={(v) => cambiar('escalera.columnasDescanso')(Number(v))}
                opciones={[['1', '1 (central)'], ['2', '2 (lado de afuera)'], ['4', '4 (esquinas)']]} />
            )}
          </div>

          {/* Planta vista desde arriba (v1.16): escalón 1 (arranque) y el último (llega al entrepiso). */}
          <PlantaEscalera params={params} escalera={escalera} entrepiso={entrepiso} />

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
            Zanca central por tramo. Los escalones son de madera y van sobre los apoyos. Con varios descansos,
            cada giro es de 90° para el mismo lado (como un caracol) y cada descanso es un cuadrado plano del
            ancho de la escalera. La baranda y el hueco en el entrepiso quedan para una próxima versión.
          </p>
        </>
      )}
    </Tarjeta>
  );
}
