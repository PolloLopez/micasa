# CONTEXT — Pollo Calculator (repo micasa / loft-calculator)

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
| 2026-10-09 | Cada pieza tiene `id` (tipo + posición en cm), `tipo` y `grupos` (pared/techo/piso) | Permite eliminar piezas a mano y ocultar una parte con sus hierros. El id por posición es simple y no necesita base de datos; contra: si la pieza se mueve, la eliminación deja de aplicar. |
| 2026-10-09 | Eliminaciones manuales en `params.piezasEliminadas` | Viajan con el proyecto (.json y navegador) y se aplican en el motor: lo eliminado no se dibuja ni se cotiza. |
| 2026-10-09 | Columna dentro de un vano se corta; jamba a < 10 cm de una columna se omite | Evita contar hierro que no se coloca y duplicar la columna como jamba. A validar con el herrero. |
| 2026-10-09 | "Mis proyectos" en el navegador (localStorage, clave `micasa.v2.biblioteca`) | Que el herrero guarde varios proyectos con nombre y los retome sin servidor ni cuentas. Cada entrada guarda el mismo formato que el `.json` (se valida y migra igual). Contra: la lista es por navegador; se compensa con respaldo/importación. La nube queda para el backend. |
| 2026-10-02 | Migración explícita de datos (`motor/migracion.js`); archivo de proyecto versión 3 que abre también la 2 | El usuario ya tenía datos y archivos v1.2: no se pierden ni se resetean. |
| 2026-10-13 | Escalera en su propio módulo (`motor/escalera.js`) con piezas en `motor/segmentos.js` | Mantiene `estructura.js` manejable y evita importaciones circulares; usa el mismo formato de pieza (id/tipo/grupos) así se dibuja, cotiza y elimina igual que el resto. |
| 2026-10-13 | Escalera solo al borde libre del entrepiso; "baja hacia" una pared | Es lo que se construye primero y no requiere cortar el piso 2. El hueco atravesando el entrepiso queda para después. |
| 2026-10-13 | Contrahuellas todas iguales (altura / cantidad redondeada al objetivo) y altura automática = piso 2 + 8 cm | Escalones desparejos son peligrosos; el usuario da un objetivo y el sistema reparte. |
| 2026-10-13 | Regla de comodidad (Blondel) y "se sale de la planta" como avisos, no errores | Son recomendaciones: el herrero puede decidir otra cosa; los errores quedan para lo imposible (sin entrepiso, bajar hacia la pared del entrepiso, posición fuera del borde). |
| 2026-10-13 | Migración: proyectos viejos abren con `escalera.activa = false`; colores con `completarColores` | No aparece una escalera que nadie pidió y no se pierden los colores al sumar capas nuevas. |
| 2026-10-13 | Tarjetas plegables con CSS (contenido sigue montado) y estado por navegador (`micasa.v2.tarjeta.<id>`, `micasa.v2.ver3D`) | Plegar no pierde lo que se está escribiendo ni el estado interno de los campos; al imprimir sale todo. Es preferencia de pantalla, por eso no viaja con el proyecto. |
| 2026-10-14 | Varios descansos = lista `escalera.descansos`; giros siempre para el mismo lado | Un solo modelo para L, U y 3/4: el sentido lo da el primer giro (`giroHacia`) y los demás lo repiten, como un caracol. Descanso plano (no compensados) por simple y seguro (decisión de Leandro). |
| 2026-10-14 | Paso libre (2 m) como aviso, en vez de "debajo del entrepiso" | En U o 3/4 el último tramo puede pasar bajo el entrepiso u otro tramo: lo que importa es la altura para pasar, no la superposición en planta. |
| 2026-10-14 | Ediciones de piezas en `params.piezasEditadas` (`motor/edicionPiezas.js`) aplicadas en el motor | Igual que las eliminaciones: viajan con el proyecto y el 3D y el presupuesto ven la pieza ya editada. Los recortes se miden sobre la pieza original; si un cambio de medida los deja sin largo se ignoran y se avisa. Eliminar le gana a editar. |
| 2026-10-14 | Cambio de perfil = la pieza se cotiza en otro renglón del catálogo (`pieza.insumo`) | Reusa el optimizador de cortes del renglón elegido sin crear perfiles nuevos. |
| 2026-10-14 | Etiqueta de pared en `params.paredes.<lado>` ('' = nombre automático) | El nombre automático sigue el frente elegido; el texto propio solo se usa si se escribe algo. |
| 2026-10-14 | Grada como tipo de proyecto (`params.tipoProyecto`), motor propio `motor/grada.js` | Una grada no tiene paredes ni techo: mezclarla con el loft complicaba todo. Devuelve la misma forma de estructura (listas vacías + `grada`) para reusar 3D, presupuesto y edición de piezas. |
| 2026-10-14 | Pórtico de grada = zanca + apoyo por fila + parantes en las líneas de fila; riostras en cruz solo atrás | Es el esquema típico de tribuna metálica: la zanca triangula cada pórtico y las cruces de atrás frenan el movimiento lateral. Lo demás queda a criterio del herrero. |
| 2026-10-14 | Riostra = tipo de pieza compartido (`cruz()` en `segmentos.js`) para escalera y grada | Un solo helper y un solo renglón de presupuesto. |
| 2026-10-14 | Tablones de grada: `tipoTablones` separados / mismoMaterial / unico | Pedido de Leandro: que asiento y pie puedan ser el mismo tablón. "Mismo material" junta los metros en un renglón; "único" reparte N tablones iguales en la fila (tribuna simple). |
| 2026-10-14 | Montaje industrial como tipo de proyecto con lista de componentes paramétricos (`motor/montaje.js`) | Pedido de Leandro: cintas, mesas, tanques, cilindros. Se arrancó por componentes con medidas (no croquis) porque reusa todo el motor y deja la base (chapa, varios equipos juntos) para el croquis en tablet. Prototipo de lo que después va a Construcción Modular. |
| 2026-10-14 | Componentes en coordenadas locales + giro 0°/90° + posición; ids "c<n>:<pieza>" | Cada componente se arma solo y se ubica después; los ids con el componente permiten eliminar y editar piezas igual que en el resto. |
| 2026-10-14 | Chapa de tanques por anillos del ancho de la chapa (1,22) x chapas por vuelta; tapas en cuadrados de D x D | Cálculo simple y conservador que entiende cualquier calderero. Si D > 1,22 la tapa va en partes (aviso). |
| 2026-10-14 | Compartir = proyecto comprimido (deflate + base64url) en el "#" del link (`proyecto/linkProyecto.js`) | Lo que va después del "#" no llega al servidor: se comparte sin backend y sin exponer nada. Se valida igual que un .json. Contra: el link es largo (~3 KB para el loft), pero WhatsApp y los navegadores lo aceptan. |
| 2026-10-14 | Paneles con dos caras (exterior FrontSide / interior BackSide) orientadas hacia afuera | Permite color exterior e interior sin duplicar la geometría del motor. |
| 2026-10-14 | Opacidad por navegador (como ver/ocultar el 3D); colores de panel en el catálogo (viajan con el proyecto) | La opacidad es cómo quiere mirar cada uno; el color de un panel es un dato de la obra. |
| 2026-10-14 | Foto del 3D para el PDF tomada en `beforeprint` (render + toDataURL en el mismo momento) | Sirve también para Ctrl+P; sin preserveDrawingBuffer (que hace más lento el 3D). |
| 2026-10-14 | Caño elegido = texto del perfil del catálogo (`motor/canos.js`); el 3D lee la medida de ese texto | Una sola fuente de verdad: la lista solo ayuda a escribirlo. Si el herrero escribe otro perfil, sigue andando ("Otro"). El loft mantiene grosores fijos para que el modelo se lea claro. |
| 2026-10-14 | Grada desmontable: módulos con pórticos propios en las puntas y junta de 2 cm; ids iguales a los de antes si hay un solo módulo | Así cada módulo se arma y se sostiene solo; no se rompen las ediciones guardadas de gradas de una pieza. Bulones: 2 por parante y 2 por zanca en cada unión (supuesto a validar). |
| 2026-10-14 | Nombre visible "Pollo Calculator"; se mantienen repo `micasa`, carpeta `loft-calculator`, `base: /micasa/`, formato `micasa-proyecto` y prefijo `micasa.v2.` | Cambiar el repo o la base cambia la dirección y "Mis proyectos" (localStorage es por dirección): los herreros perderían lo guardado. Se renombra solo lo que se ve. |

