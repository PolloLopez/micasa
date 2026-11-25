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

// v1.80 (pedido de Leandro, 20/11): "el encofrado o encadenado son pilotines, con vigas de cemento con hierro que
// las unen y cada x metros va una columna. También quiero elegir qué tipo de ladrillos van, y cuánto me sugirió el
// albañil que voy a usar de materiales". Y el hueco del portón corredizo (que hace él de hierro), con sus materiales.
//   - Pilotines del tapial: uno bajo cada columna (ø y profundidad editables).
//   - Ladrillo a elegir (LADRILLOS_TAPIAL): cambia cuántos van por m² y el mortero.
//   - Encofrado con placas fenólicas propias: las de `juegosEncofrado` tramos entre columnas a la vez (se reusan).
//   - "Según el albañil" (tapial.segunAlbanil): lo que él dijo reemplaza lo calculado de ese material.
//   - Portón corredizo: hueco en un lado (sin muro ni encadenado; la viga de fundación sigue, el riel va encima).

/** Ladrillos para el muro del tapial: cuántos por m², mortero por m² y en qué renglón del presupuesto van. */
export const LADRILLOS_TAPIAL = {
  hueco8: { nombre: 'Ladrillo hueco 8x18x33', porM2: 15.5, morteroPorM2: 0.01, campo: 'ladrilloHueco8' },
  hueco12: { nombre: 'Ladrillo hueco 12x18x33', porM2: 15.5, morteroPorM2: 0.015, campo: 'ladrilloHueco' },
  hueco18: { nombre: 'Ladrillo hueco 18x18x33', porM2: 15.5, morteroPorM2: 0.022, campo: 'ladrilloHueco18' },
  comun: { nombre: 'Ladrillo común (muro de 15)', porM2: 60, morteroPorM2: 0.0375, campo: 'ladrilloComun' },
  bloque: { nombre: 'Bloque de hormigón 19x19x39', porM2: 12.5, morteroPorM2: 0.01, campo: 'bloqueHormigon' },
};

/** Lo que se puede cargar "según el albañil" (campo de materialesDeObraCivil → nombre y unidad). */
export const MATERIALES_ALBANIL = [
  ['bolsas', 'Cemento', 'bolsas'], ['arena', 'Arena', 'm³'], ['piedra', 'Piedra', 'm³'],
  ['varillas8', 'Hierro ø8', 'varillas'], ['varillas42', 'Hierro ø4,2 (estribos)', 'varillas'],
  ['ladrillos', 'Ladrillos (los elegidos)', 'u'], ['fenolicos', 'Placas fenólicas', 'u'], ['tirantesEncofrado', 'Tirantes de encofrado', 'm'],
];

/**
 * v1.80: la dosificación como la dice el albañil ("1:2:3" = 1 balde de cemento, 2 de arena y 3 de piedra) pasada a
 * lo que la app usa (kg de cemento y m³ de arena y piedra por m³). Valores aproximados de tablas comunes: validar.
 * Pedido de Leandro: "esto no lo sé completar; puedo poner lo que pide o usa el albañil".
 */
export const DOSIFICACIONES_HORMIGON = [
  ['1:2:3', '1:2:3 (el común; de fábrica)', { cemento: 350, arena: 0.6, piedra: 0.75 }],
  ['1:2:2', '1:2:2 (más fuerte: columnas y vigas)', { cemento: 400, arena: 0.55, piedra: 0.55 }],
  ['1:3:3', '1:3:3 (más económico: bases y contrapisos)', { cemento: 300, arena: 0.65, piedra: 0.65 }],
  ['1:3:4', '1:3:4 (pobre: rellenos)', { cemento: 250, arena: 0.65, piedra: 0.85 }],
];
export const DOSIFICACIONES_MORTERO = [
  ['1:4', '1:4 (de fábrica)', { cemento: 250, arena: 1.1 }],
  ['1:3', '1:3 (más fuerte)', { cemento: 330, arena: 1.05 }],
  ['1:5', '1:5 (más económico)', { cemento: 200, arena: 1.15 }],
];
/** La que coincide con lo cargado, o 'mano' si se cargaron números propios. */
export const dosificacionElegida = (lista, valores) =>
  lista.find(([, , v]) => Object.keys(v).every((k) => Math.abs((valores?.[k] ?? 0) - v[k]) < 1e-9))?.[0] ?? 'mano';

