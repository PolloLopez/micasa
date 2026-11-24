// ==========================================================
// Planos (v1.26): cada pared y cada planta dibujada y acotada
// ----------------------------------------------------------
// Pestaña "Planos": para revisar en pantalla. Al imprimir, los mismos planos
// salen juntos en las hojas del PDF (v1.28, HojasImpresion.jsx). Cada pared se ve DESDE AFUERA, con las
// medidas desde la esquina izquierda y desde el piso, como las aberturas.
// Abajo de cada dibujo: la lista de piezas para cortar, las aberturas y el
// revestimiento. Los datos salen de motor/planos.js.
// ==========================================================

import { useId } from 'react';
import { textoDeCodigo } from '../motor/hojaDeCorte.js';
import Tarjeta from './Tarjeta.jsx';
import PlanoImplantacion from './PlanoImplantacion.jsx';
import { BloqueInstalacion } from './PlanoInstalaciones.jsx';
import { SISTEMAS } from '../motor/instalaciones.js';
import { useEstadoGuardado } from '../hooks/useEstadoGuardado.js';
import { NOMBRE_PLANTA } from '../motor/planos.js';
import { nombreDePared } from '../proyecto/exportarExcel.js';
import { dibujoDelTapial } from '../motor/obraCivil.js'; // v1.80: tramos y portón

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
/**
 * @param soloContorno v1.60 (para el proveedor de paneles): sin la estructura ni sus cotas; quedan el contorno, las
 *        aberturas que se cortan (las "a futuro" no: la pared va entera) y las cotas de cada abertura.
 */
