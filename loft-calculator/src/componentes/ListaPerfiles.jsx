// ==========================================================
// Lista de perfiles (v1.21) y selector para elegir uno
// ----------------------------------------------------------
// ListaPerfiles: los hierros que usa el herrero, cada uno con tipo,
// medidas (mm), largo de barra, precio y peso (kg/m calculado).
// Cada uso (Columnas, Zanca…) elige uno con SelectorPerfil.jsx.
// Ver motor/perfiles.js.
// ==========================================================

import { useState } from 'react';
import CampoNumero from './CampoNumero.jsx';
import CampoSelect from './CampoSelect.jsx';
import CampoOpcional from './CampoOpcional.jsx';
import PreciosProveedores from './PreciosProveedores.jsx';
import { TIPOS_PERFIL, LIMITES_PERFIL, nombrePerfil, kgPorMetro, revisarPerfil } from '../motor/perfiles.js';

const pesos = (n) => n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
const OPCIONES_TIPO = Object.entries(TIPOS_PERFIL).map(([valor, { nombre }]) => [valor, nombre]);

/**
 * Un perfil de la lista, editable.
 * Cada cambio se revisa antes de guardarse: si las medidas no tienen sentido, queda el error en el campo.
 */
function FilaPerfil({ perfil, usadoEn, repetido, proveedores, onActualizar, onQuitar, onCambiarPrecio }) {
  const tipo = TIPOS_PERFIL[perfil.tipo];

  /** Cambia un campo si el perfil sigue siendo válido. @returns error o null (para CampoNumero). */
  const cambiar = (campo) => (valor) => {
    const nuevo = { ...perfil, [campo]: valor };
    const error = revisarPerfil(nuevo);
    if (error) return error;
    onActualizar(perfil.id, { [campo]: valor });
    return null;
  };

  const conLimites = ({ min, max }, campo, unidad) => (v) =>
    v < min || v > max ? `Entre ${min} y ${max} ${unidad}` : cambiar(campo)(v);

  /** Al cambiar el tipo se conservan las medidas que sirvan (y la otra ala/ancho arranca igual al lado). */
  const cambiarTipo = (nuevoTipo) => {
    const cambios = { tipo: nuevoTipo };
    if (!(perfil.b > 0)) cambios.b = perfil.a;
    if (nuevoTipo === 'otro' && !perfil.texto) cambios.texto = nombrePerfil(perfil);
    if (perfil.tipo === 'otro' && !(perfil.a > 0)) Object.assign(cambios, { a: 50, b: 50, espesor: 2 });
    onActualizar(perfil.id, cambios);
  };

  const enUso = usadoEn.length > 0;
  // Plegado: una línea con lo importante. Arranca abierto si hay que revisarlo o si es nuevo (sin precio).
  const [abierto, setAbierto] = useState(Boolean(perfil.revisarPrecio) || perfil.sinPrecio || perfil.precio === 0);
  const nombre = nombrePerfil(perfil) || 'Perfil sin nombre';
  return (
    <li className="fila-perfil">
      <button type="button" className="cabecera-perfil" aria-expanded={abierto} onClick={() => setAbierto((v) => !v)}>
        <span className="flecha">{abierto ? '▾' : '▸'}</span>
        <strong>{nombre}</strong>
        <span className="peso-perfil">
          {kgPorMetro(perfil) > 0 ? `≈ ${kgPorMetro(perfil).toFixed(2)} kg/m · ` : ''}barra {perfil.largoBarra} m · {perfil.sinPrecio ? 'sin precio' : pesos(perfil.precio)}
          {perfil.revisarPrecio && ' · ⚠'}
        </span>
      </button>
      <small className="usos-perfil">{enUso ? `Usado en: ${usadoEn.join(', ')}` : 'Sin usar'}</small>
      {repetido && (
        <small className="aviso-precio">⚠ Hay otro perfil igual en la lista{repetido === 'oculto' ? ' (lo usa la grada o el montaje)' : ''}: en los desplegables aparecen los dos.</small>
      )}
      {/* El aviso de precio se ve aunque el perfil esté plegado (al abrir otro proyecto la lista recuerda lo plegado). */}
      {perfil.revisarPrecio && (
        <div className="aviso-precios">
          ⚠ Este perfil tenía precios distintos en distintos renglones: se tomó el más usado, o el más alto si empataban ({pesos(perfil.precio)}).
          Revisá que sea el de tu proveedor.
          <button type="button" className="btn-sec" onClick={() => onActualizar(perfil.id, { revisarPrecio: false })}>
            El precio está bien
          </button>
        </div>
      )}
      {abierto && (<>


      <div className="grid-params">
        <CampoSelect etiqueta="Tipo" valor={perfil.tipo} opciones={OPCIONES_TIPO} onCambio={cambiarTipo} />
        {tipo.medidas.map(([campo, etiqueta, opciones]) => (opciones?.opcional ? (
          // El labio del perfil C: casilla "Con labio" + medida (sin labio = perfil C liso).
          <CampoOpcional key={campo} casilla={`Con ${etiqueta.toLowerCase()}`} etiqueta={etiqueta} sufijo="mm" decimales={2}
            valorPorDefecto={15} valor={perfil[campo] ?? 0} onCambio={cambiar(campo)} />
        ) : (
          <CampoNumero key={campo} etiqueta={etiqueta} sufijo="mm" decimales={2}
            valor={perfil[campo] ?? 0} onCambio={cambiar(campo)} />
        )))}
        {perfil.tipo === 'otro' && (<>
          <div className="group">
            <label htmlFor={`texto-${perfil.id}`}>Descripción</label>
            <input id={`texto-${perfil.id}`} type="text" maxLength={120} value={perfil.texto}
              onChange={(e) => onActualizar(perfil.id, { texto: e.target.value })} placeholder="ej. Hierro torsionado 12 mm" />
          </div>
          <CampoNumero etiqueta="Peso" sufijo="kg/m" decimales={3} valor={perfil.kgm ?? 0}
            onCambio={conLimites(LIMITES_PERFIL.kgm, 'kgm', 'kg/m')} />
        </>)}
        <CampoNumero etiqueta="Largo de barra" sufijo="m" valor={perfil.largoBarra}
          onCambio={conLimites(LIMITES_PERFIL.largoBarra, 'largoBarra', 'm')} />
      </div>
      {/* v1.25: precio por barra en cada proveedor (efectivo y tarjeta). */}
      <PreciosProveedores material={{ ...perfil, nombre }} proveedores={proveedores} unidad="barra"
        onCambiar={(idProveedor, campo, valor) => onCambiarPrecio(perfil.id, idProveedor, campo, valor)} />
      <button type="button" className="btn-sec btn-quitar-perfil" onClick={() => onQuitar(perfil.id)} disabled={enUso}
        title={enUso ? 'Está en uso: primero elegí otro perfil en esas partes' : 'Quitar de la lista'}>
        {enUso ? 'En uso (no se puede quitar)' : `Quitar ${nombre}`}
      </button>
      </>)}
    </li>
  );
}

