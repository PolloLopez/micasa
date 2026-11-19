// ==========================================================
// TarjetaMateriales: QUÉ es cada material (v1.15).
// ----------------------------------------------------------
// Acá el herrero carga cada material una vez:
//   - Perfiles (v1.21): la lista de hierros (tipo, medidas, barra, precio,
//     peso) y qué perfil va en cada parte de la obra.
//   - Otros materiales: descripción (OSB, pilotines, madera…).
//   - Revestimientos (paneles, chapas, placas, durlock): cómo se vende
//     (a medida o en placas estándar), sus medidas, el espesor, dónde
//     va respecto de la estructura y sus dos colores.
// El presupuesto (TablaPresupuesto) queda solo con cantidades y precios.
// Todo se guarda en el catálogo (viaja con el proyecto).
// v1.65 (Leandro: "agregando materiales y proveedores desde ahí, que sean
// expansibles"): cada apartado se pliega y cada material o proveedor es una
// ficha plegable con su precio en el encabezado. Cada proveedor trae adentro
// la lista de TODOS los precios de la obra en él.
// ==========================================================

import { useMemo, useState } from 'react';
import CampoNumero from './CampoNumero.jsx';
import CampoOpcional from './CampoOpcional.jsx';
import CampoSelect from './CampoSelect.jsx';
import Tarjeta from './Tarjeta.jsx';
import ListaPerfiles from './ListaPerfiles.jsx';
import SelectorPerfil from './SelectorPerfil.jsx';
import { LIMITES_ACCESORIO } from '../motor/presupuesto.js';
import { BotonResaltar } from './Resaltar.jsx';
import { useResaltar, criterioDeRenglon as criterioDe } from './contextoResaltado.js';
import { LIMITES_REVESTIMIENTO } from '../motor/revestimientos.js';
import { perfilesDeLista } from '../motor/perfiles.js';
import { aplicarProveedor, proveedoresDe, todosLosProveedores } from '../motor/proveedores.js';
import PreciosProveedores from './PreciosProveedores.jsx';
import { ContextoAgregarProveedor } from './contextoProveedores.js';
import ListaProveedores from './ListaProveedores.jsx';
import FichaPlegable from './FichaPlegable.jsx';
import SeccionPlegable from './SeccionPlegable.jsx';
import { textoDePrecio, preciosOrdenados } from '../motor/resumenPrecios.js';
import { nombrePerfil } from '../motor/perfiles.js';
import { BASES_CONSUMIBLE, ESTIMACION_DE_FABRICA, esEstimado } from '../motor/consumibles.js';

/** Valida un número contra sus límites y, si está bien, lo guarda. */
const conLimites = ({ min, max }, actualizar, enTexto = (n) => `${n} m`) => (v) => {
  if (!Number.isFinite(v) || v < min) return `Mínimo ${enTexto(min)}`;
  if (v > max) return `Máximo ${enTexto(max)}`;
  actualizar(v);
  return null;
};

/** El precio en una línea, para el encabezado plegado (ver motor/resumenPrecios.js). */
function PrecioCorto({ precio }) {
  return <small className={precio.falta || precio.sospechoso ? 'falta' : ''}>{precio.texto}{precio.sospechoso ? ' · ⚠ precio para revisar' : ''}</small>;
}

