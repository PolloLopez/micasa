import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { jsPDF } from 'jspdf';
import './App.css';

// --- ALGORITMO OPTIMIZADOR DE CORTES 1D (FIRST FIT DECREASING) ---
function optimizarCortes(piezasRequeridas, largoBarraComercial, anchoDisco = 0.003) {
  if (!piezasRequeridas || piezasRequeridas.length === 0 || largoBarraComercial <= 0) {
    return { barras: [], totalBarras: 0, desperdicioTotalMl: 0, porcentajeDesperdicio: 0 };
  }

  // Ordenar piezas de mayor a menor para mejor empaquetado
  const piezasOrdenadas = [...piezasRequeridas].sort((a, b) => b - a);
  const barras = []; // Guardará objetos: { id, piezas: [], usado: 0, sobrante: 0 }

  piezasOrdenadas.forEach((piezas) => {
    let ubicada = false;
    for (let b of barras) {
      const espacioNecesario = piezas + (b.piezas.length > 0 ? anchoDisco : 0);
      if (b.sobrante >= espacioNecesario) {
        b.piezas.push(piezas);
        b.usado += espacioNecesario;
        b.sobrante = largoBarraComercial - b.usado;
        ubicada = true;
        break;
      }
    }
    if (!ubicada) {
      barras.push({
        id: barras.length + 1,
        piezas: [piezas],
        usado: piezas,
        sobrante: largoBarraComercial - piezas
      });
    }
  });

  const totalCompradoMl = barras.length * largoBarraComercial;
  const desperdicioTotalMl = barras.reduce((acc, b) => acc + b.sobrante, 0);
  const porcentajeDesperdicio = totalCompradoMl > 0 ? (desperdicioTotalMl / totalCompradoMl) * 100 : 0;

  return {
    barras,
    totalBarras: barras.length,
    totalCompradoMl,
    desperdicioTotalMl,
    porcentajeDesperdicio
  };
}

