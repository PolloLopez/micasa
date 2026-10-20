// ==========================================================
// VALIDACIÓN DE PARÁMETROS Y ABERTURAS
// ----------------------------------------------------------
// Devuelve un objeto { campo: 'mensaje de error' }.
// Si el objeto está vacío, los datos son válidos.
// El cálculo y el visor 3D SOLO trabajan con datos válidos:
// así una separación en 0 no puede colgar el navegador.
// Los campos de cada pared usan la clave "paredes.A.separacionVerticales".
// ==========================================================

import {
  LIMITES, LIMITES_PARED, LIMITES_ESCALERA, LIMITES_GRADA, LIMITES_COMPONENTE, LIMITES_MESA, LIMITES_TANQUE, LADOS, ALTURA_PISO_2, CAMPOS_PERFIL_PARED } from './constantes.js';
import { calcularEscalones, DESCANSOS_POR_FORMA } from './escalera.js';
import { revisarEdicion, PERFILES_ASIGNABLES } from './edicionPiezas.js';
import { revisarAgregadas } from './piezasAgregadas.js';

/** Largo máximo del texto de la etiqueta de una pared en el 3D. */
export const LARGO_MAXIMO_ETIQUETA = 30;
import { geometriaLados, alturaEn, puntoSobreLado, largoLado, tramoEntrepiso } from './geometria.js';

/** Revisa un número contra su { min, max, entero, opcional }. */
function revisarNumero(valor, { min, max, entero, opcional }) {
  if (typeof valor !== 'number' || !Number.isFinite(valor)) return 'Ingresá un número';
  if (opcional && valor === 0) return null;
  if (entero && !Number.isInteger(valor)) return 'Debe ser un número entero';
  if (valor < min) return `Mínimo ${min}`; // los opcionales se apagan con su casilla (v1.19)
  if (valor > max) return `Máximo ${max}`;
  return null;
}

const esIdValido = (id) => typeof id === 'string' && id.length > 0;

/**
 * Verifica que los tipos de panel elegidos (paredes y techo) existan
 * en el catálogo. Devuelve el problema o null.
 */
export function validarPanelesUsados(params, catalogo) {
  const existe = (id) => catalogo.some((p) => p.categoria === 'panel' && p.id === id);
  const ladoSinPanel = LADOS.find((lado) => !existe(params.paredes[lado].panel));
  if (ladoSinPanel) return `La pared del lado ${ladoSinPanel} usa un tipo de panel que no existe`;
  const ladoSinInterior = LADOS.find((lado) => params.paredes[lado].panelInterior && !existe(params.paredes[lado].panelInterior));
  if (ladoSinInterior) return `El revestimiento interior del lado ${ladoSinInterior} no existe`;
  if (!existe(params.panelTecho)) return 'El techo usa un tipo de panel que no existe';
  return null;
}

