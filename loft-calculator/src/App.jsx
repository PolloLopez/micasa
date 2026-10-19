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

import { useEffect, useMemo, useRef, useState } from 'react';
import LoftCanvas from './LoftCanvas.jsx';
import CampoNumero from './componentes/CampoNumero.jsx';
import SelectorLado from './componentes/SelectorLado.jsx';
import CampoSelect from './componentes/CampoSelect.jsx';
import PanelAberturas from './componentes/PanelAberturas.jsx';
import TarjetaMateriales from './componentes/TarjetaMateriales.jsx';
import PanelEscalera from './componentes/PanelEscalera.jsx';
import PanelGrada from './componentes/PanelGrada.jsx';
import PanelMontaje from './componentes/PanelMontaje.jsx';
import TablaPresupuesto from './componentes/TablaPresupuesto.jsx';
import { useEstadoGuardado } from './hooks/useEstadoGuardado.js';
import { validarParametros, validarAbertura, copiarAbertura, LARGO_MAXIMO_ETIQUETA } from './motor/validacion.js';
import { esEdicionVacia } from './motor/edicionPiezas.js';
import { duplicarPieza, PREFIJO_AGREGADA } from './motor/piezasAgregadas.js';
import { generarEstructura, listarPiezas } from './motor/estructura.js';
import { calcularPresupuesto, CATALOGO_INICIAL, tiposDePanel } from './motor/presupuesto.js';
import { migrarParams, normalizarCatalogo } from './motor/migracion.js';
import { PARAMS_INICIALES, ABERTURAS_INICIALES } from './motor/parametrosIniciales.js';
import { LADOS } from './motor/constantes.js';
import { nombreLado, alturasPared, geometriaLados, alturaMaxima } from './motor/geometria.js';
import { COLORES_INICIALES, coloresValidos, completarColores } from './capas.js';
import { crearArchivoProyecto, leerArchivoProyecto, nombreDeArchivo } from './proyecto/archivoProyecto.js';
import { crearLinkProyecto, leerLinkProyecto, tieneProyectoEnLink } from './proyecto/linkProyecto.js';
import {
  proyectoVacio, proyectoEjemplo, gradaNueva, gradaEjemplo, montajeNuevo, montajeEjemplo,
} from './proyecto/proyectosBase.js';
import {
  crearEntrada, guardarEntrada, borrarEntrada, duplicarEntrada, renombrarEntrada, abrirEntrada,
  hayCambiosSinGuardar, esBibliotecaValida, crearRespaldo, importarRespaldo, nuevoId,
} from './proyecto/biblioteca.js';
import MisProyectos from './componentes/MisProyectos.jsx';
import { describirPieza } from './descripcionPiezas.js';
import './App.css';

// Versión de la app (la inyecta Vite desde package.json; ver vite.config.js).
// eslint-disable-next-line no-undef
const VERSION_APP = typeof __VERSION_APP__ === 'string' ? __VERSION_APP__ : '';
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

