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

| 2026-10-16 | Revestimientos con forma de venta: a medida (ancho útil, largo máximo, solape) o placa fija (ancho × largo), en `motor/revestimientos.js` | Pedido de Leandro: algunos vienen a medida y otros estandarizados (chapas, placas, durlock). Contar tiras/placas enteras es lo que se compra; m² netos subestimaba. Las aberturas todavía no se descuentan (conservador). |
| 2026-10-16 | Ubicación del revestimiento ('cara' sobre los perfiles / 'eje' embutido) en el tipo, no en la pared | Depende del revestimiento y lo decide el herrero (Leandro). La cara (exterior/interior) la da la pared: el mismo tipo sirve afuera o adentro. Solo cambia el dibujo. |
| 2026-10-16 | Tarjeta Materiales (qué es) separada del Presupuesto (cuánto y a qué precio) | Pedido de Leandro: el herrero carga los materiales una vez; el presupuesto se lee más fácil. El catálogo sigue siendo uno solo (misma fuente de verdad). |
| 2026-10-16 | Revestimiento interior por pared (`paredes.<lado>.panelInterior`, '' = sin) | Primer paso para el durlock (cocina y baño). El tabique interior queda para después. |

| 2026-10-18 | Piezas agregadas a mano en `params.piezasAgregadas` (`motor/piezasAgregadas.js`), con `insumo` explícito | Duplicar/pegar piezas sin tocar el motor: el presupuesto ya sumaba las piezas con `insumo` a su renglón, y piezasEditadas sirve para editarlas porque usan su id (`agr:<n>`). |
| 2026-10-18 | Medición pura en `motor/medicion.js` (se pega al eje; entre dos verticales mide horizontal) | Testeable sin navegador. Los herreros miden de eje a eje, como en un plano. |
| 2026-10-18 | Juntas de paneles calculadas en `revestimientos.js` (`juntasDePano`) con la misma regla que la cuenta | Lo que se dibuja es lo que se compra: las tiras arrancan en la esquina izquierda vista desde afuera, igual que en el presupuesto. |
| 2026-10-18 | Versión inyectada por Vite (`define: __VERSION_APP__` desde package.json) | Una sola fuente (package.json, que ya sube con cada versión): nunca queda desactualizada en pantalla. |

| 2026-10-19 | Aberturas dentro de cada pared (sin tarjeta aparte); `etiqueta`/`mostrarEtiqueta` opcionales en cada abertura | Pedido de Leandro: "unificar pared y aberturas". Las aberturas siguen en su lista propia (no dentro de params.paredes) para no migrar datos ni romper ids; la pantalla las agrupa por pared. |
| 2026-10-19 | Montantes por pared (cada X m entre columnas) y en los vanos partidos en montante de dintel / de antepecho; jambas de piso a solera | Es como se arma una pared liviana: verticales completos al costado del vano y cortos arriba y abajo. Mismo renglón "Montantes" para los cortos. |
| 2026-10-19 | Riostras en cruz de pared en el renglón de riostras compartido; un vano entre columnas con abertura no lleva | La cruz taparía la abertura. Un solo renglón de riostras para escalera, grada y paredes. |
| 2026-10-19 | Glosario unificado con Leandro (travesaño de antepecho, horizontales/fajas, montante) | Que la app hable como el herrero. Los ids internos (`alfeizar`, `horizontal`) no cambian para no romper proyectos guardados. |

