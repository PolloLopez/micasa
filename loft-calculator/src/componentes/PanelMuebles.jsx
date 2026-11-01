// ==========================================================
// PanelMuebles (v1.38): muebles y electrodomésticos para dimensionar
// ----------------------------------------------------------
// Se agregan por tipo (cama, heladera, placard…) con medidas de fábrica
// que se cambian a mano. Se ubican como lo del terreno: parado afuera,
// mirando el frente de la casa, desde el LATERAL IZQUIERDO hacia la
// derecha y desde el FRENTE hacia el fondo, hasta el borde del mueble
// (medido desde el eje de la pared). No van al presupuesto.
// ==========================================================

import { useId, useState } from 'react';
import Tarjeta from './Tarjeta.jsx';
import CampoNumero from './CampoNumero.jsx';
import CampoSelect from './CampoSelect.jsx';
import { nombreLado } from '../motor/geometria.js';
import { TIPOS_MUEBLE, MATERIALES_MUEBLE, muebleNuevo, muebleFueraDeLaPlanta } from '../motor/interiores.js';

const f2 = (n) => n.toFixed(2).replace('.', ',');
const GIROS = [[0, 'Sin girar'], [90, '90°'], [180, '180° (de espaldas)'], [270, '270°']];

/** Un mueble: medidas, material y dónde está. */
function Mueble({ m, i, params, unidad, cambiar, onQuitar }) {
  const idNombre = useId();
  const ruta = `muebles.${i}`;
  const medida = (campo, etiqueta) => (
    <CampoNumero etiqueta={etiqueta} unidad={unidad} valor={m[campo]} onCambio={cambiar(`${ruta}.${campo}`)} />
  );
  const tipo = TIPOS_MUEBLE[m.tipo];
  const fuera = muebleFueraDeLaPlanta(params, m);
  return (
    <section className="elemento-terreno mueble">
      <header>
        <span className="muestra-elemento" style={{ background: MATERIALES_MUEBLE[m.material]?.color }} aria-hidden="true" />
        <strong>{m.nombre || tipo.nombre}</strong>
        <small>{m.nombre !== tipo.nombre ? tipo.nombre : ''} {f2(m.ancho)} x {f2(m.profundidad)} x {f2(m.alto)} m</small>
        <button type="button" className="btn-del" onClick={onQuitar} aria-label={`Quitar ${m.nombre}`} title="Quitar">✕</button>
      </header>
      <div className="grid-params">
        <div className="group">
          <label htmlFor={idNombre}>Nombre</label>
          <input id={idNombre} type="text" value={m.nombre} maxLength={40} onChange={(e) => cambiar(`${ruta}.nombre`)(e.target.value)} />
        </div>
        {medida('ancho', 'Ancho')}
        {medida('profundidad', 'Profundidad')}
        {medida('alto', 'Alto')}
        <CampoSelect etiqueta="Material" valor={m.material}
          opciones={Object.entries(MATERIALES_MUEBLE).map(([clave, mat]) => [clave, mat.nombre])} onCambio={cambiar(`${ruta}.material`)} />
        {medida('distanciaIzquierda', 'Al lateral izquierdo')}
        {medida('distanciaFrente', 'Al frente')}
        <CampoSelect etiqueta="Giro" valor={String(m.giro)} opciones={GIROS.map(([g, t]) => [String(g), t])}
          onCambio={(v) => cambiar(`${ruta}.giro`)(Number(v))} />
        {params.anchoEntrepiso > 0 && (
          <CampoSelect etiqueta="Nivel" valor={m.nivel} opciones={[['piso', 'Planta baja'], ['piso2', 'Piso 2 (entrepiso)']]}
            onCambio={cambiar(`${ruta}.nivel`)} />
        )}
      </div>
      {fuera && <p className="aviso-mueble" role="status">⚠ Se sale de la planta: acomodá las distancias o el giro.</p>}
    </section>
  );
}

export default function PanelMuebles({ params, unidad, cambiar }) {
  const muebles = params.muebles;
  const [tipoNuevo, setTipoNuevo] = useState('cama2');
  const [aviso, setAviso] = useState(null);
  const agregar = () => {
    const id = Math.max(0, ...muebles.map((m) => m.id)) + 1;
    setAviso(cambiar('muebles')([...muebles, muebleNuevo(tipoNuevo, muebles, id)]));
  };
  const quitar = (id) => cambiar('muebles')(muebles.filter((m) => m.id !== id));
  const frente = nombreLado(params.ladoFrente, params.ladoFrente).toLowerCase();
  return (
    <Tarjeta id="muebles" titulo={`Muebles y electrodomésticos (${muebles.length})`}>
      <p className="nota">
        Para ver cómo entran (no van al presupuesto). Se miden parado afuera mirando el {frente}: desde el eje de la
        pared del <strong>lateral izquierdo</strong> y desde el del <strong>{frente}</strong> hasta el borde del mueble.
        Sin girar, el mueble mira hacia el {frente}.
      </p>
      <div className="fila-agregar-mueble">
        <CampoSelect etiqueta="Mueble a agregar" valor={tipoNuevo} opciones={Object.entries(TIPOS_MUEBLE).map(([clave, t]) => [clave, t.nombre])}
          onCambio={setTipoNuevo} />
        <button type="button" className="btn-sec" onClick={agregar}>+ Agregar</button>
      </div>
      {aviso && <p className="error" role="alert">{aviso}</p>}
      {muebles.length === 0 && <p className="vacio">Todavía no hay muebles.</p>}
      {muebles.map((m, i) => (
        <Mueble key={m.id} m={m} i={i} params={params} unidad={unidad} cambiar={cambiar} onQuitar={() => quitar(m.id)} />
      ))}
    </Tarjeta>
  );
}
