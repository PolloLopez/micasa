// ==========================================================
// MisProyectos: ventana con la lista de proyectos guardados en este
// navegador. Abrir, duplicar, renombrar y borrar; además crear uno
// nuevo, cargar el ejemplo y trabajar con archivos (.json).
// Toda la lógica está en proyecto/biblioteca.js; acá solo se muestra.
// ==========================================================

import { useEffect, useRef } from 'react';
import { ordenarPorFecha } from '../proyecto/biblioteca.js';

const fechaCorta = (iso) =>
  new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

/** Resumen de una entrada: medidas y cantidad de aberturas. */
function resumen(entrada) {
  const p = entrada.datos?.params;
  if (!p) return '';
  // Grada: filas x largo. Construcción: planta y aberturas.
  if (p.tipoProyecto === 'grada' && p.grada) return `Grada · ${p.grada.filas} filas de ${Number(p.grada.largoFila).toFixed(2)} m`;
  if (p.tipoProyecto === 'montaje' && p.montaje) {
    const nombres = p.montaje.componentes.map((c) => c.nombre).filter(Boolean);
    return `Montaje · ${nombres.length ? nombres.join(', ') : 'sin componentes'}`;
  }
  const aberturas = entrada.datos.aberturas?.length ?? 0;
  return `${Number(p.largo).toFixed(2)} x ${Number(p.ancho).toFixed(2)} m · ${aberturas} abertura${aberturas === 1 ? '' : 's'}`;
}

export default function MisProyectos({
  biblioteca, idActual, onCerrar, onAbrir, onDuplicar, onRenombrar, onBorrar,
  onNuevo, onEjemplo, onNuevaGrada, onEjemploGrada, onNuevoMontaje, onEjemploMontaje, onAbrirArchivo, onDescargarArchivo, onExportarRespaldo, onImportarRespaldo,
}) {
  const ventanaRef = useRef(null);
  const archivoRef = useRef(null);
  const respaldoRef = useRef(null);

  // Escape cierra; el foco arranca dentro de la ventana (accesibilidad).
  useEffect(() => {
    ventanaRef.current?.focus();
    const alTeclear = (e) => e.key === 'Escape' && onCerrar();
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [onCerrar]);

  const renombrar = (entrada) => {
    const nombre = window.prompt('Nuevo nombre del proyecto:', entrada.nombre);
    if (nombre !== null) onRenombrar(entrada.id, nombre);
  };
  const borrar = (entrada) => {
    if (window.confirm(`¿Borrar "${entrada.nombre}" de Mis proyectos? No se puede deshacer.`)) onBorrar(entrada.id);
  };

  // Lee el archivo elegido y se lo pasa al manejador como texto.
  const leerArchivo = (manejador) => async (e) => {
    const archivo = e.target.files?.[0];
    e.target.value = ''; // permite volver a elegir el mismo archivo
    if (archivo) manejador(await archivo.text());
  };

  return (
    <div className="fondo-modal no-print" onClick={onCerrar}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="Mis proyectos" tabIndex={-1}
        ref={ventanaRef} onClick={(e) => e.stopPropagation()}>
        <div className="modal-titulo">
          <h2>Mis proyectos ({biblioteca.length})</h2>
          <button className="btn-ctrl" onClick={onCerrar} aria-label="Cerrar">✕</button>
        </div>

        <div className="modal-acciones">
          <button className="btn-sec" onClick={onNuevo}>+ Proyecto nuevo</button>
          <button className="btn-sec" onClick={onEjemplo}>Cargar ejemplo (loft)</button>
          <button className="btn-sec" onClick={onNuevaGrada}>+ Grada nueva</button>
          <button className="btn-sec" onClick={onEjemploGrada}>Ejemplo: grada</button>
          <button className="btn-sec" onClick={onNuevoMontaje}>+ Montaje nuevo</button>
          <button className="btn-sec" onClick={onEjemploMontaje}>Ejemplo: montaje</button>
        </div>

        {biblioteca.length === 0 ? (
          <p className="nota">
            Todavía no guardaste proyectos. Usá <strong>Guardar como…</strong> arriba para guardar el que estás editando.
          </p>
        ) : (
          <ul className="lista-proyectos">
            {ordenarPorFecha(biblioteca).map((entrada) => (
              <li key={entrada.id} className={entrada.id === idActual ? 'actual' : ''}>
                <div className="proyecto-info">
                  <strong>{entrada.nombre}</strong>
                  {entrada.id === idActual && <span className="etiqueta">abierto</span>}
                  <small className="detalle">Guardado {fechaCorta(entrada.guardado)} · {resumen(entrada)}</small>
                </div>
                <div className="proyecto-botones">
                  <button className="btn-print" onClick={() => onAbrir(entrada)}>Abrir</button>
                  <button className="btn-sec" onClick={() => onDuplicar(entrada.id)}>Duplicar</button>
                  <button className="btn-sec" onClick={() => renombrar(entrada)}>Renombrar</button>
                  <button className="btn-del" onClick={() => borrar(entrada)} aria-label={`Borrar ${entrada.nombre}`}>✕</button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <details className="modal-archivos">
          <summary>Archivos y respaldo</summary>
          <p className="nota">
            Los proyectos quedan guardados en <strong>este navegador</strong>. Para pasar un proyecto a otra persona
            (o a otra compu) descargalo como archivo. Hacé un respaldo de vez en cuando: si se borran los datos del
            navegador, la lista se pierde.
          </p>
          <div className="modal-acciones">
            <button className="btn-sec" onClick={onDescargarArchivo}>Descargar el proyecto abierto (.json)</button>
            <button className="btn-sec" onClick={() => archivoRef.current.click()}>Abrir un archivo .json…</button>
            <input ref={archivoRef} type="file" accept=".json,application/json" hidden onChange={leerArchivo(onAbrirArchivo)} />
          </div>
          <div className="modal-acciones">
            <button className="btn-sec" onClick={onExportarRespaldo} disabled={biblioteca.length === 0}>Exportar respaldo de todos</button>
            <button className="btn-sec" onClick={() => respaldoRef.current.click()}>Importar respaldo…</button>
            <input ref={respaldoRef} type="file" accept=".json,application/json" hidden onChange={leerArchivo(onImportarRespaldo)} />
          </div>
        </details>
      </div>
    </div>
  );
}