/** Lados del lote para el tapial (como en Terreno: mirando desde la calle). */
export const LADOS_LOTE = [['frente', 'Frente (línea municipal)'], ['izquierda', 'Lateral izquierdo'], ['derecha', 'Lateral derecho'], ['fondo', 'Fondo']];

export const OBRA_CIVIL_INICIAL = {
  hormigonEnObra: false, // true: pilotines y zapatas con cemento, arena y piedra (si no: pilotín comprado y hormigón elaborado)
  hormigon: { cemento: 350, arena: 0.6, piedra: 0.75 }, // por m³ de hormigón (≈ 1:2:3)
  mortero: { cemento: 250, arena: 1.1 }, // por m³ de mortero de asiento (≈ 1:4)
  bolsaKg: 50, // kg por bolsa de cemento
  largoVarilla: 12, // m
  pilotin: { profundidad: 1 }, // m bajo el terreno (el pilotín sube además hasta la elevación de la casa)
  tapial: {
    lados: [], largoManual: 0, alto: 2, columnasCada: 3,
    ladrillo: 'hueco12', // v1.80: ver LADRILLOS_TAPIAL
    pilotines: true, pilotinDiametro: 0.2, pilotinProfundidad: 1.5, // v1.80: uno bajo cada columna
    encofrado: 'fenolico', juegosEncofrado: 2, // v1.80: 'fenolico' (placas propias, se reusan) o 'ninguno'
    segunAlbanil: {}, // v1.80: { bolsas: 12, ladrillos: 900… } lo que dijo el albañil (0 o vacío = lo calculado)
    // v1.93 (Leandro: "los ladrillos y varillas para el tapial son una idea, no será un gasto próximo. Las placas de
    // fenólico sí serán próximas"): a futuro = sus materiales (y el portón) no se compran todavía; fenolicosYa = las
    // placas fenólicas y sus tirantes sí.
    aFuturo: false, fenolicosYa: false,
  },
  // v1.80: el portón corredizo del tapial (lo hace Leandro de hierro). `desde` = m desde la esquina izquierda (frente y
  // fondo, mirando desde la calle) o desde la línea municipal (laterales).
  porton: { activo: false, lado: 'frente', desde: 1, ancho: 3, alto: 2, relleno: 'chapa' },
  pilar: { alto: 1.7, enterrado: 0.5 }, // el pilar de luz: alto sobre el terreno y lo que va enterrado
  camara: { profundidad: 1.2 }, // m de profundidad interior
  pozo: { profundidad: 4 }, // m de profundidad del pozo absorbente
};

/** Rendimientos y secciones de un cómputo común (validar con el albañil). */
export const RENDIMIENTOS = {
  ladrilloHuecoPorM2: 15.5, // hueco 12x18x33 con junta de 1,5 cm (el tapial usa LADRILLOS_TAPIAL)
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
  // v1.80: encofrado del tapial y portón
  placaFenolica: 1.22 * 2.44, // m² de una placa fenólica de 18 mm
  recortesEncofrado: 0.15, // +15 % de placa por los cortes en tiras
  tirantePorM2Encofrado: 3, // m de tirante de pino 2" x 3" por m² de encofrado (refuerzos y puntales)
  solapePorton: 0.2, // la hoja del portón es 20 cm más ancha que el hueco (10 cm de cada lado)
  montantePortonCada: 1, // un montante del bastidor cada 1 m de hoja
};

// v1.80: + ladrillos huecos de 8 y 18, bloques, y el encofrado fenólico del tapial (placas y metros de tirante).
const vacio = () => ({ hormigon: 0, mortero: 0, hierro8: 0, hierro6: 0, hierro42: 0, ladrilloHueco: 0, ladrilloComun: 0, excavacion: 0,
  ladrilloHueco8: 0, ladrilloHueco18: 0, bloqueHormigon: 0, fenolicos: 0, tirantesEncofrado: 0 });
