// ==========================================================
// VALIDACIÓN DE PARÁMETROS Y ABERTURAS
// ----------------------------------------------------------
// Devuelve un objeto { campo: 'mensaje de error' }.
// Si el objeto está vacío, los datos son válidos.
// El cálculo y el visor 3D SOLO trabajan con datos válidos:
// así una separación en 0 no puede colgar el navegador.
// Los campos de cada pared usan la clave "paredes.A.separacionVerticales".
// ==========================================================

import { LIMITES, LIMITES_PARED, LIMITES_ESCALERA, LADOS, ALTURA_PISO_2 } from './constantes.js';
import { calcularEscalones, DESCANSOS_POR_FORMA } from './escalera.js';
import { revisarEdicion } from './edicionPiezas.js';

/** Largo máximo del texto de la etiqueta de una pared en el 3D. */
export const LARGO_MAXIMO_ETIQUETA = 30;
import { geometriaLados, alturaEn, puntoSobreLado, largoLado } from './geometria.js';

/** Revisa un número contra su { min, max, entero, opcional }. */
function revisarNumero(valor, { min, max, entero, opcional }) {
  if (typeof valor !== 'number' || !Number.isFinite(valor)) return 'Ingresá un número';
  if (opcional && valor === 0) return null;
  if (entero && !Number.isInteger(valor)) return 'Debe ser un número entero';
  if (valor < min) return opcional ? `Mínimo ${min} (o 0 = sin)` : `Mínimo ${min}`;
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
    if (typeof pared?.etiqueta !== 'string' || pared.etiqueta.length > LARGO_MAXIMO_ETIQUETA) {
      anotar(`paredes.${lado}.etiqueta`, `La etiqueta puede tener hasta ${LARGO_MAXIMO_ETIQUETA} letras`);
    }
    if (typeof pared?.mostrarEtiqueta !== 'boolean') anotar(`paredes.${lado}.mostrarEtiqueta`, 'Valor inválido');
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

  validarEscalera(params, anotar);

  if (Object.keys(errores).length > 0) return errores;

  // Reglas que relacionan varios campos.
  const profundidadDisponible =
    params.ladoEntrepiso === 'A' || params.ladoEntrepiso === 'C' ? params.ancho : params.largo;
  if (params.anchoEntrepiso > profundidadDisponible) {
    anotar('anchoEntrepiso', `No puede superar ${profundidadDisponible.toFixed(2)} m`);
  }
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
function validarEscalera(params, anotar) {
  const esc = params.escalera;
  if (!esc || typeof esc !== 'object') {
    anotar('escalera', 'Faltan los datos de la escalera');
    return;
  }
  if (typeof esc.activa !== 'boolean') anotar('escalera.activa', 'Valor inválido');
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
    anotar('escalera.activa', 'La escalera necesita un entrepiso (ancho mayor a 0)');
    return;
  }
  if (esc.bajaHacia === params.ladoEntrepiso) {
    anotar('escalera.bajaHacia', 'No puede bajar hacia la pared donde se apoya el entrepiso');
  }
  const largoBorde = params.ladoEntrepiso === 'A' || params.ladoEntrepiso === 'C' ? params.largo : params.ancho;
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
