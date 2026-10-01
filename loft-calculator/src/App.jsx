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
import PanelAberturas from './componentes/PanelAberturas.jsx';
import TablaPresupuesto from './componentes/TablaPresupuesto.jsx';
import { useEstadoGuardado } from './hooks/useEstadoGuardado.js';
import { validarParametros, validarAbertura } from './motor/validacion.js';
import { generarEstructura } from './motor/estructura.js';
import { calcularPresupuesto, CATALOGO_INICIAL } from './motor/presupuesto.js';
import './App.css';

// Valores por defecto del loft de referencia.
const PARAMS_INICIALES = {
  frente: 7.5,
  profundidad: 4.5,
  altura: 4.5,
  elevacion: 0.5,
  anchoMezzanine: 3,
  distanciaColumnas: 2.5,
  pasoTirantesPiso: 0.4,
  pasoTirantesAltillo: 0.4,
  separacionCorreas: 0.8,
  filasPilotines: 4,
  pilotinesPorFila: 3,
};

const ABERTURAS_INICIALES = [
  { id: 1, tipo: 'puerta', pared: 'frente', ladoReferencia: 'izquierda', offsetHorizontal: 1, alturaAntepecho: 0, ancho: 0.9, alto: 2.05 },
  { id: 2, tipo: 'ventana', pared: 'frente', ladoReferencia: 'derecha', offsetHorizontal: 1.2, alturaAntepecho: 1.1, ancho: 1.5, alto: 0.6 },
];

// Campos de medida (se muestran en la unidad elegida).
const CAMPOS_MEDIDA = [
  ['frente', 'Frente'],
  ['profundidad', 'Profundidad'],
  ['altura', 'Altura'],
  ['elevacion', 'Elevación s/ terreno'],
  ['anchoMezzanine', 'Ancho altillo'],
  ['distanciaColumnas', 'Dist. entre columnas'],
  ['pasoTirantesPiso', 'Paso tirantes piso'],
  ['pasoTirantesAltillo', 'Paso tirantes altillo'],
  ['separacionCorreas', 'Separación correas'],
];

// --- Validadores para descartar datos viejos de localStorage ---
const paramsGuardadosValidos = (p) =>
  p && typeof p === 'object' && Object.keys(validarParametros(p)).length === 0;
const catalogoGuardadoValido = (c) =>
  Array.isArray(c) && CATALOGO_INICIAL.every((base) => c.some((p) => p.id === base.id));
const aberturasGuardadasValidas = (a) => Array.isArray(a);

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

  // --- Handlers (manejadores de eventos) ---

  /**
   * Devuelve un mensaje de error si el cambio no es válido (y no lo guarda),
   * o null si lo guardó.
   */
  const cambiarParametro = (campo) => (valor) => {
    const nuevos = { ...params, [campo]: valor };
    const errores = validarParametros(nuevos);
    if (Object.keys(errores).length > 0) return errores[campo] || Object.values(errores)[0];

    const aberturaQueNoEntra = aberturas.find((op) => validarAbertura(op, nuevos) !== null);
    if (aberturaQueNoEntra) {
      return `Una ${aberturaQueNoEntra.tipo} (${aberturaQueNoEntra.pared}) dejaría de entrar. Movela o quitala primero.`;
    }
    setParams(nuevos);
    return null;
  };

  const cambiarInsumo = (id, campo, valor) =>
    setCatalogo((prev) => prev.map((p) => (p.id === id ? { ...p, [campo]: valor } : p)));

  const agregarAbertura = (abertura) => setAberturas((prev) => [...prev, abertura]);
  const quitarAbertura = (id) => setAberturas((prev) => prev.filter((op) => op.id !== id));

  const restablecer = () => {
    if (!window.confirm('¿Volver a los valores y precios por defecto?')) return;
    setParams(PARAMS_INICIALES);
    setAberturas(ABERTURAS_INICIALES);
    setCatalogo(CATALOGO_INICIAL);
  };

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
          <section className="card">
            <h2>Estructura</h2>
            <div className="grid-params">
              {CAMPOS_MEDIDA.map(([campo, etiqueta]) => (
                <CampoNumero key={campo} etiqueta={etiqueta} unidad={unidad}
                  valor={params[campo]} onCambio={cambiarParametro(campo)} />
              ))}
              <CampoNumero etiqueta="Filas de pilotines" sufijo="u" decimales={0}
                valor={params.filasPilotines} onCambio={cambiarParametro('filasPilotines')} />
              <CampoNumero etiqueta="Pilotines por fila" sufijo="u" decimales={0}
                valor={params.pilotinesPorFila} onCambio={cambiarParametro('pilotinesPorFila')} />
            </div>
          </section>

          <PanelAberturas aberturas={aberturasValidas} params={params} unidad={unidad}
            onAgregar={agregarAbertura} onQuitar={quitarAbertura} />

          <TablaPresupuesto items={items} total={total} catalogo={catalogo} onCambiarInsumo={cambiarInsumo} />
        </div>
      </main>
    </div>
  );
}
