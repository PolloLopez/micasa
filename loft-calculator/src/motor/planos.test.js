// Tests de los planos para exportar (v1.26). Correr con: npm test
import { describe, it, expect } from 'vitest';
import { vistaDePared, vistaDePlanta, listaDePiezas, perfilDePieza, todasLasVistas } from './planos.js';
import { generarEstructura } from './estructura.js';
import { CATALOGO_INICIAL } from './presupuesto.js';
import { resolverCatalogo, nombrePerfil } from './perfiles.js';
import { PARAMS_INICIALES as P, ABERTURAS_INICIALES } from './parametrosIniciales.js';

const catalogo = resolverCatalogo(CATALOGO_INICIAL);
const e = generarEstructura(P, ABERTURAS_INICIALES);

describe('pared vista desde afuera', () => {
  const frente = vistaDePared(e, P, 'A', catalogo, ABERTURAS_INICIALES);

  it('coordenadas de la pared: x de 0 al largo, y desde el piso', () => {
    expect(frente.largo).toBe(7.5);
    const xs = frente.piezas.flatMap((p) => [p.x1, p.x2]);
    expect(Math.min(...xs)).toBeCloseTo(0);
    expect(Math.max(...xs)).toBeCloseTo(7.5);
    // El marco de piso (grupo 'piso', id marco-piso:A) es de esta pared y está a altura 0.
    const marco = frente.piezas.find((p) => p.id === 'marco-piso:A');
    expect(marco.y1).toBeCloseTo(0);
  });

  it('cotas: columnas cada 2,50 (con las puntas) y las fajas', () => {
    expect(frente.cotas.columnas).toEqual(expect.arrayContaining([0, 2.5, 5, 7.5]));
    expect(frente.cotas.fajas.length).toBeGreaterThan(0);
  });

  it('aberturas con su número de la pantalla y su posición desde la punta 1', () => {
    expect(frente.aberturas.map((a) => a.numero)).toEqual([1, 2]);
    expect(frente.aberturas[0]).toMatchObject({ tipo: 'puerta', ancho: 0.9, desde: 1 });
  });

  it('la lista de piezas suma todas las piezas de la pared, con su perfil', () => {
    const total = frente.lista.reduce((a, g) => a + g.cantidad, 0);
    expect(total).toBe(frente.piezas.length);
    expect(frente.lista.find((g) => g.nombre === 'Columna').perfil).toBe('Caño estructural 100x100x1.6');
    expect(frente.lista.some((g) => g.nombre === 'Columna de esquina')).toBe(true);
  });

  it('revestimiento exterior con las tiras (la ventana se descuenta)', () => {
    expect(frente.revestimiento[0]).toMatchObject({ cara: 'exterior', nombre: 'Panel de pared' });
    expect(frente.revestimiento[0].detalle).toMatch(/3\.25 m.*1\.10 m/);
  });
});

describe('plantas', () => {
  it('piso, entrepiso y techo; el entrepiso con su contorno', () => {
    const { plantas } = todasLasVistas(e, P, catalogo, ABERTURAS_INICIALES);
    expect(plantas.map((p) => p.nivel)).toEqual(['piso', 'piso2', 'techo']);
    const piso2 = plantas[1];
    expect(piso2.contorno).toHaveLength(4);
    expect(piso2.lista.reduce((a, g) => a + g.cantidad, 0)).toBe(piso2.piezas.length);
  });

  it('sin entrepiso no hay planta de entrepiso', () => {
    const sin = generarEstructura({ ...P, anchoEntrepiso: 0, escalera: { ...P.escalera, activa: false } }, []);
    expect(vistaDePlanta(sin, P, 'piso2', catalogo)).toBeNull();
  });
});

describe('perfil de cada pieza', () => {
  it('el de su pared manda sobre el general; el elegido a mano, sobre los dos', () => {
    const otro = catalogo.find((i) => i.categoria === 'hierro' && nombrePerfil(i) === 'Caño estructural 80x80x2.0');
    const columna = e.columnas.find((p) => !p.esquina);
    expect(perfilDePieza({ ...columna, perfilPared: otro.id }, catalogo)).toBe('Caño estructural 80x80x2.0');
    expect(perfilDePieza({ ...columna, perfilPared: otro.id, insumo: 'zanca' }, catalogo)).toBe('Caño estructural 120x60x2.0');
  });

  it('agrupa piezas iguales', () => {
    const p = { tipo: 'montante', grupos: ['A'], largo: 1.851 };
    expect(listaDePiezas([p, { ...p, largo: 1.849 }, { ...p, largo: 2 }], catalogo))
      .toEqual([{ nombre: 'Montante', perfil: 'Caño estructural 50x50x1.6', largo: 2, cantidad: 1 },
        { nombre: 'Montante', perfil: 'Caño estructural 50x50x1.6', largo: 1.85, cantidad: 2 }]);
  });
});

