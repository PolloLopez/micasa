// ==========================================================
// TarjetaUniones (v1.33): cómo se arma la red de hierros
// ----------------------------------------------------------
// En cada cruce una pieza queda entera y la otra se corta contra sus
// caras. Acá se elige si se descuenta (red soldada) o se mide eje a eje
// como antes, y la luz para soldar. La lógica está en motor/uniones.js.
// ==========================================================

import Tarjeta from './Tarjeta.jsx';
import CampoSelect from './CampoSelect.jsx';
import CampoNumero from './CampoNumero.jsx';
import { OPCIONES_PISO } from '../motor/uniones.js';

/**
 * @param uniones   params.uniones ({ modo: 'red'|'eje', luz en m })
 * @param resultado estructura.uniones ({ metrosDescontados, cortes })
 * @param cambiar   cambiar(ruta) de App (valida y guarda)
 */
/** Los pares que se pueden invertir: [clave, etiqueta, [[valor, texto], …]] (el primero es el de fábrica). */
const PARES = [
  ['solerasColumnas', 'Soleras y columnas', [['soleras', 'Soleras enteras, columnas entre ellas'], ['columnas', 'Columnas enteras, soleras cortadas']]],
  ['columnasFajas', 'Columnas y fajas', [['columnas', 'Columnas enteras, fajas en tramos'], ['fajas', 'Fajas enteras, columnas cortadas']]],
  ['montantesFajas', 'Montantes y fajas', [['montantes', 'Montantes enteros, fajas cortadas'], ['fajas', 'Fajas enteras, montantes cortados']]],
  ['bordesTirantes', 'Bordes y tirantes (pisos)', [['bordes', 'Bordes enteros, tirantes entre ellos'], ['tirantes', 'Tirantes enteros, bordes cortados']]],
  ...OPCIONES_PISO,
];

export default function TarjetaUniones({ uniones, resultado, cambiar }) {
  const enRed = uniones.modo === 'red';
  return (
    <Tarjeta id="uniones" titulo="Uniones (cómo se cruzan los hierros)">
      <div className="grid-params grid-uniones">
        <CampoSelect etiqueta="Las piezas que se cruzan" valor={uniones.modo} onCambio={cambiar('uniones.modo')}
          opciones={[['red', 'Se cortan y se sueldan (red)'], ['eje', 'Eje a eje (como antes)']]} />
        {enRed && (
          <CampoNumero etiqueta="Luz para soldar, en cada punta" sufijo="mm" decimales={1} valor={uniones.luz * 1000}
            onCambio={(mm) => cambiar('uniones.luz')(Math.round(mm * 10) / 10000)} />
        )}
      </div>
      {enRed ? (<>
        <p className="nota">
          En cada cruce, una pieza queda <strong>entera</strong> y la otra se corta contra sus caras: se le descuenta la
          mitad del perfil entero en cada punta (más la luz, si cargaste). Elegí cuál queda entera en cada par:
        </p>
        {/* v1.34: en cada par se elige cuál queda entera (por obra). El marco de cada abertura se elige en la abertura. */}
        <div className="grid-params pares-uniones">
          {PARES.map(([par, etiqueta, opciones]) => (
            <CampoSelect key={par} etiqueta={etiqueta} valor={uniones.enteras?.[par] ?? opciones[0][0]}
              opciones={opciones} onCambio={cambiar(`uniones.enteras.${par}`)} />
          ))}
        </div>
        <ul className="jerarquia-uniones">
          <li>Los lados <strong>largos</strong> de soleras, marcos y bordes quedan enteros y llegan a la esquina; los cortos van entre ellos.</li>
          <li>El <strong>marco de cada abertura</strong> (jambas enteras o dintel y alféizar enteros) se elige en la abertura, en Paredes.</li>
          <li><strong>Igual que antes:</strong> techo (las correas van apoyadas sobre las vigas), riostras y escalera.</li>
        </ul>
        <p className="nota">
          Se descuenta la medida del perfil que queda en el plano de la red: el ala de un perfil C o U, el lado de un
          caño cuadrado y el ancho (el segundo número) de un caño rectangular.
        </p>
        {resultado?.modo === 'red' && (
          <p className="resultado-uniones">
            {resultado.metrosDescontados >= 0 ? 'Se descontaron' : 'Se sumaron'} <strong>{Math.abs(resultado.metrosDescontados).toLocaleString('es-AR')} m</strong> de hierro
            respecto de eje a eje ({resultado.cortes} tramos ajustados).
          </p>
        )}
      </>) : (
        <p className="nota">Cada pieza se mide de eje a eje y se cruzan una encima de la otra (sin descuentos).</p>
      )}
    </Tarjeta>
  );
}