/** Un tipo de revestimiento con todos sus datos. */
function Revestimiento({ tipo, unidad, usos, unicoQueda, proveedores, precio, nuevo, onCambiar, onQuitar, onCambiarPrecio, ahorro = null, precioUnitario = null }) {
  const cambiar = (campo) => (valor) => onCambiar(tipo.id, campo, valor);
  const medida = (campo, etiqueta) => (
    <CampoNumero key={campo} etiqueta={etiqueta} unidad={unidad} valor={tipo[campo]}
      onCambio={conLimites(LIMITES_REVESTIMIENTO[campo], cambiar(campo))} />
  );
  const motivoNoBorrar = usos.length > 0 ? `En uso: ${usos.join(', ')}` : unicoQueda ? 'Tiene que quedar al menos uno' : null;
  // v1.68: ancho total y encastre (el útil = total − encastre). Sin ancho total cargado (proyectos de antes): total = útil.
  const total = tipo.anchoTotal > 0 ? tipo.anchoTotal : tipo.anchoUtil;
  const encastre = Math.max(0, total - tipo.anchoUtil);
  const cambiarAnchos = (nuevoTotal, nuevoEncastre) => {
    const util = Number((nuevoTotal - nuevoEncastre).toFixed(4));
    const { min, max } = LIMITES_REVESTIMIENTO.anchoUtil;
    if (!(nuevoEncastre >= 0) || nuevoEncastre >= nuevoTotal) return 'El encastre tiene que ser menor que el ancho total';
    if (util < min || util > max) return `El ancho útil queda en ${util.toFixed(2)} m: tiene que estar entre ${min} y ${max} m`;
    if (nuevoTotal > LIMITES_REVESTIMIENTO.anchoTotal.max) return `Máximo ${LIMITES_REVESTIMIENTO.anchoTotal.max} m`;
    onCambiar(tipo.id, 'anchoTotal', nuevoTotal);
    onCambiar(tipo.id, 'anchoUtil', util);
    return null;
  };

  return (
    <FichaPlegable clave={`revestimiento:${tipo.id}`} className="rubro" abiertaAlInicio={nuevo}
      encabezado={<><span className="muestra-chica" style={{ background: tipo.color }} aria-hidden="true" /><strong>{tipo.nombre}</strong>
        <small>{tipo.venta === 'estandar' ? 'placa fija' : 'a medida'} · {tipo.espesor} mm · {usos.length > 0 ? `en ${usos.length} lugar${usos.length === 1 ? '' : 'es'}` : 'sin uso'}</small>
        <PrecioCorto precio={precio} /></>}>
      <div className="abertura-titulo">
        {/* Dos colores: la cara de afuera y la de adentro (se ven distintas en el 3D). */}
        <label className="color-cara" title="Color exterior">
          <input type="color" className="muestra" value={tipo.color} aria-label={`Color exterior de ${tipo.nombre}`}
            onChange={(e) => cambiar('color')(e.target.value)} />
          <span>Ext.</span>
        </label>
        <label className="color-cara" title="Color interior">
          <input type="color" className="muestra" value={tipo.colorInterior} aria-label={`Color interior de ${tipo.nombre}`}
            onChange={(e) => cambiar('colorInterior')(e.target.value)} />
          <span>Int.</span>
        </label>
        <input className="perfil nombre-panel" value={tipo.nombre} aria-label="Nombre del revestimiento"
          onChange={(e) => cambiar('nombre')(e.target.value)} />
      </div>
      <div className="grid-params">
        <div className="group">
          <label htmlFor={`desc-${tipo.id}`}>Descripción</label>
          <input id={`desc-${tipo.id}`} value={tipo.perfil} placeholder="ej. Panel PUR 50 mm"
            onChange={(e) => cambiar('perfil')(e.target.value)} />
        </div>
        <CampoSelect etiqueta="Cómo se vende" valor={tipo.venta} onCambio={cambiar('venta')}
          opciones={[['medida', 'A medida'], ['estandar', 'Placa fija']]} />
        {tipo.venta === 'medida' ? (<>
          {/* v1.63.1 (Leandro: "ancho útil y solape parecen lo mismo"): son dos cosas distintas, ahora dicho en la etiqueta.
              Ancho útil = lo que cubre cada tira a lo ancho (ya descontado el machimbre). El solape es solo a lo LARGO,
              cuando la pared es más alta que el largo máximo y la tira va en dos tramos encimados. */}
          {/* v1.68 (Leandro: "no es claro el ancho total con el ancho útil: sería lo mismo que restar el encastre"):
              se cargan los dos datos del catálogo del panel (ancho total y encastre) y el ancho útil sale solo.
              Ej. Alpanel: 1000 mm − 50 mm de encastre = 950 mm útiles. */}
          <CampoNumero etiqueta="Ancho total de la tira (catálogo)" unidad={unidad} valor={total}
            onCambio={(v) => cambiarAnchos(v, encastre)} />
          <CampoNumero etiqueta="Encastre (lo que monta sobre la de al lado)" sufijo="mm" decimales={0} valor={Math.round(encastre * 1000)}
            onCambio={(mm) => cambiarAnchos(total, mm / 1000)} />
          <p className="nota ancho-util" role="status">Cubre <strong>{tipo.anchoUtil.toFixed(3).replace('.', ',')} m</strong> por tira (ancho útil = total − encastre).</p>
          {medida('largoMaximo', 'Largo máximo de una tira')}
          <CampoOpcional casilla="Tiras en tramos encimados (solo si la pared pasa el largo máximo; si no, a tope)" etiqueta="Encimado entre tramos"
            unidad={unidad} valor={tipo.solape} valorPorDefecto={0.15}
            onCambio={conLimites({ ...LIMITES_REVESTIMIENTO.solape, max: Math.min(LIMITES_REVESTIMIENTO.solape.max, tipo.largoMaximo - 0.01) }, cambiar('solape'))} />
          {/* v1.68: dónde va la tira cortada a lo largo y cuánto costado mínimo se deja al lado de una abertura. */}
          <CampoSelect etiqueta="La tira angosta (cortada a lo largo) va" valor={tipo.tiraAngosta ?? 'derecha'} onCambio={cambiar('tiraAngosta')}
            opciones={[['derecha', 'A la derecha (vista desde afuera)'], ['izquierda', 'A la izquierda'], ['repartida', 'Repartida: media en cada punta']]} />
          {medida('costadoMinimo', 'Costado mínimo al lado de una abertura (menos: la tira se parte)')}
          {/* v1.67: para el plano de cada panel: qué costado encastra encima de la tira de al lado. */}
          <CampoSelect etiqueta="Lado que superpone (vista desde afuera)" valor={tipo.ladoSolape ?? 'izquierda'} onCambio={cambiar('ladoSolape')}
            opciones={[['izquierda', 'Izquierdo: se coloca de izquierda a derecha'], ['derecha', 'Derecho: se coloca de derecha a izquierda']]} />
          {/* v1.63: la tira angosta de una pared se corta (a lo largo) del retazo de la de otra pared: se compra una menos. */}
          <label className="casilla-opcional">
            <input type="checkbox" checked={tipo.aprovecharRetazos !== false} onChange={(e) => cambiar('aprovecharRetazos')(e.target.checked)} />
            Aprovechar retazos entre paredes (la tira angosta sale de lo que sobra de otra)
          </label>
        </>) : (<>
          {medida('anchoPlaca', 'Ancho de placa')}
          {medida('largoPlaca', 'Largo de placa')}
        </>)}
        <CampoNumero etiqueta="Espesor" sufijo="mm" decimales={0} valor={tipo.espesor}
          onCambio={conLimites(LIMITES_REVESTIMIENTO.espesor, cambiar('espesor'), (n) => `${n} mm`)} />
        <CampoSelect etiqueta="Ubicación" valor={tipo.ubicacion} onCambio={cambiar('ubicacion')}
          opciones={[['cara', 'Sobre los perfiles'], ['eje', 'Entre perfiles']]} />
      </div>
      {/* v1.71: pedirlo cortado en las aberturas (el proveedor saca los huecos) o entero y cortar en obra. */}
      <label className="casilla-opcional">
        <input type="checkbox" checked={tipo.descontarAberturas !== false} onChange={(e) => cambiar('descontarAberturas')(e.target.checked)} />
        Descontar las aberturas (se pide cortado: el proveedor saca los huecos). Sin tildar: {tipo.venta === 'estandar' ? 'placas' : 'tiras'} enteras, los huecos se cortan en obra.
      </label>
      {ahorro && ahorro.sinDescuento > 0 && (
        <p className={`nota ahorro-aberturas${ahorro.ahorro > 0 ? '' : ' sin-ahorro'}`} role="status">
          {ahorro.ahorro > 0 ? (<>
            Descontando las aberturas pedís <strong>{ahorro.conDescuento.toLocaleString('es-AR')} {ahorro.unidad}</strong> en vez
            de {ahorro.sinDescuento.toLocaleString('es-AR')}: te ahorrás <strong>{ahorro.ahorro.toLocaleString('es-AR')} {ahorro.unidad}</strong>
            {precioUnitario ? <> ≈ <strong>{Math.round(ahorro.ahorro * precioUnitario.precio).toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })}</strong> (a {precioUnitario.precio.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })} en {precioUnitario.proveedor.nombre})</> : ' (cargá su precio para ver cuánta plata)'}.
            {' '}Es lo que arriesgás si un hueco viene mal cortado.{tipo.descontarAberturas === false ? ' Ahora lo estás pidiendo entero.' : ''}
          </>) : 'Las aberturas no cambian lo que se pide (ninguna parte una tira entera).'}
        </p>
      )}
      {/* v1.25: precio en cada proveedor. A medida se cobra por m²; placa fija, por placa. */}
      <PreciosProveedores material={tipo} proveedores={proveedores} unidad={tipo.venta === 'estandar' ? 'placa' : 'm²'}
        onCambiar={(idProveedor, campo, valor) => onCambiarPrecio(tipo.id, idProveedor, campo, valor)} />
      {/* v1.27: Eliminar en el pie (antes un ✕ al lado del nombre, que parecía "cerrar"). */}
      <small className="detalle">{usos.length > 0 ? `Usado en: ${usos.join(', ')}` : 'Sin uso'}</small>
      <div className="pie-acciones no-print">
        <button className="btn-del eliminar-aparte" onClick={() => onQuitar(tipo.id)}
          disabled={Boolean(motivoNoBorrar)} title={motivoNoBorrar ?? 'Eliminar revestimiento'}
          aria-label={`Eliminar ${tipo.nombre}`}>Eliminar</button>
      </div>
    </FichaPlegable>
  );
}