export function validarParametros(params) {
  const errores = {};
  const anotar = (campo, error) => {
    if (error && !errores[campo]) errores[campo] = error;
  };

  Object.entries(LIMITES).forEach(([campo, limites]) => anotar(campo, revisarNumero(params[campo], limites)));

  // Lados elegidos (frente, entrepiso, caída del techo).
  ['ladoFrente', 'ladoEntrepiso', 'caidaTecho'].forEach((campo) => {
    if (!LADOS.includes(params[campo])) anotar(campo, 'Elegí un lado');
  });

  // Configuración de cada pared.
  LADOS.forEach((lado) => {
    const pared = params.paredes?.[lado];
    Object.entries(LIMITES_PARED).forEach(([campo, limites]) =>
      anotar(`paredes.${lado}.${campo}`, revisarNumero(pared?.[campo], limites))
    );
    if (!esIdValido(pared?.panel)) anotar(`paredes.${lado}.panel`, 'Elegí un tipo de panel');
    if (typeof pared?.panelInterior !== 'string') anotar(`paredes.${lado}.panelInterior`, 'Valor inválido');
    if (typeof pared?.etiqueta !== 'string' || pared.etiqueta.length > LARGO_MAXIMO_ETIQUETA) {
      anotar(`paredes.${lado}.etiqueta`, `La etiqueta puede tener hasta ${LARGO_MAXIMO_ETIQUETA} letras`);
    }
    if (typeof pared?.mostrarEtiqueta !== 'boolean') anotar(`paredes.${lado}.mostrarEtiqueta`, 'Valor inválido');
    if (!['no', 'extremos', 'todos'].includes(pared?.riostras)) anotar(`paredes.${lado}.riostras`, 'Elegí sin, en las puntas o en todos');
    // v1.22: id de un perfil de la lista ('' = el general). Si el perfil ya no existe, se usa el general.
    CAMPOS_PERFIL_PARED.forEach((campo) => {
      if (typeof pared?.[campo] !== 'string' || pared[campo].length > 40) anotar(`paredes.${lado}.${campo}`, 'Perfil inválido');
    });
  });
  if (!esIdValido(params.panelTecho)) anotar('panelTecho', 'Elegí un tipo de panel');
  if (!Array.isArray(params.piezasEliminadas) || !params.piezasEliminadas.every(esIdValido) || params.piezasEliminadas.length > 5000) {
    anotar('piezasEliminadas', 'Lista de piezas eliminadas inválida');
  }
  const ediciones = params.piezasEditadas;
  if (!ediciones || typeof ediciones !== 'object' || Array.isArray(ediciones) || Object.keys(ediciones).length > 5000) {
    anotar('piezasEditadas', 'Lista de piezas editadas inválida');
  } else {
    const problema = Object.values(ediciones).map(revisarEdicion).find(Boolean);
    if (problema) anotar('piezasEditadas', problema);
  }

  // v1.16: piezas duplicadas a mano.
  anotar('piezasAgregadas', revisarAgregadas(params.piezasAgregadas, PERFILES_ASIGNABLES));

  validarEscalera(params, anotar);
  validarGrada(params, anotar);
  validarMontaje(params, anotar);

  if (Object.keys(errores).length > 0) return errores;

  // Reglas que relacionan varios campos.
  const profundidadDisponible =
    params.ladoEntrepiso === 'A' || params.ladoEntrepiso === 'C' ? params.ancho : params.largo;
  if (params.anchoEntrepiso > profundidadDisponible) {
    anotar('anchoEntrepiso', `No puede superar ${profundidadDisponible.toFixed(2)} m`);
  }
  validarEntrepisoParcial(params, anotar);
  if (params.anchoEntrepiso > 0 && params.altura < ALTURA_PISO_2 + 0.5) {
    anotar('altura', `Con entrepiso, la altura mínima es ${ALTURA_PISO_2 + 0.5} m`);
  }

  return errores;
}

/** Lado opuesto y lados vecinos (sin importar geometria.js para no cruzar dependencias). */
const opuesto = (lado) => LADOS[(LADOS.indexOf(lado) + 2) % 4];

/**
 * Escalera: rangos, opciones y reglas entre campos. Los avisos de
 * comodidad o de si entra en la planta NO son errores (ver escalera.js).
 */
/** Tipos de proyecto: una construcción (loft, galpón...) o una grada suelta. */
export const TIPOS_PROYECTO = ['construccion', 'grada', 'montaje'];

