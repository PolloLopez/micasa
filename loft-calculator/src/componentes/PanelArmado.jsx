// ==========================================================
// PanelArmado (v1.83): Obra → Armado, los fierros ya puestos
// ----------------------------------------------------------
// Pedido de Leandro (23/11, ya empezó a construir): "necesito marcar qué
// fierros fueron ya instalados y confirmar medidas". Lista por zona (cada
// pared, el piso, el techo…) y por tipo (columnas, vigas…), con:
//   - Puesta y Medida ✓ en cada pieza;
//   - botones para marcar un tipo o una zona entera ("toda la pared A");
//   - la medida real si no coincide (la pieza se acorta o alarga sola).
// Lo mismo se marca tocando la pieza en el 3D (y con "🏗 Avance" se ve en
// verde lo puesto). Las cuentas están en motor/armado.js.
// ==========================================================

import { useState } from 'react';
import Tarjeta from './Tarjeta.jsx';
import FichaPlegable from './FichaPlegable.jsx';
import CampoNumero from './CampoNumero.jsx';
import NotaPlegable from './NotaPlegable.jsx';
import { gruposDeArmado, resumenDeArmado, zonaDePieza } from '../motor/armado.js';
import { NOMBRE_TIPO_PIEZA } from '../motor/estructura.js';
import Buscador from './Buscador.jsx';
import { filtrarPor } from '../motor/buscar.js';
import { textoDeCodigo } from '../motor/hojaDeCorte.js';

const m = (n) => n.toFixed(2).replace('.', ',');

/** Los botones de un grupo: marcar todo puesto / sacar las marcas. */
function BotonesDeGrupo({ piezas, instaladas, nombre, onMarcar }) {
  const ids = piezas.map((p) => p.id);
  return (
    <span className="botones-grupo no-print">
      {instaladas < piezas.length
        ? <button type="button" className="btn-mini" onClick={() => onMarcar(ids, 'instalada', true)} title={`Marcar puestas todas: ${nombre}`}>✓ Todo puesto</button>
        : <button type="button" className="btn-mini" onClick={() => onMarcar(ids, 'instalada', false)} title={`Desmarcar: ${nombre}`}>Desmarcar</button>}
    </span>
  );
}

/**
 * @param piezas        listarPiezas(estructura): las del 3D y la hoja de corte
 * @param avance        params.avancePiezas
 * @param nombreZona    (zona) => nombre ("Frente (A)")
 * @param codigosCorte  id → código de la hoja de corte ("2.3b")
 * @param onMarcar      (ids, 'instalada' | 'verificada', valor)
 * @param onMedidaReal  (pieza, metros) => error | null
 */
/**
 * v1.101 (Leandro: "me falta ver cuántos perfiles usé y cuántos me faltan, para comparar con la realidad y verificar
 * si es cierto"): por perfil, las barras que lleva la obra, las compradas, las empezadas (con algún corte puesto), las
 * enteras que deberían quedar en el lote y las que faltan comprar. Ver motor/usoDePerfiles.js.
 */