| 2026-10-19 | Pestañas en el panel (BarraPestanas.jsx); las secciones ocultas siguen montadas (CSS) | Decisión de Leandro tras la revisión UX. Ocultar con CSS (no desmontar) no pierde lo que se está escribiendo y deja imprimir todo. |
| 2026-10-19 | Deshacer con "fotos" del proyecto (`proyecto/historial.js`, funciones puras) de params + aberturas + catálogo; cambios seguidos (< 800 ms) en un solo paso; 50 pasos | Decisión de Leandro: deshacer todo el proyecto. Fotos completas es lo más simple y seguro (los datos son chicos); agrupar evita deshacer letra por letra. Colores, opacidad y nombre no entran (son de pantalla). |
| 2026-10-19 | Celular: una cosa a la vez (pestaña "3D" o datos) con barra fija abajo | El 3D tapaba la primera pantalla; la barra abajo queda al alcance del pulgar en la obra. |
| 2026-10-20 | Casilla + medida (`CampoOpcional.jsx`) en vez de "0 = sin"; en el proyecto se sigue guardando 0 | Más claro para el herrero sin migrar proyectos guardados. Con la casilla tildada no se acepta 0 (si no, escribir "0.6" apagaba la casilla en el primer "0"). |
| 2026-10-20 | Diálogos propios con `<dialog>` + promesas (`Dialogo.jsx`, `useDialogo.js`) en vez de window.confirm/prompt | El elemento nativo da modal, Esc y foco sin librerías; la promesa deja el código igual de lineal que con confirm. Los atajos globales no actúan con un diálogo abierto. |
| 2026-10-20 | Leyenda del 3D en grupos (`GRUPOS_LEYENDA` en `capas.js`) con todo/nada; un test asegura que ninguna capa quede afuera | 16 casillas sueltas costaban leer; agrupar por qué son (hierros, superficies, ayudas). |
| 2026-10-20 | Cortes compartidos (`motor/cortesCompartidos.js`): se juntan renglones con igual perfil normalizado (`clavePerfil`), largo de barra y precio; barras repartidas por metros (mayor resto); si juntar no ahorra, quedan separados | Pedido de Leandro: en obra se corta de la misma pila. El precio en la clave evita mezclar proveedores o errores (se avisa). Repartir enteros por metros mantiene el total exacto y cada renglón con barras enteras. `compartirCortes` en params (por defecto sí) para comparar. Es la base para la futura lista de perfiles (ahí la clave pasa a ser el id del perfil). |
| 2026-10-20 | Lista de perfiles (`motor/perfiles.js`): perfiles como entradas `categoria: 'hierro'` del catálogo; los usos (renglones 'perfil') guardan `perfilId`; `resolverCatalogo` les copia nombre, barra, precio y kg/m | Pedido de Leandro: elegir el hierro en vez de escribirlo. Guardarlos en el catálogo reusa sin cambios el guardado, el archivo, el link, Mis proyectos y deshacer. Resolver al calcular deja al presupuesto, los cortes y el 3D leyendo `perfil/largoBarra/precio` como siempre. |
| 2026-10-20 | Migración: se arma la lista desde los textos viejos (`perfilDesdeTexto`); mismo nombre + largo = un perfil; precios distintos → el más usado (empate: el más alto) + `revisarPrecio` | Decisión de Leandro ("el más usado + aviso"). Lo no reconocido queda como tipo "otro" con su texto: nada se pierde. |
| 2026-10-20 | Peso aproximado con esquinas en canto vivo (densidad 7850 kg/m³); ángulos se nombran en pulgadas si son fracciones de 1/16" | Alcanza para el peso de compra; los herreros piden los ángulos en pulgadas. |
| 2026-10-20 | Perfil por pared: `params.paredes.<lado>.perfilColumnas/Horizontales/Montantes/Marcos` ('' = general); las piezas se marcan `perfilPared` en `marcarPerfilesDePared` (después de las ediciones a mano) y el presupuesto las saca a un renglón `<uso>@<perfil>` | Decisión de Leandro (columnas, fajas, montantes y marcos). Marcar después de editar porque `aplicarEdicion` rearma la pieza; la pared sale de los grupos (o del id en el marco de piso). Renglón aparte = precio y barras propios sin tocar el catálogo. |
| 2026-10-20 | Columnas de esquina (`esquina: true`, renglón `columnaEsquina`) | Son de dos paredes: no les puede tocar el perfil de una sola. Migración: copian el perfil y precio de Columnas. |
| 2026-10-20 | Patrón alternado = columnas + montantes con perfil por pared | Decisión de Leandro: ya resuelve "80x80 cada 2 m y 60x60 entre medio" sin campos nuevos. |
| 2026-10-20 | Descontar aberturas solo en tiras/placas tapadas ENTERAS por el hueco (`pedazosDeTira`, `placasDePano`); `pared.huecos` en coordenadas de la pared | Así se compra en obra: lo que el hueco corta en parte se pide entero y se recorta. Conservador: nunca falta material. |
| 2026-10-20 | Panel 3D con huecos armado por franjas (`pedazosDePared`) en vez de una forma con agujeros | Sin triangular agujeros: una puerta que toca el piso o dos ventanas una sobre otra no dan problemas. El área dibujada = pared − huecos (test). |
| 2026-10-23 | Proveedores (`motor/proveedores.js`) como entradas `categoria: 'proveedor'` del catálogo; cada material con `precios: { idProveedor: { efectivo, tarjeta } }`; `aplicarProveedor` deja el elegido en `precio` | Pedido de Leandro: comparar presupuestos. En el catálogo viajan con el proyecto, el archivo, el link y deshacer sin tocar nada más. Escribir el precio elegido en `precio` deja al resto del motor igual. Los usos de perfil no tienen precio propio (lo toman del perfil). |
| 2026-10-23 | Tarjeta = recargo % del proveedor, con precio propio opcional por material; comparar con un proveedor para todo + "lo más barato de cada material" | Decisiones de Leandro. Faltantes cuentan $0 y se avisan, para no comparar totales incompletos. Migración: el precio de siempre pasa a "Mi proveedor" en efectivo. |
| 2026-10-23 | Planos (`motor/planos.js`): cada pared en coordenadas "vista desde afuera" (x desde p1, y desde el piso) y cada planta desde arriba; lista de piezas agrupada por tipo + perfil + largo al cm | Pedido de Leandro: exportar las paredes completas con estructura y medidas. Mismas coordenadas que las aberturas, así las cotas coinciden con lo que carga el herrero. Funciones puras: las usan la pestaña, el PDF y el Excel. |
| 2026-10-24 | Separaciones por cantidad en `params.cantidades` (`motor/cantidades.js`), clave = ruta del campo; el motor la convierte en separación (`separacionDe`) y `infoSeparacion` da lo derivado para la pantalla | Pedido de Leandro: cargar "4 columnas" en vez de "cada 2,50 m". Guardar la cantidad aparte deja la medida intacta (volver a medida no pierde nada) y los proyectos viejos se abren igual (`cantidades: {}`). Mínimos por campo (fajas y tirantes ≥ 1) porque separación 0 colgaría el cálculo. |
| 2026-10-24 | Resaltar en el 3D con un criterio `{tipo: perfil/renglon/grupo, id}` (`motor/resaltado.js`) y un contexto de React (`componentes/contextoResaltado.js`) | Pedido de Leandro: ver qué piezas son de un perfil, renglón o pared. La regla pieza → renglón/perfil es la misma del presupuesto (testeado: cada renglón resalta exactamente sus piezas). El contexto evita pasar props por TarjetaMateriales → ListaPerfiles → FilaPerfil. Solo con mouse (pointerType) para que en el celular no quede pegado; ahí está el 👁. |
| 2026-10-24 | Impresión armada (`HojasImpresion.jsx`) en vez de imprimir los formularios; fotos del 3D con `capturaRef` (LoftCanvas) sacadas antes de `window.print()` con `flushSync` | Pedido de Leandro: 16-20 hojas → 2-3. El navegador imprime lo que hay en la página: las fotos tienen que estar dibujadas antes de abrir la ventana de imprimir (flushSync fuerza a React a actualizar en el momento). Vistas fijas con cámara ortográfica (sin perspectiva, a escala). |
| 2026-10-24 | Bordes: `INSUMO.BORDE_PISO` y `INSUMO.BORDE_TECHO`; los renglones nuevos copian el perfil de su original al abrir un proyecto viejo (`RENGLONES_QUE_COPIAN` en migracion.js) | Pedido de Leandro: borde 80x80 e interior C 80x40. Copiar el perfil (y no votar en la lista) deja el total igual. El marco de techo es opcional (`techoConBorde`, falso en proyectos viejos) porque agrega piezas; las piezas de las puntas van a la altura de las correas para no repetir la solera de las paredes de los costados. |
| 2026-10-24 | Piso 2: `params.alturaPiso2` (antes la constante ALTURA_PISO_2, que queda como valor por defecto); columnas fuera de las paredes = tipo 'columna-entrepiso' (renglón `COLUMNA_ENTREPISO`, copia el perfil de Columnas al migrar); fila del medio a media profundidad con 'viga-apoyo' 12 cm abajo de los tirantes (renglón de vigas del entrepiso) | Pedido de Leandro. Un tipo de pieza propio (y no una marca como `esquina`) hace que 3D, planos, resaltado y presupuesto lo reconozcan sin más cambios. La viga va abajo para no superponerse con los tirantes. |
| 2026-10-24 | Plan de compra (`planDeCompra` en proveedores.js): prueba todas las combinaciones de proveedores (hasta 12 → 4096) y en cada una compra cada material al más barato de los elegidos; gana la que deja menos sin comprar y, entre esas, la más barata con flete | Pedido de Leandro: saber qué conviene comprarle a quién con el flete de cada uno. Elegir "el más barato de cada material" no alcanza cuando hay flete (es un problema de costos fijos); con pocos proveedores, probar todas las combinaciones es exacto, simple y rápido. Flete como renglón del presupuesto (`categoria: 'flete'`) para que entre en el total, el PDF y el Excel sin tocar nada más. |
| 2026-10-24 | Accesorios como entradas `categoria: 'accesorio'` del catálogo con `cantidad` cargada a mano y `precios` por proveedor | Pedido de Leandro (tornillería, electrodos, selladores y los que agregue). En el catálogo viajan con el proyecto y el plan de compra los incluye solo. Los proyectos de antes arrancan con los 3 de fábrica en 0. |
| 2026-10-25 | Links cortos en Firestore por REST (sin SDK de Firebase); dos links (ver `#p=id`, editar `#e=id.clave`); la clave solo como sha256 en `proyectos/{id}` y en texto plano en `cambios/{id}_{rev}` (ilegibles); guardar = batch que crea el cambio y sube `rev` (reglas con `existsAfter`/`getAfter` y `hashing.sha256`) | Pedido de Leandro (link corto y que guarde cambios; eligió Firebase y dos links). Sin servidor propio ni Cloud Functions (plan gratis). REST evita sumar ~100 kB de librería. El `rev` evita que dos ediciones se pisen. Riesgo aceptado: cualquiera puede crear proyectos nuevos (se mitiga restringiendo la API key al dominio). |
| 2026-10-25 | Formato compacto (`formatoCompacto.js`): params y catálogo como diferencia contra lo de fábrica; claves borradas en `~` (no null, porque hay datos que valen null) | El link sin nube baja a la mitad y la nube guarda menos. Se expande al archivo completo y pasa por `leerArchivoProyecto` (misma validación y migración). |
| 2026-10-23 | Excel sin librerías (`proyecto/xlsx.js`): zip "stored" (sin comprimir) + XML mínimo, textos inline | Evita sumar una dependencia pesada (SheetJS) para algo acotado. Probado abriendo el archivo con openpyxl y LibreOffice. |
| 2026-10-20 | Ayuda con "?" y bienvenida la primera vez (`micasa.v2.bienvenidaVista`), salvo si se entra con un link compartido | Los atajos no se descubrían solos. Con link compartido ya se pregunta "¿abrir?": dos ventanas juntas confunden. |
| 2026-10-27 | Con más de un proveedor, el total de la obra (pestaña, TOTAL, PDF, Excel) es el del plan de compra (`totalDeLaObra` en `proveedores.js`); el del proveedor elegido queda como referencia | Decisión de Leandro: el total de un solo proveedor dejaba afuera lo que ese no vende (paneles de Vastek) y parecía un error. El plan siempre compra todo lo que alguien vende. |
| 2026-10-27 | Presupuesto en sub-pestañas dentro de la pestaña (una cosa por vez), total de la obra fijo arriba; la sub-pestaña se llama "Lista de materiales" (no "Materiales") | Leandro pidió ver el total de materiales sin proveedor y ordenar todo; delegó la UX. Sub-pestañas evitan una página larguísima; el nombre distinto evita confundirla con la pestaña Materiales (catálogo). |
| 2026-10-27 | Terreno en coordenadas del lote (u = desde el lateral izquierdo mirando desde la calle, v = desde la línea municipal), medido al borde de cada cosa; la casa se ubica con 2 distancias (frente e izquierda) y las otras 2 se calculan; el frente de la casa mira a la calle | Así se mide con la cinta en el lote y no hay datos contradictorios. Lote rectangular (decisión de Leandro). Retiros y mínimos los carga el diseñador (cambian por municipio, pedido de Leandro): 0 = sin control. Que la casa no entre es un aviso, no un error, para poder ir acomodando. |
| 2026-10-27 | Orientación = hacia dónde mira la calle (rumbo o grados); el norte del 3D y la flecha del plano salen de ahí | Es lo que se sabe parado en el lote. Hay un test que cruza el norte del 3D con el del plano para cualquier frente y orientación. Base para la etapa 2 (sol). |
| 2026-10-27 | Módulos por instalación (`modulos.js`, `moduloActivo(clave)`): cada función grande se prende o apaga al publicar (archivo o `VITE_MODULOS_APAGADOS`); apagado = no se ve, los datos quedan | Pedido de Leandro: que Terreno (y después Muebles) se puedan desactivar donde no importan, controlado por un superadmin. Sin usuarios todavía, se eligió la opción A (por instalación); `moduloActivo` es el único punto de decisión para enchufar después permisos por usuario (opción C, Firebase Auth). Módulo que no está en el archivo = apagado. |
| 2026-10-27 | Uniones como paso aparte (`aplicarUniones`) dentro de `generarEstructura(params, aberturas, catalogo)`: después de marcar los perfiles de pared y antes de las ediciones a mano. Jerarquía por rangos en 3 redes (pared, piso, piso2); el cruce se detecta por geometría (ejes a menos de 1,5 cm, casi perpendiculares) y se saca [t − mitad, t + mitad] | Leandro: en el taller se arma una red soldada, no piezas encimadas. Por geometría sirve para cualquier pieza sin casos especiales; rangos por red para que una columna no se corte con un borde del entrepiso. Sin catálogo (tests viejos), eje a eje. Medida vista = ala (b) de C/U, lado del cuadrado, b del rectangular (supuesto a validar con el herrero). Proyectos viejos migran a 'red' (es la corrección pedida). |
| 2026-10-27 | Jerarquía de uniones elegible: por obra en 4 pares (`params.uniones.enteras`) y por abertura (`marcoEntero`); el tipo de cruce (X, T, esquina) se deduce de la geometría y solo en los pares invertibles (soleras/columnas, bordes/tirantes, dintel/jamba de la misma abertura) la pieza que termina puede quedar entera y cortar a la que pasa | Pedido de Leandro (nivel "por obra + por abertura"). Con la regla de la T, una faja que termina en una jamba nunca parte la jamba aunque las fajas "ganen", y la entera llega hasta la cara de afuera (largo real de compra). |
| 2026-10-27 | Cambios a mano en dos pasos: sobre piezas enteras ANTES de las uniones, sobre tramos (`id~n`) después | Leandro: al borrar una columna las soleras quedaban cortadas con el hueco. Así la red se arma con lo que realmente queda. |
| 2026-10-27 | Al abrir un link de la nube que ya está en Mis proyectos, se compara la versión (rev): si la guardada es igual o más nueva, se abre la guardada | Leandro perdía el terreno: el link de ver no se actualiza y se recargaba solo, pisando lo guardado. |
| 2026-10-28 | Tirantes/transversales: 'tirantes' | 'transversales' | 'apoyados' en `uniones.enteras`. Con transversales enteros o apoyados, cada fila de transversales se genera como UNA pieza; apoyados = los tirantes no participan de la red del piso, suben (alto transversal + alto tirante)/2 y se alargan media medida del borde en cada punta | Decisión de Leandro (las 3 elegibles). El alto sale de la "a" del perfil (`medidaAlto`). |
| 2026-10-28 | Zapatas como `params.zapata` (activa, lado, alto, profundidad desde el terreno al fondo) y dos insumos fijos (hormigón m³, excavación m³) | Decisión de Leandro: medidas + presupuesto. Insumos fijos: los catálogos viejos los reciben con el precio de ejemplo en el primer proveedor. |
| 2026-10-28 | Alero por lado de la casa (A–D) y no por "bajo/alto/costados"; el techo los traduce a s (faldón) y d (a lo largo del lado bajo). Vigas extienden s, correas extienden d; el panel siempre cubre todo | Decisión de Leandro (por lado + elegir vigas y correas). Así el alero no cambia de lugar si se cambia hacia dónde cae el techo. |
| 2026-10-31 | Ejes en `params.ejes` { modulo, vigasSobreColumnas, pilotinesBajoColumnas }. La grilla del módulo se mide desde la esquina de menor x y menor z (no desde la punta 1 de cada pared), así frente y fondo quedan alineados; vigas y tirantes = líneas del módulo subdivididas parejas a no más de su separación | Decisión de Leandro (vigas sobre columnas, columnas sobre pilotines, modulación única). Las columnas del borde del entrepiso siguen su propia separación. |
| 2026-10-31 | Sol: posición con las fórmulas de la NOAA (sin librerías); fecha/hora/animación son de la sesión (no del proyecto) y el lugar (lat/long/huso) sí; sombras con una DirectionalLight y shadowMap prendido desde el arranque (prenderlo después obliga a recompilar materiales); las aberturas no tiran sombra (entra el sol); sin terreno, un piso claro recibe las sombras | Decisión de Leandro (fecha y hora + ▶ animación del día). Sobre el fondo oscuro una sombra negra no se veía. |
| 2026-10-31 | Con modulación, los pilotines usan su propia grilla de fábrica (opciones: cada 2 módulos, cada cruce) | Leandro: un pilotín en cada cruce o bajo cada columna sobredimensiona. |

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
- **Columnas** (antes "verticales"): verticales principales de la pared, con su separación a lo largo de cada pared.
- **Montante**: vertical liviano entre columnas, para fijar el revestimiento. En una abertura se parte en
  **montante de dintel** (arriba del vano) y **montante de antepecho** (abajo de la ventana).
