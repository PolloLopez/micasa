// Tests del resumen de la obra (v1.28). Correr con: npm test
import { describe, it, expect } from 'vitest';
import { resumenDeObra } from './resumenObra.js';
import { generarEstructura } from '../motor/estructura.js';
import { CATALOGO_INICIAL } from '../motor/presupuesto.js';
import { PARAMS_INICIALES as P, ABERTURAS_INICIALES } from '../motor/parametrosIniciales.js';

const resumen = (params = P) => Object.fromEntries(resumenDeObra({
  params, estructura: generarEstructura(params, ABERTURAS_INICIALES), aberturas: ABERTURAS_INICIALES, catalogo: CATALOGO_INICIAL,
}));

describe('resumen de la obra', () => {
  it('planta, alturas, techo, pisos, cada pared y aberturas en pocos renglones', () => {
    const r = resumen();
    expect(r.Planta).toBe('7.50 m x 4.50 m · frente: lado A');
    expect(r.Alturas).toContain('lado alto 4.95 m');
    expect(r.Techo).toContain('vigas cada 1.00 m (7)');
    expect(r.Techo).toContain('con marco perimetral');
    expect(r['Pared Frente (A)']).toContain('columnas cada 2.50 m (4)');
    expect(r.Aberturas).toContain('#1 puerta 0.90x2.05 en A');
    expect(Object.keys(r).length).toBeLessThan(15);
  });

  it('lo cargado por cantidad se muestra así', () => {
    const r = resumen({ ...P, cantidades: { 'paredes.A.separacionVerticales': 6, 'paredes.A.separacionMontantes': 2 } });
    expect(r['Pared Frente (A)']).toContain('columnas 6 (cada 1.50 m)');
    expect(r['Pared Frente (A)']).toContain('montantes 2 por vano');
  });

  it('sin entrepiso lo dice; grada y montaje, solo el tipo', () => {
    expect(resumen({ ...P, anchoEntrepiso: 0, escalera: { ...P.escalera, activa: false } }).Entrepiso).toBe('no lleva');
    expect(resumenDeObra({ params: { ...P, tipoProyecto: 'grada' } })).toEqual([['Tipo', 'Grada para espectadores']]);
  });
});
