// ==========================================================
// OBRA CIVIL (v1.56): cemento, arena, piedra, hierro y ladrillos
// ----------------------------------------------------------
// Pedido de Leandro (12/11): faltaban los materiales de lo que hace el
// albañil: los pilotines (hormigonados en obra), el tapial del cerramiento,
// el pilar de la luz y el pozo séptico.
//
// Decisiones (respuestas del 12/11):
//   - Hormigón y mortero POR DOSIFICACIÓN EDITABLE: kg de cemento, m³ de
//     arena y m³ de piedra por m³ (de fábrica, un 1:2:3 para hormigón).
//   - Tapial: ladrillo hueco con viga de fundación y encadenado encofrados y
//     columnas (varillas, cemento, arena, piedra, ladrillo hueco).
//   - Pilar de luz: de ladrillo común, con una columna de hormigón adentro.
//   - Pozo: cámara séptica de ladrillo (fondo y tapa de hormigón) + pozo
//     absorbente con calzado de ladrillo en panal y tapa de hormigón armado.
//   - Todo se ubica EN EL TERRENO: el pilar, la cámara y el pozo son
//     elementos del terreno (Estructura → Terreno); el tapial va por los
//     lados del lote que elijas (sin terreno, un largo a mano).
//
// Los rendimientos (ladrillos por m², secciones de columnas y vigas, ganchos
// y empalmes) son los de un cómputo común: están acá abajo, a la vista, para
// validarlos con el albañil (ver PENDIENTES).
// ==========================================================

/** Lados del lote para el tapial (como en Terreno: mirando desde la calle). */
export const LADOS_LOTE = [['frente', 'Frente (línea municipal)'], ['izquierda', 'Lateral izquierdo'], ['derecha', 'Lateral derecho'], ['fondo', 'Fondo']];

export const OBRA_CIVIL_INICIAL = {
  hormigonEnObra: false, // true: pilotines y zapatas con cemento, arena y piedra (si no: pilotín comprado y hormigón elaborado)
  hormigon: { cemento: 350, arena: 0.6, piedra: 0.75 }, // por m³ de hormigón (≈ 1:2:3)
  mortero: { cemento: 250, arena: 1.1 }, // por m³ de mortero de asiento (≈ 1:4)
  bolsaKg: 50, // kg por bolsa de cemento
  largoVarilla: 12, // m
  pilotin: { profundidad: 1 }, // m bajo el terreno (el pilotín sube además hasta la elevación de la casa)
  tapial: { lados: [], largoManual: 0, alto: 2, columnasCada: 3 },
  pilar: { alto: 1.7, enterrado: 0.5 }, // el pilar de luz: alto sobre el terreno y lo que va enterrado
  camara: { profundidad: 1.2 }, // m de profundidad interior
  pozo: { profundidad: 4 }, // m de profundidad del pozo absorbente
};

/** Rendimientos y secciones de un cómputo común (validar con el albañil). */
export const RENDIMIENTOS = {
  ladrilloHuecoPorM2: 15.5, // hueco 12x18x33 con junta de 1,5 cm
  morteroHuecoPorM2: 0.015, // m³ de mortero por m² de muro de hueco
  ladrilloComunPorM3: 400, // común 25x12x5,5 (≈ 60 por m² de muro de 15)
  morteroComunPorM3: 0.25, // m³ de mortero por m³ de muro de común
  panal: 0.6, // el calzado del pozo va en panal (con huecos): ≈ 60 % de un muro lleno
  muroComun: 0.15, // espesor de las paredes de la cámara, el calzado del pozo
  columna: 0.15, // lado de las columnas del tapial y del pilar (encofradas)
  encadenado: [0.15, 0.15], // ancho x alto del encadenado superior del tapial
  vigaFundacion: [0.25, 0.3], // ancho x alto de la viga de fundación del tapial (enterrada)
  losa: 0.1, // espesor del fondo y la tapa de la cámara
  tapaPozo: 0.12, // espesor de la tapa del pozo
  parrilla: 0.15, // separación de las barras de las losas y las bases
  basePilar: [0.5, 0.2], // lado x alto de la base del pilar
  varillasPorColumna: 4, // Ø8 en columnas, encadenados, vigas y pilotines
  estriboCada: 0.2, // estribos de Ø4,2 cada 20 cm
  empalmes: 0.1, // +10 % de hierro por empalmes y ganchos
  recubrimiento: 0.025, // m: el estribo va 2,5 cm adentro del borde
};