export const CAMPOS_OBRA_CIVIL = Object.keys(vacio());

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

/** Largo de un lado del lote (frente y fondo: el ancho del lote; laterales: el fondo). */
const largoDelLado = (lado, terreno) => (lado === 'frente' || lado === 'fondo' ? terreno.frente : terreno.fondo);

/**
 * v1.80: el hueco del portón en el tapial, o null si no hay portón (o su lado no lleva tapial).
 * @returns {{ lado, desde, hasta, ancho, alto } | null}
 */
export function huecoDelPorton(oc, terreno) {
  const p = oc.porton;
  if (!p?.activo || !(p.ancho > 0)) return null;
  const conTerreno = terreno?.activo && oc.tapial.lados.length > 0;
  if (conTerreno && !oc.tapial.lados.includes(p.lado)) return null;
  const largoLado = conTerreno ? largoDelLado(p.lado, terreno) : largoDelTapial(oc, terreno);
  if (!(largoLado > 0)) return null; // sin tapial no hay dónde poner el portón
  const ancho = Math.min(p.ancho, largoLado);
  const desde = Math.min(Math.max(0, p.desde), largoLado - ancho);
  return { lado: p.lado, desde, hasta: desde + ancho, ancho, alto: p.alto };
}

/**
 * v1.80: los tramos de muro de cada lado (para el 3D y el plano): el lado entero o partido por el portón.
 * @returns {{ lado, desde, hasta }[]}
 */
export function tramosDelTapial(oc, terreno) {
  const hueco = huecoDelPorton(oc, terreno);
  return oc.tapial.lados.flatMap((lado) => {
    const largo = largoDelLado(lado, terreno);
    if (hueco?.lado !== lado) return [{ lado, desde: 0, hasta: largo }];
    return [{ lado, desde: 0, hasta: hueco.desde }, { lado, desde: hueco.hasta, hasta: largo }].filter((t) => t.hasta - t.desde > 0.01);
  });
}

/**
 * v1.80: lo que hace falta para dibujar el tapial (3D y plano de implantación), o null si no lleva.
 * @returns {{ alto, tramos: { lado, desde, hasta }[], porton: { lado, desde, hasta, ancho, alto } | null } | null}
 */
export function dibujoDelTapial(params) {
  const oc = completarObraCivil(params.obraCivil);
  if (!params.terreno?.activo || oc.tapial.lados.length === 0 || !(oc.tapial.alto > 0)) return null;
  return { alto: oc.tapial.alto, tramos: tramosDelTapial(oc, params.terreno), porton: huecoDelPorton(oc, params.terreno) };
}

