// ==========================================================
// PanelMesadas (v1.38): mesadas con estructura y revestimiento
// ----------------------------------------------------------
// Cada mesada va contra una pared, medida como las aberturas: desde la
// esquina izquierda o derecha MIRANDO LA PARED DESDE AFUERA. Se elige el
// perfil (de la lista de perfiles), el revestimiento (de la lista de
// revestimientos) y se cargan los huecos bajo mesada (heladera,
// lavarropas…). Las cuentas están en motor/interiores.js; cada cambio se
// valida en App (cambiar), igual que el resto.
// ==========================================================

import { useId, useState } from 'react';
import Tarjeta from './Tarjeta.jsx';
import CampoNumero from './CampoNumero.jsx';
import CampoSelect from './CampoSelect.jsx';
import SelectorPerfil from './SelectorPerfil.jsx';
import { LADOS } from '../motor/constantes.js';
import { nombreLado, largoLado } from '../motor/geometria.js';
import { mesadaNueva, tramosDelFrente } from '../motor/interiores.js';

const f2 = (n) => n.toFixed(2).replace('.', ',');

/** Texto libre (nombre de la mesada o del hueco). */
function CampoTexto({ etiqueta, valor, onCambio, maximo = 40 }) {
  const id = useId();
  return (
    <div className="group">
      <label htmlFor={id}>{etiqueta}</label>
      <input id={id} type="text" value={valor} maxLength={maximo} onChange={(e) => onCambio(e.target.value)} />
    </div>
  );
}

/** Casilla con texto (costados revestidos). */
function Casilla({ texto, valor, onCambio }) {
  return (
    <label className="casilla-opcional">
      <input type="checkbox" checked={valor} onChange={(e) => onCambio(e.target.checked)} /> {texto}
    </label>
  );
}

