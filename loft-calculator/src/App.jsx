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

import { useMemo, useRef, useState } from 'react';
import LoftCanvas from './LoftCanvas.jsx';
import CampoNumero from './componentes/CampoNumero.jsx';
import SelectorLado from './componentes/SelectorLado.jsx';
import PanelAberturas from './componentes/PanelAberturas.jsx';
import PanelTiposPanel from './componentes/PanelTiposPanel.jsx';
import TablaPresupuesto from './componentes/TablaPresupuesto.jsx';
import { useEstadoGuardado } from './hooks/useEstadoGuardado.js';
import { validarParametros, validarAbertura } from './motor/validacion.js';
import { generarEstructura } from './motor/estructura.js';
import { calcularPresupuesto, CATALOGO_INICIAL, tiposDePanel } from './motor/presupuesto.js';
import { migrarParams, normalizarCatalogo } from './motor/migracion.js';
import { PARAMS_INICIALES, ABERTURAS_INICIALES } from './motor/parametrosIniciales.js';
import { LADOS } from './motor/constantes.js';
import { nombreLado, alturasPared, geometriaLados, alturaMaxima } from './motor/geometria.js';
import { COLORES_INICIALES, coloresValidos } from './capas.js';
import { crearArchivoProyecto, leerArchivoProyecto, nombreDeArchivo } from './proyecto/archivoProyecto.js';
import './App.css';

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
  return { ...obj, [clave]: resto.length ? conValor(obj[clave], resto.join('.'), valor) : valor };
}

