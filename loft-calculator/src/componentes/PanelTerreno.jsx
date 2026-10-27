// ==========================================================
// PanelTerreno (v1.32): el lote, dónde va la casa y qué más hay
// ----------------------------------------------------------
// Todo se mide como con la cinta, parado en la vereda mirando el lote:
// desde la LÍNEA MUNICIPAL hacia el fondo y desde el LATERAL IZQUIERDO
// hacia la derecha, hasta el borde de cada cosa. Los retiros y las
// distancias mínimas los carga el diseñador (cambian según el municipio).
// Cada cambio se valida en App (cambiar), igual que el resto.
// ==========================================================

import { useId } from 'react';
import Tarjeta from './Tarjeta.jsx';
import CampoNumero from './CampoNumero.jsx';
import CampoOpcional from './CampoOpcional.jsx';
import CampoSelect from './CampoSelect.jsx';
import { TIPOS_ELEMENTO, RUMBOS, elementoNuevo, rumboDe } from '../motor/terreno.js';
import { nombreLado } from '../motor/geometria.js';

const f2 = (n) => `${n.toFixed(2)} m`;

/** Nombre editable de un elemento (texto libre, ej. "Pozo nuevo", "Quincho"). */
function CampoNombre({ valor, onCambio }) {
  const id = useId();
  return (
    <div className="group">
      <label htmlFor={id}>Nombre</label>
      <input id={id} type="text" value={valor} maxLength={40} onChange={(e) => onCambio(e.target.value)} />
    </div>
  );
}

/** Un elemento del terreno: dónde está y cuánto mide. */
function Elemento({ el, i, unidad, cambiar, onQuitar, pozo }) {
  const ruta = `terreno.elementos.${i}`;
  const tipo = TIPOS_ELEMENTO[el.tipo];
  const medida = (campo, etiqueta) => (
    <CampoNumero etiqueta={etiqueta} unidad={unidad} valor={el[campo]} onCambio={cambiar(`${ruta}.${campo}`)} />
  );
  return (
    <section className="elemento-terreno">
      <header>
        <span className="muestra-elemento" style={{ background: tipo.color }} aria-hidden="true" />
        <strong>{el.nombre || tipo.nombre}</strong> <small>{el.nombre && el.nombre !== tipo.nombre ? tipo.nombre : ''}</small>
        <button type="button" className="btn-del" onClick={onQuitar} aria-label={`Quitar ${el.nombre}`} title="Quitar">✕</button>
      </header>
      <div className="grid-params">
        <CampoNombre valor={el.nombre} onCambio={(v) => cambiar(`${ruta}.nombre`)(v)} />
        {medida('distanciaFrente', 'A la línea municipal')}
        {medida('distanciaIzquierda', 'Al lateral izquierdo')}
        {tipo.forma === 'circulo' ? medida('diametro', el.tipo === 'arbol' ? 'Diámetro de la copa' : 'Diámetro') : (<>
          {medida('ancho', 'Ancho (paralelo a la calle)')}
          {medida('largo', 'Largo (hacia el fondo)')}
        </>)}
        {(el.tipo === 'arbol' || el.tipo === 'construccion') && medida('alto', 'Alto')}
      </div>
      {pozo && (
        <p className="nota">
          Desde el borde del pozo: a la casa <strong>{f2(pozo.aCasa)}</strong> · lateral izq. {f2(pozo.izquierda)} ·
          lateral der. {f2(pozo.derecha)} · fondo {f2(pozo.fondo)}
        </p>
      )}
    </section>
  );
}

/**
 * @param implantacion  resultado de implantacion(params) (distancias, avisos, pozos)
 * @param onVerTerreno  acomoda la cámara del 3D para ver todo el lote
 */
