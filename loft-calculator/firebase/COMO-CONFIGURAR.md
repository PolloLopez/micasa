# Links cortos en la nube (Firebase) — cómo configurarlo

Desde v1.30 "Compartir" puede dar dos links cortos que **guardan los cambios**:

- **Para ver** (`…/micasa/#p=K7x2mQa9Zt12`): para el cliente; abre el proyecto, no puede guardar en el link.
- **Para editar** (`…/micasa/#e=K7x2mQa9Zt12.<clave>`): para vos o el herrero; con "Guardar" queda en el link.

Mientras no esté configurado, la app sigue andando igual: "Compartir" ofrece el link de siempre
(ahora la mitad de largo, con el proyecto adentro).

## Pasos (una sola vez, ~10 minutos)

1. Entrá a https://console.firebase.google.com → **Agregar proyecto** → nombre `pollo-calculator`
   (Google Analytics: no hace falta).
2. Menú **Compilación → Firestore Database → Crear base de datos**
   - Modo: **producción**.
   - Ubicación: `southamerica-east1` (San Pablo, la más cerca).
3. En Firestore, pestaña **Reglas**: borrá lo que hay, pegá todo `firebase/firestore.rules` y **Publicar**.
4. ⚙ **Configuración del proyecto → Tus apps → Web (`</>`)** → registrá "Pollo Calculator"
   (sin Firebase Hosting). Te muestra un bloque `firebaseConfig`: copiá `projectId` y `apiKey`.
5. Pegalos en `src/proyecto/configNube.js` (`PROYECTO` y `CLAVE_WEB`), commit, push y `npm run deploy`.
   (O mandámelos y lo hago yo en la próxima versión.) No son secretos: toda app web de Firebase los muestra.
6. Recomendado: en https://console.cloud.google.com → **APIs y servicios → Credenciales** → la clave
   "Browser key" → **Restricciones de aplicaciones: Sitios web** → agregá `https://pollolopez.github.io/*`
   y `http://localhost:*/*`; **Restricciones de API: Cloud Firestore API**. Así nadie usa tu clave desde otro sitio.

## Probar las reglas (opcional, necesita Java)

Desde `loft-calculator`:

```powershell
npx firebase-tools emulators:exec --only firestore --project demo-pollo --config firebase/firebase.json "node firebase/probarReglas.mjs"
```

Tiene que terminar con "Todas las reglas andan." (crea, lee, guarda con clave, rechaza sin clave,
rechaza versiones viejas, no deja leer las claves ni listar proyectos).

## Qué hay que saber

- Cualquiera que tenga el link **de ver** ve todo el proyecto, **con los precios**. Mandá ese, nunca el de editar.
- La clave de edición queda en el link de editar y en Mis proyectos de tu navegador. Si la perdés,
  el link de ver sigue andando; para editar, "Compartir → Crear links" hace un link nuevo.
- Si dos personas editan a la vez, gana el primero que guarda; al otro le avisa que recargue el link.
- Plan gratis de Firestore: 50.000 lecturas y 20.000 guardados por día, 1 GB. Sobra.
