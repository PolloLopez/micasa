import React, { useState } from 'react';
import LoftCanvas from './LoftCanvas';
import './App.css';

export default function App() {
  const [params, setParams] = useState({
    frente: 7.50, 
    profundidad: 4.50, 
    altura: 4.50, 
    elevacion: 0.50, 
    anchoMezzanine: 3.00,
    filasPilotines: 4,
    pilotinesPorFila: 3,
    separacionCorreas: 0.80,
    tipoColumna: 'caño-100x100x1.6',
    tipoViga: 'caño-100x50x2.0',
    tipoCorrea: 'perfilC-100x45x2.0'
  });

  const [prices, setPrices] = useState({
    col: 38000, 
    vig: 32000, 
    cor: 24000, 
    osb: 28000, 
    pur: 35000, 
    pil: 15000
  });

  // Aberturas con posicionamiento completo
  const [openings, setOpenings] = useState([
    { id: 1, nombre: 'Puerta Principal', tipo: 'puerta', pared: 'frente', ladoReferencia: 'izquierda', offsetHorizontal: 1.00, alturaAntepecho: 0.00, ancho: 0.90, alto: 2.05 },
    { id: 2, nombre: 'Ventana Frente', tipo: 'ventana', pared: 'frente', ladoReferencia: 'derecha', offsetHorizontal: 1.50, alturaAntepecho: 1.10, ancho: 1.50, alto: 0.60 }
  ]);

  const [newOp, setNewOp] = useState({
    nombre: 'Nueva Abertura', tipo: 'ventana', pared: 'frente', ladoReferencia: 'izquierda', offsetHorizontal: 1.00, alturaAntepecho: 1.00, ancho: 1.20, alto: 1.00
  });

  const handleParam = (e) => {
    const val = e.target.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value;
    setParams({ ...params, [e.target.name]: val });
  };

  const handlePrice = (e) => setPrices({ ...prices, [e.target.name]: parseFloat(e.target.value) || 0 });

  const addOpening = () => setOpenings([...openings, { ...newOp, id: Date.now() }]);
  const removeOpening = (id) => setOpenings(openings.filter(op => op.id !== id));

  // --- CÁLCULOS DINÁMICOS ---
  const totalPilotines = params.filasPilotines * params.pilotinesPorFila;
  
  const mCol = Math.ceil((10 * params.altura) / 6);
  const mVig = Math.ceil(((params.frente * 4) + (params.profundidad * 5) + (params.anchoMezzanine * 2)) / 6);

  const cantFajas = Math.floor(params.altura / params.separacionCorreas);
  const mlFajasParedes = cantFajas * (params.frente + params.profundidad) * 2;
  const mlCorreasPiso = ((params.frente / 0.40) * params.profundidad) + ((params.anchoMezzanine / 0.40) * params.profundidad);
  const mCor = Math.ceil((mlFajasParedes + mlCorreasPiso) / 6);

  const cOsb = Math.ceil(((params.frente * params.profundidad) + (params.anchoMezzanine * params.profundidad)) / 2.97);

  // Descuento exacto de aberturas en m² de Paneles PUR
  const areaBrutaMuros = ((params.frente + params.profundidad) * 2 * params.altura) + (params.frente * params.profundidad * 1.05);
  const areaTotalAberturas = openings.reduce((acc, op) => acc + (op.ancho * op.alto), 0);
  const mPur = Math.max(0, Math.ceil(areaBrutaMuros - areaTotalAberturas));

  const items = [
    { name: `Barras Columnas (${params.tipoColumna})`, cant: mCol, pKey: 'col' },
    { name: `Barras Vigas (${params.tipoViga})`, cant: mVig, pKey: 'vig' },
    { name: `Barras Fajas/Correas (${params.tipoCorrea})`, cant: mCor, pKey: 'cor' },
    { name: 'Placas OSB (18mm)', cant: cOsb, pKey: 'osb' },
    { name: `Paneles PUR netos (m² - Aberturas descontadas: -${areaTotalAberturas.toFixed(2)}m²)`, cant: mPur, pKey: 'pur' },
    { name: 'Pilotines de Cemento', cant: totalPilotines, pKey: 'pil' },
  ];

  const total = items.reduce((a, b) => a + (b.cant * prices[b.pKey]), 0);

  return (
    <div className="app">
      <header>
        <h1>micasa - Diseñador 3D & Cotizador Loft</h1>
      </header>
      <div className="layout">
        <div className="canvas-wrap">
          <LoftCanvas params={params} openings={openings} />
        </div>
        <aside className="sidebar">
          <div className="card">
            <h2>Medidas Estructurales (m)</h2>
            <div className="group"><label>Frente:</label><input type="number" step="0.5" name="frente" value={params.frente} onChange={handleParam} /></div>
            <div className="group"><label>Profundidad:</label><input type="number" step="0.5" name="profundidad" value={params.profundidad} onChange={handleParam} /></div>
            <div className="group"><label>Altura Total:</label><input type="number" step="0.25" name="altura" value={params.altura} onChange={handleParam} /></div>
            <div className="group"><label>Mezzanine:</label><input type="number" step="0.5" name="anchoMezzanine" value={params.anchoMezzanine} onChange={handleParam} /></div>
          </div>

          <div className="card">
            <h2>Configuración de Perfiles y Estructura</h2>
            <div className="group">
              <label>Perfil Columnas:</label>
              <select name="tipoColumna" value={params.tipoColumna} onChange={handleParam}>
                <option value="caño-100x100x1.6">Caño 100x100x1.6 mm</option>
                <option value="caño-80x80x2.0">Caño 80x80x2.0 mm</option>
                <option value="perfilC-120x50x2.0">Perfil C 120x50 (Cajón)</option>
              </select>
            </div>
            <div className="group">
              <label>Perfil Vigas:</label>
              <select name="tipoViga" value={params.tipoViga} onChange={handleParam}>
                <option value="caño-100x50x2.0">Caño 100x50x2.0 mm</option>
                <option value="caño-120x60x2.0">Caño 120x60x2.0 mm</option>
                <option value="perfilC-140x50x2.0">Perfil C 140x50</option>
              </select>
            </div>
            <div className="group">
              <label>Perfil Fajas/Correas:</label>
              <select name="tipoCorrea" value={params.tipoCorrea} onChange={handleParam}>
                <option value="perfilC-100x45x2.0">Perfil C 100x45x2.0 mm</option>
                <option value="perfilC-80x40x1.6">Perfil C 80x40x1.6 mm</option>
                <option value="caño-60x40x1.6">Caño 60x40x1.6 mm</option>
              </select>
            </div>
            <div className="group"><label>Sep. Fajas/Pared (m):</label><input type="number" step="0.10" name="separacionCorreas" value={params.separacionCorreas} onChange={handleParam} /></div>
          </div>

          {/* GESTIÓN Y POSICIONAMIENTO DE ABERTURAS */}
          <div className="card">
            <h2>Aberturas en Muros</h2>
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
            <div className="group"><label>Lado Origen:</label>
              <select value={newOp.ladoReferencia} onChange={(e) => setNewOp({...newOp, ladoReferencia: e.target.value})}>
                <option value="izquierda">Desde Izquierda</option>
                <option value="derecha">Desde Derecha</option>
              </select>
            </div>
            <div className="group"><label>Dist. a Esquina (m):</label><input type="number" step="0.1" value={newOp.offsetHorizontal} onChange={(e) => setNewOp({...newOp, offsetHorizontal: parseFloat(e.target.value)||0})} /></div>
            <div className="group"><label>Antepecho / Altura (m):</label><input type="number" step="0.1" value={newOp.alturaAntepecho} onChange={(e) => setNewOp({...newOp, alturaAntepecho: parseFloat(e.target.value)||0})} /></div>
            <div className="group"><label>Ancho (m):</label><input type="number" step="0.1" value={newOp.ancho} onChange={(e) => setNewOp({...newOp, ancho: parseFloat(e.target.value)||0})} /></div>
            <div className="group"><label>Alto (m):</label><input type="number" step="0.1" value={newOp.alto} onChange={(e) => setNewOp({...newOp, alto: parseFloat(e.target.value)||0})} /></div>
            
            <button className="btn-add" onClick={addOpening}>+ Agregar Abertura</button>

            <ul className="opening-list">
              {openings.map((op) => (
                <li key={op.id}>
                  <span>{op.tipo.toUpperCase()} ({op.pared}): {op.ancho}x{op.alto}m (Esc: {op.offsetHorizontal}m, Alt: {op.alturaAntepecho}m)</span>
                  <button className="btn-del" onClick={() => removeOpening(op.id)}>✕</button>
                </li>
              ))}
            </ul>
          </div>

          <div className="card">
            <h2>Fundación / Pilotines</h2>
            <div className="group"><label>Filas (Frente):</label><input type="number" min="2" name="filasPilotines" value={params.filasPilotines} onChange={handleParam} /></div>
            <div className="group"><label>Pilotines / Fila:</label><input type="number" min="2" name="pilotinesPorFila" value={params.pilotinesPorFila} onChange={handleParam} /></div>
            <div className="group"><label>Total Pilotines:</label><strong>{totalPilotines} unidades</strong></div>
          </div>

          <div className="card">
            <h2>Presupuesto ($ ARS)</h2>
            <table>
              <thead><tr><th>Item</th><th>Cant</th><th>Precio U.</th><th>Subtotal</th></tr></thead>
              <tbody>
                {items.map((i, idx) => (
                  <tr key={idx}>
                    <td>{i.name}</td>
                    <td>{i.cant}</td>
                    <td><input type="number" name={i.pKey} value={prices[i.pKey]} onChange={handlePrice} /></td>
                    <td className="sub">$ {(i.cant * prices[i.pKey]).toLocaleString('es-AR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="total"><span>TOTAL:</span><span>$ {total.toLocaleString('es-AR')}</span></div>
          </div>
        </aside>
      </div>
    </div>
  );
}