/** Grada (solo se usa si tipoProyecto = 'grada', pero siempre tiene que ser válida). */
function validarGrada(params, anotar) {
  if (!TIPOS_PROYECTO.includes(params.tipoProyecto)) anotar('tipoProyecto', 'Tipo de proyecto inválido');
  const grada = params.grada;
  if (!grada || typeof grada !== 'object') {
    anotar('grada', 'Faltan los datos de la grada');
    return;
  }
  Object.entries(LIMITES_GRADA).forEach(([campo, limites]) => anotar(`grada.${campo}`, revisarNumero(grada[campo], limites)));
  if (!['no', 'extremos', 'todos'].includes(grada.riostras)) anotar('grada.riostras', 'Elegí dónde van las riostras');
  if (!['separados', 'mismoMaterial', 'unico'].includes(grada.tipoTablones)) anotar('grada.tipoTablones', 'Elegí el tipo de tablones');
  ['unionParantes', 'respaldo', 'filasAtornillables'].forEach((campo) => {
    if (typeof grada[campo] !== 'boolean') anotar(`grada.${campo}`, 'Valor inválido');
  });
  // La unión de parantes va por debajo de la primera fila (si no, choca con el apoyo).
  if (grada.unionParantes && grada.alturaUnion > grada.contrahuella - 0.1 + 1e-9) {
    anotar('grada.alturaUnion', `La unión tiene que ir por debajo de la primera fila (hasta ${((grada.contrahuella - 0.1) * 100).toFixed(0)} cm)`);
  }
  if (grada.respaldo && grada.anchoRespaldo > grada.contrahuella + 1e-9) {
    anotar('grada.anchoRespaldo', `El respaldo no puede ser más alto que la contrahuella (${(grada.contrahuella * 100).toFixed(0)} cm)`);
  }
  // Cada módulo tiene que tener por lo menos 1 m (si no, no se puede armar).
  if (grada.largoFila / grada.modulos < 1 - 1e-9) {
    anotar('grada.modulos', `Con ${grada.largoFila.toFixed(2)} m entran hasta ${Math.floor(grada.largoFila)} módulos (mínimo 1 m cada uno)`);
  }
  if (grada.tipoTablones === 'unico') {
    // Los N tablones tienen que entrar en la profundidad de la fila.
    if (grada.tablonesPorFila * grada.anchoTablon > grada.huella + 1e-9) {
      const total = (grada.tablonesPorFila * grada.anchoTablon * 100).toFixed(0);
      anotar('grada.anchoTablon', `${grada.tablonesPorFila} tablones de ${(grada.anchoTablon * 100).toFixed(0)} cm (${total} cm) no entran en la fila de ${(grada.huella * 100).toFixed(0)} cm`);
      anotar('grada.tablonesPorFila', `No entran en la fila de ${(grada.huella * 100).toFixed(0)} cm`);
      anotar('grada.huella', 'La fila es más angosta que los tablones');
    }
  } else if (grada.anchoAsiento + grada.anchoPie > grada.huella + 1e-9) {
    anotar('grada.anchoAsiento', `Asiento + pie (${((grada.anchoAsiento + grada.anchoPie) * 100).toFixed(0)} cm) no entran en la fila de ${(grada.huella * 100).toFixed(0)} cm`);
    anotar('grada.anchoPie', `Asiento + pie no entran en la fila de ${(grada.huella * 100).toFixed(0)} cm`);
    anotar('grada.huella', 'La fila es más angosta que asiento + pie');
  }
}

/** Largo máximo del nombre de un componente de montaje. */
export const LARGO_MAXIMO_NOMBRE_COMPONENTE = 40;

/**
 * Montaje: lista de componentes (mesas, tanques). Cada error se anota en
 * "montaje.componentes.<i>.<campo>" para que salga en su campo.
 */
