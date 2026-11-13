// ==========================================================
// PanelInstalaciones (v1.57): eléctrica, agua, desagües y gas
// ----------------------------------------------------------
// Un sistema a la vez (pestañas chicas arriba). En cada uno:
//   - Puntos: qué es (toma, canilla, garrafa…), en qué pared, a qué
//     distancia de su esquina izquierda (vista desde afuera), a qué altura
//     y cuánto hacia adentro.
//   - Tramos: de qué punto a qué punto, con qué caño o canalización, a qué
//     altura corre por afuera y el largo extra (lo que va afuera de la casa).
//   - Lista de materiales con su precio (editable): se suma al presupuesto.
// Cuentas en motor/instalaciones.js. Cada cambio se valida en App.
// ==========================================================

import { useState } from 'react';
import Tarjeta from './Tarjeta.jsx';
import FichaPlegable from './FichaPlegable.jsx';
import CampoNumero from './CampoNumero.jsx';
import CampoSelect from './CampoSelect.jsx';
import {
  SISTEMAS, TIPOS_PUNTO, MATERIALES_TRAMO, SECCIONES_CABLE, puntoNuevo, tramoNuevo, materialesDelSistema, completarInstalaciones,
  recorridoDelTramo, pisoDeLaObra, colorSistema,
} from '../motor/instalaciones.js';
import { LADOS } from '../motor/constantes.js';
import { nombreDePared } from '../motor/geometria.js';

const pesos = (n) => n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
const m2 = (n) => `${n.toFixed(2).replace('.', ',')} m`;

function Punto({ p, i, params, unidad, cambiar, onQuitar, abierta }) {
  const ruta = `instalaciones.puntos.${i}`;
  const tipo = TIPOS_PUNTO[p.sistema][p.tipo];
  return (
    <FichaPlegable clave={`punto:${p.id}`} className="rubro punto-instalacion" abiertaAlInicio={abierta}
      encabezado={<>
        <span className="muestra-color" style={{ background: colorSistema(p.sistema) }} />
        <strong>{p.nombre}</strong>
        <small>{nombreDePared(p.lado, params)} · a {m2(p.distancia)} · alto {m2(p.altura)}{p.adentro > 0 ? ` · ${m2(p.adentro)} adentro` : ''}</small>
      </>}
      acciones={<button type="button" className="btn-del" onClick={onQuitar} aria-label={`Quitar ${p.nombre}`} title="Quitar">✕</button>}>
      <div className="grid-params">
        <div className="group">
          <label>Nombre
            <input type="text" maxLength={40} value={p.nombre} onChange={(e) => cambiar(`${ruta}.nombre`)(e.target.value)} />
          </label>
        </div>
        <CampoSelect etiqueta="Pared" valor={p.lado} opciones={LADOS.map((l) => [l, nombreDePared(l, params)])} onCambio={cambiar(`${ruta}.lado`)} />
        <CampoSelect etiqueta="Piso" valor={p.nivel} opciones={[['piso', 'Planta baja'], ['piso2', 'Entrepiso']]} onCambio={cambiar(`${ruta}.nivel`)} />
        <CampoNumero etiqueta="Desde la esquina izquierda (vista desde afuera)" unidad={unidad} valor={p.distancia} onCambio={cambiar(`${ruta}.distancia`)} />
        <CampoNumero etiqueta="Altura (desde el piso)" unidad={unidad} valor={p.altura} onCambio={cambiar(`${ruta}.altura`)} />
        <CampoNumero etiqueta="Hacia adentro (ej. lámpara de techo)" unidad={unidad} valor={p.adentro} onCambio={cambiar(`${ruta}.adentro`)} />
      </div>
      <p className="nota">Lleva: {tipo.lleva.map(([n, c]) => (c > 1 ? `${c} ${n}` : n)).join(', ')}.</p>
    </FichaPlegable>
  );
}