/**
 * Un accesorio (v1.29): nombre, descripción, cantidad, unidad y precio por proveedor.
 * v1.48: la cantidad se carga a mano o se estima sola (medida de la obra x coeficiente, ver motor/consumibles.js).
 * @param calculado el renglón del presupuesto (cantidad y cómo se estimó), o null si no entra
 */
function Accesorio({ accesorio: a, calculado, proveedores, precio, nuevo, onCambiar, onQuitar, onCambiarPrecio }) {
  const estimado = esEstimado(a);
  const cambiarCoeficiente = (v) => {
    if (v < 0 || v > 1000) return 'Entre 0 y 1000';
    onCambiar(a.id, { coeficiente: v });
    return null;
  };
  // Al pasar a estimado sin base elegida, arranca con la de fábrica (si es uno de los de siempre) o con los kg de hierro.
  const cambiarModo = (modo) => onCambiar(a.id, modo === 'estimado' && !BASES_CONSUMIBLE[a.base]
    ? { modo, base: ESTIMACION_DE_FABRICA[a.id]?.base ?? 'kgHierro', coeficiente: a.coeficiente || ESTIMACION_DE_FABRICA[a.id]?.coeficiente || 0 }
    : { modo });
  const texto = (campo, largo) => (e) => onCambiar(a.id, { [campo]: e.target.value.slice(0, largo) });
  const cambiarCantidad = (v) => {
    const { min, max } = LIMITES_ACCESORIO.cantidad;
    if (v < min || v > max) return `Entre ${min} y ${max}`;
    onCambiar(a.id, { cantidad: v });
    return null;
  };
  const cantidad = estimado ? (calculado?.cantidad ?? 0) : a.cantidad;
  return (
    <FichaPlegable clave={`accesorio:${a.id}`} className="rubro accesorio" abiertaAlInicio={nuevo}
      encabezado={<><strong>{a.nombre || 'Sin nombre'}</strong>
        <small className={cantidad > 0 ? '' : 'falta'}>{cantidad > 0 ? `${cantidad} ${a.unidad}${estimado ? ' (estimada)' : ''}` : 'cantidad 0: no entra al presupuesto'}</small>
        <PrecioCorto precio={precio} /></>}>
      <div className="grid-params">
        <div className="group">
          <label htmlFor={`acc-nombre-${a.id}`}>Nombre</label>
          <input id={`acc-nombre-${a.id}`} type="text" maxLength={60} value={a.nombre} onChange={texto('nombre', 60)} />
        </div>
        <div className="group">
          <label htmlFor={`acc-desc-${a.id}`}>Descripción</label>
          <input id={`acc-desc-${a.id}`} type="text" maxLength={120} value={a.perfil} placeholder="ej. T2 punta mecha 14x1" onChange={texto('perfil', 120)} />
        </div>
        <CampoSelect etiqueta="Cantidad" valor={estimado ? 'estimado' : 'manual'}
          opciones={[['estimado', 'Estimada sola'], ['manual', 'A mano']]} onCambio={cambiarModo} />
        {estimado ? (<>
          <CampoSelect etiqueta="Según" valor={a.base} opciones={Object.entries(BASES_CONSUMIBLE).map(([k, b]) => [k, b.nombre])}
            onCambio={(base) => onCambiar(a.id, { base })} />
          <CampoNumero etiqueta={`${a.unidad || 'u'} por ${BASES_CONSUMIBLE[a.base].unidad}`} decimales={4} valor={a.coeficiente}
            onCambio={cambiarCoeficiente} />
        </>) : (
          <CampoNumero etiqueta="Cantidad a comprar" decimales={2} valor={a.cantidad} onCambio={cambiarCantidad} />
        )}
        <div className="group">
          <label htmlFor={`acc-unidad-${a.id}`}>Unidad</label>
          <input id={`acc-unidad-${a.id}`} type="text" maxLength={15} value={a.unidad} placeholder="caja, kg, u…" onChange={texto('unidad', 15)} />
        </div>
      </div>
      {estimado && (
        <p className="nota" role="status">
          {calculado ? <>≈ <strong>{calculado.cantidad} {a.unidad}</strong> ({calculado.detalle.replace('estimado: ', '')})</> : 'Esta obra no lleva (0).'}
          {ESTIMACION_DE_FABRICA[a.id] && <small> · de fábrica: {ESTIMACION_DE_FABRICA[a.id].ayuda} (orientativo, validalo con el herrero)</small>}
        </p>
      )}
      <PreciosProveedores material={a} proveedores={proveedores} unidad={a.unidad}
        onCambiar={(idProveedor, campo, valor) => onCambiarPrecio(a.id, idProveedor, campo, valor)} />
      <div className="pie-acciones no-print">
        <button className="btn-del eliminar-aparte" onClick={() => onQuitar(a.id)} aria-label={`Eliminar ${a.nombre}`}>Eliminar</button>
      </div>
    </FichaPlegable>
  );
}

