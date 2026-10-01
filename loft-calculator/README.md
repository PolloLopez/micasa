# micasa · Calculadora de loft

Calculadora paramétrica de un loft steel frame: modelo 3D (paredes por panel, entrepiso y techo a una agua), optimización de cortes y presupuesto de materiales.

**Producción:** https://pollolopez.github.io/micasa/

## Uso local

```bash
npm install
npm run dev      # servidor de desarrollo
npm test         # tests del motor de cálculo (Vitest)
npm run lint     # oxlint
npm run deploy   # tests + build + publica en GitHub Pages
```

## Proyectos

"Guardar proyecto" descarga un `.json` con medidas, aberturas, perfiles, precios y colores.
"Abrir…" lo vuelve a cargar (en esta compu o en la del herrero). No hace falta cuenta ni servidor.

## Estructura

```
src/
  motor/            lógica pura, sin React (se testea sola)
    constantes.js       supuestos de obra con nombre
    geometria.js        lados A-D, nombres según el frente, alturas del techo
    parametrosIniciales.js  valores por defecto del loft
    validacion.js       límites y reglas de parámetros/aberturas
    estructura.js       piezas como segmentos 3D (fuente única para 3D y presupuesto)
    optimizadorCortes.js
    presupuesto.js
    motor.test.js
  proyecto/         guardar/abrir proyecto (.json) con validación + tests
  capas.js          capas del 3D y sus colores por defecto
  componentes/      piezas de UI reutilizables
  hooks/            useEstadoGuardado (localStorage)
  LoftCanvas.jsx    visor 3D (Three.js)
  App.jsx           estado y armado de la pantalla
```

Ver `CONTEXT.md` (decisiones) y `PENDIENTES.md` (lo que falta).
