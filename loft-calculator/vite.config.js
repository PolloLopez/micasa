import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Versión de package.json, para mostrarla en el encabezado (v1.16).
// Vite reemplaza __VERSION_APP__ por el texto al armar la app: nunca queda desactualizada.
const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))

export default defineConfig({
  plugins: [react()],
  base: '/micasa/',
  define: { __VERSION_APP__: JSON.stringify(version) },
})