const vacio = () => ({ hormigon: 0, mortero: 0, hierro8: 0, hierro6: 0, hierro42: 0, ladrilloHueco: 0, ladrilloComun: 0, excavacion: 0 });

/** Hierro de una pieza armada (columna, viga, pilotín) de sección cuadrada `lado` o redonda `diametro`, largo L. */
function armadura(largo, { lado = null, diametro = null }) {
  const r = RENDIMIENTOS;
  const interior = (lado ?? diametro) - 2 * r.recubrimiento;
  const perimetroEstribo = diametro ? Math.PI * interior : 4 * interior;
  const estribos = Math.ceil(largo / r.estriboCada) + 1;
  return { hierro8: r.varillasPorColumna * largo, hierro42: estribos * (perimetroEstribo + 0.1) }; // + 10 cm de ganchos
}

/** Parrilla de una losa o base a x b (barras en las dos direcciones). */
function parrilla(a, b) {
  const s = RENDIMIENTOS.parrilla;
  return (Math.ceil(a / s) + 1) * b + (Math.ceil(b / s) + 1) * a;
}

/** Suma `b` en `a` (cada material). */
function sumar(a, b) {
  Object.keys(b).forEach((k) => { a[k] = (a[k] ?? 0) + b[k]; });
  return a;
}

const metros = (n) => n.toFixed(2).replace('.', ',');

// ---------- cada parte ----------

/** Pilotines hormigonados en obra (y sus zapatas): solo con `hormigonEnObra`. */
function pilotines(e, oc, elevacion) {
  const n = e.pilotines?.length ?? 0;
  if (!oc.hormigonEnObra || n === 0) return [];
  const forma = e.pilotin?.forma === 'cuadrado' ? 'cuadrado' : 'redondo';
  const d = e.pilotin?.medida ?? 0.3;
  const largo = oc.pilotin.profundidad + elevacion;
  const area = forma === 'cuadrado' ? d * d : (Math.PI * d * d) / 4;
  const uno = { ...vacio(), hormigon: area * largo, excavacion: area * oc.pilotin.profundidad,
    ...armadura(largo, forma === 'cuadrado' ? { lado: d } : { diametro: d }) };
  const total = Object.fromEntries(Object.entries(uno).map(([k, v]) => [k, v * n]));
  const partes = [{ clave: 'pilotines', nombre: 'Pilotines', detalle: `${n} de ${forma === 'cuadrado' ? '' : 'ø '}${metros(d)} m x ${metros(largo)} m (${metros(oc.pilotin.profundidad)} m enterrados), 4 ø8 y estribos`, ...total }];
  if (e.zapata) {
    const { lado, alto } = e.zapata;
    // La excavación de las zapatas ya está en su renglón ("Excavación de zapatas").
    partes.push({ clave: 'zapatas', nombre: 'Zapatas', detalle: `${n} de ${metros(lado)} x ${metros(lado)} x ${metros(alto)} m con parrilla ø8 cada 15 cm`,
      ...vacio(), hormigon: n * lado * lado * alto, hierro8: n * parrilla(lado, lado) });
  }
  return partes;
}

