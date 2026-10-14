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

"Mis proyectos" guarda varios proyectos con nombre en el navegador (Guardar / Guardar como… / Abrir / Duplicar /
Renombrar / Borrar). Para llevarlos a otra compu: "Exportar respaldo de todos" e "Importar respaldo…".

"Guardar proyecto" descarga un `.json` con medidas, aberturas, perfiles, tipos de panel, precios y colores.
"Abrir…" lo vuelve a cargar (en esta compu o en la del herrero). No hace falta cuenta ni servidor.
"Nuevo" arranca un proyecto sin datos; "Ejemplo" carga el loft de referencia.

## Estructura

```
src/
  motor/            lógica pura, sin React (se testea sola)
    constantes.js       supuestos de obra con nombre
    geometria.js        lados A-D, nombres según el frente, alturas del techo
    parametrosIniciales.js  valores por defecto del loft
    migracion.js        convierte datos de versiones anteriores
    validacion.js       límites y reglas de parámetros/aberturas
    escalera.js         escalones, zanca, apoyos y descanso
    segmentos.js        helpers de piezas (compartidos)
    edicionPiezas.js    recortar / mover / cambiar perfil de una pieza
    grada.js            grada para espectadores (proyecto de tipo grada)
    montaje.js          montaje industrial: mesas / bastidores y tanques
    estructura.js       piezas como segmentos 3D (fuente única para 3D y presupuesto)
    optimizadorCortes.js
    presupuesto.js
    motor.test.js
  proyecto/         guardar/abrir proyecto (.json), link para compartir, Mis proyectos + tests
  capas.js          capas del 3D y sus colores por defecto
  componentes/      piezas de UI reutilizables (Tarjeta plegable, CampoNumero, paneles…)
  hooks/            useEstadoGuardado (localStorage)
  LoftCanvas.jsx    visor 3D (Three.js)
  App.jsx           estado y armado de la pantalla
```

Ver `CONTEXT.md` (decisiones) y `PENDIENTES.md` (lo que falta).
