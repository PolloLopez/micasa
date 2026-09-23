import React, { useState } from 'react';
import LoftCanvas from './LoftCanvas';
import './App.css';

export default function App() {
  // Parámetros geométricos principales
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
    largoBarra: 6.0,            // Largo comercial estándar de barra (m)
  });

  // Especificaciones editables de materiales
  const [matSpecs, setMatSpecs] = useState({
    columna: { tipo: 'Caño Estructural', medida: '100x100', espesor: '1.6' },
    viga: { tipo: 'Caño Estructural', medida: '100x50', espesor: '2.0' },
    correa: { tipo: 'Perfil C', medida: '100x45', espesor: '2.0' },
    osb: { largo: 2.44, ancho: 1.22, espesor: '18' },
    pur: { anchoUtil: 1.00, espesor: '50' }
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
    consumibles: 85000,
    pintura: 45000,
    flete: 50000
  });

  const handleParam = (e) => {
    const val = e.target.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value;
    setParams({ ...params, [e.target.name]: val });
  };

  const handleSpec = (cat, field, val) => {
    setMatSpecs({
      ...matSpecs,
      [cat]: {
        ...matSpecs[cat],
        [field]: field === 'largo' || field === 'ancho' || field === 'anchoUtil' ? (parseFloat(val) || 0) : val
      }
    });
  };

  const handlePrice = (e) => setPrices({ ...prices, [e.target.name]: parseFloat(e.target.value) || 0 });
  const toggleLayer = (layerKey) => setLayers({ ...layers, [layerKey]: !layers[layerKey] });

  // --- CÁLCULOS DINÁMICOS Y CÓMPUTO MÉTRICO ---
  const numColsLargo = Math.max(2, Math.ceil(params.frente / params.distanciaColumnas) + 1);
  const numColsAncho = Math.max(2, Math.ceil(params.profundidad / params.distanciaColumnas) + 1);
  const totalCols = (numColsLargo * 2) + ((numColsAncho - 2) * 3);
  
  const mlColsTotales = totalCols * params.altura;
  const mColBars = Math.ceil(mlColsTotales / (params.largoBarra || 6));
  const desperdicioCols = (mColBars * params.largoBarra) - mlColsTotales;

  // Vigas + Tirantes
  const tirantesPiso = Math.ceil(params.frente / params.pasoTirantesPiso) * params.profundidad;
  const tirantesAltillo = Math.ceil(params.anchoMezzanine / params.pasoTirantesAltillo) * params.profundidad;
  const mlVigasTotales = tirantesPiso + tirantesAltillo + (params.frente * 4) + (params.profundidad * 4);
  const mVigBars = Math.ceil(mlVigasTotales / (params.largoBarra || 6));
  const desperdicioVigas = (mVigBars * params.largoBarra) - mlVigasTotales;

  // Fajas / Correas
  const cantFajas = Math.floor(params.altura / params.separacionCorreas);
  const mlFajasTotales = cantFajas * (params.frente + params.profundidad) * 2;
  const mCorBars = Math.ceil(mlFajasTotales / (params.largoBarra || 6));
  const desperdicioCorreas = (mCorBars * params.largoBarra) - mlFajasTotales;

  // Placas OSB
  const areaPlaca = (matSpecs.osb.largo || 2.44) * (matSpecs.osb.ancho || 1.22);
  const areaPisoTotal = (params.frente * params.profundidad) + (params.anchoMezzanine * params.profundidad);
  const cOsb = Math.ceil(areaPisoTotal / (areaPlaca || 2.97));

  // Paneles PUR
  const mPur = Math.ceil(((params.frente + params.profundidad) * 2 * params.altura) + (params.frente * params.profundidad * 1.05));
  const totalPilotines = params.filasPilotines * params.pilotinesPorFila;

  // Detalle de ítems editados para el presupuesto
  const itemsMateriales = [
    { 
      name: `Columnas: ${matSpecs.columna.tipo} ${matSpecs.columna.medida} x ${matSpecs.columna.espesor}mm`, 
      cant: mColBars, pKey: 'col', unit: `Barras (${params.largoBarra}m)`, extra: `Ml util: ${mlColsTotales.toFixed(1)}m | Sobrante: ${desperdicioCols.toFixed(1)}m` 
    },
    { 
      name: `Vigas/Tirantes: ${matSpecs.viga.tipo} ${matSpecs.viga.medida} x ${matSpecs.viga.espesor}mm`, 
      cant: mVigBars, pKey: 'vig', unit: `Barras (${params.largoBarra}m)`, extra: `Ml util: ${mlVigasTotales.toFixed(1)}m | Sobrante: ${desperdicioVigas.toFixed(1)}m` 
    },
    { 
      name: `Fajas/Correas: ${matSpecs.correa.tipo} ${matSpecs.correa.medida} x ${matSpecs.correa.espesor}mm`, 
      cant: mCorBars, pKey: 'cor', unit: `Barras (${params.largoBarra}m)`, extra: `Ml util: ${mlFajasTotales.toFixed(1)}m | Sobrante: ${desperdicioCorreas.toFixed(1)}m` 
    },
    { 
      name: `Placas OSB (${matSpecs.osb.largo}m x ${matSpecs.osb.ancho}m x ${matSpecs.osb.espesor}mm)`, 
      cant: cOsb, pKey: 'osb', unit: 'Placas', extra: `Superficie cubrir: ${areaPisoTotal.toFixed(1)} m²` 
    },
    { 
      name: `Paneles PUR (${matSpecs.pur.espesor}mm - Ancho útil: ${matSpecs.pur.anchoUtil}m)`, 
      cant: mPur, pKey: 'pur', unit: 'm²', extra: `Cubierta + Muros` 
    },
    { 
      name: `Pilotines de Cemento`, 
      cant: totalPilotines, pKey: 'pil', unit: 'U', extra: `${params.filasPilotines} filas x ${params.pilotinesPorFila} por fila` 
    },
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

          {/* MEDIDAS Y DISTANCIAS PRINCIPALES */}
          <div className="card">
            <h2>Dimensiones Generales (m)</h2>
            <div className="group"><label>Frente (m):</label><input type="number" step="0.5" name="frente" value={params.frente} onChange={handleParam} /></div>
            <div className="group"><label>Profundidad (m):</label><input type="number" step="0.5" name="profundidad" value={params.profundidad} onChange={handleParam} /></div>
            <div className="group"><label>Altura Estructura (m):</label><input type="number" step="0.25" name="altura" value={params.altura} onChange={handleParam} /></div>
            <div className="group"><label>Elevación / Pilotines (m):</label><input type="number" step="0.1" name="elevacion" value={params.elevacion} onChange={handleParam} /></div>
            <div className="group"><label>Ancho Altillo (m):</label><input type="number" step="0.25" name="anchoMezzanine" value={params.anchoMezzanine} onChange={handleParam} /></div>
          </div>

          {/* MODULACIÓN Y PASOS ESTRUCTURALES */}
          <div className="card">
            <h2>Pasos y Separaciones (m)</h2>
            <div className="group"><label>Paso Máx. Columnas:</label><input type="number" step="0.25" name="distanciaColumnas" value={params.distanciaColumnas} onChange={handleParam} /></div>
            <div className="group"><label>Paso Tirantes Piso:</label><input type="number" step="0.05" name="pasoTirantesPiso" value={params.pasoTirantesPiso} onChange={handleParam} /></div>
            <div className="group"><label>Paso Tirantes Altillo:</label><input type="number" step="0.05" name="pasoTirantesAltillo" value={params.pasoTirantesAltillo} onChange={handleParam} /></div>
            <div className="group"><label>Paso Fajas Pared:</label><input type="number" step="0.10" name="separacionCorreas" value={params.separacionCorreas} onChange={handleParam} /></div>
            <div className="group"><label>Filas Pilotines:</label><input type="number" step="1" name="filasPilotines" value={params.filasPilotines} onChange={handleParam} /></div>
            <div className="group"><label>Pilotines x Fila:</label><input type="number" step="1" name="pilotinesPorFila" value={params.pilotinesPorFila} onChange={handleParam} /></div>
            <div className="group"><label>Largo Comercial Barra (m):</label><input type="number" step="1" name="largoBarra" value={params.largoBarra} onChange={handleParam} /></div>
          </div>

          {/* CONFIGURADOR DETALLADO DE MATERIALES */}
          <div className="card">
            <h2>Configuración de Perfiles y Materiales</h2>
            
            {/* Columnas */}
            <div className="subcard">
              <h3>Columnas</h3>
              <div className="group"><label>Tipo:</label>
                <select value={matSpecs.columna.tipo} onChange={(e) => handleSpec('columna', 'tipo', e.target.value)}>
                  <option value="Caño Estructural">Caño Estructural</option>
                  <option value="Perfil C">Perfil C</option>
                  <option value="Hierro Macizo">Hierro Macizo</option>
                  <option value="Perfil IPN/UPN">Perfil IPN/UPN</option>
                </select>
              </div>
              <div className="group"><label>Medida (mm):</label><input type="text" value={matSpecs.columna.medida} onChange={(e) => handleSpec('columna', 'medida', e.target.value)} /></div>
              <div className="group"><label>Espesor (mm):</label><input type="text" value={matSpecs.columna.espesor} onChange={(e) => handleSpec('columna', 'espesor', e.target.value)} /></div>
            </div>

            {/* Vigas */}
            <div className="subcard">
              <h3>Vigas / Tirantes</h3>
              <div className="group"><label>Tipo:</label>
                <select value={matSpecs.viga.tipo} onChange={(e) => handleSpec('viga', 'tipo', e.target.value)}>
                  <option value="Caño Estructural">Caño Estructural</option>
                  <option value="Perfil C">Perfil C</option>
                  <option value="Perfil IPN/UPN">Perfil IPN/UPN</option>
                </select>
              </div>
              <div className="group"><label>Medida (mm):</label><input type="text" value={matSpecs.viga.medida} onChange={(e) => handleSpec('viga', 'medida', e.target.value)} /></div>
              <div className="group"><label>Espesor (mm):</label><input type="text" value={matSpecs.viga.espesor} onChange={(e) => handleSpec('viga', 'espesor', e.target.value)} /></div>
            </div>

            {/* Correas */}
            <div className="subcard">
              <h3>Fajas / Correas</h3>
              <div className="group"><label>Tipo:</label>
                <select value={matSpecs.correa.tipo} onChange={(e) => handleSpec('correa', 'tipo', e.target.value)}>
                  <option value="Perfil C">Perfil C</option>
                  <option value="Caño Estructural">Caño Estructural</option>
                  <option value="Omegaprofil">Omegaprofil</option>
                </select>
              </div>
              <div className="group"><label>Medida (mm):</label><input type="text" value={matSpecs.correa.medida} onChange={(e) => handleSpec('correa', 'medida', e.target.value)} /></div>
              <div className="group"><label>Espesor (mm):</label><input type="text" value={matSpecs.correa.espesor} onChange={(e) => handleSpec('correa', 'espesor', e.target.value)} /></div>
            </div>

            {/* Placas OSB */}
            <div className="subcard">
              <h3>Placas OSB / Entrecapa</h3>
              <div className="group"><label>Largo Placa (m):</label><input type="number" step="0.01" value={matSpecs.osb.largo} onChange={(e) => handleSpec('osb', 'largo', e.target.value)} /></div>
              <div className="group"><label>Ancho Placa (m):</label><input type="number" step="0.01" value={matSpecs.osb.ancho} onChange={(e) => handleSpec('osb', 'ancho', e.target.value)} /></div>
              <div className="group"><label>Espesor (mm):</label><input type="text" value={matSpecs.osb.espesor} onChange={(e) => handleSpec('osb', 'espesor', e.target.value)} /></div>
            </div>

            {/* Revestimiento PUR */}
            <div className="subcard">
              <h3>Paneles PUR / Isopanel</h3>
              <div className="group"><label>Ancho Útil (m):</label><input type="number" step="0.05" value={matSpecs.pur.anchoUtil} onChange={(e) => handleSpec('pur', 'anchoUtil', e.target.value)} /></div>
              <div className="group"><label>Espesor (mm):</label><input type="text" value={matSpecs.pur.espesor} onChange={(e) => handleSpec('pur', 'espesor', e.target.value)} /></div>
            </div>

          </div>

          {/* PRESUPUESTO COMPLETO */}
          <div className="card">
            <h2>Presupuesto Materiales ($ ARS)</h2>
            <table>
              <thead><tr><th>Item / Configuración</th><th>Cant</th><th>Precio U.</th><th>Subtotal</th></tr></thead>
              <tbody>
                {itemsMateriales.map((i, idx) => (
                  <tr key={idx}>
                    <td>
                      <div><strong>{i.name}</strong></div>
                      <div className="extra-info">{i.extra}</div>
                    </td>
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