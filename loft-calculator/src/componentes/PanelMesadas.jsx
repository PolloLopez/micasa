// ==========================================================
// PanelMesadas (v1.38): mesadas con estructura y revestimiento
// ----------------------------------------------------------
// Cada mesada va contra una pared, medida como las aberturas: desde la
// esquina izquierda o derecha MIRANDO LA PARED DESDE AFUERA. Se elige el
// perfil (de la lista de perfiles), el revestimiento (de la lista de
// revestimientos) y se cargan los huecos bajo mesada (heladera,
// lavarropas…). Las cuentas están en motor/interiores.js; cada cambio se
// valida en App (cambiar), igual que el resto.
// ==========================================================

import { useId, useState } from 'react';
import Tarjeta from './Tarjeta.jsx';
import CampoNumero from './CampoNumero.jsx';
import CampoSelect from './CampoSelect.jsx';
import SelectorPerfil from './SelectorPerfil.jsx';
import SelectorColor from './SelectorColor.jsx';
import { LADOS } from '../motor/constantes.js';
import { nombreLado, largoLado } from '../motor/geometria.js';
import { mesadaNueva, tramosDeMesada, FORMAS_MESADA, NOMBRE_TRAMO, ELECTROS_HUECO, TAPA_SEGUN_ELECTRO, HUECO_NUEVO, BACHA_NUEVA, ajustarMesada, limitesDeMesada, tabiquesQueCruzaLaMesada } from '../motor/interiores.js';

const f2 = (n) => n.toFixed(2).replace('.', ',');

/** Texto libre (nombre de la mesada o del hueco). */
function CampoTexto({ etiqueta, valor, onCambio, maximo = 40 }) {
  const id = useId();
  return (
    <div className="group">
      <label htmlFor={id}>{etiqueta}</label>
      <input id={id} type="text" value={valor} maxLength={maximo} onChange={(e) => onCambio(e.target.value)} />
    </div>
  );
}

/** Casilla con texto (costados revestidos). */
function Casilla({ texto, valor, onCambio }) {
  return (
    <label className="casilla-opcional">
      <input type="checkbox" checked={valor} onChange={(e) => onCambio(e.target.checked)} /> {texto}
    </label>
  );
}

