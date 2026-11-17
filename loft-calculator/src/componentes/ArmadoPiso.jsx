// ==========================================================
// ArmadoPiso (v1.68): cómo se arma un piso (planta baja o piso 2)
// ----------------------------------------------------------
// Pedido de Leandro: "en pisos quiero seleccionar en cada uno qué queda
// entero, si tirantes o transversales. No lo veo sencillo, creo que hay
// redundancia". Antes había una lista con 3 opciones mezcladas, la altura
// aparte y lo mismo repetido en Materiales → Uniones. Ahora, por piso:
//   1. ¿Cómo se cruzan? en el mismo plano (soldados) o tirantes apoyados.
//   2. Si van en el mismo plano: qué queda entero y a qué altura.
//   3. Borde y tirantes: cuál queda entero.
// Los datos siguen en params.uniones (motor/uniones.js); solo cambia la pantalla.
// ==========================================================

import CampoSelect from './CampoSelect.jsx';
import { completarUniones } from '../motor/uniones.js';

/**
 * @param nivel        'piso' (planta baja) o 'piso2'
 * @param uniones      params.uniones
 * @param transversales ¿el piso lleva transversales?
 * @param cambiar      cambiar(ruta) de App
 */
export default function ArmadoPiso({ nivel, uniones, transversales = true, cambiar }) {
  const u = completarUniones(uniones);
  const par = nivel === 'piso2' ? 'tirantesTransversales2' : 'tirantesTransversales';
  const parBordes = nivel === 'piso2' ? 'bordesTirantes2' : 'bordesTirantes';
  const forma = u.enteras[par]; // 'tirantes' | 'transversales' | 'apoyados'
  const apoyados = forma === 'apoyados';
  const enRed = u.modo === 'red';
  // Al pasar de "apoyados" a "mismo plano" arrancan enteros los tirantes (lo de fábrica).
  const cambiarCruce = (v) => cambiar(`uniones.enteras.${par}`)(v === 'apoyados' ? 'apoyados' : 'tirantes');
  return (
    <div className="armado-piso">
      <div className="grid-params grid-uniones">
        {transversales && (
          <CampoSelect etiqueta="Tirantes y transversales" valor={apoyados ? 'apoyados' : 'plano'} onCambio={cambiarCruce}
            opciones={[['plano', 'En el mismo plano (soldados)'], ['apoyados', 'Tirantes apoyados sobre los transversales']]} />
        )}
        {transversales && !apoyados && enRed && (
          <CampoSelect etiqueta="Queda entero" valor={forma} onCambio={cambiar(`uniones.enteras.${par}`)}
            opciones={[['tirantes', 'El tirante (transversales entre tirantes)'], ['transversales', 'El transversal (tirantes cortados)']]} />
        )}
        {transversales && !apoyados && (
          <CampoSelect etiqueta="Altura" valor={u.ras[nivel]} onCambio={(v) => cambiar('uniones.ras')({ ...u.ras, [nivel]: v })}
            opciones={[['ras', 'Arriba al ras del borde'], ['eje', 'Eje con eje (centrados)']]} />
        )}
        {enRed && !(transversales && apoyados) && (
          <CampoSelect etiqueta="Borde y tirantes" valor={u.enteras[parBordes]} onCambio={cambiar(`uniones.enteras.${parBordes}`)}
            opciones={[['bordes', 'El borde entero (tirantes entre los bordes)'], ['tirantes', 'Los tirantes enteros (borde cortado)']]} />
        )}
      </div>
      {!enRed && <p className="nota">Con "eje a eje" (Materiales → Uniones) nada se corta: cada pieza va de eje a eje.</p>}
      {transversales && apoyados && <p className="nota">Los tirantes van enteros encima de los transversales (no se cruzan con el borde).</p>}
    </div>
  );
}
