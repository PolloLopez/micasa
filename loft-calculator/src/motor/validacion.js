// ==========================================================
// VALIDACIÓN DE PARÁMETROS Y ABERTURAS
// ----------------------------------------------------------
// Devuelve un objeto { campo: 'mensaje de error' }.
// Si el objeto está vacío, los datos son válidos.
// El cálculo y el visor 3D SOLO trabajan con datos válidos:
// así una separación en 0 no puede colgar el navegador.
// Los campos de cada pared usan la clave "paredes.A.separacionVerticales".
// ==========================================================

import { LIMITES, LIMITES_PARED, LADOS, ALTURA_PISO_2 } from './constantes.js';
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
  });
  if (!esIdValido(params.panelTecho)) anotar('panelTecho', 'Elegí un tipo de panel');

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
