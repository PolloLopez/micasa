// Tests del Excel de la obra (v1.26). Correr con: npm test
import { describe, it, expect } from 'vitest';
import { crc32, crearXlsx } from './xlsx.js';
import { hojasDeObra, libroDeObra } from './exportarExcel.js';
import { generarEstructura } from '../motor/estructura.js';
import { calcularPresupuesto, CATALOGO_INICIAL } from '../motor/presupuesto.js';
import { resolverCatalogo } from '../motor/perfiles.js';
import { todasLasVistas } from '../motor/planos.js';
import { PARAMS_INICIALES as P, ABERTURAS_INICIALES } from '../motor/parametrosIniciales.js';

const datosDeEjemplo = () => {
  const e = generarEstructura(P, ABERTURAS_INICIALES);
  const r = calcularPresupuesto(e, CATALOGO_INICIAL);
  return { nombre: 'Loft', params: P, vistas: todasLasVistas(e, P, resolverCatalogo(CATALOGO_INICIAL), ABERTURAS_INICIALES), ...r };
};

describe('xlsx sin librerías', () => {
  it('crc32 conocido', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
  });

  it('el archivo es un zip con las partes de un libro de Excel', () => {
    const bytes = crearXlsx([{ nombre: 'Hoja / 1', filas: [['a', 1.5], { negrita: true, celdas: ['<b>&', { pesos: 1000 }] }] }]);
    const texto = new TextDecoder().decode(bytes);
    expect(bytes[0]).toBe(0x50); // "PK"
    expect(texto).toContain('xl/workbook.xml');
    expect(texto).toContain('name="Hoja - 1"'); // "/" no se permite en el nombre de hoja
    expect(texto).toContain('&lt;b&gt;&amp;'); // escapado
  });
});

describe('libro de la obra', () => {
  const celdas = (hoja) => hoja.filas.map((f) => (Array.isArray(f) ? f : f.celdas));

  it('v1.28: 4 hojas (antes 9): Obra, Paredes (las 4), Plantas (las 3) y Cortes', () => {
    const hojas = hojasDeObra({ ...datosDeEjemplo(), resumen: [['Planta', '7.50 m x 4.50 m']], medidas: [{ nombre: 'M1', texto: '2.50 m' }] });
    expect(hojas.map((h) => h.nombre)).toEqual(['Obra', 'Paredes', 'Plantas', 'Cortes']);
    const obra = celdas(hojas[0]);
    expect(obra.some((f) => f[0] === 'Planta')).toBe(true);
    expect(obra.some((f) => f[0] === 'M1')).toBe(true);
    expect(obra.some((f) => f[0] === 'TOTAL')).toBe(true);
    const paredes = celdas(hojas[1]);
    expect(paredes.filter((f) => String(f[0]).startsWith('Pared '))).toHaveLength(4);
    expect(paredes.some((f) => f[0] === '#2' && f[1] === 'ventana')).toBe(true);
    expect(paredes.some((f) => f[0] === 'exterior')).toBe(true);
    expect(celdas(hojas[2]).filter((f) => String(f[0]).includes('vista desde arriba'))).toHaveLength(3);
  });

  it('v1.29: con plan de compra, va en la hoja Obra con el flete', () => {
    const plan = { total: 1500, nadieVende: [], compras: [{ proveedor: { id: 'b', nombre: 'Barato' }, subtotal: 1000, flete: 500, total: 1500,
      renglones: [{ id: 'osb', nombre: 'Placas OSB', cantidad: 2, unidad: 'placa', precio: 500, subtotal: 1000 }],
      materiales: [{ clave: 'osb', nombre: 'Placas OSB — OSB 18 mm', cantidad: 2, unidad: 'placa', precio: 500, subtotal: 1000, medidas: null, usos: ['Placas OSB'] }] }] };
    const obra = celdas(hojasDeObra({ ...datosDeEjemplo(), plan })[0]);
    // v1.30.2: el plan es el TOTAL DE LA OBRA; el total de la tabla es solo el del proveedor elegido.
    expect(obra.some((f) => f[0] === 'TOTAL DE LA OBRA — plan de compra (contando el flete)' && f[5].pesos === 1500)).toBe(true);
    expect(obra.some((f) => /^Total con .* \(sin lo que no vende\)$/.test(f[0]))).toBe(true);
    expect(obra.some((f) => f[0] === 'TOTAL')).toBe(false);
    expect(obra.some((f) => f[0] === '  Flete' && f[5].pesos === 500)).toBe(true);
    expect(obra.some((f) => f[0] === '  Placas OSB — OSB 18 mm' && f[2] === 2)).toBe(true); // v1.30.3: por material
  });

  it('solo lo elegido', () => {
    const hojas = hojasDeObra(datosDeEjemplo(), { presupuesto: true, paredes: false, plantas: true, cortes: false, resumen: false });
    expect(hojas.map((h) => h.nombre)).toEqual(['Obra', 'Plantas']);
    expect(hojasDeObra(datosDeEjemplo(), { paredes: true }).map((h) => h.nombre)).toEqual(['Paredes']);
  });

  it('genera el archivo', () => {
    const bytes = libroDeObra(datosDeEjemplo());
    expect(bytes.length).toBeGreaterThan(5000);
  });
});