/** Una mesada: dónde va, medidas, estructura, revestimiento y huecos. */
function Mesada({ m, i, params, unidad, cambiar, onQuitar, paneles, perfiles, perfilGeneral, generada }) {
  const ruta = `mesadas.${i}`;
  const medida = (campo, etiqueta) => (
    <CampoNumero etiqueta={etiqueta} unidad={unidad} valor={m[campo]} onCambio={cambiar(`${ruta}.${campo}`)} />
  );
  const conEntrepiso = params.anchoEntrepiso > 0;
  const largoPared = largoLado(m.lado, params);

  // Hueco nuevo: a continuación del último, de 60 cm (o lo que entre).
  const agregarHueco = () => {
    const fin = Math.max(0, ...m.huecos.map((h) => h.desde + h.ancho));
    const ancho = Math.min(0.6, m.largo);
    const desde = Math.min(fin, m.largo - ancho);
    return cambiar(`${ruta}.huecos`)([...m.huecos, { desde, ancho, nombre: `Hueco ${m.huecos.length + 1}` }]);
  };
  const quitarHueco = (k) => cambiar(`${ruta}.huecos`)(m.huecos.filter((_, j) => j !== k));

  const tramos = tramosDelFrente(m);
  const metros = generada ? generada.piezas.reduce((acc, p) => acc + p.largo, 0) : 0;
  const m2Placa = generada ? generada.panos.reduce((acc, p) => acc + p.neto, 0) : 0;

  return (
    <section className="elemento-terreno mesada">
      <header>
        <strong>{m.nombre}</strong>
        <small>{nombreLado(m.lado, params.ladoFrente)} · {f2(m.largo)} x {f2(m.profundidad)} m</small>
        <button type="button" className="btn-del" onClick={onQuitar} aria-label={`Quitar ${m.nombre}`} title="Quitar">✕</button>
      </header>
      {/* v1.38.1: el nombre es el cartel del 3D (como paredes y aberturas); se puede sacar uno por uno. */}
      <div className="etiqueta-pared">
        <label className="capa">
          <input type="checkbox" checked={m.mostrarEtiqueta !== false}
            aria-label={`Mostrar la etiqueta de ${m.nombre || 'la mesada'} en el 3D`}
            onChange={(e) => cambiar(`${ruta}.mostrarEtiqueta`)(e.target.checked)} />
          Etiqueta en el 3D
        </label>
        <input type="text" className="perfil" maxLength={40} value={m.nombre} aria-label="Nombre"
          onChange={(e) => cambiar(`${ruta}.nombre`)(e.target.value)} />
      </div>
      <div className="grid-params">
        <CampoSelect etiqueta="Contra la pared" valor={m.lado}
          opciones={LADOS.map((l) => [l, `${nombreLado(l, params.ladoFrente)} (${l})`])} onCambio={cambiar(`${ruta}.lado`)} />
        {conEntrepiso && (
          <CampoSelect etiqueta="Nivel" valor={m.nivel} opciones={[['piso', 'Planta baja'], ['piso2', 'Piso 2 (entrepiso)']]}
            onCambio={cambiar(`${ruta}.nivel`)} />
        )}
        <CampoSelect etiqueta="Medida desde la esquina" valor={m.ladoReferencia}
          opciones={[['izquierda', 'Izquierda (vista desde afuera)'], ['derecha', 'Derecha (vista desde afuera)']]}
          onCambio={cambiar(`${ruta}.ladoReferencia`)} />
        {medida('desde', 'Distancia a la esquina')}
        {medida('largo', 'Largo')}
        {medida('profundidad', 'Profundidad')}
        {medida('alto', 'Alto (con la tapa)')}
        {medida('espesorTapa', 'Espesor de la tapa')}
      </div>
      <p className="nota">La pared mide {f2(largoPared)} m: quedan {f2(Math.max(0, largoPared - m.desde - m.largo))} m del otro lado.</p>

      <h4 className="subtitulo-pared">Estructura y revestimiento</h4>
      <div className="grid-params">
        <SelectorPerfil etiqueta="Perfil" valor={m.perfil} perfiles={perfiles}
          opcionGeneral={`General (${(perfilGeneral || 'sin elegir').replace('Caño estructural ', 'Caño ')})`}
          onElegir={(id) => cambiar(`${ruta}.perfil`)(id ?? '')} />
        {medida('separacionMontantes', 'Montantes cada')}
        <div className="group">
          <label htmlFor={`rev-${m.id}`}>Revestimiento</label>
          <select id={`rev-${m.id}`} value={m.revestimiento} onChange={(e) => cambiar(`${ruta}.revestimiento`)(e.target.value)}>
            <option value="">Sin revestimiento</option>
            {paneles.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </div>
        <CampoNumero etiqueta="Estantes por tramo" decimales={0} valor={m.estantes}
          onCambio={(v) => (Number.isInteger(v) ? cambiar(`${ruta}.estantes`)(v) : 'Un número entero')} />
        {medida('zocalo', 'Alto del zócalo (0 = sin)')}
        {m.zocalo > 0 && medida('retiroZocalo', 'Retiro del zócalo')}
      </div>
      {m.revestimiento && (
        <div className="fila-casillas">
          <Casilla texto="Revestir el costado izquierdo" valor={m.costadoIzquierdo} onCambio={cambiar(`${ruta}.costadoIzquierdo`)} />
          <Casilla texto="Revestir el costado derecho" valor={m.costadoDerecho} onCambio={cambiar(`${ruta}.costadoDerecho`)} />
        </div>
      )}

      <h4 className="subtitulo-pared">Huecos bajo mesada</h4>
      <p className="nota">Sin estructura ni placa al frente (heladera, lavarropas, bacha). Se miden desde la punta izquierda de la mesada, mirándola de frente.</p>
      {m.huecos.map((h, k) => (
        <div key={k} className="grid-params fila-hueco">
          <CampoTexto etiqueta="Hueco" valor={h.nombre ?? ''} onCambio={cambiar(`${ruta}.huecos.${k}.nombre`)} />
          <CampoNumero etiqueta="Desde la punta izq." unidad={unidad} valor={h.desde} onCambio={cambiar(`${ruta}.huecos.${k}.desde`)} />
          <CampoNumero etiqueta="Ancho" unidad={unidad} valor={h.ancho} onCambio={cambiar(`${ruta}.huecos.${k}.ancho`)} />
          <button type="button" className="btn-del" onClick={() => quitarHueco(k)} aria-label={`Quitar ${h.nombre || 'el hueco'}`} title="Quitar">✕</button>
        </div>
      ))}
      <button type="button" className="btn-sec" onClick={agregarHueco}>+ Hueco</button>

      {generada && (
        <p className="nota resumen-mesada" role="status">
          {generada.piezas.length} piezas ({f2(metros)} m de perfil) · tapa {f2(generada.tapa.m2)} m²
          {m2Placa > 0 ? ` · ${f2(m2Placa)} m² de placa` : ''}
          {generada.estantesM2 > 0 ? ` · ${f2(generada.estantesM2)} m² de estantes` : ''}
          {m.huecos.length > 0 ? ` · ${tramos.length} ${tramos.length === 1 ? 'tramo' : 'tramos'} con frente` : ''}
        </p>
      )}
    </section>
  );
}

/**
 * @param generadas  e.mesadas de la estructura (piezas, paños, tapa) para mostrar el resumen
 * @param perfilGeneral texto del perfil del renglón "Estructura de mesadas" (la opción vacía)
 */
export default function PanelMesadas({ params, unidad, cambiar, paneles, perfiles, perfilGeneral, generadas }) {
  const mesadas = params.mesadas;
  const [aviso, setAviso] = useState(null); // si la mesada nueva no entra (pared corta), se dice por qué
  const agregar = () => {
    const id = Math.max(0, ...mesadas.map((m) => m.id)) + 1;
    setAviso(cambiar('mesadas')([...mesadas, mesadaNueva(mesadas, id)]));
  };
  const quitar = (id) => cambiar('mesadas')(mesadas.filter((m) => m.id !== id));
  return (
    <Tarjeta id="mesadas" titulo={`Mesadas (${mesadas.length})`} resaltar={{ tipo: 'grupo', id: 'mesada', nombre: 'Mesadas' }}>
      <p className="nota">
        Estructura con perfiles de tu lista, revestida al frente y a los costados (Durlock u otro de tus revestimientos),
        con tapa, estantes, huecos bajo mesada y zócalo para el pie. Va al presupuesto y al diagrama de cortes.
      </p>
      {mesadas.length === 0 && <p className="vacio">Todavía no hay mesadas.</p>}
      {mesadas.map((m, i) => (
        <Mesada key={m.id} m={m} i={i} params={params} unidad={unidad} cambiar={cambiar} onQuitar={() => quitar(m.id)}
          paneles={paneles} perfiles={perfiles} perfilGeneral={perfilGeneral} generada={generadas?.find((g) => g.id === m.id)} />
      ))}
      <button type="button" className="btn-sec" onClick={agregar}>+ Mesada</button>
      {aviso && <p className="error" role="alert">{aviso}</p>}
    </Tarjeta>
  );
}
