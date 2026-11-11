// ==========================================================
// PERSONAS EN EL 3D (v1.45)
// ----------------------------------------------------------
// Figuras simples (cápsulas y esferas, sin modelos que bajar) armadas como
// un muñeco articulado: cadera → torso → hombros → codos, y cadera →
// piernas → rodillas. Cada "pose" (parada, caminando, agachada, estirada,
// alcanzando) es una lista de ángulos de esas articulaciones; de una pose a
// otra se pasa de a poco (se ve como un movimiento).
//
// crearPersonasEnEscena(escena) maneja a todas: las crea o cambia cuando
// cambian sus datos, las hace caminar por el camino que da motor/recorrido
// (esquivando paredes y muebles), con el teclado o hasta lo que tocaste, y
// hace lo que corresponde al llegar (agacharse, estirarse…).
//
// Convención (la misma de los muebles): el frente de la figura es su +z.
// rotation.y = θ lleva +z hacia (sen θ, cos θ) en la planta.
// ==========================================================

import * as THREE from 'three';
import { mapaDelNivel, buscarCamino, moverConChoque, libreMasCercano, puntoLibre, TAMANIO_CELDA } from './motor/recorrido.js';

const PIEL = '#d9a57e';
const PELO = '#3b2a20';
const PANTALON = '#334155';
const ROPA_DE_FABRICA = { mujer: '#db2777', hombre: '#2563eb' };
const VELOCIDAD = 1.2; // m/s caminando
const VELOCIDAD_CORRIENDO = 2.6;
const DURACION_ACCION = 1.8; // segundos agachada, estirada o alcanzando

// ---------- la figura ----------

/** Proporciones según la altura (H) y el sexo: medidas de cada parte del cuerpo. */
function proporciones(altura, sexo) {
  const H = altura;
  const mujer = sexo === 'mujer';
  return {
    H, mujer,
    muslo: 0.26 * H, pantorrilla: 0.24 * H, pie: 0.03 * H, // cadera a 0,53 H del piso
    torso: 0.3 * H, // de la cadera a los hombros
    hombros: (mujer ? 0.095 : 0.112) * H, // medio ancho
    caderas: (mujer ? 0.075 : 0.062) * H,
    brazo: 0.18 * H, antebrazo: 0.17 * H,
    cabeza: 0.062 * H, cuello: 0.045 * H,
  };
}

const capsula = (radio, largo, material) => new THREE.Mesh(new THREE.CapsuleGeometry(radio, Math.max(0.001, largo - 2 * radio), 4, 10), material);
const esfera = (radio, material) => new THREE.Mesh(new THREE.SphereGeometry(radio, 16, 12), material);

/** Una articulación: un grupo vacío en `posicion`, del que cuelga lo que se le agregue. */
function articulacion(padre, [x, y, z]) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  padre.add(g);
  return g;
}

