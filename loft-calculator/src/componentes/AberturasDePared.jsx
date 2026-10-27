// ==========================================================
// Aberturas de una pared (v1.17): cada pared muestra SUS puertas y
// ventanas, con "+ Puerta" / "+ Ventana". Cada abertura se edita
// directo (y también desde el 3D) y cada cambio se valida (que entre
// en su pared) antes de guardarse. El número (#1, #2…) es el de la
// lista completa, el mismo que se ve en el 3D.
// ==========================================================

import SelectorPerfil from './SelectorPerfil.jsx';
import { useState } from 'react';
import CampoNumero from './CampoNumero.jsx';
import SelectorLado from './SelectorLado.jsx';
import CampoSelect from './CampoSelect.jsx';
import { validarAbertura, copiarAbertura, aberturaNueva, LARGO_MAXIMO_ETIQUETA } from '../motor/validacion.js';
import { nombreLado } from '../motor/geometria.js';

/**
 * Una abertura con todos sus campos editables.
 * v1.27: Duplicar y Eliminar van al PIE (antes arriba, al lado del título, y el ✕ parecía "cerrar").
 * `conAcciones={false}`: sin pie (el cartel del 3D pone el suyo).
 */
/**
 * @param perfiles      (v1.33) lista de perfiles para elegir el del marco de esta abertura (sin ella no se muestra)
 * @param perfilGeneral nombre del perfil general de "Marcos de aberturas" (para la opción vacía)
 */
export function FilaAbertura({ abertura, numero, params, unidad, onActualizar, onQuitar, onDuplicar, conAcciones = true, perfiles = null, perfilGeneral = '' }) {
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
        <span>{abertura.etiqueta?.trim() ? `“${abertura.etiqueta.trim()}” · ` : ''}{nombreLado(abertura.lado, params.ladoFrente)}</span>
      </div>
      {/* Etiqueta propia (v1.17), como las paredes: se ve en el 3D junto al número. */}
      <div className="etiqueta-pared">
        <label className="capa">
          <input type="checkbox" checked={abertura.mostrarEtiqueta !== false}
            aria-label={`Mostrar la etiqueta de la abertura ${numero} en el 3D`}
            onChange={(e) => cambiar('mostrarEtiqueta')(e.target.checked)} />
          Etiqueta en el 3D
        </label>
        <input type="text" className="perfil" maxLength={LARGO_MAXIMO_ETIQUETA} value={abertura.etiqueta ?? ''}
          disabled={abertura.mostrarEtiqueta === false} placeholder={`#${numero} (ej. Ventana cocina)`}
          aria-label={`Texto de la etiqueta de la abertura ${numero}`}
          onChange={(e) => cambiar('etiqueta')(e.target.value)} />
      </div>
      {/* v1.28: travesaños hasta las columnas, a la altura del dintel y del antepecho. */}
      <label className="casilla-opcional">
        <input type="checkbox" checked={abertura.travesanos === true}
          onChange={(e) => setErrorSelect(cambiar('travesanos')(e.target.checked))} />
        Travesaños hasta las columnas (arriba{abertura.tipo === 'puerta' ? '' : ' y abajo'})
      </label>
      <div className="grid-params">
        <CampoSelect etiqueta="Tipo" valor={abertura.tipo} onCambio={cambiarSelect('tipo')}
          opciones={[['ventana', 'Ventana'], ['puerta', 'Puerta']]} />
        <SelectorLado etiqueta="Pared (para pasarla a otra)" valor={abertura.lado} params={params} onCambio={cambiar('lado')} />
        <CampoSelect etiqueta="Medir desde" valor={abertura.ladoReferencia} onCambio={cambiarSelect('ladoReferencia')}
          opciones={[['izquierda', 'Esquina izquierda'], ['derecha', 'Esquina derecha']]} />
        <CampoNumero etiqueta="Dist. a esquina" unidad={unidad} valor={abertura.offsetHorizontal} onCambio={cambiar('offsetHorizontal')} />
        <CampoNumero etiqueta="Ancho" unidad={unidad} valor={abertura.ancho} onCambio={cambiar('ancho')} />
        <CampoNumero etiqueta="Alto" unidad={unidad} valor={abertura.alto} onCambio={cambiar('alto')} />
        {!esPuerta && (
          <CampoNumero etiqueta="Antepecho" unidad={unidad} valor={abertura.alturaAntepecho} onCambio={cambiar('alturaAntepecho')} />
        )}
        {/* v1.34: qué queda entero en el marco de esta abertura (las uniones de la red, ver Materiales → Uniones). */}
        <CampoSelect etiqueta="En el marco quedan enteros" valor={abertura.marcoEntero ?? 'jambas'} onCambio={cambiarSelect('marcoEntero')}
          opciones={[['jambas', 'Las jambas (dintel y alféizar entre ellas)'], ['dintel', 'Dintel y alféizar (jambas cortadas)']]} />
        {/* v1.33: el marco (jambas, dintel, alféizar) con su propio perfil, o el general de Marcos de aberturas. */}
        {perfiles && (
          <SelectorPerfil etiqueta="Perfil del marco" valor={abertura.perfilMarco ?? ''} perfiles={perfiles}
            opcionGeneral={`General${perfilGeneral ? `: ${perfilGeneral.replace('Caño estructural ', 'Caño ')}` : ''}`}
            onElegir={(id) => setErrorSelect(cambiar('perfilMarco')(id ?? ''))} />
        )}
      </div>
      {errorSelect && <p className="error" role="alert">{errorSelect}</p>}
      {conAcciones && (
        <div className="pie-acciones no-print">
          <button className="btn-sec btn-chico" onClick={() => onDuplicar(abertura)} title="Crea una igual al lado (después la podés mover o pasar a otra pared)">
            Duplicar
          </button>
          <button className="btn-del eliminar-aparte" onClick={() => onQuitar(abertura.id)} aria-label={`Eliminar abertura ${numero}`}>Eliminar</button>
        </div>
      )}
    </li>
  );
}

