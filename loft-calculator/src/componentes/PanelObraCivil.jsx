// ==========================================================
// PanelObraCivil (v1.56): lo que hace el albañil
// ----------------------------------------------------------
// Dosificación del hormigón y del mortero (editable), pilotines hormigonados
// en obra, el tapial del cerramiento (por los lados del lote), y la
// profundidad del pilar de luz, la cámara séptica y el pozo. El pilar, la
// cámara y el pozo se ubican en el Terreno (son elementos del lote). Abajo,
// lo que lleva cada parte y lo que hay que comprar. Cuentas en obraCivil.js.
// ==========================================================

import Tarjeta from './Tarjeta.jsx';
import CampoNumero from './CampoNumero.jsx';
import { DOSIFICACIONES_HORMIGON, DOSIFICACIONES_MORTERO, dosificacionElegida, LADOS_LOTE, RENDIMIENTOS, LADRILLOS_TAPIAL, MATERIALES_ALBANIL, completarObraCivil, cuentasDeObraCivil, largoDelTapial, huecoDelPorton } from '../motor/obraCivil.js';
import CampoSelect from './CampoSelect.jsx';
import NotaPlegable from './NotaPlegable.jsx';

const n2 = (n) => n.toLocaleString('es-AR', { maximumFractionDigits: 2 });
const OPCIONES_LADRILLO = Object.entries(LADRILLOS_TAPIAL).map(([clave, l]) => [clave, l.nombre]);

/**
 * v1.80: lo que dijo el albañil para el tapial, al lado de lo calculado. Vacío o 0 = se usa lo calculado.
 * @param cuentas cuentasDeObraCivil(…).tapial ({ calculado, final })
 */
