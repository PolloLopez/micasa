// ==========================================================
// PRESUPUESTO
// ----------------------------------------------------------
// Convierte la estructura (piezas y superficies) en cantidades a
// comprar, usando el catálogo (largo comercial y precio de cada insumo).
//
// El catálogo tiene dos partes:
//   - Insumos FIJOS (perfiles, OSB, pilotines): IDs fijos porque el
//     cálculo sabe qué pieza va con cada uno.
//   - TIPOS DE PANEL (categoria 'panel'): lista libre; cada pared y el
//     techo eligen uno. Se pueden agregar o quitar.
// ==========================================================

import { armarListaDePerfiles, resolverCatalogo, nombrePerfil, kgPorMetro } from './perfiles.js';
import { compartirCortes } from './cortesCompartidos.js';
import { optimizarCortes } from './optimizadorCortes.js';
import { listarPiezas } from './estructura.js';
import { INSUMO, PLACA_OSB, DESPERDICIO_PLACAS } from './constantes.js';
import { cuentaRevestimiento, REVESTIMIENTO_POR_DEFECTO } from './revestimientos.js';

/** Insumos fijos. El perfil y el precio se editan desde la pantalla. */
export const CATALOGO_FIJO = [
  { id: INSUMO.COLUMNA, categoria: 'perfil', nombre: 'Columnas', perfil: 'Caño estructural 100x100x1.6', unidad: 'barra', largoBarra: 6, precio: 38000 },
  // v1.22: las columnas de esquina son de dos paredes: renglón propio (arranca igual que Columnas).
  { id: INSUMO.COLUMNA_ESQUINA, categoria: 'perfil', nombre: 'Columnas de esquina', perfil: 'Caño estructural 100x100x1.6', unidad: 'barra', largoBarra: 6, precio: 38000 },
  // v1.17: montantes (verticales livianos entre columnas) y montantes de dintel / de antepecho.
  { id: INSUMO.MONTANTE, categoria: 'perfil', nombre: 'Montantes', perfil: 'Caño estructural 50x50x1.6', unidad: 'barra', largoBarra: 6, precio: 18000 },
  // v1.14.1: dintel, jambas y alféizar de las aberturas en su propio renglón (antes iban con las columnas).
  // Arranca con el mismo perfil que las columnas; el herrero pone el que use.
  { id: INSUMO.MARCO_ABERTURA, categoria: 'perfil', nombre: 'Marcos de aberturas', perfil: 'Caño estructural 100x100x1.6', unidad: 'barra', largoBarra: 6, precio: 38000 },
  { id: INSUMO.MARCO, categoria: 'perfil', nombre: 'Marcos y soleras', perfil: 'Perfil C 120x50x2.0', unidad: 'barra', largoBarra: 6, precio: 35000 },
  // v1.14: borde libre del entrepiso. Arranca igual que los marcos; el perfil lo elige el herrero.
  { id: INSUMO.VIGA_CIERRE, categoria: 'perfil', nombre: 'Viga de cierre del entrepiso', perfil: 'Perfil C 120x50x2.0', unidad: 'barra', largoBarra: 6, precio: 35000 },
  { id: INSUMO.PISO, categoria: 'perfil', nombre: 'Estructura de piso', perfil: 'Perfil C 100x45x2.0', unidad: 'barra', largoBarra: 6, precio: 26000 },
  { id: INSUMO.TRANSVERSAL_PISO, categoria: 'perfil', nombre: 'Transversales de piso', perfil: 'Perfil C 80x40x1.6', unidad: 'barra', largoBarra: 6, precio: 22000 },
  { id: INSUMO.PISO_2, categoria: 'perfil', nombre: 'Estructura de piso 2', perfil: 'Perfil C 100x45x2.0', unidad: 'barra', largoBarra: 6, precio: 26000 },
  { id: INSUMO.TRANSVERSAL_PISO_2, categoria: 'perfil', nombre: 'Transversales de piso 2', perfil: 'Perfil C 80x40x1.6', unidad: 'barra', largoBarra: 6, precio: 22000 },
  { id: INSUMO.CORREA, categoria: 'perfil', nombre: 'Horizontales de pared', perfil: 'Perfil C 80x40x1.6', unidad: 'barra', largoBarra: 6, precio: 22000 },
  { id: INSUMO.VIGA_TECHO, categoria: 'perfil', nombre: 'Vigas de techo', perfil: 'Perfil C 120x50x2.0', unidad: 'barra', largoBarra: 6, precio: 35000 },
  { id: INSUMO.CORREA_TECHO, categoria: 'perfil', nombre: 'Correas de techo', perfil: 'Perfil C 80x40x1.6', unidad: 'barra', largoBarra: 6, precio: 22000 },
  { id: INSUMO.OSB, categoria: 'placa', nombre: 'Placas OSB', perfil: 'OSB 18 mm 2.44x1.22', unidad: 'placa', largoBarra: null, precio: 28000 },
  { id: INSUMO.PILOTIN, categoria: 'unidad', nombre: 'Pilotines', perfil: 'Pilotín de hormigón', unidad: 'u', largoBarra: null, precio: 15000 },
  // Escalera
  { id: INSUMO.ZANCA, categoria: 'perfil', nombre: 'Zanca y marco de descanso', perfil: 'Caño estructural 120x60x2.0', unidad: 'barra', largoBarra: 6, precio: 42000 },
  { id: INSUMO.APOYO_ESCALON, categoria: 'perfil', nombre: 'Apoyos de escalón', perfil: 'Ángulo 1 1/2" x 3/16"', unidad: 'barra', largoBarra: 6, precio: 18000 },
  { id: INSUMO.COLUMNA_ESCALERA, categoria: 'perfil', nombre: 'Columnas de escalera', perfil: 'Caño estructural 80x80x2.0', unidad: 'barra', largoBarra: 6, precio: 30000 },
  { id: INSUMO.ESCALON, categoria: 'unidad', nombre: 'Escalones de madera', perfil: 'Tablón 2" (ancho x huella)', unidad: 'u', largoBarra: null, precio: 20000 },
  { id: INSUMO.PISO_DESCANSO, categoria: 'placa', nombre: 'Piso del descanso', perfil: 'Madera 2"', unidad: 'm²', largoBarra: null, precio: 60000 },
  // Riostras (cruces de San Andrés): escalera y grada
  { id: INSUMO.RIOSTRA, categoria: 'perfil', nombre: 'Riostras en cruz', perfil: 'Ángulo 1 1/4" x 1/8"', unidad: 'barra', largoBarra: 6, precio: 12000 },
  // Grada
  { id: INSUMO.GRADA_ZANCA, categoria: 'perfil', nombre: 'Zancas de grada', perfil: 'Caño estructural 100x50x2.0', unidad: 'barra', largoBarra: 6, precio: 34000 },
  { id: INSUMO.GRADA_PARANTE, categoria: 'perfil', nombre: 'Parantes de grada', perfil: 'Caño estructural 60x60x2.0', unidad: 'barra', largoBarra: 6, precio: 25000 },
  { id: INSUMO.GRADA_APOYO, categoria: 'perfil', nombre: 'Apoyos de fila', perfil: 'Caño estructural 60x40x1.6', unidad: 'barra', largoBarra: 6, precio: 19000 },
  { id: INSUMO.GRADA_VIGA, categoria: 'perfil', nombre: 'Vigas longitudinales', perfil: 'Caño estructural 80x40x2.0', unidad: 'barra', largoBarra: 6, precio: 27000 },
  { id: INSUMO.GRADA_ASIENTO, categoria: 'metro', nombre: 'Tablón de asiento', perfil: 'Madera 2" x 12"', unidad: 'm', largoBarra: null, precio: 9000 },
  { id: INSUMO.GRADA_PIE, categoria: 'metro', nombre: 'Tablón de pie', perfil: 'Madera 2" x 12"', unidad: 'm', largoBarra: null, precio: 9000 },
  // Montaje industrial
  { id: INSUMO.MONTAJE_PATA, categoria: 'perfil', nombre: 'Patas y cunas', perfil: 'Caño estructural 50x50x2.0', unidad: 'barra', largoBarra: 6, precio: 21000 },
  { id: INSUMO.MONTAJE_MARCO, categoria: 'perfil', nombre: 'Marcos y travesaños', perfil: 'Caño estructural 40x40x1.6', unidad: 'barra', largoBarra: 6, precio: 15000 },
  { id: INSUMO.MONTAJE_CHAPA_TANQUE, categoria: 'unidad', nombre: 'Chapa para tanques', perfil: 'Chapa lisa 3 mm 2.44 x 1.22', unidad: 'chapas', largoBarra: null, precio: 95000 },
  { id: INSUMO.MONTAJE_CHAPA_MESA, categoria: 'unidad', nombre: 'Chapa para tapas de mesa', perfil: 'Chapa lisa 2 mm 2.44 x 1.22', unidad: 'chapas', largoBarra: null, precio: 65000 },
  { id: INSUMO.MONTAJE_MADERA, categoria: 'placa', nombre: 'Tapas de madera', perfil: 'Fenólico 18 mm', unidad: 'm²', largoBarra: null, precio: 25000 },
  { id: INSUMO.MONTAJE_SOLDADURA, categoria: 'metro', nombre: 'Soldadura de chapa', perfil: 'Cordón continuo', unidad: 'm', largoBarra: null, precio: 2500 },
  { id: INSUMO.GRADA_UNION, categoria: 'perfil', nombre: 'Uniones de parantes', perfil: 'Caño estructural 40x40x1.6', unidad: 'barra', largoBarra: 6, precio: 15000 },
  { id: INSUMO.GRADA_RESPALDO, categoria: 'metro', nombre: 'Tablón de respaldo', perfil: 'Madera 1" x 6"', unidad: 'm', largoBarra: null, precio: 5000 },
  { id: INSUMO.GRADA_BULON, categoria: 'unidad', nombre: 'Bulones de unión de módulos', perfil: 'Bulón 3/8" x 2 1/2" c/tuerca y arandela', unidad: 'u', largoBarra: null, precio: 900 },
  { id: INSUMO.GRADA_TORNILLO, categoria: 'unidad', nombre: 'Tornillos de tablones', perfil: 'Bulón carrocero 5/16" x 3"', unidad: 'u', largoBarra: null, precio: 600 },
  { id: INSUMO.GRADA_TABLON, categoria: 'metro', nombre: 'Tablones de grada', perfil: 'Madera 2" x 10"', unidad: 'm', largoBarra: null, precio: 8000 },
];