/** Arma el muñeco. @returns {{ raiz, juntas, medidas, materiales, anillo }} */
export function crearFigura(persona) {
  const m = proporciones(persona.altura, persona.sexo);
  const materiales = {
    piel: new THREE.MeshStandardMaterial({ color: PIEL, roughness: 0.7 }),
    pelo: new THREE.MeshStandardMaterial({ color: PELO, roughness: 0.9 }),
    ropa: new THREE.MeshStandardMaterial({ color: persona.colorRopa || ROPA_DE_FABRICA[persona.sexo], roughness: 0.8 }),
    pantalon: new THREE.MeshStandardMaterial({ color: PANTALON, roughness: 0.85 }),
    anillo: new THREE.MeshBasicMaterial({ color: '#facc15', transparent: true, opacity: 0.9, depthTest: false }),
  };
  const raiz = new THREE.Group();
  raiz.userData.idPersona = persona.id;
  const cadera = articulacion(raiz, [0, m.muslo + m.pantorrilla + m.pie, 0]);

  // Pelvis (más ancha en la mujer) y torso, que se inclina desde la cadera.
  const pelvis = capsula(m.caderas * 0.9, m.caderas * 2.4, materiales.pantalon);
  pelvis.rotation.z = Math.PI / 2;
  pelvis.position.y = 0.02 * m.H;
  cadera.add(pelvis);
  const torso = articulacion(cadera, [0, 0, 0]);
  const pecho = capsula(m.hombros * 0.72, m.torso * 0.85, materiales.ropa);
  pecho.position.y = m.torso * 0.52;
  pecho.scale.set(1.15, 1, 0.75); // más ancho que profundo
  torso.add(pecho);

  // Cuello y cabeza (con pelo: corto, o largo atrás en la mujer).
  const cabeza = articulacion(torso, [0, m.torso + m.cuello, 0]);
  const cuello = capsula(m.cabeza * 0.4, m.cuello * 1.4, materiales.piel);
  cuello.position.y = -m.cuello * 0.4;
  cabeza.add(cuello);
  const craneo = esfera(m.cabeza, materiales.piel);
  craneo.position.y = m.cabeza * 0.9;
  craneo.scale.set(0.9, 1.05, 1);
  cabeza.add(craneo);
  // Ojos: dos puntitos al frente, para que se note hacia dónde mira.
  const ojo = new THREE.MeshStandardMaterial({ color: '#1e293b' });
  materiales.ojos = ojo;
  [-1, 1].forEach((lado) => {
    const o = esfera(m.cabeza * 0.12, ojo);
    o.position.set(lado * m.cabeza * 0.35, m.cabeza * 0.95, m.cabeza * 0.9);
    cabeza.add(o);
  });
  const pelo = new THREE.Mesh(new THREE.SphereGeometry(m.cabeza * 1.06, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), materiales.pelo);
  pelo.position.set(0, m.cabeza * 0.95, -m.cabeza * 0.06);
  pelo.scale.set(0.92, 1.05, 1.02);
  cabeza.add(pelo);
  if (m.mujer) {
    const largo = new THREE.Mesh(new THREE.BoxGeometry(m.cabeza * 1.7, m.cabeza * 2.6, m.cabeza * 0.5), materiales.pelo);
    largo.position.set(0, -m.cabeza * 0.1, -m.cabeza * 0.75);
    cabeza.add(largo);
  }

  // Brazos: hombro → brazo → codo → antebrazo y mano. Cuelgan hacia abajo (−y).
  const brazo = (signo) => {
    const hombro = articulacion(torso, [signo * m.hombros, m.torso * 0.93, 0]);
    const arriba = capsula(0.028 * m.H, m.brazo, materiales.ropa);
    arriba.position.y = -m.brazo / 2;
    hombro.add(arriba);
    const codo = articulacion(hombro, [0, -m.brazo, 0]);
    const abajo = capsula(0.024 * m.H, m.antebrazo * 0.8, materiales.piel);
    abajo.position.y = -m.antebrazo * 0.4;
    codo.add(abajo);
    const mano = esfera(0.03 * m.H, materiales.piel);
    mano.position.y = -m.antebrazo * 0.88;
    codo.add(mano);
    return { hombro, codo };
  };
  // Piernas: cadera → muslo → rodilla → pantorrilla y pie (el pie apunta al frente, +z).
  const pierna = (signo) => {
    const ingle = articulacion(cadera, [signo * m.caderas * 0.85, 0, 0]);
    const muslo = capsula(0.045 * m.H, m.muslo, materiales.pantalon);
    muslo.position.y = -m.muslo / 2;
    ingle.add(muslo);
    const rodilla = articulacion(ingle, [0, -m.muslo, 0]);
    const pantorrilla = capsula(0.036 * m.H, m.pantorrilla, materiales.pantalon);
    pantorrilla.position.y = -m.pantorrilla / 2;
    rodilla.add(pantorrilla);
    const pie = new THREE.Mesh(new THREE.BoxGeometry(0.055 * m.H, m.pie, 0.14 * m.H), materiales.pelo);
    pie.position.set(0, -m.pantorrilla - m.pie / 2, 0.035 * m.H);
    rodilla.add(pie);
    return { ingle, rodilla };
  };
  const [bi, bd, pi, pd] = [brazo(1), brazo(-1), pierna(1), pierna(-1)];

  // Anillo en el piso: se ve cuando la persona está elegida.
  const anillo = new THREE.Mesh(new THREE.RingGeometry(0.28, 0.34, 32), materiales.anillo);
  anillo.rotation.x = -Math.PI / 2;
  anillo.position.y = 0.01;
  anillo.renderOrder = 999;
  anillo.visible = false;
  raiz.add(anillo);

  raiz.traverse((o) => { if (o.isMesh && o !== anillo) o.castShadow = true; });
  return {
    raiz, medidas: m, materiales, anillo,
    juntas: { cadera, torso, cabeza, hombroI: bi.hombro, codoI: bi.codo, hombroD: bd.hombro, codoD: bd.codo,
      ingleI: pi.ingle, rodillaI: pi.rodilla, ingleD: pd.ingle, rodillaD: pd.rodilla },
  };
}

