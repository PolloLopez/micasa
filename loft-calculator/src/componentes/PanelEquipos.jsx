// ==========================================================
// PanelEquipos (v1.58): aires, salamandra y energía solar
// ----------------------------------------------------------
// Va en la pestaña Instalaciones, debajo de los sistemas. Cada aire dice si
// sus frigorías alcanzan para el ambiente; la salamandra, su caño de salida
// y si calienta la casa; el solar, cuántos paneles hacen falta para el
// consumo y cuánto pesan sobre el techo. Cuentas en motor/equipos.js.
// ==========================================================

import Tarjeta from './Tarjeta.jsx';
import FichaPlegable from './FichaPlegable.jsx';
import CampoNumero from './CampoNumero.jsx';
import CampoSelect from './CampoSelect.jsx';
import {
  FRIGORIAS_COMERCIALES, KCAL_SALAMANDRA, DIAMETROS_CANO, SALIDAS_CANO, PANEL_SOLAR, aireNuevo, salamandraNueva, alcanceDelAire,
  alcanceDeLaSalamandra, canoDeSalida, dimensionarSolar, materialesDeEquipos, completarEquipos,
} from '../motor/equipos.js';
import { LADOS } from '../motor/constantes.js';
import { nombreDePared } from '../motor/geometria.js';
import { ubicarMueble, bajoElEntrepiso } from '../motor/interiores.js';

const pesos = (n) => n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
const n1 = (n) => n.toLocaleString('es-AR', { maximumFractionDigits: 1 });
const NIVELES = [['piso', 'Planta baja'], ['piso2', 'Entrepiso']];

function CampoNombre({ valor, onCambio }) {
  return (
    <div className="group">
      <label>Nombre<input type="text" maxLength={40} value={valor} onChange={(e) => onCambio(e.target.value)} /></label>
    </div>
  );
}

