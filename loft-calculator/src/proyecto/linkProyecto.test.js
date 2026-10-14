// Tests del link para compartir un proyecto. Correr con: npm test
import { describe, it, expect } from 'vitest';
import { crearLinkProyecto, leerLinkProyecto, empaquetar, desempaquetar, tieneProyectoEnLink, PREFIJO_HASH } from './linkProyecto.js';
import { proyectoEjemplo, gradaEjemplo, montajeEjemplo } from './proyectosBase.js';

const BASE = 'https://pollolopez.github.io/micasa/';
const hashDe = (link) => link.slice(link.indexOf('#'));

describe('link para compartir', () => {
  it('ida y vuelta: el proyecto llega con las mismas medidas, aberturas, precios y colores', async () => {
    const original = { ...proyectoEjemplo(), nombre: 'Loft de Leandro' };
    original.params.largo = 8.25;
    const link = await crearLinkProyecto(original, BASE);
    expect(link.startsWith(`${BASE}${PREFIJO_HASH}z`)).toBe(true);
    const r = await leerLinkProyecto(hashDe(link));
    expect(r.ok).toBe(true);
    expect(r.proyecto.nombre).toBe('Loft de Leandro');
    expect(r.proyecto.params.largo).toBe(8.25);
    expect(r.proyecto.aberturas).toEqual(original.aberturas);
    expect(r.proyecto.catalogo.find((i) => i.id === 'columna').precio).toBe(original.catalogo.find((i) => i.id === 'columna').precio);
  });

  it('el link es corto (comprimido) y sin caracteres raros', async () => {
    const link = await crearLinkProyecto(proyectoEjemplo(), BASE);
    expect(link.length).toBeLessThan(8000);
    expect(hashDe(link).slice(PREFIJO_HASH.length)).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('también grada y montaje', async () => {
    for (const p of [gradaEjemplo(), montajeEjemplo()]) {
      const r = await leerLinkProyecto(hashDe(await crearLinkProyecto(p, BASE)));
      expect(r.ok).toBe(true);
      expect(r.proyecto.params.tipoProyecto).toBe(p.params.tipoProyecto);
    }
  });

  it('sin compresión ("j") también se lee', async () => {
    const texto = 'Hola ñandú';
    expect(await desempaquetar(await empaquetar(texto))).toBe(texto);
    const crudo = `j${btoa(unescape(encodeURIComponent(texto))).replace(/=+$/, '')}`;
    expect(await desempaquetar(crudo)).toBe(texto);
  });

  it('link roto o cortado: error claro, sin romper la app', async () => {
    const link = await crearLinkProyecto(proyectoEjemplo(), BASE);
    const cortado = hashDe(link).slice(0, 80);
    expect((await leerLinkProyecto(cortado)).error).toMatch(/incompleto o roto|no es un proyecto/);
    expect((await leerLinkProyecto('#otra-cosa')).ok).toBe(false);
    expect(tieneProyectoEnLink('#proyecto=zabc')).toBe(true);
    expect(tieneProyectoEnLink('')).toBe(false);
  });
});

describe('tipos de panel con color interior y exterior', () => {
  it('un catálogo viejo (un solo color) toma el interior de fábrica y conserva el exterior', async () => {
    const { normalizarCatalogo } = await import('../motor/migracion.js');
    const viejo = [{ id: 'panelMuros', categoria: 'panel', nombre: 'Muro', perfil: '', precio: 1, color: '#123456' }];
    const panel = normalizarCatalogo(viejo).find((p) => p.id === 'panelMuros');
    expect(panel.color).toBe('#123456');
    expect(panel.colorInterior).toBe('#e5e7eb');
  });

  it('el color interior viaja en el link', async () => {
    const p = proyectoEjemplo();
    p.catalogo = p.catalogo.map((i) => (i.id === 'panelTecho' ? { ...i, colorInterior: '#8b5cf6' } : i));
    const r = await leerLinkProyecto(hashDe(await crearLinkProyecto(p, BASE)));
    expect(r.proyecto.catalogo.find((i) => i.id === 'panelTecho').colorInterior).toBe('#8b5cf6');
  });
});
