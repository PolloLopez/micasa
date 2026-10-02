# CONTEXT — micasa / loft-calculator

## Qué es
Calculadora web del loft modular (steel frame) que estoy construyendo. Es el caso de validación del proyecto
**Construcción Modular** (motor paramétrico Django/React). Esta app es el prototipo en React puro, sin backend.

- Repo: github.com/PolloLopez/micasa (el proyecto vive en la subcarpeta `loft-calculator/`)
- Producción: GitHub Pages, rama `gh-pages`, URL https://pollolopez.github.io/micasa/ (`base: '/micasa/'` en vite.config.js)
- Stack: React 19 + Vite 8 + Three.js. Tests con Vitest. Lint con oxlint.

## Cómo funciona (flujo de datos)
```
params + aberturas ──► generarEstructura() ──► piezas (largo + posición)
                                               ├─► calcularPresupuesto() + catálogo ──► tabla y total
                                               └─► LoftCanvas (3D)
```
Invariante: el estado (`params`, `aberturas`) siempre es válido. Los inputs muestran el error pero no guardan
valores inválidos.

## Decisiones de arquitectura
| Fecha | Decisión | Por qué |
|---|---|---|
| 2026-09-30 | Motor de cálculo en `src/motor/` como funciones puras | Testeable sin navegador; es lo que después se porta a Django (Construcción Modular). |
| 2026-09-30 | Una sola fuente de piezas (`estructura.js`) para 3D y presupuesto | Antes el 3D y el cálculo contaban distinto (12 vs 9 perfiles, 8 vs 10 columnas). |
| 2026-09-30 | Barras por optimizador FFD (First Fit Decreasing) con merma 3 mm | La fórmula `metros / 6` subestimaba ~22 %. |
| 2026-09-30 | Piezas más largas que la barra se empalman (se parten en tramos) | Correas y marcos de 7,50 m con barras de 6 m. Supuesto a validar en obra. |
| 2026-09-30 | Visor 3D: renderer único + regenerar solo el grupo con `dispose()` | Recrear el renderer por tecla agotaba los contextos WebGL. |
| 2026-09-30 | localStorage para params/aberturas/precios (prefijo `micasa.v1.`) | Sin backend todavía; si cambia la forma de los datos, subir a `v2`. |
| 2026-09-30 | Se quita el "alta de insumos" libre | Los insumos nuevos no participaban en ningún cálculo y confundían el total. |
| 2026-10-01 | Lados con nombre fijo A-B-C-D; "frente" es una elección | Cambiar el frente renombra paredes sin mover aberturas ni entrepiso (quedan pegados a su lado físico). |
| 2026-10-01 | Medidas de aberturas "vistas desde afuera" en las 4 paredes | "Esquina izquierda" significa lo mismo en cualquier pared. |
| 2026-10-01 | Piezas como segmentos 3D (`desde` → `hasta`) | Permite piezas inclinadas (techo, soleras) con el mismo código que las horizontales. |
| 2026-10-01 | Estructura de cada piso cruza la luz más corta | Menor luz = menos flecha; regla única para piso y entrepiso. |
| 2026-10-01 | Techo a una agua: `altura` = lado bajo; columnas y paredes del lado alto crecen solas | La pendiente se define una vez y todo lo demás se deriva. |
| 2026-10-01 | Separación de transversales editable (0 = sin), no constante | Depende del panel y la define el herrero de la obra. |
| 2026-10-01 | localStorage pasa a prefijo `micasa.v2.` | Cambió la forma de los datos (lados, paredes, techo); los datos v1 se ignoran. |
| 2026-10-01 | Proyectos como archivo `.json` descargable (formato `micasa-proyecto`, versión 2) | Sin servidor: cada obra es un archivo que se pasa al herrero por WhatsApp/mail. Al abrir se valida todo (medidas, aberturas, catálogo, colores). Compartir online queda para el backend de Construcción Modular. |
| 2026-10-01 | `src/proyecto/` separado de `src/motor/` | El motor es dominio puro (cálculo); guardar/abrir y colores son de la aplicación. |
| 2026-10-01 | Colores por capa: se cambia el color del material, no se redibuja | Cambiar un color es instantáneo y no recrea geometrías. |
| 2026-10-02 | Excedente de barras como parámetro (1 % por defecto) | Las barras vienen 1-2 % más largas que su nominal; el optimizador corta sobre el largo real. Se usa el mínimo del rango para no subestimar. |
| 2026-10-02 | Catálogo = insumos fijos + tipos de panel (lista libre) | Paredes y techo no siempre llevan el mismo panel; cada uno referencia un tipo por id. Un tipo en uso no se puede borrar. |
| 2026-10-02 | Transversales: una separación por piso | Cada piso puede tener otro panel/luz y el herrero las define por separado. |
| 2026-10-02 | "Nuevo" = proyecto vacío (`proyecto/proyectosBase.js`); el loft pasa a "Ejemplo" | Un proyecto nuevo no debe arrastrar datos del loft. Se usan medidas mínimas (3 x 3 x 2,40) porque el 3D y el motor necesitan una planta válida. |
| 2026-10-02 | Migración explícita de datos (`motor/migracion.js`); archivo de proyecto versión 3 que abre también la 2 | El usuario ya tenía datos y archivos v1.2: no se pierden ni se resetean. |

