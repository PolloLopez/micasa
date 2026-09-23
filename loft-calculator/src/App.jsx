import React, { useState } from 'react';
import LoftCanvas from './LoftCanvas';
import './App.css';

export default function App() {
  const [globalUnit, setGlobalUnit] = useState('m');

  const [params, setParams] = useState({
    frente: 7.50,
    profundidad: 4.50,
    altura: 4.50,
    elevacion: 0.50,
    anchoMezzanine: 3.00,
    distanciaColumnas: 2.50,
    pasoTirantesPiso: 0.40,
    pasoTirantesAltillo: 0.40,
    separacionCorreas: 0.80,
    filasPilotines: 4,
    pilotinesPorFila: 3,
    // Largos Comerciales Específicos por Perfil (m)
    largoBarraCols: 6.0,
    largoBarraVigas: 6.0,
    largoBarraTrans: 6.0,
    largoBarraCorreas: 6.0,
    // Aberturas y Ubicación en Paredes
    puertaAncho: 0.90,
    puertaAlto: 2.05,
    paredPuerta: 'frente', // 'frente' | 'fondo' | 'izquierda' | 'derecha'
    ventanaAncho: 1.50,
    ventanaAlto: 0.60,
    antepechoVentana: 1.10,
    paredVentana: 'frente'
  });

  const [layers, setLayers] = useState({
    pilotines: true, columnas: true, estructuras: true, fajas: true, osb: true, pur: true
  });

  const [prices, setPrices] = useState({
    col: 38000, vig: 35000, vigTrans: 26000, cor: 22000, pil: 15000
  });

  const toUnit = (valInMeters) => {
    if (globalUnit === 'mm') return (valInMeters * 1000).toFixed(0);
    if (globalUnit === 'cm') return (valInMeters * 100).toFixed(1);
    return valInMeters.toFixed(2);
  };

  const fromUnitToMeters = (valInSelectedUnit) => {
    const v = parseFloat(valInSelectedUnit) || 0;
    if (globalUnit === 'mm') return v / 1000;
    if (globalUnit === 'cm') return v / 100;
    return v;
  };

  const handleParamChangeInUnit = (e) => {
    const valMeters = fromUnitToMeters(e.target.value);
    setParams({ ...params, [e.target.name]: valMeters });
  };

  const handleDirectParam = (e) => setParams({ ...params, [e.target.name]: e.target.value });
  const toggleLayer = (key) => setLayers({ ...layers, [key]: !layers[key] });

  // ALGORITMO NESTING 1D MEJORADO (Combina tramos largos y cortos para minimizar residuo)
  const optimizeCuts = (piecesList, barLengthMeters, kerfMM = 3) => {
    if (!piecesList || piecesList.length === 0) return { bars: [], totalBars: 0, totalNetPiecesMetrage: 0, wasteMeters: 0, wastePercent: 0 };
    const kerfM = kerfMM / 1000;
    let sortedPieces = [...piecesList].sort((a, b) => b - a);
    let bars = [];

    sortedPieces.forEach((piece) => {
      let placed = false;
      for (let bar of bars) {
        const needed = piece + (bar.pieces.length > 0 ? kerfM : 0);
        if (bar.used + needed <= barLengthMeters) {
          bar.pieces.push(piece);
          bar.used += needed;
          placed = true;
          break;
        }
      }
      if (!placed) {
        bars.push({ id: bars.length + 1, pieces: [piece], used: piece });
      }
    });

    const totalBarMetrage = bars.length * barLengthMeters;
    const totalNetPiecesMetrage = piecesList.reduce((a, b) => a + b, 0);
    const wasteMeters = totalBarMetrage - totalNetPiecesMetrage;
    const wastePercent = totalBarMetrage > 0 ? (wasteMeters / totalBarMetrage) * 100 : 0;

    return { bars, totalBars: bars.length, totalNetPiecesMetrage, wasteMeters, wastePercent };
  };

  // Cómputo de Columnas
  const numColsLargo = Math.max(2, Math.ceil(params.frente / params.distanciaColumnas) + 1);
  const numColsAncho = Math.max(2, Math.ceil(params.profundidad / params.distanciaColumnas) + 1);
  const totalCols = (numColsLargo * 2) + ((numColsAncho - 2) * 3);
  let colPieces = Array(totalCols).fill(params.altura);

  // Verificación de coincidencias de aberturas con columnas
  // Si la abertura no coincide con una columna existente, se añaden los dintel-jambas de refuerzo
  const refuerzoPuerta = params.puertaAncho > 0 ? [params.puertaAncho, params.puertaAlto] : [];
  const refuerzoVentana = params.ventanaAncho > 0 ? [params.ventanaAncho, params.ventanaAlto] : [];
  
  // Combinamos piezas en una misma lista para que el optimizador combine tramos largos y cortos
  const allStructuralPieces = [...colPieces, ...refuerzoPuerta, ...refuerzoVentana];
  const optCols = optimizeCuts(allStructuralPieces, params.largoBarraCols);

  // Cómputo de Revestimientos con Descuento
  const superficieBrutaMuros = (params.frente + params.profundidad) * 2 * params.altura;
  const areaPuerta = params.puertaAncho * params.puertaAlto;
  const areaVentana = params.ventanaAncho * params.ventanaAlto;
  const superficieNetaMuros = Math.max(0, superficieBrutaMuros - areaPuerta - areaVentana);

  return (
    <div className="app">
      <header>
        <div>
          <h1>Diseñador & Cotizador</h1>
          {/* <div className="subtitle">By "elPollo"</div> */}
        </div>
        <div className="header-actions">
          <label>Unidad Global:</label>
          <select value={globalUnit} onChange={(e) => setGlobalUnit(e.target.value)}>
            <option value="m">Metros (m)</option>
            <option value="cm">Centímetros (cm)</option>
            <option value="mm">Milímetros (mm)</option>
          </select>
          <button className="btn-print" onClick={() => window.print()}>📄 Exportar PDF</button>
        </div>
      </header>

      {/* SIDEBAR SUPERIOR - CONFIGURACIÓN Y PARÁMETROS */}
      <div className="top-sidebar">
        <div className="card">
          <h2>Medidas Estructurales ({globalUnit})</h2>
          <div className="grid-params">
            <div className="group"><label>Frente:</label><input type="number" name="frente" value={toUnit(params.frente)} onChange={handleParamChangeInUnit} /></div>
            <div className="group"><label>Profundidad:</label><input type="number" name="profundidad" value={toUnit(params.profundidad)} onChange={handleParamChangeInUnit} /></div>
            <div className="group"><label>Altura Estructura:</label><input type="number" name="altura" value={toUnit(params.altura)} onChange={handleParamChangeInUnit} /></div>
            <div className="group"><label>Ancho Altillo:</label><input type="number" name="anchoMezzanine" value={toUnit(params.anchoMezzanine)} onChange={handleParamChangeInUnit} /></div>
          </div>
        </div>

        <div className="card">
          <h2>Aberturas y Ubicación en Muros</h2>
          <div className="grid-params">
            <div className="group"><label>Pared Puerta:</label>
              <select name="paredPuerta" value={params.paredPuerta} onChange={handleDirectParam}>
                <option value="frente">Frente</option>
                <option value="fondo">Fondo</option>
                <option value="izquierda">Lateral Izquierdo</option>
                <option value="derecha">Lateral Derecho</option>
              </select>
            </div>
            <div className="group"><label>Ancho Puerta ({globalUnit}):</label><input type="number" name="puertaAncho" value={toUnit(params.puertaAncho)} onChange={handleParamChangeInUnit} /></div>
            <div className="group"><label>Pared Ventana:</label>
              <select name="paredVentana" value={params.paredVentana} onChange={handleDirectParam}>
                <option value="frente">Frente</option>
                <option value="fondo">Fondo</option>
                <option value="izquierda">Lateral Izquierdo</option>
                <option value="derecha">Lateral Derecho</option>
              </select>
            </div>
            <div className="group"><label>Ancho Ventana ({globalUnit}):</label><input type="number" name="ventanaAncho" value={toUnit(params.ventanaAncho)} onChange={handleParamChangeInUnit} /></div>
          </div>
        </div>

        <div className="card">
          <h2>Largos Comerciales Específicos (m)</h2>
          <div className="grid-params">
            <div className="group"><label>Barra Columnas:</label><input type="number" name="largoBarraCols" value={params.largoBarraCols} onChange={(e) => setParams({...params, largoBarraCols: parseFloat(e.target.value)||6})} /></div>
            <div className="group"><label>Barra Vigas:</label><input type="number" name="largoBarraVigas" value={params.largoBarraVigas} onChange={(e) => setParams({...params, largoBarraVigas: parseFloat(e.target.value)||6})} /></div>
          </div>
        </div>

        <div className="card">
          <h2>Cómputo Netos y Desperdicio</h2>
          <p className="opt-desc">Muros Brutos: <strong>{superficieBrutaMuros.toFixed(2)}m²</strong> | Aberturas: <strong className="warn">-{ (areaPuerta+areaVentana).toFixed(2) }m²</strong></p>
          <p className="opt-desc">Barras Necesarias (Columnas + Refuerzos): <strong>{optCols.totalBars} u</strong> | Desperdicio: <strong className="warn">{optCols.wastePercent.toFixed(1)}%</strong> ({optCols.wasteMeters.toFixed(2)}m)</p>
          
          <details className="bar-details">
            <summary>🔍 Ver Detalle de Cortes por Barra ({optCols.totalBars} barras)</summary>
            <div className="bar-cuts-container">
              {optCols.bars.map((b) => (
                <div key={b.id} className="bar-item">
                  <div className="bar-title">Barra #{b.id} ({params.largoBarraCols}m) - Utilizado: {b.used.toFixed(2)}m</div>
                  <div className="bar-graphic">
                    {b.pieces.map((p, idx) => (
                      <div key={idx} className="piece-block" style={{ width: `${(p / params.largoBarraCols) * 100}%` }}>
                        {p}m
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </details>
        </div>
      </div>

      {/* ÁREA INFERIOR - VISOR 3D */}
      <div className="layout-bottom">
        <div className="canvas-wrap">
          <LoftCanvas params={params} layers={layers} />
        </div>
      </div>
    </div>
  );
}