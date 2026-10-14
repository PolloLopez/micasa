// ==========================================================
// App: estado de la calculadora y armado de la pantalla.
// ----------------------------------------------------------
// Flujo de datos (de arriba hacia abajo):
//   parámetros + aberturas  -> generarEstructura()   (motor/estructura.js)
//   estructura + catálogo   -> calcularPresupuesto() (motor/presupuesto.js)
//   estructura              -> <LoftCanvas> (3D)
// Invariante: params y aberturas guardados en el estado SIEMPRE son
// válidos. Un valor inválido se muestra en el campo pero no se guarda.
// ==========================================================

import { useMemo, useState } from 'react';
import LoftCanvas from './LoftCanvas.jsx';
import CampoNumero from './componentes/CampoNumero.jsx';
import SelectorLado from './componentes/SelectorLado.jsx';
import PanelAberturas from './componentes/PanelAberturas.jsx';
import PanelTiposPanel from './componentes/PanelTiposPanel.jsx';
import PanelEscalera from './componentes/PanelEscalera.jsx';
import TablaPresupuesto from './componentes/TablaPresupuesto.jsx';
import { useEstadoGuardado } from './hooks/useEstadoGuardado.js';
import { validarParametros, validarAbertura, LARGO_MAXIMO_ETIQUETA } from './motor/validacion.js';
import { esEdicionVacia } from './motor/edicionPiezas.js';
import { generarEstructura, listarPiezas } from './motor/estructura.js';
import { calcularPresupuesto, CATALOGO_INICIAL, tiposDePanel } from './motor/presupuesto.js';
import { migrarParams, normalizarCatalogo } from './motor/migracion.js';
import { PARAMS_INICIALES, ABERTURAS_INICIALES } from './motor/parametrosIniciales.js';
import { LADOS } from './motor/constantes.js';
import { nombreLado, alturasPared, geometriaLados, alturaMaxima } from './motor/geometria.js';
import { COLORES_INICIALES, coloresValidos, completarColores } from './capas.js';
import { crearArchivoProyecto, leerArchivoProyecto, nombreDeArchivo } from './proyecto/archivoProyecto.js';
import { proyectoVacio, proyectoEjemplo } from './proyecto/proyectosBase.js';
import {
  crearEntrada, guardarEntrada, borrarEntrada, duplicarEntrada, renombrarEntrada, abrirEntrada,
  hayCambiosSinGuardar, esBibliotecaValida, crearRespaldo, importarRespaldo, nuevoId,
} from './proyecto/biblioteca.js';
import MisProyectos from './componentes/MisProyectos.jsx';
import { describirPieza } from './descripcionPiezas.js';
import './App.css';
import Tarjeta from './componentes/Tarjeta.jsx';

// --- Validadores para descartar datos viejos de localStorage ---
const paramsGuardadosValidos = (p) =>
  p && typeof p === 'object' && Object.keys(validarParametros(p)).length === 0;
// El catálogo se normaliza al leerlo (normalizarCatalogo), así que siempre queda completo.
const catalogoGuardadoValido = (c) => Array.isArray(c) && c.some((p) => p.categoria === 'panel');
const aberturasGuardadasValidas = (a) => Array.isArray(a) && a.every((op) => LADOS.includes(op.lado));

/**
 * Red de seguridad: si una pared o el techo apunta a un tipo de panel
 * que ya no está en el catálogo, usa el primero disponible.
 */
function conPanelesExistentes(params, catalogo) {
  const ids = tiposDePanel(catalogo).map((p) => p.id);
  const ok = (id) => (ids.includes(id) ? id : ids[0]);
  return {
    ...params,
    panelTecho: ok(params.panelTecho),
    paredes: Object.fromEntries(LADOS.map((l) => [l, { ...params.paredes[l], panel: ok(params.paredes[l].panel) }])),
  };
}

/** Copia `obj` cambiando el valor en una ruta tipo "paredes.A.separacionVerticales". */
function conValor(obj, ruta, valor) {
  const [clave, ...resto] = ruta.split('.');
  const nuevo = resto.length ? conValor(obj[clave], resto.join('.'), valor) : valor;
  if (Array.isArray(obj)) {
    // Listas (ej. "escalera.descansos.1"): se copia la lista, no se convierte en objeto.
    const copia = [...obj];
    copia[Number(clave)] = nuevo;
    return copia;
  }
  return { ...obj, [clave]: nuevo };
}

