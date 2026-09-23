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
    largoBarra: 6.0,
  });

  // Lista extensible de materiales personalizados
  const [customMaterials, setCustomMaterials] = useState([
    { id: 1, nombre: 'Placa Fenólica / OSB 18mm', categoria: 'Piso', largo: 2.44, ancho: 1.22, precio: 28000 },
    { id: 2, nombre: 'Panel PUR (Isopanel) 50mm', categoria: 'Pared', largo: 6.00, ancho: 1.00, precio: 35000 },
    { id: 3, nombre: 'Placa Durlock / Yeso 12.5mm', categoria: 'Cielo', largo: 2.40, ancho: 1.20, precio: 18000 },
    { id: 4, nombre: 'Placa ZIP System 13mm', categoria: 'Exterior', largo: 2.44, ancho: 1.22, precio: 42000 }
  ]);

  const [newMat, setNewMat] = useState({ nombre: '', categoria: 'Piso', largo: 2.44, ancho: 1.22, precio: 0 });

  const [layers, setLayers] = useState({
    pilotines: true, columnas: true, estructuras: true, fajas: true, osb: true, pur: true
  });

  const [prices, setPrices] = useState({
    col: 38000, vig: 35000, vigTrans: 26000, cor: 22000, pil: 15000, manoObraM2: 12000
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

  const handleDirectParam = (e) => setParams({ ...params, [e.target.name]: parseFloat(e.target.value) || 0 });
  const toggleLayer = (key) => setLayers({ ...layers, [key]: !layers[key] });

  const addCustomMaterial = () => {
    if (!newMat.nombre) return;
    setCustomMaterials([...customMaterials, { ...newMat, id: Date.now() }]);
    setNewMat({ nombre: '', categoria: 'Piso', largo: 2.44, ancho: 1.22, precio: 0 });
  };

  // Algoritmo 1D Nesting
  const optimizeCuts = (piecesList, barLengthMeters, kerfMM = 3) => {
    const kerfM = kerfMM / 1000;
    let sortedPieces = [...piecesList].sort((a, b) => b - a);
    let bars = [];

    sortedPieces.forEach((piece) => {
      let placed = false;
      for (let bar of bars) {
        if (bar.used + piece + (bar.cuts > 0 ? kerfM : 0) <= barLengthMeters) {
          bar.pieces.push(piece);
          bar.used += piece + (bar.cuts > 0 ? kerfM : 0);
          bar.cuts += 1;
          placed = true;
          break;
        }
      }
      if (!placed) {
        bars.push({ id: bars.length + 1, pieces: [piece], used: piece, cuts: 1 });
      }
    });

    const totalBarMetrage = bars.length * barLengthMeters;
    const totalNetPiecesMetrage = piecesList.reduce((a, b) => a + b, 0);
    const wasteMeters = totalBarMetrage - totalNetPiecesMetrage;
    const wastePercent = totalBarMetrage > 0 ? (wasteMeters / totalBarMetrage) * 100 : 0;

    return { bars, totalBars: bars.length, totalNetPiecesMetrage, wasteMeters, wastePercent };
  };

  // Cómputo
  const numColsLargo = Math.max(2, Math.ceil(params.frente / params.distanciaColumnas) + 1);
  const numColsAncho = Math.max(2, Math.ceil(params.profundidad / params.distanciaColumnas) + 1);
  const totalCols = (numColsLargo * 2) + ((numColsAncho - 2) * 3);
  const colPieces = Array(totalCols).fill(params.altura);

  const cantTirantesPiso = Math.floor(params.frente / params.pasoTirantesPiso) + 1;
  const cantTirantesAlt = Math.floor(params.anchoMezzanine / params.pasoTirantesAltillo) + 1;
  const transPieces = [
    ...Array(cantTirantesPiso).fill(params.profundidad),
    ...Array(cantTirantesAlt).fill(params.profundidad)
  ];

  const optCols = optimizeCuts(colPieces, params.largoBarra);
  const optTrans = optimizeCuts(transPieces, params.largoBarra);

  return (
    <div className="app">
      <header>
        <div>
          <h1>Diseñador & Cotizador</h1>
          <div className="subtitle">By "elPollo"</div>
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

      <div className="layout">
        <div className="canvas-wrap">
          <LoftCanvas params={params} layers={layers} />
        </div>

        <aside className="sidebar">
          {/* MEDIDAS */}
          <div className="card">
            <h2>Dimensiones y Separación de Perfiles ({globalUnit})</h2>
            <div className="group"><label>Frente:</label><input type="number" name="frente" value={toUnit(params.frente)} onChange={handleParamChangeInUnit} /></div>
            <div className="group"><label>Profundidad:</label><input type="number" name="profundidad" value={toUnit(params.profundidad)} onChange={handleParamChangeInUnit} /></div>
            <div className="group"><label>Altura Estructura:</label><input type="number" name="altura" value={toUnit(params.altura)} onChange={handleParamChangeInUnit} /></div>
            <div className="group"><label>Ancho Altillo:</label><input type="number" name="anchoMezzanine" value={toUnit(params.anchoMezzanine)} onChange={handleParamChangeInUnit} /></div>
            <div className="group"><label>Distancia entre Columnas:</label><input type="number" name="distanciaColumnas" value={toUnit(params.distanciaColumnas)} onChange={handleParamChangeInUnit} /></div>
            <div className="group"><label>Separación Tirantes Piso PB:</label><input type="number" name="pasoTirantesPiso" value={toUnit(params.pasoTirantesPiso)} onChange={handleParamChangeInUnit} /></div>
            <div className="group"><label>Separación Tirantes Altillo:</label><input type="number" name="pasoTirantesAltillo" value={toUnit(params.pasoTirantesAltillo)} onChange={handleParamChangeInUnit} /></div>
            <div className="group"><label>Largo Barra Comercial ({globalUnit}):</label><input type="number" name="largoBarra" value={toUnit(params.largoBarra)} onChange={handleParamChangeInUnit} /></div>
          </div>

          {/* AGREGAR MATERIAL PERSONALIZADO */}
          <div className="card">
            <h2>Agregar Material / Placa Personalizada</h2>
            <div className="group"><label>Nombre Material:</label><input type="text" value={newMat.nombre} onChange={(e) => setNewMat({...newMat, nombre: e.target.value})} placeholder="ej: Placa OSB 18mm" /></div>
            <div className="group"><label>Largo x Ancho (m):</label>
              <input type="number" style={{width: '60px'}} value={newMat.largo} onChange={(e) => setNewMat({...newMat, largo: parseFloat(e.target.value)||0})} />
              <input type="number" style={{width: '60px'}} value={newMat.ancho} onChange={(e) => setNewMat({...newMat, ancho: parseFloat(e.target.value)||0})} />
            </div>
            <div className="group"><label>Precio ($ ARS):</label><input type="number" value={newMat.precio} onChange={(e) => setNewMat({...newMat, precio: parseFloat(e.target.value)||0})} /></div>
            <button className="btn-add" onClick={addCustomMaterial}>+ Agregar Material</button>

            <ul className="mat-list">
              {customMaterials.map((m) => (
                <li key={m.id}>{m.nombre} ({m.largo}m x {m.ancho}m) - ${m.precio.toLocaleString('es-AR')}</li>
              ))}
            </ul>
          </div>

          {/* PLANO DE CORTE Y OPTIMIZACIÓN */}
          <div className="card">
            <h2>Optimización de Cortes (Columnas)</h2>
            <p className="opt-desc">Barras Necesarias: <strong>{optCols.totalBars}</strong> | Desperdicio: <strong className="warn">{optCols.wastePercent.toFixed(1)}%</strong> ({optCols.wasteMeters.toFixed(2)}m)</p>
            <div className="bar-cuts-container">
              {optCols.bars.map((b) => (
                <div key={b.id} className="bar-item">
                  <div className="bar-title">Barra #{b.id} ({params.largoBarra}m)</div>
                  <div className="bar-graphic">
                    {b.pieces.map((p, idx) => (
                      <div key={idx} className="piece-block" style={{ width: `${(p / params.largoBarra) * 100}%` }}>
                        {p}m
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}