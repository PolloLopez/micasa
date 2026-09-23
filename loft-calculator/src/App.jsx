import React, { useState } from 'react';
import LoftCanvas from './LoftCanvas';
import './App.css';

export default function App() {
  // Unidades globales: 'm' | 'cm' | 'mm'
  const [globalUnit, setGlobalUnit] = useState('m');

  // Parámetros principales en Metros (Base interna constante)
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
    largoBarra: 6.0, // Largo comercial en metros
  });

  // Catálogo de materiales
  const [matSpecs, setMatSpecs] = useState({
    columna: { tipo: 'Caño Estructural', medida: '100x100', espesor: '1.6' },
    viga: { tipo: 'Perfil C', medida: '120x50', espesor: '2.0' },
    vigaTransversal: { tipo: 'Perfil C', medida: '100x45', espesor: '2.0' },
    correa: { tipo: 'Perfil C', medida: '80x40', espesor: '1.6' },
    osb: { tipoMaterial: 'Placa Fenólica / OSB', largo: 2.44, ancho: 1.22, espesor: '18' },
    pur: { tipoMaterial: 'Panel PUR (Isopanel)', anchoUtil: 1.00, espesor: '50' }
  });

  // Capas de visibilidad
  const [layers, setLayers] = useState({
    pilotines: true,
    columnas: true,
    estructuras: true,
    fajas: true,
    osb: true,
    pur: true
  });

  // Precios
  const [prices, setPrices] = useState({
    col: 38000, vig: 35000, vigTrans: 26000, cor: 22000, osb: 28000, pur: 35000, pil: 15000,
    manoObraM2: 12000, consumibles: 85000, pintura: 45000, flete: 50000
  });

  // Conversión de visualización según unidad activa
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
    const name = e.target.name;
    const valMeters = fromUnitToMeters(e.target.value);
    setParams({ ...params, [name]: valMeters });
  };

  const handleDirectParam = (e) => {
    const val = parseFloat(e.target.value) || 0;
    setParams({ ...params, [e.target.name]: val });
  };

  const handleSpec = (cat, field, val) => {
    setMatSpecs({
      ...matSpecs,
      [cat]: { ...matSpecs[cat], [field]: field === 'largo' || field === 'ancho' || field === 'anchoUtil' ? (parseFloat(val) || 0) : val }
    });
  };

  const handlePrice = (e) => setPrices({ ...prices, [e.target.name]: parseFloat(e.target.value) || 0 });
  const toggleLayer = (key) => setLayers({ ...layers, [key]: !layers[key] });

  // --- ALGORITMO DE OPTIMIZACIÓN DE CORTES (1D NESTING) ---
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
        bars.push({
          id: bars.length + 1,
          pieces: [piece],
          used: piece,
          cuts: 1
        });
      }
    });

    const totalBarMetrage = bars.length * barLengthMeters;
    const totalNetPiecesMetrage = piecesList.reduce((a, b) => a + b, 0);
    const wasteMeters = totalBarMetrage - totalNetPiecesMetrage;
    const wastePercent = totalBarMetrage > 0 ? (wasteMeters / totalBarMetrage) * 100 : 0;

    return { bars, totalBars: bars.length, totalNetPiecesMetrage, wasteMeters, wastePercent };
  };

  // --- CÓMPUTO DE PIEZAS PARA CORTE ---
  const numColsLargo = Math.max(2, Math.ceil(params.frente / params.distanciaColumnas) + 1);
  const numColsAncho = Math.max(2, Math.ceil(params.profundidad / params.distanciaColumnas) + 1);
  const totalCols = (numColsLargo * 2) + ((numColsAncho - 2) * 3);
  const colPieces = Array(totalCols).fill(params.altura);

  const vigaMarcoPieces = [
    ...Array(4).fill(params.frente),
    ...Array(4).fill(params.profundidad)
  ];

  const cantTirantesPiso = Math.floor(params.frente / params.pasoTirantesPiso) + 1;
  const cantTirantesAlt = Math.floor(params.anchoMezzanine / params.pasoTirantesAltillo) + 1;
  const transPieces = [
    ...Array(cantTirantesPiso).fill(params.profundidad),
    ...Array(cantTirantesAlt).fill(params.profundidad)
  ];

  const cantFajas = Math.floor(params.altura / params.separacionCorreas);
  const correaPieces = [
    ...Array(cantFajas * 2).fill(params.frente),
    ...Array(cantFajas * 2).fill(params.profundidad)
  ];

  // Ejecutar Optimización
  const optCols = optimizeCuts(colPieces, params.largoBarra);
  const optVigas = optimizeCuts(vigaMarcoPieces, params.largoBarra);
  const optTrans = optimizeCuts(transPieces, params.largoBarra);
  const optCorreas = optimizeCuts(correaPieces, params.largoBarra);

  // Superficies
  const areaPlaca = (matSpecs.osb.largo || 2.44) * (matSpecs.osb.ancho || 1.22);
  const areaPisoTotal = (params.frente * params.profundidad) + (params.anchoMezzanine * params.profundidad);
  const cOsb = Math.ceil(areaPisoTotal / (areaPlaca || 2.97));
  const mPur = Math.ceil(((params.frente + params.profundidad) * 2 * params.altura) + (params.frente * params.profundidad * 1.05));
  const totalPilotines = params.filasPilotines * params.pilotinesPorFila;

  // Presupuesto
  const itemsMateriales = [
    { name: `Columnas (${matSpecs.columna.tipo} ${matSpecs.columna.medida})`, cant: optCols.totalBars, pKey: 'col', unit: 'Barras', opt: optCols },
    { name: `Vigas Marco (${matSpecs.viga.tipo} ${matSpecs.viga.medida})`, cant: optVigas.totalBars, pKey: 'vig', unit: 'Barras', opt: optVigas },
    { name: `Transversales Piso/Altillo (${matSpecs.vigaTransversal.tipo} ${matSpecs.vigaTransversal.medida})`, cant: optTrans.totalBars, pKey: 'vigTrans', unit: 'Barras', opt: optTrans },
    { name: `Fajas/Correas (${matSpecs.correa.tipo} ${matSpecs.correa.medida})`, cant: optCorreas.totalBars, pKey: 'cor', unit: 'Barras', opt: optCorreas },
    { name: `${matSpecs.osb.tipoMaterial}`, cant: cOsb, pKey: 'osb', unit: 'Placas' },
    { name: `${matSpecs.pur.tipoMaterial}`, cant: mPur, pKey: 'pur', unit: 'm²' },
    { name: `Pilotines Cemento`, cant: totalPilotines, pKey: 'pil', unit: 'U' }
  ];

  const itemsAdicionales = [
    { name: 'Mano de Obra Armado', cant: Math.ceil(areaPisoTotal), pKey: 'manoObraM2', unit: 'm²' },
    { name: 'Consumibles (Electrodos/Discos/Gas)', cant: 1, pKey: 'consumibles', unit: 'Global' },
    { name: 'Pintura Antióxido / Convertidor', cant: 1, pKey: 'pintura', unit: 'Global' },
    { name: 'Flete y Logística', cant: 1, pKey: 'flete', unit: 'Global' }
  ];

  const subtotalMat = itemsMateriales.reduce((a, b) => a + (b.cant * prices[b.pKey]), 0);
  const subtotalAdi = itemsAdicionales.reduce((a, b) => a + (b.cant * prices[b.pKey]), 0);
  const totalGeneral = subtotalMat + subtotalAdi;

  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <div className="app">
      <header className="no-print">
        <div className="title-area">
          <h1>Diseñador & Cotizador</h1>
          <div className="subtitle">By "elPollo"</div>
        </div>
        <div className="header-actions">
          <div className="unit-selector">
            <label>Unidad Global:</label>
            <select value={globalUnit} onChange={(e) => setGlobalUnit(e.target.value)}>
              <option value="m">Metros (m)</option>
              <option value="cm">Centímetros (cm)</option>
              <option value="mm">Milímetros (mm)</option>
            </select>
          </div>
          <button className="btn-print" onClick={handlePrintPDF}>📄 Exportar PDF / Imprimir</button>
        </div>
      </header>

      <div className="layout">
        <div className="canvas-wrap no-print">
          <LoftCanvas params={params} layers={layers} />
        </div>

        <aside className="sidebar">
          
          {/* VISIBILIDAD DE CAPAS */}
          <div className="card no-print">
            <h2>Visibilidad de Capas 3D</h2>
            <div className="layers-grid">
              <label className="checkbox"><input type="checkbox" checked={layers.pilotines} onChange={() => toggleLayer('pilotines')} /> Pilotines</label>
              <label className="checkbox"><input type="checkbox" checked={layers.columnas} onChange={() => toggleLayer('columnas')} /> Columnas</label>
              <label className="checkbox"><input type="checkbox" checked={layers.estructuras} onChange={() => toggleLayer('estructuras')} /> Pisos/Altillo</label>
              <label className="checkbox"><input type="checkbox" checked={layers.fajas} onChange={() => toggleLayer('fajas')} /> Fajas/Correas</label>
              <label className="checkbox"><input type="checkbox" checked={layers.osb} onChange={() => toggleLayer('osb')} /> Placas OSB</label>
              <label className="checkbox"><input type="checkbox" checked={layers.pur} onChange={() => toggleLayer('pur')} /> Revestimiento</label>
            </div>
          </div>

          {/* DIMENSIONES GENERALES */}
          <div className="card">
            <h2>Dimensiones Generales ({globalUnit})</h2>
            <div className="group"><label>Frente:</label><input type="number" step="0.1" name="frente" value={toUnit(params.frente)} onChange={handleParamChangeInUnit} /></div>
            <div className="group"><label>Profundidad:</label><input type="number" step="0.1" name="profundidad" value={toUnit(params.profundidad)} onChange={handleParamChangeInUnit} /></div>
            <div className="group"><label>Altura Estructura:</label><input type="number" step="0.1" name="altura" value={toUnit(params.altura)} onChange={handleParamChangeInUnit} /></div>
            <div className="group"><label>Elevación Pilotines:</label><input type="number" step="0.1" name="elevacion" value={toUnit(params.elevacion)} onChange={handleParamChangeInUnit} /></div>
            <div className="group"><label>Ancho Altillo:</label><input type="number" step="0.1" name="anchoMezzanine" value={toUnit(params.anchoMezzanine)} onChange={handleParamChangeInUnit} /></div>
          </div>

          {/* PASOS Y SEPARACIONES */}
          <div className="card">
            <h2>Pasos y Modulación ({globalUnit})</h2>
            <div className="group"><label>Paso Máx. Columnas:</label><input type="number" step="0.1" name="distanciaColumnas" value={toUnit(params.distanciaColumnas)} onChange={handleParamChangeInUnit} /></div>
            <div className="group"><label>Paso Transversales Piso:</label><input type="number" step="0.05" name="pasoTirantesPiso" value={toUnit(params.pasoTirantesPiso)} onChange={handleParamChangeInUnit} /></div>
            <div className="group"><label>Paso Transversales Altillo:</label><input type="number" step="0.05" name="pasoTirantesAltillo" value={toUnit(params.pasoTirantesAltillo)} onChange={handleParamChangeInUnit} /></div>
            <div className="group"><label>Paso Fajas Pared:</label><input type="number" step="0.05" name="separacionCorreas" value={toUnit(params.separacionCorreas)} onChange={handleParamChangeInUnit} /></div>
            <div className="group"><label>Filas Pilotines:</label><input type="number" name="filasPilotines" value={params.filasPilotines} onChange={handleDirectParam} /></div>
            <div className="group"><label>Pilotines x Fila:</label><input type="number" name="pilotinesPorFila" value={params.pilotinesPorFila} onChange={handleDirectParam} /></div>
            <div className="group"><label>Largo Comercial Barra ({globalUnit}):</label><input type="number" name="largoBarra" value={toUnit(params.largoBarra)} onChange={handleParamChangeInUnit} /></div>
          </div>

          {/* OPTIMIZACIÓN DE CORTES Y DESPERDICIO */}
          <div className="card">
            <h2>Optimización de Cortes (Desperdicio)</h2>
            <div className="opt-summary">
              <p><strong>Columnas:</strong> {optCols.totalBars} barras | Util: {optCols.totalNetPiecesMetrage.toFixed(2)}m | Desperdicio: <span className="badge-warn">{optCols.wastePercent.toFixed(1)}%</span> ({optCols.wasteMeters.toFixed(2)}m)</p>
              <p><strong>Vigas Marco:</strong> {optVigas.totalBars} barras | Util: {optVigas.totalNetPiecesMetrage.toFixed(2)}m | Desperdicio: <span className="badge-warn">{optVigas.wastePercent.toFixed(1)}%</span> ({optVigas.wasteMeters.toFixed(2)}m)</p>
              <p><strong>Transversales:</strong> {optTrans.totalBars} barras | Util: {optTrans.totalNetPiecesMetrage.toFixed(2)}m | Desperdicio: <span className="badge-warn">{optTrans.wastePercent.toFixed(1)}%</span> ({optTrans.wasteMeters.toFixed(2)}m)</p>
              <p><strong>Fajas/Correas:</strong> {optCorreas.totalBars} barras | Util: {optCorreas.totalNetPiecesMetrage.toFixed(2)}m | Desperdicio: <span className="badge-warn">{optCorreas.wastePercent.toFixed(1)}%</span> ({optCorreas.wasteMeters.toFixed(2)}m)</p>
            </div>
          </div>

          {/* ESQUEMA DE CORTE VISUAL */}
          <div className="card">
            <h2>Plano de Corte por Barra (Columnas)</h2>
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

          {/* CATÁLOGO DE MATERIALES */}
          <div className="card no-print">
            <h2>Especificación de Materiales</h2>
            <div className="subcard">
              <h3>Columnas</h3>
              <div className="group"><label>Tipo:</label>
                <select value={matSpecs.columna.tipo} onChange={(e) => handleSpec('columna', 'tipo', e.target.value)}>
                  <option value="Caño Estructural">Caño Estructural</option>
                  <option value="Perfil C">Perfil C</option>
                  <option value="Perfil IPN">Perfil IPN</option>
                  <option value="Perfil UPN">Perfil UPN</option>
                </select>
              </div>
              <div className="group"><label>Medida ({globalUnit}):</label><input type="text" value={matSpecs.columna.medida} onChange={(e) => handleSpec('columna', 'medida', e.target.value)} /></div>
              <div className="group"><label>Espesor ({globalUnit}):</label><input type="text" value={matSpecs.columna.espesor} onChange={(e) => handleSpec('columna', 'espesor', e.target.value)} /></div>
            </div>

            <div className="subcard">
              <h3>Vigas Marco</h3>
              <div className="group"><label>Tipo:</label>
                <select value={matSpecs.viga.tipo} onChange={(e) => handleSpec('viga', 'tipo', e.target.value)}>
                  <option value="Perfil C">Perfil C</option>
                  <option value="Caño Estructural">Caño Estructural</option>
                </select>
              </div>
              <div className="group"><label>Medida ({globalUnit}):</label><input type="text" value={matSpecs.viga.medida} onChange={(e) => handleSpec('viga', 'medida', e.target.value)} /></div>
            </div>
          </div>

          {/* PRESUPUESTO COMPLETO */}
          <div className="card">
            <h2>Presupuesto Estimado ($ ARS)</h2>
            <table>
              <thead><tr><th>Item</th><th>Cant</th><th>Precio U.</th><th>Subtotal</th></tr></thead>
              <tbody>
                {itemsMateriales.map((i, idx) => (
                  <tr key={idx}>
                    <td>
                      <strong>{i.name}</strong>
                      {i.opt && <div className="extra-info">Desperdicio: {i.opt.wastePercent.toFixed(1)}%</div>}
                    </td>
                    <td>{i.cant} {i.unit}</td>
                    <td><input type="number" className="no-print" name={i.pKey} value={prices[i.pKey]} onChange={handlePrice} /></td>
                    <td className="sub">$ {(i.cant * prices[i.pKey]).toLocaleString('es-AR')}</td>
                  </tr>
                ))}
                {itemsAdicionales.map((i, idx) => (
                  <tr key={`add-${idx}`}>
                    <td>{i.name}</td>
                    <td>{i.cant} {i.unit}</td>
                    <td><input type="number" className="no-print" name={i.pKey} value={prices[i.pKey]} onChange={handlePrice} /></td>
                    <td className="sub">$ {(i.cant * prices[i.pKey]).toLocaleString('es-AR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="total"><span>TOTAL PRESUPUESTO:</span><span>$ {totalGeneral.toLocaleString('es-AR')}</span></div>
          </div>

        </aside>
      </div>
    </div>
  );
}