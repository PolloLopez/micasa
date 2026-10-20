// ==========================================================
// PanelGrada: datos de una grada para espectadores (proyecto de
// tipo 'grada') y su resumen: altura, profundidad, pórticos,
// capacidad estimada y avisos. Cada cambio se valida en App
// (cambiar) igual que el resto.
// ==========================================================

import { useId, useState } from 'react';
import CampoNumero from './CampoNumero.jsx';
import CampoOpcional from './CampoOpcional.jsx';
import Tarjeta from './Tarjeta.jsx';
import { TIPOS_TABLONES } from '../motor/grada.js';
import SelectorPerfil from './SelectorPerfil.jsx';
import { perfilesDeLista } from '../motor/perfiles.js';
import { INSUMO } from '../motor/constantes.js';

/** Partes de la grada a las que se les elige el caño (cada una es un renglón del presupuesto). */
const PARTES_CANO = [
  [INSUMO.GRADA_ZANCA, 'Zancas'],
  [INSUMO.GRADA_PARANTE, 'Parantes'],
  [INSUMO.GRADA_APOYO, 'Apoyos de fila'],
  [INSUMO.GRADA_VIGA, 'Vigas longitudinales'],
  [INSUMO.GRADA_UNION, 'Uniones de parantes'],
  [INSUMO.RIOSTRA, 'Riostras'],
];

/** Casilla (sí / no) que cambia un campo de la grada. */
function Casilla({ etiqueta, valor, onCambio }) {
  return (
    <label className="capa casilla-campo">
      <input type="checkbox" checked={valor} aria-label={etiqueta} onChange={(e) => onCambio(e.target.checked)} />
      {etiqueta}
    </label>
  );
}

export default function PanelGrada({ params, resumen, unidad, cambiar, catalogo, onCambiarInsumo }) {
  const grada = params.grada;
  const idRiostras = useId();
  const idTablones = useId();
  const [errorRiostras, setErrorRiostras] = useState(null);
  const [errorTablones, setErrorTablones] = useState(null);
  const tablonUnico = grada.tipoTablones === 'unico';
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
      </div>

      <h3 className="subtitulo">Tablones</h3>
      <div className="grid-params">
        <div className={`group${errorTablones ? ' con-error' : ''}`}>
          <label htmlFor={idTablones}>Tablones</label>
          <select id={idTablones} value={grada.tipoTablones}
            onChange={(e) => setErrorTablones(cambiar('grada.tipoTablones')(e.target.value))}>
            {TIPOS_TABLONES.map(([valor, texto]) => <option key={valor} value={valor}>{texto}</option>)}
          </select>
          {errorTablones && <small className="error" role="alert">{errorTablones}</small>}
        </div>
        {/* Separados o del mismo material: asiento adelante y pie atrás. Único: N tablones iguales. */}
        {!tablonUnico && medida('anchoAsiento', 'Tablón de asiento (ancho)')}
        {!tablonUnico && medida('anchoPie', 'Tablón de pie (ancho)')}
        {tablonUnico && medida('anchoTablon', 'Ancho de cada tablón')}
        {tablonUnico && entero('tablonesPorFila', 'Tablones por fila')}
        <Casilla etiqueta="Respaldo (tabla sobre la contrahuella)" valor={grada.respaldo} onCambio={cambiar('grada.respaldo')} />
        {grada.respaldo && medida('anchoRespaldo', 'Ancho del respaldo')}
      </div>
      <p className="nota">
        {grada.tipoTablones === 'separados' && 'Asiento y pie son tablones distintos: cada uno tiene su renglón y su precio en el presupuesto.'}
        {grada.tipoTablones === 'mismoMaterial' && 'Asiento y pie son el mismo tablón: un solo renglón "Tablones de grada" con los metros sumados.'}
        {tablonUnico && 'Tablones iguales repartidos de adelante hacia atrás: sirven de asiento y de pie. Un solo renglón en el presupuesto.'}
      </p>

      <h3 className="subtitulo">Estructura</h3>
      <div className="grid-params">
        {medida('separacionPorticos', 'Separación de pórticos')}
        <CampoOpcional casilla="Lleva parantes" etiqueta="Parantes cada" sufijo="filas" decimales={0} valorPorDefecto={1}
          valor={grada.parantesCadaFilas} onCambio={cambiar('grada.parantesCadaFilas')} />
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
        <Casilla etiqueta="Unir los parantes (caño bajo)" valor={grada.unionParantes} onCambio={cambiar('grada.unionParantes')} />
        {grada.unionParantes && medida('alturaUnion', 'Altura de la unión')}
      </div>

      <h3 className="subtitulo">Caños</h3>
      <div className="grid-params">
        {/* v1.21: cada parte elige un perfil de la lista (Materiales). */}
        {PARTES_CANO.map(([id, etiqueta]) => (
          <SelectorPerfil key={id} etiqueta={etiqueta} valor={catalogo.find((i) => i.id === id)?.perfilId}
            perfiles={perfilesDeLista(catalogo)} onElegir={(perfilId) => onCambiarInsumo(id, 'perfilId', perfilId)} />
        ))}
      </div>
      <p className="nota">Los perfiles (medidas, barra y precio) se cargan en la pestaña Materiales. El elegido cambia el grosor en el 3D.</p>

      <h3 className="subtitulo">Desmontable</h3>
      <div className="grid-params">
        {entero('modulos', 'Módulos a lo largo (1 = una pieza)')}
        <Casilla etiqueta="Filas atornillables" valor={grada.filasAtornillables} onCambio={cambiar('grada.filasAtornillables')} />
      </div>
      <p className="nota">
        En módulos, cada bloque lleva sus pórticos en las puntas y se atornilla al de al lado (bulones en los parantes y
        la zanca). Con filas atornillables, los tablones se fijan con tornillos para poder sacarlos.
      </p>

      {resumen && (
        <div className="resumen-escalera" role="status">
          <strong>{resumen.filas} filas · {resumen.alturaTotal.toFixed(2)} m de alto · {resumen.profundidad.toFixed(2)} m de profundidad</strong>
          <br />
          {resumen.porticos} pórticos · capacidad aprox. {resumen.capacidad} personas (45 cm por persona)
          {resumen.modulos > 1 && <> · {resumen.modulos} módulos de {resumen.largoModulo.toFixed(2)} m</>}
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
