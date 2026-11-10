// ==========================================================
// PanelMuebles (v1.38): muebles y electrodomésticos para dimensionar
// ----------------------------------------------------------
// Se agregan por tipo (cama, heladera, placard…) con medidas de fábrica
// que se cambian a mano. Se ubican como lo del terreno: parado afuera,
// mirando el frente de la casa, desde el LATERAL IZQUIERDO hacia la
// derecha y desde el FRENTE hacia el fondo, hasta el borde del mueble
// (medido desde el eje de la pared). No van al presupuesto.
// ==========================================================

import { useState } from 'react';
import Tarjeta from './Tarjeta.jsx';
import FichaPlegable from './FichaPlegable.jsx';
import CampoNumero from './CampoNumero.jsx';
import CampoSelect from './CampoSelect.jsx';
import { nombreLado } from '../motor/geometria.js';
import SelectorColor from './SelectorColor.jsx';
import { TIPOS_MUEBLE, MATERIALES_MUEBLE, muebleNuevo, muebleFueraDeLaPlanta, colorDelMueble, distanciasDelMueble, libreArribaDelMueble, cajonesQueChocan, PUERTAS_MUEBLE, margenDePuerta, puertaQueChoca } from '../motor/interiores.js';

const f2 = (n) => n.toFixed(2).replace('.', ',');
const GIROS = [[0, 'Sin girar'], [90, '90°'], [180, '180° (de espaldas)'], [270, '270°']];

/** Un mueble: medidas, material y dónde está. */
function Mueble({ m, i, params, unidad, cambiar, onQuitar, abiertaAlInicio }) {
  const ruta = `muebles.${i}`;
  const medida = (campo, etiqueta) => (
    <CampoNumero etiqueta={etiqueta} unidad={unidad} valor={m[campo]} onCambio={cambiar(`${ruta}.${campo}`)} />
  );
  const tipo = TIPOS_MUEBLE[m.tipo];
  const fuera = muebleFueraDeLaPlanta(params, m);
  // v1.39: las dos distancias que no se cargan y lo libre arriba, calculados.
  const d = distanciasDelMueble(params, m);
  const otraLateral = m.desdeLateral === 'izquierdo' ? d.derecha : d.izquierda;
  const otraFrente = m.desdeFrente === 'frente' ? d.fondo : d.frente;
  const { libre, hasta } = libreArribaDelMueble(params, m);
  const choques = cajonesQueChocan(params, m);
  const choquePuerta = puertaQueChoca(params, m);
  return (
    <FichaPlegable clave={`mueble:${m.id}`} className="mueble" abiertaAlInicio={abiertaAlInicio}
      encabezado={<>
          <span className="muestra-elemento" style={{ background: colorDelMueble(m) }} aria-hidden="true" />
          <strong>{m.nombre || tipo.nombre}</strong>
          <small>{m.nombre !== tipo.nombre ? tipo.nombre : ''} {f2(m.ancho)} x {f2(m.profundidad)} x {f2(m.alto)} m</small>
      </>}
      acciones={<button type="button" className="btn-del" onClick={onQuitar} aria-label={`Quitar ${m.nombre}`} title="Quitar">✕</button>}>
      {/* v1.38.1: el nombre es el cartel del 3D (como paredes y aberturas); se puede sacar uno por uno. */}
      <div className="etiqueta-pared">
        <label className="capa">
          <input type="checkbox" checked={m.mostrarEtiqueta !== false}
            aria-label={`Mostrar la etiqueta de ${m.nombre || 'el mueble'} en el 3D`}
            onChange={(e) => cambiar(`${ruta}.mostrarEtiqueta`)(e.target.checked)} />
          Etiqueta en el 3D
        </label>
        <input type="text" className="perfil" maxLength={40} value={m.nombre} aria-label="Nombre"
          onChange={(e) => cambiar(`${ruta}.nombre`)(e.target.value)} />
      </div>
      <div className="grid-params">
        {medida('ancho', 'Ancho')}
        {medida('profundidad', 'Profundidad')}
        {medida('alto', 'Alto')}
        <CampoSelect etiqueta="Material" valor={m.material}
          opciones={Object.entries(MATERIALES_MUEBLE).map(([clave, mat]) => [clave, mat.nombre])} onCambio={cambiar(`${ruta}.material`)} />
        {/* v1.38.2: color propio (↺ vuelve al del material). */}
        <div className="group campo-color">
          <span className="etiqueta-campo">Color</span>
          <SelectorColor valor={m.color} porDefecto={MATERIALES_MUEBLE[m.material]?.color ?? '#a16207'} nombre={m.nombre || 'el mueble'}
            onCambio={cambiar(`${ruta}.color`)} onRestablecer={() => cambiar(`${ruta}.color`)('')} />
        </div>
        {/* v1.39: desde qué pared se mide (su cara de adentro) y la distancia; las otras dos se calculan abajo. */}
        <CampoSelect etiqueta="Medido desde el" valor={m.desdeLateral}
          opciones={[['izquierdo', 'Lateral izquierdo'], ['derecho', 'Lateral derecho']]} onCambio={cambiar(`${ruta}.desdeLateral`)} />
        {medida('distanciaLateral', `Distancia al lateral ${m.desdeLateral}`)}
        <CampoSelect etiqueta="y desde el" valor={m.desdeFrente}
          opciones={[['frente', 'Frente'], ['fondo', 'Fondo']]} onCambio={cambiar(`${ruta}.desdeFrente`)} />
        {medida('distanciaFrente', `Distancia al ${m.desdeFrente}`)}
        {/* v1.42.1: cómo abre la puerta (se ve el lugar que necesita) y, para la alacena, a qué altura va colgada. */}
        <CampoSelect etiqueta="Puerta" valor={m.puerta ?? 'ninguna'} opciones={PUERTAS_MUEBLE} onCambio={cambiar(`${ruta}.puerta`)} />
        {medida('elevacion', 'Altura desde el piso')}
        <CampoSelect etiqueta="Giro" valor={String(m.giro)} opciones={GIROS.map(([g, t]) => [String(g), t])}
          onCambio={(v) => cambiar(`${ruta}.giro`)(Number(v))} />
        {params.anchoEntrepiso > 0 && (
          <CampoSelect etiqueta="Nivel" valor={m.nivel} opciones={[['piso', 'Planta baja'], ['piso2', 'Piso 2 (entrepiso)']]}
            onCambio={cambiar(`${ruta}.nivel`)} />
        )}
      </div>
      {tipo.forma === 'lavarropas' && (
        <label className="casilla-opcional">
          <input type="checkbox" checked={m.cargaFrontal !== false} onChange={(e) => cambiar(`${ruta}.cargaFrontal`)(e.target.checked)} />
          Carga frontal (sin tildar: carga superior)
        </label>
      )}
      {tipo.forma === 'cama' && (<>
        {/* v1.40.1: cajones (izquierda y derecha mirando la cama desde los pies) y cuánto salen abiertos. */}
        <div className="fila-casillas">
          {[['cajonesIzquierda', 'Cajones a la izquierda'], ['cajonesDerecha', 'Cajones a la derecha'], ['cajonesPies', 'Cajones a los pies']].map(([campo, texto]) => (
            <label key={campo} className="casilla-opcional">
              <input type="checkbox" checked={m[campo] === true} onChange={(e) => cambiar(`${ruta}.${campo}`)(e.target.checked)} /> {texto}
            </label>
          ))}
        </div>
        {(m.cajonesIzquierda || m.cajonesDerecha || m.cajonesPies) && (
          <div className="grid-params">{medida('aperturaCajones', 'Cajones abiertos salen')}</div>
        )}
        <p className="nota">Izquierda y derecha mirando la cama desde los pies. Abiertos se ven sombreados en el 3D.</p>
        {choques.map((c) => (
          <p key={c.lado} className="aviso-mueble" role="status">⚠ Los cajones {c.lado === 'pies' ? 'de los pies' : `de la ${c.lado}`} chocan con la pared ({c.pared}): faltan {f2(c.falta)} m.</p>
        ))}
      </>)}
      <p className="nota distancias-mueble" role="status">
        Quedan <strong>{f2(otraLateral)} m</strong> al lateral {m.desdeLateral === 'izquierdo' ? 'derecho' : 'izquierdo'},
        {' '}<strong>{f2(otraFrente)} m</strong> al {m.desdeFrente === 'frente' ? 'fondo' : 'frente'} y
        {' '}<strong>{f2(libre)} m</strong> libres arriba (hasta {hasta === 'piso2' ? 'los tirantes del piso 2' : 'la estructura del techo'}).
      </p>
      {margenDePuerta(m) > 0 && !choquePuerta && (
        <p className="nota" role="status">La puerta abierta necesita {f2(margenDePuerta(m))} m adelante (se ve sombreado en el 3D).</p>
      )}
      {choquePuerta && (
        <p className="aviso-mueble" role="status">⚠ La puerta abierta ({f2(choquePuerta.margen)} m) choca con la pared ({choquePuerta.pared}): faltan {f2(choquePuerta.falta)} m.</p>
      )}
      {fuera && <p className="aviso-mueble" role="status">⚠ Se sale de la planta: acomodá las distancias o el giro.</p>}
      {!fuera && libre < 0 && <p className="aviso-mueble" role="status">⚠ No entra de alto: pasa {f2(-libre)} m.</p>}
    </FichaPlegable>
  );
}