- **Horizontales (fajas)**: perfiles en altura donde se fijan los paneles.
- **Vano**: el hueco de una abertura. **Dintel**: horizontal arriba del vano. **Travesaño de antepecho** (antes
  "alféizar", que es la repisa del albañil): horizontal debajo de la ventana. **Jamba**: vertical a cada lado del
  vano, de piso a solera (si hay una columna a menos de 10 cm, la columna hace de jamba).
- **Solera superior**: perfil de arriba de la pared (sigue la pendiente). **Marco de piso**: perfil perimetral del piso.
- **Riostra en cruz** (cruz de San Andrés): dos diagonales entre dos verticales para rigidizar.
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
- 2026-10-16 v1.15.0: tarjeta Materiales, revestimientos a medida / en placa, ubicación, revestimiento interior, duplicar aberturas.
- 2026-10-18 v1.16.0: medir, aberturas desde el 3D, copiar/pegar, duplicar piezas, juntas de paneles, planta de la escalera, versión visible.
- 2026-10-19 v1.17.0: aberturas dentro de cada pared con etiqueta, montantes, riostras de pared, jambas de piso a solera, glosario unificado.
- 2026-10-19 v1.18.0: pestañas, deshacer/rehacer, celular con barra abajo y menú ⋯.
- 2026-10-19 v1.18.1: valor inválido queda a la vista (Esc vuelve), aviso al cerrar con cambios, encabezado del celular en un renglón.
- 2026-10-20 v1.19.0: casillas en vez de "0 = sin", diálogos propios, leyenda agrupada, texto más legible, ayuda "?" y bienvenida.
- 2026-10-20 v1.20.0: cortes compartidos entre renglones del mismo perfil (en el ejemplo, 2 barras menos; en la casa de Leandro, 13 → 12 en el 80x80).
- 2026-10-20 v1.20.1: aviso único por perfil con precios distintos y botón "Usar $X en todos" (casa de Leandro: C 80x40x1.6 de 43 a 39 barras, desperdicio 10,8 % → 1,6 %).
- 2026-10-20 v1.21.0: lista de perfiles (tipo, medidas, barra, precio, peso) y cada parte elige su perfil; peso total del hierro.
- 2026-10-20 v1.22.0: perfiles por pared (columnas, fajas, montantes, marcos), columnas de esquina con renglón propio, patrón alternado con montantes.
- 2026-10-20 v1.22.1: la copia de Columnas en "Columnas de esquina" no vota el precio al migrar; aviso de precio visible aunque esté plegado.
- 2026-10-20 v1.23.0: precio de los revestimientos también en Materiales (por m² o por placa).
- 2026-10-20 v1.24.0: paneles con huecos de las aberturas en el 3D, descontar aberturas en tiras y placas, opacidad de las juntas.
- 2026-10-23 v1.25.0: proveedores, precios en efectivo/tarjeta por proveedor, comparar presupuestos y "lo más barato de cada material".
- 2026-10-23 v1.26.0: pestaña Planos (paredes y plantas acotadas, listas de corte, revestimiento), en el PDF y en Excel.
- 2026-10-25 v1.30.0: link compacto (la mitad) y links cortos en Firebase para ver/editar que guardan los cambios.
- 2026-10-31 v1.37.0: módulo Sol (motor/sol.js, PanelSol, luz con sombras) y pilotines con módulo elegibles (ejes.pilotinesModulo).
- 2026-10-31 v1.36.0: pilotines redondos/cuadrados y ejes (motor/ejes.js: modulación, vigas sobre columnas, pilotines bajo columnas).
- 2026-10-28 v1.35.1: aleros por lado (params.alero A–D, aleroVigas, aleroCorreas; alerosDelTecho).
- 2026-10-28 v1.35.0: tirantes/transversales en 3 formas (enteras.tirantesTransversales) y zapatas (params.zapata).
- 2026-10-27 v1.34.3: terreno por partes en Capas (8 casillas) y opacidad del terreno.
- 2026-10-27 v1.34.2: panel de capas cerrado al entrar, recordado por navegador, Esc lo cierra.
- 2026-10-27 v1.34.1: no se pisa lo guardado al reabrir un link de la nube; borrar una columna rearma la red.
- 2026-10-27 v1.34.0: jerarquía de uniones elegible por obra (4 pares) y por abertura (marco); cruces X / T / esquina.
- 2026-10-27 v1.33.1: grupo Etiquetas en Capas (paredes, aberturas, terreno) para sacar todos los carteles del 3D.
- 2026-10-27 v1.33.0: uniones en red (motor/uniones.js), fajas cortadas en los vanos, perfil propio del marco de cada abertura.
- 2026-10-27 v1.32.0: terreno e implantación (motor/terreno.js, terreno3d.js, PanelTerreno, PlanoImplantacion).
- 2026-10-27 v1.31.0: Presupuesto en sub-pestañas (Lista de materiales, Por proveedor, Cortes, Precios y detalle) con el total de la obra arriba; listaDeMateriales en proveedores.js.
- 2026-10-27 v1.30.4: ficha de cada material en el pedido (fichaDePerfil en perfiles.js; cantidadPedida en proveedores.js).
- 2026-10-27 v1.30.3: plan de compra agrupado por material (materialesDeCompra) + "Copiar pedido" por proveedor (textoPedido).
- 2026-10-27 v1.30.2: el total de la obra es el del plan de compra (con varios proveedores); el de un proveedor queda como referencia.
- 2026-10-25 v1.30.1: configNube.js apunta al proyecto Firebase `pollo-calculator` (links cortos activos tras el deploy).
- 2026-10-24 v1.29.0: flete por proveedor, plan de compra con flete, "más barato en", accesorios, "no lo vende".
- 2026-10-24 v1.28.1: total completo en la pestaña Presupuesto.
- 2026-10-24 v1.28.0: imprimir/exportar con selección (PDF 3 hojas, Excel 4), cotas y medidas fijas en el 3D, bordes de pisos y techo con perfil propio, piso 2 con altura elegible y columnas propias (fila del medio, hasta el piso 2), travesaños de abertura.
- 2026-10-24 v1.27.0: separaciones por medida o por cantidad, resaltar en el 3D (mouse y 👁), botones "Eliminar" y carteles con ✕ arriba y acciones abajo.
- Nota: el elemento `id="flonnect-my-app"` que aparece en la página no es de la app: lo inyecta la extensión Flonnect (grabador de pantalla) de Chrome.
