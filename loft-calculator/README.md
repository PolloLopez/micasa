# micasa · Calculadora de loft

Calculadora paramétrica de un loft steel frame: modelo 3D, optimización de cortes y presupuesto de materiales.

**Producción:** https://pollolopez.github.io/micasa/

## Uso local

```bash
npm install
npm run dev      # servidor de desarrollo
npm test         # tests del motor de cálculo (Vitest)
npm run lint     # oxlint
npm run deploy   # tests + build + publica en GitHub Pages
```

## Estructura

```
src/
  motor/            lógica pura, sin React (se testea sola)
    constantes.js       supuestos de obra con nombre
    validacion.js       límites y reglas de parámetros/aberturas
    estructura.js       piezas con largo y posición (fuente única)
    optimizadorCortes.js
    presupuesto.js
    motor.test.js
  componentes/      piezas de UI reutilizables
  hooks/            useEstadoGuardado (localStorage)
  LoftCanvas.jsx    visor 3D (Three.js)
  App.jsx           estado y armado de la pantalla
```

Ver `CONTEXT.md` (decisiones) y `PENDIENTES.md` (lo que falta).