export default function PanelMuebles({ params, unidad, cambiar }) {
  const muebles = params.muebles;
  const [tipoNuevo, setTipoNuevo] = useState('cama2');
  const [aviso, setAviso] = useState(null);
  const [recien, setRecien] = useState(null); // v1.42.1
  const agregar = () => {
    const id = Math.max(0, ...muebles.map((m) => m.id)) + 1;
    setRecien(id); // el recién agregado arranca abierto
    setAviso(cambiar('muebles')([...muebles, muebleNuevo(tipoNuevo, muebles, id)]));
  };
  const quitar = (id) => cambiar('muebles')(muebles.filter((m) => m.id !== id));
  const frente = nombreLado(params.ladoFrente, params.ladoFrente).toLowerCase();
  return (
    <Tarjeta id="muebles" titulo={`Muebles y electrodomésticos (${muebles.length})`}>
      <p className="nota">
        Para ver cómo entran (no van al presupuesto). Elegí desde qué pared medís (laterales vistos desde afuera,
        mirando el {frente}): la distancia va de la cara de adentro de la pared al borde del mueble. Las otras
        distancias y lo libre arriba se calculan solos. Sin girar, el mueble mira hacia el {frente}.
      </p>
      <div className="fila-agregar-mueble">
        <CampoSelect etiqueta="Mueble a agregar" valor={tipoNuevo} opciones={Object.entries(TIPOS_MUEBLE).map(([clave, t]) => [clave, t.nombre])}
          onCambio={setTipoNuevo} />
        <button type="button" className="btn-sec" onClick={agregar}>+ Agregar</button>
      </div>
      {aviso && <p className="error" role="alert">{aviso}</p>}
      {muebles.length === 0 && <p className="vacio">Todavía no hay muebles.</p>}
      {muebles.map((m, i) => (
        <Mueble key={m.id} m={m} i={i} params={params} unidad={unidad} cambiar={cambiar} onQuitar={() => quitar(m.id)} abiertaAlInicio={m.id === recien} />
      ))}
    </Tarjeta>
  );
}
