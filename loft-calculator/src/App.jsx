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
import TablaPresupuesto from './componentes/TablaPresupuesto.jsx';
import { useEstadoGuardado } from './hooks/useEstadoGuardado.js';
import { validarParametros, validarAbertura } from './motor/validacion.js';
import { generarEstructura } from './motor/estructura.js';
import { calcularPresupuesto, CATALOGO_INICIAL } from './motor/presupuesto.js';
import { PARAMS_INICIALES, ABERTURAS_INICIALES } from './motor/parametrosIniciales.js';
import { LADOS } from './motor/constantes.js';
import { nombreLado, alturasPared, geometriaLados, alturaMaxima } from './motor/geometria.js';
import './App.css';

// --- Validadores para descartar datos viejos de localStorage ---
const paramsGuardadosValidos = (p) =>
  p && typeof p === 'object' && Object.keys(validarParametros(p)).length === 0;
const catalogoGuardadoValido = (c) =>
  Array.isArray(c) && CATALOGO_INICIAL.every((base) => c.some((p) => p.id === base.id));
const aberturasGuardadasValidas = (a) => Array.isArray(a) && a.every((op) => LADOS.includes(op.lado));

/** Copia `obj` cambiando el valor en una ruta tipo "paredes.A.separacionVerticales". */
function conValor(obj, ruta, valor) {
  const [clave, ...resto] = ruta.split('.');
  return { ...obj, [clave]: resto.length ? conValor(obj[clave], resto.join('.'), valor) : valor };
}

export default function App() {
  const [unidad, setUnidad] = useState('m');
  const [params, setParams] = useEstadoGuardado('params', PARAMS_INICIALES, paramsGuardadosValidos);
  const [aberturas, setAberturas] = useEstadoGuardado('aberturas', ABERTURAS_INICIALES, aberturasGuardadasValidas);
  const [catalogo, setCatalogo] = useEstadoGuardado('catalogo', CATALOGO_INICIAL, catalogoGuardadoValido);

  // --- Cálculos (solo se rehacen si cambian sus datos) ---
  // Por seguridad se ignoran aberturas que no entren (ej. datos viejos guardados).
  const aberturasValidas = useMemo(
    () => aberturas.filter((op) => validarAbertura(op, params) === null),
    [aberturas, params]
  );
  const estructura = useMemo(() => generarEstructura(params, aberturasValidas), [params, aberturasValidas]);
  const { items, total } = useMemo(() => calcularPresupuesto(estructura, catalogo), [estructura, catalogo]);
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

  const agregarAbertura = (abertura) => setAberturas((prev) => [...prev, abertura]);
  const actualizarAbertura = (abertura) =>
    setAberturas((prev) => prev.map((op) => (op.id === abertura.id ? abertura : op)));
  const quitarAbertura = (id) => setAberturas((prev) => prev.filter((op) => op.id !== id));

  const restablecer = () => {
    if (!window.confirm('¿Volver a los valores y precios por defecto?')) return;
    setParams(PARAMS_INICIALES);
    setAberturas(ABERTURAS_INICIALES);
    setCatalogo(CATALOGO_INICIAL);
  };

  // Atajo para no repetir props en cada campo de medida.
  const medida = (ruta, etiqueta) => (
    <CampoNumero key={ruta} etiqueta={etiqueta} unidad={unidad}
      valor={ruta.split('.').reduce((o, k) => o[k], params)} onCambio={cambiar(ruta)} />
  );

  return (
    <div className="app">
      <header>
        <h1>micasa · Calculadora de loft</h1>
        <div className="header-actions no-print">
          <label htmlFor="unidad">Unidad</label>
          <select id="unidad" value={unidad} onChange={(e) => setUnidad(e.target.value)}>
            <option value="m">Metros</option>
            <option value="cm">Centímetros</option>
            <option value="mm">Milímetros</option>
          </select>
          <button className="btn-sec" onClick={restablecer}>Restablecer</button>
          <button className="btn-print" onClick={() => window.print()}>Imprimir / PDF</button>
        </div>
      </header>

      <main className="layout">
        <div className="columna-visor">
          <LoftCanvas params={params} estructura={estructura} aberturas={aberturasValidas} />
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
                  </div>
                </div>
              );
            })}
          </section>

          {/* PISOS */}
          <section className="card">
            <h2>Pisos</h2>
            <div className="grid-params">
              {medida('separacionPiso', 'Sep. estructura de piso')}
              <SelectorLado etiqueta="Entrepiso apoyado en" valor={params.ladoEntrepiso} params={params}
                onCambio={cambiar('ladoEntrepiso')} />
              {medida('anchoEntrepiso', 'Ancho entrepiso (0 = sin)')}
              {medida('separacionPiso2', 'Sep. estructura de piso 2')}
              {medida('separacionTransversales', 'Sep. transversales (0 = sin)')}
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

          <TablaPresupuesto items={items} total={total} catalogo={catalogo} onCambiarInsumo={cambiarInsumo} />
        </div>
      </main>
    </div>
  );
}
