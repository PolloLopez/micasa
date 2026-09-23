import React, { useState } from 'react';
import LoftCanvas from './LoftCanvas';
import './App.css';

export default function App() {
  // Parámetros geométricos y estructurales
  const [params, setParams] = useState({
    frente: 7.50,
    profundidad: 4.50,
    altura: 4.50,
    elevacion: 0.50,
    anchoMezzanine: 3.00,
    distanciaColumnas: 2.50,    // Distancia máx entre columnas
    pasoTirantesPiso: 0.40,     // Separación tirantes de piso
    pasoTirantesAltillo: 0.40,  // Separación tirantes de altillo
    separacionCorreas: 0.80,    // Separación fajas de pared
    filasPilotines: 4,
    pilotinesPorFila: 3,
    largoBarra: 6.0,            // Largo comercial de barra en metros
    tipoColumna: 'caño-100x100x1.6',
    tipoViga: 'caño-100x50x2.0',
    tipoCorrea: 'perfilC-100x45x2.0'
  });

  // Capas de visibilidad 3D
  const [layers, setLayers] = useState({
    pilotines: true,
    columnas: true,
    estructuras: true,
    fajas: true,
    osb: true,
    pur: true
  });

  // Precios unitarios
  const [prices, setPrices] = useState({
    col: 38000,
    vig: 32000,
    cor: 24000,
    osb: 28000,
    pur: 35000,
    pil: 15000,
    manoObraM2: 12000,
    consumibles: 85000,  // Electrodos, discos, gas
    pintura: 45000,      // Antióxido / Convertidor
    flete: 50000
  });

  const handleParam = (e) => {
    const val = e.target.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value;
    setParams({ ...params, [e.target.name]: val });
  };

  const handlePrice = (e) => setPrices({ ...prices, [e.target.name]: parseFloat(e.target.value) || 0 });
  const toggleLayer = (layerKey) => setLayers({ ...layers, [layerKey]: !layers[layerKey] });

  // --- CÁLCULOS DINÁMICOS DE MATERIALES ---
  const numColsLargo = Math.max(2, Math.ceil(params.frente / params.distanciaColumnas) + 1);
  const numColsAncho = Math.max(2, Math.ceil(params.profundidad / params.distanciaColumnas) + 1);
  const totalCols = (numColsLargo * 2) + ((numColsAncho - 2) * 3);
  
  const mCol = Math.ceil((totalCols * params.altura) / params.largoBarra);

  // Vigas + Tirantes
  const tirantesPiso = Math.ceil(params.frente / params.pasoTirantesPiso) * params.profundidad;
  const tirantesAltillo = Math.ceil(params.anchoMezzanine / params.pasoTirantesAltillo) * params.profundidad;
  const mVig = Math.ceil((tirantesPiso + tirantesAltillo + (params.frente * 4) + (params.profundidad * 4)) / params.largoBarra);

  // Fajas
  const cantFajas = Math.floor(params.altura / params.separacionCorreas);
  const mlFajas = cantFajas * (params.frente + params.profundidad) * 2;
  const mCor = Math.ceil(mlFajas / params.largoBarra);

  // Superficies
  const areaPisoTotal = (params.frente * params.profundidad) + (params.anchoMezzanine * params.profundidad);
  const cOsb = Math.ceil(areaPisoTotal / 2.97);
  const mPur = Math.ceil(((params.frente + params.profundidad) * 2 * params.altura) + (params.frente * params.profundidad * 1.05));
  const totalPilotines = params.filasPilotines * params.pilotinesPorFila;

  // Presupuesto
  const itemsMateriales = [
    { name: `Barras Columnas (${params.tipoColumna})`, cant: mCol, pKey: 'col', unit: 'Barras' },
    { name: `Barras Vigas y Tirantes (${params.tipoViga})`, cant: mVig, pKey: 'vig', unit: 'Barras' },
    { name: `Barras Fajas/Correas (${params.tipoCorrea})`, cant: mCor, pKey: 'cor', unit: 'Barras' },
    { name: 'Placas OSB (18mm)', cant: cOsb, pKey: 'osb', unit: 'Placas' },
    { name: 'Paneles PUR (Muros + Techo)', cant: mPur, pKey: 'pur', unit: 'm²' },
    { name: 'Pilotines de Cemento', cant: totalPilotines, pKey: 'pil', unit: 'U' },
  ];

  const itemsAdicionales = [
    { name: 'Mano de Obra Armado', cant: Math.ceil(areaPisoTotal), pKey: 'manoObraM2', unit: 'm²' },
    { name: 'Consumibles (Electrodos/Discos/Gas)', cant: 1, pKey: 'consumibles', unit: 'Global' },
    { name: 'Pintura Antióxido / Convertidor', cant: 1, pKey: 'pintura', unit: 'Global' },
    { name: 'Flete y Logística de Obra', cant: 1, pKey: 'flete', unit: 'Global' },
  ];

  const subtotalMat = itemsMateriales.reduce((a, b) => a + (b.cant * prices[b.pKey]), 0);
  const subtotalAdi = itemsAdicionales.reduce((a, b) => a + (b.cant * prices[b.pKey]), 0);
  const totalGeneral = subtotalMat + subtotalAdi;

  return (
    <div className="app">
      <header>
        <h1>micasa - Diseñador 3D & Cotizador Loft Paramétrico</h1>
      </header>
      <div className="layout">
        <div className="canvas-wrap">
          <LoftCanvas params={params} layers={layers} />
        </div>
        <aside className="sidebar">
          
          {/* CONTROL DE CAPAS 3D */}
          <div className="card">
            <h2>Visibilidad de Capas 3D</h2>
            <div className="layers-grid">
              <label className="checkbox"><input type="checkbox" checked={layers.pilotines} onChange={() => toggleLayer('pilotines')} /> Pilotines</label>
              <label className="checkbox"><input type="checkbox" checked={layers.columnas} onChange={() => toggleLayer('columnas')} /> Columnas</label>
              <label className="checkbox"><input type="checkbox" checked={layers.estructuras} onChange={() => toggleLayer('estructuras')} /> Pisos/Altillo</label>
              <label className="checkbox"><input type="checkbox" checked={layers.fajas} onChange={() => toggleLayer('fajas')} /> Fajas/Correas</label>
              <label className="checkbox"><input type="checkbox" checked={layers.osb} onChange={() => toggleLayer('osb')} /> Placas OSB</label>
              <label className="checkbox"><input type="checkbox" checked={layers.pur} onChange={() => toggleLayer('pur')} /> Paneles PUR</label>
            </div>
          </div>

          {/* MEDIDAS Y PASOS */}
          <div className="card">
            <h2>Medidas y Separaciones (m)</h2>
            <div className="group"><label>Frente x Profundidad:</label><span>{params.frente}m × {params.profundidad}m</span></div>
            <div className="group"><label>Paso Máx. Columnas:</label><input type="number" step="0.25" name="distanciaColumnas" value={params.distanciaColumnas} onChange={handleParam} /></div>
            <div className="group"><label>Paso Tirantes Piso:</label><input type="number" step="0.05" name="pasoTirantesPiso" value={params.pasoTirantesPiso} onChange={handleParam} /></div>
            <div className="group"><label>Paso Tirantes Altillo:</label><input type="number" step="0.05" name="pasoTirantesAltillo" value={params.pasoTirantesAltillo} onChange={handleParam} /></div>
            <div className="group"><label>Paso Fajas Pared:</label><input type="number" step="0.10" name="separacionCorreas" value={params.separacionCorreas} onChange={handleParam} /></div>
            <div className="group"><label>Largo Comercial Barra:</label><input type="number" step="1" name="largoBarra" value={params.largoBarra} onChange={handleParam} /></div>
          </div>

          {/* PRESUPUESTO COMPLETO */}
          <div className="card">
            <h2>Presupuesto Materiales ($ ARS)</h2>
            <table>
              <thead><tr><th>Item</th><th>Cant</th><th>Precio U.</th><th>Subtotal</th></tr></thead>
              <tbody>
                {itemsMateriales.map((i, idx) => (
                  <tr key={idx}>
                    <td>{i.name}</td>
                    <td>{i.cant} {i.unit}</td>
                    <td><input type="number" name={i.pKey} value={prices[i.pKey]} onChange={handlePrice} /></td>
                    <td className="sub">$ {(i.cant * prices[i.pKey]).toLocaleString('es-AR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card">
            <h2>Mano de Obra y Costos Adicionales</h2>
            <table>
              <thead><tr><th>Concepto</th><th>Cant</th><th>Precio U.</th><th>Subtotal</th></tr></thead>
              <tbody>
                {itemsAdicionales.map((i, idx) => (
                  <tr key={idx}>
                    <td>{i.name}</td>
                    <td>{i.cant} {i.unit}</td>
                    <td><input type="number" name={i.pKey} value={prices[i.pKey]} onChange={handlePrice} /></td>
                    <td className="sub">$ {(i.cant * prices[i.pKey]).toLocaleString('es-AR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="total"><span>COSTO TOTAL ESTIMADO:</span><span>$ {totalGeneral.toLocaleString('es-AR')}</span></div>
          </div>

        </aside>
      </div>
    </div>
  );
}