function validarMontaje(params, anotar) {
  const montaje = params.montaje;
  if (!montaje || typeof montaje !== 'object' || !Array.isArray(montaje.componentes) || montaje.componentes.length > 30) {
    anotar('montaje', 'Lista de componentes inválida (hasta 30)');
    return;
  }
  const ids = new Set();
  montaje.componentes.forEach((c, i) => {
    const ruta = `montaje.componentes.${i}`;
    if (!c || typeof c !== 'object') return anotar(ruta, 'Componente inválido');
    if (typeof c.id !== 'string' || !c.id || ids.has(c.id)) anotar(`${ruta}.id`, 'Id de componente repetido o vacío');
    ids.add(c.id);
    if (typeof c.nombre !== 'string' || c.nombre.length > LARGO_MAXIMO_NOMBRE_COMPONENTE) {
      anotar(`${ruta}.nombre`, `El nombre puede tener hasta ${LARGO_MAXIMO_NOMBRE_COMPONENTE} letras`);
    }
    if (![0, 90].includes(c.rotacion)) anotar(`${ruta}.rotacion`, 'Elegí 0° o 90°');
    const limites = { mesa: LIMITES_MESA, tanque: LIMITES_TANQUE }[c.tipo];
    if (!limites) return anotar(`${ruta}.tipo`, 'Tipo de componente desconocido');
    Object.entries({ ...LIMITES_COMPONENTE, ...limites }).forEach(([campo, l]) => anotar(`${ruta}.${campo}`, revisarNumero(c[campo], l)));
    if (c.tipo === 'mesa') {
      if (typeof c.marcoInferior !== 'boolean') anotar(`${ruta}.marcoInferior`, 'Valor inválido');
      if (!['no', 'cabeceras', 'todas'].includes(c.riostras)) anotar(`${ruta}.riostras`, 'Elegí dónde van las riostras');
      if (!['ninguna', 'chapa', 'madera'].includes(c.tapa)) anotar(`${ruta}.tapa`, 'Elegí la tapa');
      if (c.marcoInferior && c.alturaMarcoInferior >= c.alto - 0.05) anotar(`${ruta}.alturaMarcoInferior`, 'El marco inferior tiene que quedar debajo del superior');
    } else {
      if (!['vertical', 'horizontal'].includes(c.orientacion)) anotar(`${ruta}.orientacion`, 'Elegí vertical u horizontal');
      if (!['ninguna', 'una', 'dos'].includes(c.tapas)) anotar(`${ruta}.tapas`, 'Elegí cuántas tapas');
      if (c.orientacion === 'horizontal' && c.apoyos > 4) anotar(`${ruta}.apoyos`, 'Un tanque horizontal lleva de 2 a 4 cunas');
    }
  });
}

/**
 * Entrepiso parcial (v1.14): que el tramo elegido entre en el lado donde se apoya.
 * Con largoEntrepiso = 0 ocupa todo el lado y no hay nada que revisar.
 */
function validarEntrepisoParcial(params, anotar) {
  if (!['izquierda', 'derecha'].includes(params.referenciaEntrepiso)) {
    anotar('referenciaEntrepiso', 'Elegí izquierda o derecha');
    return;
  }
  if (!(params.largoEntrepiso > 0)) return;
  const largoDelLado = largoLado(params.ladoEntrepiso, params);
  if (params.largoEntrepiso > largoDelLado + 1e-9) {
    anotar('largoEntrepiso', `No puede superar el largo de la pared (${largoDelLado.toFixed(2)} m)`);
    return;
  }
  const sobra = largoDelLado - params.largoEntrepiso;
  if (params.distanciaEntrepiso > sobra + 1e-9) {
    anotar('distanciaEntrepiso', `Con ese largo, la distancia a la esquina va de 0 a ${sobra.toFixed(2)} m`);
  }
}

function validarEscalera(params, anotar) {
  const esc = params.escalera;
  if (!esc || typeof esc !== 'object') {
    anotar('escalera', 'Faltan los datos de la escalera');
    return;
  }
  if (typeof esc.activa !== 'boolean') anotar('escalera.activa', 'Valor inválido');
  if (typeof esc.riostras !== 'boolean') anotar('escalera.riostras', 'Valor inválido');
  if (!(esc.forma in DESCANSOS_POR_FORMA)) anotar('escalera.forma', 'Elegí recta, en L, en U o 3/4 de vuelta');
  if (!Array.isArray(esc.descansos) || !esc.descansos.every(Number.isInteger)) anotar('escalera.descansos', 'Lista de descansos inválida');
  if (!['angulos', 'cano'].includes(esc.tipoApoyo)) anotar('escalera.tipoApoyo', 'Elegí ángulos o caño');
  if (![1, 2, 4].includes(esc.columnasDescanso)) anotar('escalera.columnasDescanso', 'Elegí 1, 2 o 4');
  Object.entries(LIMITES_ESCALERA).forEach(([campo, limites]) =>
    anotar(`escalera.${campo}`, revisarNumero(esc[campo], limites)));
  ['bajaHacia', 'giroHacia'].forEach((campo) => {
    if (!LADOS.includes(esc[campo])) anotar(`escalera.${campo}`, 'Elegí una pared');
  });
  if (!esc.activa) return;

  // Reglas que solo importan si la escalera está puesta.
  if (!(params.anchoEntrepiso > 0)) {
    anotar('escalera.activa', 'La escalera necesita un entrepiso: destildá "Lleva escalera" o tildá "Lleva entrepiso"');
    return;
  }
  if (esc.bajaHacia === params.ladoEntrepiso) {
    anotar('escalera.bajaHacia', 'No puede bajar hacia la pared donde se apoya el entrepiso');
  }
  // El borde libre mide lo que mide el entrepiso (todo el lado o el tramo del entrepiso parcial).
  const largoBorde = tramoEntrepiso(params).largo;
  const perpendicular = esc.bajaHacia === opuesto(params.ladoEntrepiso);
  const minimo = perpendicular ? esc.ancho / 2 : 0;
  if (esc.posicion < minimo - 1e-9 || esc.posicion > largoBorde - minimo + 1e-9) {
    anotar('escalera.posicion', `Sobre el borde del entrepiso va de ${minimo.toFixed(2)} a ${(largoBorde - minimo).toFixed(2)} m`);
  }
  const cantidad = DESCANSOS_POR_FORMA[esc.forma] ?? 0;
  if (cantidad > 0) {
    validarDescansos(esc, cantidad, anotar);
    const giraPerpendicular = esc.giroHacia !== esc.bajaHacia && esc.giroHacia !== opuesto(esc.bajaHacia);
    if (!giraPerpendicular) anotar('escalera.giroHacia', 'El segundo tramo tiene que girar 90° (elegí una pared de costado)');
  }
}