function SegunAlbanil({ oc, cuentas, cambiar }) {
  const albanil = oc.tapial.segunAlbanil ?? {};
  const poner = (campo) => (v) => {
    if (!(Number.isFinite(v) && v >= 0)) return 'No puede ser negativo';
    const nuevo = { ...albanil };
    if (v > 0) nuevo[campo] = v; else delete nuevo[campo]; // 0 = volver a lo calculado
    cambiar('obraCivil.tapial.segunAlbanil')(nuevo);
    return null;
  };
  const filas = MATERIALES_ALBANIL.filter(([campo]) => (cuentas.calculado[campo] ?? 0) > 0 || albanil[campo] > 0);
  return (
    <details className="segun-albanil" open={Object.keys(albanil).length > 0 || undefined}>
      <summary>Según el albañil {Object.keys(albanil).length > 0 ? `(${Object.keys(albanil).length} cargado${Object.keys(albanil).length > 1 ? 's' : ''})` : ''}</summary>
      <table className="tabla-segmentos">
        <thead><tr><th>Material</th><th className="num">Calculado</th><th className="num">Según el albañil</th></tr></thead>
        <tbody>
          {filas.map(([campo, nombre, u]) => (
            <tr key={campo} className={albanil[campo] > 0 ? 'fila-actual' : ''}>
              <td>{campo === 'ladrillos' ? (LADRILLOS_TAPIAL[oc.tapial.ladrillo]?.nombre ?? nombre) : nombre}</td>
              <td className="num" data-etiqueta="Calculado">{n2(cuentas.calculado[campo] ?? 0)} {u}</td>
              <td className="num" data-etiqueta="Según el albañil">
                <CampoNumero etiqueta="" sufijo={u} decimales={campo === 'arena' || campo === 'piedra' ? 1 : 0} valor={albanil[campo] ?? 0} onCambio={poner(campo)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <NotaPlegable>Lo que cargues acá reemplaza lo calculado en el presupuesto y en la lista de compras (0 = vuelve a lo
        calculado). Sirve para comparar: si el albañil pide mucho más, preguntale por qué.</NotaPlegable>
    </details>
  );
}

/** v1.80: el portón corredizo del tapial (lo hace Leandro de hierro): dónde va el hueco y con qué se cierra la hoja. */
function PortonDelTapial({ oc, params, unidad, cambiar }) {
  const p = oc.porton;
  const poner = (campo) => (v) => { cambiar('obraCivil.porton')({ ...p, [campo]: v }); return null; };
  const conTerreno = Boolean(params.terreno?.activo) && oc.tapial.lados.length > 0;
  const lados = LADOS_LOTE.filter(([l]) => oc.tapial.lados.includes(l));
  const hueco = huecoDelPorton(oc, params.terreno);
  return (<>
    <label className="casilla-opcional">
      <input type="checkbox" checked={p.activo} onChange={(e) => poner('activo')(e.target.checked)} />
      Dejar el hueco para un portón corredizo (lo hago de hierro)
    </label>
    {p.activo && (<>
      <div className="grid-params">
        {conTerreno && <CampoSelect etiqueta="En el lado" valor={lados.some(([l]) => l === p.lado) ? p.lado : lados[0]?.[0]} opciones={lados} onCambio={poner('lado')} />}
        {conTerreno && <CampoNumero etiqueta={p.lado === 'frente' || p.lado === 'fondo' ? 'Desde la esquina izquierda' : 'Desde la línea municipal'}
          unidad={unidad} valor={p.desde} onCambio={(v) => (v < 0 ? 'No puede ser negativo' : poner('desde')(v))} />}
        <CampoNumero etiqueta="Ancho del hueco" unidad={unidad} valor={p.ancho} onCambio={(v) => (v < 0.5 || v > 15 ? 'De 0,50 a 15 m' : poner('ancho')(v))} />
        <CampoNumero etiqueta="Alto de la hoja" unidad={unidad} valor={p.alto} onCambio={(v) => (v < 0.5 || v > 4 ? 'De 0,50 a 4 m' : poner('alto')(v))} />
        <CampoSelect etiqueta="La hoja se cierra con" valor={p.relleno} onCambio={poner('relleno')}
          opciones={[['chapa', 'Chapa lisa o trapezoidal'], ['malla', 'Metal desplegado o malla']]} />
      </div>
      {conTerreno && p.activo && !oc.tapial.lados.includes(p.lado) && <p className="error" role="alert">Ese lado no lleva tapial: elegí otro.</p>}
      {hueco && <NotaPlegable>Hueco de {n2(hueco.ancho)} m{conTerreno ? ` entre ${n2(hueco.desde)} y ${n2(hueco.hasta)} m` : ''}: sin muro ni
        encadenado; la viga de fundación sigue de largo y el riel va encima. Al lado tiene que quedar al menos
        {' '}{n2(hueco.ancho + RENDIMIENTOS.solapePorton)} m de muro libre para que la hoja corra. Lleva el bastidor de caño (con su hoja
        de corte en el Presupuesto), la {p.relleno === 'malla' ? 'malla' : 'chapa'}, el riel y los herrajes (ruedas, guía con rodillos, topes y cerradura).</NotaPlegable>}
    </>)}
  </>);
}

export default function PanelObraCivil({ params, estructura, unidad, cambiar }) {
  const oc = completarObraCivil(params.obraCivil);
  const { partes, total, materiales: m, tapial: cuentasTapial } = cuentasDeObraCivil(params, estructura ?? {});
  const conTerreno = Boolean(params.terreno?.activo);
  const elementos = conTerreno ? params.terreno.elementos ?? [] : [];
  const cuantos = (tipo) => elementos.filter((el) => el.tipo === tipo).length;
  const alternarLado = (lado) => cambiar('obraCivil.tapial.lados')(oc.tapial.lados.includes(lado)
    ? oc.tapial.lados.filter((l) => l !== lado) : [...oc.tapial.lados, lado]);
  return (
    <Tarjeta id="obraCivil" titulo="Obra civil (hormigón y ladrillos)">
      <NotaPlegable>Cemento, arena, piedra, hierro y ladrillos de los pilotines, el tapial, el pilar de luz y el pozo. Van a la
        lista de materiales y al presupuesto. Los rendimientos son de un cómputo común: validalos con el albañil.</NotaPlegable>

      <h4 className="subtitulo-pared">Dosificación (por m³)</h4>
      {/* v1.80: como la dice el albañil ("1:2:3"); elegirla completa los números de abajo. */}
      <div className="grid-params">
        <CampoSelect etiqueta="Hormigón, como lo dice el albañil" valor={dosificacionElegida(DOSIFICACIONES_HORMIGON, oc.hormigon)}
          opciones={[...DOSIFICACIONES_HORMIGON.map(([v, t]) => [v, t]), ['mano', 'Otra (los números de abajo)']]}
          onCambio={(v) => { const d = DOSIFICACIONES_HORMIGON.find(([c]) => c === v); if (d) cambiar('obraCivil.hormigon')({ ...d[2] }); return null; }} />
        <CampoSelect etiqueta="Mortero (para pegar ladrillos)" valor={dosificacionElegida(DOSIFICACIONES_MORTERO, oc.mortero)}
          opciones={[...DOSIFICACIONES_MORTERO.map(([v, t]) => [v, t]), ['mano', 'Otra (los números de abajo)']]}
          onCambio={(v) => { const d = DOSIFICACIONES_MORTERO.find(([c]) => c === v); if (d) cambiar('obraCivil.mortero')({ ...d[2] }); return null; }} />
      </div>
      <NotaPlegable>Preguntale al albañil "¿qué mezcla usás?": te va a decir algo como 1:2:3 (1 balde de cemento, 2 de arena y 3
        de piedra). Si no sabés, dejá la de fábrica. Si él te dice directo cuántas bolsas o ladrillos pide, cargalo en
        <strong> Según el albañil</strong> (abajo, en el tapial): manda sobre lo calculado.</NotaPlegable>
      <div className="grid-params">
        <CampoNumero etiqueta="Hormigón: cemento" sufijo="kg" decimales={0} valor={oc.hormigon.cemento} onCambio={cambiar('obraCivil.hormigon.cemento')} />
        <CampoNumero etiqueta="Hormigón: arena" sufijo="m³" decimales={2} valor={oc.hormigon.arena} onCambio={cambiar('obraCivil.hormigon.arena')} />
        <CampoNumero etiqueta="Hormigón: piedra" sufijo="m³" decimales={2} valor={oc.hormigon.piedra} onCambio={cambiar('obraCivil.hormigon.piedra')} />
        <CampoNumero etiqueta="Mortero: cemento" sufijo="kg" decimales={0} valor={oc.mortero.cemento} onCambio={cambiar('obraCivil.mortero.cemento')} />
        <CampoNumero etiqueta="Mortero: arena" sufijo="m³" decimales={2} valor={oc.mortero.arena} onCambio={cambiar('obraCivil.mortero.arena')} />
        <CampoNumero etiqueta="Bolsa de cemento" sufijo="kg" decimales={0} valor={oc.bolsaKg} onCambio={cambiar('obraCivil.bolsaKg')} />
      </div>

      <h4 className="subtitulo-pared">Pilotines</h4>
      <label className="casilla-opcional">
        <input type="checkbox" checked={oc.hormigonEnObra} onChange={(e) => cambiar('obraCivil.hormigonEnObra')(e.target.checked)} />
        Hormigonados en obra (cemento, arena, piedra y 4 ø8 con estribos, en vez del pilotín comprado y el hormigón elaborado de las zapatas)
      </label>
      {oc.hormigonEnObra && (
        <div className="grid-params">
          <CampoNumero etiqueta="Profundidad bajo el terreno" unidad={unidad} valor={oc.pilotin.profundidad} onCambio={cambiar('obraCivil.pilotin.profundidad')} />
        </div>
      )}

      <h4 className="subtitulo-pared">Tapial del cerramiento</h4>
      {conTerreno ? (
        <fieldset className="meses-dobles">
          <legend>Por qué lados del lote</legend>
          {LADOS_LOTE.map(([lado, nombre]) => (
            <label key={lado} className="check-mes">
              <input type="checkbox" checked={oc.tapial.lados.includes(lado)} onChange={() => alternarLado(lado)} />{nombre}
            </label>
          ))}
        </fieldset>
      ) : <NotaPlegable>Sin terreno cargado, poné el largo a mano (con el terreno se eligen los lados del lote y se ve en el 3D).</NotaPlegable>}
      <div className="grid-params">
        {(!conTerreno || oc.tapial.lados.length === 0) && (
          <CampoNumero etiqueta="Largo del tapial" unidad={unidad} valor={oc.tapial.largoManual} onCambio={cambiar('obraCivil.tapial.largoManual')} />
        )}
        <CampoNumero etiqueta="Alto" unidad={unidad} valor={oc.tapial.alto} onCambio={cambiar('obraCivil.tapial.alto')} />
        <CampoNumero etiqueta="Columnas cada" unidad={unidad} valor={oc.tapial.columnasCada} onCambio={cambiar('obraCivil.tapial.columnasCada')} />
        {/* v1.80: el ladrillo del muro (cambia cuántos van y el mortero) */}
        <CampoSelect etiqueta="Ladrillo" valor={oc.tapial.ladrillo} opciones={OPCIONES_LADRILLO} onCambio={cambiar('obraCivil.tapial.ladrillo')} />
      </div>
      {/* v1.80: el encadenado: un pilotín bajo cada columna, unidos por la viga de fundación. */}
      <label className="casilla-opcional">
        <input type="checkbox" checked={oc.tapial.pilotines} onChange={(e) => cambiar('obraCivil.tapial.pilotines')(e.target.checked)} />
        Un pilotín bajo cada columna (unidos por la viga de fundación)
      </label>
      <div className="grid-params">
        {oc.tapial.pilotines && (<>
          <CampoNumero etiqueta="Pilotín: diámetro" unidad={unidad} valor={oc.tapial.pilotinDiametro}
            onCambio={(v) => (v < 0.1 || v > 1 ? 'De 0,10 a 1 m' : cambiar('obraCivil.tapial.pilotinDiametro')(v))} />
          <CampoNumero etiqueta="Pilotín: profundidad" unidad={unidad} valor={oc.tapial.pilotinProfundidad}
            onCambio={(v) => (v < 0.3 || v > 6 ? 'De 0,30 a 6 m' : cambiar('obraCivil.tapial.pilotinProfundidad')(v))} />
        </>)}
        <CampoSelect etiqueta="Encofrado" valor={oc.tapial.encofrado} onCambio={cambiar('obraCivil.tapial.encofrado')}
          opciones={[['fenolico', 'Placas fenólicas propias'], ['ninguno', 'No lo cuento (prestado o alquilado)']]} />
        {oc.tapial.encofrado === 'fenolico' && (
          <CampoNumero etiqueta="Tramos encofrados a la vez" decimales={0} valor={oc.tapial.juegosEncofrado}
            onCambio={(v) => (v < 1 || v > 50 ? 'De 1 a 50' : cambiar('obraCivil.tapial.juegosEncofrado')(Math.round(v)))} />
        )}
      </div>
      {largoDelTapial(oc, params.terreno) > 0 && <NotaPlegable>Largo: {n2(largoDelTapial(oc, params.terreno))} m de {LADRILLOS_TAPIAL[oc.tapial.ladrillo].nombre.toLowerCase()},
        columnas de {RENDIMIENTOS.columna * 100} x {RENDIMIENTOS.columna * 100} cm, viga de fundación y encadenado arriba
        {oc.tapial.pilotines ? `, con un pilotín de ø${n2(oc.tapial.pilotinDiametro)} m bajo cada columna` : ''}.
        {oc.tapial.encofrado === 'fenolico' ? ` Las placas fenólicas alcanzan para ${oc.tapial.juegosEncofrado} tramo(s) entre columnas y se reusan en los siguientes.` : ''}</NotaPlegable>}
      {largoDelTapial(oc, params.terreno) > 0 && <PortonDelTapial oc={oc} params={params} unidad={unidad} cambiar={cambiar} />}
      {cuentasTapial && <SegunAlbanil oc={oc} cuentas={cuentasTapial} cambiar={cambiar} />}

      <h4 className="subtitulo-pared">Pilar de luz, cámara séptica y pozo</h4>
      <NotaPlegable>Se ubican en <strong>Terreno e implantación</strong> (agregá "Pilar de luz", "Cámara séptica" o "Pozo séptico").
        {conTerreno ? ` Hay ${cuantos('pilarLuz')} pilar(es), ${cuantos('camara')} cámara(s) y ${cuantos('pozo')} pozo(s).` : ' Primero tildá "Ubicar la obra en un terreno".'}</NotaPlegable>
      <div className="grid-params">
        <CampoNumero etiqueta="Pilar: enterrado" unidad={unidad} valor={oc.pilar.enterrado} onCambio={cambiar('obraCivil.pilar.enterrado')} />
        <CampoNumero etiqueta="Cámara: profundidad" unidad={unidad} valor={oc.camara.profundidad} onCambio={cambiar('obraCivil.camara.profundidad')} />
        <CampoNumero etiqueta="Pozo: profundidad" unidad={unidad} valor={oc.pozo.profundidad} onCambio={cambiar('obraCivil.pozo.profundidad')} />
      </div>

      {partes.length > 0 && (<>
        <h4 className="subtitulo-pared">Lo que lleva</h4>
        <table className="tabla-segmentos tabla-obra-civil">
          <thead><tr><th>Parte</th><th className="num">Hormigón</th><th className="num">Mortero</th><th className="num">Hierro</th><th className="num">Ladrillos</th></tr></thead>
          <tbody>
            {partes.map((x) => (
              <tr key={x.clave} title={x.detalle}>
                <td>{x.nombre}<br /><small>{x.detalle}</small></td>
                <td className="num" data-etiqueta="Hormigón">{n2(x.hormigon)} m³</td>
                <td className="num" data-etiqueta="Mortero">{n2(x.mortero)} m³</td>
                <td className="num" data-etiqueta="Hierro">{n2(x.hierro8 + x.hierro6 + x.hierro42)} m</td>
                <td className="num" data-etiqueta="Ladrillos">{Math.ceil(x.ladrilloHueco + x.ladrilloComun + (x.ladrilloHueco8 ?? 0) + (x.ladrilloHueco18 ?? 0) + (x.bloqueHormigon ?? 0))}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="nota resumen-mesada" role="status">
          A comprar: <strong>{m.bolsas} bolsas de cemento</strong> ({n2(m.cemento)} kg) · {n2(m.arena)} m³ de arena · {n2(m.piedra)} m³ de piedra ·
          {' '}{m.varillas8} varillas ø8{m.varillas6 > 0 ? ` · ${m.varillas6} ø6` : ''}{m.varillas42 > 0 ? ` · ${m.varillas42} ø4,2` : ''}
          {m.ladrilloHueco > 0 ? ` · ${m.ladrilloHueco} ladrillos huecos de 12` : ''}{m.ladrilloHueco8 > 0 ? ` · ${m.ladrilloHueco8} huecos de 8` : ''}
          {m.ladrilloHueco18 > 0 ? ` · ${m.ladrilloHueco18} huecos de 18` : ''}{m.bloqueHormigon > 0 ? ` · ${m.bloqueHormigon} bloques` : ''}
          {m.ladrilloComun > 0 ? ` · ${m.ladrilloComun} ladrillos comunes` : ''}
          {m.fenolicos > 0 ? ` · ${m.fenolicos} placas fenólicas y ${m.tirantesEncofrado} m de tirante` : ''}
          {' '}· excavación {n2(m.excavacion)} m³ ({n2(total.hormigon)} m³ de hormigón en total)
        </p>
      </>)}
    </Tarjeta>
  );
}