/** Renglones que solo se usan en un proyecto de grada. */
export const INSUMOS_GRADA = [
  INSUMO.GRADA_ZANCA, INSUMO.GRADA_PARANTE, INSUMO.GRADA_APOYO, INSUMO.GRADA_VIGA, INSUMO.GRADA_ASIENTO, INSUMO.GRADA_PIE,
  INSUMO.GRADA_TABLON, INSUMO.GRADA_UNION, INSUMO.GRADA_RESPALDO, INSUMO.GRADA_BULON, INSUMO.GRADA_TORNILLO,
];

/** Renglones que solo se usan en un proyecto de montaje. */
export const INSUMOS_MONTAJE = [
  INSUMO.MONTAJE_PATA, INSUMO.MONTAJE_MARCO, INSUMO.MONTAJE_CHAPA_TANQUE, INSUMO.MONTAJE_CHAPA_MESA,
  INSUMO.MONTAJE_MADERA, INSUMO.MONTAJE_SOLDADURA,
];

/** Tipos de panel iniciales: uno para paredes y otro para el techo. */
export const TIPOS_PANEL_INICIALES = [
  // color = cara exterior; colorInterior = cara de adentro (los paneles PUR suelen ser blancos por dentro).
  // v1.15: cada tipo dice cómo se vende (a medida / estándar) y dónde va (ver motor/revestimientos.js).
  { id: 'panelMuros', categoria: 'panel', nombre: 'Panel de pared', perfil: 'Panel PUR 50 mm', unidad: 'm²', largoBarra: null, precio: 35000, color: '#10b981', colorInterior: '#e5e7eb', ...REVESTIMIENTO_POR_DEFECTO },
  { id: 'panelTecho', categoria: 'panel', nombre: 'Panel de techo', perfil: 'Panel PUR techo 50 mm', unidad: 'm²', largoBarra: null, precio: 38000, color: '#14b8a6', colorInterior: '#e5e7eb', ...REVESTIMIENTO_POR_DEFECTO },
];

