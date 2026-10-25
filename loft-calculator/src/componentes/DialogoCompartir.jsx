// ==========================================================
// DialogoCompartir (v1.30): links cortos para ver y para editar
// ----------------------------------------------------------
// Con la nube configurada (Firebase), "Compartir" sube el proyecto y da dos
// links cortos:
//   Ver     para el cliente: abre el proyecto, no puede guardar en el link.
//   Editar  para vos o el herrero: abre y, con "Guardar", guarda en el link.
// Sin nube, queda el link de siempre (el proyecto adentro del link).
// ==========================================================

import { useEffect, useRef, useState } from 'react';

/** Un link con su botón "Copiar". */
function FilaLink({ titulo, ayuda, link }) {
  const [copiado, setCopiado] = useState(false);
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
    } catch {
      setCopiado(false); // sin permiso: queda el texto seleccionable
    }
  };
  return (
    <div className="fila-link">
      <label>{titulo} <small>{ayuda}</small></label>
      <div className="link-y-boton">
        <input type="text" readOnly value={link} onFocus={(e) => e.target.select()} aria-label={titulo} />
        <button type="button" className="btn-sec" onClick={copiar}>{copiado ? '✓ Copiado' : 'Copiar'}</button>
      </div>
    </div>
  );
}

/**
 * @param links       { ver, editar|null } si el proyecto ya está en la nube; null si no
 * @param soloVer     true si se abrió con un link de ver (no se puede guardar en ese link)
 * @param onCrear     sube el proyecto y crea los links (async)
 * @param onLinkLargo copia el link de siempre (sin nube)
 */
export default function DialogoCompartir({ links, soloVer, disponible, onCrear, onLinkLargo, onCerrar }) {
  const ventanaRef = useRef(null);
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState(null);
  useEffect(() => {
    const ventana = ventanaRef.current;
    if (ventana && !ventana.open) ventana.showModal();
  }, []);

  const crear = async () => {
    setCreando(true);
    setError(null);
    try {
      await onCrear();
    } catch (e) {
      setError(e.message);
    }
    setCreando(false);
  };

  return (
    <dialog ref={ventanaRef} className="dialogo dialogo-compartir no-print" aria-labelledby="compartir-titulo"
      onCancel={(e) => { e.preventDefault(); onCerrar(); }}
      onClick={(e) => e.target === ventanaRef.current && onCerrar()}>
      <h2 id="compartir-titulo">Compartir el proyecto</h2>
      {!disponible && (
        <p className="nota">Los links cortos todavía no están configurados (falta la base de datos). Mientras tanto, el link lleva el proyecto adentro.</p>
      )}
      {disponible && links?.editar && (
        <>
          <p className="nota">Cada vez que toques <strong>Guardar</strong>, los cambios quedan en el link: quien lo abra ve la última versión.</p>
          <FilaLink titulo="Para ver" ayuda="(mandáselo al cliente: no puede cambiar nada)" link={links.ver} />
          <FilaLink titulo="Para editar" ayuda="(solo para vos o el herrero: guarda cambios)" link={links.editar} />
        </>
      )}
      {disponible && !links?.editar && (
        <>
          <p className="nota">
            {soloVer
              ? 'Abriste este proyecto con un link para ver: tus cambios no se guardan en ese link. Podés crear un link nuevo, tuyo, con tus cambios.'
              : 'Se sube una copia a la nube y te da dos links cortos: uno para ver y otro para editar.'}
          </p>
          {soloVer && links?.ver && <FilaLink titulo="Link para ver (el que abriste)" ayuda="" link={links.ver} />}
          <button type="button" className="btn-print" onClick={crear} disabled={creando}>
            {creando ? 'Creando…' : soloVer ? 'Crear un link nuevo con mis cambios' : 'Crear links cortos'}
          </button>
        </>
      )}
      {error && <p className="error" role="alert">{error}</p>}
      <div className="dialogo-botones">
        <button type="button" className="btn-sec" onClick={onLinkLargo} title="El proyecto va adentro del link (no hace falta internet para guardarlo, pero no se actualiza)">
          Copiar link sin nube
        </button>
        <button type="button" className="btn-sec" onClick={onCerrar} autoFocus>Cerrar</button>
      </div>
    </dialog>
  );
}