/** Largo del tapial: los lados elegidos del lote (o el largo a mano si no hay terreno). */
export function largoDelTapial(oc, terreno) {
  if (terreno?.activo && oc.tapial.lados.length > 0) {
    return oc.tapial.lados.reduce((a, l) => a + (l === 'frente' || l === 'fondo' ? terreno.frente : terreno.fondo), 0);
  }
  return oc.tapial.largoManual;
}

function tapial(oc, terreno) {
  const r = RENDIMIENTOS;
  const largo = largoDelTapial(oc, terreno);
  const { alto, columnasCada } = oc.tapial;
  if (!(largo > 0 && alto > 0)) return [];
  const columnas = Math.ceil(largo / columnasCada) + 1;
  const altoColumna = alto + r.vigaFundacion[1]; // la columna arranca de la viga de fundación
  const muro = Math.max(0, largo * alto - columnas * r.columna * alto - largo * r.encadenado[1]);
  const [anchoV, altoV] = r.vigaFundacion;
  const [anchoE, altoE] = r.encadenado;
  const hierroCol = armadura(altoColumna, { lado: r.columna });
  const hierroViga = armadura(largo, { lado: anchoV });
  const hierroEnc = armadura(largo, { lado: anchoE });
  return [{
    clave: 'tapial', nombre: 'Tapial', detalle: `${metros(largo)} m x ${metros(alto)} m de ladrillo hueco, ${columnas} columnas (cada ${metros(columnasCada)} m), viga de fundación y encadenado`,
    ...vacio(),
    hormigon: columnas * r.columna * r.columna * altoColumna + largo * anchoV * altoV + largo * anchoE * altoE,
    mortero: muro * r.morteroHuecoPorM2,
    hierro8: columnas * hierroCol.hierro8 + hierroViga.hierro8 + hierroEnc.hierro8,
    hierro42: columnas * hierroCol.hierro42 + hierroViga.hierro42 + hierroEnc.hierro42,
    ladrilloHueco: muro * r.ladrilloHuecoPorM2,
    excavacion: largo * anchoV * altoV,
  }];
}

function pilaresDeLuz(oc, elementos) {
  const r = RENDIMIENTOS;
  return elementos.filter((el) => el.tipo === 'pilarLuz').map((el, i, todos) => {
    const sobre = el.alto > 0 ? el.alto : oc.pilar.alto; // el alto del elemento del terreno (si no, el de fábrica)
    const alto = sobre + oc.pilar.enterrado;
    const a = el.ancho ?? 0.45;
    const b = el.largo ?? 0.3;
    const columna = armadura(alto, { lado: r.columna });
    const [ladoBase, altoBase] = r.basePilar;
    const muro = Math.max(0, (a * b - r.columna * r.columna) * alto);
    return {
      clave: `pilar:${el.id}`, nombre: todos.length > 1 ? `Pilar de luz ${i + 1}` : 'Pilar de luz',
      detalle: `${metros(a)} x ${metros(b)} m, ${metros(sobre)} m de alto + ${metros(oc.pilar.enterrado)} m enterrado, columna de hormigón adentro`,
      ...vacio(),
      hormigon: r.columna * r.columna * alto + ladoBase * ladoBase * altoBase,
      mortero: muro * r.morteroComunPorM3,
      hierro8: columna.hierro8 + parrilla(ladoBase, ladoBase), hierro42: columna.hierro42,
      ladrilloComun: muro * r.ladrilloComunPorM3,
      excavacion: (a + 0.2) * (b + 0.2) * oc.pilar.enterrado,
    };
  });
}

