// ==========================================================
// PlanoInstalaciones (v1.57): cada instalación vista desde arriba
// ----------------------------------------------------------
// La planta de la casa con el frente abajo, los puntos del sistema (con su
// nombre) y cada tramo por afuera, con su largo. Abajo, la tabla de tramos
// (largo y curvas) y la lista de materiales. Lo usan la pestaña Planos
// (con una casilla por sistema para prenderlo o apagarlo) y el PDF.
// ==========================================================

import { geometriaLados, nombreDePared } from '../motor/geometria.js';
import { LADOS } from '../motor/constantes.js';
import { recorridoDelTramo, pisoDeLaObra, posicionDelPunto, colorSistema, materialesDelSistema, completarInstalaciones, nombreSistema } from '../motor/instalaciones.js';

const pesos = (n) => n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
const m2 = (n) => `${n.toFixed(2).replace('.', ',')} m`;

/** Gira el plano para que el frente quede abajo (la normal del frente apuntando hacia abajo del dibujo). */
function rotacionDelFrente(geo, ladoFrente) {
  const d = geo[ladoFrente].direccion;
  const normal = [-d[1], d[0]];
  const angulo = Math.atan2(1, 0) - Math.atan2(normal[1], normal[0]);
  const c = Math.cos(angulo);
  const s = Math.sin(angulo);
  return ([x, z]) => [x * c - z * s, x * s + z * c];
}

export function PlanoInstalacion({ params, estructura, sistema }) {
  const inst = completarInstalaciones(params.instalaciones);
  const geo = geometriaLados(params);
  const girar = rotacionDelFrente(geo, params.ladoFrente ?? 'A');
  const pisoDe = pisoDeLaObra(params, estructura);
  const color = colorSistema(sistema);
  const puntos = inst.puntos.filter((p) => p.sistema === sistema);
  const recorridos = inst.tramos.filter((t) => t.sistema === sistema)
    .map((t) => recorridoDelTramo(t, inst.puntos, params, pisoDe)).filter(Boolean);
  const esquinas = LADOS.map((l) => girar(geo[l].p1));
  const xs = esquinas.map((p) => p[0]);
  const ys = esquinas.map((p) => p[1]);
  // Lugar a los costados para los nombres de las paredes y de los puntos (que se escriben a la derecha de cada uno).
  const margenX = 3;
  const margenY = 1.2;
  const caja = [Math.min(...xs) - margenX, Math.min(...ys) - margenY, Math.max(...xs) - Math.min(...xs) + 2 * margenX, Math.max(...ys) - Math.min(...ys) + 2 * margenY];
  const T = Math.max(caja[2], caja[3]) / 40; // alto del texto
  return (
    <svg className="plano-instalacion" viewBox={caja.join(' ')} role="img" aria-label={`Instalación ${nombreSistema(sistema)} desde arriba`}>
      <polygon points={esquinas.map((p) => p.join(',')).join(' ')} className="casa-instalacion" />
      {LADOS.map((l) => {
        const medio = girar([(geo[l].p1[0] + geo[l].p2[0]) / 2, (geo[l].p1[1] + geo[l].p2[1]) / 2]);
        const centro = [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
        const afuera = [medio[0] + Math.sign(medio[0] - centro[0]) * (Math.abs(medio[0] - centro[0]) > 0.01 ? T * 3 : 0),
          medio[1] + Math.sign(medio[1] - centro[1]) * (Math.abs(medio[1] - centro[1]) > 0.01 ? T * 2.2 : 0)];
        return <text key={l} x={afuera[0]} y={afuera[1]} fontSize={T * 0.9} textAnchor="middle" className="rotulo-pared-instalacion">{nombreDePared(l, params)}</text>;
      })}
      {recorridos.map((r, i) => {
        const pts = r.puntos.map(([x, , z]) => girar([x, z]));
        const medio = pts[Math.floor(pts.length / 2)];
        return (
          <g key={i}>
            <polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke={color} strokeWidth={T * 0.25} strokeLinejoin="round" />
            <text x={medio[0]} y={medio[1] - T * 0.4} fontSize={T * 0.8} textAnchor="middle" className="rotulo-tramo">{m2(r.largo)}</text>
          </g>
        );
      })}
      {puntos.map((p) => {
        const [x, , z] = posicionDelPunto(p, params, pisoDe);
        const [px, py] = girar([x, z]);
        return (
          <g key={p.id}>
            <circle cx={px} cy={py} r={T * 0.45} fill={color} stroke="#0f172a" strokeWidth={T * 0.08} />
            <text x={px + T * 0.7} y={py + T * 0.3} fontSize={T * 0.8} className="rotulo-punto">{p.nombre}{p.nivel === 'piso2' ? ' (entrepiso)' : ''} · h {m2(p.altura)}</text>
          </g>
        );
      })}
    </svg>
  );
}

/** Plano, tramos y materiales de un sistema (para la pestaña Planos y el PDF). */
export function BloqueInstalacion({ params, estructura, sistema }) {
  const { tramos, materiales, total } = materialesDelSistema(params, estructura, sistema);
  return (
    <div className="bloque-instalacion">
      <h3 className="subtitulo">Instalación {nombreSistema(sistema).toLowerCase()} (desde arriba, el frente abajo)</h3>
      <PlanoInstalacion params={params} estructura={estructura} sistema={sistema} />
      {tramos.length > 0 && (
        <table className="tabla-impresion">
          <thead><tr><th>Tramo</th><th>Caño o canalización</th><th className="num">Largo</th><th className="num">Curvas</th></tr></thead>
          <tbody>{tramos.map((t) => <tr key={t.id}><td>{t.nombre}</td><td>{t.material}</td><td className="num">{m2(t.largo)}</td><td className="num">{t.curvas}</td></tr>)}</tbody>
        </table>
      )}
      {materiales.length > 0 && (
        <table className="tabla-impresion">
          <thead><tr><th>Material</th><th className="num">Cantidad</th><th className="num">Precio</th><th className="num">Total</th></tr></thead>
          <tbody>
            {materiales.map((m) => <tr key={m.nombre}><td>{m.nombre}</td><td className="num">{m.cantidad} {m.unidad}</td><td className="num">{pesos(m.precio)}</td><td className="num">{pesos(m.total)}</td></tr>)}
            <tr className="fila-total"><td>Total</td><td /><td /><td className="num">{pesos(total)}</td></tr>
          </tbody>
        </table>
      )}
    </div>
  );
}