/**
 * Descansos: uno por giro, en orden de abajo hacia arriba, y cada tramo
 * (incluido el de abajo y el de arriba) con al menos 2 contrahuellas.
 * El error se anota en 'escalera.descansos.<i>' (el campo de ese descanso).
 */
function validarDescansos(esc, cantidad, anotar) {
  if (!Array.isArray(esc.descansos) || esc.descansos.length < cantidad) {
    anotar('escalera.descansos', `Faltan descansos: esta forma lleva ${cantidad}`);
    return;
  }
  const { contrahuellas } = calcularEscalones(esc);
  if (contrahuellas < 2 * (cantidad + 1)) {
    anotar('escalera.forma', `Con ${contrahuellas} contrahuellas no alcanza para ${cantidad + 1} tramos de 2 o más`);
    return;
  }
  // Cada descanso se controla contra sus vecinos (el de abajo y el de arriba),
  // así el mensaje sale en el campo que se está cambiando.
  for (let i = 0; i < cantidad; i++) {
    const m = esc.descansos[i];
    const abajo = i === 0 ? 0 : esc.descansos[i - 1];
    const arriba = i === cantidad - 1 ? contrahuellas : esc.descansos[i + 1];
    const minimo = abajo + 2;
    const maximo = arriba - 2;
    if (!Number.isInteger(m) || m < minimo || m > maximo) {
      anotar(`escalera.descansos.${i}`, minimo > maximo
        ? `El descanso ${i + 1} no entra: dejá al menos 2 contrahuellas entre descansos`
        : `El descanso ${i + 1} va entre la contrahuella ${minimo} y la ${maximo}`);
    }
  }
}

/**
 * Altura libre de la pared sobre el tramo [desde, hasta] (en metros
 * medidos desde la esquina izquierda). Si la pared tiene pendiente,
 * se toma la parte más baja del tramo.
 */
function alturaLibreEnTramo(lado, desde, hasta, params) {
  const geo = geometriaLados(params)[lado];
  return Math.min(
    alturaEn(...puntoSobreLado(geo, desde), params),
    alturaEn(...puntoSobreLado(geo, hasta), params)
  );
}

/** Distancia (desde la esquina izquierda) donde arranca la abertura. */
export function inicioAbertura(abertura, params) {
  const largo = largoLado(abertura.lado, params);
  return abertura.ladoReferencia === 'izquierda'
    ? abertura.offsetHorizontal
    : largo - abertura.offsetHorizontal - abertura.ancho;
}

/**
 * Verifica que la abertura entre en su pared.
 * Devuelve un texto con el problema, o null si está bien.
 */
