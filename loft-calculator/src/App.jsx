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
import CampoSeparacion from './componentes/CampoSeparacion.jsx';
import { BotonResaltar, ZonaResaltable } from './componentes/Resaltar.jsx';
import { ContextoResaltado } from './componentes/contextoResaltado.js';
import { contarResaltadas, mismoCriterio } from './motor/resaltado.js';
import Ayuda from './componentes/Ayuda.jsx';
import { useDialogo, hayDialogoAbierto } from './componentes/useDialogo.js';
import SelectorLado from './componentes/SelectorLado.jsx';
import CampoSelect from './componentes/CampoSelect.jsx';
import AberturasDePared from './componentes/AberturasDePared.jsx';
import TarjetaMateriales from './componentes/TarjetaMateriales.jsx';
import BarraPestanas from './componentes/BarraPestanas.jsx';
import PanelEscalera from './componentes/PanelEscalera.jsx';
import PanelTerreno from './componentes/PanelTerreno.jsx';
import TarjetaUniones from './componentes/TarjetaUniones.jsx';
import { implantacion as calcularImplantacion } from './motor/terreno.js';
import { moduloActivo } from './modulos.js';
import PanelGrada from './componentes/PanelGrada.jsx';
import PanelMontaje from './componentes/PanelMontaje.jsx';
import TablaPresupuesto from './componentes/TablaPresupuesto.jsx';
import { useEstadoGuardado } from './hooks/useEstadoGuardado.js';
import { validarParametros, validarAbertura, copiarAbertura, LARGO_MAXIMO_ETIQUETA } from './motor/validacion.js';
import { esEdicionVacia } from './motor/edicionPiezas.js';
import { duplicarPieza, PREFIJO_AGREGADA } from './motor/piezasAgregadas.js';
import { generarEstructura, listarPiezas, infoSeparacion } from './motor/estructura.js';
import { CAMPOS_CON_CANTIDAD, MAXIMO_CANTIDAD, cantidadDe } from './motor/cantidades.js';
import { calcularPresupuesto, CATALOGO_INICIAL, tiposDePanel } from './motor/presupuesto.js';
import { resolverCatalogo, PERFIL_NUEVO, perfilesDeLista } from './motor/perfiles.js';
import { proveedoresDe, aplicarProveedor, faltanPrecios, MAS_BARATO, planDeCompra, masBaratoEn, totalDeLaObra, listaDeMateriales } from './motor/proveedores.js';
import SelectorPerfil from './componentes/SelectorPerfil.jsx';
import Planos from './componentes/Planos.jsx';
import { todasLasVistas } from './motor/planos.js';
import { libroDeObra } from './proyecto/exportarExcel.js';
import { resumenDeObra } from './proyecto/resumenObra.js';
import { OPCIONES_IMPRESION_INICIALES, opcionesImpresionValidas } from './proyecto/opcionesImpresion.js';
import DialogoImprimir from './componentes/DialogoImprimir.jsx';
import HojasImpresion from './componentes/HojasImpresion.jsx';
import { flushSync } from 'react-dom';
import { migrarParams, normalizarCatalogo } from './motor/migracion.js';
import { PARAMS_INICIALES, ABERTURAS_INICIALES } from './motor/parametrosIniciales.js';
import { LADOS, INSUMO } from './motor/constantes.js';
import { nombreLado, alturasPared, geometriaLados, alturaMaxima } from './motor/geometria.js';
import { COLORES_INICIALES, coloresValidos, completarColores } from './capas.js';
import { crearArchivoProyecto, leerArchivoProyecto, nombreDeArchivo } from './proyecto/archivoProyecto.js';
import { crearLinkProyecto, leerLinkProyecto, tieneProyectoEnLink } from './proyecto/linkProyecto.js';
import { nubeDisponible, crearEnNube, leerDeNube, guardarEnNube, leerHashNube, linksNube } from './proyecto/nube.js';
import DialogoCompartir from './componentes/DialogoCompartir.jsx';
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
/** v1.22: perfiles que se pueden cambiar en cada pared: [campo, etiqueta, renglón general]. */
const PERFILES_PARED_UI = [
  ['perfilColumnas', 'Columnas', INSUMO.COLUMNA],
  ['perfilHorizontales', 'Horizontales (fajas)', INSUMO.CORREA],
  ['perfilMontantes', 'Montantes', INSUMO.MONTANTE],
  ['perfilMarcos', 'Solera y borde de piso', INSUMO.MARCO],
];

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
const OPACIDADES_INICIALES = { paneles: 0.35, osb: 0.45, hierros: 1, juntas: 1 }; // juntas: v1.24
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
/** Total completo para la pestaña (v1.28.1: antes "$ 9,4 M", ahora "$ 9.483.620"). */
function pesosCompletos(n) {
  return n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
}