/**
 * Catálogo de fábrica (v1.21): los usos apuntan a una lista de perfiles armada con
 * los perfiles de arriba (los que se repiten, como el C 80x40x1.6, quedan como UNO).
 */
const fabrica = armarListaDePerfiles(CATALOGO_FIJO.filter((i) => i.categoria === 'perfil'));
export const PERFILES_INICIALES = fabrica.perfiles;
export const CATALOGO_INICIAL = [
  ...CATALOGO_FIJO.map((i) => fabrica.usos.find((u) => u.id === i.id) ?? i),
  ...TIPOS_PANEL_INICIALES,
  ...PERFILES_INICIALES,
];

/** Tipos de panel del catálogo. */
export const tiposDePanel = (catalogo) => catalogo.filter((p) => p.categoria === 'panel');

const buscar = (catalogo, id) => catalogo.find((p) => p.id === id);
const largos = (piezas) => piezas.map((p) => p.largo);

/**
 * Ítem de perfil: la cantidad de barras sale del optimizador de cortes.
 * Las barras vienen un `excedente` % más largas que su largo nominal,
 * y el optimizador corta sobre ese largo real.
 */
function itemPerfil(producto, piezas, excedente) {
  const largoReal = producto.largoBarra * (1 + excedente / 100);
  const cortes = optimizarCortes(piezas, largoReal);
  const detalle = piezas.length === 0
    ? 'no lleva'
    : `${piezas.length} piezas · desperdicio ${cortes.porcentajeDesperdicio.toFixed(1)} %` +
      (cortes.piezasEmpalmadas > 0 ? ` · ${cortes.piezasEmpalmadas} empalmadas` : '');
  // largosPiezas: para volver a optimizar junto con otros renglones del mismo perfil (cortesCompartidos.js).
  return { ...producto, cantidad: cortes.totalBarras, detalle, cortes, largoReal, largosPiezas: piezas };
}