export default function PanelEquipos({ params, estructura, unidad, cambiar }) {
  const eq = completarEquipos(params.equipos);
  const { materiales, total } = materialesDeEquipos(params, estructura);
  const solar = dimensionarSolar(eq.solar, estructura);
  const quitar = (lista, id) => cambiar(`equipos.${lista}`)(eq[lista].filter((x) => x.id !== id));
  const cambiarPrecio = (nombre) => (v) => cambiar('equipos.precios')({ ...eq.precios, [nombre]: v });
  return (
    <Tarjeta id="equipos" titulo="Equipos: aires, salamandra y solar">
      <h4 className="subtitulo-pared">Aires acondicionados</h4>
      <p className="nota">El split va adentro, en la pared; la condensadora, afuera en la misma pared (sobre su ménsula). Se calcula ≈ 50
        frigorías por m³ (más con sol de la tarde o mucho vidrio: subí el factor).</p>
      {eq.aires.map((a, i) => {
        const ruta = `equipos.aires.${i}`;
        const r = alcanceDelAire(a, params, estructura);
        return (
          <FichaPlegable key={a.id} clave={`aire:${a.id}`} className="rubro"
            encabezado={<><strong>{a.nombre}</strong><small className={r.alcanza ? '' : 'falta'}>{a.frigorias.toLocaleString('es-AR')} frig · {r.alcanza ? 'alcanza ✓' : '⚠ no alcanza'}</small></>}
            acciones={<button type="button" className="btn-del" onClick={() => quitar('aires', a.id)} aria-label={`Quitar ${a.nombre}`} title="Quitar">✕</button>}>
            <div className="grid-params">
              <CampoNombre valor={a.nombre} onCambio={cambiar(`${ruta}.nombre`)} />
              <CampoSelect etiqueta="Frigorías" valor={String(a.frigorias)} opciones={FRIGORIAS_COMERCIALES.map((f) => [String(f), f.toLocaleString('es-AR')])}
                onCambio={(v) => cambiar(`${ruta}.frigorias`)(Number(v))} />
              <CampoNumero etiqueta="Ambiente (m², 0 = toda la planta)" decimales={1} valor={a.ambienteM2} onCambio={cambiar(`${ruta}.ambienteM2`)} />
              <CampoNumero etiqueta="Factor (1 normal, 1,3 sol de tarde)" decimales={2} valor={a.factor} onCambio={cambiar(`${ruta}.factor`)} />
              <CampoSelect etiqueta="Pared" valor={a.lado} opciones={LADOS.map((l) => [l, nombreDePared(l, params)])} onCambio={cambiar(`${ruta}.lado`)} />
              <CampoSelect etiqueta="Piso" valor={a.nivel} opciones={NIVELES} onCambio={cambiar(`${ruta}.nivel`)} />
              <CampoNumero etiqueta="Desde la esquina izquierda (vista desde afuera)" unidad={unidad} valor={a.distancia} onCambio={cambiar(`${ruta}.distancia`)} />
              <CampoNumero etiqueta="Altura del split" unidad={unidad} valor={a.altura} onCambio={cambiar(`${ruta}.altura`)} />
              <CampoNumero etiqueta="Caño hasta la condensadora" unidad={unidad} valor={a.distanciaCondensadora} onCambio={cambiar(`${ruta}.distanciaCondensadora`)} />
            </div>
            <p className={r.alcanza ? 'nota' : 'falta'} role="status">{r.texto}</p>
          </FichaPlegable>
        );
      })}
      <button type="button" className="btn-sec" onClick={() => cambiar('equipos.aires')([...eq.aires, aireNuevo(eq.aires)])}>+ Aire</button>

      <h4 className="subtitulo-pared">Salamandra (estufa)</h4>
      {eq.salamandras.map((s, i) => {
        const ruta = `equipos.salamandras.${i}`;
        const r = alcanceDeLaSalamandra(s, params, estructura);
        const c = canoDeSalida(s, params, estructura);
        // ¿El caño que sube derecho al techo atraviesa el entrepiso? (la salamandra quedó debajo)
        const atraviesa = s.nivel === 'piso' && s.salida === 'techo' && bajoElEntrepiso(params, ubicarMueble(params, { ...s, ancho: 0.5, profundidad: 0.5,
          nivel: 'piso', distanciaLateral: s.desdeLateral, distanciaFrente: s.desdeFrente, desdeLateral: 'izquierdo', desdeFrente: 'frente', giro: 0, elevacion: 0 }).centro);
        return (
          <FichaPlegable key={s.id} clave={`salamandra:${s.id}`} className="rubro"
            encabezado={<><strong>{s.nombre}</strong><small className={atraviesa ? 'falta' : ''}>{s.kcal.toLocaleString('es-AR')} kcal/h · caño {s.diametro}" de {n1(c.metros)} m{atraviesa ? ' · ⚠ atraviesa el entrepiso' : ''}</small></>}
            acciones={<button type="button" className="btn-del" onClick={() => quitar('salamandras', s.id)} aria-label={`Quitar ${s.nombre}`} title="Quitar">✕</button>}>
            <div className="grid-params">
              <CampoNombre valor={s.nombre} onCambio={cambiar(`${ruta}.nombre`)} />
              <CampoSelect etiqueta="Calor" valor={String(s.kcal)} opciones={KCAL_SALAMANDRA.map((k) => [String(k), `${k.toLocaleString('es-AR')} kcal/h`])}
                onCambio={(v) => cambiar(`${ruta}.kcal`)(Number(v))} />
              <CampoSelect etiqueta="Piso" valor={s.nivel} opciones={NIVELES} onCambio={cambiar(`${ruta}.nivel`)} />
              <CampoNumero etiqueta="Desde el lateral izquierdo" unidad={unidad} valor={s.desdeLateral} onCambio={cambiar(`${ruta}.desdeLateral`)} />
              <CampoNumero etiqueta="Desde el frente" unidad={unidad} valor={s.desdeFrente} onCambio={cambiar(`${ruta}.desdeFrente`)} />
              <CampoSelect etiqueta="Caño" valor={s.diametro} opciones={DIAMETROS_CANO} onCambio={cambiar(`${ruta}.diametro`)} />
              <CampoSelect etiqueta="Sale" valor={s.salida} opciones={SALIDAS_CANO} onCambio={cambiar(`${ruta}.salida`)} />
              <CampoNumero etiqueta="Sobre el techo" unidad={unidad} valor={s.sobreTecho} onCambio={cambiar(`${ruta}.sobreTecho`)} />
            </div>
            {atraviesa && <p className="falta">⚠ Está debajo del entrepiso: el caño lo atraviesa. Movela, sacá el caño por la pared o dejá un pasaje aislado en el entrepiso.</p>}
            <p className="nota" role="status">{r.texto} Caño de salida: {n1(c.metros)} m{c.codos ? `, ${c.codos} codos` : ''}, sombrerete y
              {s.salida === 'techo' ? ' babeta' : ' pasamuro'}. Dejá 1 m libre alrededor y una placa ignífuga abajo.</p>
          </FichaPlegable>
        );
      })}
      <button type="button" className="btn-sec" onClick={() => cambiar('equipos.salamandras')([...eq.salamandras, salamandraNueva(eq.salamandras)])}>+ Salamandra</button>

      <h4 className="subtitulo-pared">Paneles solares y termotanque solar</h4>
      <label className="casilla-opcional">
        <input type="checkbox" checked={eq.solar.activo} onChange={(e) => cambiar('equipos.solar.activo')(e.target.checked)} />
        Va con energía solar
      </label>
      {eq.solar.activo && (<>
        <div className="grid-params">
          <CampoNumero etiqueta="Consumo por mes" sufijo="kWh" decimales={0} valor={eq.solar.consumoMensual} onCambio={cambiar('equipos.solar.consumoMensual')} />
          <CampoNumero etiqueta="Horas de sol pico" decimales={1} valor={eq.solar.horasSolPico} onCambio={cambiar('equipos.solar.horasSolPico')} />
          <CampoNumero etiqueta={`Paneles (0 = los que pide el consumo: ${solar.sugeridos})`} decimales={0} valor={eq.solar.paneles}
            onCambio={(v) => (Number.isInteger(v) ? cambiar('equipos.solar.paneles')(v) : 'Un número entero')} />
          <CampoNumero etiqueta="Termotanque solar (litros, 0 = no)" decimales={0} valor={eq.solar.termotanque} onCambio={cambiar('equipos.solar.termotanque')} />
        </div>
        <p className="nota" role="status">{solar.paneles} paneles de {PANEL_SOLAR.potencia} W ({n1(solar.potenciaKw)} kW): ≈ {n1(solar.generacionMensual)} kWh por mes ·
          ocupan {n1(solar.superficie)} m² de {n1(solar.techo)} m² de techo · pesan {Math.round(solar.kgPaneles)} kg{solar.kgTermo ? ` + el termotanque lleno ${Math.round(solar.kgTermo)} kg` : ''}
          {' '}(≈ {n1(solar.cargaZona)} kg/m² donde apoyan). Mejor mirando al norte, con la inclinación de la latitud.</p>
        {solar.avisos.map((a) => <p key={a} className="falta">⚠ {a}</p>)}
      </>)}

      {materiales.length > 0 && (<>
        <h4 className="subtitulo-pared">Lo que hay que comprar</h4>
        <table className="tabla-segmentos tabla-materiales-instalacion">
          <thead><tr><th>Material</th><th className="num">Cantidad</th><th className="num">Precio</th><th className="num">Total</th></tr></thead>
          <tbody>
            {materiales.map((m) => (
              <tr key={m.nombre}>
                <td>{m.nombre}</td><td className="num">{m.cantidad} {m.unidad}</td>
                <td className="num"><CampoNumero etiqueta="" sufijo="$" decimales={0} valor={m.precio} onCambio={cambiarPrecio(m.nombre)} /></td>
                <td className="num">{pesos(m.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="nota resumen-mesada">Total: <strong>{pesos(total)}</strong> (va al presupuesto). Cargá el precio de cada equipo.</p>
      </>)}
    </Tarjeta>
  );
}
