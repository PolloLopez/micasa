// ==========================================================
// Planos (v1.26): cada pared y cada planta dibujada y acotada
// ----------------------------------------------------------
// Pestaña "Planos": para revisar en pantalla. Al imprimir, los mismos planos
// salen juntos en las hojas del PDF (v1.28, HojasImpresion.jsx). Cada pared se ve DESDE AFUERA, con las
// medidas desde la esquina izquierda y desde el piso, como las aberturas.
// Abajo de cada dibujo: la lista de piezas para cortar, las aberturas y el
// revestimiento. Los datos salen de motor/planos.js.
// ==========================================================

import Tarjeta from './Tarjeta.jsx';
import { NOMBRE_PLANTA } from '../motor/planos.js';
import { nombreDePared } from '../proyecto/exportarExcel.js';

const f2 = (n) => n.toFixed(2);
/** "3.00 x 4.50 m": lo que ocupa un contorno (el entrepiso puede ser más chico que la planta). */
const medidasDeContorno = (puntos) => {
  const xs = puntos.map((q) => q[0]);
  const ys = puntos.map((q) => q[1]);
  return `${f2(Math.max(...xs) - Math.min(...xs))} x ${f2(Math.max(...ys) - Math.min(...ys))} m`;
};

/** Estilo de cada tipo de pieza en el dibujo (grosor en metros, como la escala del plano). */
const TRAZO = {
  columna: { color: '#b91c1c', ancho: 0.07 },
  jamba: { color: '#7c3aed', ancho: 0.05 },
  dintel: { color: '#7c3aed', ancho: 0.05 },
  alfeizar: { color: '#7c3aed', ancho: 0.05 },
  travesano: { color: '#7c3aed', ancho: 0.04 }, // v1.28
  horizontal: { color: '#a16207', ancho: 0.04 },
  montante: { color: '#0f766e', ancho: 0.04 },
  'montante-dintel': { color: '#0f766e', ancho: 0.04 },
  'montante-antepecho': { color: '#0f766e', ancho: 0.04 },
  riostra: { color: '#475569', ancho: 0.02 },
  solera: { color: '#1d4ed8', ancho: 0.06 },
  'marco-piso': { color: '#1d4ed8', ancho: 0.06 },
  piso: { color: '#0e7490', ancho: 0.05 },
  piso2: { color: '#0e7490', ancho: 0.05 },
  'transv-piso': { color: '#be185d', ancho: 0.03 },
  'transv-piso2': { color: '#be185d', ancho: 0.03 },
  'marco-piso2': { color: '#1d4ed8', ancho: 0.06 },
  'viga-cierre': { color: '#1d4ed8', ancho: 0.07 },
  'viga-apoyo': { color: '#1d4ed8', ancho: 0.07 }, // v1.28
  'viga-techo': { color: '#c2410c', ancho: 0.06 },
  'correa-techo': { color: '#a16207', ancho: 0.035 },
  'borde-techo': { color: '#9a3412', ancho: 0.07 }, // v1.28
};
const trazo = (tipo) => TRAZO[tipo] ?? { color: '#334155', ancho: 0.04 };
const TEXTO = 0.15; // alto del texto (m)
// Solo se escriben las cotas de más de 15 cm (si no, los números se pisan).
const seEscribe = (d) => d > 0.15;

/** Cadena de cotas horizontal: entre cada par de posiciones, la distancia. */
function CotasHorizontales({ posiciones, y }) {
  return (
    <g className="cota">
      <line x1={posiciones[0]} y1={y} x2={posiciones[posiciones.length - 1]} y2={y} />
      {posiciones.map((x) => <line key={`t${x}`} x1={x} y1={y - 0.08} x2={x} y2={y + 0.08} />)}
      {posiciones.slice(1).map((x, i) => {
        const a = posiciones[i];
        return seEscribe(x - a) && <text key={`d${x}`} x={(a + x) / 2} y={y - 0.06} fontSize={TEXTO} textAnchor="middle">{f2(x - a)}</text>;
      })}
    </g>
  );
}