| 2026-10-15 | Entrepiso parcial = largo × profundidad + "medir desde" izquierda/derecha y distancia (`tramoEntrepiso` en `geometria.js`); largo 0 = toda la pared | Decisión de Leandro (largo × profundidad). Reusa la convención de las aberturas (vista desde afuera) y deja los proyectos viejos iguales sin migrar medidas. |
| 2026-10-15 | Borde libre = el que no cae sobre una pared; lleva viga de cierre (tipo `viga-cierre`, renglón `vigaCierre`) con el mismo id `marco-piso2:<i>` | El perfil lo elige el herrero (decisión de Leandro), por eso renglón propio. Mismo id para no romper piezas eliminadas o editadas de proyectos guardados. |
| 2026-10-15 | Columnas del borde libre cada `separacionColumnasEntrepiso` (0 = solo puntas); la migración copia la separación de verticales de la pared del entrepiso | Antes las columnas del borde seguían a las de la pared; copiar ese valor deja los proyectos guardados con las mismas columnas. Cuántas columnas necesita el borde es pregunta abierta para el herrero. |

| 2026-10-16 | Dintel, jambas y alféizar con renglón propio (`marcoAbertura`), mismo perfil de arranque que las columnas | Pedido de Leandro: en obra suelen ser otro perfil. Mismo valor inicial para no cambiar presupuestos de golpe; el herrero lo ajusta. |

