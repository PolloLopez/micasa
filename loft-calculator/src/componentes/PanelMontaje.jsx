// ==========================================================
// PanelMontaje: componentes de un montaje industrial (mesas y
// tanques). Cada componente tiene su nombre, su ubicación en la
// planta (x, z), su giro y sus medidas. Se agregan con los botones
// "+ Mesa" / "+ Tanque" y se quitan con la ✕.
// Cada cambio se valida en App (cambiar) igual que el resto: los
// errores vienen en "montaje.componentes.<i>.<campo>".
// ==========================================================

import { useId, useState } from 'react';
import CampoNumero from './CampoNumero.jsx';
import CampoOpcional from './CampoOpcional.jsx';
import Tarjeta from './Tarjeta.jsx';
import { MESA_INICIAL, TANQUE_INICIAL, idNuevoComponente } from '../motor/montaje.js';
import { LARGO_MAXIMO_NOMBRE_COMPONENTE } from '../motor/validacion.js';
import { nombreLado } from '../motor/geometria.js';

/** Select con etiqueta y mensaje de error (devuelto por onCambio). */
function Opciones({ etiqueta, valor, opciones, onCambio }) {
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

/** Datos de una mesa / bastidor. */
function CamposMesa({ medida, opcional, opciones, c, cambiar, ruta }) {
  return (
    <>
      <div className="grid-params">
        {medida('largo', 'Largo')}
        {medida('ancho', 'Ancho')}
        {medida('alto', 'Alto')}
        {opcional('separacionPatas', 'Patas intermedias (si no, solo en las esquinas)', 'Patas cada', 1.5)}
        {opcional('separacionTravesanos', 'Travesaños bajo la tapa', 'Travesaños cada', 0.6)}
        {c.marcoInferior && medida('alturaMarcoInferior', 'Altura del marco inferior')}
        {opciones('riostras', 'Riostras en cruz', [['no', 'Sin riostras'], ['cabeceras', 'En las cabeceras'], ['todas', 'En todos los lados']])}
        {opciones('tapa', 'Tapa', [['chapa', 'Chapa'], ['madera', 'Madera'], ['ninguna', 'Sin tapa']])}
      </div>
      <label className="capa">
        <input type="checkbox" checked={c.marcoInferior} aria-label={`Marco inferior de ${c.nombre}`}
          onChange={(e) => cambiar(`${ruta}.marcoInferior`)(e.target.checked)} />
        Marco inferior (une las patas abajo)
      </label>
    </>
  );
}

/** Datos de un tanque cilíndrico. */
function CamposTanque({ medida, entero, opciones, c, cambiarCampo }) {
  return (
    <div className="grid-params">
      {opciones('orientacion', 'Orientación', [['vertical', 'Vertical'], ['horizontal', 'Horizontal']])}
      {medida('diametro', 'Diámetro')}
      {medida('largo', c.orientacion === 'vertical' ? 'Alto del cilindro' : 'Largo del cilindro')}
      <CampoNumero etiqueta="Espesor de chapa" sufijo="mm" decimales={1} valor={c.espesorChapa} onCambio={cambiarCampo('espesorChapa')} />
      {opciones('tapas', 'Tapas planas', [['dos', 'Dos (cerrado)'], ['una', c.orientacion === 'vertical' ? 'Una (abierto arriba)' : 'Una'], ['ninguna', 'Ninguna']])}
      {medida('alturaSoporte', 'Altura sobre el piso')}
      {entero('apoyos', c.orientacion === 'vertical' ? 'Patas' : 'Cunas')}
    </div>
  );
}

/** Un componente: encabezado (nombre, ubicación, giro, quitar) + sus campos + resumen. */
function Componente({ c, i, resumen, unidad, cambiar, onQuitar, ladoFrente }) {
  const ruta = `montaje.componentes.${i}`;
  const cambiarCampo = (nombre) => cambiar(`${ruta}.${nombre}`);
  const medida = (nombre, etiqueta) => (
    <CampoNumero key={nombre} etiqueta={etiqueta} unidad={unidad} valor={c[nombre]} onCambio={cambiarCampo(nombre)} />
  );
  const opcional = (nombre, casilla, etiqueta, valorPorDefecto) => (
    <CampoOpcional key={nombre} casilla={casilla} etiqueta={etiqueta} unidad={unidad} valorPorDefecto={valorPorDefecto}
      valor={c[nombre]} onCambio={cambiarCampo(nombre)} />
  );
  const entero = (nombre, etiqueta) => (
    <CampoNumero key={nombre} etiqueta={etiqueta} sufijo="u" decimales={0} valor={c[nombre]} onCambio={cambiarCampo(nombre)} />
  );
  const opciones = (nombre, etiqueta, lista) => (
    <Opciones key={nombre} etiqueta={etiqueta} valor={c[nombre]} opciones={lista} onCambio={cambiarCampo(nombre)} />
  );

  return (
    <div className="pared componente-montaje">
      <div className="pared-titulo">
        <input type="text" className="perfil nombre-componente" value={c.nombre} maxLength={LARGO_MAXIMO_NOMBRE_COMPONENTE}
          aria-label={`Nombre del componente ${i + 1}`} onChange={(e) => cambiarCampo('nombre')(e.target.value)} />
        <span>{c.tipo === 'mesa' ? 'mesa / bastidor' : 'tanque'}</span>
        <button className="btn-del" onClick={onQuitar} aria-label={`Quitar ${c.nombre}`} title="Quitar componente">Eliminar</button>
      </div>
      <div className="grid-params">
        <CampoNumero etiqueta={`Corrido hacia ${nombreLado('B', ladoFrente)} (x)`} unidad={unidad} valor={c.x} onCambio={cambiarCampo('x')} />
        <CampoNumero etiqueta={`Corrido hacia ${nombreLado('A', ladoFrente)} (z)`} unidad={unidad} valor={c.z} onCambio={cambiarCampo('z')} />
        <Opciones etiqueta="Giro" valor={c.rotacion} opciones={[['0', '0°'], ['90', '90°']]}
          onCambio={(v) => cambiarCampo('rotacion')(Number(v))} />
      </div>
      {c.tipo === 'mesa'
        ? <CamposMesa c={c} medida={medida} opcional={opcional} opciones={opciones} cambiar={cambiar} ruta={ruta} />
        : <CamposTanque c={c} medida={medida} entero={entero} opciones={opciones} cambiarCampo={cambiarCampo} />}
      {resumen && (
        <p className="nota resumen-componente">
          {resumen.texto}
          {resumen.avisos.map((a) => <span key={a} className="error"><br />{a}</span>)}
        </p>
      )}
    </div>
  );
}

export default function PanelMontaje({ params, resumenes, unidad, cambiar }) {
  const componentes = params.montaje.componentes;
  const [error, setError] = useState(null);
  const agregar = (base) => {
    const id = idNuevoComponente(componentes);
    // Cada componente nuevo aparece corrido 2,5 m del anterior para que no se superpongan.
    const x = componentes.length ? Math.min(50, Math.max(...componentes.map((c) => c.x)) + 2.5) : 0;
    setError(cambiar('montaje.componentes')([...componentes, { ...base, id, x, nombre: `${base.nombre} ${id.slice(1)}` }]));
  };
  const quitar = (id) => setError(cambiar('montaje.componentes')(componentes.filter((c) => c.id !== id)));

  return (
    <Tarjeta id="montaje" titulo={`Montaje (${componentes.length} componente${componentes.length === 1 ? '' : 's'})`} resaltar={{ tipo: 'grupo', id: 'montaje', nombre: 'Montaje' }}>
      <p className="nota">
        Cada componente se ubica en la planta: <strong>x</strong> y <strong>z</strong> son cuánto se corre su centro desde
        el centro del 3D. Con <strong>Giro 90°</strong> el largo pasa a ir de adelante hacia atrás.
      </p>
      <div className="acciones-montaje">
        <button className="btn-sec" onClick={() => agregar(MESA_INICIAL)}>+ Mesa / bastidor</button>
        <button className="btn-sec" onClick={() => agregar(TANQUE_INICIAL)}>+ Tanque</button>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      {componentes.length === 0 && <p className="nota">Todavía no hay componentes: agregá una mesa o un tanque.</p>}
      {componentes.map((c, i) => (
        <Componente key={c.id} c={c} i={i} resumen={resumenes[c.id]} unidad={unidad} cambiar={cambiar}
          ladoFrente={params.ladoFrente} onQuitar={() => quitar(c.id)} />
      ))}
    </Tarjeta>
  );
}