/** Cadena de cotas vertical (alturas), a la izquierda del dibujo. `alto` = alto total del dibujo (para dar vuelta y). */
function CotasVerticales({ alturas, x, alto }) {
  const y = (h) => alto - h;
  return (
    <g className="cota">
      <line x1={x} y1={y(alturas[0])} x2={x} y2={y(alturas[alturas.length - 1])} />
      {alturas.map((h) => <line key={`t${h}`} x1={x - 0.08} y1={y(h)} x2={x + 0.08} y2={y(h)} />)}
      {alturas.slice(1).map((h, i) => {
        const a = alturas[i];
        return seEscribe(h - a) && (
          <text key={`d${h}`} x={x - 0.1} y={y((a + h) / 2)} fontSize={TEXTO} textAnchor="end" dominantBaseline="middle">{f2(h - a)}</text>
        );
      })}
    </g>
  );
}

/** Dibujo de una pared vista desde afuera, acotada. */
function DibujoPared({ vista }) {
  const [h1, h2] = vista.alturas;
  const alto = Math.max(h1, h2);
  const margenIzq = 1.1;
  const margenAbajo = 1.0;
  const y = (h) => alto - h; // en el SVG la y crece hacia abajo
  const alturasCota = [...new Set([0, ...vista.cotas.fajas, h1].map((h) => Math.round(h * 100) / 100))].sort((p, q) => p - q);
  return (
    <svg className="dibujo-plano" viewBox={`${-margenIzq} -0.4 ${vista.largo + margenIzq + 0.4} ${alto + 0.4 + margenAbajo}`}
      role="img" aria-label={`Pared ${vista.lado} vista desde afuera`}>
      <polygon className="contorno" points={`0,${y(0)} ${vista.largo},${y(0)} ${vista.largo},${y(h2)} 0,${y(h1)}`} />
      {/* Aberturas: el hueco con su número y medidas. */}
      {vista.huecos.map((h, i) => {
        const a = vista.aberturas[i];
        return (
          <g key={`h${i}`}>
            <rect className="hueco" x={h.desde} y={y(h.arriba)} width={h.hasta - h.desde} height={h.arriba - h.abajo} />
            <text x={(h.desde + h.hasta) / 2} y={y((h.abajo + h.arriba) / 2)} fontSize={TEXTO} textAnchor="middle" dominantBaseline="middle">
              #{a?.numero} {f2(h.hasta - h.desde)}×{f2(h.arriba - h.abajo)}
            </text>
            {h.abajo > 0.05 && (
              <text x={(h.desde + h.hasta) / 2} y={y(h.abajo) + TEXTO * 1.1} fontSize={TEXTO * 0.8} textAnchor="middle">ant. {f2(h.abajo)}</text>
            )}
          </g>
        );
      })}
      {/* Piezas */}
      {vista.piezas.map((p) => {
        const t = trazo(p.tipo);
        return <line key={p.id} x1={p.x1} y1={y(p.y1)} x2={p.x2} y2={y(p.y2)} stroke={t.color} strokeWidth={p.esquina ? t.ancho * 1.2 : t.ancho} strokeLinecap="square" />;
      })}
      {/* Cotas: columnas y jambas abajo; total; fajas a la izquierda. */}
      <CotasHorizontales posiciones={vista.cotas.columnas} y={y(0) + 0.4} />
      <CotasHorizontales posiciones={[0, vista.largo]} y={y(0) + 0.8} />
      <CotasVerticales alturas={alturasCota} x={-0.4} alto={alto} />
      <CotasVerticales alturas={[0, h1]} x={-0.85} alto={alto} />
    </svg>
  );
}

/** Dibujo de una planta vista desde arriba (lado A abajo). */
function DibujoPlanta({ vista }) {
  const { largo, ancho } = vista;
  const y = (v) => ancho - v;
  return (
    <svg className="dibujo-plano" viewBox={`-0.9 -0.5 ${largo + 1.4} ${ancho + 1.5}`} role="img" aria-label={`${NOMBRE_PLANTA[vista.nivel]} vista desde arriba`}>
      <polygon className="contorno" points={vista.contorno.map(([px, py]) => `${px},${y(py)}`).join(' ')} />
      {vista.piezas.map((p) => {
        const t = trazo(p.tipo);
        return <line key={p.id} x1={p.x1} y1={y(p.y1)} x2={p.x2} y2={y(p.y2)} stroke={t.color} strokeWidth={t.ancho} strokeLinecap="square" />;
      })}
      <text x={largo / 2} y={y(0) + 0.32} fontSize={TEXTO} textAnchor="middle" className="lado-planta">lado A</text>
      <text x={largo / 2} y={y(ancho) - 0.15} fontSize={TEXTO} textAnchor="middle" className="lado-planta">lado C</text>
      <CotasHorizontales posiciones={[0, largo]} y={y(0) + 0.65} />
      <CotasVerticales alturas={[0, ancho]} x={-0.4} alto={ancho} />
    </svg>
  );
}