function camaras(oc, elementos) {
  const r = RENDIMIENTOS;
  return elementos.filter((el) => el.tipo === 'camara').map((el, i, todos) => {
    const a = el.ancho;
    const b = el.largo;
    const p = oc.camara.profundidad;
    const e2 = 2 * r.muroComun;
    const exterior = (a + e2) * (b + e2);
    const muro = (exterior - a * b) * p;
    return {
      clave: `camara:${el.id}`, nombre: todos.length > 1 ? `Cámara séptica ${i + 1}` : 'Cámara séptica',
      detalle: `${metros(a)} x ${metros(b)} m por dentro, ${metros(p)} m de profundidad (≈ ${Math.round(a * b * p * 1000)} litros), paredes de ladrillo, fondo y tapa de hormigón`,
      ...vacio(),
      hormigon: 2 * exterior * r.losa,
      mortero: muro * r.morteroComunPorM3,
      hierro6: parrilla(a + e2, b + e2), // malla de la tapa
      ladrilloComun: muro * r.ladrilloComunPorM3,
      excavacion: (a + e2 + 0.2) * (b + e2 + 0.2) * (p + r.losa * 2),
    };
  });
}

function pozos(oc, elementos) {
  const r = RENDIMIENTOS;
  return elementos.filter((el) => el.tipo === 'pozo').map((el, i, todos) => {
    const radio = (el.diametro ?? 1.2) / 2;
    const p = oc.pozo.profundidad;
    const exterior = radio + r.muroComun;
    const calzado = Math.PI * (exterior * exterior - radio * radio) * p * r.panal;
    const tapa = 2 * exterior + 0.2; // la tapa apoya 10 cm sobre el terreno de cada lado
    return {
      clave: `pozo:${el.id}`, nombre: todos.length > 1 ? `Pozo absorbente ${i + 1}` : 'Pozo absorbente',
      detalle: `ø ${metros(radio * 2)} m, ${metros(p)} m de profundidad, calzado de ladrillo en panal y tapa de hormigón armado`,
      ...vacio(),
      hormigon: ((Math.PI * tapa * tapa) / 4) * r.tapaPozo,
      mortero: calzado * r.morteroComunPorM3,
      hierro8: parrilla(tapa, tapa) * 0.8, // parrilla redonda: ≈ 80 % de la cuadrada
      ladrilloComun: calzado * r.ladrilloComunPorM3,
      excavacion: Math.PI * exterior * exterior * p,
    };
  });
}

/**
 * Las partes de obra civil de la obra y lo que lleva cada una.
 * @param e  la estructura (pilotines, zapata, pilotin)
 * @returns {{ partes: { clave, nombre, detalle, hormigon, mortero, hierro8, hierro6, hierro42, ladrilloHueco, ladrilloComun, excavacion }[],
 *            total: object, materiales: { cemento, arena, piedra, bolsas, varillas8, varillas6, varillas42, ladrilloHueco, ladrilloComun, excavacion } }}
 */
export function cuentasDeObraCivil(params, e = {}) {
  const oc = completarObraCivil(params.obraCivil);
  const elementos = params.terreno?.activo ? params.terreno.elementos ?? [] : [];
  const partes = [
    ...pilotines(e, oc, params.elevacion ?? 0),
    ...tapial(oc, params.terreno),
    ...pilaresDeLuz(oc, elementos),
    ...camaras(oc, elementos),
    ...pozos(oc, elementos),
  ];
  const total = partes.reduce((a, p) => sumar(a, Object.fromEntries(Object.keys(vacio()).map((k) => [k, p[k]]))), vacio());
  return { partes, total, materiales: materialesDeObraCivil(total, oc) };
}

/** De los m³ de hormigón y mortero, los metros de hierro y los ladrillos, a lo que se compra. */
export function materialesDeObraCivil(total, oc) {
  const cemento = total.hormigon * oc.hormigon.cemento + total.mortero * oc.mortero.cemento; // kg
  const arena = total.hormigon * oc.hormigon.arena + total.mortero * oc.mortero.arena;
  const piedra = total.hormigon * oc.hormigon.piedra;
  const varillas = (m) => (m > 0 ? Math.ceil((m * (1 + RENDIMIENTOS.empalmes)) / oc.largoVarilla - 1e-9) : 0);
  const decima = (n) => (n > 0 ? Math.ceil(n * 10 - 1e-9) / 10 : 0);
  return {
    cemento, bolsas: cemento > 0 ? Math.ceil(cemento / oc.bolsaKg - 1e-9) : 0,
    arena: decima(arena), piedra: decima(piedra),
    varillas8: varillas(total.hierro8), varillas6: varillas(total.hierro6), varillas42: varillas(total.hierro42),
    ladrilloHueco: Math.ceil(total.ladrilloHueco - 1e-9), ladrilloComun: Math.ceil(total.ladrilloComun - 1e-9),
    excavacion: decima(total.excavacion),
  };
}