## Supuestos de obra (en `src/motor/constantes.js`)
Piso del entrepiso a 2,30 m · merma de corte 3 mm · excedente de barras 1 % (editable) · placa OSB 2,44 × 1,22 + 10 % de recortes ·
techo medido sobre la pendiente (sin aleros) · refuerzo de vano = dintel + 2 jambas (+ alféizar en ventanas).

## Glosario
- **Antepecho**: altura desde el piso terminado hasta el borde inferior de la ventana (el alféizar).
  Es el "murito" que queda debajo de la ventana. Ej: antepecho 1,10 m + alto 0,60 m → la ventana va de 1,10 a 1,70 m.
  En puertas vale 0 porque arrancan del piso. En el cálculo, si hay antepecho se suma un alféizar (pieza horizontal de refuerzo).
- **Dist. a esquina**: distancia horizontal desde la esquina elegida ("Medir desde") hasta el borde de la abertura.
- **Paso**: distancia entre ejes de dos piezas iguales consecutivas (ej. paso de tirantes 0,40 m).
- **Lados A, B, C, D**: nombre fijo de cada pared (A = z+, se recorren en orden). El **frente** es el lado elegido;
  enfrente está el **fondo** y, mirando el frente desde afuera, a la derecha el **lateral derecho**.
- **Verticales** (eje X de la pared): columnas, con su separación a lo largo de cada pared.
- **Horizontales** (eje Y de la pared): perfiles en altura donde se fijan los paneles (antes "correas" o "fajas").
- **Estructura de piso / de piso 2**: perfiles que forman el piso de planta baja y del entrepiso (antes "tirantes").
- **Transversales**: tramos cortos entre los perfiles de un piso para que no arqueen. Cada piso tiene su separación.
- **Tipo de panel**: revestimiento (ej. panel PUR, chapa) con precio por m² y color; lo elige cada pared y el techo.
- **Excedente de barras**: % que las barras comerciales traen de más sobre su largo nominal (1-2 %).
- **Vigas de techo**: siguen la pendiente, de la pared baja a la alta. **Correas de techo**: van sobre las vigas,
  paralelas a la pared baja; su separación se mide sobre la pendiente.
- **Empalme**: unión de dos tramos cuando la pieza es más larga que la barra comercial.

## Historial relevante
- 2026-09-28 commit `94696eb` dejó la app en blanco (UI borrada, LoftCanvas sin `return`).
- 2026-09-30 v1.0.0: recuperación desde `273301f` + motor nuevo + tests. Ver CHANGELOG.md.
- 2026-10-01 v1.0.0 publicada en GitHub Pages. Se sacó el repo que estaba inicializado en `C:\Users\LLopez`;
  clon de trabajo: `C:\Users\LLopez\micasa`.
- 2026-10-01 v1.1.0: frente seleccionable, paredes por panel, entrepiso orientable, techo a una agua, transversales.
- 2026-10-01 v1.2.0: guardar/abrir proyecto (.json), colores por capa, transversales visibles.
- 2026-10-02 v1.3.0: transversales por piso, tipos de panel por pared/techo, excedente de barras.
- 2026-10-02 v1.4.0: "Nuevo" sin datos + botón "Ejemplo"; paneles visibles uno por uno en el 3D.
- Nota: el elemento `id="flonnect-my-app"` que aparece en la página no es de la app: lo inyecta la extensión Flonnect (grabador de pantalla) de Chrome.
