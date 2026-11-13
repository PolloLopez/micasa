// Tests de las finanzas (v1.54): cuotas con meses dobles, terreno en dólares, acreedores y el checklist de los rubros.
import { describe, it, expect } from 'vitest';
import {
  calendarioDeCuotas, estadoDeCuotas, textoDeCuotas, sumarMeses, compromisoNuevo, pagoDeCompromisoNuevo, cuentasDelCompromiso,
  acreedorNuevo, devolucionNueva, deudasConAcreedores, resumenDeFinanzas, validarFinanzas, completarFinanzas, FINANZAS_INICIALES,
} from './finanzas.js';
import { rubroNuevo, pagoNuevo, cuentasDelRubro, etapaDelRubro, totalesPorQuien, completarSeguimiento, validarSeguimiento, informeDeSeguimiento } from './seguimiento.js';
import { validarParametros } from './validacion.js';
import { migrarParams } from './migracion.js';
import { PARAMS_INICIALES } from './parametrosIniciales.js';

const plan = { cantidad: 12, monto: 400, inicio: '2026-03', mesesDobles: [6, 12] };

describe('cuotas', () => {
  it('mensuales e iguales; en junio y diciembre, doble', () => {
    expect(sumarMeses('2026-11', 3)).toBe('2027-02');
    const c = calendarioDeCuotas(plan);
    expect(c).toHaveLength(12);
    expect(c[0]).toEqual({ n: 1, mes: '2026-03', monto: 400, doble: false });
    expect(c.filter((x) => x.doble).map((x) => x.mes)).toEqual(['2026-06', '2026-12']);
    expect(c.reduce((a, x) => a + x.monto, 0)).toBe(14 * 400);
  });

  it('pagas, vencidas y la próxima; un pago sin número va a la primera que falta', () => {
    const pagos = [{ monto: 400, cuota: 1 }, { monto: 400, cuota: null }, { monto: 200, cuota: 3 }];
    const e = estadoDeCuotas(plan, pagos, '2026-05');
    expect(e.pagas).toBe(2);
    expect(e.vencidasImpagas).toBe(1); // la 3 (mayo) está a medias
    expect(e.proxima).toMatchObject({ n: 3, pagado: 200 });
    expect(textoDeCuotas(e, 'USD')).toBe('2 de 12 cuotas pagas · ⚠ debés 1 cuota vencida · próxima: cuota 3, may 2026, USD 200');
  });
});

describe('el terreno en dólares y los acreedores', () => {
  // Pedido de Leandro: el anticipo y las primeras cuotas se las prestaron.
  const armar = () => {
    const juan = acreedorNuevo([], 'Juan');
    const terreno = { ...compromisoNuevo([]), anticipo: 5000, cuotas: plan, pagos: [
      { ...pagoDeCompromisoNuevo([], { monto: 5000, cuota: 0, fecha: '2026-02-20' }), acreedor: juan.id },
      { ...pagoDeCompromisoNuevo([{ id: 1 }], { monto: 400, cuota: 1, fecha: '2026-03-10' }), acreedor: juan.id },
      pagoDeCompromisoNuevo([{ id: 2 }], { monto: 400, cuota: 2, fecha: '2026-04-10' }),
    ] };
    return { compromisos: [terreno], acreedores: [{ ...juan, devoluciones: [devolucionNueva([], { monto: 1000, moneda: 'USD', fecha: '2026-06-01' })] }] };
  };

  it('el total es anticipo + cuotas; lo pagado y lo que falta, en dólares', () => {
    const f = armar();
    expect(f.compromisos[0]).toMatchObject({ nombre: 'Terreno', moneda: 'USD' });
    const k = cuentasDelCompromiso(f.compromisos[0], '2026-04');
    expect(k).toMatchObject({ total: 5000 + 5600, pagado: 5800, falta: 4800, anticipoPagado: 5000 });
    expect(k.cuotas.pagas).toBe(2);
    expect(resumenDeFinanzas(f, '2026-04')).toEqual({ USD: { total: 10600, pagado: 5800, falta: 4800, cuotasVencidas: 0 } });
  });

  it('a Juan le debés lo que pagó por vos menos lo que le devolviste (en dólares, aparte de los pesos)', () => {
    const f = armar();
    const rubro = { ...rubroNuevo([], { nombre: 'Electricista' }), pagos: [{ ...pagoNuevo([], 100000, '2026-07-01'), acreedor: 1 }] };
    const [juan] = deudasConAcreedores(f, [rubro]);
    expect(juan.porMoneda).toEqual({ USD: { prestado: 5400, devuelto: 1000, debes: 4400 }, ARS: { prestado: 100000, devuelto: 0, debes: 100000 } });
    expect(juan.detalle.map((d) => d.que)).toEqual(['Terreno — anticipo', 'Terreno — cuota 1', 'Electricista']);
  });

  it('se valida; un pago con un acreedor que no existe no vale; los proyectos de antes arrancan vacíos', () => {
    expect(validarFinanzas(armar())).toEqual({});
    const f = armar();
    expect(validarFinanzas({ ...f, acreedores: [] })).toHaveProperty(['finanzas.compromisos.0']);
    expect(validarFinanzas({ ...f, compromisos: [{ ...f.compromisos[0], moneda: 'EUR' }] })).toHaveProperty(['finanzas.compromisos.0']);
    expect(validarFinanzas({ ...f, compromisos: [{ ...f.compromisos[0], cuotas: { ...plan, cantidad: 0 } }] })).toHaveProperty(['finanzas.compromisos.0']);
    const { finanzas, ...viejo } = PARAMS_INICIALES;
    expect(finanzas).toEqual(FINANZAS_INICIALES);
    const migrado = migrarParams(viejo);
    expect(migrado.finanzas).toEqual(FINANZAS_INICIALES);
    expect(validarParametros({ ...migrado, finanzas: completarFinanzas(armar()) })).toEqual({});
  });
});