// ---------- validación y proyectos de antes ----------

const entre = (n, min, max) => Number.isFinite(n) && n >= min && n <= max;

/** Errores por campo ({ 'obraCivil.hormigon.cemento': 'texto' }); vacío si está todo bien. */
export function validarObraCivil(oc) {
  if (!oc || typeof oc !== 'object') return { obraCivil: 'Obra civil inválida' };
  const errores = {};
  const campo = (ruta, valor, min, max, texto) => { if (!entre(valor, min, max)) errores[`obraCivil.${ruta}`] = texto; };
  if (typeof oc.hormigonEnObra !== 'boolean') errores['obraCivil.hormigonEnObra'] = 'Sí o no';
  campo('hormigon.cemento', oc.hormigon?.cemento, 0, 1000, 'De 0 a 1000 kg por m³');
  campo('hormigon.arena', oc.hormigon?.arena, 0, 2, 'De 0 a 2 m³ por m³');
  campo('hormigon.piedra', oc.hormigon?.piedra, 0, 2, 'De 0 a 2 m³ por m³');
  campo('mortero.cemento', oc.mortero?.cemento, 0, 1000, 'De 0 a 1000 kg por m³');
  campo('mortero.arena', oc.mortero?.arena, 0, 2, 'De 0 a 2 m³ por m³');
  campo('bolsaKg', oc.bolsaKg, 1, 100, 'De 1 a 100 kg');
  campo('largoVarilla', oc.largoVarilla, 1, 12, 'De 1 a 12 m');
  campo('pilotin.profundidad', oc.pilotin?.profundidad, 0, 10, 'De 0 a 10 m');
  campo('tapial.largoManual', oc.tapial?.largoManual, 0, 2000, 'De 0 a 2000 m');
  campo('tapial.alto', oc.tapial?.alto, 0, 6, 'De 0 a 6 m');
  campo('tapial.columnasCada', oc.tapial?.columnasCada, 0.5, 10, 'De 0,5 a 10 m');
  if (!Array.isArray(oc.tapial?.lados) || oc.tapial.lados.some((l) => !LADOS_LOTE.some(([v]) => v === l))) errores['obraCivil.tapial.lados'] = 'Lados inválidos';
  campo('pilar.alto', oc.pilar?.alto, 0.5, 4, 'De 0,5 a 4 m');
  campo('pilar.enterrado', oc.pilar?.enterrado, 0, 2, 'De 0 a 2 m');
  campo('camara.profundidad', oc.camara?.profundidad, 0.3, 5, 'De 0,3 a 5 m');
  campo('pozo.profundidad', oc.pozo?.profundidad, 0.5, 30, 'De 0,5 a 30 m');
  return errores;
}

/** Completa lo guardado (o lo crea en los proyectos de antes). */
export function completarObraCivil(oc) {
  const base = oc && typeof oc === 'object' ? oc : {};
  const sub = (k) => ({ ...OBRA_CIVIL_INICIAL[k], ...(base[k] && typeof base[k] === 'object' ? base[k] : {}) });
  return {
    ...OBRA_CIVIL_INICIAL, ...base,
    hormigon: sub('hormigon'), mortero: sub('mortero'), pilotin: sub('pilotin'), tapial: sub('tapial'),
    pilar: sub('pilar'), camara: sub('camara'), pozo: sub('pozo'),
  };
}
