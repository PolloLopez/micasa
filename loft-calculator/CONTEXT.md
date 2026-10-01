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

## Supuestos de obra (en `src/motor/constantes.js`)
Piso del altillo a 2,30 m · merma de corte 3 mm · placa OSB 2,44 × 1,22 + 10 % de recortes ·
techo = planta × 1,05 · refuerzo de vano = dintel + 2 jambas (+ alféizar en ventanas).

## Glosario
- **Antepecho**: altura desde el piso terminado hasta el borde inferior de la ventana (el alféizar).
  Es el "murito" que queda debajo de la ventana. Ej: antepecho 1,10 m + alto 0,60 m → la ventana va de 1,10 a 1,70 m.
  En puertas vale 0 porque arrancan del piso. En el cálculo, si hay antepecho se suma un alféizar (pieza horizontal de refuerzo).
- **Dist. a esquina**: distancia horizontal desde la esquina elegida ("Medir desde") hasta el borde de la abertura.
- **Paso**: distancia entre ejes de dos piezas iguales consecutivas (ej. paso de tirantes 0,40 m).
- **Tirantes**: perfiles que forman la estructura de piso (planta baja y altillo). A renombrar, ver PENDIENTES.
- **Correas (fajas)**: perfiles horizontales en las paredes donde se fijan los paneles.
- **Empalme**: unión de dos tramos cuando la pieza es más larga que la barra comercial.

## Historial relevante
- 2026-09-28 commit `94696eb` dejó la app en blanco (UI borrada, LoftCanvas sin `return`).
- 2026-09-30 v1.0.0: recuperación desde `273301f` + motor nuevo + tests. Ver CHANGELOG.md.
