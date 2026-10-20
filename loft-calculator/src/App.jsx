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
import CampoOpcional from './componentes/CampoOpcional.jsx';
import Ayuda from './componentes/Ayuda.jsx';
import { useDialogo, hayDialogoAbierto } from './componentes/useDialogo.js';
import SelectorLado from './componentes/SelectorLado.jsx';
import CampoSelect from './componentes/CampoSelect.jsx';
import AberturasDePared from './componentes/AberturasDePared.jsx';
import TarjetaMateriales from './componentes/TarjetaMateriales.jsx';
import BarraPestanas from './componentes/BarraPestanas.jsx';
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
import { historialVacio, registrarCambio, deshacer, rehacer } from './proyecto/historial.js';
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

/** Total cortito para la pestaña: "$ 7,8 M", "$ 950 mil". */
function pesosCortos(n) {
  if (n >= 1e6) return `$ ${(n / 1e6).toLocaleString('es-AR', { maximumFractionDigits: 1 })} M`;
  if (n >= 1e3) return `$ ${Math.round(n / 1e3).toLocaleString('es-AR')} mil`;
  return `$ ${Math.round(n)}`;
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
  const [menuAbierto, setMenuAbierto] = useState(false); // menú "⋯" del encabezado en el celular
  const { dialogo, confirmar, pedirTexto, mostrarTexto } = useDialogo(); // ventanas propias (v1.19)
  // Ayuda (v1.19): se abre sola la primera vez (salvo que se entre con un link compartido, que ya pregunta algo).
  const [bienvenidaVista, setBienvenidaVista] = useEstadoGuardado('bienvenidaVista', false, (v) => typeof v === 'boolean');
  const [ayudaAbierta, setAyudaAbierta] = useState(() => !bienvenidaVista && !tieneProyectoEnLink(window.location.hash));
  const cerrarAyuda = () => { setAyudaAbierta(false); setBienvenidaVista(true); };

  // --- Deshacer / rehacer (v1.18) ---
  // "Foto" del proyecto: lo que Ctrl+Z puede volver atrás (medidas, aberturas, materiales y precios).
  const fotoActual = useMemo(() => ({ params: paramsGuardados, aberturas, catalogo }), [paramsGuardados, aberturas, catalogo]);
  const [historial, setHistorial] = useState(historialVacio);
  const fotoAnteriorRef = useRef(fotoActual);
  const aplicandoFotoRef = useRef(false); // true mientras se aplica un deshacer/rehacer o se abre un proyecto
  useEffect(() => {
    if (fotoAnteriorRef.current === fotoActual) return;
    // La foto de ANTES se lee acá, no adentro de setHistorial: esa función React la corre más tarde,
    // cuando la línea de abajo ya guardó la foto nueva (y se anotaría la nueva como si fuera la vieja).
    const anterior = fotoAnteriorRef.current;
    const ahora = Date.now();
    if (aplicandoFotoRef.current) aplicandoFotoRef.current = false; // no es un cambio del usuario
    else setHistorial((h) => registrarCambio(h, anterior, ahora));
    fotoAnteriorRef.current = fotoActual;
  }, [fotoActual]);
  /** Pone en pantalla una foto del historial (sin anotarla como cambio nuevo). */
  const aplicarFoto = (foto) => {
    aplicandoFotoRef.current = true;
    setParams(foto.params);
    setAberturas(foto.aberturas);
    setCatalogo(foto.catalogo);
  };
  const deshacerCambio = () => {
    const r = deshacer(historial, fotoActual);
    if (!r) return;
    setHistorial(r.historial);
    aplicarFoto(r.foto);
  };
  const rehacerCambio = () => {
    const r = rehacer(historial, fotoActual);
    if (!r) return;
    setHistorial(r.historial);
    aplicarFoto(r.foto);
  };
  // Ctrl+Z / Ctrl+Y (o Ctrl+Shift+Z). Dentro de un campo de texto se deja el deshacer propio del campo.
  const deshacerRef = useRef(deshacerCambio);
  const rehacerRef = useRef(rehacerCambio);
  deshacerRef.current = deshacerCambio;
  rehacerRef.current = rehacerCambio;
  useEffect(() => {
    const alTeclear = (ev) => {
      if (hayDialogoAbierto() || ev.target.closest?.('input, textarea, select, [contenteditable="true"]')) return;
      if (ev.key === '?') { ev.preventDefault(); setAyudaAbierta(true); return; } // v1.19: ayuda y atajos
      if (!(ev.ctrlKey || ev.metaKey)) return;
      const tecla = ev.key.toLowerCase();
      if (tecla === 'z' && !ev.shiftKey) { ev.preventDefault(); deshacerRef.current(); }
      else if (tecla === 'y' || (tecla === 'z' && ev.shiftKey)) { ev.preventDefault(); rehacerRef.current(); }
    };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, []);

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
  const { items, total, gruposCortes, preciosDistintos } = useMemo(
    () => calcularPresupuesto(estructura, catalogo, { excedenteBarras: params.excedenteBarras, compartir: params.compartirCortes }),
    [estructura, catalogo, params.excedenteBarras, params.compartirCortes]
  );
  const paneles = useMemo(() => tiposDePanel(catalogo), [catalogo]);

  // --- Pestañas del panel (v1.18) ---
  // La elegida se recuerda por navegador. En el celular hay una más, "3D" (vistaMovil):
  // ahí se ve solo el modelo; en las demás, solo los datos (el 3D tapaba toda la pantalla).
  const [pestanaGuardada, setPestanaGuardada] = useEstadoGuardado('pestana', 'estructura', (v) => typeof v === 'string');
  const [vistaMovil, setVistaMovil] = useState('datos');
  const pestanas = [
    { clave: '3d', nombre: '3D', soloMovil: true },
    { clave: 'estructura', nombre: esGrada ? 'Grada' : esMontaje ? 'Montaje' : 'Estructura' },
    ...(esConstruccion ? [{ clave: 'paredes', nombre: 'Paredes y aberturas', corto: 'Paredes' }] : []),
    { clave: 'materiales', nombre: 'Materiales' },
    { clave: 'presupuesto', nombre: 'Presupuesto', detalle: pesosCortos(total) },
  ];
  // Si la guardada no existe en este tipo de proyecto (ej. "Paredes" en una grada), se usa la primera.
  const pestanaActiva = pestanas.some((p) => p.clave === pestanaGuardada && !p.soloMovil) ? pestanaGuardada : 'estructura';
  const elegirPestana = (clave) => {
    if (clave === '3d') {
      setVistaMovil('3d');
      return;
    }
    setVistaMovil('datos');
    setPestanaGuardada(clave);
  };
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

  // Aviso del navegador al cerrar o recargar la pestaña con cambios sin guardar (v1.18.1).
  // Solo si el proyecto ya está en Mis proyectos: uno "sin guardar" igual se recuerda en el navegador.
  useEffect(() => {
    if (!(entradaActual && cambiosSinGuardar)) return undefined;
    const alCerrar = (ev) => {
      ev.preventDefault();
      ev.returnValue = ''; // algunos navegadores lo necesitan para mostrar el aviso
    };
    window.addEventListener('beforeunload', alCerrar);
    return () => window.removeEventListener('beforeunload', alCerrar);
  }, [entradaActual, cambiosSinGuardar]);

  /** Reemplaza todo el proyecto en pantalla (nuevo, ejemplo, de la lista o de un archivo). */
  const cargarProyecto = (proyecto, idEnBiblioteca = null) => {
    setNombreProyecto(proyecto.nombre);
    // Otro proyecto: el historial arranca de cero (Ctrl+Z no vuelve al proyecto anterior).
    setHistorial(historialVacio());
    aplicarFoto(proyecto);
    setColores(proyecto.colores);
    setIdProyectoActual(idEnBiblioteca);
  };

  /** Antes de reemplazar el proyecto en pantalla: avisa si hay cambios sin guardar. @returns Promise<boolean> */
  const puedoReemplazar = async () =>
    !cambiosSinGuardar ||
    confirmar({
      titulo: 'Cambios sin guardar',
      mensaje: `"${nombreProyecto || 'Proyecto sin nombre'}" tiene cambios sin guardar. Si seguís, se pierden.`,
      aceptar: 'Seguir sin guardar', cancelar: 'Volver', peligro: true,
    });

  /** Guarda en Mis proyectos con un id (nuevo o el actual). Si el navegador no tiene lugar, avisa el hook. */
  const guardarEnBiblioteca = (id, nombre) => {
    const entrada = crearEntrada(proyectoActual, { id, nombre });
    setBiblioteca((prev) => guardarEntrada(prev, entrada));
    setNombreProyecto(entrada.nombre);
    setIdProyectoActual(entrada.id);
    setAviso({ tipo: 'ok', texto: `Guardado en Mis proyectos: "${entrada.nombre}"` });
  };

  /** "Guardar como…": pide un nombre y crea un proyecto nuevo en la lista. */
  const guardarComo = async () => {
    const nombre = await pedirTexto({
      titulo: 'Guardar como…', mensaje: 'Se guarda en Mis proyectos de este navegador.',
      etiqueta: 'Nombre del proyecto', valorInicial: nombreProyecto || '', aceptar: 'Guardar',
    });
    if (nombre === null) return; // canceló
    if (!nombre.trim()) {
      setAviso({ tipo: 'error', texto: 'Poné un nombre para guardar el proyecto.' });
      return;
    }
    guardarEnBiblioteca(nuevoId(), nombre);
  };

  /** "Guardar": pisa el proyecto abierto; si nunca se guardó, funciona como "Guardar como…". */
  const guardar = () => (entradaActual ? guardarEnBiblioteca(entradaActual.id, nombreProyecto) : guardarComo());

  const abrirDeBiblioteca = async (entrada) => {
    if (entrada.id !== idProyectoActual && !(await puedoReemplazar())) return;
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
  const nuevoProyecto = async () => {
    if (!(await puedoReemplazar())) return;
    cargarProyecto(proyectoVacio());
    setMostrarProyectos(false);
    setAviso({ tipo: 'ok', texto: 'Proyecto nuevo: cargá las medidas, los perfiles y los precios. Después "Guardar como…".' });
  };

  /** "+ Grada nueva" y "Ejemplo: grada": proyectos de tipo grada. */
  const nuevaGrada = async () => {
    if (!(await puedoReemplazar())) return;
    cargarProyecto(gradaNueva());
    setMostrarProyectos(false);
    setAviso({ tipo: 'ok', texto: 'Grada nueva: cargá las filas, los perfiles y los precios. Después "Guardar como…".' });
  };
  const cargarEjemploGrada = async () => {
    if (!(await puedoReemplazar())) return;
    cargarProyecto(gradaEjemplo());
    setMostrarProyectos(false);
    setAviso({ tipo: 'ok', texto: 'Ejemplo cargado: grada de 6 filas x 6 m.' });
  };

  /** "+ Montaje nuevo" y "Ejemplo: montaje": proyectos de montaje industrial. */
  const nuevoMontaje = async () => {
    if (!(await puedoReemplazar())) return;
    cargarProyecto(montajeNuevo());
    setMostrarProyectos(false);
    setAviso({ tipo: 'ok', texto: 'Montaje nuevo: agregá mesas y tanques, cargá sus medidas, perfiles y precios. Después "Guardar como…".' });
  };
  const cargarEjemploMontaje = async () => {
    if (!(await puedoReemplazar())) return;
    cargarProyecto(montajeEjemplo());
    setMostrarProyectos(false);
    setAviso({ tipo: 'ok', texto: 'Ejemplo cargado: mesa de trabajo + tanque de agua.' });
  };

  /** "Ejemplo": carga el loft de referencia (sin guardar). */
  const cargarEjemplo = async () => {
    if (!(await puedoReemplazar())) return;
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
      mostrarTexto({ titulo: 'Link para compartir', mensaje: 'No se pudo copiar solo: copialo de acá (ya está seleccionado).', etiqueta: 'Link del proyecto', valorInicial: link });
    }
  };

  // Al abrir la app con un link compartido: ofrece abrir ese proyecto (queda sin guardar).
  useEffect(() => {
    const hash = window.location.hash;
    if (!tieneProyectoEnLink(hash)) return;
    const limpiarLink = () => window.history.replaceState(null, '', window.location.pathname + window.location.search);
    leerLinkProyecto(hash).then(async (r) => {
      limpiarLink(); // si se recarga la página no vuelve a preguntar
      if (!r.ok) {
        setAviso({ tipo: 'error', texto: r.error });
        return;
      }
      const abrir = await confirmar({
        titulo: 'Proyecto compartido',
        mensaje: `¿Abrir "${r.proyecto.nombre}"? Reemplaza lo que tenés en pantalla.`,
        aceptar: 'Abrir', cancelar: 'No, seguir con el mío',
      });
      if (!abrir) return;
      cargarProyecto(r.proyecto);
      setAviso({ tipo: 'ok', texto: `Proyecto compartido "${r.proyecto.nombre}" abierto. Usá "Guardar como…" para quedártelo.` });
    });
    // Solo al cargar la página.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Abre un .json: queda en pantalla como proyecto sin guardar (después "Guardar como…"). */
  const abrirArchivo = async (texto) => {
    const r = leerArchivoProyecto(texto);
    if (!r.ok) {
      setAviso({ tipo: 'error', texto: r.error });
      return;
    }
    if (!(await puedoReemplazar())) return;
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
  /** Casilla + medida (v1.19): reemplaza los campos "(0 = sin)". 0 guardado = destildada. */
  const opcional = (ruta, casilla, etiqueta, valorPorDefecto) => (
    <CampoOpcional key={ruta} casilla={casilla} etiqueta={etiqueta} unidad={unidad} valorPorDefecto={valorPorDefecto}
      valor={ruta.split('.').reduce((o, k) => o[k], params)} onCambio={cambiar(ruta)} />
  );

  return (
    <div className="app">
      <header>
        <div className="titulo">
          <h1 title={`Pollo Calculator v${VERSION_APP}`}>🐤 <span className="nombre-app">Pollo Calculator</span> <small className="version" title="Versión de la app">v{VERSION_APP}</small></h1>
          <input className="nombre-proyecto" value={nombreProyecto} aria-label="Nombre del proyecto"
            onChange={(e) => setNombreProyecto(e.target.value)} placeholder="Nombre del proyecto…" />
          <span className={`estado-guardado${cambiosSinGuardar ? ' sin-guardar' : ''}`} role="status">
            {!entradaActual ? 'Sin guardar' : cambiosSinGuardar ? '● Cambios sin guardar' : '✓ Guardado'}
          </span>
        </div>
        <div className="header-actions no-print">
          {/* Deshacer / rehacer (v1.18): también Ctrl+Z y Ctrl+Y. */}
          <button className="btn-sec btn-historial" onClick={deshacerCambio} disabled={historial.pasado.length === 0}
            title="Deshacer (Ctrl+Z)" aria-label="Deshacer">↶</button>
          <button className="btn-sec btn-historial" onClick={rehacerCambio} disabled={historial.futuro.length === 0}
            title="Rehacer (Ctrl+Y)" aria-label="Rehacer">↷</button>
          <button className="btn-print" onClick={guardar} disabled={entradaActual && !cambiosSinGuardar}>Guardar</button>
          {/* En el celular el resto va en un menú "⋯" (el encabezado ocupaba 3 renglones). */}
          <button className="btn-sec solo-movil" onClick={() => setMenuAbierto((v) => !v)} aria-expanded={menuAbierto}
            aria-controls="acciones-secundarias" aria-label="Más acciones">⋯</button>
          <div id="acciones-secundarias" className={`acciones-secundarias${menuAbierto ? ' abierto' : ''}`}
            onClick={(ev) => { if (ev.target.closest('button')) setMenuAbierto(false); }}>
          <button className="btn-sec" onClick={() => setMostrarProyectos(true)}>Mis proyectos ({biblioteca.length})</button>
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
          <button className="btn-sec btn-ayuda" onClick={() => setAyudaAbierta(true)} title="Ayuda y atajos de teclado (?)"
            aria-label="Ayuda y atajos de teclado">?<span className="solo-movil"> Ayuda y atajos</span></button>
          <small className="solo-movil version-menu">Pollo Calculator v{VERSION_APP}</small>
          </div>
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
          confirmar={confirmar} pedirTexto={pedirTexto}
        />
      )}

      {/* Diálogos propios (v1.19): ¿Borrar?, Guardar como…, cambios sin guardar */}
      {dialogo}
      {ayudaAbierta && <Ayuda primeraVez={!bienvenidaVista} onCerrar={cerrarAyuda} />}

      {aviso && (
        <div className={`aviso aviso-${aviso.tipo} no-print`} role={aviso.tipo === 'error' ? 'alert' : 'status'}>
          {aviso.texto}
          <button onClick={() => setAviso(null)} aria-label="Cerrar aviso">✕</button>
        </div>
      )}

      <main className={`layout${ver3D ? '' : ' sin-visor'} movil-${vistaMovil}`}>
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
          {/* Pestañas (v1.18): una sección a la vez. En el celular la barra va fija abajo, con "3D". */}
          <BarraPestanas pestanas={pestanas} activa={vistaMovil === '3d' ? '3d' : pestanaActiva} onElegir={elegirPestana} />

          <section id="pestana-estructura" role="tabpanel" aria-labelledby="boton-estructura"
            className={`pestana${pestanaActiva === 'estructura' ? '' : ' oculta'}`}>
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

          {/* PISOS */}
          <Tarjeta id="pisos" titulo="Pisos">
            <h3 className="subtitulo">Planta baja</h3>
            <div className="grid-params">
              {medida('separacionPiso', 'Sep. estructura de piso')}
              {opcional('separacionTransversalesPiso', 'Lleva transversales', 'Transversales cada', 1.5)}
            </div>
            <h3 className="subtitulo">Piso 2 (entrepiso)</h3>
            <div className="grid-params">
              {opcional('anchoEntrepiso', 'Lleva entrepiso', 'Profundidad', 3)}
              {params.anchoEntrepiso > 0 && (
                <SelectorLado etiqueta="Apoyado en" valor={params.ladoEntrepiso} params={params}
                  onCambio={cambiar('ladoEntrepiso')} />
              )}
              {params.anchoEntrepiso > 0 && opcional('largoEntrepiso', 'Parcial (no toda la pared)', 'Largo',
                Math.max(1, Math.round(lados[params.ladoEntrepiso].largo / 2)))}
              {params.anchoEntrepiso > 0 && params.largoEntrepiso > 0 && (
                <CampoSelect etiqueta="Medir desde" valor={params.referenciaEntrepiso}
                  opciones={[['izquierda', 'Esquina izquierda'], ['derecha', 'Esquina derecha']]}
                  onCambio={cambiar('referenciaEntrepiso')} />
              )}
              {params.anchoEntrepiso > 0 && params.largoEntrepiso > 0 && medida('distanciaEntrepiso', 'Dist. a esquina')}
              {params.anchoEntrepiso > 0 && opcional('separacionColumnasEntrepiso', 'Columnas intermedias en el borde libre', 'Columnas cada', 2.5)}
              {params.anchoEntrepiso > 0 && medida('separacionPiso2', 'Sep. estructura de piso 2')}
              {params.anchoEntrepiso > 0 && opcional('separacionTransversalesPiso2', 'Lleva transversales', 'Transversales cada', 1.5)}
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

          </section>
          {esConstruccion && (
          <section id="pestana-paredes" role="tabpanel" aria-labelledby="boton-paredes"
            className={`pestana${pestanaActiva === 'paredes' ? '' : ' oculta'}`}>
          {/* PAREDES (PANELES) */}
          <Tarjeta id="paredes" titulo="Paredes">
            <p className="nota">
              <strong>Columnas</strong>: verticales principales a lo largo de la pared.{' '}
              <strong>Horizontales (fajas)</strong>: separación en altura.{' '}
              <strong>Montantes</strong>: verticales livianos entre columnas (en una abertura quedan arriba del dintel
              y abajo del antepecho). Cada pared tiene sus <strong>aberturas</strong>; las medidas se toman mirando la
              pared desde afuera y el <strong>antepecho</strong> es la altura del piso a la ventana.
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
                    {medida(`paredes.${lado}.separacionVerticales`, 'Sep. columnas')}
                    {medida(`paredes.${lado}.separacionHorizontales`, 'Sep. horizontales (fajas)')}
                    {opcional(`paredes.${lado}.separacionMontantes`, 'Lleva montantes', 'Montantes cada', 0.6)}
                    <CampoSelect etiqueta="Riostras en cruz" valor={params.paredes[lado].riostras}
                      opciones={[['no', 'Sin riostras'], ['extremos', 'En las puntas'], ['todos', 'En todos los vanos']]}
                      onCambio={cambiar(`paredes.${lado}.riostras`)} />
                    {selectorPanel(`paredes.${lado}.panel`, 'Revestimiento exterior', params.paredes[lado].panel)}
                    {selectorPanel(`paredes.${lado}.panelInterior`, 'Revestimiento interior', params.paredes[lado].panelInterior, true)}
                  </div>
                  {/* Aberturas de esta pared (v1.17): antes estaban en una tarjeta aparte. */}
                  <AberturasDePared lado={lado} aberturas={aberturasValidas} params={params} unidad={unidad}
                    onAgregar={agregarAbertura} onActualizar={actualizarAbertura} onQuitar={quitarAbertura} />
                  </div>
                </div>
              );
            })}
          </Tarjeta>

          </section>
          )}
          <section id="pestana-materiales" role="tabpanel" aria-labelledby="boton-materiales"
            className={`pestana${pestanaActiva === 'materiales' ? '' : ' oculta'}`}>
          {/* Qué es cada material (v1.15); los revestimientos solo en una construcción. */}
          <TarjetaMateriales items={items} catalogo={catalogo} revestimientos={esConstruccion ? paneles : null}
            unidad={unidad} usosDeRevestimiento={usosDePanel} excedenteBarras={params.excedenteBarras}
            onCambiarExcedente={cambiar('excedenteBarras')} onCambiarInsumo={cambiarInsumo}
            compartirCortes={params.compartirCortes !== false} onCambiarCompartir={cambiar('compartirCortes')}
            preciosDistintos={preciosDistintos}
            onAgregarRevestimiento={agregarTipoPanel} onQuitarRevestimiento={quitarTipoPanel} />

          </section>
          <section id="pestana-presupuesto" role="tabpanel" aria-labelledby="boton-presupuesto"
            className={`pestana${pestanaActiva === 'presupuesto' ? '' : ' oculta'}`}>
          <TablaPresupuesto items={items} total={total} gruposCortes={gruposCortes} onCambiarInsumo={cambiarInsumo} />
          </section>
        </div>
      </main>
    </div>
  );
}