/**
 * Lista de aberturas de UNA pared, con sus botones para agregar.
 * @param aberturas todas las aberturas (para numerar igual que el 3D y no superponer)
 */
export default function AberturasDePared({ lado, aberturas, params, unidad, onAgregar, onActualizar, onQuitar, perfiles = null, perfilGeneral = '' }) {
  const [error, setError] = useState(null);
  const deEstaPared = aberturas.map((op, i) => ({ op, numero: i + 1 })).filter(({ op }) => op.lado === lado);

  const agregar = (tipo) => {
    const resultado = aberturaNueva(tipo, lado, aberturas, params, Date.now());
    setError(resultado.error ?? null);
    if (resultado.abertura) onAgregar(resultado.abertura);
  };

  /** Duplicar: la copia va al lado si entra (ver copiarAbertura). */
  const duplicar = (abertura) => {
    setError(null);
    const copia = copiarAbertura(abertura, aberturas, params, Date.now());
    if (validarAbertura(copia, params)) return;
    onAgregar(copia);
  };

  return (
    <div className="aberturas-pared">
      <h4 className="subtitulo">Aberturas ({deEstaPared.length})</h4>
      {deEstaPared.length > 0 && (
        <ul className="opening-list">
          {deEstaPared.map(({ op, numero }) => (
            <FilaAbertura key={op.id} abertura={op} numero={numero} params={params} unidad={unidad}
              onActualizar={onActualizar} onQuitar={onQuitar} onDuplicar={duplicar} perfiles={perfiles} perfilGeneral={perfilGeneral} />
          ))}
        </ul>
      )}
      {error && <p className="error" role="alert">{error}</p>}
      <div className="acciones-montaje no-print">
        <button className="btn-sec" onClick={() => agregar('puerta')}>+ Puerta</button>
        <button className="btn-sec" onClick={() => agregar('ventana')}>+ Ventana</button>
      </div>
    </div>
  );
}