export function validarAbertura(abertura, params) {
  const { ancho, alto, offsetHorizontal, alturaAntepecho, lado } = abertura;
  if (!LADOS.includes(lado)) return 'Elegí una pared';
  // v1.17: etiqueta propia (opcional; si falta se muestra solo el número).
  if (abertura.etiqueta !== undefined && (typeof abertura.etiqueta !== 'string' || abertura.etiqueta.length > LARGO_MAXIMO_ETIQUETA)) {
    return `La etiqueta puede tener hasta ${LARGO_MAXIMO_ETIQUETA} letras`;
  }
  if (!(ancho > 0) || !(alto > 0)) return 'Ancho y alto deben ser mayores a 0';
  if (offsetHorizontal < 0 || alturaAntepecho < 0) return 'Las distancias no pueden ser negativas';

  const largo = largoLado(lado, params);
  if (offsetHorizontal + ancho > largo + 1e-9) {
    return `No entra en la pared (${largo.toFixed(2)} m): distancia + ancho = ${(offsetHorizontal + ancho).toFixed(2)} m`;
  }
  const inicio = inicioAbertura(abertura, params);
  const alturaLibre = alturaLibreEnTramo(lado, inicio, inicio + ancho, params);
  if (alturaAntepecho + alto > alturaLibre + 1e-9) {
    return `Supera la altura de la pared en ese tramo (${alturaLibre.toFixed(2)} m)`;
  }
  return null;
}

/**
 * Copia de una abertura (v1.15, "Duplicar"): misma medida, al lado de la
 * original si entra en la pared y no pisa otra abertura; si no, del otro
 * lado; si tampoco, en el mismo lugar (para moverla a mano).
 * @param aberturas todas las aberturas (para no superponer)
 * @param id        id de la copia
 */
export function copiarAbertura(abertura, aberturas, params, id) {
  const SEPARACION = 0.3; // 30 cm entre la original y la copia
  const pisaOtra = (nueva) => pisaOtraAbertura(nueva, aberturas, params);
  const paso = abertura.ancho + SEPARACION;
  const candidatas = [abertura.offsetHorizontal + paso, abertura.offsetHorizontal - paso]
    .filter((offset) => offset >= 0)
    .map((offset) => ({ ...abertura, id, offsetHorizontal: Number(offset.toFixed(4)) }));
  return candidatas.find((c) => !validarAbertura(c, params) && !pisaOtra(c)) ?? { ...abertura, id };
}

/** true si `nueva` se superpone (a lo largo de la pared) con otra abertura de la misma pared. */
export function pisaOtraAbertura(nueva, aberturas, params) {
  const a = inicioAbertura(nueva, params);
  return aberturas.some((op) => {
    if (op.id === nueva.id || op.lado !== nueva.lado) return false;
    const b = inicioAbertura(op, params);
    return a < b + op.ancho - 1e-9 && b < a + nueva.ancho - 1e-9;
  });
}

/** Medidas de arranque de una puerta y de una ventana nuevas. */
const ABERTURA_NUEVA = {
  puerta: { ancho: 0.9, alto: 2.05, alturaAntepecho: 0 },
  ventana: { ancho: 1, alto: 1, alturaAntepecho: 1 },
};

/**
 * Puerta o ventana nueva en una pared (v1.17: "+ Puerta" / "+ Ventana" dentro de cada pared).
 * Se busca el primer lugar libre desde la esquina izquierda (cada 10 cm, dejando 30 cm de la esquina).
 * @returns {{ abertura } | { error }}
 */
export function aberturaNueva(tipo, lado, aberturas, params, id) {
  const base = {
    id, tipo, lado, ladoReferencia: 'izquierda', offsetHorizontal: 0.3, etiqueta: '', mostrarEtiqueta: true,
    ...ABERTURA_NUEVA[tipo],
  };
  const largo = largoLado(lado, params);
  for (let offset = 0.3; offset + base.ancho <= largo + 1e-9; offset += 0.1) {
    const prueba = { ...base, offsetHorizontal: Number(offset.toFixed(2)) };
    if (!validarAbertura(prueba, params) && !pisaOtraAbertura(prueba, aberturas, params)) return { abertura: prueba };
  }
  return { error: `No hay lugar libre para una ${tipo} de ${base.ancho.toFixed(2)} m en esta pared` };
}
