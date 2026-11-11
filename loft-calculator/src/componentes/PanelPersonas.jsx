// ==========================================================
// PanelPersonas (v1.45): gente para recorrer la casa en el 3D
// ----------------------------------------------------------
// Cada persona tiene nombre, sexo, altura, en qué piso está y el color de
// la ropa. En el 3D se la toca para elegirla y después se toca el piso
// (camina hasta ahí) o algo (va a buscarlo: se agacha o se estira según
// la altura); también se maneja con el teclado o se ve con sus ojos.
// No van al presupuesto. Cada cambio se valida en App (cambiar).
// ==========================================================

import { useState } from 'react';
import Tarjeta from './Tarjeta.jsx';
import FichaPlegable from './FichaPlegable.jsx';
import CampoNumero from './CampoNumero.jsx';
import CampoSelect from './CampoSelect.jsx';
import SelectorColor from './SelectorColor.jsx';
import { SEXOS, ALTURA_SEGUN_SEXO, personaNueva } from '../motor/personas.js';

const f2 = (n) => n.toFixed(2).replace('.', ',');
const ROPA_DE_FABRICA = { mujer: '#db2777', hombre: '#2563eb' }; // la misma que usa personas3d.js sin color propio

function Persona({ p, i, params, unidad, cambiar, onQuitar, abiertaAlInicio }) {
  const ruta = `personas.${i}`;
  const nombreSexo = SEXOS.find(([v]) => v === p.sexo)?.[1] ?? '';
  return (
    <FichaPlegable clave={`persona:${p.id}`} className="persona" abiertaAlInicio={abiertaAlInicio}
      encabezado={<>
        <span className="muestra-elemento" style={{ background: p.colorRopa || ROPA_DE_FABRICA[p.sexo] }} aria-hidden="true" />
        <strong>{p.nombre}</strong>
        <small>{nombreSexo} · {f2(p.altura)} m</small>
      </>}
      acciones={<button type="button" className="btn-del" onClick={onQuitar} aria-label={`Quitar ${p.nombre}`} title="Quitar">✕</button>}>
      <div className="grid-params">
        <div className="group">
          <label htmlFor={`persona-nombre-${p.id}`}>Nombre</label>
          <input id={`persona-nombre-${p.id}`} type="text" maxLength={40} value={p.nombre} onChange={(e) => cambiar(`${ruta}.nombre`)(e.target.value)} />
        </div>
        {/* Al cambiar el sexo, si tenía la altura de fábrica, pasa a la del otro (si la cambiaste a mano, se queda). */}
        <CampoSelect etiqueta="Sexo" valor={p.sexo} opciones={SEXOS}
          onCambio={(sexo) => cambiar(ruta)({ ...p, sexo, altura: p.altura === ALTURA_SEGUN_SEXO[p.sexo] ? ALTURA_SEGUN_SEXO[sexo] : p.altura })} />
        <CampoNumero etiqueta="Altura" unidad={unidad} valor={p.altura} onCambio={cambiar(`${ruta}.altura`)} />
        {params.anchoEntrepiso > 0 && (
          <CampoSelect etiqueta="Piso" valor={p.nivel} opciones={[['piso', 'Planta baja'], ['piso2', 'Piso 2 (entrepiso)']]} onCambio={cambiar(`${ruta}.nivel`)} />
        )}
        <div className="group campo-color">
          <span className="etiqueta-campo">Ropa</span>
          <SelectorColor valor={p.colorRopa} porDefecto={ROPA_DE_FABRICA[p.sexo]} nombre={p.nombre || 'la persona'}
            onCambio={cambiar(`${ruta}.colorRopa`)} onRestablecer={() => cambiar(`${ruta}.colorRopa`)('')} />
        </div>
      </div>
    </FichaPlegable>
  );
}

export default function PanelPersonas({ params, unidad, cambiar }) {
  const personas = params.personas ?? [];
  const [aviso, setAviso] = useState(null);
  const [recien, setRecien] = useState(null);
  const agregar = () => {
    const id = Math.max(0, ...personas.map((p) => p.id)) + 1;
    setRecien(id);
    setAviso(cambiar('personas')([...personas, personaNueva(personas, id)]));
  };
  const quitar = (id) => cambiar('personas')(personas.filter((p) => p.id !== id));
  return (
    <Tarjeta id="personas" titulo={`Personas (${personas.length})`}>
      <p className="nota">
        Para ver la casa a escala humana. En el 3D tocá una persona y después el piso (camina hasta ahí, esquivando
        paredes y muebles) o algo (va a buscarlo: se agacha o se estira). También se maneja con el teclado o se ve
        con sus ojos (👁 Primera persona). No van al presupuesto.
      </p>
      {personas.length === 0 && <p className="vacio">Todavía no hay personas.</p>}
      {personas.map((p, i) => (
        <Persona key={p.id} p={p} i={i} params={params} unidad={unidad} cambiar={cambiar} onQuitar={() => quitar(p.id)} abiertaAlInicio={p.id === recien} />
      ))}
      <button type="button" className="btn-sec" onClick={agregar}>+ Persona</button>
      {aviso && <p className="error" role="alert">{aviso}</p>}
    </Tarjeta>
  );
}