function DibujoPared({ vista, soloContorno = false, codigos = null }) {
  const [h1, h2] = vista.alturas;
  const alto = Math.max(h1, h2);
  const margenIzq = 1.1;
  const margenAbajo = 1.0;
  const y = (h) => alto - h; // en el SVG la y crece hacia abajo
  const redondo = (lista) => [...new Set(lista.map((h) => Math.round(h * 100) / 100))].sort((p, q) => p - q);
  const reales = vista.aberturas.filter((a) => !a.futura);
  const futuras = vista.aberturas.filter((a) => a.futura);
  const alturasCota = soloContorno
    ? redondo([0, ...reales.flatMap((a) => [a.antepecho, a.arriba]), h1])
    : redondo([0, ...vista.cotas.fajas, h1]);
  const posicionesAbajo = soloContorno ? redondo([0, vista.largo, ...reales.flatMap((a) => [a.desde, a.hasta])]) : vista.cotas.columnas;
  return (
    <svg className="dibujo-plano" viewBox={`${-margenIzq} -0.4 ${vista.largo + margenIzq + 0.4} ${alto + 0.4 + margenAbajo}`}
      role="img" aria-label={vista.esTecho ? 'Techo visto desde arriba' : `Pared ${vista.lado} vista desde afuera`}>
      <polygon className="contorno" points={`0,${y(0)} ${vista.largo},${y(0)} ${vista.largo},${y(h2)} 0,${y(h1)}`} />
      {/* Aberturas: el hueco con su número y medidas. */}
      {vista.huecos.map((h, i) => {
        const a = reales[i];
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
      {/* v1.63: las juntas de los paneles (punteadas) y el número de cada tira arriba: para acomodar las aberturas. */}
      {vista.paneles && (
        <g className="juntas-paneles">
          {/* Con los pedazos dibujados (tira entera) no hacen falta las juntas largas: los bordes de cada pedazo ya lo son
              (y así no cruzan las ventanas, igual que en el 3D). */}
          {!vista.paneles.pedazosTira && vista.paneles.juntas.flatMap((x) => tramosSinHuecos(x, Math.max(h1, h2), vista.paneles.pano.huecos)
            .map(([a0, a1]) => <line key={`j${x}-${a0}`} x1={x} y1={y(a0)} x2={x} y2={y(a1)} className="junta-panel" />))}
          {/* v1.82: cuál queda arriba de cuál. Naranja: el tramo de arriba monta por fuera del de abajo. Verde: el
              costado de la tira que monta sobre la de al lado (el encastre). */}
          {(vista.paneles.horizontales ?? []).map((h) => <line key={`h${h}`} x1={0} y1={y(h)} x2={vista.largo ?? 0} y2={y(h)} className="junta-panel" />)}
          {(vista.paneles.encimados?.verticales ?? []).map((f) => (
            <g key={`ev${f.arriba}`}>
              <rect className="franja-encimado" x={0} y={y(f.arriba)} width={vista.largo ?? 0} height={f.arriba - f.abajo} />
              <text x={0.05} y={y(f.arriba) - 0.03} fontSize={TEXTO * 0.6} className="texto-encimado">▲ el de arriba va por fuera ({Math.round((f.arriba - f.abajo) * 100)} cm)</text>
            </g>
          ))}
          {(vista.paneles.encimados?.laterales ?? []).map((f) => (
            <rect key={`el${f.desde}`} className="franja-superpone-pared" x={f.desde} y={y(Math.max(h1, h2))} width={f.hasta - f.desde} height={Math.max(h1, h2)} />
          ))}
          {/* v1.82.2: por tira entera, cada pedazo con la tira de donde sale (T3), igual que en el 3D y la hoja de corte;
              si no, el número de cada columna de tiras arriba. */}
          {vista.paneles.pedazosTira ? vista.paneles.pedazosTira.map((p) => (
            <g key={p.id} className={`pedazo-plano${p.manual ? ' manual' : ''}`}>
              <rect x={p.x0} y={y(p.y0 + p.largo)} width={p.x1 - p.x0} height={p.largo} />
              <text x={(p.x0 + p.x1) / 2} y={y(p.y0 + p.largo / 2)} fontSize={TEXTO * 0.7} textAnchor="middle" dominantBaseline="middle">T{p.n}</text>
            </g>
          )) : vista.paneles.tiras.map((t) => (
            <text key={`t${t.n}`} x={t.x0 + t.ancho / 2} y={y(Math.max(h1, h2)) - 0.08} fontSize={TEXTO * 0.7} textAnchor="middle" className="numero-tira">{t.n}</text>
          ))}
        </g>
      )}
      {/* v1.59: las aberturas a futuro: solo el marco (punteado), la pared va entera. No salen en el plano para paneles. */}
      {!soloContorno && futuras.map((a) => (
        <g key={`f${a.numero}`}>
          <rect className="hueco-futuro" x={a.desde} y={y(a.arriba)} width={a.ancho} height={a.alto} />
          <text x={a.desde + a.ancho / 2} y={y(a.antepecho + a.alto / 2)} fontSize={TEXTO * 0.8} textAnchor="middle" dominantBaseline="middle">#{a.numero} a futuro</text>
        </g>
      ))}
      {/* Piezas */}
      {!soloContorno && vista.piezas.map((p) => {
        const t = trazo(p.tipo);
        return <line key={p.id} x1={p.x1} y1={y(p.y1)} x2={p.x2} y2={y(p.y2)} stroke={t.color} strokeWidth={p.esquina ? t.ancho * 1.2 : t.ancho} strokeLinecap="square" />;
      })}
      {!soloContorno && codigos && <CodigosDeCorte piezas={vista.piezas} codigos={codigos} y={y} />}
      {/* Cotas: columnas y jambas abajo; total; fajas a la izquierda. */}
      <CotasHorizontales posiciones={posicionesAbajo} y={y(0) + 0.4} />
      <CotasHorizontales posiciones={[0, vista.largo]} y={y(0) + 0.8} />
      <CotasVerticales alturas={alturasCota} x={-0.4} alto={alto} />
      <CotasVerticales alturas={[0, h1]} x={-0.85} alto={alto} />
    </svg>
  );
}

/**
 * v1.68: el código de la hoja de corte de cada pieza ("2.3b"), en el medio de la pieza. Los mismos códigos salen en
 * Presupuesto → Cortes y al tocar la pieza en el 3D. Las que vienen en tramos del 3D ("id~2") buscan el suyo.
 */
function CodigosDeCorte({ piezas, codigos, y }) {
  return (
    <g className="codigos-corte">
      {piezas.map((p) => {
        const pedazos = codigos.get(p.id);
        if (!pedazos) return null;
        return <text key={`c${p.id}`} x={(p.x1 + p.x2) / 2} y={y((p.y1 + p.y2) / 2)} fontSize={TEXTO * 0.75} textAnchor="middle" dominantBaseline="middle">{textoDeCodigo(pedazos)}</text>;
      })}
    </g>
  );
}

/** Dibujo de una planta vista desde arriba (lado A abajo). */
function DibujoPlanta({ vista, codigos = null }) {
  const { largo, ancho, nombres } = vista;
  const y = (v) => ancho - v;
  return (
    <svg className="dibujo-plano" viewBox={`-0.9 -0.5 ${largo + 1.4} ${ancho + 1.5}`} role="img" aria-label={`${NOMBRE_PLANTA[vista.nivel]} vista desde arriba`}>
      <polygon className="contorno" points={vista.contorno.map(([px, py]) => `${px},${y(py)}`).join(' ')} />
      {/* v1.50: pilotines y zapatas debajo (punteados), después la estructura y arriba mesadas, muebles y tabiques. */}
      {(vista.pilotines ?? []).map((p, i) => (
        <g key={`pil${i}`} className="fundacion-planta">
          {p.zapata > 0 && <rect x={p.x - p.zapata / 2} y={y(p.y) - p.zapata / 2} width={p.zapata} height={p.zapata} className="zapata-planta" />}
          {p.forma === 'cuadrado'
            ? <rect x={p.x - p.medida / 2} y={y(p.y) - p.medida / 2} width={p.medida} height={p.medida} className="pilotin-planta" />
            : <circle cx={p.x} cy={y(p.y)} r={p.medida / 2} className="pilotin-planta" />}
        </g>
      ))}
      {vista.piezas.map((p) => {
        const t = trazo(p.tipo);
        return <line key={p.id} x1={p.x1} y1={y(p.y1)} x2={p.x2} y2={y(p.y2)} stroke={t.color} strokeWidth={t.ancho} strokeLinecap="square" />;
      })}
      {codigos && <CodigosDeCorte piezas={vista.piezas} codigos={codigos} y={y} />}
      {(vista.mesadas ?? []).map((m, i) => (
        <polygon key={`mes${i}`} className="mesada-planta" points={m.puntos.map(([px, py]) => `${px},${y(py)}`).join(' ')} />
      ))}
      {(vista.muebles ?? []).map((m, i) => (
        <g key={`mue${i}`}>
          <polygon className={`mueble-planta${m.colgado ? ' colgado' : ''}`} points={m.puntos.map(([px, py]) => `${px},${y(py)}`).join(' ')} />
          <text x={m.medio[0]} y={y(m.medio[1]) + 0.06} fontSize={TEXTO * 0.7} textAnchor="middle" className="nombre-planta">{m.nombre}</text>
        </g>
      ))}
      {(vista.tabiques ?? []).map((t, i) => (
        <g key={`tab${i}`}>
          {t.tramos.map(([a, b], k) => <line key={k} x1={a[0]} y1={y(a[1])} x2={b[0]} y2={y(b[1])} className="tabique-planta" strokeWidth={t.espesor} />)}
          {t.puerta && <line x1={t.puerta.desde[0]} y1={y(t.puerta.desde[1])} x2={t.puerta.hasta[0]} y2={y(t.puerta.hasta[1])} className="puerta-planta" />}
        </g>
      ))}
      {(vista.mesadas ?? []).filter((m, i, l) => l.findIndex((x) => x.nombre === m.nombre) === i).map((m, i) => (
        <text key={`nm${i}`} x={m.medio[0]} y={y(m.medio[1]) + 0.06} fontSize={TEXTO * 0.7} textAnchor="middle" className="nombre-planta">{m.nombre}</text>
      ))}
      {/* v1.52: el nombre de cada pared (su etiqueta, ej. "Patio"), con la letra. */}
      <text x={largo / 2} y={y(0) + 0.32} fontSize={TEXTO} textAnchor="middle" className="lado-planta">{nombres?.A ?? 'lado A'}</text>
      <text x={largo / 2} y={y(ancho) - 0.15} fontSize={TEXTO} textAnchor="middle" className="lado-planta">{nombres?.C ?? 'lado C'}</text>
      {nombres && <text x={-0.12} y={y(ancho / 2)} fontSize={TEXTO} textAnchor="middle" className="lado-planta" transform={`rotate(-90 -0.12 ${y(ancho / 2)})`}>{nombres.D}</text>}
      {nombres && <text x={largo + 0.22} y={y(ancho / 2)} fontSize={TEXTO} textAnchor="middle" className="lado-planta" transform={`rotate(90 ${largo + 0.22} ${y(ancho / 2)})`}>{nombres.B}</text>}
      <CotasHorizontales posiciones={[0, largo]} y={y(0) + 0.65} />
      <CotasVerticales alturas={[0, ancho]} x={-0.4} alto={ancho} />
    </svg>
  );
}

/** v1.63: los tamaños y cortes de cada tira de panel de la pared (de izquierda a derecha, vista desde afuera). */
function TablaPaneles({ paneles: p }) {
  const m = (n) => n.toFixed(2).replace('.', ',');
  return (
    <div className="table-wrap">
      <table className="tabla-plano tabla-paneles">
        <thead><tr><th>Tira</th><th className="num">Ancho</th><th>Pedir</th><th>Cortes</th></tr></thead>
        <tbody>
          {p.tiras.map((t) => (
            <tr key={t.n}>
              <td>{t.n}</td>
              <td className="num">{m(t.ancho)}</td>
              <td>{t.deRetazo ? <em>sale del retazo de {t.deRetazo}</em> : t.pedidos.map((l) => `${m(l)} m`).join(' + ')}</td>
              <td>{t.cortes.length ? t.cortes.map((c) => {
                // v1.68: a cada relleno, de dónde sale (un recorte de otra tira, o se compra).
                const r = (t.rellenos ?? []).find((x) => c.startsWith(`relleno al costado ${x.lado}`));
                return r && r.de !== undefined ? `${c} (${r.de ? `del ${r.de}` : 'se compra'})` : c;
              }).join(' · ') : 'entera'}{t.aberturasEnObra > 0 ? ` (la abertura se corta en obra)` : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="nota">{p.nombre}: tiras de {m(p.anchoUtil)} m de ancho útil, desde la esquina izquierda. Se compran {m(p.comprado)} m², se usan
        {' '}{m(p.usado)} m² y se tiran {m(p.desperdicio)} m² ({p.comprado > 0 ? Math.round((p.desperdicio / p.comprado) * 100) : 0} %).
        Correr una ventana para que su borde caiga en una junta (punteada) achica los recortes.</p>
    </div>
  );
}

/**
 * v1.67 (Leandro: "me falta el plano de cada panel, con sus medidas e indicación de qué lado es el que superpone"):
 * un dibujo chico por cada pedazo que se pide, en el orden de la pared (de izquierda a derecha, vista desde afuera):
 * su ancho y largo, el corte inclinado de arriba, los recortes de las aberturas (rayados) y, en color, el costado
 * que superpone sobre la tira de al lado. Abajo, los rellenos que salen de retazos.
 */
function DespiecePaneles({ paneles: p, esTecho = false }) {
  const m = (n) => n.toFixed(2).replace('.', ',');
  const deRetazo = new Map(p.tiras.filter((t) => t.deRetazo).map((t) => [t.n, t.deRetazo]));
  const rellenos = p.tiras.flatMap((t) => (t.rellenos ?? []).map((r) => ({ ...r, tira: t.n })));
  const superpone = p.tipo.ladoSolape === 'derecha' ? 'derecho' : 'izquierdo';
  // v1.68: lo que monta sobre la tira de al lado (ancho total − útil), si se cargó el ancho total.
  const solapeLateral = p.tipo.anchoTotal > p.tipo.anchoUtil ? p.tipo.anchoTotal - p.tipo.anchoUtil : 0;
  const idRayado = `rayado-${useId().replace(/:/g, '')}`; // uno por pared (los ids del SVG no se pueden repetir)
  return (
    <div className="despiece-paneles">
      <svg width="0" height="0" aria-hidden="true" style={{ position: 'absolute' }}>
        <defs>
          <pattern id={idRayado} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="#dc2626" strokeWidth="1.5" />
          </pattern>
        </defs>
      </svg>
      <h4 className="subtitulo-pared">Plano de cada panel</h4>
      <p className="nota">{esTecho ? 'Vistos desde arriba' : 'Vistos desde afuera'}. En verde, el costado que <strong>superpone</strong> (el {superpone}{solapeLateral > 0 ? `, ${Math.round(solapeLateral * 1000)} mm` : ''}): cada tira monta
        sobre la anterior, se colocan de {superpone === 'izquierdo' ? 'izquierda a derecha' : 'derecha a izquierda'}. Rayado: lo que se recorta.</p>
      <div className="grilla-despiece">
        {p.despiece.map((d) => {
          // Escala en px por metro: los largos de 4 m entran en ~200 px; los chicos, más grandes.
          const k = Math.min(60, 200 / Math.max(d.largo, 0.5));
          const [ancho, alto] = [d.ancho * k, Math.max(d.arriba[0], d.arriba[1]) * k];
          const franja = solapeLateral > 0 ? Math.max(4, solapeLateral * k) : 0;
          const margen = { izq: 34 + (d.superpone !== 'derecha' ? franja : 0), der: 10 + (d.superpone === 'derecha' ? franja : 0), arriba: 8, abajo: 26 };
          const X = (x) => margen.izq + x * k;
          const Y = (y) => margen.arriba + alto - y * k;
          const lado = d.superpone === 'derecha' ? d.ancho : 0;
          const inclinada = Math.abs(d.arriba[0] - d.arriba[1]) > 0.005;
          return (
            <figure key={`${d.nombre}-${d.desde}`} className="panel-despiece">
              <figcaption><strong>{d.nombre}</strong>{deRetazo.has(d.tira) ? <em> · sale del retazo de {deRetazo.get(d.tira)}</em> : ` · pedir ${m(d.largo)} m`}</figcaption>
              <svg width={ancho + margen.izq + margen.der} height={alto + margen.arriba + margen.abajo} role="img"
                aria-label={`${d.nombre}: ${m(d.ancho)} por ${m(d.largo)} m, superpone a la ${d.superpone}`}>
                <polygon className="contorno-panel" points={`${X(0)},${Y(0)} ${X(d.ancho)},${Y(0)} ${X(d.ancho)},${Y(d.arriba[1])} ${X(0)},${Y(d.arriba[0])}`} />
                {d.recortes.map((r) => (
                  <rect key={`${r.x0}-${r.y0}`} x={X(r.x0)} y={Y(r.y1)} width={(r.x1 - r.x0) * k} height={(r.y1 - r.y0) * k} fill={`url(#${idRayado})`} stroke="#dc2626" />
                ))}
                {/* El costado que superpone, en verde: con el ancho total cargado, la franja que monta (total − útil). */}
                {solapeLateral > 0
                  ? <rect className="franja-superpone" x={d.superpone === 'derecha' ? X(d.ancho) : X(0) - Math.max(4, solapeLateral * k)} y={Y(Math.max(...d.arriba))}
                    width={Math.max(4, solapeLateral * k)} height={Math.max(...d.arriba) * k} />
                  : <line className="lado-superpone" x1={X(lado)} y1={Y(0)} x2={X(lado)} y2={Y(d.superpone === 'derecha' ? d.arriba[1] : d.arriba[0])} />}
                {/* Cotas: el ancho abajo; el largo a la izquierda (y el otro costado si es inclinada). */}
                <text x={X(d.ancho / 2)} y={Y(0) + 14} textAnchor="middle" className="cota-panel">{m(d.ancho)}</text>
                <text x={X(0) - 4} y={Y(d.arriba[0] / 2)} textAnchor="end" dominantBaseline="middle" className="cota-panel">{m(d.arriba[0])}</text>
                {inclinada && <text x={X(d.ancho) - 3} y={Y(d.arriba[1]) + 11} textAnchor="end" className="cota-panel">{m(d.arriba[1])}</text>}
              </svg>
              <small>{d.cortadaALoLargo ? 'cortada a lo largo · ' : ''}va desde {m(d.desde)} m {esTecho ? 'del borde bajo' : 'del piso'}
                {d.recortes.map((r) => ` · recorte ${m(r.x1 - r.x0)} × ${m(r.y1 - r.y0)} m, a ${m(r.x0)} m del costado izq. y ${m(r.y0)} m de abajo`).join('')}</small>
            </figure>
          );
        })}
      </div>
      {rellenos.length > 0 && (
        <p className="nota"><strong>Rellenos al costado de las aberturas:</strong> {rellenos.map((r) => `tira ${r.tira}, costado ${r.lado}: ${m(r.ancho)} × ${m(r.arriba - r.abajo)} m (${r.de ? `sale del ${r.de}` : 'se compra'})`).join(' · ')}.</p>
      )}
    </div>
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
export function PlanoDePared({ vista: v, params, soloContorno = false, codigos = null }) {
  // v1.60: para el proveedor de paneles: solo lo que se corta en el panel (sin piezas ni aberturas a futuro).
  const aberturas = soloContorno ? v.aberturas.filter((a) => !a.futura) : v.aberturas;
  return (
    <>
      {v.esTecho ? (
        // v1.91: el panel del techo (visto desde arriba): a lo largo y a lo largo del faldón, desde el borde bajo.
        <h3 className="subtitulo">
          Techo · {f2(v.largo)} m de largo × {f2(v.alturas[0])} m de faldón (desde el borde bajo{v.alero?.bajo > 0 ? `, con ${f2(v.alero.bajo)} m de alero` : ''}{v.alero?.alto > 0 ? `; ${f2(v.alero.alto)} m de alero arriba` : ''})
        </h3>
      ) : (
      <h3 className="subtitulo">
        Pared {nombreDePared(v.lado, params)} · {f2(v.largo)} m · alto {f2(v.alturas[0])}
        {Math.abs(v.alturas[0] - v.alturas[1]) > 0.005 ? ` a ${f2(v.alturas[1])}` : ''} m
      </h3>
      )}
      {v.esTecho && <p className="nota">Visto desde arriba: abajo en el dibujo, el borde bajo (por donde cae el agua); las tiras van a lo largo del faldón.</p>}
      <DibujoPared vista={v} soloContorno={soloContorno} codigos={codigos} />
      {!soloContorno && <TablaPiezas lista={v.lista} />}
      {aberturas.length > 0 && (
        <div className="table-wrap">
        <table className="tabla-plano">
          <thead><tr><th>Abertura</th><th className="num">Ancho</th><th className="num">Alto</th><th className="num">Antepecho</th><th className="num">Desde esq. izq.</th></tr></thead>
          <tbody>
            {aberturas.map((a) => (
              <tr key={a.numero}>
                <td>#{a.numero} {a.tipo}{a.etiqueta ? ` · ${a.etiqueta}` : ''}{a.futura ? ' (a futuro: solo el marco)' : ''}</td>
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
      {v.paneles && <TablaPaneles paneles={v.paneles} />}
      {v.paneles?.despiece?.length > 0 && <DespiecePaneles paneles={v.paneles} esTecho={Boolean(v.esTecho)} />}
    </>
  );
}

/** Una planta completa: título, dibujo y piezas (pestaña y PDF). */
export function PlanoDePlanta({ vista: p, codigos = null }) {
  return (
    <>
      <h3 className="subtitulo">{NOMBRE_PLANTA[p.nivel]} · vista desde arriba · {medidasDeContorno(p.contorno)}</h3>
      <DibujoPlanta vista={p} codigos={codigos} />
      <TablaPiezas lista={p.lista} />
    </>
  );
}

/** v1.57: los planos de las instalaciones, cada uno con su casilla para prenderlo o apagarlo. */
function PlanosInstalaciones({ params, estructura }) {
  const [visibles, setVisibles] = useEstadoGuardado('planosInstalaciones', { electrica: true, agua: true, desague: true, gas: true },
    (v) => v && typeof v === 'object');
  const conPuntos = SISTEMAS.filter(([s]) => (params.instalaciones?.puntos ?? []).some((p) => p.sistema === s));
  if (conPuntos.length === 0) return null;
  return (
    <section className="card plano">
      <h3 className="subtitulo">Instalaciones</h3>
      <div className="fila-casillas" role="group" aria-label="Qué instalaciones se ven">
        {conPuntos.map(([s, nombre, color]) => (
          <label key={s} className="casilla-opcional">
            <input type="checkbox" checked={visibles[s] !== false} onChange={(e) => setVisibles({ ...visibles, [s]: e.target.checked })} />
            <span className="muestra-color" style={{ background: color }} /> {nombre}
          </label>
        ))}
      </div>
      {conPuntos.filter(([s]) => visibles[s] !== false).map(([s]) => <BloqueInstalacion key={s} params={params} estructura={estructura} sistema={s} />)}
    </section>
  );
}

/** v1.82.2: una junta vertical en x, de 0 a `alto`, sin los huecos de las aberturas que cruza (como en el 3D). */
function tramosSinHuecos(x, alto, huecos = []) {
  const cortes = huecos.filter((h) => h.desde < x && h.hasta > x).map((h) => [h.abajo, h.arriba]).sort((p, q) => p[0] - q[0]);
  const tramos = [];
  let desde = 0;
  cortes.forEach(([c0, c1]) => { if (c0 > desde + 0.01) tramos.push([desde, c0]); desde = Math.max(desde, c1); });
  if (alto > desde + 0.01) tramos.push([desde, alto]);
  return tramos;
}

export default function Planos({ vistas, params, estructura = null, onExportar, implantacion = null, codigosCorte = null, sinCortesAberturas = false, onSinCortesAberturas = null }) {
  // v1.60: las paredes como las ve el proveedor de paneles (contorno y aberturas, sin la estructura ni sus medidas).
  const [paraPaneles, setParaPaneles] = useEstadoGuardado('planosParaPaneles', false, (v) => typeof v === 'boolean');
  // v1.68: el código de la hoja de corte en cada pieza (el mismo de Presupuesto → Cortes y del 3D).
  const [verCodigos, setVerCodigos] = useEstadoGuardado('planosCodigosCorte', false, (v) => typeof v === 'boolean');
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
        <label className="casilla-opcional no-print">
          <input type="checkbox" checked={paraPaneles} onChange={(e) => setParaPaneles(e.target.checked)} />
          Para el proveedor de paneles: solo los paños a revestir (las 4 paredes y el techo), con el contorno, las
          aberturas y las tiras; sin la estructura de hierro
        </label>
        {paraPaneles && onSinCortesAberturas && (
          <fieldset className="radios-cortes no-print">
            <legend>Las aberturas en las tiras (v1.91)</legend>
            <label><input type="radio" name="cortes-aberturas" checked={!sinCortesAberturas} onChange={() => onSinCortesAberturas(false)} />
              {' '}Con los cortes de las aberturas (las tiras vienen cortadas)</label>
            <label><input type="radio" name="cortes-aberturas" checked={sinCortesAberturas} onChange={() => onSinCortesAberturas(true)} />
              {' '}Tiras enteras (las aberturas se cortan en obra)</label>
          </fieldset>
        )}
        {codigosCorte?.size > 0 && (
          <label className="casilla-opcional no-print">
            <input type="checkbox" checked={verCodigos} onChange={(e) => setVerCodigos(e.target.checked)} />
            Número de corte en cada pieza (el de la hoja de corte: 2.3b = grupo 2, barra 3, pieza b)
          </label>
        )}
        <button type="button" className="btn-print no-print" onClick={onExportar}>Imprimir o exportar…</button>
      </Tarjeta>
      {/* v1.32: la casa en su lote (si se cargó el terreno). */}
      {implantacion && params.terreno?.activo && !paraPaneles && (
        <section className="card plano">
          <h3 className="subtitulo">Implantación (vista desde arriba, la calle abajo)</h3>
          <PlanoImplantacion imp={implantacion} terreno={params.terreno} tapial={dibujoDelTapial(params)} />
        </section>
      )}
      {vistas.paredes.map((v) => (
        <section key={v.lado} className="card plano"><PlanoDePared vista={v} params={params} soloContorno={paraPaneles} codigos={verCodigos ? codigosCorte : null} /></section>
      ))}
      {/* v1.91: para el proveedor de paneles, el techo como un paño más; sin plantas ni instalaciones (son de hierro). */}
      {paraPaneles && vistas.techo && <section className="card plano"><PlanoDePared vista={vistas.techo} params={params} soloContorno /></section>}
      {!paraPaneles && vistas.plantas.map((p) => (
        <section key={p.nivel} className="card plano"><PlanoDePlanta vista={p} codigos={verCodigos ? codigosCorte : null} /></section>
      ))}
      {!paraPaneles && <PlanosInstalaciones params={params} estructura={estructura} />}
    </>
  );
}