export function liberarFigura(figura) {
  figura.raiz.traverse((o) => { if (o.isMesh) o.geometry.dispose(); });
  Object.values(figura.materiales).forEach((mat) => mat.dispose());
}

// ---------- las poses ----------
// Ángulos en radianes, girando sobre el eje x de cada articulación: negativo lleva la pierna o el brazo hacia
// adelante; positivo en la rodilla dobla hacia atrás; positivo en el torso y la cabeza inclina hacia adelante.

const QUIETA = { ingleI: 0, rodillaI: 0, ingleD: 0, rodillaD: 0, hombroI: 0.05, codoI: -0.12, hombroD: 0.05, codoD: -0.12, torso: 0, cabeza: 0, puntas: 0 };

/** Ángulos de una pose. `fase` = en qué parte del paso va (solo al caminar). */
export function angulosDePose(pose, fase = 0) {
  if (pose === 'caminar') {
    const s = Math.sin(fase);
    return { ...QUIETA, ingleI: -0.45 * s, ingleD: 0.45 * s, rodillaI: 0.6 * Math.max(0, s), rodillaD: 0.6 * Math.max(0, -s),
      hombroI: 0.4 * s, hombroD: -0.4 * s, codoI: -0.35, codoD: -0.35, torso: 0.05 };
  }
  if (pose === 'agacharse') {
    return { ...QUIETA, ingleI: -1.4, rodillaI: 2.35, ingleD: -1.25, rodillaD: 2.2, torso: 0.55, cabeza: 0.35,
      hombroI: -0.9, codoI: -0.35, hombroD: -1.1, codoD: -0.25 };
  }
  if (pose === 'estirarse') {
    return { ...QUIETA, hombroI: -2.75, codoI: -0.1, hombroD: -2.85, codoD: -0.1, torso: -0.06, cabeza: -0.35, puntas: 1 };
  }
  if (pose === 'alcanzar') {
    return { ...QUIETA, hombroD: -1.45, codoD: -0.15, hombroI: 0.1, torso: 0.15, cabeza: 0.15 };
  }
  return { ...QUIETA };
}

/** Lleva la figura de a poco hacia los ángulos pedidos (`mezcla` de 0 a 1) y apoya los pies en el piso. */
export function aplicarPose(figura, objetivo, mezcla) {
  const { juntas: j, medidas: m } = figura;
  const actual = figura.angulos ?? (figura.angulos = { ...QUIETA });
  Object.keys(objetivo).forEach((k) => { actual[k] += (objetivo[k] - actual[k]) * mezcla; });
  ['ingleI', 'rodillaI', 'ingleD', 'rodillaD', 'hombroI', 'codoI', 'hombroD', 'codoD', 'torso', 'cabeza'].forEach((k) => {
    j[k].rotation.x = actual[k];
  });
  // Al estirarse los brazos se abren un poco (si no, se meten en la cabeza).
  j.hombroI.rotation.z = 0.25 * Math.min(1, -Math.min(0, actual.hombroI) / 2.7);
  j.hombroD.rotation.z = -0.25 * Math.min(1, -Math.min(0, actual.hombroD) / 2.7);
  // Alto de la cadera: lo que llega la pierna más estirada (así un pie queda siempre en el piso).
  const alto = (ingle, rodilla) => m.muslo * Math.cos(ingle) + m.pantorrilla * Math.cos(ingle + rodilla) + m.pie;
  j.cadera.position.y = Math.max(alto(actual.ingleI, actual.rodillaI), alto(actual.ingleD, actual.rodillaD)) + actual.puntas * 0.03 * m.H;
}

/** A qué altura (desde el piso) están los ojos ahora (agachada, más abajo). */
export function alturaDeOjos(figura) {
  const { juntas: j, medidas: m } = figura;
  const inclinacion = j.torso.rotation.x;
  return j.cadera.position.y + (m.torso + m.cuello + m.cabeza) * Math.cos(inclinacion);
}

// ---------- todas las personas de la escena ----------

/** El ángulo más corto de `a` a `b` (para girar por el lado más corto). */
const diferenciaAngulo = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));

/**
 * @returns API: sincronizar, elegir, ordenar, actualizar, idDe, estado, mostrar, asegurarVisitante, liberar, grupo
 */