/** Ítem simple: cantidad ya calculada. */
function itemSimple(producto, cantidad, detalle) {
  return { ...producto, cantidad, detalle, cortes: null };
}

/**
 * Paños que usa cada tipo de revestimiento: cada pared por fuera (y por
 * dentro si lleva revestimiento interior) y el techo.
 * @returns {Object<string, object[]>} id del tipo => paños (ver revestimientos.js)
 */
function panosPorRevestimiento(estructura) {
  const panos = {};
  const sumar = (id, pano) => {
    if (!id) return;
    (panos[id] ??= []).push(pano);
  };
  estructura.paredes.forEach((p) => {
    const pano = { largo: p.largo, h1: p.alturas[0], h2: p.alturas[1], neto: p.superficieNeta, huecos: p.huecos ?? [] };
    sumar(p.panel, { ...pano, donde: `lado ${p.lado}` });
    sumar(p.panelInterior, { ...pano, donde: `lado ${p.lado} (interior)` });
  });
  const t = estructura.techo;
  sumar(t.panel, { largo: t.largo, h1: t.largoFaldon, h2: t.largoFaldon, neto: t.superficie, donde: 'techo' });
  return panos;
}

/**
 * @param {object} estructura - resultado de generarEstructura()
 * @param {object[]} catalogo - insumos fijos + tipos de panel
 * @param {{ excedenteBarras?: number, compartir?: boolean }} opciones
 *   excedenteBarras: % extra de largo de las barras;
 *   compartir (v1.19.1): renglones del mismo perfil comparten barras (por defecto sí).
 * @returns {{items: object[], total: number, gruposCortes: object[]}}
 */
export function calcularPresupuesto(estructura, catalogo, { excedenteBarras = 0, compartir = true } = {}) {
  // v1.21: cada uso toma nombre, largo de barra y precio de su perfil de la lista.
  const r = calcularRenglones(estructura, resolverCatalogo(catalogo), excedenteBarras);
  return conCortesCompartidos(r, compartir);
}

/**
 * Cortes compartidos entre renglones del mismo perfil y subtotales.
 * Sin compartir, cada renglón es su propio grupo en el diagrama.
 */
function conCortesCompartidos(items, compartir) {
  if (compartir) {
    const r = compartirCortes(items);
    return { ...conSubtotales(r.items), gruposCortes: r.grupos };
  }
  const gruposCortes = items.filter((i) => i.cortes && i.cortes.totalBarras > 0).map((i) => ({
    id: i.id, perfil: i.perfil, largoBarra: i.largoBarra, largoReal: i.largoReal,
    renglones: [{ id: i.id, nombre: i.nombre }], cortes: i.cortes, barrasSeparadas: i.cortes.totalBarras, compartido: false,
  }));
  return { ...conSubtotales(items), gruposCortes };
}