/** Opacidad de fábrica del 3D: paneles y OSB se ven a través; los hierros, sólidos. */
const OPACIDADES_INICIALES = { paneles: 0.35, osb: 0.45, hierros: 1 };
const opacidadesValidas = (o) => o && typeof o === 'object'
  && Object.keys(OPACIDADES_INICIALES).every((k) => Number.isFinite(o[k]) && o[k] >= 0.05 && o[k] <= 1);

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
  // Opacidad del 3D (por navegador, como ver u ocultar el 3D): paneles, OSB y hierros.
  const [opacidades, setOpacidades] = useEstadoGuardado('opacidades', OPACIDADES_INICIALES, opacidadesValidas);
  const imagenImpresionRef = useRef(null); // foto del 3D que sale en el PDF
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
  const esGrada = params.tipoProyecto === 'grada'; // proyecto de grada: otra pantalla de datos
  const esMontaje = params.tipoProyecto === 'montaje'; // montaje industrial: mesas, tanques...
  const esConstruccion = !esGrada && !esMontaje;
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
    const nuevo = { ...base, id: `panel-${Date.now()}`, nombre: `Revestimiento ${paneles.length + 1}`, perfil: '', color: '#a3a3a3' };
    setCatalogo((prev) => [...prev, nuevo]);
  };
  /** Dónde se usa un tipo de panel (para no borrar uno en uso). */
  const usosDePanel = (id) => [
    ...LADOS.filter((l) => params.paredes[l].panel === id).map((l) => nombreLado(l, params.ladoFrente)),
    ...LADOS.filter((l) => params.paredes[l].panelInterior === id).map((l) => `${nombreLado(l, params.ladoFrente)} (interior)`),
    ...(params.panelTecho === id ? ['Techo'] : []),
  ];
  const quitarTipoPanel = (id) => setCatalogo((prev) => prev.filter((p) => p.id !== id));

  const agregarAbertura = (abertura) => setAberturas((prev) => [...prev, abertura]);
  const actualizarAbertura = (abertura) =>
    setAberturas((prev) => prev.map((op) => (op.id === abertura.id ? abertura : op)));
  const quitarAbertura = (id) => setAberturas((prev) => prev.filter((op) => op.id !== id));

  // --- Piezas eliminadas a mano (se guardan en params.piezasEliminadas) ---
  // Una pieza agregada a mano (agr:…) se saca de su lista; las del motor van a "eliminadas".
  const eliminarPieza = (id) => (id.startsWith(PREFIJO_AGREGADA)
    ? cambiar('piezasAgregadas')(params.piezasAgregadas.filter((p) => p.id !== id))
    : cambiar('piezasEliminadas')([...params.piezasEliminadas, id]));
  /** Duplicar / pegar una pieza (v1.16). Devuelve el id de la copia (o null si no se pudo). */
  const duplicarPiezaElegida = (pieza) => {
    const copia = duplicarPieza(pieza, params.piezasAgregadas);
    return cambiar('piezasAgregadas')([...params.piezasAgregadas, copia]) ? null : copia.id;
  };
  /** Pegar / duplicar una abertura (v1.16): al lado si entra. Devuelve la copia (o null). */
  const pegarAbertura = (abertura) => {
    const copia = copiarAbertura(abertura, aberturasValidas, params, Date.now());
    if (validarAbertura(copia, params)) return null;
    agregarAbertura(copia);
    return copia;
  };
  const restaurarPieza = (id) => cambiar('piezasEliminadas')(params.piezasEliminadas.filter((x) => x !== id));
  const restaurarTodas = () => cambiar('piezasEliminadas')([]);
  /** Guarda la edición de una pieza (recorte, movimiento, perfil). Sin cambios => se borra. */
  const editarPieza = (id, edicion) => {
    const { [id]: _anterior, ...resto } = params.piezasEditadas; // eslint-disable-line no-unused-vars
    return cambiar('piezasEditadas')(esEdicionVacia(edicion) ? resto : { ...resto, [id]: edicion });
  };
  const deshacerEdiciones = () => cambiar('piezasEditadas')({});

  const cambiarColor = (capa, color) => setColores((prev) => ({ ...prev, [capa]: color }));
  const cambiarOpacidad = (clave, valor) => setOpacidades((prev) => ({ ...prev, [clave]: valor }));

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

  /** "+ Grada nueva" y "Ejemplo: grada": proyectos de tipo grada. */
  const nuevaGrada = () => {
    if (!puedoReemplazar()) return;
    cargarProyecto(gradaNueva());
    setMostrarProyectos(false);
    setAviso({ tipo: 'ok', texto: 'Grada nueva: cargá las filas, los perfiles y los precios. Después "Guardar como…".' });
  };
  const cargarEjemploGrada = () => {
    if (!puedoReemplazar()) return;
    cargarProyecto(gradaEjemplo());
    setMostrarProyectos(false);
    setAviso({ tipo: 'ok', texto: 'Ejemplo cargado: grada de 6 filas x 6 m.' });
  };

  /** "+ Montaje nuevo" y "Ejemplo: montaje": proyectos de montaje industrial. */
  const nuevoMontaje = () => {
    if (!puedoReemplazar()) return;
    cargarProyecto(montajeNuevo());
    setMostrarProyectos(false);
    setAviso({ tipo: 'ok', texto: 'Montaje nuevo: agregá mesas y tanques, cargá sus medidas, perfiles y precios. Después "Guardar como…".' });
  };
  const cargarEjemploMontaje = () => {
    if (!puedoReemplazar()) return;
    cargarProyecto(montajeEjemplo());
    setMostrarProyectos(false);
    setAviso({ tipo: 'ok', texto: 'Ejemplo cargado: mesa de trabajo + tanque de agua.' });
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

  // --- Link para compartir ---

  /** "Compartir": copia un link que trae el proyecto adentro (medidas, aberturas, precios y colores). */
  const compartirLink = async () => {
    const base = `${window.location.origin}${window.location.pathname}`;
    const link = await crearLinkProyecto(proyectoActual, base);
    try {
      await navigator.clipboard.writeText(link);
      setAviso({ tipo: 'ok', texto: 'Link copiado: pegalo en WhatsApp o en un mail. Quien lo abra ve este proyecto (con tus medidas y precios).' });
    } catch {
      // Sin permiso para el portapapeles: se muestra para copiarlo a mano.
      window.prompt('Copiá este link para compartir el proyecto:', link);
    }
  };

  // Al abrir la app con un link compartido: ofrece abrir ese proyecto (queda sin guardar).
  useEffect(() => {
    const hash = window.location.hash;
    if (!tieneProyectoEnLink(hash)) return;
    const limpiarLink = () => window.history.replaceState(null, '', window.location.pathname + window.location.search);
    leerLinkProyecto(hash).then((r) => {
      limpiarLink(); // si se recarga la página no vuelve a preguntar
      if (!r.ok) {
        setAviso({ tipo: 'error', texto: r.error });
        return;
      }
      if (!window.confirm(`¿Abrir el proyecto compartido "${r.proyecto.nombre}"? Reemplaza lo que tenés en pantalla.`)) return;
      cargarProyecto(r.proyecto);
      setAviso({ tipo: 'ok', texto: `Proyecto compartido "${r.proyecto.nombre}" abierto. Usá "Guardar como…" para quedártelo.` });
    });
    // Solo al cargar la página.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    const nombre = `pollo-calculator-respaldo-${new Date().toISOString().slice(0, 10)}.json`;
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
  // `opcional` agrega "Sin revestimiento" (para el revestimiento interior: '' = no lleva).
  const selectorPanel = (ruta, etiqueta, valor, opcional = false) => (
    <div className="group" key={ruta}>
      <label htmlFor={`panel-${ruta}`}>{etiqueta}</label>
      <select id={`panel-${ruta}`} value={valor} onChange={(e) => cambiar(ruta)(e.target.value)}>
        {opcional && <option value="">Sin revestimiento</option>}
        {paneles.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
      </select>
    </div>
  );

  // Atajo para no repetir props en cada campo de medida.
  // Paredes plegables: preferencia de pantalla de cada navegador (no viaja con el proyecto).
  const [paredesAbiertas, setParedesAbiertas] = useEstadoGuardado('paredesAbiertas', { A: true, B: true, C: true, D: true },
    (v) => v !== null && typeof v === 'object' && LADOS.every((l) => typeof v[l] === 'boolean'));
  const alternarPared = (lado) => setParedesAbiertas((prev) => ({ ...prev, [lado]: !prev[lado] }));

  const medida = (ruta, etiqueta) => (
    <CampoNumero key={ruta} etiqueta={etiqueta} unidad={unidad}
      valor={ruta.split('.').reduce((o, k) => o[k], params)} onCambio={cambiar(ruta)} />
  );

  return (
    <div className="app">
      <header>
        <div className="titulo">
          <h1>🐤 Pollo Calculator <small className="version" title="Versión de la app">v{VERSION_APP}</small></h1>
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
          <button className="btn-sec" onClick={compartirLink} title="Copia un link que abre este proyecto con tus medidas">Compartir</button>
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
          onNuevaGrada={nuevaGrada} onEjemploGrada={cargarEjemploGrada}
          onNuevoMontaje={nuevoMontaje} onEjemploMontaje={cargarEjemploMontaje}
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
            opacidades={opacidades} onCambiarOpacidad={cambiarOpacidad} imagenImpresionRef={imagenImpresionRef}
            onCambiarColor={cambiarColor} onEliminarPieza={eliminarPieza} onEditarPieza={editarPieza}
            onActualizarAbertura={actualizarAbertura} onQuitarAbertura={quitarAbertura}
            onPegarAbertura={pegarAbertura} onDuplicarPieza={duplicarPiezaElegida} />
        </div>

        <div className="columna-panel">
          {/* Foto del 3D para el PDF (se completa al imprimir; ver LoftCanvas). */}
          <figure className="solo-impresion">
            <img ref={imagenImpresionRef} alt="Vista 3D de la estructura" />
            <figcaption>{nombreProyecto || 'Proyecto sin nombre'} · vista 3D al {new Date().toLocaleDateString('es-AR')}</figcaption>
          </figure>
          {/* GRADA (proyecto propio): solo su tarjeta, las piezas y el presupuesto. */}
          {esGrada && (
            <PanelGrada params={params} resumen={estructura.grada.resumen} unidad={unidad} cambiar={cambiar}
              catalogo={catalogo} onCambiarInsumo={cambiarInsumo} />
          )}
          {/* MONTAJE INDUSTRIAL: componentes (mesas, tanques). */}
          {esMontaje && (
            <PanelMontaje params={params} resumenes={estructura.montaje.resumenes} unidad={unidad} cambiar={cambiar} />
          )}

          {/* CONSTRUCCIÓN: planta, paredes, pisos, escalera, techo y fundación. */}
          {esConstruccion && (<>
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
                <div key={lado} className={`pared ${paredesAbiertas[lado] ? 'abierta' : 'cerrada'}`}>
                  {/* El título pliega / despliega la pared (aria-expanded para lectores de pantalla). */}
                  <button type="button" className="pared-titulo plegable" aria-expanded={paredesAbiertas[lado]}
                    aria-controls={`pared-${lado}`} onClick={() => alternarPared(lado)}>
                    <span className="flecha" aria-hidden="true">▸</span>
                    <strong>{nombreLado(lado, params.ladoFrente)}</strong>
                    {params.paredes[lado].etiqueta.trim() && <em>“{params.paredes[lado].etiqueta.trim()}”</em>}
                    <span>lado {lado} · {lados[lado].largo.toFixed(2)} m · alto {h1.toFixed(2)}{Math.abs(h1 - h2) > 0.005 ? ` a ${h2.toFixed(2)}` : ''} m</span>
                  </button>
                  <div className="pared-cuerpo" id={`pared-${lado}`}>
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
                    {selectorPanel(`paredes.${lado}.panel`, 'Revestimiento exterior', params.paredes[lado].panel)}
                    {selectorPanel(`paredes.${lado}.panelInterior`, 'Revestimiento interior', params.paredes[lado].panelInterior, true)}
                  </div>
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
              {medida('anchoEntrepiso', 'Profundidad (0 = sin entrepiso)')}
              {params.anchoEntrepiso > 0 && medida('largoEntrepiso', 'Largo (0 = toda la pared)')}
              {params.anchoEntrepiso > 0 && params.largoEntrepiso > 0 && (
                <CampoSelect etiqueta="Medir desde" valor={params.referenciaEntrepiso}
                  opciones={[['izquierda', 'Esquina izquierda'], ['derecha', 'Esquina derecha']]}
                  onCambio={cambiar('referenciaEntrepiso')} />
              )}
              {params.anchoEntrepiso > 0 && params.largoEntrepiso > 0 && medida('distanciaEntrepiso', 'Dist. a esquina')}
              {params.anchoEntrepiso > 0 && medida('separacionColumnasEntrepiso', 'Columnas del borde libre cada (0 = solo puntas)')}
              {medida('separacionPiso2', 'Sep. estructura de piso 2')}
              {medida('separacionTransversalesPiso2', 'Sep. transversales (0 = sin)')}
            </div>
            <p className="nota">
              Entrepiso parcial: poné el largo y desde qué esquina arranca (vista desde afuera, como las
              aberturas). Los bordes que no tocan una pared llevan <strong>viga de cierre</strong>, con su
              propio renglón en el presupuesto para elegir el perfil.
              La estructura de cada piso cruza la luz más corta. Las transversales unen la estructura para que
              no arquee; su separación la define el herrero según el panel.
            </p>
          </Tarjeta>

          {/* ESCALERA */}
          <PanelEscalera params={params} resumen={estructura.escalera?.resumen} unidad={unidad}
            escalera={estructura.escalera} entrepiso={estructura.entrepiso}
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
              {selectorPanel('panelTecho', 'Revestimiento del techo', params.panelTecho)}
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
          </>)}

          {/* PIEZAS ELIMINADAS Y EDITADAS */}
          <Tarjeta id="eliminadas" titulo={`Piezas agregadas, eliminadas y editadas (${params.piezasAgregadas.length + params.piezasEliminadas.length + Object.keys(params.piezasEditadas).length})`}>
            <p className="nota">
              Hacé clic en un hierro del 3D: podés <strong>eliminarlo</strong> o <strong>editarlo</strong> (recortar,
              mover o cotizarlo con otro perfil). Lo eliminado sale del dibujo y del presupuesto; lo editado se dibuja
              y se cotiza con el cambio. Cada pieza se reconoce por su posición: si cambiás una medida y la pieza se
              mueve, el cambio deja de aplicarse.
            </p>
            {params.piezasAgregadas.length > 0 && (
              <>
                <h3 className="subtitulo">Agregadas (duplicadas)</h3>
                <ul className="opening-list">
                  {params.piezasAgregadas.map((agregada) => {
                    const actual = listarPiezas(estructura).find((p) => p.id === agregada.id) ?? agregada;
                    return (
                      <li key={agregada.id} className="abertura pieza-eliminada">
                        <span>
                          {describirPieza(actual, params.ladoFrente)} · {catalogo.find((p) => p.id === agregada.insumo)?.nombre}
                          <small className="detalle"> · {agregada.id}</small>
                        </span>
                        <button className="btn-sec no-print" onClick={() => eliminarPieza(agregada.id)}>Quitar</button>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
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

          {esConstruccion && (<>
            <PanelAberturas aberturas={aberturasValidas} params={params} unidad={unidad}
              onAgregar={agregarAbertura} onActualizar={actualizarAbertura} onQuitar={quitarAbertura} />
          </>)}

          {/* Qué es cada material (v1.15); los revestimientos solo en una construcción. */}
          <TarjetaMateriales items={items} catalogo={catalogo} revestimientos={esConstruccion ? paneles : null}
            unidad={unidad} usosDeRevestimiento={usosDePanel} excedenteBarras={params.excedenteBarras}
            onCambiarExcedente={cambiar('excedenteBarras')} onCambiarInsumo={cambiarInsumo}
            onAgregarRevestimiento={agregarTipoPanel} onQuitarRevestimiento={quitarTipoPanel} />

          <TablaPresupuesto items={items} total={total} onCambiarInsumo={cambiarInsumo} />
        </div>
      </main>
    </div>
  );
}