export function crearPersonasEnEscena(escena) {
  const grupo = new THREE.Group();
  escena.add(grupo);
  /** id → { datos, figura | null, pos: [x, z], rumbo, camino, accion, mirarA, tiempoAccion, fase, pose } */
  const personas = new Map();
  let mapas = {}; // nivel → mapa (se rehacen al cambiar la obra)
  let elegida = null;

  const mapaDe = (nivel) => mapas[nivel] ?? mapas.piso;

  /** Un lugar libre para arrancar: cerca del medio, corridas una de otra. */
  const lugarInicial = (nivel, indice) => {
    const mapa = mapaDe(nivel);
    if (!mapa) return [0, 0];
    const celda = libreMasCercano(mapa, [-0.6 + indice * 0.7, 0.3]);
    return celda ? [mapa.x0 + (celda[0] + 0.5) * TAMANIO_CELDA, mapa.z0 + (celda[1] + 0.5) * TAMANIO_CELDA] : [0, 0];
  };

  /** Cambia las personas cuando cambian sus datos o la obra (las que siguen, se quedan donde estaban). */
  function sincronizar(lista, params, estructura) {
    mapas = { piso: mapaDelNivel(params, 'piso', estructura) };
    if (params.anchoEntrepiso > 0) mapas.piso2 = mapaDelNivel(params, 'piso2', estructura);
    const ids = new Set(lista.map((p) => p.id));
    [...personas.keys()].filter((id) => id !== 'visitante' && !ids.has(id)).forEach((id) => {
      const p = personas.get(id);
      if (p.figura) { grupo.remove(p.figura.raiz); liberarFigura(p.figura); }
      personas.delete(id);
    });
    lista.forEach((datos, indice) => {
      const antes = personas.get(datos.id);
      const cambioFigura = !antes || ['altura', 'sexo', 'colorRopa'].some((c) => antes.datos[c] !== datos[c]);
      const cambioNivel = antes && antes.datos.nivel !== datos.nivel;
      const p = antes ?? { pos: lugarInicial(datos.nivel, indice), rumbo: Math.PI, camino: [], accion: null, tiempoAccion: 0, fase: 0, pose: 'quieta' };
      if (cambioFigura) {
        if (antes?.figura) { grupo.remove(antes.figura.raiz); liberarFigura(antes.figura); }
        p.figura = crearFigura(datos);
        grupo.add(p.figura.raiz);
      }
      if (cambioNivel) { p.pos = lugarInicial(datos.nivel, indice); p.camino = []; }
      p.datos = datos;
      personas.set(datos.id, p);
    });
    // Si un mueble quedó encima de alguien, se corre a lo libre más cercano.
    personas.forEach((p) => {
      const mapa = mapaDe(p.datos.nivel);
      if (mapa && !puntoLibre(mapa, p.pos)) {
        const celda = libreMasCercano(mapa, p.pos);
        if (celda) p.pos = [mapa.x0 + (celda[0] + 0.5) * TAMANIO_CELDA, mapa.z0 + (celda[1] + 0.5) * TAMANIO_CELDA];
        p.camino = [];
      }
    });
    elegir(elegida);
  }

  /** Para la primera persona sin ninguna persona cargada: alguien invisible de 1,70 m. */
  function asegurarVisitante() {
    if (!personas.has('visitante')) {
      personas.set('visitante', { datos: { id: 'visitante', altura: 1.7, nivel: 'piso', sexo: 'hombre' }, figura: null,
        pos: lugarInicial('piso', 0), rumbo: Math.PI, camino: [], accion: null, tiempoAccion: 0, fase: 0, pose: 'quieta' });
    }
    return 'visitante';
  }

  function elegir(id) {
    elegida = id;
    personas.forEach((p, clave) => { if (p.figura) p.figura.anillo.visible = clave === id; });
  }

  /**
   * Manda a una persona a un punto (caminando por donde se puede). Al llegar mira hacia `mirarA` y hace `accion`
   * ('agacharse', 'estirarse', 'alcanzar' o null). @returns false si no hay forma de llegar
   */
  function ordenar(id, hasta, { accion = null, mirarA = null } = {}) {
    const p = personas.get(id);
    if (!p) return false;
    const camino = buscarCamino(mapaDe(p.datos.nivel), p.pos, hasta);
    if (camino.length === 0) return false;
    Object.assign(p, { camino, accion, mirarA, tiempoAccion: 0 });
    return true;
  }

  /**
   * Un cuadro de la animación.
   * @param dt segundos desde el cuadro anterior
   * @param control { id, avance: [dx, dz] | null (dirección en la planta, largo ≤ 1), correr, agachada, rumbo }:
   *   la persona manejada con el teclado (o null)
   */
  function actualizar(dt, control = null) {
    const mezcla = 1 - Math.exp(-dt * 10);
    personas.forEach((p, id) => {
      const mapa = mapaDe(p.datos.nivel);
      let rumboBuscado = p.rumbo;
      let pose = 'quieta';
      let caminado = 0;
      const manejada = control && control.id === id;
      if (manejada && control.avance) {
        // Con el teclado: deja lo que estaba haciendo y avanza (deslizándose contra paredes y muebles).
        p.camino = [];
        p.accion = null;
        const v = (control.correr ? VELOCIDAD_CORRIENDO : VELOCIDAD) * dt;
        const nuevo = moverConChoque(mapa, p.pos, [control.avance[0] * v, control.avance[1] * v]);
        caminado = Math.hypot(nuevo[0] - p.pos[0], nuevo[1] - p.pos[1]);
        p.pos = nuevo;
        rumboBuscado = control.rumbo ?? Math.atan2(control.avance[0], control.avance[1]);
        if (caminado > 1e-4) pose = 'caminar';
      } else if (p.camino.length > 0) {
        // Siguiendo su camino, punto por punto.
        let paso = VELOCIDAD * dt;
        while (paso > 0 && p.camino.length > 0) {
          const [tx, tz] = p.camino[0];
          const d = Math.hypot(tx - p.pos[0], tz - p.pos[1]);
          if (d > 1e-6) rumboBuscado = Math.atan2(tx - p.pos[0], tz - p.pos[1]);
          if (d <= paso) { p.pos = [tx, tz]; p.camino.shift(); paso -= d; caminado += d; } else {
            p.pos = [p.pos[0] + ((tx - p.pos[0]) / d) * paso, p.pos[1] + ((tz - p.pos[1]) / d) * paso];
            caminado += paso;
            paso = 0;
          }
        }
        pose = 'caminar';
        if (p.camino.length === 0 && p.accion) p.tiempoAccion = DURACION_ACCION; // llegó: ahora la acción
      } else if (p.tiempoAccion > 0) {
        p.tiempoAccion -= dt;
        pose = p.accion;
        if (p.mirarA) rumboBuscado = Math.atan2(p.mirarA[0] - p.pos[0], p.mirarA[1] - p.pos[1]);
        if (p.tiempoAccion <= 0) p.accion = null;
      }
      if (manejada && control.agachada) pose = 'agacharse';
      if (manejada && control.rumbo !== undefined && control.rumbo !== null) rumboBuscado = control.rumbo;
      // Gira de a poco hacia donde va (en primera persona, enseguida: lo maneja el mouse).
      p.rumbo += diferenciaAngulo(p.rumbo, rumboBuscado) * (manejada && control.rumbo != null ? 1 : Math.min(1, dt * 8));
      p.fase += (caminado / (0.35 * p.datos.altura)) * Math.PI * 0.5;
      p.pose = pose;
      if (p.figura) {
        p.figura.raiz.position.set(p.pos[0], mapa?.y ?? 0, p.pos[1]);
        p.figura.raiz.rotation.y = p.rumbo;
        aplicarPose(p.figura, angulosDePose(pose, p.fase), mezcla);
      }
    });
  }

  /** El id de la persona a la que pertenece un objeto tocado (o null). */
  function idDe(objeto) {
    for (let o = objeto; o; o = o.parent) if (o.userData?.idPersona !== undefined) return o.userData.idPersona;
    return null;
  }

  /** Dónde está y qué altura tienen sus ojos (para la primera persona). */
  function estado(id) {
    const p = personas.get(id);
    if (!p) return null;
    const y = mapaDe(p.datos.nivel)?.y ?? 0;
    const ojos = p.figura ? alturaDeOjos(p.figura) : (p.pose === 'agacharse' ? 0.55 : 0.94) * p.datos.altura;
    return { x: p.pos[0], z: p.pos[1], y, ojos, rumbo: p.rumbo, altura: p.datos.altura, nivel: p.datos.nivel, mapa: mapaDe(p.datos.nivel) };
  }

  /** Mostrar u ocultar la figura de una persona (en primera persona no se ve a sí misma). */
  function mostrar(id, visible) {
    const p = personas.get(id);
    if (p?.figura) p.figura.raiz.visible = visible;
  }

  function liberar() {
    personas.forEach((p) => { if (p.figura) liberarFigura(p.figura); });
    personas.clear();
    escena.remove(grupo);
  }

  return { grupo, sincronizar, elegir, ordenar, actualizar, idDe, estado, mostrar, asegurarVisitante, liberar };
}