export default function App() {
  const [unidad, setUnidad] = useState('m');
  const [paramsGuardados, setParams] = useEstadoGuardado('params', PARAMS_INICIALES, paramsGuardadosValidos, migrarParams);
  const [aberturas, setAberturas] = useEstadoGuardado('aberturas', ABERTURAS_INICIALES, aberturasGuardadasValidas);
  const [catalogo, setCatalogo] = useEstadoGuardado('catalogo', CATALOGO_INICIAL, catalogoGuardadoValido, normalizarCatalogo);
  const params = useMemo(() => conPanelesExistentes(paramsGuardados, catalogo), [paramsGuardados, catalogo]);
  const [colores, setColores] = useEstadoGuardado('colores', COLORES_INICIALES, coloresValidos, completarColores);
  // Opacidad del 3D (por navegador, como ver u ocultar el 3D): paneles, OSB y hierros.
  // Las guardadas antes de v1.24 no tienen "juntas": se completan con las de fábrica (no se pierden las demás).
  const [opacidades, setOpacidades] = useEstadoGuardado('opacidades', OPACIDADES_INICIALES, opacidadesValidas,
    (o) => ({ ...OPACIDADES_INICIALES, ...o }));
  // v1.28: imprimir y exportar. capturaRef = función de LoftCanvas que saca las fotos del 3D.
  const capturaRef = useRef(null);
  const [opcionesImpresion, setOpcionesImpresion] = useEstadoGuardado('impresion', OPCIONES_IMPRESION_INICIALES, opcionesImpresionValidas);
  const [dialogoImprimir, setDialogoImprimir] = useState(false);
  const [capturas, setCapturas] = useState(null); // fotos del 3D para las hojas del PDF
  const [medidasFijas, setMedidasFijas] = useState([]); // las de LoftCanvas, en texto (para el PDF y el Excel)
  const [nombreProyecto, setNombreProyecto] = useEstadoGuardado('nombre', 'Loft', (n) => typeof n === 'string');
  const [aviso, setAviso] = useState(null); // { tipo: 'ok' | 'error', texto }
  // "Mis proyectos": lista guardada en el navegador y cuál está abierto (null = sin guardar).
  const [biblioteca, setBiblioteca] = useEstadoGuardado('biblioteca', [], esBibliotecaValida, undefined, () =>
    setAviso({ tipo: 'error', texto: 'No se pudo guardar en Mis proyectos: el navegador no tiene lugar. Descargá el proyecto como archivo (.json).' }));
  const [idProyectoActual, setIdProyectoActual] = useEstadoGuardado('proyectoActual', null, (v) => v === null || typeof v === 'string');
  // v1.30: link en la nube del proyecto en pantalla: { id, clave (null = solo ver), rev } o null.
  const [nube, setNube] = useEstadoGuardado('nube', null, (v) => v === null
    || (typeof v === 'object' && typeof v.id === 'string' && (v.clave === null || typeof v.clave === 'string') && Number.isInteger(v.rev)));
  const [dialogoCompartir, setDialogoCompartir] = useState(false);
  // Ver u ocultar el 3D: oculto, el panel de datos usa todo el ancho (cómodo para cargar en el celular).
  const [ver3D, setVer3D] = useEstadoGuardado('ver3D', true, (v) => typeof v === 'boolean');
  const [mostrarProyectos, setMostrarProyectos] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(false); // menú "⋯" del encabezado en el celular
  const { dialogo, confirmar, pedirTexto, mostrarTexto } = useDialogo(); // ventanas propias (v1.19)
  // Ayuda (v1.19): se abre sola la primera vez (salvo que se entre con un link compartido, que ya pregunta algo).
  const [bienvenidaVista, setBienvenidaVista] = useEstadoGuardado('bienvenidaVista', false, (v) => typeof v === 'boolean');
  const [ayudaAbierta, setAyudaAbierta] = useState(() => !bienvenidaVista && !tieneProyectoEnLink(window.location.hash)
    && !leerHashNube(window.location.hash)); // v1.30.2: con link de la nube tampoco (si no, la confirmación queda encima)
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
  // v1.33: con el catálogo, las piezas que se cruzan se cortan contra la que queda entera (uniones).
  const estructura = useMemo(() => generarEstructura(params, aberturasValidas, catalogo), [params, aberturasValidas, catalogo]);
  const esGrada = params.tipoProyecto === 'grada'; // proyecto de grada: otra pantalla de datos
  const esMontaje = params.tipoProyecto === 'montaje'; // montaje industrial: mesas, tanques...
  const esConstruccion = !esGrada && !esMontaje;
  // v1.25: con qué proveedor y forma de pago se calcula ('' o uno que ya no existe = el primero).
  const proveedores = useMemo(() => proveedoresDe(catalogo), [catalogo]);
  const proveedorElegido = params.proveedorElegido === MAS_BARATO || proveedores.some((p) => p.id === params.proveedorElegido)
    ? params.proveedorElegido : proveedores[0]?.id;
  const formaPago = params.formaPago ?? 'efectivo';
  const opcionesPresupuesto = { excedenteBarras: params.excedenteBarras, compartir: params.compartirCortes };
  const { items, total, gruposCortes } = useMemo(
    () => calcularPresupuesto(estructura, catalogo, { ...opcionesPresupuesto, proveedor: proveedorElegido, pago: formaPago }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [estructura, catalogo, params.excedenteBarras, params.compartirCortes, proveedorElegido, formaPago]
  );
  // v1.25: el total con cada proveedor (y con lo más barato de cada material), en efectivo y con tarjeta.
  const comparacion = useMemo(() => [...proveedores.map((p) => ({ id: p.id, nombre: p.nombre })),
    { id: MAS_BARATO, nombre: 'Lo más barato de cada material' }].map(({ id, nombre }) => ({
    id,
    nombre,
    ...Object.fromEntries(['efectivo', 'tarjeta'].map((pago) => {
      const r = calcularPresupuesto(estructura, catalogo, { ...opcionesPresupuesto, proveedor: id, pago });
      return [pago, { total: r.total, faltan: faltanPrecios(r.items) }];
    })),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  })), [estructura, catalogo, proveedores, params.excedenteBarras, params.compartirCortes]);
  // v1.29: plan de compra (a quién comprarle cada material, contando el flete), con las cantidades de este presupuesto.
  const planCompra = useMemo(() => planDeCompra(items, resolverCatalogo(catalogo), formaPago), [items, catalogo, formaPago]);
  // v1.30.2: el total de la obra (pestaña y TOTAL) es el del plan de compra cuando hay varios proveedores:
  // el de un solo proveedor deja afuera lo que ese no vende (ej. los paneles de otro).
  const totalObra = totalDeLaObra(total, planCompra, proveedores.length);
  // v1.31.0: todos los materiales de la obra, sin proveedor (sub-pestaña Materiales del presupuesto).
  const listaMateriales = useMemo(() => listaDeMateriales(items, resolverCatalogo(catalogo)), [items, catalogo]);
  // Catálogo con los precios elegidos (para los desplegables de perfiles y el 3D).
  const catalogoConPrecios = useMemo(() => aplicarProveedor(catalogo, proveedorElegido, formaPago), [catalogo, proveedorElegido, formaPago]);
  const paneles = useMemo(() => tiposDePanel(catalogo), [catalogo]);
  // v1.21: cada uso con el nombre, la barra y el precio de su perfil (para el 3D y el editor de piezas).
  const catalogoResuelto = useMemo(() => resolverCatalogo(catalogoConPrecios), [catalogoConPrecios]);
  // v1.26: cada pared y planta en 2D (pestaña Planos, PDF y Excel).
  const vistas = useMemo(() => todasLasVistas(estructura, params, catalogoResuelto, aberturasValidas),
    [estructura, params, catalogoResuelto, aberturasValidas]);

  // --- Pestañas del panel (v1.18) ---
  // La elegida se recuerda por navegador. En el celular hay una más, "3D" (vistaMovil):
  // ahí se ve solo el modelo; en las demás, solo los datos (el 3D tapaba toda la pantalla).
  const [pestanaGuardada, setPestanaGuardada] = useEstadoGuardado('pestana', 'estructura', (v) => typeof v === 'string');
  const [vistaMovil, setVistaMovil] = useState('datos');
  const pestanas = [
    { clave: '3d', nombre: '3D', soloMovil: true },
    { clave: 'estructura', nombre: esGrada ? 'Grada' : esMontaje ? 'Montaje' : 'Estructura', corto: esGrada ? 'Grada' : esMontaje ? 'Montaje' : 'Estruct.' },
    ...(esConstruccion ? [{ clave: 'paredes', nombre: 'Paredes y aberturas', corto: 'Paredes' }] : []),
    { clave: 'materiales', nombre: 'Materiales' },
    { clave: 'presupuesto', nombre: 'Presupuesto', corto: 'Presup.', detalle: pesosCompletos(totalObra) },
    { clave: 'planos', nombre: 'Planos' }, // v1.26: paredes y plantas acotadas, para imprimir y exportar
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
  // v1.32: la casa en su terreno (distancias, avisos) y el pedido para que el 3D muestre todo el lote.
  // Módulo Terreno (se puede apagar por instalación, ver modulos.js): apagado, no se muestra nada (los datos quedan).
  const moduloTerreno = moduloActivo('terreno');
  const implantacion = useMemo(() => (moduloTerreno ? calcularImplantacion(params) : null), [params, moduloTerreno]);
  const [pedidoVerTerreno, setPedidoVerTerreno] = useState(0);
  const verTerreno = () => {
    setPedidoVerTerreno((n) => n + 1);
    if (window.matchMedia?.('(max-width: 1000px)').matches) setVistaMovil('3d'); // en el celular, ir al 3D
  };

  // --- Resaltar en el 3D (v1.27) ---
  // Con el mouse encima (o el foco adentro) de un perfil, un renglón o una parte, el 3D pinta sus piezas.
  // El 👁 lo deja fijo (en el celular además pasa a la vista 3D). Manda el del mouse; si no hay, el fijo.
  const [resaltadoMouse, setResaltadoMouse] = useState(null);
  const [resaltadoFijo, setResaltadoFijo] = useState(null);
  const resaltado = resaltadoMouse ?? resaltadoFijo;
  const contextoResaltado = useMemo(() => ({
    fijo: resaltadoFijo,
    alPasar: (criterio) => setResaltadoMouse((prev) => (mismoCriterio(prev, criterio) ? prev : criterio)),
    alternarFijo: (criterio) => {
      const soltar = mismoCriterio(resaltadoFijo, criterio);
      setResaltadoFijo(soltar ? null : criterio);
      if (!soltar && window.matchMedia?.('(max-width: 1000px)').matches) setVistaMovil('3d');
    },
  }), [resaltadoFijo]);
  const cantidadResaltadas = useMemo(
    () => (resaltado ? contarResaltadas(listarPiezas(estructura), resaltado, catalogoResuelto) : 0),
    [resaltado, estructura, catalogoResuelto]);
  const cartelResaltado = resaltado
    ? `${resaltado.nombre}: ${cantidadResaltadas === 0 ? 'no hay piezas' : `${cantidadResaltadas} pieza${cantidadResaltadas === 1 ? '' : 's'}`}${resaltado === resaltadoFijo ? ' (fijado)' : ''}`
    : null;
  // Esc suelta el resaltado fijo (salvo escribiendo en un campo: ahí Esc deshace lo escrito).
  useEffect(() => {
    if (!resaltadoFijo) return undefined;
    const alTeclear = (e) => {
      if (e.key !== 'Escape' || hayDialogoAbierto() || e.target.closest?.('input, select, textarea')) return;
      setResaltadoFijo(null);
    };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [resaltadoFijo]);

  // --- Handlers (manejadores de eventos) ---

  /**
   * Prueba un cambio en `ruta`. Si deja datos inválidos devuelve el
   * mensaje de error (y no guarda); si está bien, guarda y devuelve null.
   */
  const cambiar = (ruta) => (valor) => aplicarSiValido(conValor(params, ruta, valor), ruta);

  /** Valida unos parámetros nuevos y, si están bien, los deja. Devuelve el error (para el campo `ruta`) o null. */
  const aplicarSiValido = (nuevos, ruta) => {
    const errores = validarParametros(nuevos);
    if (Object.keys(errores).length > 0) return errores[ruta] || Object.values(errores)[0];

    const aberturaQueNoEntra = aberturas.find((op) => validarAbertura(op, nuevos) !== null);
    if (aberturaQueNoEntra) {
      return `Una ${aberturaQueNoEntra.tipo} (${nombreLado(aberturaQueNoEntra.lado, nuevos.ladoFrente)}) dejaría de entrar. Movela o quitala primero.`;
    }
    setParams(nuevos);
    return null;
  };

  // --- Separaciones por medida o por cantidad (v1.27) ---
  const cantidades = params.cantidades ?? {};
  const sinCantidad = (ruta) => Object.fromEntries(Object.entries(cantidades).filter(([k]) => k !== ruta));
  /** Cantidad nueva para un campo (ya validado entero en CampoSeparacion). */
  const cambiarCantidad = (ruta) => (n) => aplicarSiValido({ ...params, cantidades: { ...cantidades, [ruta]: n } }, ruta);

  /**
   * Pasa un campo de medida a cantidad (o al revés) llevando el valor, así la estructura no salta:
   * "cada 2.50 m" en 7.50 m → "4 columnas"; y al volver, la separación pareja que daban.
   * 'sin' = destildar un opcional: por medida y en 0.
   */
  const cambiarModo = (ruta, modo) => {
    const info = infoSeparacion(params, ruta);
    const { minimo } = CAMPOS_CON_CANTIDAD[ruta];
    if (modo === 'sin') return aplicarSiValido(conValor({ ...params, cantidades: sinCantidad(ruta) }, ruta, 0), ruta);
    if (modo === 'cantidad') {
      const estimada = info.porVano ? montantesPorVanoEstimados(ruta) : info.cantidad ?? 3;
      const n = Math.min(MAXIMO_CANTIDAD, Math.max(minimo, 1, estimada));
      return aplicarSiValido({ ...params, cantidades: { ...cantidades, [ruta]: n } }, ruta);
    }
    // A medida: la separación que daba la cantidad, redondeada al cm (si no vale, queda la medida de antes).
    const sinEsta = { ...params, cantidades: sinCantidad(ruta) };
    const separacion = info.porVano ? separacionMontantesEstimada(ruta) : info.separacion;
    if (separacion > 0) {
      const conMedida = conValor(sinEsta, ruta, Math.round(separacion * 100) / 100);
      if (Object.keys(validarParametros(conMedida)).length === 0) return aplicarSiValido(conMedida, ruta);
    }
    return aplicarSiValido(sinEsta, ruta);
  };
  /** Montantes: con la separación de columnas de su pared se estima cuántos entran por vano (y al revés). */
  const separacionColumnas = (ruta) => infoSeparacion(params, ruta.replace('separacionMontantes', 'separacionVerticales')).separacion;
  const montantesPorVanoEstimados = (ruta) => {
    const medidaMontantes = ruta.split('.').reduce((o, k) => o[k], params);
    return medidaMontantes > 0 ? Math.round(separacionColumnas(ruta) / medidaMontantes) - 1 : 1;
  };
  const separacionMontantesEstimada = (ruta) => separacionColumnas(ruta) / ((cantidades[ruta] ?? 0) + 1);

  const cambiarInsumo = (id, campo, valor) =>
    setCatalogo((prev) => prev.map((p) => (p.id === id ? { ...p, [campo]: valor } : p)));
  /** Varios campos juntos (ej. el tipo de un perfil y sus medidas). */
  const actualizarInsumo = (id, cambios) =>
    setCatalogo((prev) => prev.map((p) => (p.id === id ? { ...p, ...cambios } : p)));

  // --- Lista de perfiles (v1.21) ---
  /** "+ Agregar perfil": uno nuevo al final de la lista (caño 50x50x2.0, sin precio). */
  const agregarPerfil = () => setCatalogo((prev) => {
    const usados = new Set(prev.map((p) => p.id));
    let n = 1;
    while (usados.has(`perfil-${n}`)) n++;
    return [...prev, { ...PERFIL_NUEVO, id: `perfil-${n}`, precios: {} }]; // sin precios hasta que se carguen
  });
  /** Quitar un perfil: solo si ningún renglón lo usa (la pantalla ya deshabilita el botón). */
  const quitarPerfil = (id) => setCatalogo((prev) =>
    (prev.some((p) => p.categoria === 'perfil' && p.perfilId === id) ? prev : prev.filter((p) => p.id !== id)));

  // --- Proveedores y precios (v1.25) ---
  /** Precio de un material en un proveedor: campo 'efectivo' o 'tarjeta'; null = sin precio. */
  const cambiarPrecio = (idMaterial, idProveedor, campo, valor) => setCatalogo((prev) => prev.map((p) => {
    if (p.id !== idMaterial) return p;
    const anterior = p.precios?.[idProveedor] ?? { efectivo: null, tarjeta: null };
    return { ...p, precios: { ...p.precios, [idProveedor]: { ...anterior, [campo]: valor } } };
  }));
  const agregarProveedor = () => setCatalogo((prev) => {
    const usados = new Set(prev.map((p) => p.id));
    let n = 1;
    while (usados.has(`prov-${n}`)) n++;
    const cuantos = prev.filter((p) => p.categoria === 'proveedor').length;
    return [...prev, { id: `prov-${n}`, categoria: 'proveedor', nombre: `Proveedor ${cuantos + 1}`, recargoTarjeta: 0, nota: '' }];
  });
  /** Quitar un proveedor (queda al menos uno): también se borran sus precios. */
  const quitarProveedor = (id) => setCatalogo((prev) => {
    if (prev.filter((p) => p.categoria === 'proveedor').length <= 1) return prev;
    return prev.filter((p) => p.id !== id).map((p) => {
      if (!p.precios?.[id]) return p;
      const { [id]: _quitado, ...resto } = p.precios; // eslint-disable-line no-unused-vars
      return { ...p, precios: resto };
    });
  });

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
  // --- Accesorios (v1.29): tornillería, electrodos, selladores… y los que agregue el herrero ---
  const agregarAccesorio = () => setCatalogo((prev) => {
    const usados = new Set(prev.map((p) => p.id));
    let n = 1;
    while (usados.has(`acc-${n}`)) n++;
    return [...prev, { id: `acc-${n}`, categoria: 'accesorio', nombre: 'Accesorio nuevo', perfil: '', unidad: 'u', cantidad: 0, largoBarra: null, precio: 0, precios: {} }];
  });
  const quitarAccesorio = (id) => setCatalogo((prev) => prev.filter((p) => p.id !== id));

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
  const cargarProyecto = (proyecto, idEnBiblioteca = null, nubeDelProyecto = null) => {
    setNombreProyecto(proyecto.nombre);
    setNube(nubeDelProyecto); // v1.30: el link de la nube viaja con el proyecto (o no tiene)
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
  const guardarEnBiblioteca = (id, nombre, nubeAGuardar = nube, textoExtra = '') => {
    const entrada = crearEntrada(proyectoActual, { id, nombre, nube: nubeAGuardar });
    setBiblioteca((prev) => guardarEntrada(prev, entrada));
    setNombreProyecto(entrada.nombre);
    setIdProyectoActual(entrada.id);
    setAviso({ tipo: 'ok', texto: `Guardado en Mis proyectos: "${entrada.nombre}"${textoExtra}` });
  };

  /** "Guardar como…": pide un nombre y crea un proyecto nuevo en la lista. */
  const guardarComo = async (nubeAGuardar = nube, textoExtra = '') => {
    const nombre = await pedirTexto({
      titulo: 'Guardar como…', mensaje: 'Se guarda en Mis proyectos de este navegador.',
      etiqueta: 'Nombre del proyecto', valorInicial: nombreProyecto || '', aceptar: 'Guardar',
    });
    if (nombre === null) return; // canceló
    if (!nombre.trim()) {
      setAviso({ tipo: 'error', texto: 'Poné un nombre para guardar el proyecto.' });
      return;
    }
    guardarEnBiblioteca(nuevoId(), nombre, nubeAGuardar, textoExtra);
  };

  /**
   * "Guardar": pisa el proyecto abierto; si nunca se guardó, funciona como "Guardar como…".
   * v1.30: si el proyecto tiene link para editar, también guarda la versión nueva en la nube.
   */
  const guardar = async () => {
    let nubeNueva = nube;
    let extra = '';
    let errorNube = null;
    if (nube?.clave && nubeDisponible()) {
      try {
        const rev = await guardarEnNube(nube.id, nube.clave, proyectoActual, nube.rev);
        nubeNueva = { ...nube, rev };
        setNube(nubeNueva);
        extra = ' y en el link ☁';
      } catch (e) {
        errorNube = e.message;
      }
    }
    if (entradaActual) guardarEnBiblioteca(entradaActual.id, nombreProyecto, nubeNueva, extra);
    else await guardarComo(nubeNueva, extra);
    // El aviso del error va al final (si no, lo taparía el de "Guardado en Mis proyectos").
    if (errorNube) setAviso({ tipo: 'error', texto: `Se guardó en este navegador, pero NO en el link: ${errorNube}` });
  };

  // --- Links cortos en la nube (v1.30) ---
  const urlBase = () => `${window.location.origin}${window.location.pathname}`;
  /** Sube el proyecto y queda con su link de editar (si ya estaba en Mis proyectos, se guarda ahí también). */
  const crearLinksNube = async () => {
    const creado = await crearEnNube(proyectoActual);
    setNube(creado);
    if (entradaActual) guardarEnBiblioteca(entradaActual.id, nombreProyecto, creado, ' (con su link ☁)');
    else setAviso({ tipo: 'ok', texto: 'Links creados. Guardá el proyecto en Mis proyectos para no perder el link de editar.' });
  };
  const linksActuales = nube ? { ver: linksNube(urlBase(), nube.id, '').ver, editar: nube.clave ? linksNube(urlBase(), nube.id, nube.clave).editar : null } : null;

  const abrirDeBiblioteca = async (entrada) => {
    if (entrada.id !== idProyectoActual && !(await puedoReemplazar())) return;
    const r = abrirEntrada(entrada);
    if (!r.ok) {
      setAviso({ tipo: 'error', texto: `No se pudo abrir "${entrada.nombre}": ${r.error}` });
      return;
    }
    cargarProyecto(r.proyecto, entrada.id, entrada.nube ?? null);
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

  // --- Imprimir y exportar (v1.28: se elige qué sale) ---
  const nombreProveedor = proveedorElegido === MAS_BARATO ? 'Lo más barato de cada material'
    : proveedores.find((p) => p.id === proveedorElegido)?.nombre ?? '';
  const textoPago = formaPago === 'tarjeta' ? 'con tarjeta' : 'en efectivo';
  const resumen = useMemo(() => resumenDeObra({ params, estructura, aberturas: aberturasValidas, catalogo: catalogoResuelto }),
    [params, estructura, aberturasValidas, catalogoResuelto]);

  /**
   * Saca las fotos del 3D y las deja en las hojas ANTES de abrir la ventana de imprimir.
   * flushSync: React actualiza la página en el momento (si no, lo haría después y el PDF saldría sin fotos).
   */
  const prepararImpresion = (opciones) => {
    const fotos = capturaRef.current?.({ conCotas: opciones.cotas, conVistasFijas: opciones.vistasFijas && esConstruccion }) ?? null;
    flushSync(() => setCapturas(fotos));
  };
  const imprimiendoRef = useRef(false); // para no sacar las fotos dos veces (botón + "beforeprint")
  const imprimir = async () => {
    setDialogoImprimir(false);
    prepararImpresion(opcionesImpresion);
    // Esperar a que las fotos estén listas para dibujarse (si no, alguna puede salir en blanco).
    await Promise.all([...document.querySelectorAll('.hojas-impresion img')].map((img) => img.decode?.().catch(() => {})));
    imprimiendoRef.current = true;
    window.print();
    imprimiendoRef.current = false;
  };
  // Ctrl+P (sin pasar por el botón): se imprime con lo último elegido.
  useEffect(() => {
    const alImprimir = () => { if (!imprimiendoRef.current) prepararImpresion(opcionesImpresion); };
    window.addEventListener('beforeprint', alImprimir);
    return () => window.removeEventListener('beforeprint', alImprimir);
  });

  const exportarExcel = () => {
    setDialogoImprimir(false);
    const bytes = libroDeObra({
      nombre: nombreProyecto, params, vistas, items, total, gruposCortes,
      proveedor: nombreProveedor, pago: textoPago, resumen, medidas: medidasFijas,
      plan: proveedores.length > 1 ? planCompra : null, materiales: listaMateriales,
    }, opcionesImpresion);
    const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const enlace = document.createElement('a');
    enlace.href = URL.createObjectURL(blob);
    enlace.download = nombreDeArchivo(nombreProyecto).replace(/\.json$/, '.xlsx');
    enlace.click();
    URL.revokeObjectURL(enlace.href);
    setAviso({ tipo: 'ok', texto: `Descargado como ${enlace.download}` });
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
    // v1.30: link corto de la nube (#p= para ver, #e= para editar).
    const linkNube = leerHashNube(hash);
    if (linkNube && nubeDisponible()) {
      // Se saca el link de la barra de direcciones (el de editar lleva la clave).
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      leerDeNube(linkNube.id).then(async (r) => {
        if (!r.ok) {
          setAviso({ tipo: 'error', texto: r.error });
          return;
        }
        // Si ya está en Mis proyectos (mismo link), se abre sobre esa entrada y se conserva su clave.
        const entrada = biblioteca.find((e) => e.nube?.id === linkNube.id);
        const clave = linkNube.clave ?? entrada?.nube?.clave ?? null;
        const abrir = (entrada && entrada.id === idProyectoActual) || await confirmar({
          titulo: clave ? 'Proyecto compartido para editar' : 'Proyecto compartido',
          mensaje: `¿Abrir "${r.proyecto.nombre}"? Reemplaza lo que tenés en pantalla.${clave ? ' Con "Guardar" los cambios quedan en el link.' : ''}`,
          aceptar: 'Abrir', cancelar: 'No, seguir con el mío',
        });
        if (!abrir) return;
        cargarProyecto(r.proyecto, entrada?.id ?? null, { id: linkNube.id, clave, rev: r.rev });
        setAviso({ tipo: 'ok', texto: clave
          ? `"${r.proyecto.nombre}" abierto del link. Los cambios se guardan en el link con "Guardar".`
          : `"${r.proyecto.nombre}" abierto (solo para ver: tus cambios no cambian el link).` });
      });
      return;
    }
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
  /**
   * Separación por medida o por cantidad (v1.27). `piezas` = [singular, plural] para contarlas;
   * con `casilla`, es opcional (montantes, transversales…).
   */
  const separacion = (ruta, etiqueta, etiquetaCantidad, piezas, opciones = {}) => (
    <CampoSeparacion key={ruta} etiqueta={etiqueta} etiquetaCantidad={etiquetaCantidad} piezas={piezas} unidad={unidad}
      valor={ruta.split('.').reduce((o, k) => o[k], params)} cantidad={cantidadDe(params, ruta)}
      info={infoSeparacion(params, ruta)} casilla={opciones.casilla} valorPorDefecto={opciones.valorPorDefecto}
      onCambioMedida={cambiar(ruta)} onCambioCantidad={cambiarCantidad(ruta)} onCambiarModo={(modo) => cambiarModo(ruta, modo)} />
  );
  /**
   * v1.28: perfil de un renglón elegido ahí mismo (pisos y techo: borde e interior). Es el mismo dato que
   * "Qué perfil va en cada parte" de Materiales: cambiarlo acá lo cambia allá.
   */
  const selectorPerfilDe = (idUso, etiqueta) => (
    <SelectorPerfil key={idUso} etiqueta={etiqueta} valor={catalogoResuelto.find((i) => i.id === idUso)?.perfilId ?? ''}
      perfiles={perfilesDeLista(catalogoConPrecios)} onElegir={(id) => id && cambiarInsumo(idUso, 'perfilId', id)} />
  );
  /** Casilla + medida (v1.19): reemplaza los campos "(0 = sin)". 0 guardado = destildada. */
  const opcional = (ruta, casilla, etiqueta, valorPorDefecto) => (
    <CampoOpcional key={ruta} casilla={casilla} etiqueta={etiqueta} unidad={unidad} valorPorDefecto={valorPorDefecto}
      valor={ruta.split('.').reduce((o, k) => o[k], params)} onCambio={cambiar(ruta)} />
  );

  return (
    <ContextoResaltado value={contextoResaltado}>
    <div className={`app${opcionesImpresion.formularios ? '' : ' imprimir-sin-formularios'}`}>
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
          <button className="btn-sec" onClick={() => setDialogoCompartir(true)} title="Links para ver y para editar este proyecto">Compartir{nube ? ' ☁' : ''}</button>
          <button className="btn-sec" onClick={() => setVer3D((v) => !v)} aria-pressed={!ver3D}>
            {ver3D ? 'Ocultar 3D' : 'Ver 3D'}
          </button>
          <label htmlFor="unidad">Unidad</label>
          <select id="unidad" value={unidad} onChange={(e) => setUnidad(e.target.value)}>
            <option value="m">Metros</option>
            <option value="cm">Centímetros</option>
            <option value="mm">Milímetros</option>
          </select>
          <button className="btn-print" onClick={() => setDialogoImprimir(true)} title="Elegí qué sale: PDF (2-3 hojas) o Excel">Imprimir / Exportar</button>
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
      {dialogoCompartir && (
        <DialogoCompartir links={linksActuales} soloVer={Boolean(nube && !nube.clave)} disponible={nubeDisponible()}
          onCrear={crearLinksNube} onLinkLargo={compartirLink} onCerrar={() => setDialogoCompartir(false)} />
      )}
      {dialogoImprimir && (
        <DialogoImprimir opciones={opcionesImpresion} onCambiar={setOpcionesImpresion} cantidadMedidas={medidasFijas.length}
          esConstruccion={esConstruccion} onImprimir={imprimir} onExcel={exportarExcel} onCerrar={() => setDialogoImprimir(false)} />
      )}

      {aviso && (
        <div className={`aviso aviso-${aviso.tipo} no-print`} role={aviso.tipo === 'error' ? 'alert' : 'status'}>
          {aviso.texto}
          <button onClick={() => setAviso(null)} aria-label="Cerrar aviso">✕</button>
        </div>
      )}

      <main className={`layout${ver3D ? '' : ' sin-visor'} movil-${vistaMovil}`}>
        <div className="columna-visor">
          <LoftCanvas params={params} estructura={estructura} aberturas={aberturasValidas} paneles={paneles}
            colores={colores} catalogo={catalogoResuelto} unidad={unidad}
            opacidades={opacidades} onCambiarOpacidad={cambiarOpacidad} capturaRef={capturaRef} onMedidasFijas={setMedidasFijas}
            onCambiarColor={cambiarColor} onEliminarPieza={eliminarPieza} onEditarPieza={editarPieza}
            onActualizarAbertura={actualizarAbertura} onQuitarAbertura={quitarAbertura}
            onPegarAbertura={pegarAbertura} onDuplicarPieza={duplicarPiezaElegida}
            resaltado={resaltado} cartelResaltado={cartelResaltado}
            onSoltarResaltado={resaltadoFijo ? () => { setResaltadoFijo(null); setResaltadoMouse(null); } : null}
            pedidoVerTerreno={pedidoVerTerreno} />
        </div>

        <div className="columna-panel">
          {/* Pestañas (v1.18): una sección a la vez. En el celular la barra va fija abajo, con "3D". */}
          <BarraPestanas pestanas={pestanas} activa={vistaMovil === '3d' ? '3d' : pestanaActiva} onElegir={elegirPestana} />

          <section id="pestana-estructura" role="tabpanel" aria-labelledby="boton-estructura"
            className={`pestana${pestanaActiva === 'estructura' ? '' : ' oculta'}`}>
          {/* GRADA (proyecto propio): solo su tarjeta, las piezas y el presupuesto. */}
          {esGrada && (
            <PanelGrada params={params} resumen={estructura.grada.resumen} unidad={unidad} cambiar={cambiar}
              catalogo={catalogoConPrecios} onCambiarInsumo={cambiarInsumo} />
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

          {/* TERRENO (v1.32): el lote, dónde va la casa, pozo, árboles, accesos y el norte. */}
          {moduloTerreno && <PanelTerreno params={params} unidad={unidad} cambiar={cambiar} implantacion={implantacion} onVerTerreno={verTerreno} />}

          {/* PISOS */}
          <Tarjeta id="pisos" titulo="Pisos" resaltar={{ tipo: 'grupo', id: ['piso', 'piso2'], nombre: 'Pisos' }}>
            <h3 className="subtitulo">Planta baja</h3>
            <div className="grid-params">
              {separacion('separacionPiso', 'Sep. estructura de piso', 'Tirantes de piso', ['tirante', 'tirantes'])}
              {separacion('separacionTransversalesPiso', 'Transversales cada', 'Filas de transversales', ['fila de transversales', 'filas de transversales'], { casilla: 'Lleva transversales', valorPorDefecto: 1.5 })}
            </div>
            {/* v1.28: borde e interior con perfiles propios (y cada sentido el suyo). */}
            <div className="grid-params grid-perfiles-pared">
              {selectorPerfilDe(INSUMO.BORDE_PISO, 'Borde (los dos pisos)')}
              {selectorPerfilDe(INSUMO.PISO, 'Tirantes (interior)')}
              {params.separacionTransversalesPiso > 0 || cantidadDe(params, 'separacionTransversalesPiso') > 0
                ? selectorPerfilDe(INSUMO.TRANSVERSAL_PISO, 'Transversales') : null}
            </div>
            <h3 className="subtitulo">Piso 2 (entrepiso)</h3>
            <div className="grid-params">
              {opcional('anchoEntrepiso', 'Lleva entrepiso', 'Profundidad', 3)}
              {params.anchoEntrepiso > 0 && (
                <SelectorLado etiqueta="Apoyado en" valor={params.ladoEntrepiso} params={params}
                  onCambio={cambiar('ladoEntrepiso')} />
              )}
              {params.anchoEntrepiso > 0 && medida('alturaPiso2', 'Altura del piso 2')}
              {params.anchoEntrepiso > 0 && opcional('largoEntrepiso', 'Parcial (no toda la pared)', 'Largo',
                Math.max(1, Math.round(lados[params.ladoEntrepiso].largo / 2)))}
              {params.anchoEntrepiso > 0 && params.largoEntrepiso > 0 && (
                <CampoSelect etiqueta="Medir desde" valor={params.referenciaEntrepiso}
                  opciones={[['izquierda', 'Esquina izquierda'], ['derecha', 'Esquina derecha']]}
                  onCambio={cambiar('referenciaEntrepiso')} />
              )}
              {params.anchoEntrepiso > 0 && params.largoEntrepiso > 0 && medida('distanciaEntrepiso', 'Dist. a esquina')}
              {params.anchoEntrepiso > 0 && separacion('separacionColumnasEntrepiso', 'Columnas cada', 'Columnas por borde (con las puntas)', ['columna', 'columnas'], { casilla: 'Columnas intermedias (borde libre y fila del medio)', valorPorDefecto: 2.5 })}
              {params.anchoEntrepiso > 0 && separacion('separacionPiso2', 'Sep. estructura de piso 2', 'Tirantes de piso 2', ['tirante', 'tirantes'])}
              {params.anchoEntrepiso > 0 && separacion('separacionTransversalesPiso2', 'Transversales cada', 'Filas de transversales', ['fila de transversales', 'filas de transversales'], { casilla: 'Lleva transversales', valorPorDefecto: 1.5 })}
            </div>
            {params.anchoEntrepiso > 0 && (
              <div className="casillas-entrepiso">
                {/* v1.28: columnas del entrepiso. */}
                <label className="casilla-opcional">
                  <input type="checkbox" checked={params.filaColumnasEntrepiso === true}
                    onChange={(ev) => cambiar('filaColumnasEntrepiso')(ev.target.checked)} />
                  Fila de columnas en el medio, con viga de apoyo (aunque no haya borde libre)
                </label>
                <label className="casilla-opcional">
                  <input type="checkbox" checked={params.columnasEntrepisoHastaPiso2 === true}
                    onChange={(ev) => cambiar('columnasEntrepisoHastaPiso2')(ev.target.checked)} />
                  Las columnas del entrepiso terminan en el piso 2 (si no, suben hasta el techo)
                </label>
              </div>
            )}
            {params.anchoEntrepiso > 0 && (
              <div className="grid-params grid-perfiles-pared">
                {selectorPerfilDe(INSUMO.COLUMNA_ENTREPISO, 'Columnas del entrepiso')}
                {selectorPerfilDe(INSUMO.PISO_2, 'Tirantes piso 2 (interior)')}
                {params.separacionTransversalesPiso2 > 0 || cantidadDe(params, 'separacionTransversalesPiso2') > 0
                  ? selectorPerfilDe(INSUMO.TRANSVERSAL_PISO_2, 'Transversales piso 2') : null}
                {selectorPerfilDe(INSUMO.VIGA_CIERRE, 'Vigas de cierre y de apoyo')}
              </div>
            )}
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
          <Tarjeta id="techo" titulo="Techo a una agua" resaltar={{ tipo: 'grupo', id: 'techo', nombre: 'Techo' }}>
            <div className="grid-params">
              <SelectorLado etiqueta="Cae hacia" valor={params.caidaTecho} params={params}
                onCambio={cambiar('caidaTecho')} />
              <CampoNumero etiqueta="Pendiente" sufijo="%" valor={params.pendienteTecho}
                onCambio={cambiar('pendienteTecho')} decimales={1} />
              {separacion('separacionVigasTecho', 'Sep. vigas de techo', 'Vigas de techo', ['viga', 'vigas'])}
              {separacion('separacionCorreasTecho', 'Sep. correas (s/ pendiente)', 'Correas (con las puntas)', ['correa', 'correas'])}
              {selectorPanel('panelTecho', 'Revestimiento del techo', params.panelTecho)}
            </div>
            {/* v1.28: marco perimetral (correas de los bordes + piezas de las puntas) con perfil propio. */}
            <label className="casilla-opcional">
              <input type="checkbox" checked={params.techoConBorde === true}
                onChange={(ev) => cambiar('techoConBorde')(ev.target.checked)} />
              Marco perimetral (borde del techo con su propio perfil)
            </label>
            <h4 className="subtitulo-pared">Perfiles del techo</h4>
            <div className="grid-params grid-perfiles-pared">
              {params.techoConBorde && selectorPerfilDe(INSUMO.BORDE_TECHO, 'Borde')}
              {selectorPerfilDe(INSUMO.VIGA_TECHO, 'Vigas (interior)')}
              {selectorPerfilDe(INSUMO.CORREA_TECHO, params.techoConBorde ? 'Correas (interior)' : 'Correas')}
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
                <ZonaResaltable key={lado} className={`pared ${paredesAbiertas[lado] ? 'abierta' : 'cerrada'}`}
                  criterio={{ tipo: 'grupo', id: lado, nombre: nombreLado(lado, params.ladoFrente) }}>
                  {/* El título pliega / despliega la pared (aria-expanded para lectores de pantalla); al lado, el 👁. */}
                  <div className="fila-titulo-pared">
                  <button type="button" className="pared-titulo plegable" aria-expanded={paredesAbiertas[lado]}
                    aria-controls={`pared-${lado}`} onClick={() => alternarPared(lado)}>
                    <span className="flecha" aria-hidden="true">▸</span>
                    <strong>{nombreLado(lado, params.ladoFrente)}</strong>
                    {params.paredes[lado].etiqueta.trim() && <em>“{params.paredes[lado].etiqueta.trim()}”</em>}
                    <span>lado {lado} · {lados[lado].largo.toFixed(2)} m · alto {h1.toFixed(2)}{Math.abs(h1 - h2) > 0.005 ? ` a ${h2.toFixed(2)}` : ''} m</span>
                  </button>
                  <BotonResaltar criterio={{ tipo: 'grupo', id: lado, nombre: nombreLado(lado, params.ladoFrente) }} />
                  </div>
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
                    {separacion(`paredes.${lado}.separacionVerticales`, 'Sep. columnas', 'Columnas (con las esquinas)', ['columna', 'columnas'])}
                    {separacion(`paredes.${lado}.separacionHorizontales`, 'Sep. horizontales (fajas)', 'Horizontales (fajas)', ['faja', 'fajas'])}
                    {separacion(`paredes.${lado}.separacionMontantes`, 'Montantes cada', 'Montantes por vano', ['montante', 'montantes'], { casilla: 'Lleva montantes', valorPorDefecto: 0.6 })}
                    <CampoSelect etiqueta="Riostras en cruz" valor={params.paredes[lado].riostras}
                      opciones={[['no', 'Sin riostras'], ['extremos', 'En las puntas'], ['todos', 'En todos los vanos']]}
                      onCambio={cambiar(`paredes.${lado}.riostras`)} />
                    {selectorPanel(`paredes.${lado}.panel`, 'Revestimiento exterior', params.paredes[lado].panel)}
                    {selectorPanel(`paredes.${lado}.panelInterior`, 'Revestimiento interior', params.paredes[lado].panelInterior, true)}
                  </div>
                  {/* v1.22: perfiles propios de esta pared ('' = el general de Materiales). Las esquinas van aparte. */}
                  <h4 className="subtitulo-pared">Perfiles de esta pared</h4>
                  <div className="grid-params grid-perfiles-pared">
                    {PERFILES_PARED_UI.map(([campo, etiqueta, idGeneral]) => (
                      <SelectorPerfil key={campo} etiqueta={etiqueta} valor={params.paredes[lado][campo]}
                        perfiles={perfilesDeLista(catalogoConPrecios)}
                        opcionGeneral={`General (${(catalogoResuelto.find((i) => i.id === idGeneral)?.perfil || 'sin elegir').replace('Caño estructural ', 'Caño ')})`}
                        onElegir={(id) => cambiar(`paredes.${lado}.${campo}`)(id ?? '')} />
                    ))}
                  </div>
                  {/* Aberturas de esta pared (v1.17): antes estaban en una tarjeta aparte. */}
                  <AberturasDePared lado={lado} aberturas={aberturasValidas} params={params} unidad={unidad}
                    onAgregar={agregarAbertura} onActualizar={actualizarAbertura} onQuitar={quitarAbertura}
                    perfiles={perfilesDeLista(catalogoConPrecios)}
                    perfilGeneral={catalogoResuelto.find((i) => i.id === INSUMO.MARCO_ABERTURA)?.perfil ?? ''} />
                  </div>
                </ZonaResaltable>
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
            onActualizarPerfil={actualizarInsumo} onAgregarPerfil={agregarPerfil} onQuitarPerfil={quitarPerfil}
            onAgregarRevestimiento={agregarTipoPanel} onQuitarRevestimiento={quitarTipoPanel}
            proveedor={proveedorElegido} pago={formaPago} onCambiarPrecio={cambiarPrecio}
            onActualizarProveedor={actualizarInsumo} onAgregarProveedor={agregarProveedor} onQuitarProveedor={quitarProveedor}
            onAgregarAccesorio={agregarAccesorio} onQuitarAccesorio={quitarAccesorio} />
          {/* v1.33: cómo se cruzan los hierros (red soldada o eje a eje). */}
          {esConstruccion && <TarjetaUniones uniones={params.uniones} resultado={estructura.uniones} cambiar={cambiar} />}

          </section>
          <section id="pestana-presupuesto" role="tabpanel" aria-labelledby="boton-presupuesto"
            className={`pestana${pestanaActiva === 'presupuesto' ? '' : ' oculta'}`}>
          <TablaPresupuesto items={items} total={total} gruposCortes={gruposCortes}
            proveedores={proveedores} proveedor={proveedorElegido} pago={formaPago} comparacion={comparacion}
            onElegirProveedor={cambiar('proveedorElegido')} onElegirPago={cambiar('formaPago')}
            onCambiarPrecio={(item, valor) => cambiarPrecio(item.perfilId ?? item.id, proveedorElegido, formaPago, valor)}
            plan={planCompra} nombreProyecto={nombreProyecto} materiales={listaMateriales} masBaratoDe={(item) => masBaratoEn(item, catalogoResuelto, formaPago)} />
          </section>
          {/* v1.26: planos de cada pared y planta (en pantalla y en el PDF) + Excel. */}
          <section id="pestana-planos" role="tabpanel" aria-labelledby="boton-planos"
            className={`pestana${pestanaActiva === 'planos' ? '' : ' oculta'}`}>
            <Planos vistas={vistas} params={params} implantacion={implantacion} onExportar={() => setDialogoImprimir(true)} />
          </section>
        </div>
      </main>
      {/* v1.28: lo que sale en el PDF (en pantalla no se ve). */}
      <HojasImpresion opciones={opcionesImpresion} capturas={capturas} nombre={nombreProyecto}
        subtitulo={`${new Date().toLocaleDateString('es-AR')} · ${nombreProveedor ? `${nombreProveedor} ${textoPago}` : textoPago} · Pollo Calculator v${VERSION_APP}`}
        leyenda3D={cartelResaltado ? `Resaltado en rosa — ${cartelResaltado.replace(' (fijado)', '')}` : null}
        resumen={resumen} items={items} total={total} gruposCortes={gruposCortes} vistas={vistas} params={params}
        plan={proveedores.length > 1 ? planCompra : null} materiales={listaMateriales} implantacion={implantacion} />
    </div>
    </ContextoResaltado>
  );
}