export default function PanelTerreno({ params, unidad, cambiar, implantacion, onVerTerreno }) {
  const t = params.terreno;
  const medida = (campo, etiqueta) => (
    <CampoNumero etiqueta={etiqueta} unidad={unidad} valor={campo.split('.').reduce((o, k) => o[k], t)} onCambio={cambiar(`terreno.${campo}`)} />
  );
  const minimo = (campo, casilla, etiqueta) => (
    <CampoOpcional casilla={casilla} etiqueta={etiqueta} unidad={unidad} valorPorDefecto={1}
      valor={campo.split('.').reduce((o, k) => o[k], t)} onCambio={cambiar(`terreno.${campo}`)} />
  );

  const agregar = (tipo) => {
    const id = Math.max(0, ...t.elementos.map((e) => e.id)) + 1;
    cambiar('terreno.elementos')([...t.elementos, elementoNuevo(tipo, t, id)]);
  };
  const quitar = (id) => cambiar('terreno.elementos')(t.elementos.filter((e) => e.id !== id));
  // El rumbo exacto si coincide con uno de la lista; si no, "otro" (se ve en grados).
  const rumbo = RUMBOS.find(([, g]) => g === t.orientacion)?.[0] ?? 'otro';

  return (
    <Tarjeta id="terreno" titulo="Terreno e implantación">
      <label className="casilla-opcional">
        <input type="checkbox" checked={t.activo} onChange={(e) => cambiar('terreno.activo')(e.target.checked)} />
        Ubicar la obra en un terreno
      </label>
      {!t.activo && <p className="nota">Cargá el lote, a qué distancia va la casa, el pozo, árboles, accesos y el norte. Se ve en el 3D y en Planos.</p>}
      {t.activo && (<>
        <p className="nota">
          Todo se mide parado en la vereda mirando el lote: desde la <strong>línea municipal</strong> hacia el fondo y
          desde el <strong>lateral izquierdo</strong>, hasta el borde de cada cosa. El {nombreLado(params.ladoFrente, params.ladoFrente).toLowerCase()} de
          la casa (lado {params.ladoFrente}) mira a la calle.
        </p>

        <h3 className="subtitulo">Lote</h3>
        <div className="grid-params">
          {medida('frente', 'Frente (sobre la calle)')}
          {medida('fondo', 'Fondo')}
          <CampoSelect etiqueta="La calle está hacia el" valor={rumbo}
            opciones={[...RUMBOS.map(([r]) => [r, r]), ...(rumbo === 'otro' ? [['otro', `${t.orientacion}° (cerca del ${rumboDe(t.orientacion)})`]] : [])]}
            onCambio={(r) => (r === 'otro' ? null : cambiar('terreno.orientacion')(RUMBOS.find(([n]) => n === r)[1]))} />
          <CampoNumero etiqueta="Orientación exacta" sufijo="°" decimales={0} valor={t.orientacion} onCambio={cambiar('terreno.orientacion')} />
        </div>

        <h3 className="subtitulo">Dónde va la casa</h3>
        <div className="grid-params">
          {medida('distanciaFrente', 'A la línea municipal')}
          {medida('distanciaIzquierda', 'Al lateral izquierdo')}
        </div>
        <p className="distancias-casa">
          Quedan <strong>{f2(implantacion.distancias.derecha)}</strong> al lateral derecho y
          {' '}<strong>{f2(implantacion.distancias.fondo)}</strong> al fondo.
        </p>

        <h3 className="subtitulo">Retiros y mínimos de tu municipio</h3>
        <p className="nota">Cambian según la zona: cargá los que te pidan. Sin tildar, no se controlan.</p>
        <div className="grid-params">
          {minimo('retiros.frente', 'Retiro de frente', 'Mínimo')}
          {minimo('retiros.fondo', 'Retiro de fondo', 'Mínimo')}
          {minimo('retiros.izquierda', 'Retiro lateral izq.', 'Mínimo')}
          {minimo('retiros.derecha', 'Retiro lateral der.', 'Mínimo')}
          {minimo('minimoPozoCasa', 'Pozo a la casa', 'Mínimo')}
          {minimo('minimoPozoMedianera', 'Pozo a medianeras', 'Mínimo')}
        </div>

        <h3 className="subtitulo">En el terreno</h3>
        <div className="botones-agregar">
          {Object.entries(TIPOS_ELEMENTO).map(([tipo, d]) => (
            <button key={tipo} type="button" className="btn-sec" onClick={() => agregar(tipo)}>+ {d.nombre}</button>
          ))}
        </div>
        {t.elementos.length === 0 && <p className="vacio">Todavía no agregaste nada (pozo, árboles, accesos…).</p>}
        {t.elementos.map((el, i) => (
          <Elemento key={el.id} el={el} i={i} unidad={unidad} cambiar={cambiar} onQuitar={() => quitar(el.id)}
            pozo={implantacion.pozos.find((p) => p.id === el.id)} />
        ))}

        {implantacion.avisos.length > 0 ? (
          <ul className="avisos-terreno" role="status">
            {implantacion.avisos.map((a) => <li key={a.texto} className={a.nivel}>{a.nivel === 'error' ? '⛔' : '⚠'} {a.texto}</li>)}
          </ul>
        ) : <p className="ok-terreno" role="status">✓ La casa entra y respeta lo que cargaste.</p>}
        <button type="button" className="btn-sec" onClick={onVerTerreno}>Ver el terreno en el 3D</button>
      </>)}
    </Tarjeta>
  );
}