export default function App() {
  const [unidad, setUnidad] = useState('m');
  const [paramsGuardados, setParams] = useEstadoGuardado('params', PARAMS_INICIALES, paramsGuardadosValidos, migrarParams);
  const [aberturas, setAberturas] = useEstadoGuardado('aberturas', ABERTURAS_INICIALES, aberturasGuardadasValidas);
  const [catalogo, setCatalogo] = useEstadoGuardado('catalogo', CATALOGO_INICIAL, catalogoGuardadoValido, normalizarCatalogo);
  const params = useMemo(() => conPanelesExistentes(paramsGuardados, catalogo), [paramsGuardados, catalogo]);
  const [colores, setColores] = useEstadoGuardado('colores', COLORES_INICIALES, coloresValidos);
  const [nombreProyecto, setNombreProyecto] = useEstadoGuardado('nombre', 'Loft', (n) => typeof n === 'string');
  const [avisoProyecto, setAvisoProyecto] = useState(null); // { tipo: 'ok' | 'error', texto }
  const entradaArchivoRef = useRef(null);

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

  const cambiarColor = (capa, color) => setColores((prev) => ({ ...prev, [capa]: color }));

  const restablecer = () => {
    if (!window.confirm('¿Empezar un proyecto nuevo con los valores, precios y colores por defecto?')) return;
    setNombreProyecto('Proyecto nuevo');
    setParams(PARAMS_INICIALES);
    setAberturas(ABERTURAS_INICIALES);
    setCatalogo(CATALOGO_INICIAL);
    setColores(COLORES_INICIALES);
    setAvisoProyecto(null);
  };

  // --- Archivo de proyecto ---

  /** Descarga el proyecto como .json (queda en la carpeta Descargas). */
  const guardarProyecto = () => {
    const archivo = crearArchivoProyecto({ nombre: nombreProyecto, params, aberturas, catalogo, colores });
    const blob = new Blob([JSON.stringify(archivo, null, 2)], { type: 'application/json' });
    const enlace = document.createElement('a');
    enlace.href = URL.createObjectURL(blob);
    enlace.download = nombreDeArchivo(nombreProyecto);
    enlace.click();
    URL.revokeObjectURL(enlace.href);
    setAvisoProyecto({ tipo: 'ok', texto: `Guardado como ${enlace.download}` });
  };

  /** Lee el .json elegido; si es válido, reemplaza el proyecto actual. */
  const abrirProyecto = async (e) => {
    const archivo = e.target.files?.[0];
    e.target.value = ''; // permite volver a elegir el mismo archivo
    if (!archivo) return;
    const resultado = leerArchivoProyecto(await archivo.text());
    if (!resultado.ok) {
      setAvisoProyecto({ tipo: 'error', texto: resultado.error });
      return;
    }
    const { proyecto } = resultado;
    setNombreProyecto(proyecto.nombre);
    setParams(proyecto.params);
    setAberturas(proyecto.aberturas);
    setCatalogo(proyecto.catalogo);
    setColores(proyecto.colores);
    setAvisoProyecto({ tipo: 'ok', texto: `Proyecto "${proyecto.nombre}" abierto` });
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
            onChange={(e) => setNombreProyecto(e.target.value)} placeholder="Nombre del proyecto" />
        </div>
        <div className="header-actions no-print">
          <button className="btn-sec" onClick={restablecer}>Nuevo</button>
          <button className="btn-sec" onClick={() => entradaArchivoRef.current.click()}>Abrir…</button>
          <input ref={entradaArchivoRef} type="file" accept=".json,application/json" hidden onChange={abrirProyecto} />
          <button className="btn-sec" onClick={guardarProyecto}>Guardar proyecto</button>
          <label htmlFor="unidad">Unidad</label>
          <select id="unidad" value={unidad} onChange={(e) => setUnidad(e.target.value)}>
            <option value="m">Metros</option>
            <option value="cm">Centímetros</option>
            <option value="mm">Milímetros</option>
          </select>
          <button className="btn-print" onClick={() => window.print()}>Imprimir / PDF</button>
        </div>
      </header>

      {avisoProyecto && (
        <div className={`aviso aviso-${avisoProyecto.tipo} no-print`} role={avisoProyecto.tipo === 'error' ? 'alert' : 'status'}>
          {avisoProyecto.texto}
          <button onClick={() => setAvisoProyecto(null)} aria-label="Cerrar aviso">✕</button>
        </div>
      )}

      <main className="layout">
        <div className="columna-visor">
          <LoftCanvas params={params} estructura={estructura} aberturas={aberturasValidas} paneles={paneles}
            colores={colores} onCambiarColor={cambiarColor} />
        </div>

        <div className="columna-panel">
          {/* PLANTA */}
          <section className="card">
            <h2>Planta y altura</h2>
            <div className="grid-params">
              {medida('largo', 'Largo (lados A y C)')}
              {medida('ancho', 'Ancho (lados B y D)')}
              {medida('altura', 'Altura (lado bajo)')}
              {medida('elevacion', 'Elevación s/ terreno')}
              <SelectorLado etiqueta="¿Qué lado es el frente?" valor={params.ladoFrente} params={params}
                onCambio={cambiar('ladoFrente')} ocultarFrente />
            </div>
          </section>

          {/* PAREDES (PANELES) */}
          <section className="card">
            <h2>Paredes</h2>
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
                    <span>lado {lado} · {lados[lado].largo.toFixed(2)} m · alto {h1.toFixed(2)}{Math.abs(h1 - h2) > 0.005 ? ` a ${h2.toFixed(2)}` : ''} m</span>
                  </div>
                  <div className="grid-params">
                    {medida(`paredes.${lado}.separacionVerticales`, 'Sep. verticales')}
                    {medida(`paredes.${lado}.separacionHorizontales`, 'Sep. horizontales')}
                    {selectorPanel(`paredes.${lado}.panel`, 'Panel', params.paredes[lado].panel)}
                  </div>
                </div>
              );
            })}
          </section>

          {/* PISOS */}
          <section className="card">
            <h2>Pisos</h2>
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
          </section>

          {/* TECHO */}
          <section className="card">
            <h2>Techo a una agua</h2>
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
          </section>

          {/* FUNDACIÓN */}
          <section className="card">
            <h2>Fundación</h2>
            <div className="grid-params">
              <CampoNumero etiqueta="Filas de pilotines (largo)" sufijo="u" decimales={0}
                valor={params.filasPilotines} onCambio={cambiar('filasPilotines')} />
              <CampoNumero etiqueta="Pilotines por fila (ancho)" sufijo="u" decimales={0}
                valor={params.pilotinesPorFila} onCambio={cambiar('pilotinesPorFila')} />
            </div>
          </section>

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
