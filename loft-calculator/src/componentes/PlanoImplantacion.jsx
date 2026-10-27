// ==========================================================
// PlanoImplantacion (v1.32): la casa en su lote, visto desde arriba
// ----------------------------------------------------------
// El plano que se presenta en el municipio: lote, línea municipal (abajo,
// como se dibuja siempre), la casa con sus 4 distancias, los retiros
// cargados, lo que hay en el terreno y la flecha del norte.
// Se dibuja en METROS (viewBox): la escala la pone el tamaño del SVG.
// Sale en la pestaña Planos y en el PDF. Los datos: motor/terreno.js.
// ==========================================================

import { TIPOS_ELEMENTO } from '../motor/terreno.js';

const f2 = (n) => n.toFixed(2);

/**
 * @param imp     resultado de implantacion(params)
 * @param terreno params.terreno (retiros y orientación)
 */
export default function PlanoImplantacion({ imp, terreno }) {
  const { lote, casa, distancias } = imp;
  const T = Math.max(lote.frente, lote.fondo) / 45; // alto del texto, proporcional al lote
  const margen = T * 7;
  // y del dibujo: la línea municipal abajo (y = fondo) y el fondo del lote arriba (y = 0).
  const y = (v) => lote.fondo - v;
  const ancho = lote.frente + margen * 2;
  const alto = lote.fondo + margen * 2.4;

  // Cota con su texto: horizontal o vertical.
  const cota = (x1, y1, x2, y2, texto, clave) => {
    const largo = Math.hypot(x2 - x1, y2 - y1);
    if (largo < T * 0.8) return null;
    const vertical = Math.abs(x2 - x1) < 1e-6;
    const [mx, my] = [(x1 + x2) / 2, (y1 + y2) / 2];
    return (
      <g key={clave} className="cota">
        <line x1={x1} y1={y1} x2={x2} y2={y2} />
        <line x1={x1 - (vertical ? T * 0.4 : 0)} y1={y1 - (vertical ? 0 : T * 0.4)} x2={x1 + (vertical ? T * 0.4 : 0)} y2={y1 + (vertical ? 0 : T * 0.4)} />
        <line x1={x2 - (vertical ? T * 0.4 : 0)} y1={y2 - (vertical ? 0 : T * 0.4)} x2={x2 + (vertical ? T * 0.4 : 0)} y2={y2 + (vertical ? 0 : T * 0.4)} />
        <text x={vertical ? mx + T * 0.4 : mx} y={vertical ? my : my - T * 0.4} fontSize={T}
          textAnchor={vertical ? 'start' : 'middle'} dominantBaseline={vertical ? 'middle' : 'auto'}>{texto}</text>
      </g>
    );
  };

  // Flecha del norte: en el dibujo "arriba" es el fondo del lote; la calle (abajo) mira a `orientacion`.
  // Rumbo de "arriba" en el dibujo = orientacion + 180. El norte queda girado -(orientacion + 180) desde arriba.
  const giro = -((terreno.orientacion ?? 0) + 180);
  const brujula = [lote.frente + margen * 0.55, -margen * 0.45];
  const r = T * 2.2;

  const cx = casa.u + casa.ancho / 2;
  const cy = y(casa.v + casa.profundidad / 2);
  const retiros = terreno.retiros ?? {};

  return (
    <svg className="plano-implantacion" viewBox={`${-margen} ${-margen} ${ancho} ${alto}`} role="img"
      aria-label={`Implantación: lote de ${f2(lote.frente)} x ${f2(lote.fondo)} m`}>
      {/* Lote y línea municipal */}
      <rect x={0} y={0} width={lote.frente} height={lote.fondo} className="lote" />
      <line x1={-margen * 0.6} y1={lote.fondo} x2={lote.frente + margen * 0.6} y2={lote.fondo} className="linea-municipal" />
      <text x={lote.frente / 2} y={lote.fondo + T * 2.6} fontSize={T * 1.1} textAnchor="middle" className="rotulo-lm">LÍNEA MUNICIPAL</text>
      <text x={lote.frente / 2} y={lote.fondo + T * 4.4} fontSize={T} textAnchor="middle" className="rotulo-calle">calle</text>

      {/* Retiros cargados por el diseñador (punteados) */}
      {retiros.frente > 0 && <line x1={0} y1={y(retiros.frente)} x2={lote.frente} y2={y(retiros.frente)} className="retiro" />}
      {retiros.fondo > 0 && <line x1={0} y1={retiros.fondo} x2={lote.frente} y2={retiros.fondo} className="retiro" />}
      {retiros.izquierda > 0 && <line x1={retiros.izquierda} y1={0} x2={retiros.izquierda} y2={lote.fondo} className="retiro" />}
      {retiros.derecha > 0 && <line x1={lote.frente - retiros.derecha} y1={0} x2={lote.frente - retiros.derecha} y2={lote.fondo} className="retiro" />}

      {/* Lo que hay en el terreno */}
      {imp.elementos.map((el) => {
        const tipo = TIPOS_ELEMENTO[el.tipo];
        const c = el.caja;
        const etiqueta = (
          <text x={c.u + c.ancho / 2} y={y(c.v + c.largo / 2)} fontSize={T * 0.85} textAnchor="middle" dominantBaseline="middle" className="rotulo-elemento">
            {el.nombre}
          </text>
        );
        return (
          <g key={el.id} className={`elemento elemento-${el.tipo}`}>
            {tipo.forma === 'circulo'
              ? <circle cx={c.u + c.ancho / 2} cy={y(c.v + c.largo / 2)} r={el.diametro / 2} fill={tipo.color} />
              : <rect x={c.u} y={y(c.v + c.largo)} width={c.ancho} height={c.largo} fill={tipo.color} />}
            {etiqueta}
          </g>
        );
      })}

      {/* La casa y sus 4 distancias */}
      <rect x={casa.u} y={y(casa.v + casa.profundidad)} width={casa.ancho} height={casa.profundidad} className="casa" />
      <text x={cx} y={cy} fontSize={T * 1.1} textAnchor="middle" dominantBaseline="middle" className="rotulo-casa">
        CASA {f2(casa.ancho)} x {f2(casa.profundidad)}
      </text>
      {cota(cx, lote.fondo, cx, y(casa.v), f2(distancias.frente), 'frente')}
      {cota(cx, y(casa.v + casa.profundidad), cx, 0, f2(distancias.fondo), 'fondo')}
      {cota(0, cy, casa.u, cy, f2(distancias.izquierda), 'izq')}
      {cota(casa.u + casa.ancho, cy, lote.frente, cy, f2(distancias.derecha), 'der')}

      {/* Medidas del lote */}
      {cota(0, -margen * 0.35, lote.frente, -margen * 0.35, `${f2(lote.frente)} m`, 'lote-frente')}
      {cota(-margen * 0.35, 0, -margen * 0.35, lote.fondo, `${f2(lote.fondo)} m`, 'lote-fondo')}

      {/* Norte */}
      <g transform={`translate(${brujula[0]} ${brujula[1] + r * 1.2}) rotate(${giro})`} className="norte">
        <circle r={r} />
        <path d={`M 0 ${-r * 0.9} L ${r * 0.35} ${r * 0.5} L 0 ${r * 0.25} L ${-r * 0.35} ${r * 0.5} Z`} />
        <text y={-r * 1.15} fontSize={T * 1.1} textAnchor="middle">N</text>
      </g>
    </svg>
  );
}
