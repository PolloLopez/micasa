// ==========================================================
// Configuración de la nube (v1.30): el proyecto de Firebase
// ----------------------------------------------------------
// Se completa con los datos de "Configuración del proyecto → Tus apps →
// App web" de la consola de Firebase. NO son secretos: cualquier app web
// de Firebase los muestra; la seguridad está en firebase/firestore.rules.
// Vacío = la app sigue usando el link con el proyecto adentro (sin nube).
// ==========================================================

// 👉 Pegá acá los dos datos de tu proyecto de Firebase:
const PROYECTO = 'pollo-calculator'; // "projectId"
const CLAVE_WEB = 'AIzaSyDN2Hjr06zU9wulRq1o6ljg45sPJVfWctw'; // "apiKey" (pública; la seguridad está en las reglas)

// (Para probar se pueden pasar por variables de entorno al compilar:
//  VITE_NUBE_PROYECTO y VITE_NUBE_CLAVE; si están, mandan sobre lo de arriba.)
const entorno = typeof import.meta !== 'undefined' ? import.meta.env ?? {} : {};

export const CONFIG_NUBE = {
  projectId: entorno.VITE_NUBE_PROYECTO || PROYECTO,
  apiKey: entorno.VITE_NUBE_CLAVE || CLAVE_WEB,
};