describe('checklist de los rubros (avance a mano, etapa sola)', () => {
  const r = { ...rubroNuevo([], { nombre: 'Tapial', quien: 'Pedro' }), presupuestado: 1000000 };
  const etapa = (x) => etapaDelRubro(x, cuentasDelRubro(x), '2026-11');

  it('presupuestado → en proceso → finalizado (falta pagar) → finalizado y pagado; y pagado sin finalizar', () => {
    expect(etapa(r)).toMatchObject({ etapa: 'presupuestado', texto: 'Presupuestado' });
    const enProceso = { ...r, avance: 40, pagos: [pagoNuevo([], 250000)] };
    expect(etapa(enProceso)).toMatchObject({ etapa: 'enProceso', texto: 'En proceso · 40 % hecho · 25 % pagado' });
    expect(etapa({ ...enProceso, avance: 100 })).toMatchObject({ etapa: 'finalizadoFaltaPagar', texto: 'Finalizado, falta pagar · 25 % pagado' });
    const todo = [pagoNuevo([], 1000000)];
    expect(etapa({ ...r, avance: 100, pagos: todo }).etapa).toBe('finalizadoPagado');
    expect(etapa({ ...r, avance: 60, pagos: todo })).toMatchObject({ etapa: 'pagadoSinFinalizar', texto: 'Pagado sin finalizar · 60 % hecho' });
  });

  it('con cuotas, dice cuántas faltan y si debés alguna', () => {
    const x = { ...r, avance: 50, cuotas: { cantidad: 4, monto: 250000, inicio: '2026-09', mesesDobles: [] },
      pagos: [{ ...pagoNuevo([], 250000), cuota: 1 }] };
    expect(etapa(x).texto).toBe('En proceso · 50 % hecho · 25 % pagado · 1 de 4 cuotas pagas · ⚠ debés 2 cuotas vencidas · próxima: cuota 2, oct 2026, $ 250.000');
  });

  it('los de antes: terminado = 100 % hecho; total por proveedor o contratista', () => {
    const s = completarSeguimiento({ rubros: [{ ...r, estado: 'terminado', avance: undefined }, { ...r, id: 2, quien: 'pedro ', presupuestado: 500000, pagos: [pagoNuevo([], 100000)] }] });
    expect(s.rubros[0].avance).toBe(100);
    expect(validarSeguimiento(s)).toEqual({});
    expect(totalesPorQuien(s)).toEqual([{ quien: 'Pedro', rubros: ['Tapial', 'Tapial'], contratado: 1500000, pagado: 100000, falta: 1400000 }]);
    expect(informeDeSeguimiento(s).rubros[0].estado).toBe('Finalizado, falta pagar · 0 % pagado');
    expect(validarSeguimiento({ rubros: [{ ...s.rubros[0], avance: 120 }] })).toHaveProperty(['seguimiento.rubros.0']);
  });
});

describe('finanzas en el PDF y el Excel', () => {
  it('el informe trae los compromisos y los acreedores; el Excel los lista', async () => {
    const { informeDeFinanzas } = await import('./finanzas.js');
    const { hojasDeObra } = await import('../proyecto/exportarExcel.js');
    const juan = acreedorNuevo([], 'Juan');
    const terreno = { ...compromisoNuevo([]), cuotas: plan, pagos: [{ ...pagoDeCompromisoNuevo([], { monto: 400, cuota: 1, fecha: '2026-03-01' }), acreedor: 1 }] };
    const f = { compromisos: [terreno], acreedores: [juan] };
    expect(informeDeFinanzas(FINANZAS_INICIALES)).toBeNull();
    const inf = informeDeFinanzas(f, [], '2026-03');
    expect(inf.compromisos[0]).toMatchObject({ nombre: 'Terreno', moneda: 'USD', total: 5600, pagado: 400, falta: 5200 });
    expect(inf.acreedores).toEqual([{ nombre: 'Juan', debes: 'USD 400' }]);
    const seguimiento = informeDeSeguimiento({ rubros: [] }, [], f);
    const hojas = hojasDeObra({ nombre: 'x', params: PARAMS_INICIALES, vistas: { paredes: [], plantas: [] }, items: [], total: 0, seguimiento }, { seguimiento: true });
    const filas = hojas[0].filas.map((x) => (Array.isArray(x) ? x : x.celdas));
    expect(filas.some((x) => x[0] === 'Terreno' && x[1] === 'USD' && x[3] === 5600)).toBe(true);
    expect(filas.some((x) => x[0] === 'Juan' && x[1] === 'USD 400')).toBe(true);
  });
});
