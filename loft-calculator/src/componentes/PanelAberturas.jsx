// ==========================================================
// PanelAberturas: cada abertura se edita directo en la lista,
// igual que los campos de Estructura. Cada cambio se valida
// (que entre en su pared) antes de guardarse.
// ==========================================================

import { useId, useState } from 'react';
import CampoNumero from './CampoNumero.jsx';
import SelectorLado from './SelectorLado.jsx';
import { validarAbertura } from '../motor/validacion.js';
import { nombreLado } from '../motor/geometria.js';

/** Abertura nueva: ventana en el frente, a 0,50 m de la esquina izquierda. */
function aberturaNueva(ladoFrente) {
  return {
    id: Date.now(), tipo: 'ventana', lado: ladoFrente, ladoReferencia: 'izquierda',
    offsetHorizontal: 0.5, alturaAntepecho: 1, ancho: 1, alto: 1,
  };
}

/** Select simple con etiqueta (tipo de abertura, lado de referencia). */
function CampoSelect({ etiqueta, valor, opciones, onCambio }) {
  const id = useId();
  return (
    <div className="group">
      <label htmlFor={id}>{etiqueta}</label>
      <select id={id} value={valor} onChange={(e) => onCambio(e.target.value)}>
        {opciones.map(([v, texto]) => <option key={v} value={v}>{texto}</option>)}
      </select>
    </div>
  );
}

/** Una abertura con todos sus campos editables. */
function FilaAbertura({ abertura, numero, params, unidad, onActualizar, onQuitar }) {
  const [errorSelect, setErrorSelect] = useState(null);

  // Prueba el cambio: si la abertura deja de entrar, devuelve el error y no guarda.
  const cambiar = (campo) => (valor) => {
    const nueva = { ...abertura, [campo]: valor };
    if (campo === 'tipo' && valor === 'puerta') nueva.alturaAntepecho = 0; // la puerta arranca del piso
    const problema = validarAbertura(nueva, params);
    if (problema) return problema;
    onActualizar(nueva);
    return null;
  };
  const cambiarSelect = (campo) => (valor) => setErrorSelect(cambiar(campo)(valor));

  const esPuerta = abertura.tipo === 'puerta';
  return (
    <li className="abertura">
      <div className="abertura-titulo">
        <strong>#{numero} {esPuerta ? 'Puerta' : 'Ventana'}</strong>
        <span>{nombreLado(abertura.lado, params.ladoFrente)}</span>
        <button className="btn-del no-print" onClick={() => onQuitar(abertura.id)} aria-label={`Quitar abertura ${numero}`}>✕</button>
      </div>
      <div className="grid-params">
        <CampoSelect etiqueta="Tipo" valor={abertura.tipo} onCambio={cambiarSelect('tipo')}
          opciones={[['ventana', 'Ventana'], ['puerta', 'Puerta']]} />
        <SelectorLado etiqueta="Pared" valor={abertura.lado} params={params} onCambio={cambiar('lado')} />
        <CampoSelect etiqueta="Medir desde" valor={abertura.ladoReferencia} onCambio={cambiarSelect('ladoReferencia')}
          opciones={[['izquierda', 'Esquina izquierda'], ['derecha', 'Esquina derecha']]} />
        <CampoNumero etiqueta="Dist. a esquina" unidad={unidad} valor={abertura.offsetHorizontal} onCambio={cambiar('offsetHorizontal')} />
        <CampoNumero etiqueta="Ancho" unidad={unidad} valor={abertura.ancho} onCambio={cambiar('ancho')} />
        <CampoNumero etiqueta="Alto" unidad={unidad} valor={abertura.alto} onCambio={cambiar('alto')} />
        {!esPuerta && (
          <CampoNumero etiqueta="Antepecho" unidad={unidad} valor={abertura.alturaAntepecho} onCambio={cambiar('alturaAntepecho')} />
        )}
      </div>
      {errorSelect && <p className="error" role="alert">{errorSelect}</p>}
    </li>
  );
}

export default function PanelAberturas({ aberturas, params, unidad, onAgregar, onActualizar, onQuitar }) {
  const [error, setError] = useState(null);

  const agregar = () => {
    const nueva = aberturaNueva(params.ladoFrente);
    const problema = validarAbertura(nueva, params);
    if (problema) {
      setError(problema);
      return;
    }
    setError(null);
    onAgregar(nueva);
  };

  return (
    <section className="card">
      <h2>Aberturas</h2>
      <p className="nota">
        Las medidas se toman mirando la pared desde afuera. <strong>Antepecho</strong>: altura desde el piso
        hasta el borde inferior de la ventana.
      </p>
      <ul className="opening-list">
        {aberturas.length === 0 && <li className="vacio">Sin aberturas</li>}
        {aberturas.map((op, i) => (
          <FilaAbertura key={op.id} abertura={op} numero={i + 1} params={params} unidad={unidad}
            onActualizar={onActualizar} onQuitar={onQuitar} />
        ))}
      </ul>
      {error && <p className="error" role="alert">{error}</p>}
      <button className="btn-add no-print" onClick={agregar}>+ Agregar abertura</button>
    </section>
  );
}