function UsoDePerfiles({ lista }) {
  if (!lista?.length) return null;
  const n = (x) => String(Math.round(x * 100) / 100).replace('.', ',');
  return (
    <details className="uso-perfiles" open>
      <summary><strong>Perfiles: usados, en el lote y por comprar</strong></summary>
      <div className="table-wrap">
        <table className="tabla-plano tabla-segmentos">{/* tabla-segmentos: en el celular, una ficha por perfil */}
          <thead><tr><th>Perfil</th><th className="num">Lleva la obra</th><th className="num">Compradas</th>
            <th className="num">Empezadas</th><th className="num">Enteras en el lote</th><th className="num">Faltan comprar</th><th className="num">Piezas puestas</th></tr></thead>
          <tbody>
            {lista.map((u) => (
              <tr key={`${u.perfil}|${u.largoBarra}`}>
                <td data-etiqueta="Perfil">{u.perfil}<small className="detalle"> · barra de {n(u.largoBarra)} m</small></td>
                <td className="num" data-etiqueta="Lleva la obra">{u.barras} barras</td>
                <td className="num" data-etiqueta="Compradas">{n(u.compradas)}</td>
                <td className="num" data-etiqueta="Empezadas" title="Barras con al menos un corte ya puesto">{u.empezadas}</td>
                <td className="num" data-etiqueta="Enteras en el lote" title="Compradas menos empezadas: contalas en la obra">
                  <strong>{n(u.enObra)}</strong>{u.empezadas > 0 ? <small> + sobrantes</small> : null}</td>
                <td className="num" data-etiqueta="Faltan comprar">{u.faltanComprar > 0 ? <strong className="falta">{n(u.faltanComprar)}</strong> : '✓'}{u.sobran > 0 ? <small> · sobran {n(u.sobran)}</small> : null}</td>
                <td className="num" data-etiqueta="Piezas puestas">{u.puestas} de {u.piezas}<small> · {n(u.metrosPuestos)} de {n(u.metros)} m</small></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <small className="nota">"Enteras en el lote" supone que se cortó como dice la hoja de corte (Presupuesto → Cortes): contá las
        barras enteras que tenés y comparalo. Si no coincide, puede faltar marcar piezas puestas o cargar una compra.</small>
    </details>
  );
}

export default function PanelArmado({ piezas, avance = {}, nombreZona, codigosCorte = null, unidad, onMarcar, onMedidaReal, usoPerfiles = [] }) {
  const [soloFaltan, setSoloFaltan] = useState(false);
  // v1.84: buscador (por pared, tipo, medida, código de corte o estado: "frente columna 4,33", "1.15", "falta").
  const [buscar, setBuscar] = useState('');
  const textoDe = (p) => {
    const estado = avance[p.id] ?? {};
    const codigo = codigosCorte?.get(p.id);
    return `${nombreZona(zonaDePieza(p))} ${NOMBRE_TIPO_PIEZA[p.tipo] ?? p.tipo} ${m(p.largo)} m ${codigo ? `corte ${textoDeCodigo(codigo)}` : ''} `
      + `${estado.instalada ? 'puesta instalada' : 'falta'} ${estado.verificada ? 'verificada medida' : ''} ${p.medidaReal ? 'medida en obra' : ''}`;
  };
  const encontradas = filtrarPor(piezas, buscar, textoDe);
  const grupos = gruposDeArmado(encontradas, avance, nombreZona);
  const r = resumenDeArmado(piezas, avance);
  return (
    <Tarjeta id="armado" titulo={`Armado: ${r.instaladas} de ${r.total} piezas puestas (${r.porcentaje} %)`}>
      <div className="barra-avance" role="progressbar" aria-valuenow={r.porcentaje} aria-valuemin={0} aria-valuemax={100}>
        <span style={{ width: `${r.porcentaje}%` }} />
      </div>
      <p className="nota" role="status">{m(r.metrosInstalados)} de {m(r.metros)} m de fierro puestos · {r.verificadas} piezas con la medida verificada.</p>
      <UsoDePerfiles lista={usoPerfiles} />
      <NotaPlegable>
        Tildá <strong>Puesta</strong> cuando la pieza ya está soldada y <strong>Medida ✓</strong> cuando la mediste en obra. Si no
        coincide, cargá la <strong>medida real</strong>: la pieza se acorta o se alarga sola (en el 3D, los planos y los cortes).
        También se marca tocando la pieza en el 3D; con <strong>🏗 Avance</strong> ves en verde lo puesto.
      </NotaPlegable>
      <Buscador valor={buscar} onCambio={setBuscar} ayuda="frente, columna, 4,33, corte 1.15, falta…" etiqueta="Buscar fierros"
        quedan={encontradas.length} total={piezas.length} />
      <label className="casilla-opcional">
        <input type="checkbox" checked={soloFaltan} onChange={(e) => setSoloFaltan(e.target.checked)} />
        Ver solo lo que falta poner
      </label>
      {buscar && encontradas.length === 0 && <p className="vacio">Ningún fierro con "{buscar}".</p>}
      {grupos.map((g) => (
        <FichaPlegable key={g.zona} clave={`armado:${g.zona}`} className="rubro"
          encabezado={<>
            <span className={`chip-estado ${g.instaladas === g.total ? 'etapa-finalizadoPagado' : g.instaladas > 0 ? 'etapa-enProceso' : 'etapa-presupuestado'}`}>
              {g.instaladas === g.total ? 'Puesto ✓' : `${g.instaladas} de ${g.total}`}</span>
            <strong>{g.nombre}</strong>
            <small>{g.total} piezas · {g.verificadas} medidas ✓</small>
          </>}>
          <div className="pie-acciones"><BotonesDeGrupo piezas={g.tipos.flatMap((t) => t.piezas)} instaladas={g.instaladas} nombre={g.nombre} onMarcar={onMarcar} /></div>
          {g.tipos.map((t) => {
            const visibles = soloFaltan ? t.piezas.filter((p) => !avance[p.id]?.instalada) : t.piezas;
            if (visibles.length === 0) return null;
            return (
              <div key={t.nombre} className="tipo-armado">
                <h4 className="subtitulo-pared">{t.nombre} <small>({t.instaladas} de {t.total} puestas)</small>
                  <BotonesDeGrupo piezas={t.piezas} instaladas={t.instaladas} nombre={`${t.nombre} de ${g.nombre}`} onMarcar={onMarcar} /></h4>
                <ul className="lista-armado">
                  {visibles.map((p) => {
                    const estado = avance[p.id] ?? {};
                    const codigo = codigosCorte?.get(p.id);
                    return (
                      <li key={p.id} className={estado.instalada ? 'puesta' : ''}>
                        <span className="pieza-armado">{m(p.largo)} m{codigo ? <small> · corte {textoDeCodigo(codigo)}</small> : null}
                          {p.medidaReal ? <small className="marca-editada"> · medida en obra (plano {m(p.largoPlano)} m)</small> : p.editada ? <small className="marca-editada"> · editada</small> : null}</span>
                        <label><input type="checkbox" checked={Boolean(estado.instalada)} onChange={(e) => onMarcar([p.id], 'instalada', e.target.checked)}
                          aria-label={`Puesta: ${t.nombre} de ${m(p.largo)} m (${g.nombre})`} /> Puesta</label>
                        <label><input type="checkbox" checked={Boolean(estado.verificada)} onChange={(e) => onMarcar([p.id], 'verificada', e.target.checked)}
                          aria-label={`Medida verificada: ${t.nombre} de ${m(p.largo)} m (${g.nombre})`} /> Medida ✓</label>
                        {onMedidaReal && (
                          <CampoNumero etiqueta="Medida real" unidad={unidad} valor={estado.medidaReal ?? p.largo}
                            onCambio={(v) => (Math.abs(v - p.largo) < 0.0005 ? null : onMedidaReal(p, v))} />
                        )}
                        {onMedidaReal && estado.medidaReal && (
                          <button type="button" className="btn-mini" onClick={() => onMedidaReal(p, null)} title="Volver a la medida del cálculo">↶ la del plano</button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </FichaPlegable>
      ))}
    </Tarjeta>
  );
}