export default function App() {
  // --- ESTADOS Y UNIDADES ---
  const [unit, setUnit] = useState('m'); // 'mm', 'cm', 'm'
  const [activeTab, setActiveTab] = useState('medidas'); // Móvil: 'medidas', 'perfiles', 'optimizar', 'capas', 'cotizador'

  // Factores de conversión hacia metros
  const toM = (val) => {
    if (unit === 'mm') return val / 1000;
    if (unit === 'cm') return val / 100;
    return val;
  };

  const fromM = (valInM) => {
    if (unit === 'mm') return Math.round(valInM * 1000);
    if (unit === 'cm') return Number((valInM * 100).toFixed(1));
    return Number(valInM.toFixed(2));
  };

  // Parámetros almacenados siempre en METROS internamente
  const [rawParams, setRawParams] = useState({
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
    largoBarraComercial: 6.00, // Largo de barra por defecto
    anchoDisco: 0.003 // 3mm de disco de corte
  });

  const [matSpecs, setMatSpecs] = useState({
    columna: { tipo: 'Caño Estructural', medida: '100x100', espesor: '1.6' },
    viga: { tipo: 'Perfil C', medida: '120x50', espesor: '2.0' },
    vigaTransversal: { tipo: 'Perfil C', medida: '100x45', espesor: '2.0' },
    correa: { tipo: 'Perfil C', medida: '80x40', espesor: '1.6' },
    osb: { tipoMaterial: 'Placa Fenólica / OSB', largo: 2.44, ancho: 1.22, espesor: '18' },
    pur: { tipoMaterial: 'Panel PUR (Isopanel)', anchoUtil: 1.00, espesor: '50' }
  });

  const [layers, setLayers] = useState({
    pilotines: true,
    columnas: true,
    estructuras: true,
    fajas: true,
    osb: true,
    pur: true
  });

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

  // Manejo de inputs dinámicos respetando la unidad activa
  const handleDimChange = (field, valDisplay) => {
    const numeric = parseFloat(valDisplay) || 0;
    const inMeters = toM(numeric);
    setRawParams(prev => ({ ...prev, [field]: inMeters }));
  };

  const handleDirectChange = (e) => {
    const { name, value } = e.target;
    setRawParams(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
  };

  // --- CÁLCULO DE PIEZAS Y LISTADO DE CORTES ---
  const p = rawParams;

  // 1. Columnas
  const numColsLargo = Math.max(2, Math.ceil(p.frente / p.distanciaColumnas) + 1);
  const numColsAncho = Math.max(2, Math.ceil(p.profundidad / p.distanciaColumnas) + 1);
  const totalCols = (numColsLargo * 2) + ((numColsAncho - 2) * 3);
  const piezasCols = Array(totalCols).fill(p.altura);
  const optCols = optimizarCortes(piezasCols, p.largoBarraComercial, p.anchoDisco);

  // 2. Vigas Marco
  const piezasVigas = [
    ...Array(4).fill(p.frente),
    ...Array(4).fill(p.profundidad)
  ];
  const optVigas = optimizarCortes(piezasVigas, p.largoBarraComercial, p.anchoDisco);

  // 3. Transversales (Piso + Altillo)
  const cantTirantesPiso = Math.floor(p.frente / p.pasoTirantesPiso) + 1;
  const cantTirantesAltillo = Math.floor(p.anchoMezzanine / p.pasoTirantesAltillo) + 1;
  const piezasTrans = [
    ...Array(cantTirantesPiso).fill(p.profundidad),
    ...Array(cantTirantesAltillo).fill(p.profundidad)
  ];
  const optTrans = optimizarCortes(piezasTrans, p.largoBarraComercial, p.anchoDisco);

  // 4. Correas / Fajas
  const cantFajas = Math.floor(p.altura / p.separacionCorreas);
  const piezasCorreas = [
    ...Array(cantFajas * 2).fill(p.frente),
    ...Array(cantFajas * 2).fill(p.profundidad)
  ];
  const optCorreas = optimizarCortes(piezasCorreas, p.largoBarraComercial, p.anchoDisco);

  // Revestimientos y placas
  const areaPlaca = matSpecs.osb.largo * matSpecs.osb.ancho;
  const areaPisoTotal = (p.frente * p.profundidad) + (p.anchoMezzanine * p.profundidad);
  const cOsb = Math.ceil(areaPisoTotal / (areaPlaca || 2.97));
  const mPur = Math.ceil(((p.frente + p.profundidad) * 2 * p.altura) + (p.frente * p.profundidad));
  const totalPilotines = p.filasPilotines * p.pilotinesPorFila;

  // Cómputo global
  const itemsCotizacion = [
    { name: `Columnas (${matSpecs.columna.tipo} ${matSpecs.columna.medida})`, cant: optCols.totalBarras, pKey: 'col', unit: `Barras de ${p.largoBarraComercial}m`, desc: `Desperdicio: ${optCols.porcentajeDesperdicio.toFixed(1)}%` },
    { name: `Vigas Marco (${matSpecs.viga.tipo} ${matSpecs.viga.medida})`, cant: optVigas.totalBarras, pKey: 'vig', unit: `Barras de ${p.largoBarraComercial}m`, desc: `Desperdicio: ${optVigas.porcentajeDesperdicio.toFixed(1)}%` },
    { name: `Transversales (${matSpecs.vigaTransversal.tipo} ${matSpecs.vigaTransversal.medida})`, cant: optTrans.totalBarras, pKey: 'vigTrans', unit: `Barras de ${p.largoBarraComercial}m`, desc: `Desperdicio: ${optTrans.porcentajeDesperdicio.toFixed(1)}%` },
    { name: `Fajas/Correas (${matSpecs.correa.tipo} ${matSpecs.correa.medida})`, cant: optCorreas.totalBarras, pKey: 'cor', unit: `Barras de ${p.largoBarraComercial}m`, desc: `Desperdicio: ${optCorreas.porcentajeDesperdicio.toFixed(1)}%` },
    { name: `${matSpecs.osb.tipoMaterial}`, cant: cOsb, pKey: 'osb', unit: 'Placas', desc: `${areaPisoTotal.toFixed(1)} m² de superficie` },
    { name: `${matSpecs.pur.tipoMaterial}`, cant: mPur, pKey: 'pur', unit: 'm²', desc: 'Muros y cubierta exterior' },
    { name: 'Pilotines de Hormigón Base', cant: totalPilotines, pKey: 'pil', unit: 'U', desc: 'Bases de apoyo' },
    { name: 'Mano de Obra Armado', cant: Math.ceil(areaPisoTotal), pKey: 'manoObraM2', unit: 'm²', desc: 'Instalación y soldadura' },
    { name: 'Consumibles Generales', cant: 1, pKey: 'consumibles', unit: 'Gl', desc: 'Discos, electrodos, gas' },
    { name: 'Pintura Estructural', cant: 1, pKey: 'pintura', unit: 'Gl', desc: 'Protección anticorrosiva' },
    { name: 'Flete y Logística', cant: 1, pKey: 'flete', unit: 'Gl', desc: 'Traslado a obra' }
  ];

  const totalGeneral = itemsCotizacion.reduce((acc, item) => acc + (item.cant * (prices[item.pKey] || 0)), 0);

  // --- EXPORTAR REPORTES Y ESQUEMAS DE CORTE A PDF ---
  const exportarPDF = () => {
    const doc = new jsPDF();
    let y = 15;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('🐤Calculator - Reporte de Cotización y Cortes', 14, y);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Diseñado por "elPollo" | Estructuras Modulares', 14, y + 6);
    y += 18;

    // Dimensiones
    doc.setFont('helvetica', 'bold');
    doc.text('1. Dimensiones de la Estructura:', 14, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.text(`• Frente: ${fromM(p.frente)}${unit} | Profundidad: ${fromM(p.profundidad)}${unit} | Altura: ${fromM(p.altura)}${unit}`, 14, y);
    doc.text(`• Largo Comercial de Barras: ${p.largoBarraComercial} m`, 14, y + 5);
    y += 14;

    // Presupuesto
    doc.setFont('helvetica', 'bold');
    doc.text('2. Resumen de Presupuesto:', 14, y);
    y += 6;

    itemsCotizacion.forEach((item) => {
      const subtotal = item.cant * (prices[item.pKey] || 0);
      doc.setFont('helvetica', 'normal');
      doc.text(`${item.name} x ${item.cant} ${item.unit}`, 14, y);
      doc.text(`$ ${subtotal.toLocaleString('es-AR')}`, 170, y, { align: 'right' });
      y += 5;
    });

    y += 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(`TOTAL ESTIMADO: $ ${totalGeneral.toLocaleString('es-AR')}`, 14, y);
    y += 14;

    // Mapa de Cortes
    doc.setFontSize(14);
    doc.text('3. Esquerma de Optimización de Cortes (Nesting)', 14, y);
    y += 8;

    const imprimirOpt = (titulo, opt) => {
      if (y > 260) { doc.addPage(); y = 15; }
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`${titulo} - Total: ${opt.totalBarras} barras | Desperdicio: ${opt.porcentajeDesperdicio.toFixed(1)}%`, 14, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      opt.barras.forEach((b) => {
        if (y > 275) { doc.addPage(); y = 15; }
        const piezasStr = b.piezas.map(pz => `${fromM(pz)}${unit}`).join(' + ');
        doc.text(`  Barra #${b.id}: [ ${piezasStr} ] -> Sobran: ${fromM(b.sobrante)}${unit}`, 16, y);
        y += 4.5;
      });
      y += 4;
    };

    imprimirOpt('Columnas', optCols);
    imprimirOpt('Vigas Marco Principal', optVigas);
    imprimirOpt('Transversales de Piso y Altillo', optTrans);
    imprimirOpt('Fajas / Correas', optCorreas);

    doc.save(`Cotizacion_elPollo_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <h1>🐤Calculator</h1>
          <span className="subtitle">Diseñador & Cotizador — By "elPollo"</span>
        </div>
        <div className="unit-selector">
          <label>Unidad:</label>
          <select value={unit} onChange={(e) => setUnit(e.target.value)}>
            <option value="m">Metros (m)</option>
            <option value="cm">Centímetros (cm)</option>
            <option value="mm">Milímetros (mm)</option>
          </select>
        </div>
      </header>

      <div className="main-container">
        {/* VISOR 3D */}
        <div className="canvas-wrapper">
          <Canvas3D params={p} layers={layers} />
        </div>

        {/* NAVEGACIÓN TÁCTIL MÓVIL */}
        <nav className="mobile-tabs">
          <button className={activeTab === 'medidas' ? 'active' : ''} onClick={() => setActiveTab('medidas')}>📏 Medidas</button>
          <button className={activeTab === 'perfiles' ? 'active' : ''} onClick={() => setActiveTab('perfiles')}>🏗️ Perfiles</button>
          <button className={activeTab === 'optimizar' ? 'active' : ''} onClick={() => setActiveTab('optimizar')}>✂️ Cortes</button>
          <button className={activeTab === 'capas' ? 'active' : ''} onClick={() => setActiveTab('capas')}>👁️ Capas</button>
          <button className={activeTab === 'cotizador' ? 'active' : ''} onClick={() => setActiveTab('cotizador')}>💰 Cotización</button>
        </nav>

        {/* CONTENIDO INTERACTIVO */}
        <aside className="sidebar">
          
          {/* MEDIDAS Y PASOS */}
          <div className={`tab-content ${activeTab === 'medidas' ? 'show' : ''}`}>
            <h2>Dimensiones y Pasos ({unit})</h2>
            <div className="form-grid">
              <div className="input-group">
                <label>Frente:</label>
                <input type="number" step="any" value={fromM(p.frente)} onChange={(e) => handleDimChange('frente', e.target.value)} />
              </div>
              <div className="input-group">
                <label>Profundidad:</label>
                <input type="number" step="any" value={fromM(p.profundidad)} onChange={(e) => handleDimChange('profundidad', e.target.value)} />
              </div>
              <div className="input-group">
                <label>Altura Estructura:</label>
                <input type="number" step="any" value={fromM(p.altura)} onChange={(e) => handleDimChange('altura', e.target.value)} />
              </div>
              <div className="input-group">
                <label>Elevación Pilotines:</label>
                <input type="number" step="any" value={fromM(p.elevacion)} onChange={(e) => handleDimChange('elevacion', e.target.value)} />
              </div>
              <div className="input-group">
                <label>Ancho Altillo:</label>
                <input type="number" step="any" value={fromM(p.anchoMezzanine)} onChange={(e) => handleDimChange('anchoMezzanine', e.target.value)} />
              </div>
              <div className="input-group">
                <label>Paso Max. Columnas:</label>
                <input type="number" step="any" value={fromM(p.distanciaColumnas)} onChange={(e) => handleDimChange('distanciaColumnas', e.target.value)} />
              </div>
              <div className="input-group">
                <label>Paso Transversales Piso:</label>
                <input type="number" step="any" value={fromM(p.pasoTirantesPiso)} onChange={(e) => handleDimChange('pasoTirantesPiso', e.target.value)} />
              </div>
              <div className="input-group">
                <label>Paso Transversales Altillo:</label>
                <input type="number" step="any" value={fromM(p.pasoTirantesAltillo)} onChange={(e) => handleDimChange('pasoTirantesAltillo', e.target.value)} />
              </div>
              <div className="input-group">
                <label>Paso Correas/Fajas:</label>
                <input type="number" step="any" value={fromM(p.separacionCorreas)} onChange={(e) => handleDimChange('separacionCorreas', e.target.value)} />
              </div>
            </div>

            <h3 className="section-title">Barra Comercial y Corte</h3>
            <div className="form-grid">
              <div className="input-group">
                <label>Largo de Barra (m):</label>
                <input type="number" step="0.5" name="largoBarraComercial" value={p.largoBarraComercial} onChange={handleDirectChange} />
              </div>
              <div className="input-group">
                <label>Espesor Disco (mm):</label>
                <input type="number" step="0.5" value={p.anchoDisco * 1000} onChange={(e) => setRawParams({ ...p, anchoDisco: (parseFloat(e.target.value) || 0) / 1000 })} />
              </div>
            </div>
          </div>

          {/* PERFILES Y MATERIALES */}
          <div className={`tab-content ${activeTab === 'perfiles' ? 'show' : ''}`}>
            <h2>Catálogo de Perfiles</h2>
            <div className="card-item">
              <h4>Columnas</h4>
              <select value={matSpecs.columna.tipo} onChange={(e) => setMatSpecs({ ...matSpecs, columna: { ...matSpecs.columna, tipo: e.target.value } })}>
                <option value="Caño Estructural">Caño Estructural</option>
                <option value="Perfil C">Perfil C</option>
                <option value="Perfil IPN">Perfil IPN</option>
                <option value="Perfil UPN">Perfil UPN</option>
                <option value="Tubo Redondo">Tubo Redondo</option>
              </select>
              <input type="text" placeholder={`Medida (${unit})`} value={matSpecs.columna.medida} onChange={(e) => setMatSpecs({ ...matSpecs, columna: { ...matSpecs.columna, medida: e.target.value } })} />
            </div>

            <div className="card-item">
              <h4>Vigas Marco</h4>
              <select value={matSpecs.viga.tipo} onChange={(e) => setMatSpecs({ ...matSpecs, viga: { ...matSpecs.viga, tipo: e.target.value } })}>
                <option value="Perfil C">Perfil C</option>
                <option value="Caño Estructural">Caño Estructural</option>
                <option value="Perfil IPN">Perfil IPN</option>
              </select>
              <input type="text" placeholder={`Medida (${unit})`} value={matSpecs.viga.medida} onChange={(e) => setMatSpecs({ ...matSpecs, viga: { ...matSpecs.viga, medida: e.target.value } })} />
            </div>

            <div className="card-item">
              <h4>Transversales Piso/Altillo</h4>
              <select value={matSpecs.vigaTransversal.tipo} onChange={(e) => setMatSpecs({ ...matSpecs, vigaTransversal: { ...matSpecs.vigaTransversal, tipo: e.target.value } })}>
                <option value="Perfil C">Perfil C</option>
                <option value="Caño Estructural">Caño Estructural</option>
                <option value="Omegaprofil">Omegaprofil</option>
              </select>
              <input type="text" placeholder={`Medida (${unit})`} value={matSpecs.vigaTransversal.medida} onChange={(e) => setMatSpecs({ ...matSpecs, vigaTransversal: { ...matSpecs.vigaTransversal, medida: e.target.value } })} />
            </div>
          </div>

          {/* OPTIMIZACIÓN DE CORTES */}
          <div className={`tab-content ${activeTab === 'optimizar' ? 'show' : ''}`}>
            <h2>Optimización y Mapas de Corte</h2>
            <p className="hint">Simulación para barras estándar de {p.largoBarraComercial}m</p>

            <RenderCortesSection titulo="Columnas" opt={optCols} unit={unit} fromM={fromM} largoBarra={p.largoBarraComercial} />
            <RenderCortesSection titulo="Vigas Marco" opt={optVigas} unit={unit} fromM={fromM} largoBarra={p.largoBarraComercial} />
            <RenderCortesSection titulo="Transversales Piso" opt={optTrans} unit={unit} fromM={fromM} largoBarra={p.largoBarraComercial} />
            <RenderCortesSection titulo="Correas / Fajas" opt={optCorreas} unit={unit} fromM={fromM} largoBarra={p.largoBarraComercial} />
          </div>

          {/* CAPAS 3D */}
          <div className={`tab-content ${activeTab === 'capas' ? 'show' : ''}`}>
            <h2>Visibilidad Capas 3D</h2>
            <div className="layers-list">
              {Object.keys(layers).map((key) => (
                <label key={key} className="checkbox-label">
                  <input type="checkbox" checked={layers[key]} onChange={() => setLayers({ ...layers, [key]: !layers[key] })} />
                  <span>{key.toUpperCase()}</span>
                </label>
              ))}
            </div>
          </div>

          {/* COTIZADOR Y EXPORTAR */}
          <div className={`tab-content ${activeTab === 'cotizador' ? 'show' : ''}`}>
            <h2>Presupuesto Estimado</h2>
            <div className="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th>Material</th>
                    <th>Cant</th>
                    <th>$ Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {itemsCotizacion.map((item, idx) => (
                    <tr key={idx}>
                      <td>
                        <strong>{item.name}</strong>
                        <small>{item.desc}</small>
                      </td>
                      <td>{item.cant} {item.unit}</td>
                      <td>
                        <input
                          type="number"
                          value={prices[item.pKey] || 0}
                          onChange={(e) => setPrices({ ...prices, [item.pKey]: parseFloat(e.target.value) || 0 })}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="total-box">
              <span>TOTAL ESTIMADO:</span>
              <strong>$ {totalGeneral.toLocaleString('es-AR')}</strong>
            </div>

            <button className="btn-pdf" onClick={exportarPDF}>
              📄 Exportar Cotización y Mapa de Cortes a PDF
            </button>
          </div>

        </aside>
      </div>
    </div>
  );
}

// --- COMPONENTE CORTES REUTILIZABLE ---
function RenderCortesSection({ titulo, opt, unit, fromM, largoBarra }) {
  return (
    <div className="nesting-box">
      <div className="nesting-header">
        <strong>{titulo}</strong>
        <span className={`badge ${opt.porcentajeDesperdicio < 10 ? 'green' : 'orange'}`}>
          Desperdicio: {opt.porcentajeDesperdicio.toFixed(1)}% ({opt.totalBarras} Barras)
        </span>
      </div>
      <div className="nesting-bars">
        {opt.barras.map((b) => (
          <div key={b.id} className="bar-visual">
            <div className="bar-title">Barra #{b.id} (Sobran {fromM(b.sobrante)}{unit}):</div>
            <div className="bar-track">
              {b.piezas.map((pz, i) => {
                const pct = (pz / largoBarra) * 100;
                return (
                  <div key={i} className="bar-piece" style={{ width: `${pct}%` }}>
                    {fromM(pz)}
                  </div>
                );
              })}
              <div className="bar-waste" style={{ width: `${(b.sobrante / largoBarra) * 100}%` }}></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- COMPONENTE VISOR 3D INTERACTIVO ---
function Canvas3D({ params, layers }) {
  const mountRef = useRef(null);
  const isRotating = useRef(true);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;
    const w = container.clientWidth, h = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a);

    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
    camera.position.set(12, 8, 14);
    camera.lookAt(0, 2, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const dl = new THREE.DirectionalLight(0xffffff, 0.8);
    dl.position.set(10, 20, 10);
    scene.add(dl);
    scene.add(new THREE.GridHelper(20, 20, 0x475569, 0x1e293b));

    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    // Materiales
    const matPil = new THREE.MeshStandardMaterial({ color: 0x94a3b8 });
    const matCol = new THREE.MeshStandardMaterial({ color: 0xef4444 });
    const matBeam = new THREE.MeshStandardMaterial({ color: 0x3b82f6 });
    const matTrans = new THREE.MeshStandardMaterial({ color: 0x06b6d4 });
    const matCor = new THREE.MeshStandardMaterial({ color: 0xeab308 });
    const matOsb = new THREE.MeshStandardMaterial({ color: 0xd97706 });
    const matPur = new THREE.MeshStandardMaterial({ color: 0x10b981, transparent: true, opacity: 0.25 });

    const { frente, profundidad, altura, elevacion, anchoMezzanine } = params;

    // Dibujar Pilotines
    if (layers.pilotines) {
      for (let i = 0; i < params.filasPilotines; i++) {
        for (let j = 0; j < params.pilotinesPorFila; j++) {
          const x = -frente/2 + (frente / Math.max(1, params.filasPilotines - 1)) * i;
          const z = -profundidad/2 + (profundidad / Math.max(1, params.pilotinesPorFila - 1)) * j;
          const p = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, elevacion, 16), matPil);
          p.position.set(x, elevacion / 2, z);
          rootGroup.add(p);
        }
      }
    }

    // Dibujar Columnas
    if (layers.columnas) {
      const numColsLargo = Math.max(2, Math.ceil(frente / params.distanciaColumnas) + 1);
      for (let i = 0; i < numColsLargo; i++) {
        const x = -frente/2 + (frente / (numColsLargo - 1)) * i;
        [-profundidad/2, profundidad/2].forEach(z => {
          const c = new THREE.Mesh(new THREE.BoxGeometry(0.1, altura, 0.1), matCol);
          c.position.set(x, elevacion + altura / 2, z);
          rootGroup.add(c);
        });
      }
    }

    // Dibujar Vigas y Transversales
    if (layers.estructuras) {
      const vigoBase = new THREE.Mesh(new THREE.BoxGeometry(frente, 0.12, profundidad), matBeam);
      vigoBase.position.set(0, elevacion, 0);
      rootGroup.add(vigoBase);

      const cantTirantesPiso = Math.floor(frente / params.pasoTirantesPiso);
      for (let i = 0; i <= cantTirantesPiso; i++) {
        const x = -frente/2 + (i * params.pasoTirantesPiso);
        if (x <= frente/2) {
          const tPiso = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.10, profundidad - 0.1), matTrans);
          tPiso.position.set(x, elevacion, 0);
          rootGroup.add(tPiso);
        }
      }
    }

    // Dibujar Placas OSB
    if (layers.osb) {
      const osbPiso = new THREE.Mesh(new THREE.BoxGeometry(frente, 0.02, profundidad), matOsb);
      osbPiso.position.set(0, elevacion + 0.06, 0);
      rootGroup.add(osbPiso);
    }

    // Dibujar Revestimiento Muros
    if (layers.pur) {
      const pur = new THREE.Mesh(new THREE.BoxGeometry(frente, altura, profundidad), matPur);
      pur.position.set(0, elevacion + altura / 2, 0);
      rootGroup.add(pur);
    }

    // Animación
    let animId;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      if (isRotating.current) {
        rootGroup.rotation.y += 0.003;
      }
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, [params, layers]);

  return (
    <div
      className="canvas-box"
      ref={mountRef}
      onTouchStart={() => (isRotating.current = false)}
      onMouseDown={() => (isRotating.current = false)}
    />
  );
}