function Tramo({ t, i, puntos, params, estructura, unidad, cambiar, onQuitar, abierta }) {
  const ruta = `instalaciones.tramos.${i}`;
  const delSistema = puntos.filter((p) => p.sistema === t.sistema);
  const opcionesPunto = [['', 'Elegí un punto'], ...delSistema.map((p) => [String(p.id), p.nombre])];
  const r = recorridoDelTramo(t, puntos, params, pisoDeLaObra(params, estructura));
  const material = MATERIALES_TRAMO[t.sistema][t.material];
  const nombrePunta = (id) => delSistema.find((p) => p.id === id)?.nombre ?? '?';
  return (
    <FichaPlegable clave={`tramo:${t.id}`} className="rubro tramo-instalacion" abiertaAlInicio={abierta}
      encabezado={<>
        <strong>{nombrePunta(t.desde)} → {nombrePunta(t.hasta)}</strong>
        <small>{r ? `${m2(r.largo)} · ${r.curvas} curvas` : 'faltan las puntas'} · {material?.nombre}</small>
      </>}
      acciones={<button type="button" className="btn-del" onClick={onQuitar} aria-label="Quitar el tramo" title="Quitar">✕</button>}>
      <div className="grid-params">
        <CampoSelect etiqueta="Desde" valor={t.desde === null ? '' : String(t.desde)} opciones={opcionesPunto}
          onCambio={(v) => cambiar(`${ruta}.desde`)(v === '' ? null : Number(v))} />
        <CampoSelect etiqueta="Hasta" valor={t.hasta === null ? '' : String(t.hasta)} opciones={opcionesPunto}
          onCambio={(v) => cambiar(`${ruta}.hasta`)(v === '' ? null : Number(v))} />
        <CampoSelect etiqueta={t.sistema === 'electrica' ? 'Canalización' : 'Caño'} valor={t.material}
          opciones={Object.entries(MATERIALES_TRAMO[t.sistema]).map(([k, m]) => [k, m.nombre])} onCambio={cambiar(`${ruta}.material`)} />
        {t.sistema === 'electrica' && (
          <CampoSelect etiqueta="Cable" valor={String(t.seccion)} opciones={SECCIONES_CABLE.map((s) => [String(s), `${String(s).replace('.', ',')} mm²`])}
            onCambio={(v) => cambiar(`${ruta}.seccion`)(Number(v))} />
        )}
        <CampoNumero etiqueta="Altura del recorrido por afuera (desde el piso)" unidad={unidad} valor={t.alturaRecorrido} onCambio={cambiar(`${ruta}.alturaRecorrido`)} />
        <CampoNumero etiqueta="Largo extra (afuera: hasta la cámara, la garrafa…)" unidad={unidad} valor={t.largoExtra} onCambio={cambiar(`${ruta}.largoExtra`)} />
      </div>
      {r && <p className="nota">Recorrido: {m2(r.horizontal)} por afuera{r.esquinas ? ` (${r.esquinas} esquina${r.esquinas > 1 ? 's' : ''})` : ''} + {m2(r.vertical)} de subidas y bajadas
        {t.largoExtra > 0 ? ` + ${m2(t.largoExtra)} extra` : ''} = <strong>{m2(r.largo)}</strong>, {r.curvas} curvas.</p>}
    </FichaPlegable>
  );
}