function tapial(oc, terreno) {
  const r = RENDIMIENTOS;
  const t = oc.tapial;
  const largo = largoDelTapial(oc, terreno);
  const { alto, columnasCada } = t;
  if (!(largo > 0 && alto > 0)) return [];
  const hueco = huecoDelPorton(oc, terreno);
  const largoMuro = largo - (hueco?.ancho ?? 0); // el portón no lleva muro ni encadenado
  // Con portón el muro queda en dos tramos: cada uno con sus columnas de punta (una más).
  const columnas = Math.ceil(largoMuro / columnasCada - 1e-9) + 1 + (hueco ? 1 : 0);
  const altoColumna = alto + r.vigaFundacion[1]; // la columna arranca de la viga de fundación
  const muro = Math.max(0, largoMuro * alto - columnas * r.columna * alto - largoMuro * r.encadenado[1]);
  const [anchoV, altoV] = r.vigaFundacion;
  const [anchoE, altoE] = r.encadenado;
  const ladrillo = LADRILLOS_TAPIAL[t.ladrillo] ?? LADRILLOS_TAPIAL.hueco12;
  const hierroCol = armadura(altoColumna, { lado: r.columna });
  const hierroViga = armadura(largo, { lado: anchoV }); // la viga sigue de largo bajo el portón (el riel va encima)
  const hierroEnc = armadura(largoMuro, { lado: anchoE });
  const parte = {
    ...vacio(),
    hormigon: columnas * r.columna * r.columna * altoColumna + largo * anchoV * altoV + largoMuro * anchoE * altoE,
    mortero: muro * ladrillo.morteroPorM2,
    hierro8: columnas * hierroCol.hierro8 + hierroViga.hierro8 + hierroEnc.hierro8,
    hierro42: columnas * hierroCol.hierro42 + hierroViga.hierro42 + hierroEnc.hierro42,
    excavacion: largo * anchoV * altoV,
  };
  parte[ladrillo.campo] = muro * ladrillo.porM2;
  // Pilotines: uno bajo cada columna, que baja desde la viga de fundación.
  if (t.pilotines && t.pilotinDiametro > 0 && t.pilotinProfundidad > 0) {
    const d = t.pilotinDiametro;
    const area = (Math.PI * d * d) / 4;
    const uno = armadura(t.pilotinProfundidad, { diametro: d });
    parte.hormigon += columnas * area * t.pilotinProfundidad;
    parte.excavacion += columnas * area * t.pilotinProfundidad;
    parte.hierro8 += columnas * uno.hierro8;
    parte.hierro42 += columnas * uno.hierro42;
  }
  // Encofrado fenólico: las caras de un tramo entre columnas (viga y encadenado de los dos lados, y las dos caras de
  // la columna), por los juegos que se arman a la vez. Las placas se reusan tramo por tramo.
  if (t.encofrado === 'fenolico') {
    const tramo = Math.min(columnasCada, largoMuro);
    const unJuego = tramo * 2 * (altoV + altoE) + 2 * (r.columna + 0.1) * altoColumna;
    const area = unJuego * Math.max(1, t.juegosEncofrado);
    parte.fenolicos = (area * (1 + r.recortesEncofrado)) / r.placaFenolica;
    parte.tirantesEncofrado = area * r.tirantePorM2Encofrado;
  }
  const extras = [
    t.pilotines ? `pilotines de ø${metros(t.pilotinDiametro)} m x ${metros(t.pilotinProfundidad)} m bajo cada columna` : '',
    hueco ? `hueco de ${metros(hueco.ancho)} m para el portón` : '',
    t.encofrado === 'fenolico' ? `encofrado fenólico para ${Math.max(1, t.juegosEncofrado)} tramo${t.juegosEncofrado > 1 ? 's' : ''}` : '',
  ].filter(Boolean);
  return [{
    clave: 'tapial', nombre: 'Tapial',
    detalle: `${metros(largo)} m x ${metros(alto)} m de ${ladrillo.nombre.toLowerCase()}, ${columnas} columnas (cada ${metros(columnasCada)} m), viga de fundación y encadenado${extras.length ? `; ${extras.join(', ')}` : ''}`,
    ...parte,
  }];
}

/**
 * v1.80: el portón corredizo de hierro (lo hace Leandro): las piezas del bastidor (para la hoja de corte), el relleno
 * en m², el riel y el kit de herrajes. null si no hay portón.
 */
