import React, { useState, useMemo } from 'react';
import LoftCanvas from './LoftCanvas';
import './App.css';

// ==========================================
// 1. HELPER / ENGINE DE CÁLCULO (Lógica pura)
// ==========================================
function calculateMaterials(params, prices, openings) {
  const totalPilotines = params.filasPilotines * params.pilotinesPorFila;

  const cantLongTotal = Math.floor(params.frente / params.pasoLongitudinal);
  let cantLongEfectiva = cantLongTotal;
  if (params.suprimirSolapados) {
    cantLongEfectiva = Math.max(0, cantLongTotal - Math.floor(params.frente / 2.50));
  }

  const mLong = Math.ceil((cantLongEfectiva * params.profundidad) / 6.0);
  const mTrans = Math.ceil(((Math.floor(params.profundidad / params.pasoTransversal)) * params.frente) / 6.0);
  const mCol = Math.ceil((10 * params.altura) / 6.0);
  const mVig = Math.ceil(((params.frente * 4) + (params.profundidad * 5) + (params.anchoMezzanine * 2)) / 6.0);

  const cOsb = Math.ceil(((params.frente * params.profundidad) + (params.anchoMezzanine * params.profundidad)) / 2.97);
  const areaBrutaMuros = ((params.frente + params.profundidad) * 2 * params.altura) + (params.frente * params.profundidad * 1.05);
  const areaTotalAberturas = openings.reduce((acc, op) => acc + (op.ancho * op.alto), 0);
  const mPur = Math.max(0, Math.ceil(areaBrutaMuros - areaTotalAberturas));

  const items = [
    { name: 'Barras Columnas', cant: mCol, pKey: 'col' },
    { name: 'Barras Vigas Marcos', cant: mVig, pKey: 'vig' },
    { name: `Perfiles Long. (${params.tipoPerfilLongitudinal})`, cant: mLong, pKey: 'cor' },
    { name: `Perfiles Trans. (${params.tipoPerfilTransversal})`, cant: mTrans, pKey: 'cor' },
    { name: 'Placas OSB (18mm)', cant: cOsb, pKey: 'osb' },
    { name: `Paneles PUR netos (m² - Aberturas: -${areaTotalAberturas.toFixed(2)}m²)`, cant: mPur, pKey: 'pur' },
    { name: 'Pilotines de Cemento', cant: totalPilotines, pKey: 'pil' },
  ];

  const total = items.reduce((acc, item) => acc + (item.cant * (prices[item.pKey] || 0)), 0);

  return { items, total };
}

// ==========================================
// 2. COMPONENTE PRINCIPAL (App)
// ==========================================
export default function App() {
  // --- Estados Principales ---
  const [globalUnit, setGlobalUnit] = useState('m');

  const [params, setParams] = useState({
    frente: 7.50,
    profundidad: 4.50,
    altura: 4.50,
    elevacion: 0.50,
    anchoMezzanine: 3.00,
    filasPilotines: 4,
    pilotinesPorFila: 3,
    pasoLongitudinal: 0.60,
    tipoPerfilLongitudinal: 'Perfil C 100x45x2.0',
    pasoTransversal: 0.80,
    tipoPerfilTransversal: 'Caño 60x40x1.6',
    suprimirSolapados: true
  });

  const [prices, setPrices] = useState({
    col: 38000,
    vig: 32000,
    cor: 24000,
    osb: 28000,
    pur: 35000,
    pil: 15000
  });

  const [openings, setOpenings] = useState([
    { id: 1, nombre: 'Puerta Principal', tipo: 'puerta', pared: 'frente', ladoReferencia: 'izquierda', offsetHorizontal: 1.00, alturaAntepecho: 0.00, ancho: 0.90, alto: 2.05 }
  ]);

  const [newOp, setNewOp] = useState({
    nombre: 'Nueva Abertura',
    tipo: 'ventana',
    pared: 'frente',
    ladoReferencia: 'izquierda',
    offsetHorizontal: 1.00,
    alturaAntepecho: 1.00,
    ancho: 1.20,
    alto: 1.00
  });

  // --- Helpers de Conversión ---
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

  // --- Handlers ---
  const handleParamInUnit = (e) => {
    const valMeters = fromUnitToMeters(e.target.value);
    setParams((prev) => ({ ...prev, [e.target.name]: valMeters }));
  };

  const handleDirectParam = (e) => {
    const val = e.target.type === 'checkbox'
      ? e.target.checked
      : (e.target.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value);
    setParams((prev) => ({ ...prev, [e.target.name]: val }));
  };

  const handlePrice = (e) => {
    const { name, value } = e.target;
    setPrices((prev) => ({ ...prev, [name]: parseFloat(value) || 0 }));
  };

  const addOpening = () => setOpenings((prev) => [...prev, { ...newOp, id: Date.now() }]);
  const removeOpening = (id) => setOpenings((prev) => prev.filter((op) => op.id !== id));

  // --- Memoización de Cálculos ---
  const { items, total } = useMemo(
    () => calculateMaterials(params, prices, openings),
    [params, prices, openings]
  );

  // --- RENDERIZADO PRINCIPAL ---
  return (
    <div className="app">
       <LoftCanvas
        params={params}
        prices={prices}
          openings={openings}
        total={total}
      />
    </div>
  );
}