export default function App() {
  const [unidad, setUnidad] = useState('m');
  const [paramsGuardados, setParams] = useEstadoGuardado('params', PARAMS_INICIALES, paramsGuardadosValidos, migrarParams);
  const [aberturas, setAberturas] = useEstadoGuardado('aberturas', ABERTURAS_INICIALES, aberturasGuardadasValidas);
  const [catalogo, setCatalogo] = useEstadoGuardado('catalogo', CATALOGO_INICIAL, catalogoGuardadoValido, normalizarCatalogo);
  const params = useMemo(() => conPanelesExistentes(paramsGuardados, catalogo), [paramsGuardados, catalogo]);
  const [colores, setColores] = useEstadoGuardado('colores', COLORES_INICIALES, coloresValidos, completarColores);
  const [nombreProyecto, setNombreProyecto] = useEstadoGuardado('nombre', 'Loft', (n) => typeof n === 'string');
  const [aviso, setAviso] = useState(null); // { tipo: 'ok' | 'error', texto }
  // "Mis proyectos": lista guardada en el navegador y cuál está abierto (null = sin guardar).
  const [biblioteca, setBiblioteca] = useEstadoGuardado('biblioteca', [], esBibliotecaValida, undefined, () =>
    setAviso({ tipo: 'error', texto: 'No se pudo guardar en Mis proyectos: el navegador no tiene lugar. Descargá el proyecto como archivo (.json).' }));
  const [idProyectoActual, setIdProyectoActual] = useEstadoGuardado('proyectoActual', null, (v) => v === null || typeof v === 'string');
  // Ver u ocultar el 3D: oculto, el panel de datos usa todo el ancho (cómodo para cargar en el celular).
  const [ver3D, setVer3D] = useEstadoGuardado('ver3D', true, (v) => typeof v === 'boolean');
  const [mostrarProyectos, setMostrarProyectos] = useState(false);

  // --- Cálculos (solo se rehacen si cambian sus datos) ---
  // Por seguridad se ignoran aberturas que no entren (ej. datos viejos guardados).
  const aberturasValidas = useMemo(
    () => aberturas.filter((op) => validarAbertura(op, params) === null),
    [aberturas, params]
  );
  const estructura = useMemo(() => generarEstructura(params, aberturasValidas), [params, aberturasValidas]);
  const { items, total } = useMemo(
    () => calcularPresupuesto(estructura, catalogo, { excedenteBarras: params.excedenteBarras }),
    [estructura, catalogo, params.excedenteBarras]
  );
  const paneles = useMemo(() => tiposDePanel(catalogo), [catalogo]);
  const lados = useMemo(() => geometriaLados(params), [params]);

  // --- Handlers (manejadores de eventos) ---

  /**
   * Prueba un cambio en `ruta`. Si deja datos inválidos devuelve el
   * mensaje de error (y no guarda); si está bien, guarda y devuelve null.
   */
  const cambiar = (ruta) => (valor) => {
    const nuevos = conValor(params, ruta, valor);
    const errores = validarParametros(nuevos);
    if (Object.keys(errores).length > 0) return errores[ruta] || Object.values(errores)[0];

    const aberturaQueNoEntra = aberturas.find((op) => validarAbertura(op, nuevos) !== null);
    if (aberturaQueNoEntra) {
      return `Una ${aberturaQueNoEntra.tipo} (${nombreLado(aberturaQueNoEntra.lado, nuevos.ladoFrente)}) dejaría de entrar. Movela o quitala primero.`;
    }
    setParams(nuevos);
    return null;
  };

  const cambiarInsumo = (id, campo, valor) =>
    setCatalogo((prev) => prev.map((p) => (p.id === id ? { ...p, [campo]: valor } : p)));

  // --- Tipos de panel ---
  const agregarTipoPanel = () => {
    const base = paneles[paneles.length - 1];
    const nuevo = { ...base, id: `panel-${Date.now()}`, nombre: `Panel ${paneles.length + 1}`, perfil: '', color: '#a3a3a3' };
    setCatalogo((prev) => [...prev, nuevo]);
  };
  /** Dónde se usa un tipo de panel (para no borrar uno en uso). */
  const usosDePanel = (id) => [
    ...LADOS.filter((l) => params.paredes[l].panel === id).map((l) => nombreLado(l, params.ladoFrente)),
    ...(params.panelTecho === id ? ['Techo'] : []),
  ];
  const quitarTipoPanel = (id) => setCatalogo((prev) => prev.filter((p) => p.id !== id));

  const agregarAbertura = (abertura) => setAberturas((prev) => [...prev, abertura]);
  const actualizarAbertura = (abertura) =>
    setAberturas((prev) => prev.map((op) => (op.id === abertura.id ? abertura : op)));
  const quitarAbertura = (id) => setAberturas((prev) => prev.filter((op) => op.id !== id));

  // --- Piezas eliminadas a mano (se guardan en params.piezasEliminadas) ---
  const eliminarPieza = (id) => cambiar('piezasEliminadas')([...params.piezasEliminadas, id]);
  const restaurarPieza = (id) => cambiar('piezasEliminadas')(params.piezasEliminadas.filter((x) => x !== id));
  const restaurarTodas = () => cambiar('piezasEliminadas')([]);
  /** Guarda la edición de una pieza (recorte, movimiento, perfil). Sin cambios => se borra. */
  const editarPieza = (id, edicion) => {
    const { [id]: _anterior, ...resto } = params.piezasEditadas; // eslint-disable-line no-unused-vars
    return cambiar('piezasEditadas')(esEdicionVacia(edicion) ? resto : { ...resto, [id]: edicion });
  };
  const deshacerEdiciones = () => cambiar('piezasEditadas')({});

  const cambiarColor = (capa, color) => setColores((prev) => ({ ...prev, [capa]: color }));

  // --- Proyecto en pantalla y "Mis proyectos" ---

  /** El proyecto que se está editando, en un solo objeto. */
  const proyectoActual = { nombre: nombreProyecto, params, aberturas, catalogo, colores };
  const entradaActual = biblioteca.find((e) => e.id === idProyectoActual);
  const cambiosSinGuardar = hayCambiosSinGuardar(proyectoActual, entradaActual);

  /** Reemplaza todo el proyecto en pantalla (nuevo, ejemplo, de la lista o de un archivo). */
  const cargarProyecto = (proyecto, idEnBiblioteca = null) => {
    setNombreProyecto(proyecto.nombre);
    setParams(proyecto.params);
    setAberturas(proyecto.aberturas);
    setCatalogo(proyecto.catalogo);
    setColores(proyecto.colores);
    setIdProyectoActual(idEnBiblioteca);
  };

  /** Antes de reemplazar el proyecto en pantalla: avisa si hay cambios sin guardar. */
  const puedoReemplazar = () =>
    !cambiosSinGuardar ||
    window.confirm(`"${nombreProyecto || 'Proyecto sin nombre'}" tiene cambios sin guardar. ¿Seguir igual y perderlos?`);

  /** Guarda en Mis proyectos con un id (nuevo o el actual). Si el navegador no tiene lugar, avisa el hook. */
  const guardarEnBiblioteca = (id, nombre) => {
    const entrada = crearEntrada(proyectoActual, { id, nombre });
    setBiblioteca((prev) => guardarEntrada(prev, entrada));
    setNombreProyecto(entrada.nombre);
    setIdProyectoActual(entrada.id);
    setAviso({ tipo: 'ok', texto: `Guardado en Mis proyectos: "${entrada.nombre}"` });
  };

  /** "Guardar como…": pide un nombre y crea un proyecto nuevo en la lista. */
  const guardarComo = () => {
    const nombre = window.prompt('¿Con qué nombre guardás el proyecto?', nombreProyecto || '');
    if (nombre === null) return; // canceló
    if (!nombre.trim()) {
      setAviso({ tipo: 'error', texto: 'Poné un nombre para guardar el proyecto.' });
      return;
    }
    guardarEnBiblioteca(nuevoId(), nombre);
  };

  /** "Guardar": pisa el proyecto abierto; si nunca se guardó, funciona como "Guardar como…". */
  const guardar = () => (entradaActual ? guardarEnBiblioteca(entradaActual.id, nombreProyecto) : guardarComo());

  const abrirDeBiblioteca = (entrada) => {
    if (entrada.id !== idProyectoActual && !puedoReemplazar()) return;
    const r = abrirEntrada(entrada);
    if (!r.ok) {
      setAviso({ tipo: 'error', texto: `No se pudo abrir "${entrada.nombre}": ${r.error}` });
      return;
    }
    cargarProyecto(r.proyecto, entrada.id);
    setMostrarProyectos(false);
    setAviso({ tipo: 'ok', texto: `Proyecto "${entrada.nombre}" abierto` });
  };

  const duplicarDeBiblioteca = (id) => setBiblioteca((prev) => duplicarEntrada(prev, id));
  const renombrarDeBiblioteca = (id, nombre) => {
    setBiblioteca((prev) => renombrarEntrada(prev, id, nombre));
    if (id === idProyectoActual && nombre.trim()) setNombreProyecto(nombre.trim());
  };
  const borrarDeBiblioteca = (id) => {
    setBiblioteca((prev) => borrarEntrada(prev, id));
    if (id === idProyectoActual) setIdProyectoActual(null); // lo que está en pantalla queda sin guardar
  };

  /** "Nuevo": arranca un proyecto sin datos (sin guardar todavía). */
  const nuevoProyecto = () => {
    if (!puedoReemplazar()) return;
    cargarProyecto(proyectoVacio());
    setMostrarProyectos(false);
    setAviso({ tipo: 'ok', texto: 'Proyecto nuevo: cargá las medidas, los perfiles y los precios. Después "Guardar como…".' });
  };

  /** "Ejemplo": carga el loft de referencia (sin guardar). */
  const cargarEjemplo = () => {
    if (!puedoReemplazar()) return;
    cargarProyecto(proyectoEjemplo());
    setMostrarProyectos(false);
    setAviso({ tipo: 'ok', texto: 'Ejemplo cargado: loft 7,50 x 4,50 con entrepiso.' });
  };

  // --- Archivos (.json) ---

  /** Descarga un objeto como archivo .json (queda en la carpeta Descargas). */
  const descargarJson = (objeto, nombreArchivo) => {
    const blob = new Blob([JSON.stringify(objeto, null, 2)], { type: 'application/json' });
    const enlace = document.createElement('a');
    enlace.href = URL.createObjectURL(blob);
    enlace.download = nombreArchivo;
    enlace.click();
    URL.revokeObjectURL(enlace.href);
  };

  const descargarProyecto = () => {
    const nombre = nombreDeArchivo(nombreProyecto);
    descargarJson(crearArchivoProyecto(proyectoActual), nombre);
    setAviso({ tipo: 'ok', texto: `Descargado como ${nombre}` });
  };

  /** Abre un .json: queda en pantalla como proyecto sin guardar (después "Guardar como…"). */
  const abrirArchivo = (texto) => {
    const r = leerArchivoProyecto(texto);
    if (!r.ok) {
      setAviso({ tipo: 'error', texto: r.error });
      return;
    }
    if (!puedoReemplazar()) return;
    cargarProyecto(r.proyecto);
    setMostrarProyectos(false);
    setAviso({ tipo: 'ok', texto: `Archivo "${r.proyecto.nombre}" abierto. Usá "Guardar como…" para sumarlo a Mis proyectos.` });
  };

  const exportarRespaldo = () => {
    const nombre = `micasa-respaldo-${new Date().toISOString().slice(0, 10)}.json`;
    descargarJson(crearRespaldo(biblioteca), nombre);
    setAviso({ tipo: 'ok', texto: `Respaldo de ${biblioteca.length} proyectos descargado como ${nombre}` });
  };

  const importarRespaldoDeArchivo = (texto) => {
    const r = importarRespaldo(biblioteca, texto);
    if (!r.ok) {
      setAviso({ tipo: 'error', texto: r.error });
      return;
    }
    setBiblioteca(r.lista);
    const salteados = r.salteados.length ? ` (salteados por errores: ${r.salteados.join(', ')})` : '';
    setAviso({ tipo: r.salteados.length ? 'error' : 'ok', texto: `Se importaron ${r.importados} proyectos${salteados}.` });
  };

  /** Select de tipo de panel (paredes y techo). */
  const selectorPanel = (ruta, etiqueta, valor) => (
    <div className="group" key={ruta}>
      <label htmlFor={`panel-${ruta}`}>{etiqueta}</label>
      <select id={`panel-${ruta}`} value={valor} onChange={(e) => cambiar(ruta)(e.target.value)}>
        {paneles.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
      </select>
    </div>
  );

  // Atajo para no repetir props en cada campo de medida.
  const medida = (ruta, etiqueta) => (
    <CampoNumero key={ruta} etiqueta={etiqueta} unidad={unidad}
      valor={ruta.split('.').reduce((o, k) => o[k], params)} onCambio={cambiar(ruta)} />
  );

  return (
    <div className="app">
      <header>
        <div className="titulo">
          <h1>micasa</h1>
          <input className="nombre-proyecto" value={nombreProyecto} aria-label="Nombre del proyecto"
            onChange={(e) => setNombreProyecto(e.target.value)} placeholder="Nombre del proyecto…" />
          <span className={`estado-guardado${cambiosSinGuardar ? ' sin-guardar' : ''}`} role="status">
            {!entradaActual ? 'Sin guardar' : cambiosSinGuardar ? '● Cambios sin guardar' : '✓ Guardado'}
          </span>
        </div>
        <div className="header-actions no-print">
          <button className="btn-sec" onClick={() => setMostrarProyectos(true)}>Mis proyectos ({biblioteca.length})</button>
          <button className="btn-print" onClick={guardar} disabled={entradaActual && !cambiosSinGuardar}>Guardar</button>
          <button className="btn-sec" onClick={guardarComo}>Guardar como…</button>
          <button className="btn-sec" onClick={() => setVer3D((v) => !v)} aria-pressed={!ver3D}>
            {ver3D ? 'Ocultar 3D' : 'Ver 3D'}
          </button>
          <label htmlFor="unidad">Unidad</label>
          <select id="unidad" value={unidad} onChange={(e) => setUnidad(e.target.value)}>
            <option value="m">Metros</option>
            <option value="cm">Centímetros</option>
            <option value="mm">Milímetros</option>
          </select>
          <button className="btn-print" onClick={() => window.print()}>Imprimir / PDF</button>
        </div>
      </header>

      {mostrarProyectos && (
        <MisProyectos
          biblioteca={biblioteca} idActual={idProyectoActual} onCerrar={() => setMostrarProyectos(false)}
          onAbrir={abrirDeBiblioteca} onDuplicar={duplicarDeBiblioteca} onRenombrar={renombrarDeBiblioteca}
          onBorrar={borrarDeBiblioteca} onNuevo={nuevoProyecto} onEjemplo={cargarEjemplo}
          onAbrirArchivo={abrirArchivo} onDescargarArchivo={descargarProyecto}
          onExportarRespaldo={exportarRespaldo} onImportarRespaldo={importarRespaldoDeArchivo}
        />
      )}

      {aviso && (
        <div className={`aviso aviso-${aviso.tipo} no-print`} role={aviso.tipo === 'error' ? 'alert' : 'status'}>
          {aviso.texto}
          <button onClick={() => setAviso(null)} aria-label="Cerrar aviso">✕</button>
        </div>
      )}

      <main className={`layout${ver3D ? '' : ' sin-visor'}`}>
        <div className="columna-visor">
          <LoftCanvas params={params} estructura={estructura} aberturas={aberturasValidas} paneles={paneles}
            colores={colores} catalogo={catalogo} unidad={unidad}
            onCambiarColor={cambiarColor} onEliminarPieza={eliminarPieza} onEditarPieza={editarPieza} />
        </div>

        <div className="columna-panel">
          {/* PLANTA */}
          <Tarjeta id="planta" titulo="Planta y altura">
            <div className="grid-params">
              {medida('largo', 'Largo (lados A y C)')}
              {medida('ancho', 'Ancho (lados B y D)')}
              {medida('altura', 'Altura (lado bajo)')}
              {medida('elevacion', 'Elevación s/ terreno')}
              <SelectorLado etiqueta="¿Qué lado es el frente?" valor={params.ladoFrente} params={params}
                onCambio={cambiar('ladoFrente')} ocultarFrente />
            </div>
          </Tarjeta>

          {/* PAREDES (PANELES) */}
          <Tarjeta id="paredes" titulo="Paredes">
            <p className="nota">
              <strong>Verticales</strong>: separación de columnas a lo largo de la pared (eje X).{' '}
              <strong>Horizontales</strong>: separación en altura (eje Y).
            </p>
            {LADOS.map((lado) => {
              const [h1, h2] = alturasPared(lados[lado], params);
              return (
                <div key={lado} className="pared">
                  <div className="pared-titulo">
                    <strong>{nombreLado(lado, params.ladoFrente)}</strong>
                    {params.paredes[lado].etiqueta.trim() && <em>“{params.paredes[lado].etiqueta.trim()}”</em>}
                    <span>lado {lado} · {lados[lado].largo.toFixed(2)} m · alto {h1.toFixed(2)}{Math.abs(h1 - h2) > 0.005 ? ` a ${h2.toFixed(2)}` : ''} m</span>
                  </div>
                  <div className="etiqueta-pared">
                    <label className="capa">
                      <input type="checkbox" checked={params.paredes[lado].mostrarEtiqueta}
                        aria-label={`Mostrar la etiqueta de ${nombreLado(lado, params.ladoFrente)} en el 3D`}
                        onChange={(e) => cambiar(`paredes.${lado}.mostrarEtiqueta`)(e.target.checked)} />
                      Etiqueta en el 3D
                    </label>
                    <input type="text" className="perfil" maxLength={LARGO_MAXIMO_ETIQUETA}
                      value={params.paredes[lado].etiqueta} disabled={!params.paredes[lado].mostrarEtiqueta}
                      placeholder={`${nombreLado(lado, params.ladoFrente)} (${lado})`}
                      aria-label={`Texto de la etiqueta de ${nombreLado(lado, params.ladoFrente)}`}
                      onChange={(e) => cambiar(`paredes.${lado}.etiqueta`)(e.target.value)} />
                  </div>
                  <div className="grid-params">
                    {medida(`paredes.${lado}.separacionVerticales`, 'Sep. verticales')}
                    {medida(`paredes.${lado}.separacionHorizontales`, 'Sep. horizontales')}
                    {selectorPanel(`paredes.${lado}.panel`, 'Panel', params.paredes[lado].panel)}
                  </div>
                </div>
              );
            })}
          </Tarjeta>

          {/* PISOS */}
          <Tarjeta id="pisos" titulo="Pisos">
            <h3 className="subtitulo">Planta baja</h3>
            <div className="grid-params">
              {medida('separacionPiso', 'Sep. estructura de piso')}
              {medida('separacionTransversalesPiso', 'Sep. transversales (0 = sin)')}
            </div>
            <h3 className="subtitulo">Piso 2 (entrepiso)</h3>
            <div className="grid-params">
              <SelectorLado etiqueta="Apoyado en" valor={params.ladoEntrepiso} params={params}
                onCambio={cambiar('ladoEntrepiso')} />
              {medida('anchoEntrepiso', 'Ancho (0 = sin entrepiso)')}
              {medida('separacionPiso2', 'Sep. estructura de piso 2')}
              {medida('separacionTransversalesPiso2', 'Sep. transversales (0 = sin)')}
            </div>
            <p className="nota">
              La estructura de cada piso cruza la luz más corta. Las transversales unen la estructura para que
              no arquee; su separación la define el herrero según el panel.
            </p>
          </Tarjeta>

          {/* ESCALERA */}
          <PanelEscalera params={params} resumen={estructura.escalera?.resumen} unidad={unidad}
            cambiar={cambiar} cambiarEscalera={(cambios) => cambiar('escalera')({ ...params.escalera, ...cambios })} />

          {/* TECHO */}
          <Tarjeta id="techo" titulo="Techo a una agua">
            <div className="grid-params">
              <SelectorLado etiqueta="Cae hacia" valor={params.caidaTecho} params={params}
                onCambio={cambiar('caidaTecho')} />
              <CampoNumero etiqueta="Pendiente" sufijo="%" valor={params.pendienteTecho}
                onCambio={cambiar('pendienteTecho')} decimales={1} />
              {medida('separacionVigasTecho', 'Sep. vigas de techo')}
              {medida('separacionCorreasTecho', 'Sep. correas (s/ pendiente)')}
              {selectorPanel('panelTecho', 'Panel de techo', params.panelTecho)}
            </div>
            <p className="nota">
              Lado bajo: {params.altura.toFixed(2)} m ({nombreLado(params.caidaTecho, params.ladoFrente).toLowerCase()}) ·
              lado alto: {alturaMaxima(params).toFixed(2)} m
            </p>
          </Tarjeta>

          {/* FUNDACIÓN */}
          <Tarjeta id="fundacion" titulo="Fundación">
            <div className="grid-params">
              <CampoNumero etiqueta="Filas de pilotines (largo)" sufijo="u" decimales={0}
                valor={params.filasPilotines} onCambio={cambiar('filasPilotines')} />
              <CampoNumero etiqueta="Pilotines por fila (ancho)" sufijo="u" decimales={0}
                valor={params.pilotinesPorFila} onCambio={cambiar('pilotinesPorFila')} />
            </div>
          </Tarjeta>

          {/* PIEZAS ELIMINADAS Y EDITADAS */}
          <Tarjeta id="eliminadas" titulo={`Piezas eliminadas y editadas (${params.piezasEliminadas.length + Object.keys(params.piezasEditadas).length})`}>
            <p className="nota">
              Hacé clic en un hierro del 3D: podés <strong>eliminarlo</strong> o <strong>editarlo</strong> (recortar,
              mover o cotizarlo con otro perfil). Lo eliminado sale del dibujo y del presupuesto; lo editado se dibuja
              y se cotiza con el cambio. Cada pieza se reconoce por su posición: si cambiás una medida y la pieza se
              mueve, el cambio deja de aplicarse.
            </p>
            {Object.keys(params.piezasEditadas).length > 0 && (
              <>
                <h3 className="subtitulo">Editadas</h3>
                <ul className="opening-list">
                  {Object.keys(params.piezasEditadas).map((id) => {
                    const original = estructura.editadasEncontradas.find((p) => p.id === id);
                    const actual = original && listarPiezas(estructura).find((p) => p.id === id);
                    return (
                      <li key={id} className="abertura pieza-eliminada">
                        <span>
                          {original
                            ? <>{describirPieza(original, params.ladoFrente)} · {original.largo.toFixed(2)} → {actual.largo.toFixed(2)} m
                              {actual.insumo && <> · {catalogo.find((p) => p.id === actual.insumo)?.nombre}</>}
                              {actual.recorteIgnorado && <strong className="error"> · el recorte ya no entra</strong>}</>
                            : <em>Ya no existe en el modelo (cambió una medida)</em>}
                          <small className="detalle"> · {id}</small>
                        </span>
                        <button className="btn-sec no-print" onClick={() => editarPieza(id, {})}>Deshacer</button>
                      </li>
                    );
                  })}
                </ul>
                <button className="btn-sec no-print" onClick={deshacerEdiciones}>Deshacer todas las ediciones</button>
              </>
            )}
            {params.piezasEliminadas.length > 0 && <h3 className="subtitulo">Eliminadas</h3>}
            {params.piezasEliminadas.length > 0 && (
              <>
                <ul className="opening-list">
                  {params.piezasEliminadas.map((id) => {
                    const pieza = estructura.eliminadasEncontradas.find((p) => p.id === id);
                    return (
                      <li key={id} className="abertura pieza-eliminada">
                        <span>
                          {pieza ? describirPieza(pieza, params.ladoFrente) : <em>Ya no existe en el modelo (cambió una medida)</em>}
                          <small className="detalle"> · {id}</small>
                        </span>
                        <button className="btn-sec no-print" onClick={() => restaurarPieza(id)}>Restaurar</button>
                      </li>
                    );
                  })}
                </ul>
                <button className="btn-sec no-print" onClick={restaurarTodas}>Restaurar todas</button>
              </>
            )}
          </Tarjeta>

          <PanelAberturas aberturas={aberturasValidas} params={params} unidad={unidad}
            onAgregar={agregarAbertura} onActualizar={actualizarAbertura} onQuitar={quitarAbertura} />

          <PanelTiposPanel paneles={paneles} usosDePanel={usosDePanel} onCambiar={cambiarInsumo}
            onAgregar={agregarTipoPanel} onQuitar={quitarTipoPanel} />

          <TablaPresupuesto items={items} total={total} catalogo={catalogo} onCambiarInsumo={cambiarInsumo}
            excedenteBarras={params.excedenteBarras} onCambiarExcedente={cambiar('excedenteBarras')} />
        </div>
      </main>
    </div>
  );
}