export function materialesDelPorton(oc, terreno) {
  const hueco = huecoDelPorton(oc, terreno);
  if (!hueco || !(hueco.alto > 0)) return null;
  const r = RENDIMIENTOS;
  const anchoHoja = hueco.ancho + r.solapePorton;
  const alto = hueco.alto;
  const montantes = Math.max(0, Math.ceil(anchoHoja / r.montantePortonCada - 1e-9) - 1);
  const pieza = (id, largo) => ({ id, largo: Math.round(largo * 1000) / 1000 });
  const piezas = [
    pieza('porton-marco-izq', alto), pieza('porton-marco-der', alto),
    pieza('porton-marco-abajo', anchoHoja), pieza('porton-marco-arriba', anchoHoja), pieza('porton-travesano', anchoHoja),
    ...Array.from({ length: montantes }, (_, i) => pieza(`porton-montante-${i + 1}`, alto)),
  ];
  return {
    hueco, anchoHoja, piezas,
    relleno: oc.porton.relleno === 'malla' ? 'malla' : 'chapa',
    rellenoM2: Math.ceil(anchoHoja * alto * 100 - 1e-9) / 100,
    riel: Math.ceil(2 * anchoHoja * 10 - 1e-9) / 10, // el recorrido de la hoja (lo que tapa + lo que corre)
    detalle: `hoja de ${metros(anchoHoja)} x ${metros(alto)} m para un hueco de ${metros(hueco.ancho)} m`,
  };
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
  const crudo = (p) => Object.fromEntries(CAMPOS_OBRA_CIVIL.map((k) => [k, p[k] ?? 0]));
  const total = partes.reduce((a, p) => sumar(a, crudo(p)), vacio());
  // v1.80: lo del tapial "según el albañil" reemplaza lo calculado de esos materiales (el resto de la obra, igual).
  const delTapial = partes.find((p) => p.clave === 'tapial');
  const cuentasTapial = delTapial ? materialesDelTapial(delTapial, oc) : null;
  if (cuentasTapial?.conAlbanil) delTapial.materialesFinal = cuentasTapial.final; // para el pedido de la parte (textoParaCotizar)
  const porton = materialesDelPorton(oc, params.terreno);
  // v1.93: el tapial a futuro: lo demás de la obra civil, solo; lo del tapial (y el portón) queda aparte, para verlo.
  if (delTapial && oc.tapial.aFuturo) {
    const sinTapial = materialesDeObraCivil(partes.filter((p) => p !== delTapial).reduce((a, p) => sumar(a, crudo(p)), vacio()), oc);
    const ya = oc.tapial.fenolicosYa ? { fenolicos: cuentasTapial.final.fenolicos ?? 0, tirantesEncofrado: cuentasTapial.final.tirantesEncofrado ?? 0 } : {};
    const futuro = { ...cuentasTapial.final, ...Object.fromEntries(Object.keys(ya).map((k) => [k, 0])) };
    return { partes, total, materiales: sumarMateriales(sinTapial, ya), tapial: cuentasTapial, porton: null,
      aFuturo: { materiales: futuro, porton } };
  }
  const materiales = cuentasTapial?.conAlbanil
    ? sumarMateriales(materialesDeObraCivil(partes.filter((p) => p !== delTapial).reduce((a, p) => sumar(a, crudo(p)), vacio()), oc), cuentasTapial.final)
    : materialesDeObraCivil(total, oc);
  return { partes, total, materiales, tapial: cuentasTapial, porton, aFuturo: null };
}

/** Suma dos resultados de materialesDeObraCivil (campo por campo). */
function sumarMateriales(a, b) {
  return Object.fromEntries(Object.keys(a).map((k) => [k, (a[k] ?? 0) + (b[k] ?? 0)]));
}

/**
 * v1.80: los materiales del tapial, calculados y con lo que dijo el albañil.
 * @returns {{ calculado, final, conAlbanil: boolean, campoLadrillo }}
 */
