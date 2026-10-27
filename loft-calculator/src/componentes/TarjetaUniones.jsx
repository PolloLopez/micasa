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

/**
 * @param uniones   params.uniones ({ modo: 'red'|'eje', luz en m })
 * @param resultado estructura.uniones ({ metrosDescontados, cortes })
 * @param cambiar   cambiar(ruta) de App (valida y guarda)
 */
export default function TarjetaUniones({ uniones, resultado, cambiar }) {
  const enRed = uniones.modo === 'red';
  return (
    <Tarjeta id="uniones" titulo="Uniones (cómo se cruzan los hierros)">
      <div className="grid-params">
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
          mitad del perfil entero en cada punta (más la luz, si cargaste). Queda así:
        </p>
        <ul className="jerarquia-uniones">
          <li><strong>Paredes:</strong> soleras y marcos de piso (los lados largos enteros) › columnas y jambas › dinteles y alféizares › montantes › fajas y travesaños.</li>
          <li><strong>Pisos:</strong> bordes (los largos enteros) › tirantes › transversales.</li>
          <li><strong>Igual que antes:</strong> techo (las correas van apoyadas sobre las vigas), riostras y escalera.</li>
        </ul>
        <p className="nota">
          Se descuenta la medida del perfil que queda en el plano de la red: el ala de un perfil C o U, el lado de un
          caño cuadrado y el ancho (el segundo número) de un caño rectangular.
        </p>
        {resultado?.modo === 'red' && (
          <p className="resultado-uniones">
            Se descontaron <strong>{resultado.metrosDescontados.toLocaleString('es-AR')} m</strong> de hierro en {resultado.cortes} tramos.
          </p>
        )}
      </>) : (
        <p className="nota">Cada pieza se mide de eje a eje y se cruzan una encima de la otra (sin descuentos).</p>
      )}
    </Tarjeta>
  );
}
