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
    pilotinesPorFila: 3
  });

  // Catálogo completo de insumos con alta de productos personalizados
  const [catalog, setCatalog] = useState([
    { id: '1', nombre: 'Caño Estructural 100x100x1.6', categoria: 'perfil', unidad: 'Barra', largoBarra: 6.0, precio: 38000 },
    { id: '2', nombre: 'Perfil C 120x50x2.0', categoria: 'perfil', unidad: 'Barra', largoBarra: 6.0, precio: 35000 },
    { id: '3', nombre: 'Perfil C 100x45x2.0 Transversal', categoria: 'perfil', unidad: 'Barra', largoBarra: 6.0, precio: 26000 },
    { id: '4', nombre: 'Perfil C 80x40x1.6 Correa', categoria: 'perfil', unidad: 'Barra', largoBarra: 6.0, precio: 22000 },
    { id: '5', nombre: 'Placa OSB 18mm (2.44x1.22)', categoria: 'placa', unidad: 'Placa', largoBarra: 2.44, precio: 28000 },
    { id: '6', nombre: 'Panel PUR Isopanel 50mm', categoria: 'panel', unidad: 'm²', largoBarra: 6.00, precio: 35000 },
    { id: '7', nombre: 'Pilotín de Cemento', categoria: 'unidad', unidad: 'U', largoBarra: 0, precio: 15000 }
  ]);

  const [newProduct, setNewProduct] = useState({
    nombre: '', categoria: 'perfil', unidad: 'Barra', largoBarra: 6.0, precio: 0
  });

  // Aberturas Múltiples con Posicionamiento Exacto
  const [openings, setOpenings] = useState([
    { id: 1, nombre: 'Puerta Principal', tipo: 'puerta', pared: 'frente', ancho: 0.90, alto: 2.05, antepecho: 0, offset: 0 },
    { id: 2, nombre: 'Ventana Frente', tipo: 'ventana', pared: 'frente', ancho: 1.50, alto: 0.60, antepecho: 1.10, offset: 2.0 }
  ]);

  const [newOp, setNewOp] = useState({
    nombre: 'Abertura Custom', tipo: 'ventana', pared: 'frente', ancho: 1.20, alto: 1.00, antepecho: 1.00, offset: 0
  });

  const [layers, setLayers] = useState({
    pilotines: true, columnas: true, estructuras: true, fajas: true, osb: true, pur: true
  });

  // Conversión de Unidades
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

  const addProductToCatalog = () => {
    if (!newProduct.nombre) return;
    setCatalog([...catalog, { ...newProduct, id: Date.now().toString() }]);
    setNewProduct({ nombre: '', categoria: 'perfil', unidad: 'Barra', largoBarra: 6.0, precio: 0 });
  };

  const updateProduct = (id, field, value) => {
    setCatalog(catalog.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const addOpening = () => {
    setOpenings([...openings, { ...newOp, id: Date.now() }]);
  };

  const removeOpening = (id) => {
    setOpenings(openings.filter(op => op.id !== id));
  };

  // Algoritmo 1D Nesting
  const optimize1D = (piecesList, barLength) => {
    if (!piecesList || piecesList.length === 0 || barLength <= 0) {
      return { bars: [], totalBars: 0, totalNetMetrage: 0, wasteMeters: 0, wastePercent: 0 };
    }
    const kerf = 0.003;
    let sorted = [...piecesList].sort((a, b) => b - a);
    let bars = [];

    sorted.forEach(piece => {
      let placed = false;
      for (let b of bars) {
        const needed = piece + (b.pieces.length > 0 ? kerf : 0);
        if (b.used + needed <= barLength) {
          b.pieces.push(piece);
          b.used += needed;
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

  // Cómputos
  const numColsLargo = Math.max(2, Math.ceil(params.frente / params.distanciaColumnas) + 1);
  const numColsAncho = Math.max(2, Math.ceil(params.profundidad / params.distanciaColumnas) + 1);
  const totalCols = (numColsLargo * 2) + ((numColsAncho - 2) * 3);
  let piecesCols = Array(totalCols).fill(params.altura);

  openings.forEach(op => {
    if (op.ancho > 0) piecesCols.push(op.ancho);
  });

  const mainColProduct = catalog.find(p => p.id === '1') || { largoBarra: 6.0 };
  const optCols = optimize1D(piecesCols, mainColProduct.largoBarra);

  const areaBrutaMuros = (params.frente + params.profundidad) * 2 * params.altura;
  const areaTotalAberturas = openings.reduce((acc, op) => acc + (op.ancho * op.alto), 0);
  const areaNetaMuros = Math.max(0, areaBrutaMuros - areaTotalAberturas);

  return (
    <div className="app">
      <header>
        <h1>Diseñador & Cotizador</h1>
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

      {/* SIDEBAR SUPERIOR - INGRESO DE DATOS */}
      <div className="top-sidebar">
        
        {/* MEDIDAS DE ESTRUCTURA */}
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

        {/* MODULACIÓN DE ABERTURAS POR PARED */}
        <div className="card">
          <h2>Aberturas y Ubicación en Muros</h2>
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
            <div className="group"><label>Desplazamiento Offset (m):</label><input type="number" value={newOp.offset} onChange={(e) => setNewOp({...newOp, offset: parseFloat(e.target.value)||0})} /></div>
          </div>
          <button className="btn-add" onClick={addOpening}>+ Agregar Abertura</button>

          <ul className="opening-list">
            {openings.map((op) => (
              <li key={op.id}>
                <span>{op.tipo.toUpperCase()} ({op.pared}) {op.ancho}m x {op.alto}m</span>
                <button className="btn-del" onClick={() => removeOpening(op.id)}>✕</button>
              </li>
            ))}
          </ul>
        </div>

        {/* CATÁLOGO DE INSUMOS Y ALTA DE PRODUCTOS */}
        <div className="card">
          <h2>Insumos y Largos Comerciales</h2>
          <div className="add-prod-box">
            <input type="text" placeholder="Nuevo Producto / Perfil" value={newProduct.nombre} onChange={(e) => setNewProduct({...newProduct, nombre: e.target.value})} />
            <input type="number" placeholder="Largo Com. (m)" value={newProduct.largoBarra} onChange={(e) => setNewProduct({...newProduct, largoBarra: parseFloat(e.target.value)||0})} />
            <input type="number" placeholder="Precio ($)" value={newProduct.precio} onChange={(e) => setNewProduct({...newProduct, precio: parseFloat(e.target.value)||0})} />
            <button onClick={addProductToCatalog}>+ Crear Insumo</button>
          </div>

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
                {catalog.map((prod) => (
                  <tr key={prod.id}>
                    <td className="item-name">{prod.nombre}</td>
                    <td>
                      <input type="number" step="0.5" value={prod.largoBarra} onChange={(e) => updateProduct(prod.id, 'largoBarra', parseFloat(e.target.value)||0)} />
                    </td>
                    <td>
                      <input type="number" value={prod.precio} onChange={(e) => updateProduct(prod.id, 'precio', parseFloat(e.target.value)||0)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* DESPIECE Y OPTIMIZACIÓN 1D */}
        <div className="card">
          <h2>Optimizador de Cortes 1D</h2>
          <p className="opt-desc">Muros Brutos: <strong>{areaBrutaMuros.toFixed(2)}m²</strong> | Aberturas: <strong className="warn">-{areaTotalAberturas.toFixed(2)}m²</strong></p>
          <p className="opt-desc">Muros Netos a Cubrir: <strong>{areaNetaMuros.toFixed(2)}m²</strong></p>
          <p className="opt-desc">Barras Necesarias: <strong>{optCols.totalBars} u</strong> (Largo: {mainColProduct.largoBarra}m) | Desperdicio: <strong className="warn">{optCols.wastePercent.toFixed(1)}%</strong></p>
          
          <details className="bar-details">
            <summary>🔍 Ver Despiece por Barra ({optCols.totalBars} barras)</summary>
            <div className="bar-cuts-container">
              {optCols.bars.map((b) => (
                <div key={b.id} className="bar-item">
                  <div className="bar-title">Barra #{b.id} - Utilizado: {b.used.toFixed(2)}m / {mainColProduct.largoBarra}m</div>
                  <div className="bar-graphic">
                    {b.pieces.map((p, idx) => (
                      <div key={idx} className="piece-block" style={{ width: `${(p / mainColProduct.largoBarra) * 100}%` }}>
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