describe('v1.50: interiores y fundación en las plantas', () => {
  it('la planta baja trae pilotines, tabiques (con el hueco de la puerta), mesadas y muebles; el techo, nada de eso', async () => {
    const { tabiqueNuevo } = await import('./tabiques.js');
    const { mesadaNueva, muebleNuevo } = await import('./interiores.js');
    const { PARAMS_INICIALES } = await import('./parametrosIniciales.js');
    const { generarEstructura } = await import('./estructura.js');
    const { resolverCatalogo } = await import('./perfiles.js');
    const { CATALOGO_INICIAL } = await import('./presupuesto.js');
    const base = tabiqueNuevo([], 1);
    const p = { ...PARAMS_INICIALES, tabiques: [{ ...base, puerta: { ...base.puerta, tipo: 'abatir', desde: 0.5, ancho: 0.7 } }],
      mesadas: [mesadaNueva([], 1)], muebles: [muebleNuevo('cama2', [], 1)] };
    const e = generarEstructura(p, []);
    const vistas = todasLasVistas(e, p, resolverCatalogo(CATALOGO_INICIAL), []);
    const baja = vistas.plantas.find((v) => v.nivel === 'piso');
    expect(baja.pilotines.length).toBe(e.pilotines.length);
    expect(baja.tabiques[0].tramos).toHaveLength(2); // cortado en la puerta
    expect(baja.tabiques[0].puerta.tipo).toBe('abatir');
    expect(baja.mesadas.length).toBeGreaterThan(0);
    expect(baja.muebles[0].puntos).toHaveLength(4);
    // Todo adentro de la planta (0..largo, 0..ancho).
    expect(baja.muebles[0].puntos.every(([x, y]) => x >= -0.01 && x <= p.largo + 0.01 && y >= -0.01 && y <= p.ancho + 0.01)).toBe(true);
    const techo = vistas.plantas.find((v) => v.nivel === 'techo');
    expect([techo.pilotines, techo.tabiques, techo.muebles].every((l) => l.length === 0)).toBe(true);
  });
});

describe('v1.66: el borde del entrepiso apoyado en una pared sale en el plano de esa pared', () => {
  const e = generarEstructura(P, ABERTURAS_INICIALES, CATALOGO_INICIAL);
  const vistas = ['A', 'B', 'C', 'D'].map((l) => vistaDePared(e, P, l, CATALOGO_INICIAL, ABERTURAS_INICIALES));
  const delEntrepiso = (v) => v.piezas.filter((p) => p.tipo === 'marco-piso2');
  it('las paredes que tocan el entrepiso lo muestran, a la altura del piso 2 (y acotado)', () => {
    const conMarco = vistas.filter((v) => delEntrepiso(v).length > 0);
    expect(conMarco.length).toBeGreaterThanOrEqual(2); // la de apoyo y las dos laterales que cruza
    conMarco.forEach((v) => {
      delEntrepiso(v).forEach((p) => {
        expect(p.y1).toBeCloseTo(p.y2);
        expect(p.y1).toBeGreaterThan(1.5);
        expect(v.cotas.fajas.some((y) => Math.abs(y - p.y1) < 1e-6)).toBe(true);
        // dentro de la pared, a lo largo
        expect(Math.min(p.x1, p.x2)).toBeGreaterThan(-0.15);
        expect(Math.max(p.x1, p.x2)).toBeLessThan(v.largo + 0.15);
      });
    });
  });
  it('la viga de cierre (adentro, lejos de las paredes) no sale en ninguna', () => {
    vistas.forEach((v) => expect(v.piezas.some((p) => p.tipo === 'viga-cierre')).toBe(false));
  });
});

describe('v1.82.2: el plano de la pared muestra las mismas tiras que el 3D y la hoja de corte', () => {
  it('con el panel por tira entera, cada pedazo del plano dice la tira de donde sale (la misma que en el presupuesto)', async () => {
    const { calcularPresupuesto } = await import('./presupuesto.js');
    const catalogo = CATALOGO_INICIAL.map((i) => (i.categoria === 'panel' ? { ...i, venta: 'medida', cobro: 'tira', largoTira: 6, anchoUtil: 1, largoMaximo: 12 } : i));
    const e = generarEstructura(P, ABERTURAS_INICIALES);
    const vista = vistaDePared(e, P, 'A', catalogo, ABERTURAS_INICIALES);
    const pedazos = vista.paneles.pedazosTira;
    expect(pedazos.length).toBeGreaterThan(0);
    const item = calcularPresupuesto(e, catalogo, { proveedor: 'prov-1' }).items.find((i) => i.tirasPorPared && i.cantidad > 0);
    const deA = item.tirasPorPared.find((g) => g.donde === 'lado A');
    const tiraEnPresupuesto = new Map(deA.tiras.flatMap((t) => t.piezas.map((x) => [x.id, t.n])));
    pedazos.forEach((p) => expect(p.n).toBe(tiraEnPresupuesto.get(p.id)));
    // Por m², el plano sigue con el número de cada columna (no hay tiras enteras).
    expect(vistaDePared(e, P, 'A', CATALOGO_INICIAL, ABERTURAS_INICIALES).paneles?.pedazosTira ?? null).toBeNull();
  });
});
