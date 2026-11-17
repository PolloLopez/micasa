// v1.72 (Leandro: "dentro de + Agregar material debería poder agregar un proveedor"): quien muestra los precios
// puede dar (con este contexto) una función que crea un proveedor nuevo con un nombre y devuelve su id.
import { createContext } from 'react';

export const ContextoAgregarProveedor = createContext(null);