/** Renglones del presupuesto, cada perfil con sus barras calculadas por separado. */
function calcularRenglones(estructura, catalogo, excedenteBarras) {
  const e = estructura;
  const s = e.superficies;
  const insumo = (id) => buscar(catalogo, id);
  // Piezas editadas a mano con otro perfil (`pieza.insumo`) salen de su renglón
  // y se suman al renglón elegido.
  const reasignadas = listarPiezas(e).filter((p) => p.insumo);
  const propias = (piezas) => piezas.filter((p) => !p.insumo);

  // v1.22: piezas de una pared con perfil propio (`perfilPared`) salen de su renglón y van a un
  // renglón aparte con ese perfil, ej. "Columnas (lado B)" con Caño 60x60. Se guardan acá y se
  // insertan justo debajo de su renglón al final.
  const derivados = new Map();
  const perfilDeLista = (id) => catalogo.find((i) => i.categoria === 'hierro' && i.id === id);
  const perfil = (id, piezas) => {
    const producto = insumo(id);
    const deEsteRenglon = propias(piezas);
    const otroPerfil = (p) => p.perfilPared && p.perfilPared !== producto.perfilId && perfilDeLista(p.perfilPared);
    const porPerfil = new Map();
    deEsteRenglon.filter(otroPerfil).forEach((p) => {
      if (!porPerfil.has(p.perfilPared)) porPerfil.set(p.perfilPared, []);
      porPerfil.get(p.perfilPared).push(p);
    });
    derivados.set(id, [...porPerfil.entries()].map(([perfilId, ps]) => itemPerfil(
      renglonDePared(producto, perfilDeLista(perfilId), ps), largos(ps), excedenteBarras)));
    const resto = deEsteRenglon.filter((p) => !otroPerfil(p));
    return itemPerfil(producto, largos([...resto, ...reasignadas.filter((p) => p.insumo === id)]), excedenteBarras);
  };
  // Cada renglón seguido de sus renglones por pared (si hay).
  const conDerivados = (lista) => lista.flatMap((i) => [i, ...(derivados.get(i.id) ?? [])]);

  if (e.grada) return presupuestoGrada(e.grada, insumo, perfil);
  if (e.montaje) return presupuestoMontaje(e.montaje, insumo, perfil);

  const items = [
    perfil(INSUMO.COLUMNA, e.columnas.filter((p) => !p.esquina)),
    perfil(INSUMO.COLUMNA_ESQUINA, e.columnas.filter((p) => p.esquina)), // v1.22
    perfil(INSUMO.MARCO, e.marcos.filter((p) => p.tipo !== 'viga-cierre')),
    perfil(INSUMO.PISO, e.piso.tirantes),
    perfil(INSUMO.TRANSVERSAL_PISO, e.piso.transversales),
    perfil(INSUMO.PISO_2, e.piso2.tirantes),
    perfil(INSUMO.TRANSVERSAL_PISO_2, e.piso2.transversales),
    perfil(INSUMO.CORREA, e.correas),
    perfil(INSUMO.VIGA_TECHO, e.techo.vigas),
    perfil(INSUMO.CORREA_TECHO, e.techo.correas),
  ];

  // Montantes (v1.17): renglón solo si la obra lleva.
  const montantes = e.montantes ?? [];
  if (montantes.length > 0 || reasignadas.some((p) => p.insumo === INSUMO.MONTANTE)) {
    items.splice(1, 0, perfil(INSUMO.MONTANTE, montantes));
  }

  // Marcos de aberturas (dintel, jambas, alféizar): renglón solo si hay aberturas.
  if (e.refuerzosAberturas.length > 0 || reasignadas.some((p) => p.insumo === INSUMO.MARCO_ABERTURA)) {
    items.splice(1, 0, perfil(INSUMO.MARCO_ABERTURA, e.refuerzosAberturas));
  }

  // Viga de cierre del entrepiso: el renglón aparece solo si hay borde libre
  // (entrepiso que no llega a la pared de enfrente o que no ocupa todo el lado).
  const vigasCierre = e.marcos.filter((p) => p.tipo === 'viga-cierre');
  if (vigasCierre.length > 0 || reasignadas.some((p) => p.insumo === INSUMO.VIGA_CIERRE)) {
    items.splice(2, 0, perfil(INSUMO.VIGA_CIERRE, vigasCierre));
  }

  // Placas OSB: superficie / placa, + desperdicio de recortes.
  const areaPlaca = PLACA_OSB.largo * PLACA_OSB.ancho;
  const areaOsb = s.piso + s.piso2;
  items.push(
    itemSimple(insumo(INSUMO.OSB), Math.ceil((areaOsb * (1 + DESPERDICIO_PLACAS)) / areaPlaca),
      `${areaOsb.toFixed(2)} m² (piso + piso 2) + ${DESPERDICIO_PLACAS * 100} % recortes`)
  );

  // Paneles: un renglón por tipo, con los m² de las paredes y el techo que lo usan.
  // Revestimientos: según cómo se vende cada tipo (a medida = m² de tiras; estándar = placas).
  const panos = panosPorRevestimiento(e);
  tiposDePanel(catalogo).forEach((tipo) => {
    const uso = panos[tipo.id];
    if (!uso) {
      items.push({ ...itemSimple(tipo, 0, 'sin uso'), unidad: tipo.venta === 'estandar' ? 'placas' : 'm²' });
      return;
    }
    const cuenta = cuentaRevestimiento(tipo, uso);
    items.push({ ...itemSimple(tipo, cuenta.cantidad, cuenta.detalle), unidad: cuenta.unidad, piezasRevestimiento: cuenta.piezas });
  });

  items.push(itemSimple(insumo(INSUMO.PILOTIN), e.pilotines.length, 'grilla de fundación'));

  // Escalera (si no hay, los renglones quedan en 0 con "no lleva").
  const escalera = e.escalera;
  const piezasEsc = (...tipos) => (escalera?.piezas ?? []).filter((p) => tipos.includes(p.tipo));
  items.push(
    perfil(INSUMO.ZANCA, piezasEsc('zanca', 'marco-descanso')),
    perfil(INSUMO.APOYO_ESCALON, piezasEsc('apoyo-escalon')),
    perfil(INSUMO.COLUMNA_ESCALERA, piezasEsc('columna-escalera'))
  );
  // Riostras de la escalera: el renglón aparece solo si se usan (para no llenar la tabla).
  // Riostras de la escalera y de las paredes (v1.17) van al mismo renglón.
  const riostras = [...piezasEsc('riostra'), ...(e.riostrasParedes ?? [])];
  if (riostras.length > 0 || reasignadas.some((p) => p.insumo === INSUMO.RIOSTRA)) items.push(perfil(INSUMO.RIOSTRA, riostras));
  const pisadas = escalera?.escalones.length ?? 0;
  items.push(itemSimple(insumo(INSUMO.ESCALON), pisadas,
    pisadas ? `${pisadas} pisadas de ${(escalera.resumen.huella * 100).toFixed(0)} cm` : 'no lleva'));
  const m2Descanso = (escalera?.descansos ?? []).reduce((acc, d) => acc + d.superficie, 0);
  // Redondeo hacia arriba al cm² sin arrastrar el error de coma flotante (0,8 x 0,8 = 0,6400000000000001).
  items.push(itemSimple(insumo(INSUMO.PISO_DESCANSO), m2Descanso > 0 ? Math.ceil(m2Descanso * 100 - 1e-9) / 100 : 0,
    m2Descanso ? `${m2Descanso.toFixed(2)} m²` : 'no lleva'));

  return conDerivados(items);
}

