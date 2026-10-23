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
  it('presupuesto, 4 paredes, 3 plantas y cortes', () => {
    const hojas = hojasDeObra(datosDeEjemplo());
    expect(hojas.map((h) => h.nombre)).toEqual([
      'Presupuesto', 'Pared Frente (A)', 'Pared Lateral derecho (B)', 'Pared Fondo (C)', 'Pared Lateral izquierdo (D)',
      'Piso (planta baja)', 'Entrepiso (piso 2)', 'Techo', 'Cortes',
    ]);
    const frente = hojas[1].filas.map((f) => (Array.isArray(f) ? f : f.celdas));
    expect(frente.some((f) => f[0] === '#2' && f[1] === 'ventana')).toBe(true);
    expect(frente.some((f) => f[0] === 'exterior')).toBe(true);
  });

  it('genera el archivo', () => {
    const bytes = libroDeObra(datosDeEjemplo());
    expect(bytes.length).toBeGreaterThan(5000);
  });
});