/**
 * @param items          renglones del presupuesto (para mostrar solo los materiales de este proyecto)
 * @param catalogo       catálogo guardado (con la lista de perfiles, categoria 'hierro')
 * @param revestimientos tipos de revestimiento del catálogo (null = el proyecto no usa: grada, montaje)
 */
// v1.73: el título de la tarjeta según la sub-pestaña.
const TITULOS = { proveedores: `Proveedores`, perfiles: 'Perfiles y cortes', otros: 'Otros materiales', revestimientos: 'Revestimientos' };

export default function TarjetaMateriales({
  items, catalogo, revestimientos, unidad, usosDeRevestimiento, excedenteBarras,
  onCambiarExcedente, onCambiarInsumo, onAgregarRevestimiento, onQuitarRevestimiento,
  compartirCortes, onCambiarCompartir, onActualizarPerfil, onAgregarPerfil, onQuitarPerfil,
  proveedor, pago, onCambiarPrecio, onActualizarProveedor, onAgregarProveedor, onQuitarProveedor,
  onAgregarAccesorio, onQuitarAccesorio, mermaCorte = 3, retazoMinimo = 0.3, empalmesSobreApoyo = true, onCambiarCorte = null, ahorrosAberturas = {},
  seccion = null, // v1.73: la sub-pestaña de Materiales ('proveedores', 'perfiles', 'otros', 'revestimientos'); null = todo
}) {
  const ver = (grupo) => !seccion || seccion === grupo;
  // v1.25: para mostrar, cada material con el precio del proveedor y la forma de pago elegidos.
  // v1.74.1: guardado (useMemo): así los perfiles son los mismos objetos mientras no cambie el catálogo y los
  // desplegables de perfil no rearman sus nombres en cada letra que se escribe en otra parte.
  const conPrecios = useMemo(() => aplicarProveedor(catalogo, proveedor, pago), [catalogo, proveedor, pago]);
  const pasar = useResaltar(); // v1.27: resaltar en el 3D las piezas de cada renglón
  const proveedores = proveedoresDe(catalogo);
  const perfiles = perfilesDeLista(conPrecios);
  // Columnas, Zanca… (los de este proyecto). Los renglones "por pared" (v1.22) se eligen en cada pared.
  const usosPerfil = items.filter((i) => i.categoria === 'perfil' && !i.derivadoDe);
  // OSB, pilotines, madera… (los accesorios y el flete tienen su lugar propio).
  const otros = items.filter((i) => !['panel', 'perfil', 'accesorio', 'flete'].includes(i.categoria));
  const accesorios = catalogo.filter((i) => i.categoria === 'accesorio');
  // Qué renglones de ESTE proyecto usa cada perfil (para "Usado en" y para no borrar uno en uso).
  const usadoEn = {};
  items.filter((i) => i.categoria === 'perfil').forEach((i) => i.perfilId && (usadoEn[i.perfilId] ??= []).push(i.nombre));
  // Perfiles que solo usan los renglones de OTRO tipo de proyecto (ej. los caños de la grada en un loft):
  // no se muestran en la lista para no llenarla, pero se pueden elegir en el desplegable.
  const deOtroProyecto = new Set(catalogo
    .filter((i) => i.categoria === 'perfil' && i.perfilId && !usosPerfil.some((u) => u.id === i.id))
    .map((i) => i.perfilId)
    .filter((id) => !usadoEn[id]));
  const visibles = perfiles.filter((p) => !deOtroProyecto.has(p.id));

  // v1.65: lo que había al abrir la pestaña; lo que se agrega después arranca con su ficha abierta.
  const [idsAlAbrir] = useState(() => new Set(catalogo.map((c) => c.id)));
  const esNuevo = (id) => !idsAlAbrir.has(id);
  const precioDe = (item) => textoDePrecio(item, proveedores, proveedor, pago);
  // v1.71: el precio por unidad de un material (en el proveedor elegido; si no lo tiene, el más barato).
  const precioUnitarioDe = (item) => {
    const opciones = preciosOrdenados(item, proveedores, pago);
    return opciones.find((o) => o.proveedor.id === proveedor) ?? opciones[0] ?? null;
  };
  const delCatalogo = (item) => catalogo.find((c) => c.id === item.id) ?? item;
  // Todos los materiales de ESTA obra que llevan precio (para la lista de precios de cada proveedor).
  const materialesDeLaObra = [
    ...visibles.map((p) => ({ ...p, nombre: nombrePerfil(p), unidadPrecio: 'barra' })),
    ...otros.map((item) => ({ ...delCatalogo(item), nombre: item.nombre, unidadPrecio: item.unidad })),
    ...accesorios.map((a) => ({ ...a, unidadPrecio: a.unidad || 'u' })),
    ...(revestimientos ?? []).map((t) => ({ ...t, unidadPrecio: t.venta === 'estandar' ? 'placa' : 'm²' })),
  ];
  const sinPrecio = materialesDeLaObra.filter((m) => precioDe(m).texto === 'sin precio').length;

  return (
    <ContextoAgregarProveedor value={onAgregarProveedor}>
    <Tarjeta id="materiales" titulo={TITULOS[seccion] ?? 'Materiales'}>
      <p className="nota">
        Qué es cada material: perfil, medidas y cómo se vende. Las cantidades están en el <strong>Presupuesto</strong>.
        Tocá un título para plegarlo o desplegarlo; cada renglón muestra su precio en el proveedor elegido
        en el Presupuesto (y el más barato, si es otro).
        {sinPrecio > 0 && <strong className="falta"> {sinPrecio} material{sinPrecio === 1 ? '' : 'es'} sin precio en ningún proveedor.</strong>}
      </p>

      {/* v1.25: proveedores. v1.65: cada uno plegable, con todos los precios de la obra adentro. */}
      {ver('proveedores') && <SeccionPlegable plana={seccion === 'proveedores'} clave="proveedores" titulo="Proveedores" resumen={`${proveedores.length}${todosLosProveedores(catalogo).length > proveedores.length ? ` (+${todosLosProveedores(catalogo).length - proveedores.length} descartados)` : ''}`}>
        <p className="nota">
          Abrí un proveedor para cargar <strong>todos sus precios de una vez</strong> (con su lista en la mano), o cargalos
          en cada material. Vacío = ese proveedor no lo vende. En el <strong>Presupuesto</strong> elegís con cuál calcular.
        </p>
        <ListaProveedores proveedores={todosLosProveedores(catalogo)} materiales={materialesDeLaObra} idElegido={proveedor}
          onActualizar={onActualizarProveedor} onAgregar={onAgregarProveedor} onQuitar={onQuitarProveedor} onCambiarPrecio={onCambiarPrecio} />
      </SeccionPlegable>}

      {/* v1.21: lista de perfiles. Cada parte de la obra elige uno; el precio y el largo de barra son del perfil. */}
      {ver('perfiles') && (<>
      <SeccionPlegable clave="perfiles" titulo="Perfiles (los hierros que usás)" resumen={`${visibles.length}`}>
        <p className="nota">
          Cargá cada hierro una sola vez: tipo, medidas en mm, largo de barra y precio. El peso sale de las medidas
          (aproximado). Las partes que usan el mismo perfil comparten barras y precio.
        </p>
        <ListaPerfiles perfiles={visibles} todos={perfiles} usadoEn={usadoEn} proveedores={proveedores} onCambiarPrecio={onCambiarPrecio}
          idElegido={proveedor} pago={pago} onActualizar={onActualizarPerfil} onAgregar={onAgregarPerfil} onQuitar={onQuitarPerfil} />
      </SeccionPlegable>

      <SeccionPlegable clave="usosPerfil" titulo="Qué perfil va en cada parte" resumen={`${usosPerfil.length} partes`}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Parte</th><th>Perfil</th></tr>
            </thead>
            <tbody>
              {usosPerfil.map((item) => (
                <tr key={item.id} {...pasar(criterioDe(item))}>
                  <td className="item-name">
                    {item.nombre}
                    {item.largosPiezas?.length > 0 && <BotonResaltar criterio={criterioDe(item)} />}
                  </td>
                  <td>
                    <SelectorPerfil etiqueta={`Perfil de ${item.nombre}`} conEtiqueta={false} valor={item.perfilId}
                      perfiles={perfiles} onElegir={(id) => onCambiarInsumo(item.id, 'perfilId', id)} />
                    {/* Con qué otras partes corta de las mismas barras. */}
                    {item.compartenCon && (
                      <small className="comparte" title={item.compartenCon.join(', ')}>
                        Comparte barras con {item.compartenCon.length > 2 ? `otros ${item.compartenCon.length} renglones del mismo perfil` : item.compartenCon.join(', ')}
                      </small>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid-params">
          <CampoNumero etiqueta="Excedente de las barras" sufijo="%" decimales={1}
            valor={excedenteBarras} onCambio={onCambiarExcedente} />
          {/* v1.68: lo que se lleva el disco y desde qué largo un sobrante se guarda (antes fijos: 3 mm y 30 cm). */}
          {onCambiarCorte && (<>
            <CampoNumero etiqueta="Ancho del disco (se pierde en cada corte)" sufijo="mm" decimales={1} valor={mermaCorte} onCambio={onCambiarCorte('mermaCorte')} />
            <CampoNumero etiqueta="Retazo que se guarda, desde" sufijo="m" decimales={2} valor={retazoMinimo} onCambio={onCambiarCorte('retazoMinimo')} />
          </>)}
        </div>
        <p className="nota">
          Las barras suelen venir entre 1 % y 2 % más largas que su medida nominal, <strong>según el proveedor</strong>:
          cargá el de tu proveedor. El optimizador corta sobre ese largo real.
        </p>
        {/* v1.20: las partes del mismo perfil cortan de las mismas barras (como en el taller). */}
        <label className="casilla-opcional">
          <input type="checkbox" checked={compartirCortes} onChange={(e) => onCambiarCompartir(e.target.checked)} />
          Compartir barras entre partes del mismo perfil
        </label>
        {/* v1.68: la unión de una pieza más larga que la barra, sobre un apoyo (más firme) o donde rinda más barras. */}
        {onCambiarCorte && (
          <label className="casilla-opcional">
            <input type="checkbox" checked={empalmesSobreApoyo} onChange={(e) => onCambiarCorte('empalmesSobreApoyo')(e.target.checked)} />
            Empalmes con la unión sobre un apoyo (viga, transversal, columna). Sin tildar: donde rinda más las barras.
          </label>
        )}
      </SeccionPlegable>
      </>)}

      {/* v1.65: antes una tabla; ahora cada material plegable con su precio en el encabezado. */}
      {ver('otros') && otros.length > 0 && (
        <SeccionPlegable clave="otros" titulo="Otros materiales de la obra" resumen={`${otros.length}`}>
          <p className="nota">Los que salen solos de la obra (OSB, pilotines, madera, mesadas, obra civil…). La cantidad la calcula la app.</p>
          <div className="lista-fichas">
            {otros.map((item) => (
              <FichaPlegable key={item.id} clave={`material:${item.id}`} className="rubro"
                encabezado={<><strong>{item.nombre}</strong><small>{item.cantidad} {item.unidad}</small><PrecioCorto precio={precioDe(delCatalogo(item))} /></>}>
                <div className="grid-params">
                  <div className="group">
                    <label htmlFor={`desc-otro-${item.id}`}>Descripción</label>
                    <input id={`desc-otro-${item.id}`} className="perfil" type="text" value={item.perfil}
                      onChange={(e) => onCambiarInsumo(item.id, 'perfil', e.target.value)} />
                  </div>
                </div>
                {/* v1.25: precio en cada proveedor (el renglón del catálogo, no el del presupuesto). */}
                <PreciosProveedores material={delCatalogo(item)} proveedores={proveedores}
                  unidad={item.unidad} onCambiar={(idProveedor, campo, valor) => onCambiarPrecio(item.id, idProveedor, campo, valor)} />
              </FichaPlegable>
            ))}
          </div>
        </SeccionPlegable>
      )}

      {/* v1.29: accesorios. v1.48: la cantidad se estima sola o se carga a mano. v1.65: acá se agrega cualquier material. */}
      {ver('otros') && <SeccionPlegable clave="accesorios" titulo="Materiales que agregás vos (accesorios, consumibles y lo que falte)" resumen={`${accesorios.length}`}>
        <p className="nota">
          Todo lo que se compra y la app no calcula sola: tornillería, electrodos, selladores, antióxido, o cualquier
          material nuevo. "Estimada sola" calcula la cantidad con los kilos de hierro, su superficie o los m² de paneles
          por un coeficiente; "a mano" usa la que cargues. Con cantidad 0 no entra al presupuesto.
        </p>
        <div className="lista-fichas">
          {accesorios.map((a) => (
            <Accesorio key={a.id} accesorio={a} calculado={items.find((i) => i.id === a.id) ?? null} proveedores={proveedores}
              precio={precioDe(a)} nuevo={esNuevo(a.id)} onCambiar={onActualizarPerfil}
              onQuitar={onQuitarAccesorio} onCambiarPrecio={onCambiarPrecio} />
          ))}
        </div>
        <button className="btn-add no-print" onClick={onAgregarAccesorio}>+ Agregar material</button>
      </SeccionPlegable>}

      {ver('revestimientos') && revestimientos && (
        <SeccionPlegable plana={seccion === 'revestimientos'} clave="revestimientos" titulo="Revestimientos (paneles, chapas, placas)" resumen={`${revestimientos.length}`}>
          <p className="nota">
            Cada pared elige su revestimiento exterior y, si lleva, el interior; el techo, el suyo.
            <strong> A medida</strong>: se piden tiras del alto de la pared (si pasa el largo máximo, van en tramos).
            <strong> Placa fija</strong>: se cuentan placas enteras. <strong>Ubicación</strong>: sobre los perfiles (tapa
            la estructura) o embutido entre perfiles; lo decide el herrero según el revestimiento.
          </p>
          <div className="lista-fichas">
            {revestimientos.map((tipo) => (
              <Revestimiento key={tipo.id} tipo={tipo} unidad={unidad} usos={usosDeRevestimiento(tipo.id)}
                unicoQueda={revestimientos.length === 1} onCambiar={onCambiarInsumo} onQuitar={onQuitarRevestimiento}
                proveedores={proveedores} precio={precioDe(tipo)} nuevo={esNuevo(tipo.id)} onCambiarPrecio={onCambiarPrecio}
                ahorro={ahorrosAberturas[tipo.id]} precioUnitario={precioUnitarioDe(tipo)} />
            ))}
          </div>
          <button className="btn-add no-print" onClick={onAgregarRevestimiento}>+ Agregar revestimiento</button>
        </SeccionPlegable>
      )}
    </Tarjeta>
    </ContextoAgregarProveedor>
  );
}