/**
 * Renglón para las piezas de una o más paredes con perfil propio (v1.22):
 * mismo renglón de origen, pero con el nombre de las paredes y el perfil elegido.
 * `perfilId` apunta al perfil: cambiar su precio en el presupuesto cambia el del perfil.
 */
function renglonDePared(producto, perfilElegido, piezas) {
  const lados = [...new Set(piezas.map((p) => p.ladoPared).filter(Boolean))].sort();
  return {
    ...producto,
    id: `${producto.id}@${perfilElegido.id}`,
    nombre: `${producto.nombre} (${lados.length > 1 ? 'lados' : 'lado'} ${lados.join(', ')})`,
    perfilId: perfilElegido.id,
    perfil: nombrePerfil(perfilElegido),
    largoBarra: perfilElegido.largoBarra,
    precio: perfilElegido.precio,
    kgm: kgPorMetro(perfilElegido),
    derivadoDe: producto.id,
  };
}

/** Subtotal por renglón y total. */
function conSubtotales(items) {
  items.forEach((item) => {
    item.subtotal = item.cantidad * (item.precio || 0);
  });
  const total = items.reduce((acc, item) => acc + item.subtotal, 0);
  return { items, total };
}

/** Renglones de un montaje: perfiles por el optimizador; chapas, madera y soldadura por cantidad. */
function presupuestoMontaje(montaje, insumo, perfil) {
  const de = (...tipos) => montaje.piezas.filter((p) => tipos.includes(p.tipo));
  const { chapasMesa, chapasTanque, m2Madera, soldadura } = montaje.cantidades;
  const arriba = (n, paso) => (n > 0 ? Math.ceil(n / paso - 1e-9) * paso : 0); // redondeo hacia arriba (m² al 0,01; m al 0,1)
  const items = [
    perfil(INSUMO.MONTAJE_PATA, de('mont-pata')),
    perfil(INSUMO.MONTAJE_MARCO, de('mont-marco', 'mont-travesano')),
  ];
  const riostras = de('riostra');
  if (riostras.length > 0) items.push(perfil(INSUMO.RIOSTRA, riostras));
  items.push(
    itemSimple(insumo(INSUMO.MONTAJE_CHAPA_TANQUE), chapasTanque, chapasTanque ? 'envolventes y tapas' : 'no lleva'),
    itemSimple(insumo(INSUMO.MONTAJE_CHAPA_MESA), chapasMesa, chapasMesa ? 'tapas de mesa' : 'no lleva'),
    itemSimple(insumo(INSUMO.MONTAJE_MADERA), Number(arriba(m2Madera, 0.01).toFixed(2)), m2Madera ? `${m2Madera.toFixed(2)} m²` : 'no lleva'),
    itemSimple(insumo(INSUMO.MONTAJE_SOLDADURA), Number(arriba(soldadura, 0.1).toFixed(1)), soldadura ? 'costuras de chapa (tanques)' : 'no lleva'),
  );
  return items;
}