/**
 * @param perfiles  los perfiles de la lista
 * @param usadoEn   { idPerfil: ['Columnas', …] } (renglones de este proyecto que lo usan)
 */
/**
 * @param todos  todos los perfiles del catálogo (también los que no se muestran), para avisar repetidos
 */
export default function ListaPerfiles({ perfiles, todos = perfiles, usadoEn, proveedores, onActualizar, onAgregar, onQuitar, onCambiarPrecio }) {
  // Mismo nombre y largo de barra que otro perfil: 'visible' (está en esta lista) u 'oculto' (grada/montaje).
  const clave = (p) => `${nombrePerfil(p).toLowerCase()}|${p.largoBarra}`;
  const repetido = (p) => {
    const iguales = todos.filter((q) => q.id !== p.id && clave(q) === clave(p));
    if (iguales.length === 0) return null;
    return iguales.some((q) => perfiles.includes(q)) ? 'visible' : 'oculto';
  };
  return (
    <>
      {perfiles.length === 0 && <p className="nota">Todavía no hay perfiles: agregá los hierros que usás.</p>}
      <ul className="lista-perfiles">
        {perfiles.map((p) => (
          <FilaPerfil key={p.id} perfil={p} usadoEn={usadoEn[p.id] ?? []} repetido={repetido(p)} proveedores={proveedores}
            onCambiarPrecio={onCambiarPrecio}
            onActualizar={onActualizar} onQuitar={onQuitar} />
        ))}
      </ul>
      <button type="button" className="btn-sec" onClick={onAgregar}>+ Agregar perfil</button>
    </>
  );
}
