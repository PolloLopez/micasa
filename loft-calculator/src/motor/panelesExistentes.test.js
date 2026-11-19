// Tests de conPanelesExistentes (v1.74.1). Correr con: npm test
// Si devuelve objetos nuevos sin necesidad, cada letra en la pestaña Obra recalcula toda la obra
// (useSinCambiosSalvo deja de servir). Este test cuida eso.
import { describe, it, expect } from 'vitest';
import { conPanelesExistentes, CATALOGO_INICIAL, tiposDePanel } from './presupuesto.js';
import { igualesSalvo } from '../hooks/useSinCambiosSalvo.js';
import { PARAMS_INICIALES as P } from './parametrosIniciales.js';

describe('conPanelesExistentes', () => {
  const paneles = tiposDePanel(CATALOGO_INICIAL).map((t) => t.id);
  const base = { ...P, panelTecho: paneles[0], paredes: Object.fromEntries(Object.entries(P.paredes).map(([l, x]) => [l, { ...x, panel: paneles[0] }])) };

  it('si todo existe, devuelve el mismo objeto (no uno nuevo)', () => {
    expect(conPanelesExistentes(base, CATALOGO_INICIAL)).toBe(base);
  });
  it('cambiar el seguimiento no cambia lo de la obra (así no se recalcula la estructura)', () => {
    const antes = conPanelesExistentes(base, CATALOGO_INICIAL);
    const despues = conPanelesExistentes({ ...base, seguimiento: { ...base.seguimiento, rubros: [] } }, CATALOGO_INICIAL);
    expect(igualesSalvo(antes, despues, ['seguimiento', 'finanzas'])).toBe(true);
  });
  it('si un panel ya no existe, usa el primero (red de seguridad, como antes)', () => {
    const roto = { ...base, panelTecho: 'no-existe', paredes: { ...base.paredes, B: { ...base.paredes.B, panel: 'tampoco' } } };
    const r = conPanelesExistentes(roto, CATALOGO_INICIAL);
    expect(r.panelTecho).toBe(paneles[0]);
    expect(r.paredes.B.panel).toBe(paneles[0]);
    expect(r.paredes.A).toBe(base.paredes.A); // las que estaban bien conservan su objeto
    expect(conPanelesExistentes({ ...base, panelTecho: 'x' }, CATALOGO_INICIAL).paredes).toBe(base.paredes);
  });
});