/** Una mesada: forma, dónde va, medidas, estructura, revestimiento, huecos y bachas. */
function Mesada({ m, i, params, unidad, cambiar, onQuitar, paneles, perfiles, perfilGeneral, generada, colores }) {
  const ruta = `mesadas.${i}`;
  const medida = (campo, etiqueta) => (
    <CampoNumero etiqueta={etiqueta} unidad={unidad} valor={m[campo]} onCambio={cambiar(`${ruta}.${campo}`)} />
  );
  const conEntrepiso = params.anchoEntrepiso > 0;
  const largoPared = largoLado(m.lado, params);
  const forma = m.forma ?? 'recta';
  // v1.40: los tramos (principal y los que siguen por las paredes de al lado), con su largo.
  const tramos = tramosDeMesada(params, { ...m, forma });
  const largoDe = (clave) => tramos.find((t) => t.clave === clave)?.largo ?? 0;
  const opcionesTramo = tramos.map((t) => [t.clave, `Tramo ${NOMBRE_TRAMO[t.clave]}`]);

  // Hueco o bacha nuevos: a continuación del último del tramo principal (o lo que entre).
  const siguiente = (lista, ancho) => {
    const fin = Math.max(0, ...lista.filter((x) => (x.tramo ?? 'principal') === 'principal').map((x) => x.desde + x.ancho));
    return Math.max(0, Math.min(fin, largoDe('principal') - ancho));
  };
  const agregarHueco = () => {
    const ancho = Math.min(0.6, largoDe('principal'));
    return cambiar(`${ruta}.huecos`)([...m.huecos, { ...HUECO_NUEVO, desde: siguiente(m.huecos, ancho), ancho, nombre: `Hueco ${m.huecos.length + 1}` }]);
  };
  const agregarBacha = () => cambiar(`${ruta}.bachas`)([...(m.bachas ?? []), { ...BACHA_NUEVA, desde: siguiente(m.bachas ?? [], BACHA_NUEVA.ancho) }]);
  const quitar = (lista, k) => cambiar(`${ruta}.${lista}`)(m[lista].filter((_, j) => j !== k));
  // Al elegir lo que va en el hueco, la tapa arranca como corresponde (cocina y heladera sin tapa, lavarropas con tapa).
  const elegirElectro = (k, electro) => cambiar(`${ruta}.huecos.${k}`)({ ...m.huecos[k], electro, tapa: TAPA_SEGUN_ELECTRO[electro] });

  // v1.41.1: hasta dónde puede llegar cada punta (esquinas y tabiques) y si atraviesa algún tabique.
  const limites = limitesDeMesada(params, m);
  const [avisoLimite, setAvisoLimite] = useState(null); // si el ajuste no se puede guardar, se dice por qué
  const cruza = tabiquesQueCruzaLaMesada(params, m);
  const metros = generada ? generada.piezas.reduce((acc, p) => acc + p.largo, 0) : 0;
  const m2Placa = generada ? generada.panos.reduce((acc, p) => acc + p.neto, 0) : 0;
  const altos = (generada?.electros ?? []).filter((el) => el.pasaDeAlto > 0.001);

  return (
    <section className="elemento-terreno mesada">
      <header>
        <strong>{m.nombre}</strong>
        <small>{nombreLado(m.lado, params.ladoFrente)} · {FORMAS_MESADA.find(([f]) => f === forma)[1].split(' (')[0]} · {f2(largoDe('principal'))} x {f2(m.profundidad)} m</small>
        <button type="button" className="btn-del" onClick={onQuitar} aria-label={`Quitar ${m.nombre}`} title="Quitar">✕</button>
      </header>
      {/* v1.38.1: el nombre es el cartel del 3D (como paredes y aberturas); se puede sacar uno por uno. */}
      <div className="etiqueta-pared">
        <label className="capa">
          <input type="checkbox" checked={m.mostrarEtiqueta !== false}
            aria-label={`Mostrar la etiqueta de ${m.nombre || 'la mesada'} en el 3D`}
            onChange={(e) => cambiar(`${ruta}.mostrarEtiqueta`)(e.target.checked)} />
          Etiqueta en el 3D
        </label>
        <input type="text" className="perfil" maxLength={40} value={m.nombre} aria-label="Nombre"
          onChange={(e) => cambiar(`${ruta}.nombre`)(e.target.value)} />
      </div>
      <div className="grid-params">
        <CampoSelect etiqueta="Forma" valor={forma} opciones={FORMAS_MESADA} onCambio={cambiar(`${ruta}.forma`)} />
        <CampoSelect etiqueta="Contra la pared" valor={m.lado}
          opciones={LADOS.map((l) => [l, `${nombreLado(l, params.ladoFrente)} (${l})`])} onCambio={cambiar(`${ruta}.lado`)} />
        {conEntrepiso && (
          <CampoSelect etiqueta="Nivel" valor={m.nivel} opciones={[['piso', 'Planta baja'], ['piso2', 'Piso 2 (entrepiso)']]}
            onCambio={cambiar(`${ruta}.nivel`)} />
        )}
        {/* v1.40.1: en todas las formas se ubica desde una esquina y con el largo que quieras (el límite puede ser un tabique). */}
        <CampoSelect etiqueta="Medida desde la esquina" valor={m.ladoReferencia}
          opciones={[['izquierda', 'Izquierda (vista desde afuera)'], ['derecha', 'Derecha (vista desde afuera)']]}
          onCambio={cambiar(`${ruta}.ladoReferencia`)} />
        {medida('desde', 'Distancia a la esquina')}
        {medida('largo', forma === 'recta' ? 'Largo' : 'Largo del tramo principal')}
        {(forma === 'L-izquierda' || forma === 'U') && medida('largoIzquierdo', 'Tramo de la izquierda')}
        {(forma === 'L-derecha' || forma === 'U') && medida('largoDerecho', 'Tramo de la derecha')}
        {medida('profundidad', 'Profundidad')}
        {medida('alto', 'Alto (con la tapa)')}
        {medida('espesorTapa', 'Espesor de la tapa')}
      </div>
      <p className="nota">
        La pared mide {f2(largoPared)} m: quedan {f2(Math.max(0, largoPared - m.desde - m.largo))} m del otro lado.
        {forma !== 'recta' && ' Los tramos que siguen salen derechos desde las puntas y se miden desde la cara de adentro de la pared principal (con la esquina).'}
      </p>
      {/* v1.41.1: llevar las puntas hasta lo que la limita: la esquina o la cara de un tabique de esa pared. */}
      <div className="fila-casillas">
        {limites.izquierda && (
          <button type="button" className="btn-mini" onClick={() => setAvisoLimite(cambiar(ruta)(ajustarMesada(params, m, 'izquierda')))}
            title="La punta izquierda (vista de adentro) hasta ahí; la otra queda donde está">⇤ Hasta {limites.izquierda.nombre}</button>
        )}
        {limites.izquierda && limites.derecha && (
          <button type="button" className="btn-mini" onClick={() => setAvisoLimite(cambiar(ruta)(ajustarMesada(params, m, 'ambas')))}
            title="Ocupa todo el espacio entre los dos límites">↔ Entre {limites.derecha.nombre} y {limites.izquierda.nombre}</button>
        )}
        {limites.derecha && (
          <button type="button" className="btn-mini" onClick={() => setAvisoLimite(cambiar(ruta)(ajustarMesada(params, m, 'derecha')))}
            title="La punta derecha (vista de adentro) hasta ahí; la otra queda donde está">Hasta {limites.derecha.nombre} ⇥</button>
        )}
      </div>
      {avisoLimite && <p className="error" role="alert">{avisoLimite}</p>}
      {cruza.length > 0 && (
        <p className="aviso-mueble" role="status">⚠ La mesada atraviesa {cruza.join(' y ')}: usá los botones de arriba para que termine contra el tabique.</p>
      )}

      <h4 className="subtitulo-pared">Estructura y revestimiento</h4>
      <div className="grid-params">
        <SelectorPerfil etiqueta="Perfil" valor={m.perfil} perfiles={perfiles}
          opcionGeneral={`General (${(perfilGeneral || 'sin elegir').replace('Caño estructural ', 'Caño ')})`}
          onElegir={(id) => cambiar(`${ruta}.perfil`)(id ?? '')} />
        {medida('separacionMontantes', 'Montantes cada')}
        <div className="group">
          <label htmlFor={`rev-${m.id}`}>Revestimiento</label>
          <select id={`rev-${m.id}`} value={m.revestimiento} onChange={(e) => cambiar(`${ruta}.revestimiento`)(e.target.value)}>
            <option value="">Sin revestimiento</option>
            {paneles.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </div>
        {/* v1.38.2: colores propios de esta mesada (↺ vuelve al de la capa). */}
        <div className="group campo-color">
          <span className="etiqueta-campo">Color de tapa y estantes</span>
          <span className="fila-colores">
            <SelectorColor valor={m.colorTapa} porDefecto={colores.tapasMesada} nombre={`la tapa de ${m.nombre}`}
              onCambio={cambiar(`${ruta}.colorTapa`)} onRestablecer={() => cambiar(`${ruta}.colorTapa`)('')} />
            <SelectorColor valor={m.colorEstantes} porDefecto={colores.escalones} nombre={`los estantes de ${m.nombre}`}
              onCambio={cambiar(`${ruta}.colorEstantes`)} onRestablecer={() => cambiar(`${ruta}.colorEstantes`)('')} />
          </span>
        </div>
        <CampoNumero etiqueta="Estantes por tramo" decimales={0} valor={m.estantes}
          onCambio={(v) => (Number.isInteger(v) ? cambiar(`${ruta}.estantes`)(v) : 'Un número entero')} />
        {medida('zocalo', 'Alto del zócalo (0 = sin)')}
        {m.zocalo > 0 && medida('retiroZocalo', 'Retiro del zócalo')}
      </div>
      {m.revestimiento && (
        <div className="fila-casillas">
          {/* En L o U, el costado del lado que gira es la punta libre del tramo que sigue. */}
          <Casilla texto="Revestir el costado izquierdo" valor={m.costadoIzquierdo} onCambio={cambiar(`${ruta}.costadoIzquierdo`)} />
          <Casilla texto="Revestir el costado derecho" valor={m.costadoDerecho} onCambio={cambiar(`${ruta}.costadoDerecho`)} />
          {/* v1.40.1: el lomo de un tramo que sigue, si no da contra una pared (península). */}
          {(forma === 'L-izquierda' || forma === 'U') && <Casilla texto="Revestir el lomo del tramo izquierdo" valor={m.fondoIzquierdo === true} onCambio={cambiar(`${ruta}.fondoIzquierdo`)} />}
          {(forma === 'L-derecha' || forma === 'U') && <Casilla texto="Revestir el lomo del tramo derecho" valor={m.fondoDerecho === true} onCambio={cambiar(`${ruta}.fondoDerecho`)} />}
        </div>
      )}

      <h4 className="subtitulo-pared">Huecos bajo mesada</h4>
      <p className="nota">
        Se miden desde la punta izquierda de su tramo, mirándolo de frente. <strong>Con tapa</strong>: la tapa sigue por
        arriba (lavarropas de carga frontal). <strong>Sin tapa</strong>: ahí se corta la mesada (cocina, heladera).
        <strong> Sobre zócalo</strong>: la base sigue por debajo y el electrodoméstico apoya arriba.
      </p>
      {m.huecos.map((h, k) => {
        const rutaH = `${ruta}.huecos.${k}`;
        return (
          <div key={k} className="fila-hueco-v2">
            <div className="grid-params fila-hueco">
              <CampoTexto etiqueta="Hueco" valor={h.nombre ?? ''} onCambio={cambiar(`${rutaH}.nombre`)} />
              {tramos.length > 1 && <CampoSelect etiqueta="Tramo" valor={h.tramo ?? 'principal'} opciones={opcionesTramo} onCambio={cambiar(`${rutaH}.tramo`)} />}
              <CampoNumero etiqueta="Desde la punta izq." unidad={unidad} valor={h.desde} onCambio={cambiar(`${rutaH}.desde`)} />
              <CampoNumero etiqueta="Ancho" unidad={unidad} valor={h.ancho} onCambio={cambiar(`${rutaH}.ancho`)} />
              <CampoSelect etiqueta="Adentro va" valor={h.electro ?? ''} opciones={ELECTROS_HUECO} onCambio={(v) => elegirElectro(k, v)} />
              <button type="button" className="btn-del" onClick={() => quitar('huecos', k)} aria-label={`Quitar ${h.nombre || 'el hueco'}`} title="Quitar">✕</button>
            </div>
            <div className="fila-casillas">
              <Casilla texto="Con tapa arriba" valor={h.tapa !== false} onCambio={cambiar(`${rutaH}.tapa`)} />
              {m.zocalo > 0 && <Casilla texto="Sobre zócalo" valor={h.conZocalo === true} onCambio={cambiar(`${rutaH}.conZocalo`)} />}
              {h.electro === 'lavarropas' && <Casilla texto="Carga frontal" valor={h.cargaFrontal !== false} onCambio={cambiar(`${rutaH}.cargaFrontal`)} />}
            </div>
          </div>
        );
      })}
      <button type="button" className="btn-sec" onClick={agregarHueco}>+ Hueco</button>
      {altos.map((el) => (
        <p key={el.nombre} className="aviso-mueble" role="status">⚠ {el.nombre || 'Un electrodoméstico'} no entra debajo de la tapa: pasa {f2(el.pasaDeAlto)} m (sacale la tapa o el zócalo, o subí la mesada).</p>
      ))}

      <h4 className="subtitulo-pared">Bachas</h4>
      <p className="nota">Cortan la tapa (menos m²) y suman su renglón al presupuesto. Desde la punta izquierda de su tramo.</p>
      {(m.bachas ?? []).map((b, k) => {
        const rutaB = `${ruta}.bachas.${k}`;
        return (
          <div key={k} className="grid-params fila-hueco">
            {tramos.length > 1 && <CampoSelect etiqueta="Tramo" valor={b.tramo ?? 'principal'} opciones={opcionesTramo} onCambio={cambiar(`${rutaB}.tramo`)} />}
            <CampoNumero etiqueta="Desde la punta izq." unidad={unidad} valor={b.desde} onCambio={cambiar(`${rutaB}.desde`)} />
            <CampoNumero etiqueta="Ancho de la bacha" unidad={unidad} valor={b.ancho} onCambio={cambiar(`${rutaB}.ancho`)} />
            <CampoNumero etiqueta="Fondo de la bacha" unidad={unidad} valor={b.profundidad} onCambio={cambiar(`${rutaB}.profundidad`)} />
            <Casilla texto="Doble" valor={b.doble === true}
              onCambio={(doble) => cambiar(rutaB)({ ...b, doble, ancho: doble && b.ancho < 0.7 ? 0.76 : !doble && b.ancho > 0.7 ? 0.52 : b.ancho })} />
            <button type="button" className="btn-del" onClick={() => quitar('bachas', k)} aria-label={`Quitar la bacha ${k + 1}`} title="Quitar">✕</button>
          </div>
        );
      })}
      <button type="button" className="btn-sec" onClick={agregarBacha}>+ Bacha</button>

      {generada && (
        <p className="nota resumen-mesada" role="status">
          {generada.piezas.length} piezas ({f2(metros)} m de perfil) · tapa {f2(generada.tapa.m2)} m²
          {generada.tapa.tramos > 1 ? ` en ${generada.tapa.tramos} piezas` : ''}
          {m2Placa > 0 ? ` · ${f2(m2Placa)} m² de placa` : ''}
          {generada.estantesM2 > 0 ? ` · ${f2(generada.estantesM2)} m² de estantes` : ''}
          {generada.bachas.simples + generada.bachas.dobles > 0 ? ` · ${generada.bachas.simples + generada.bachas.dobles} bacha(s)` : ''}
        </p>
      )}
    </section>
  );
}

/**
 * @param generadas  e.mesadas de la estructura (piezas, paños, tapa) para mostrar el resumen
 * @param perfilGeneral texto del perfil del renglón "Estructura de mesadas" (la opción vacía)
 */
export default function PanelMesadas({ params, unidad, cambiar, paneles, perfiles, perfilGeneral, generadas, colores }) {
  const mesadas = params.mesadas;
  const [aviso, setAviso] = useState(null); // si la mesada nueva no entra (pared corta), se dice por qué
  const agregar = () => {
    const id = Math.max(0, ...mesadas.map((m) => m.id)) + 1;
    setAviso(cambiar('mesadas')([...mesadas, mesadaNueva(mesadas, id)]));
  };
  const quitar = (id) => cambiar('mesadas')(mesadas.filter((m) => m.id !== id));
  return (
    <Tarjeta id="mesadas" titulo={`Mesadas (${mesadas.length})`} resaltar={{ tipo: 'grupo', id: 'mesada', nombre: 'Mesadas' }}>
      <p className="nota">
        Estructura con perfiles de tu lista, revestida al frente y a los costados (Durlock u otro de tus revestimientos),
        con tapa, estantes, huecos bajo mesada y zócalo para el pie. Va al presupuesto y al diagrama de cortes.
      </p>
      {mesadas.length === 0 && <p className="vacio">Todavía no hay mesadas.</p>}
      {mesadas.map((m, i) => (
        <Mesada key={m.id} m={m} i={i} params={params} unidad={unidad} cambiar={cambiar} onQuitar={() => quitar(m.id)}
          paneles={paneles} perfiles={perfiles} perfilGeneral={perfilGeneral} generada={generadas?.find((g) => g.id === m.id)} colores={colores} />
      ))}
      <button type="button" className="btn-sec" onClick={agregar}>+ Mesada</button>
      {aviso && <p className="error" role="alert">{aviso}</p>}
    </Tarjeta>
  );
}
