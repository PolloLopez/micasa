import React, { useState } from 'react';
import LoftCanvas from './LoftCanvas';
import './App.css';

export default function App() {
  const [globalUnit, setGlobalUnit] = useState('m');

  // Parámetros dimensionales clave
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
    pilotinesPorFila: 3
  });

  // Catálogo parametrizado de perfiles e insumos con largo comercial individual
  const [catalog, setCatalog] = useState([
    { id: 'col', nombre: 'Columnas principales (Caño Estructural 100x100x1.6)', unidad: 'Barra', largoBarra: 6.0, precio: 38000, tipo: 'perfil' },
    { id: 'vig', nombre: 'Vigas Marco Perimetral (Perfil C 120x50x2.0)', unidad: 'Barra', largoBarra: 6.0, precio: 35000, tipo: 'perfil' },
    { id: 'trans', nombre: 'Transversales Piso/Altillo (Perfil C 100x45x2.0)', unidad: 'Barra', largoBarra: 6.0, precio: 26000, tipo: 'perfil' },
    { id: 'cor', nombre: 'Fajas / Correas (Perfil C 80x40x1.6)', unidad: 'Barra', largoBarra: 6.0, precio: 22000, tipo: 'perfil' },
    { id: 'osb', nombre: 'Placas Fenólico / OSB 18mm (2.44m x 1.22m)', unidad: 'Placa', largoBarra: 2.44, precio: 28000, tipo: 'placa' },
    { id: 'pur', nombre: 'Paneles PUR / Isopanel 50mm (Ancho Útil: 1.00m)', unidad: 'm²', largoBarra: 6.00, precio: 35000, tipo: 'panel' },
    { id: 'pil', nombre: 'Pilotines de Cemento', unidad: 'U', largoBarra: 0, precio: 15000, tipo: 'unidad' }
  ]);

  // Aberturas Múltiples Configurables por el usuario
  const [openings, setOpenings] = useState([
    { id: 1, nombre: 'Puerta Principal', tipo: 'puerta', pared: 'frente', ancho: 0.90, alto: 2.05, antepecho: 0, offset: 0 },
    { id: 2, nombre: 'Ventana Frente', tipo: 'ventana', pared: 'frente', ancho: 1.50, alto: 0.60, antepecho: 1.10, offset: 2.0 }
  ]);

  const [newOp, setNewOp] = useState({
    nombre: 'Nueva Ventana', tipo: 'ventana', pared: 'frente', ancho: 1.20, alto: 1.00, antepecho: 1.00, offset: 0
  });

  const [layers, setLayers] = useState({
    pilotines: true, columnas: true, estructuras: true, fajas: true, osb: true, pur: true
  });

  // Conversión de unidades
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

  const handleParamInUnit = (e) => {
    const valMeters = fromUnitToMeters(e.target.value);
    setParams({ ...params, [e.target.name]: valMeters });
  };

  const updateItemCatalog = (id, field, value) => {
    setCatalog(catalog.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const toggleLayer = (key) => setLayers({ ...layers, [key]: !layers[key] });

  const addOpening = () => {
    setOpenings([...openings, { ...newOp, id: Date.now() }]);
  };

  const removeOpening = (id) => {
    setOpenings(openings.filter(op => op.id !== id));
  };

  // ALGORITMO DE OPTIMIZACIÓN 1D (NESTING DE CORTES COMBINADOS)
  const optimize1D = (piecesList, barLength) => {
    if (!piecesList || piecesList.length === 0 || barLength <= 0) {
      return { bars: [], totalBars: 0, totalNetMetrage: 0, wasteMeters: 0, wastePercent: 0 };
    }
    const kerf = 0.003; // 3mm de merma por disco de corte
    let sorted = [...piecesList].sort((a, b) => b - a);
    let bars = [];

    sorted.forEach(piece => {
      let placed = false;
      for (let b of bars) {
        const neededSpace = piece + (b.pieces.length > 0 ? kerf : 0);
        if (b.used + neededSpace <= barLength) {
          b.pieces.push(piece);
          b.used += neededSpace;
          placed = true;
          break;
        }
      }
      if (!placed) {
        bars.push({ id: bars.length + 1, pieces: [piece], used: piece });
      }
    });

    const totalBarMetrage = bars.length * barLength;
    const totalNetMetrage = piecesList.reduce((a, b) => a + b, 0);
    const wasteMeters = totalBarMetrage - totalNetMetrage;
    const wastePercent = totalBarMetrage > 0 ? (wasteMeters / totalBarMetrage) * 100 : 0;

    return { bars, totalBars: bars.length, totalNetMetrage, wasteMeters, wastePercent };
  };

  // --- CÓMPUTOS ESTRUCTURALES Y DESPIECE ---
  // 1. Columnas y Dinteles de Refuerzo para Aberturas
  const numColsLargo = Math.max(2, Math.ceil(params.frente / params.distanciaColumnas) + 1);
  const numColsAncho = Math.max(2, Math.ceil(params.profundidad / params.distanciaColumnas) + 1);
  const totalCols = (numColsLargo * 2) + ((numColsAncho - 2) * 3);
  let piecesCols = Array(totalCols).fill(params.altura);

  // Agregar dinteles/refuerzos de aberturas a la lista de corte de perfiles
  openings.forEach(op => {
    if (op.ancho > 0) piecesCols.push(op.ancho); // Dintel superior
  });

  const colItem = catalog.find(i => i.id === 'col');
  const optCols = optimize1D(piecesCols, colItem ? colItem.largoBarra : 6.0);

  // 2. Superficies Netas con Descuento de Aberturas
  const areaBrutaMuros = (params.frente + params.profundidad) * 2 * params.altura;
  const areaTotalAberturas = openings.reduce((acc, op) => acc + (op.ancho * op.alto), 0);
  const areaNetaMuros = Math.max(0, areaBrutaMuros - areaTotalAberturas);

  return (
    <div className="app">
      <header>
        <div>
          <h1>Diseñador & Cotizador</h1>
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

      {/* PANEL DE CONFIGURACIÓN Y CONTROLES */}
      <div className="top-sidebar">
        {/* MEDIDAS Y DISTANCIAS */}
        <div className="card">
          <h2>Estructura ({globalUnit})</h2>
          <div className="grid-params">
            <div className="group"><label>Frente:</label><input type="number" name="frente" value={toUnit(params.frente)} onChange={handleParamInUnit} /></div>
            <div className="group"><label>Profundidad:</label><input type="number" name="profundidad" value={toUnit(params.profundidad)} onChange={handleParamInUnit} /></div>
            <div className="group"><label>Altura Estructura:</label><input type="number" name="altura" value={toUnit(params.altura)} onChange={handleParamInUnit} /></div>
            <div className="group"><label>Ancho Altillo:</label><input type="number" name="anchoMezzanine" value={toUnit(params.anchoMezzanine)} onChange={handleParamInUnit} /></div>
            <div className="group"><label>Dist. Columnas:</label><input type="number" name="distanciaColumnas" value={toUnit(params.distanciaColumnas)} onChange={handleParamInUnit} /></div>
            <div className="group"><label>Sep. Tirantes Piso:</label><input type="number" name="pasoTirantesPiso" value={toUnit(params.pasoTirantesPiso)} onChange={handleParamInUnit} /></div>
          </div>
        </div>

        {/* GESTOR DE ABERTURAS MÚLTIPLES */}
        <div className="card">
          <h2>Gestión de Aberturas</h2>
          <div className="grid-params">
            <div className="group"><label>Pared:</label>
              <select value={newOp.pared} onChange={(e) => setNewOp({...newOp, pared: e.target.value})}>
                <option value="frente">Frente</option>
                <option value="fondo">Fondo</option>
                <option value="izquierda">Lat. Izquierdo</option>
                <option value="derecha">Lat. Derecho</option>
              </select>
            </div>
            <div className="group"><label>Tipo:</label>
              <select value={newOp.tipo} onChange={(e) => setNewOp({...newOp, tipo: e.target.value})}>
                <option value="puerta">Puerta</option>
                <option value="ventana">Ventana</option>
              </select>
            </div>
            <div className="group"><label>Ancho (m):</label><input type="number" value={newOp.ancho} onChange={(e) => setNewOp({...newOp, ancho: parseFloat(e.target.value)||0})} /></div>
            <div className="group"><label>Alto (m):</label><input type="number" value={newOp.alto} onChange={(e) => setNewOp({...newOp, alto: parseFloat(e.target.value)||0})} /></div>
          </div>
          <button className="btn-add" onClick={addOpening}>+ Agregar Abertura</button>

          <ul className="opening-list">
            {openings.map((op) => (
              <li key={op.id}>
                <span>{op.tipo.toUpperCase()} ({op.pared}): {op.ancho}m x {op.alto}m</span>
                <button className="btn-del" onClick={() => removeOpening(op.id)}>✕</button>
              </li>
            ))}
          </ul>
        </div>

        {/* CATÁLOGO DE INSUMOS Y LARGOS COMERCIALES */}
        <div className="card">
          <h2>Insumos y Largos Comerciales</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Insumo</th>
                  <th>Largo Com. (m)</th>
                  <th>Precio U. ($)</th>
                </tr>
              </thead>
              <tbody>
                {catalog.map((item) => (
                  <tr key={item.id}>
                    <td className="item-name">{item.nombre}</td>
                    <td>
                      {item.largoBarra > 0 ? (
                        <input type="number" step="0.5" value={item.largoBarra} onChange={(e) => updateItemCatalog(item.id, 'largoBarra', parseFloat(e.target.value)||0)} />
                      ) : '-'}
                    </td>
                    <td>
                      <input type="number" value={item.precio} onChange={(e) => updateItemCatalog(item.id, 'precio', parseFloat(e.target.value)||0)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* CÓMPUTO Y CORTES 1D */}
        <div className="card">
          <h2>Optimizador de Cortes 1D</h2>
          <p className="opt-desc">Muros Brutos: <strong>{areaBrutaMuros.toFixed(2)}m²</strong> | Aberturas: <strong className="warn">-{areaTotalAberturas.toFixed(2)}m²</strong></p>
          <p className="opt-desc">Muros Netos a Cubrir: <strong>{areaNetaMuros.toFixed(2)}m²</strong></p>
          <p className="opt-desc">Barras Necesarias (Cols + Dinteles): <strong>{optCols.totalBars} u</strong> (Largo: {colItem ? colItem.largoBarra : 6}m) | Desperdicio: <strong className="warn">{optCols.wastePercent.toFixed(1)}%</strong></p>
          
          <details className="bar-details">
            <summary>🔍 Detalle de Despiece por Barra ({optCols.totalBars} barras)</summary>
            <div className="bar-cuts-container">
              {optCols.bars.map((b) => (
                <div key={b.id} className="bar-item">
                  <div className="bar-title">Barra #{b.id} - Utilizado: {b.used.toFixed(2)}m / {colItem ? colItem.largoBarra : 6}m</div>
                  <div className="bar-graphic">
                    {b.pieces.map((p, idx) => (
                      <div key={idx} className="piece-block" style={{ width: `${(p / (colItem ? colItem.largoBarra : 6)) * 100}%` }}>
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

      {/* ÁREA INFERIOR VISOR WebGL 3D */}
      <div className="layout-bottom">
        <LoftCanvas params={params} layers={layers} openings={openings} />
      </div>
    </div>
  );
}