## Supuestos de obra (en `src/motor/constantes.js`)
Piso del entrepiso a 2,30 m · merma de corte 3 mm · excedente de barras 1 % (editable; depende del proveedor) · placa OSB 2,44 × 1,22 + 10 % de recortes ·
techo medido sobre la pendiente (sin aleros) · escalera: espesor de piso 2 = 8 cm, comodidad 60-65 cm, paso libre 2 m · refuerzo de vano = dintel + 2 jambas (+ alféizar en ventanas).

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
- **Pieza**: cada hierro del modelo (columna, solera, horizontal, dintel...). Se puede seleccionar en el 3D y eliminar.
- **Excedente de barras**: % que las barras comerciales traen de más sobre su largo nominal (1-2 %).
- **Vigas de techo**: siguen la pendiente, de la pared baja a la alta. **Correas de techo**: van sobre las vigas,
  paralelas a la pared baja; su separación se mide sobre la pendiente.
- **Huella**: profundidad de cada pisada. **Contrahuella**: altura de cada escalón.
- **Regla de comodidad (Blondel)**: 2 contrahuellas + 1 huella entre 60 y 65 cm.
- **Paso libre**: altura para pasar debajo de un tramo o del entrepiso sin golpearse la cabeza (mínimo 2 m).
- **Grada**: filas escalonadas para sentarse. **Pórtico**: cada "costilla" de la grada (zanca + apoyos + parantes). **Parante**: vertical que baja al piso. **Riostra en cruz**: dos diagonales entre parantes (cruz de San Andrés) para que no se mueva de costado.
- **Montaje**: proyecto con varios equipos (componentes). **Envolvente**: la chapa curvada que forma el cilindro de un tanque; se arma en **anillos** (virolas). **Cuna**: apoyo de un tanque horizontal (dos patas y un travesaño).
- **Pieza editada**: hierro recortado, movido o cotizado con otro perfil a mano desde el 3D.
- **Zanca**: viga inclinada que carga los escalones (acá una sola, central). **Descanso**: plataforma donde gira la escalera en L.
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
- 2026-10-09 v1.5.0: seleccionar y eliminar piezas, ocultar partes con sus hierros, columnas cortadas en vanos.
- 2026-10-09 v1.6.0: "Mis proyectos" (guardar, guardar como, abrir, duplicar, renombrar, borrar, respaldo).
- 2026-10-13 v1.7.0: escaleras (recta o en L, al borde del entrepiso).
- 2026-10-14 v1.8.0: escalera en U y 3/4 de vuelta, edición de piezas, etiquetas de paredes.
- 2026-10-14 v1.9.0: gradas para espectadores; parantes y riostras en la escalera.
- 2026-10-14 v1.10.0: tablones de grada separados, del mismo material o únicos por fila.
- 2026-10-14 v1.11.0: montaje industrial (mesas / bastidores y tanques cilíndricos).
- 2026-10-14 v1.12.0: opacidad, paneles con color interior/exterior, compartir por link, 3D en el PDF.
- 2026-10-14 v1.13.0: grada con unión de parantes, respaldo, caños a elección y módulos desmontables.
- 2026-10-14 v1.13.1: la app pasa a llamarse Pollo Calculator.
- 2026-10-15 v1.14.0: entrepiso parcial (largo × profundidad) con viga de cierre y columnas del borde libre; 🐤 en el encabezado.
- 2026-10-16 v1.14.1: marcos de aberturas aparte, paredes plegables, editor más claro.
- Nota: el elemento `id="flonnect-my-app"` que aparece en la página no es de la app: lo inyecta la extensión Flonnect (grabador de pantalla) de Chrome.