export default function PanelInstalaciones({ params, estructura, unidad, cambiar }) {
  const inst = completarInstalaciones(params.instalaciones);
  const [sistema, setSistema] = useState('electrica');
  const [tipo, setTipo] = useState('toma');
  const [recien, setRecien] = useState(null);
  const [aviso, setAviso] = useState(null);
  const tipos = TIPOS_PUNTO[sistema];
  const tipoValido = tipos[tipo] ? tipo : Object.keys(tipos)[0];
  const puntos = inst.puntos.map((p, i) => ({ p, i })).filter(({ p }) => p.sistema === sistema);
  const tramos = inst.tramos.map((t, i) => ({ t, i })).filter(({ t }) => t.sistema === sistema);
  const { materiales, total } = materialesDelSistema(params, estructura, sistema);
  const agregarPunto = () => {
    const nuevo = puntoNuevo(inst.puntos, sistema, tipoValido);
    setRecien(`p${nuevo.id}`);
    setAviso(cambiar('instalaciones.puntos')([...inst.puntos, nuevo]));
  };
  const agregarTramo = () => {
    // Arranca uniendo los dos últimos puntos del sistema (se cambian en la ficha).
    const ids = puntos.map(({ p }) => p.id);
    const nuevo = tramoNuevo(inst.tramos, sistema, ids.at(-2) ?? null, ids.at(-1) ?? null);
    setRecien(`t${nuevo.id}`);
    setAviso(cambiar('instalaciones.tramos')([...inst.tramos, nuevo]));
  };
  const quitarPunto = (id) => setAviso(cambiar('instalaciones')({
    ...inst, puntos: inst.puntos.filter((p) => p.id !== id),
    // Los tramos que llegaban a ese punto quedan con esa punta vacía (para elegir otra).
    tramos: inst.tramos.map((t) => ({ ...t, desde: t.desde === id ? null : t.desde, hasta: t.hasta === id ? null : t.hasta })),
  }));
  const cambiarPrecio = (nombre) => (v) => cambiar('instalaciones.precios')({ ...inst.precios, [nombre]: v });

  return (
    <Tarjeta id="instalaciones" titulo="Instalaciones">
      <p className="nota">Van por afuera de la casa, atornilladas a la estructura: cada tramo sale del punto, atraviesa la pared, sube o
        baja a la altura del recorrido y da la vuelta por afuera por el lado más corto. Se ven en el 3D (Capas → Instalaciones) y en Planos.</p>
      <div className="pestanas-capas" role="tablist" aria-label="Sistema">
        {SISTEMAS.map(([v, nombre, color]) => (
          <button key={v} type="button" role="tab" aria-selected={v === sistema} className={`chip-capas${v === sistema ? ' activa' : ''}`}
            onClick={() => setSistema(v)}>
            <span className="muestra-color" style={{ background: color }} /> {nombre}
            {' '}<small>({inst.puntos.filter((p) => p.sistema === v).length})</small>
          </button>
        ))}
      </div>

      <h4 className="subtitulo-pared">Puntos</h4>
      {puntos.length === 0 && <p className="vacio">Todavía no hay puntos de este sistema.</p>}
      {puntos.map(({ p, i }) => (
        <Punto key={p.id} p={p} i={i} params={params} unidad={unidad} cambiar={cambiar} onQuitar={() => quitarPunto(p.id)} abierta={recien === `p${p.id}`} />
      ))}
      <div className="acciones-seguimiento">
        <select value={tipoValido} aria-label="Punto a agregar" onChange={(e) => setTipo(e.target.value)}>
          {Object.entries(tipos).map(([k, t]) => <option key={k} value={k}>{t.nombre}</option>)}
        </select>
        <button type="button" className="btn-sec" onClick={agregarPunto}>+ Punto</button>
      </div>

      <h4 className="subtitulo-pared">Tramos</h4>
      {tramos.length === 0 && <p className="vacio">{puntos.length < 2 ? 'Agregá al menos dos puntos para unirlos.' : 'Todavía no hay tramos.'}</p>}
      {tramos.map(({ t, i }) => (
        <Tramo key={t.id} t={t} i={i} puntos={inst.puntos} params={params} estructura={estructura} unidad={unidad} cambiar={cambiar}
          onQuitar={() => cambiar('instalaciones.tramos')(inst.tramos.filter((x) => x.id !== t.id))} abierta={recien === `t${t.id}`} />
      ))}
      {puntos.length >= 2 && <button type="button" className="btn-sec" onClick={agregarTramo}>+ Tramo</button>}

      {materiales.length > 0 && (<>
        <h4 className="subtitulo-pared">Materiales</h4>
        <table className="tabla-segmentos tabla-materiales-instalacion">
          <thead><tr><th>Material</th><th className="num">Cantidad</th><th className="num">Precio</th><th className="num">Total</th></tr></thead>
          <tbody>
            {materiales.map((m) => (
              <tr key={m.nombre}>
                <td>{m.nombre}</td>
                <td className="num">{Number.isInteger(m.cantidad) ? m.cantidad : m.cantidad.toFixed(1)} {m.unidad}</td>
                <td className="num"><CampoNumero etiqueta="" sufijo="$" decimales={0} valor={m.precio} onCambio={cambiarPrecio(m.nombre)} /></td>
                <td className="num">{pesos(m.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="nota resumen-mesada" role="status">Total de materiales: <strong>{pesos(total)}</strong> (va al presupuesto). Los precios
          son de ejemplo o 0: cargá los tuyos.</p>
      </>)}
      {aviso && <p className="error" role="alert">{aviso}</p>}
    </Tarjeta>
  );
}