export function materialesDelTapial(parte, oc) {
  const calculado = materialesDeObraCivil(parte, oc);
  const campoLadrillo = (LADRILLOS_TAPIAL[oc.tapial.ladrillo] ?? LADRILLOS_TAPIAL.hueco12).campo;
  const albanil = oc.tapial.segunAlbanil ?? {};
  const final = { ...calculado };
  let conAlbanil = false;
  MATERIALES_ALBANIL.forEach(([campo]) => {
    const v = albanil[campo];
    if (!(Number.isFinite(v) && v > 0)) return;
    conAlbanil = true;
    final[campo === 'ladrillos' ? campoLadrillo : campo] = v;
  });
  if (albanil.bolsas > 0) final.cemento = albanil.bolsas * oc.bolsaKg;
  return { calculado: { ...calculado, ladrillos: calculado[campoLadrillo] }, final, conAlbanil, campoLadrillo };
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
    // v1.80: tapial
    ladrilloHueco8: Math.ceil((total.ladrilloHueco8 ?? 0) - 1e-9), ladrilloHueco18: Math.ceil((total.ladrilloHueco18 ?? 0) - 1e-9),
    bloqueHormigon: Math.ceil((total.bloqueHormigon ?? 0) - 1e-9),
    fenolicos: Math.ceil((total.fenolicos ?? 0) - 1e-9), tirantesEncofrado: Math.ceil((total.tirantesEncofrado ?? 0) - 1e-9),
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
  // v1.80: pilotines, ladrillo, encofrado, lo del albañil y el portón (solo si vienen: los completa completarObraCivil).
  const t = oc.tapial ?? {};
  const si = (v, prueba) => v === undefined || prueba(v);
  if (!si(t.ladrillo, (v) => v in LADRILLOS_TAPIAL)) errores['obraCivil.tapial.ladrillo'] = 'Elegí un ladrillo de la lista';
  if (!si(t.pilotines, (v) => typeof v === 'boolean')) errores['obraCivil.tapial.pilotines'] = 'Sí o no';
  if (t.pilotinDiametro !== undefined) campo('tapial.pilotinDiametro', t.pilotinDiametro, 0.1, 1, 'De 0,10 a 1 m');
  if (t.pilotinProfundidad !== undefined) campo('tapial.pilotinProfundidad', t.pilotinProfundidad, 0.3, 6, 'De 0,30 a 6 m');
  if (!si(t.encofrado, (v) => ['fenolico', 'ninguno'].includes(v))) errores['obraCivil.tapial.encofrado'] = 'Fenólico o ninguno';
  if (t.juegosEncofrado !== undefined) campo('tapial.juegosEncofrado', t.juegosEncofrado, 1, 50, 'De 1 a 50 tramos');
  if (!si(t.aFuturo, (v) => typeof v === 'boolean')) errores['obraCivil.tapial.aFuturo'] = 'Sí o no';
  if (!si(t.fenolicosYa, (v) => typeof v === 'boolean')) errores['obraCivil.tapial.fenolicosYa'] = 'Sí o no';
  if (!si(t.segunAlbanil, (v) => v && typeof v === 'object' && Object.values(v).every((n) => Number.isFinite(n) && n >= 0 && n <= 1e6))) {
    errores['obraCivil.tapial.segunAlbanil'] = 'Cantidades inválidas';
  }
  const pt = oc.porton;
  if (pt !== undefined) {
    if (typeof pt?.activo !== 'boolean') errores['obraCivil.porton.activo'] = 'Sí o no';
    if (!LADOS_LOTE.some(([v]) => v === pt?.lado)) errores['obraCivil.porton.lado'] = 'Elegí un lado';
    campo('porton.desde', pt?.desde, 0, 2000, 'De 0 a 2000 m');
    campo('porton.ancho', pt?.ancho, 0.5, 15, 'De 0,50 a 15 m');
    campo('porton.alto', pt?.alto, 0.5, 4, 'De 0,50 a 4 m');
    if (!['chapa', 'malla'].includes(pt?.relleno)) errores['obraCivil.porton.relleno'] = 'Chapa o malla';
  }
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
  const tapial = sub('tapial');
  // v1.80: los proyectos de antes (y valores raros) quedan con lo de fábrica.
  if (!(tapial.ladrillo in LADRILLOS_TAPIAL)) tapial.ladrillo = 'hueco12';
  if (!['fenolico', 'ninguno'].includes(tapial.encofrado)) tapial.encofrado = 'fenolico';
  const albanil = tapial.segunAlbanil && typeof tapial.segunAlbanil === 'object' ? tapial.segunAlbanil : {};
  tapial.segunAlbanil = Object.fromEntries(Object.entries(albanil).filter(([k, v]) => MATERIALES_ALBANIL.some(([c]) => c === k) && Number.isFinite(v) && v > 0));
  const porton = sub('porton');
  return {
    ...OBRA_CIVIL_INICIAL, ...base,
    hormigon: sub('hormigon'), mortero: sub('mortero'), pilotin: sub('pilotin'), tapial,
    pilar: sub('pilar'), camara: sub('camara'), pozo: sub('pozo'), porton,
  };
}