/** Tabla de piezas para cortar. */
function TablaPiezas({ lista }) {
  return (
    <div className="table-wrap">
    <table className="tabla-plano">
      <thead><tr><th>Pieza</th><th>Perfil</th><th className="num" title="Largo en metros">Largo</th><th className="num">Cant.</th></tr></thead>
      <tbody>
        {lista.map((g) => (
          <tr key={`${g.nombre}|${g.perfil}|${g.largo}`}>
            <td>{g.nombre}</td><td>{g.perfil}</td><td className="num">{f2(g.largo)}</td><td className="num">{g.cantidad}</td>
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  );
}

/**
 * Una pared completa: título, dibujo acotado, piezas, aberturas y revestimiento.
 * La usan la pestaña Planos y las hojas del PDF (v1.28).
 */
export function PlanoDePared({ vista: v, params }) {
  return (
    <>
      <h3 className="subtitulo">
        Pared {nombreDePared(v.lado, params)} · {f2(v.largo)} m · alto {f2(v.alturas[0])}
        {Math.abs(v.alturas[0] - v.alturas[1]) > 0.005 ? ` a ${f2(v.alturas[1])}` : ''} m
      </h3>
      <DibujoPared vista={v} />
      <TablaPiezas lista={v.lista} />
      {v.aberturas.length > 0 && (
        <div className="table-wrap">
        <table className="tabla-plano">
          <thead><tr><th>Abertura</th><th className="num">Ancho</th><th className="num">Alto</th><th className="num">Antepecho</th><th className="num">Desde esq. izq.</th></tr></thead>
          <tbody>
            {v.aberturas.map((a) => (
              <tr key={a.numero}>
                <td>#{a.numero} {a.tipo}{a.etiqueta ? ` · ${a.etiqueta}` : ''}</td>
                <td className="num">{f2(a.ancho)}</td><td className="num">{f2(a.alto)}</td>
                <td className="num">{f2(a.antepecho)}</td><td className="num">{f2(a.desde)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
      {v.revestimiento.map((r) => (
        <p key={r.cara} className="revestimiento-plano"><strong>Revestimiento {r.cara} ({r.nombre}):</strong> {r.detalle}</p>
      ))}
    </>
  );
}

/** Una planta completa: título, dibujo y piezas (pestaña y PDF). */
export function PlanoDePlanta({ vista: p }) {
  return (
    <>
      <h3 className="subtitulo">{NOMBRE_PLANTA[p.nivel]} · vista desde arriba · {medidasDeContorno(p.contorno)}</h3>
      <DibujoPlanta vista={p} />
      <TablaPiezas lista={p.lista} />
    </>
  );
}

export default function Planos({ vistas, params, onExportar }) {
  if (!vistas.paredes.length && !vistas.plantas.length) {
    return (
      <Tarjeta id="planos" titulo="Planos">
        <p className="nota">Los planos por pared y por planta están para las construcciones (no para grada ni montaje).</p>
        <button type="button" className="btn-sec no-print" onClick={onExportar}>Imprimir o exportar…</button>
      </Tarjeta>
    );
  }
  return (
    <>
      <Tarjeta id="planos" titulo="Planos">
        <p className="nota">
          Cada pared vista <strong>desde afuera</strong>: medidas desde la esquina izquierda y desde el piso. Las cotas
          de abajo son entre columnas y jambas; las de la izquierda, entre horizontales (fajas). Con
          <strong> Imprimir / Exportar</strong> elegís qué sale en el PDF o en el Excel (las 4 paredes juntas y las plantas juntas).
        </p>
        <button type="button" className="btn-print no-print" onClick={onExportar}>Imprimir o exportar…</button>
      </Tarjeta>
      {vistas.paredes.map((v) => (
        <section key={v.lado} className="card plano"><PlanoDePared vista={v} params={params} /></section>
      ))}
      {vistas.plantas.map((p) => (
        <section key={p.nivel} className="card plano"><PlanoDePlanta vista={p} /></section>
      ))}
    </>
  );
}