/** Renglones de una grada: perfiles por el optimizador y tablones por metro. */
function presupuestoGrada(grada, insumo, perfil) {
  const de = (tipo) => grada.piezas.filter((p) => p.tipo === tipo);
  const metros = (...tipos) => grada.tablones.filter((t) => tipos.includes(t.tipo)).reduce((acc, t) => acc + t.largo, 0);
  // Metros de tablón hacia arriba al decímetro (sin arrastrar error de coma flotante).
  const redondear = (m) => (m > 0 ? Math.ceil(m * 10 - 1e-9) / 10 : 0);
  const { filas } = grada.resumen;
  const largo = grada.medidas.largo.toFixed(2);
  const tablon = (id, tipos, detalle) => {
    const m = metros(...tipos);
    return itemSimple(insumo(id), redondear(m), m ? detalle : 'no lleva');
  };
  const items = [
    perfil(INSUMO.GRADA_ZANCA, de('grada-zanca')),
    perfil(INSUMO.GRADA_PARANTE, de('grada-parante')),
    perfil(INSUMO.GRADA_APOYO, de('grada-apoyo')),
    perfil(INSUMO.GRADA_VIGA, de('grada-viga')),
    perfil(INSUMO.GRADA_UNION, de('grada-union')),
    perfil(INSUMO.RIOSTRA, de('riostra')),
  ];
  // Tablones: dos renglones si asiento y pie son distintos; uno solo si son el mismo tablón.
  if (grada.tipoTablones === 'separados') {
    items.push(
      tablon(INSUMO.GRADA_ASIENTO, ['asiento'], `${filas} filas de ${largo} m`),
      tablon(INSUMO.GRADA_PIE, ['pie'], `${filas} filas de ${largo} m`),
    );
  } else {
    const porFila = grada.tablones.filter((t) => t.tipo !== 'respaldo').length / filas / grada.resumen.modulos; // por fila y por módulo
    items.push(tablon(INSUMO.GRADA_TABLON, ['asiento', 'pie', 'tablon'], `${porFila} por fila x ${filas} filas de ${largo} m`));
  }
  items.push(tablon(INSUMO.GRADA_RESPALDO, ['respaldo'], `${Math.max(filas - 1, 0)} contrahuellas de ${largo} m`));
  // Fijaciones: solo aparecen si la grada es desmontable (módulos o filas atornillables).
  const { bulonesModulos, tornillosTablones } = grada.fijaciones;
  if (bulonesModulos > 0) {
    items.push(itemSimple(insumo(INSUMO.GRADA_BULON), bulonesModulos, `${grada.resumen.modulos - 1} uniones entre módulos`));
  }
  if (tornillosTablones > 0) {
    items.push(itemSimple(insumo(INSUMO.GRADA_TORNILLO), tornillosTablones, '2 por tablón en cada pórtico'));
  }
  return items;
}
