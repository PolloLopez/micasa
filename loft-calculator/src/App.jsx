import React, { useState } from 'react';
import LoftCanvas from './LoftCanvas';
import './App.css';

export default function App() {
  // Unidad de medida para la configuración de perfiles (mm / cm)
  const [unit, setUnit] = useState('mm'); // 'mm' | 'cm'

  // Parámetros geométricos principales
  const [params, setParams] = useState({
    frente: 7.50,
    profundidad: 4.50,
    altura: 4.50,
    elevacion: 0.50,
    anchoMezzanine: 3.00,
    distanciaColumnas: 2.50,    // Distancia máx entre columnas
    pasoTirantesPiso: 0.40,     // Separación tirantes transversales piso
    pasoTirantesAltillo: 0.40,  // Separación tirantes transversales altillo
    separacionCorreas: 0.80,    // Separación fajas de pared
    filasPilotines: 4,
    pilotinesPorFila: 3,
    largoBarra: 6.0,            // Largo comercial estándar de barra (m)
  });

  // Especificaciones editables de materiales
  const [matSpecs, setMatSpecs] = useState({
    columna: { tipo: 'Caño Estructural', medida: '100x100', espesor: '1.6' },
    viga: { tipo: 'Perfil C', medida: '120x50', espesor: '2.0' },
    vigaTransversal: { tipo: 'Perfil C', medida: '100x45', espesor: '2.0' },
    correa: { tipo: 'Perfil C', medida: '80x40', espesor: '1.6' },
    osb: { tipoMaterial: 'Placa Fenólica / OSB', largo: 2.44, ancho: 1.22, espesor: '18' },
    pur: { tipoMaterial: 'Panel PUR (Isopanel)', anchoUtil: 1.00, espesor: '50' }
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
    vig: 35000,
    vigTrans: 26000,
    cor: 22000,
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

  // Vigas Marco Perimetrales
  const mlVigasMarco = (params.frente * 4) + (params.profundidad * 4);
  const mVigBars = Math.ceil(mlVigasMarco / (params.largoBarra || 6));

  // Vigas y Tirantes Transversales Perfil C (Piso PB + Altillo)
  const tirantesPisoMl = Math.ceil(params.frente / params.pasoTirantesPiso) * params.profundidad;
  const tirantesAltilloMl = Math.ceil(params.anchoMezzanine / params.pasoTirantesAltillo) * params.profundidad;
  const mlTransversalesTotales = tirantesPisoMl + tirantesAltilloMl;
  const mTransBars = Math.ceil(mlTransversalesTotales / (params.largoBarra || 6));
  const desperdicioTrans = (mTransBars * params.largoBarra) - mlTransversalesTotales;

  // Fajas / Correas
  const cantFajas = Math.floor(params.altura / params.separacionCorreas);
  const mlFajasTotales = cantFajas * (params.frente + params.profundidad) * 2;
  const mCorBars = Math.ceil(mlFajasTotales / (params.largoBarra || 6));
  const desperdicioCorreas = (mCorBars * params.largoBarra) - mlFajasTotales;

  // Placas Fenólico / OSB
  const areaPlaca = (matSpecs.osb.largo || 2.44) * (matSpecs.osb.ancho || 1.22);
  const areaPisoTotal = (params.frente * params.profundidad) + (params.anchoMezzanine * params.profundidad);
  const cOsb = Math.ceil(areaPisoTotal / (areaPlaca || 2.97));

  // Revestimiento Exterior
  const mPur = Math.ceil(((params.frente + params.profundidad) * 2 * params.altura) + (params.frente * params.profundidad * 1.05));
  const totalPilotines = params.filasPilotines * params.pilotinesPorFila;

  // Detalle de ítems para el presupuesto
  const itemsMateriales = [
    { 
      name: `Columnas: ${matSpecs.columna.tipo} ${matSpecs.columna.medida}${unit} x ${matSpecs.columna.espesor}${unit}`, 
      cant: mColBars, pKey: 'col', unit: `Barras (${params.largoBarra}m)`, extra: `Ml útil: ${mlColsTotales.toFixed(1)}m | Sobrante: ${desperdicioCols.toFixed(1)}m` 
    },
    { 
      name: `Vigas Principales Marco: ${matSpecs.viga.tipo} ${matSpecs.viga.medida}${unit} x ${matSpecs.viga.espesor}${unit}`, 
      cant: mVigBars, pKey: 'vig', unit: `Barras (${params.largoBarra}m)`, extra: `Ml útil: ${mlVigasMarco.toFixed(1)}m` 
    },
    { 
      name: `Transversales Piso/Altillo: ${matSpecs.vigaTransversal.tipo} ${matSpecs.vigaTransversal.medida}${unit} x ${matSpecs.vigaTransversal.espesor}${unit}`, 
      cant: mTransBars, pKey: 'vigTrans', unit: `Barras (${params.largoBarra}m)`, extra: `Ml útil: ${mlTransversalesTotales.toFixed(1)}m | Sobrante: ${desperdicioTrans.toFixed(1)}m` 
    },
    { 
      name: `Fajas/Correas: ${matSpecs.correa.tipo} ${matSpecs.correa.medida}${unit} x ${matSpecs.correa.espesor}${unit}`, 
      cant: mCorBars, pKey: 'cor', unit: `Barras (${params.largoBarra}m)`, extra: `Ml útil: ${mlFajasTotales.toFixed(1)}m | Sobrante: ${desperdicioCorreas.toFixed(1)}m` 
    },
    { 
      name: `${matSpecs.osb.tipoMaterial} (${matSpecs.osb.largo}m x ${matSpecs.osb.ancho}m x ${matSpecs.osb.espesor}${unit})`, 
      cant: cOsb, pKey: 'osb', unit: 'Placas', extra: `Piso + Altillo (${areaPisoTotal.toFixed(1)} m²)` 
    },
    { 
      name: `${matSpecs.pur.tipoMaterial} (${matSpecs.pur.espesor}${unit} - Útil: ${matSpecs.pur.anchoUtil}m)`, 
      cant: mPur, pKey: 'pur', unit: 'm²', extra: `Cubierta + Muros exterior` 
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
        <h1>Diseñador & Cotizador</h1>
        <div className="subtitle">By "elPollo"</div>
      </header>
      <div className="layout">
        <div className="canvas-wrap">
          <LoftCanvas params={params} layers={layers} />
        </div>
        <aside className="sidebar">
          
          {/* CONFIGURACIÓN DE UNIDADES */}
          <div className="card">
            <h2>Configuración Global</h2>
            <div className="group">
              <label>Unidad para Secciones y Perfiles:</label>
              <select value={unit} onChange={(e) => setUnit(e.target.value)}>
                <option value="mm">Milímetros (mm)</option>
                <option value="cm">Centímetros (cm)</option>
              </select>
            </div>
          </div>

          {/* CONTROL DE CAPAS 3D */}
          <div className="card">
            <h2>Visibilidad de Capas 3D</h2>
            <div className="layers-grid">
              <label className="checkbox"><input type="checkbox" checked={layers.pilotines} onChange={() => toggleLayer('pilotines')} /> Pilotines</label>
              <label className="checkbox"><input type="checkbox" checked={layers.columnas} onChange={() => toggleLayer('columnas')} /> Columnas</label>
              <label className="checkbox"><input type="checkbox" checked={layers.estructuras} onChange={() => toggleLayer('estructuras')} /> Pisos/Altillo/Transversales</label>
              <label className="checkbox"><input type="checkbox" checked={layers.fajas} onChange={() => toggleLayer('fajas')} /> Fajas/Correas</label>
              <label className="checkbox"><input type="checkbox" checked={layers.osb} onChange={() => toggleLayer('osb')} /> Placas Fenólico/OSB</label>
              <label className="checkbox"><input type="checkbox" checked={layers.pur} onChange={() => toggleLayer('pur')} /> Revestimiento Muros</label>
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
            <div className="group"><label>Paso Transversales Piso:</label><input type="number" step="0.05" name="pasoTirantesPiso" value={params.pasoTirantesPiso} onChange={handleParam} /></div>
            <div className="group"><label>Paso Transversales Altillo:</label><input type="number" step="0.05" name="pasoTirantesAltillo" value={params.pasoTirantesAltillo} onChange={handleParam} /></div>
            <div className="group"><label>Paso Fajas Pared:</label><input type="number" step="0.10" name="separacionCorreas" value={params.separacionCorreas} onChange={handleParam} /></div>
            <div className="group"><label>Filas Pilotines:</label><input type="number" step="1" name="filasPilotines" value={params.filasPilotines} onChange={handleParam} /></div>
            <div className="group"><label>Pilotines x Fila:</label><input type="number" step="1" name="pilotinesPorFila" value={params.pilotinesPorFila} onChange={handleParam} /></div>
            <div className="group"><label>Largo Comercial Barra (m):</label><input type="number" step="1" name="largoBarra" value={params.largoBarra} onChange={handleParam} /></div>
          </div>

          {/* CONFIGURADOR CATÁLOGO DE MATERIALES */}
          <div className="card">
            <h2>Catálogo de Perfiles y Materiales</h2>
            
            {/* Columnas */}
            <div className="subcard">
              <h3>Columnas</h3>
              <div className="group"><label>Tipo de Perfil:</label>
                <select value={matSpecs.columna.tipo} onChange={(e) => handleSpec('columna', 'tipo', e.target.value)}>
                  <option value="Caño Estructural">Caño Estructural</option>
                  <option value="Perfil C">Perfil C</option>
                  <option value="Perfil IPN">Perfil IPN</option>
                  <option value="Perfil UPN">Perfil UPN</option>
                  <option value="Perfil T">Perfil T</option>
                  <option value="Hierro L / Ángulo">Hierro L / Ángulo</option>
                  <option value="Hierro Macizo">Hierro Macizo</option>
                  <option value="Tubo Redondo">Tubo Redondo</option>
                </select>
              </div>
              <div className="group"><label>Medida ({unit}):</label><input type="text" value={matSpecs.columna.medida} onChange={(e) => handleSpec('columna', 'medida', e.target.value)} /></div>
              <div className="group"><label>Espesor ({unit}):</label><input type="text" value={matSpecs.columna.espesor} onChange={(e) => handleSpec('columna', 'espesor', e.target.value)} /></div>
            </div>

            {/* Vigas Marco */}
            <div className="subcard">
              <h3>Vigas Principales Marco</h3>
              <div className="group"><label>Tipo de Perfil:</label>
                <select value={matSpecs.viga.tipo} onChange={(e) => handleSpec('viga', 'tipo', e.target.value)}>
                  <option value="Perfil C">Perfil C</option>
                  <option value="Caño Estructural">Caño Estructural</option>
                  <option value="Perfil IPN">Perfil IPN</option>
                  <option value="Perfil UPN">Perfil UPN</option>
                </select>
              </div>
              <div className="group"><label>Medida ({unit}):</label><input type="text" value={matSpecs.viga.medida} onChange={(e) => handleSpec('viga', 'medida', e.target.value)} /></div>
              <div className="group"><label>Espesor ({unit}):</label><input type="text" value={matSpecs.viga.espesor} onChange={(e) => handleSpec('viga', 'espesor', e.target.value)} /></div>
            </div>

            {/* Transversales de Piso */}
            <div className="subcard">
              <h3>Transversales de Piso y Altillo</h3>
              <div className="group"><label>Tipo de Perfil:</label>
                <select value={matSpecs.vigaTransversal.tipo} onChange={(e) => handleSpec('vigaTransversal', 'tipo', e.target.value)}>
                  <option value="Perfil C">Perfil C</option>
                  <option value="Caño Estructural">Caño Estructural</option>
                  <option value="Perfil T">Perfil T</option>
                  <option value="Omegaprofil">Omegaprofil</option>
                </select>
              </div>
              <div className="group"><label>Medida ({unit}):</label><input type="text" value={matSpecs.vigaTransversal.medida} onChange={(e) => handleSpec('vigaTransversal', 'medida', e.target.value)} /></div>
              <div className="group"><label>Espesor ({unit}):</label><input type="text" value={matSpecs.vigaTransversal.espesor} onChange={(e) => handleSpec('vigaTransversal', 'espesor', e.target.value)} /></div>
            </div>

            {/* Correas */}
            <div className="subcard">
              <h3>Fajas / Correas de Pared</h3>
              <div className="group"><label>Tipo de Perfil:</label>
                <select value={matSpecs.correa.tipo} onChange={(e) => handleSpec('correa', 'tipo', e.target.value)}>
                  <option value="Perfil C">Perfil C</option>
                  <option value="Caño Estructural">Caño Estructural</option>
                  <option value="Omegaprofil">Omegaprofil</option>
                  <option value="Hierro L / Ángulo">Hierro L / Ángulo</option>
                </select>
              </div>
              <div className="group"><label>Medida ({unit}):</label><input type="text" value={matSpecs.correa.medida} onChange={(e) => handleSpec('correa', 'medida', e.target.value)} /></div>
              <div className="group"><label>Espesor ({unit}):</label><input type="text" value={matSpecs.correa.espesor} onChange={(e) => handleSpec('correa', 'espesor', e.target.value)} /></div>
            </div>

            {/* Placas Piso */}
            <div className="subcard">
              <h3>Revestimiento de Piso (Placas)</h3>
              <div className="group"><label>Material:</label>
                <select value={matSpecs.osb.tipoMaterial} onChange={(e) => handleSpec('osb', 'tipoMaterial', e.target.value)}>
                  <option value="Placa Fenólica / OSB">Placa Fenólica / OSB</option>
                  <option value="Placa Cementicia Heavy">Placa Cementicia Heavy</option>
                  <option value="Chapa Alfajor / Semilla de Melón">Chapa Alfajor / Semilla de Melón</option>
                </select>
              </div>
              <div className="group"><label>Largo Placa (m):</label><input type="number" step="0.01" value={matSpecs.osb.largo} onChange={(e) => handleSpec('osb', 'largo', e.target.value)} /></div>
              <div className="group"><label>Ancho Placa (m):</label><input type="number" step="0.01" value={matSpecs.osb.ancho} onChange={(e) => handleSpec('osb', 'ancho', e.target.value)} /></div>
              <div className="group"><label>Espesor ({unit}):</label><input type="text" value={matSpecs.osb.espesor} onChange={(e) => handleSpec('osb', 'espesor', e.target.value)} /></div>
            </div>

            {/* Revestimiento Paredes */}
            <div className="subcard">
              <h3>Revestimiento Muros Exterior</h3>
              <div className="group"><label>Material Panel:</label>
                <select value={matSpecs.pur.tipoMaterial} onChange={(e) => handleSpec('pur', 'tipoMaterial', e.target.value)}>
                  <option value="Panel PUR (Isopanel)">Panel PUR (Isopanel)</option>
                  <option value="Chapa Sinusoidal / T-101">Chapa Sinusoidal / T-101</option>
                  <option value="Placa Cementicia Superboard">Placa Cementicia Superboard</option>
                  <option value="Siding PVC / Madera">Siding PVC / Madera</option>
                </select>
              </div>
              <div className="group"><label>Ancho Útil (m):</label><input type="number" step="0.05" value={matSpecs.pur.anchoUtil} onChange={(e) => handleSpec('pur', 'anchoUtil', e.target.value)} /></div>
              <div className="group"><label>Espesor ({unit}):</label><input type="text" value={matSpecs.pur.espesor} onChange={(e) => handleSpec('pur', 'espesor', e.target.value)} /></div>
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