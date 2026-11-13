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
import { LADOS_LOTE, RENDIMIENTOS, completarObraCivil, cuentasDeObraCivil, largoDelTapial } from '../motor/obraCivil.js';

const n2 = (n) => n.toLocaleString('es-AR', { maximumFractionDigits: 2 });

export default function PanelObraCivil({ params, estructura, unidad, cambiar }) {
  const oc = completarObraCivil(params.obraCivil);
  const { partes, total, materiales: m } = cuentasDeObraCivil(params, estructura ?? {});
  const conTerreno = Boolean(params.terreno?.activo);
  const elementos = conTerreno ? params.terreno.elementos ?? [] : [];
  const cuantos = (tipo) => elementos.filter((el) => el.tipo === tipo).length;
  const alternarLado = (lado) => cambiar('obraCivil.tapial.lados')(oc.tapial.lados.includes(lado)
    ? oc.tapial.lados.filter((l) => l !== lado) : [...oc.tapial.lados, lado]);
  return (
    <Tarjeta id="obraCivil" titulo="Obra civil (hormigón y ladrillos)">
      <p className="nota">Cemento, arena, piedra, hierro y ladrillos de los pilotines, el tapial, el pilar de luz y el pozo. Van a la
        lista de materiales y al presupuesto. Los rendimientos son de un cómputo común: validalos con el albañil.</p>

      <h4 className="subtitulo-pared">Dosificación (por m³)</h4>
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
      ) : <p className="nota">Sin terreno cargado, poné el largo a mano (con el terreno se eligen los lados del lote y se ve en el 3D).</p>}
      <div className="grid-params">
        {(!conTerreno || oc.tapial.lados.length === 0) && (
          <CampoNumero etiqueta="Largo del tapial" unidad={unidad} valor={oc.tapial.largoManual} onCambio={cambiar('obraCivil.tapial.largoManual')} />
        )}
        <CampoNumero etiqueta="Alto" unidad={unidad} valor={oc.tapial.alto} onCambio={cambiar('obraCivil.tapial.alto')} />
        <CampoNumero etiqueta="Columnas cada" unidad={unidad} valor={oc.tapial.columnasCada} onCambio={cambiar('obraCivil.tapial.columnasCada')} />
      </div>
      {largoDelTapial(oc, params.terreno) > 0 && <p className="nota">Largo: {n2(largoDelTapial(oc, params.terreno))} m de ladrillo hueco 12x18x33, columnas de
        {' '}{RENDIMIENTOS.columna * 100} x {RENDIMIENTOS.columna * 100} cm, viga de fundación y encadenado arriba.</p>}

      <h4 className="subtitulo-pared">Pilar de luz, cámara séptica y pozo</h4>
      <p className="nota">Se ubican en <strong>Terreno e implantación</strong> (agregá "Pilar de luz", "Cámara séptica" o "Pozo séptico").
        {conTerreno ? ` Hay ${cuantos('pilarLuz')} pilar(es), ${cuantos('camara')} cámara(s) y ${cuantos('pozo')} pozo(s).` : ' Primero tildá "Ubicar la obra en un terreno".'}</p>
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
                <td className="num">{n2(x.hormigon)} m³</td>
                <td className="num">{n2(x.mortero)} m³</td>
                <td className="num">{n2(x.hierro8 + x.hierro6 + x.hierro42)} m</td>
                <td className="num">{Math.ceil(x.ladrilloHueco + x.ladrilloComun)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="nota resumen-mesada" role="status">
          A comprar: <strong>{m.bolsas} bolsas de cemento</strong> ({n2(m.cemento)} kg) · {n2(m.arena)} m³ de arena · {n2(m.piedra)} m³ de piedra ·
          {' '}{m.varillas8} varillas ø8{m.varillas6 > 0 ? ` · ${m.varillas6} ø6` : ''}{m.varillas42 > 0 ? ` · ${m.varillas42} ø4,2` : ''}
          {m.ladrilloHueco > 0 ? ` · ${m.ladrilloHueco} ladrillos huecos` : ''}{m.ladrilloComun > 0 ? ` · ${m.ladrilloComun} ladrillos comunes` : ''}
          {' '}· excavación {n2(m.excavacion)} m³ ({n2(total.hormigon)} m³ de hormigón en total)
        </p>
      </>)}
    </Tarjeta>
  );
}
