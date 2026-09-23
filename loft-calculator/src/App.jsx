import React, { useState } from 'react';
import LoftCanvas from './LoftCanvas';
import './App.css';

export default function App() {
  const [params, setParams] = useState({
    frente: 7.50, profundidad: 4.50, altura: 4.50, elevacion: 0.50, anchoMezzanine: 3.00,
    perfilColumna: '100x100x1.6'
  });

  const [prices, setPrices] = useState({
    col: 38000, vig: 32000, cor: 24000, osb: 28000, pur: 35000, pil: 15000
  });

  const handleParam = (e) => setParams({ ...params, [e.target.name]: parseFloat(e.target.value) || e.target.value });
  const handlePrice = (e) => setPrices({ ...prices, [e.target.name]: parseFloat(e.target.value) || 0 });

  const mCol = Math.ceil((10 * params.altura) / 6);
  const mVig = Math.ceil(((params.frente * 4) + (params.profundidad * 5) + (params.anchoMezzanine * 2)) / 6);
  const mCor = Math.ceil((((params.frente / 0.4) * params.profundidad) + ((params.anchoMezzanine / 0.4) * params.profundidad)) / 6);
  const cOsb = Math.ceil(((params.frente * params.profundidad) + (params.anchoMezzanine * params.profundidad)) / 2.97);
  const mPur = Math.ceil(((params.frente + params.profundidad) * 2 * params.altura) + (params.frente * params.profundidad * 1.05));
  const cPil = 12;

  const items = [
    { name: 'Barras Columnas (6m)', cant: mCol, pKey: 'col' },
    { name: 'Barras Vigas Marco (6m)', cant: mVig, pKey: 'vig' },
    { name: 'Barras Perfil C Correas (6m)', cant: mCor, pKey: 'cor' },
    { name: 'Placas OSB (18mm)', cant: cOsb, pKey: 'osb' },
    { name: 'Paneles PUR (m²)', cant: mPur, pKey: 'pur' },
    { name: 'Pilotines Cemento', cant: cPil, pKey: 'pil' },
  ];

  const total = items.reduce((a, b) => a + (b.cant * prices[b.pKey]), 0);

  return (
    <div className="app">
      <header>
        <h1>micasa - Diseñador 3D & Cotizador Loft</h1>
      </header>
      <div className="layout">
        <div className="canvas-wrap">
          <LoftCanvas params={params} />
        </div>
        <aside className="sidebar">
          <div className="card">
            <h2>Medidas (m)</h2>
            <div className="group"><label>Frente:</label><input type="number" step="0.5" name="frente" value={params.frente} onChange={handleParam} /></div>
            <div className="group"><label>Profundidad:</label><input type="number" step="0.5" name="profundidad" value={params.profundidad} onChange={handleParam} /></div>
            <div className="group"><label>Altura:</label><input type="number" step="0.25" name="altura" value={params.altura} onChange={handleParam} /></div>
            <div className="group"><label>Mezzanine:</label><input type="number" step="0.5" name="anchoMezzanine" value={params.anchoMezzanine} onChange={handleParam} /></div>
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
                    <td className="sub">$ {(i.cant * prices[i.pKey]).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="total"><span>TOTAL:</span><span>$ {total.toLocaleString()}</span></div>
          </div>
        </aside>
      </div>
    </div>
  );
}