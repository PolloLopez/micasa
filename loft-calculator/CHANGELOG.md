# Changelog

## [1.95.0] - 2026-11-25
### Agregado
- **Los dos altos medidos en obra** (Leandro: "necesito poner el alto de las paredes manualmente, al igual que la
  inclinación del techo"). En Estructura → Planta: "Altura (lado bajo)" y **"Altura (lado alto)"**; la pendiente del
  techo sale sola. Cambiar un alto deja el otro como estaba. Abajo dice la pendiente en % y en grados (y en Techo, el
  campo de la pendiente también los grados). `pendienteParaAltos` y `gradosDePendiente` en geometria.js.

## [1.94.0] - 2026-11-25
### Arreglado
- **La leyenda "Por perfil" contaba tramos, no piezas** (Leandro: "ni en pedo tengo 34 piezas de 80x80 ni 92 de
  80x40"). Una transversal de piso cortada por 12 tirantes eran 13 "piezas". Ahora dice las piezas enteras y, aparte,
  en cuántos pedazos quedan al cortarlas en los cruces: con su archivo del 25/11, 80×80 "27 piezas (34 cortadas en
  los cruces) · 140,4 m" y C 80×40 "41 piezas (92 cortadas en los cruces) · 165,9 m" (las 4 transversales de piso
  van en 13 pedazos cada una). Las barras a comprar no cambian: 30 de 80×80 (6 m) y 19 de C (12 m).
### Notas (revisión de su archivo, para decidir)
- Las piezas agregadas tienen coordenadas fijas: al pasar el ancho de 4,50 a 4,80 m, agr:7 y agr:8 (soleras de 7,58 m
  en el Vecino) quedaron 15 cm adentro de la pared, y agr:10 y agr:11 (tirantes 80×80) siguen de 4,41 m. Ver PENDIENTES.
- La ventana nueva del Frente (ref:1795630235522) tiene el travesaño de antepecho a 1,65 m, en el mismo lugar que la
  faja: 1,78 m de C contados dos veces.

## [1.93.0] - 2026-11-25
### Agregado
- **El avance de un trabajo puede salir del Armado** (Leandro: "Zopapa me dice 0 % hecho, cuando ya registré caños
  instalados, que fueron por él"). En Obra → Avance y contratistas, cada trabajo tiene "El avance sale del Armado
  (fierros puestos: hoy N %)": el % hecho es el de los metros de hierro puestos (sin madera, mesadas ni tabiques) y se
  pone al día al marcar fierros (`porcentajeDeHierros`, `conAvanceDelArmado`).
- **A futuro** (Leandro: "los ladrillos y varillas para el tapial son una idea, no será un gasto próximo; las placas
  fenólicas sí serán próximas"):
  - Fundación → Tapial: "A futuro" saca sus materiales (cemento, arena, piedra, varillas, ladrillos) y el portón del
    presupuesto y los muestra aparte; "…pero las placas fenólicas se compran ya" las deja (con sus tirantes). En su
    proyecto: de 101 a 16 bolsas de cemento, $ 33,3 M → $ 31,9 M.
  - Presupuesto → Mano de obra por segmento: columna "A futuro" (no suma; se lista abajo del precio). Con el tapial:
    $ 31,9 M → $ 25,9 M.
  - Lista de compras: "Se lo compro a… → A futuro" en cada renglón, y "Toda esta parte a futuro" en cada parte. No
    entra en el total ni en lo que falta; arriba, "A futuro (no suma)" con lo que costaría.

## [1.92.0] - 2026-11-25
### Arreglado
- **La lista de compras no sumaba lo comprado por material** (Leandro: "cargué 12 perfiles que compré, debería
  recalcular en los que cargué y los necesarios para ver si realmente siguen faltando"). Lo comprado contaba solo en el
  renglón donde se marcó. En su proyecto, los 12 C 80×40 estaban anotados en "Marcos de aberturas", un renglón que ya no
  existe, y no contaban en ninguno. Ahora lo comprado es del material: primero cubre su renglón y lo que sobra cubre los
  demás de ese perfil (`repartirPorMaterial`). La fila dice "N de compras de otro renglón del mismo material".
### Agregado
- Arriba de la lista de compras, **Por material**: lo que lleva la obra, lo comprado y lo que falta o sobra
  (`resumenPorMaterial`). En su proyecto: 80×80 lleva 27, comprado 12, faltan 15; C 80×40 (barra de 12 m) lleva 13,
  comprado 12, falta 1.

## [1.91.0] - 2026-11-24
### Agregado
- **Para el proveedor de paneles, los 5 paños a revestir** (Leandro: "no necesito mostrarle la estructura de hierros,
  solo los 5 paneles para revestir"; "el selector tiene juntos piso, entrepiso y techo, y el techo lo debe
  presupuestar, piso y entrepiso no"). En Planos, "Para el proveedor de paneles" muestra las 4 paredes y **el techo
  como un paño más** (largo × faldón, con el alero, sus tiras y el plano de cada una), sin implantación, plantas ni
  instalaciones. En Imprimir hay una opción aparte, **"Techo: el panel con sus tiras"**, y el botón "Para quien cotiza
  paneles" la prende (sin "Piso, entrepiso y techo", que es la estructura). `vistaDelTecho` en planos.js.
- **Con o sin los cortes de las aberturas** (Leandro: "poder seleccionar si agrega los cortes de abertura, o no"): en
  Planos (para el proveedor) y en Imprimir, "Tiras enteras (las aberturas se cortan en obra)". Las tiras salen sin el
  recorte de la ventana ("entera (la abertura se corta en obra)"); el dibujo de la pared igual muestra dónde va.
  Solo cambia lo que se le muestra al proveedor: el presupuesto sigue con lo cargado en el panel.

## [1.90.0] - 2026-11-24
### Agregado
- **El techo en "Solo paneles"** (Leandro: "la solera superior es el mismo borde del techo que es el alero… debería
  poder seleccionar esos cambios y reutilizaciones de tiras"): cada pedazo del techo dice de qué tira sale (T1, T2…), y
  tocándolo se ve su tira, como en las paredes. Con "🏠 Adentro" prendido, el techo se oculta al mirarlo de arriba.
- **Elegir de qué tira sale un pedazo, tocándolo en el 3D**: en el panel de la tira tocada (pared o techo), "Pedazo de
  5,03 m: sale de la tira T5" con la lista de tiras (qué lleva cada una y cuánto sobra) o "que la elija la app". Sirve
  para mandar un pedazo del techo al sobrante de una pared y al revés. `destinosDeTiras` y `cambiarTiraManual` pasan al
  motor (los usan la hoja de corte y el 3D); `tiraDeCadaPedazo` devuelve también `tirasPorPared`.
### Notas
- La solera de arriba ya es el borde del techo: en su proyecto "techo con borde" está apagado, así que no hay un
  borde de techo aparte (no se cuenta dos veces el hierro) y los paneles de pared llegan hasta la solera.
- "Reusar el corte en diagonal" (B y D en pendiente) quedó en PENDIENTES: para que un corte en diagonal sirva a dos
  tiras, una va dada vuelta 180°, y eso pone el encastre del lado equivocado. Ahorra ≈ 10 cm de tira por par.

## [1.89.0] - 2026-11-24
### Agregado
- **Elegir varias piezas y marcarlas puestas de una vez** (Leandro: "seleccionar varias para registrar como
  instaladas, más rápido… manteniendo apretado Shift"). En el 3D, **Shift + clic** suma o saca una pieza (se ve
  blanca y celeste); en el celular, el botón **☑ Varias** hace lo mismo con cada toque. Arriba aparece "N piezas
  elegidas · metros · cuántas ya puestas" con **✓ Marcar puestas**, Medida ✓, Sacar "puesta" y Soltar (o Esc).
### Notas
- Pregunta de Leandro: "¿en los cruces está descontando la barra entera?". No: en cada corte se saca el ancho de la
  otra pieza (4 cm el C 80×40 de canto) más la luz de Uniones (5 mm de cada lado). Ej.: la transversal de 7,50 m
  cortada por 12 tirantes y los 2 bordes queda en 13 tramos que suman 6,81 m.

## [1.88.0] - 2026-11-24
### Agregado
- **Cada cruce, uno por uno** (Leandro: "debería poder ingresar dónde se une y dónde no, en cada cruce, no en general.
  También para poder ponerlo debajo del otro fierro. Me pasa en Transversal de piso"). Tocando un hierro en el 3D,
  **Sus cruces (N)**: con qué pieza y a cuántos metros, qué pasa hoy y para elegir: se corta esta o la otra, **una va
  debajo de la otra** (las dos enteras; la que se mueve baja o sube lo que miden las dos / 2) y cómo se une ese cruce
  (soldada, cubrejunta, chapa). "a todas" lo copia a sus cruces con ese tipo de pieza. En el 3D, un punto por cruce
  (rojo, verde, violeta): tocarlo marca su fila. `params.crucesElegidos` (`crucesElegidos.js`), lo aplica
  `aplicarUniones` (y `ponerDebajo`); cada pieza trae `cortesCon` y la estructura `crucesDePiezas`.
### Arreglado
- **Las piezas agregadas que se movían o editaban desaparecían del presupuesto y de la hoja de corte** (Leandro: "Borde
  de piso 7,58 m… no está unida"): al editarla, la pieza se armaba de cero y perdía su renglón (`insumo`). En su proyecto,
  12 de las 13 agregadas (soleras de 7,58 m, horizontales, tirantes 80×80, la zanca…) no se compraban: ahora suman
  6 barras de 80×80 y 1 de C 80×40. También se conservan madera, esquina, nivel, etc. (`aplicarEdicion`).
- Una agregada con un perfil de la lista elegido a mano va con ese perfil (antes, con el de su renglón): `compraDePieza`,
  `perfilDePieza` (planos) y el presupuesto.
### Notas
- "No está unida": en la versión que tenía abierta (v1.86) el borde era C 80×40 y el C tiene barra de 12 m en
  Materiales, así que entraba entero. En la v1.87 es 80×80 (barra de 6 m) y sale empalmado (1.1a + 1.27c).

## [1.87.1] - 2026-11-24
### Cambiado
- **Piezas a mano → Editadas: si le cambiaste el perfil, la fila lo dice** ("C 80×40 → 80×80") y los detalles muestran
  el perfil con el que queda (antes, el de antes de editarla, y parecía que no se había aplicado). Leandro: "edité
  perfiles que ahora son de 80×80 y no se actualizaron los colores". Con su archivo, en la v1.87.0 los bordes de piso
  A, B y D ya salen en 80×80 (color, precio y lista); en la v1.86.0 seguían como C 80×40: si los ve del color viejo,
  el navegador tiene la versión anterior (mirar la versión arriba, al lado del nombre, y recargar).
- `abreviarPerfil(nombre)` en coloresPerfil.js (antes, dentro de `nombreCorto` de PerfilesDeLasPartes).

## [1.87.0] - 2026-11-24
### Arreglado
- **El perfil elegido a mano en una pieza no se aplicaba si su pared tenía un perfil propio** (Leandro: "tampoco
  actualiza el color de mi pieza editada"): el perfil de la pared (Paredes → soleras, columnas, fajas, montantes) lo
  pisaba después, y la pieza seguía con el perfil, el precio y el color de antes. En su proyecto, dos soleras agregadas
  elegidas en 80×80 seguían como C 80×40. Ahora lo elegido en la pieza manda (`marcarPerfilesDePared`).
### Cambiado
- **Editar una pieza → Perfil**: botones con los perfiles de trabajo (80×80, C 80×40), "El de su tipo o pared" (con
  cuál es) y "otro…" para el resto de la lista (antes, un desplegable con los 17 perfiles). Leandro: "quiero elegir
  entre los materiales".

## [1.86.0] - 2026-11-24
### Agregado
- **Cruces y empalmes pieza por pieza** (Leandro: "seleccionar cuáles son enteras y cuáles quedan unidas en los cruces,
  como así también dónde están empalmados los hierros"). Tocando un hierro en el 3D:
  - **Entera en sus cruces**: pasa de largo y las que cruza se cortan contra ella (manda sobre la regla de su tipo,
    dentro de su red; si las dos están marcadas, decide la regla). `params.piezasEnteras`; `relacion` en uniones.js.
  - **Donde se corta, va**: soldada a tope (la de siempre), con **cubrejunta** o con **chapa**: las dos últimas suman
    al presupuesto una por cada cruce donde se corta (`params.unionesPieza`; renglones Cubrejuntas y Chapas de unión).
  - **Empalme**: dónde está (tramos y si cae sobre un apoyo), **moverlo** (a cuántos metros de una punta) y **"Ya
    está hecho así"**; "↶ automático" vuelve a la cuenta de la app. Si un tramo no entra en la barra, avisa y sigue la
    automática. `params.empalmesPieza`; `empalmeElegido` en el optimizador de cortes.
  - En el 3D, cada empalme con una marca (naranja: lo eligió la app; celeste: elegido a mano).
- En **Estructura → Piezas a mano**, "Cruces y empalmes elegidos" con "Deshacer" (y entra en el buscador).
### Arreglado
- Si la pieza elegida en el 3D cambia de id (un tramo que, al quedar entero, pasa a ser la pieza entera), la ficha
  sigue mostrándola (antes se cerraba).

## [1.85.0] - 2026-11-24
### Arreglado
- **Los colores "Por perfil" cambiaban solos** (Leandro: "no actualiza los colores de las piezas"): el color de cada
  perfil salía de su lugar entre los perfiles EN USO, así que al dejar de usar uno (ej. pasar los tirantes a 80x80) los
  demás se corrían de color. Ahora sale de su lugar en la lista de perfiles (Materiales), que no cambia.
- Dos perfiles en uso ya no comparten color (la lista de Leandro tiene 17 perfiles y la paleta 12: el 80x80 y el
  Montante PGC salían los dos rojos).
### Agregado
- **Elegir el color de cada perfil**: tocando su cuadradito en la leyenda del 3D (se recuerda en este navegador).
- En **Capas → Estructura**, con "Por perfil" prendido, un aviso: el color de los hierros lo da su perfil (por eso
  cambiar el color de Columnas o Vigas no se ve), se cambia en la leyenda o apagando "Por perfil".

## [1.84.0] - 2026-11-24
### Agregado
- **Buscador** (pedido de Leandro: "en piezas eliminadas y editadas necesito un buscador, y fijate dónde más sirve"):
  palabras sueltas, en cualquier orden, sin importar mayúsculas ni tildes, y medidas con coma o punto ("columna frente
  4,33"); dice cuántas quedan ("17 de 166"). Está en:
  - **Estructura → Piezas a mano** (agregadas, editadas y eliminadas juntas);
  - **Obra → Armado** (pared, tipo, medida, código de corte y estado: "falta techo", "puesta", "verificada");
  - **Obra → Lista de compras** (material, parte de la obra o proveedor);
  - **Presupuesto → Precios y detalle** (nombre, perfil o para qué es);
  - la **ficha de cada proveedor** (sus materiales).
  (`motor/buscar.js`: coincide, filtrarPor; `componentes/Buscador.jsx`.)
### Cambiado
- Con una búsqueda escrita, "Deshacer todas las ediciones" y "Restaurar todas" no se muestran (para no deshacer lo que
  no se ve).

## [1.83.0] - 2026-11-23
### Agregado
- **Armado en obra** (Leandro ya empezó a construir: "marcar qué fierros fueron ya instalados y confirmar medidas"):
  - **Obra → Armado**: los fierros por zona (cada pared, piso, entrepiso, techo, escalera…) y por tipo, con
    **Puesta** y **Medida ✓** en cada pieza, **✓ Todo puesto** por tipo o por zona entera, el avance (piezas, metros y %)
    y "Ver solo lo que falta poner".
  - **Medida real**: si lo medido en obra no coincide, se carga y la pieza queda de esa medida en el 3D, los planos y
    los cortes (el motor la aplica al final, después de las uniones; la punta del inicio queda fija). "↶ la del plano"
    vuelve a la calculada.
  - En el 3D, al tocar una pieza: **Instalada**, **Medida verificada** y **Medida real**. Botón **🏗 Avance**: lo
    puesto en verde y lo que falta en gris, con un cartel de cuánto va.
  - Se guarda con el proyecto (`params.avancePiezas`; motor/armado.js).
- **Alargar piezas**: en "Editar", cada punta se acorta o se alarga (número negativo, hasta 3 m); las verticales se
  pueden subir o bajar más allá de la original. Para agregar una pieza: Duplicar una parecida y ajustarla.
- **Qué perfil lleva cada parte del piso** (Estructura → Pisos y entrepiso): una fila por parte (borde, tirantes,
  transversales, columnas del entrepiso, vigas de cierre…) con sus piezas y metros, un botón por cada uno de los dos
  perfiles de trabajo (los más usados por la estructura: 80×80 y C 80×40) y "otro…". Avisa las piezas de esa parte con
  otro perfil elegido a mano (ej. los 7 bordes que iban como Columnas) y las pasa al de la fila con un botón.

## [1.82.2] - 2026-11-20
### Arreglado
- **El plano de cada pared muestra las tiras igual que el 3D**: con el panel por tira entera, dibuja cada pedazo (también
  los de arriba y abajo de una ventana) con la tira de donde sale (T1, T2…), los mismos números que el 3D ("Solo
  paneles") y la hoja de corte. Antes numeraba las columnas de tiras (1 a 8), que no es lo mismo. Las tres pantallas
  usan la misma cuenta (`tiraDeCadaPedazo` en revestimientos.js).
- En el plano, las juntas de los paneles ya no cruzan las ventanas (como en el 3D).

## [1.82.1] - 2026-11-20
### Agregado
- **En "Comparar" se elige**: cada casillero es un botón; tocarlo usa esa forma (sin recortes, recortes en la misma
  pared o en cualquier pared; descontando aberturas o todo entero) en el presupuesto, la hoja de corte y el 3D
  (`revestimiento.recortes`: 'pared' | 'entreParedes' | 'ninguno'). La diferencia es contra lo elegido.
- **"Usar el sobrante en…"** en cada tira con sobrante que sirve (Presupuesto → Cortes): lista los pedazos de cualquier
  pared que entran y los pasa a esa tira. Así se elige en qué pared va cada recorte.
- Con "recortes en cualquier pared", la hoja de corte junta todas las paredes y cada pedazo dice de qué pared es.
### Arreglado
- La comparación no tomaba en cuenta lo elegido a mano (ahora compara las formas automáticas).

## [1.82.0] - 2026-11-20
### Agregado
- **Comparar cómo cortar las tiras enteras** (en la ficha del panel): una tira por pedazo (sin usar recortes, con
  todo el desperdicio), usando los recortes en la misma pared (lo que calcula el presupuesto) o entre paredes; cada
  una descontando aberturas o todo entero, con las tiras y la plata y la diferencia (`comparativaDeTiras`).
- **Mover los recortes**: en Presupuesto → Cortes, cada pedazo tiene **"sale de…"** para elegir de qué tira cortarlo
  (de su pared, de otra o una tira nueva); los que quedan en "solo" los acomoda la app en lo que sobra. Si no entra,
  avisa. "Volver a lo automático" borra lo elegido (`tirasManuales` en el revestimiento; `pedazosConLugar`).
- En **"Solo paneles"** cada pedazo dice de qué tira sale (T1, T2…; en celeste, los elegidos a mano).
- **Cuál queda arriba de cuál** (`encimadosDePano`), en el 3D (con "Juntas") y en el plano de cada pared:
  - en **naranja**, el empalme vertical: el tramo de arriba va por fuera del de abajo, con los cm que se encima;
  - en **verde**, el encastre: el costado de la tira que monta sobre la de al lado (ancho total − ancho útil; hace
    falta cargar el ancho total del panel).
  - Con "Solo paneles", un cartel explica los colores.
### Cambiado
- Las juntas horizontales de un panel por tira entera van donde termina la tira (antes, en el largo máximo).
- En la hoja de corte de las tiras: "se usa entera" (sin sobrante), "sobra X (sirve)" o "(se tira)".
- **El tapial arranca apagado en el 3D** (tapaba la casa): se prende en Capas → Terreno → Tapial.

## [1.81.0] - 2026-11-20
### Agregado
- **Proveedores que cotizan en dólares** (ALPANEL): en su ficha, "Cotiza en: Dólares" y el **dólar** (pesos por US$ 1,
  a mano). Sus precios se cargan en US$ (con centavos: "300,50") y debajo dice cuánto da en pesos; el presupuesto, el
  plan de compra y la lista de compras usan los pesos. El flete sigue en pesos. Los de antes quedan en pesos.
  (`precioEn` convierte, `enDolares`, `aPesos`, `leerPrecio` en proveedores.js.)
- **Revestimiento cobrado por tira entera** de largo fijo (Materiales → Revestimientos → "Se cobra: por tira entera"):
  los pedazos de cada pared se acomodan en tiras enteras (como las barras de hierro) con los recortes en la misma pared;
  el precio va por tira. Si compartiendo los recortes entre paredes se compraría menos, el renglón lo dice. En
  Presupuesto → Cortes, cada tira con los pedazos que salen de ella y lo que sobra, pared por pared (`tirasEnteras`).
- **Vista "Solo paneles"** en el 3D: los revestimientos con sus juntas (dónde termina cada tira y cada tramo) y las
  aberturas, sin hierros, OSB, muebles, terreno ni personas.
### Cambiado
- En "Precios y detalle", el precio de un proveedor en dólares no se edita (se ve en pesos): se carga en US$ en Materiales.

## [1.80.0] - 2026-11-20
### Agregado
- **Tapial encadenado** (Estructura → Fundación, obra civil y terreno → Obra civil): un **pilotín bajo cada columna**
  (ø 0,20 x 1,50 m de fábrica, editables) unidos por la viga de fundación, columnas cada X m, encadenado y el muro.
- **Ladrillo a elegir** para el tapial: hueco 8, 12 o 18, común o bloque de hormigón (cambia cuántos van por m² y el
  mortero; cada uno con su renglón en el presupuesto).
- **Encofrado con placas fenólicas propias**: las placas (1,22 x 2,44, 18 mm, +15 % de cortes) y los metros de tirante de
  pino 2" x 3" para encofrar N tramos entre columnas a la vez (de fábrica 2; se reusan). O "no lo cuento" si es prestado.
- **"Según el albañil"**: al lado de lo calculado del tapial (cemento, arena, piedra, hierro, ladrillos, fenólicos,
  tirantes) se carga lo que dijo él; manda en el presupuesto, la lista de compras y el pedido para cotizar, y el
  renglón lo dice ("el tapial, según el albañil"). 0 = vuelve a lo calculado.
- **Dosificación "como la dice el albañil"**: 1:2:3, 1:2:2, 1:3:3 o 1:3:4 para el hormigón y 1:4, 1:3 o 1:5 para el
  mortero; elegirla completa los kg y m³ (valores aproximados, a validar).
- **Portón corredizo** en el tapial: lado, distancia desde la esquina, ancho y alto. El hueco no lleva muro ni encadenado
  (la viga de fundación sigue, el riel va encima; una columna más). Lleva el **bastidor de caño 40x40** con su hoja de
  corte (marco, travesaño y un montante por metro), la **chapa o el metal desplegado** (a elegir), el **riel** y los
  **herrajes** (ruedas, guía con rodillos, topes, cerradura). Va en la parte "Tapial" de la obra. Se ve en el 3D (la
  hoja gris) y en el plano de implantación.
- **Capa "Tapial"** en el 3D (Capas → Terreno): se apaga aparte (antes iba con "Construcciones").
### Cambiado
- El pedido para cotizar dice el largo de las barras ("4 barras de 6 m").
- Los tapiales que ya estaban cargados suman los pilotines y el encofrado de fábrica (se destildan en la tarjeta).

## [1.79.1] - 2026-11-20
### Agregado
- **"📋 Copiar pedido para cotizar"** en cada parte de la obra (Obra → Partes de la obra): copia lo que lleva esa parte
  en texto, sin precios, para mandárselo por WhatsApp a cada corralón y comparar con la misma lista. Junta sus
  materiales (incluidos los agregados), lo de obra civil ya pasado a lo que se compra (bolsas de cemento, m³ de arena
  y piedra, varillas, ladrillos) y los extras de antes. La excavación no va (es trabajo). `textoParaCotizar` en
  motor/partesObra.js, con su test.
### Cambiado
- `BotonCopiar` pasó a su propio archivo (componentes/BotonCopiar.jsx) para usarlo en el Presupuesto y en Obra.

## [1.79.0] - 2026-11-20
### Agregado
- **Comparar presupuestos por parte de la obra** (Obra → Partes de la obra, en cada parte):
  - **Materiales con precio por proveedor**: "+ Material para <parte>" (ej. Ladrillo hueco 8 para el Tapial), con
    cantidad, unidad y el precio de cada corralón. Son accesorios con `parte` (se guarda con el proyecto) y entran al
    presupuesto, al plan de compra y a la lista de compras como cualquier material.
  - **Presupuestos de mano de obra**: "+ Presupuesto de mano de obra" (quién y cuánto cobra el total), con "el más
    barato" marcado. **Elegir** uno lo pasa al cierre (el segmento de esa parte, como monto total) y al seguimiento
    (el trabajo con quién lo hace). Cambiar el monto del elegido lo actualiza en los dos.
  - `motor/manoDeObraPartes.js` (cotizaciones en `seguimiento.cotizaciones`, validadas).
- **Desperdicio de placas editable**: Estructura → Pisos, "Recortes de placas (los 2 pisos)" en % (0 a 50; de fábrica
  10 %, los proyectos de antes también). Cambia las placas de OSB y los m² de machimbre (`params.desperdicioPlacas`).
- **Notas de ayuda en una línea** (`NotaPlegable`): las notas grises largas muestran la primera línea y "más ▾" para
  verlas enteras (84 notas de las tarjetas; los diálogos, los planos y el manual quedan como estaban). Al imprimir
  salen enteras.
### Cambiado
- **La lista de compras está solo en Obra** (estaba dos veces): el Presupuesto tiene el botón "🛒 Lista de compras (en
  Obra)" que lleva a esa sub-pestaña.
- **Las etiquetas del terreno arrancan apagadas** en el 3D (línea municipal, calle, pozo, pilar de luz): tapaban la
  casa. Se prenden en Capas.
- Los materiales que se agregaban por parte con precio único ("+ Agregar a…") se reemplazan por los de arriba; los ya
  cargados siguen, bajo "Extras con precio único (cargados antes)".
### Arreglado
- **Las tablas angostas se salían de costado** (`tabla-segmentos`: mano de obra, obra civil, instalaciones, equipos,
  comparativa de revestimientos y contratistas): con el panel de menos de 600 px cada renglón es una ficha con el
  nombre arriba y cada dato con su título.
- Elegir un presupuesto reconoce el segmento aunque lo hayas renombrado ("Pozo séptico-Jose", "Pilotines+Pilar"): antes
  creaba otro y esa mano de obra se sumaba dos veces.

## [Sin versión] - 2026-11-19
### Documentación
- PENDIENTES.md ordenado y limpio: solo lo abierto (de 588 a 140 líneas), agrupado por tema y prioridad, con "Lo que
  sigue" y "De tu lado"; se sacaron los ya resueltos que seguían abiertos (tabiques, aleros, norte, links de la nube,
  accesorios calculados, total a la vista) y se juntaron los repetidos. Lo resuelto y el detalle de cada pedido quedó
  tal cual en HISTORIAL-PENDIENTES.md (nada se perdió).

## [1.78.0] - 2026-11-18
### Cambiado
- **El aviso de lo que no tiene precio es una sola línea** ("⚠ 12 materiales sin precio en ningún proveedor · no están
  en el total · tocá para cargarlos"); antes la lista entera ocupaba media pantalla en el celular. Al abrirla, un
  botón por material (uno por material aunque lo usen varios renglones). También sale con un solo proveedor.
### Agregado
- **Cada material del aviso lleva a cargarle el precio**: cambia a Materiales, a la sub-pestaña que corresponde
  (Perfiles y cortes, Otros materiales o Revestimientos) y abre la ficha del material, a la vista y marcada. Usa el
  mismo foco que el 3D (`irAPrecio` en App; `plan.sinVendedor`; ListaPerfiles se abre con el foco).
- Lo que se trae a la vista ya no queda tapado por las pestañas y sub-pestañas pegadas arriba (`scroll-margin-top`).
- Cambiar de pestaña a mano suelta lo que quedó abierto desde el aviso o el 3D.

## [1.77.1] - 2026-11-18
### Arreglado
- **Los materiales que la app agrega a un proyecto que ya tiene proveedores quedan sin precio** (soleras PGU,
  tornillos, cinta, masilla, y antes cemento, arena, piedra…). Hasta ahora recibían su precio de ejemplo en el primer
  proveedor, como si fuera real (`conProveedores`: solo un proyecto sin proveedores, el de fábrica o de antes de v1.25,
  arranca con los de ejemplo).
### Agregado
- **Aviso de precios de ejemplo ya guardados**: en la ficha del proveedor, "⚠ N precios de ejemplo" con la lista y
  "Borrar los de ejemplo"; cada renglón y cada material lo marcan (`esPrecioDeEjemplo`, `preciosDeEjemplo`: mismo
  número que el de fábrica, sin precio con tarjeta y ningún otro proveedor lo tiene).
- En el proyecto de Leandro: 7 precios de ejemplo en centrosider.com.ar (tirantes de madera, cemento, arena, piedra,
  hierro ø8, ladrillo común, excavación). Borrándolos, el total pasa de $ 15.984.530 a $ 15.119.480.

## [1.77.0] - 2026-11-18
### Agregado
- **Precio por kilo**: cada hierro se puede cotizar en $/kg en cada proveedor (columna "o $/kg"); la barra sale de
  $/kg × kg/m × largo. Por barra y por kilo se excluyen (cargar uno borra el otro). En la ficha del proveedor, "¿Te
  cotiza el hierro por kilo?" pone el mismo $/kg a todos sus hierros. `precioBarraPorKg`, `conPrecioCambiado`.
- **Tirantes de madera por largo comercial**: en tablas de 3,05 / 3,66 / 4,27 / 4,88 m con el optimizador de cortes
  (antes, los metros justos). El renglón dice cuántas de cada largo y cuánto sobra (motor/maderaComercial.js).
- Hoja "Preguntas para el herrero y el durlero — Loft amueblado" (Claude Docs) con los valores del proyecto de Leandro.

## [1.76.0] - 2026-11-18
### Agregado
- **Compartir sin la parte de plata** (de fábrica): el link no lleva los trabajos y sus pagos, las compras, los
  contratistas ni las finanzas (créditos, acreedores). Medidas, materiales, precios y partes terminadas sí. Los links
  cortos de la nube recuerdan la elección y cada "Guardar" sube igual; al abrir tu propio link en tu compu se conserva la
  plata guardada ahí (proyecto/sinPlata.js: `sinLaPlata`, `conLaPlataDe`).
- **Tabiques de Durlock completos**: las soleras y el dintel van a "Soleras de tabiques" (PGU, perfil propio) y los
  montantes quedan en "Estructura de tabiques" (PGC). Renglones nuevos: tornillos T1 (por montante), T2, cinta y masilla
  (por m² de placa). Rendimientos editables en Paredes → Tabiques → "Tornillos, cinta y masilla" (de fábrica: 20 T2/m²,
  4 T1 por montante, 1,5 m de cinta y 0,9 kg de masilla por m²; a validar con el durlero). motor/durlock.js.
- **El OSB (o machimbre) del piso 2 descuenta el hueco de la escalera** cuando sube por adentro del entrepiso (las
  pisadas o descansos debajo del entrepiso sin los 2 m de paso libre). `huecoEnElEntrepiso` en escalera.js.
### Seguridad
- `npm audit fix`: vite 8.3.8 y source-map-js 1.2.3 (dos vulnerabilidades altas del servidor de desarrollo). 0 vulnerabilidades.

## [1.75.0] - 2026-11-18
### Cambiado
- **El 3D se dibuja solo cuando algo cambia** (antes, 60 veces por segundo siempre, aunque estuviera quieto u oculto:
  gastaba batería). El bucle sigue moviendo personas, perros, puertas y la cámara, pero dibuja solo si:
  React cambió algo del visor, se usó el mouse, la rueda o el teclado, cambió el tamaño, o se movió la cámara (girar,
  la inercia al soltar, primera persona) o alguien de la escena (personas, perros, puertas). Con "Ocultar 3D" o el
  celular en Datos no dibuja nada.
- Medido: con el proyecto de ejemplo quieto, 0 cuadros en 2 s (antes ~120); al soltar después de girar, la inercia
  dibuja unos 5 s y para. Con perros que deambulan (proyecto de Leandro) dibuja solo mientras se mueven (~12 por segundo en la prueba).

## [1.74.1] - 2026-11-18
### Arreglado (de la auditoría del 18/11)
- **Escribir en la pestaña Obra ya no recalcula toda la obra.** La causa de fondo: `conPanelesExistentes` armaba
  siempre un `paredes` nuevo, y eso anulaba `useSinCambiosSalvo` (v1.47): cada letra en una nota o un pago volvía a
  generar la estructura, el presupuesto, ~20 presupuestos de la comparación, los planos y el 3D. Ahora devuelve el
  mismo objeto si no hay nada que corregir (pasó a motor/presupuesto.js, con test). Además `aberturasValidas` depende
  de `paramsObra` (no de `params`).
- **Lista de compras**: el catálogo se resuelve una vez (`materialPorId`), no por cada renglón × proveedor.
- **Desplegables de perfil**: el texto de cada perfil se arma una vez (WeakMap) y Materiales guarda su catálogo con
  precios (`useMemo`): eran lo más lento del panel.
- **Comparación de proveedores**: se calcula diferida (`useDeferredValue`): al cambiar una medida primero se ve el
  cambio y la comparación se pone al día enseguida.
- **Comparación de proveedores y de revestimientos**: ahora dependen también del disco, el retazo y los empalmes
  (faltaban; no se notaba porque la obra se recalculaba de más por el error de arriba).
### Medido (proyecto real, 3D oculto, Chromium sin GPU)
- Una letra en Obra: ~250 ms → ~90 ms. Un cambio de medida: ~260 ms → ~150 ms. Con el 3D visible suma lo que tarda
  en dibujar un cuadro (en una compu con placa de video, mucho menos que en la prueba).

## [1.74.0] - 2026-11-18
### Agregado
- **Precios con fecha**: cada proveedor guarda cuándo se cargaron sus precios (se pone sola al cambiar uno). En su ficha
  dice "precios del 12/11 (hace 6 días)" y, si pasaron más de 30 días, ⚠ y el Presupuesto avisa arriba con qué
  proveedores. "Siguen iguales hoy" pone la fecha de hoy sin tocar los precios (`preciosAl`, motor/resumenPrecios.js).
- **↶ Deshacer** en la lista de compras: borra la última marca (Retirado / Pagado) de ese renglón; una compra cargada a
  mano no se toca (`ultimaDesdeLista`, `deshacerMarca`).
- **Mano de obra de cada parte**: en el seguimiento, cada trabajo elige su "Parte de la obra" (ej. Pilotines ↔ el trabajo
  de José). La parte muestra sus trabajos (quién, % hecho, pagado) y, si está terminada y el trabajo no llegó al 100 %,
  "Marcar el trabajo terminado". También se une o se separa desde la parte (`rubro.parteObra`, `trabajosDeLaParte`).
- **Compras en el PDF y el Excel**: la lista de compras por proveedor (con casilla para tildar a mano) y las compras
  hechas; opción "solo lo que falta comprar" para llevarla al corralón. Hoja "Compras" en el Excel (`informeDeCompras`).
- **Auditoría** de deuda técnica, rendimiento, UX/UI y seguridad en PENDIENTES.md (sin arreglos aplicados).
### Cambiado
- La barra de sub-pestañas queda **pegada debajo de las pestañas** al bajar (en la compu; en el celular no, para no tapar).
- Estructura: "**Fundación, obra civil y terreno**", con la Fundación primero.

## [1.73.0] - 2026-11-17
### Agregado
- **Sub-pestañas** dentro de cada pestaña (se ve una parte a la vez y se recuerda la última de cada una):
  - Estructura: Planta · Pisos y entrepiso · Escalera · Techo · Fundación y terreno (con la obra civil) · Piezas a mano.
  - Paredes: Paredes y aberturas · Mesadas · Tabiques · Muebles · Personas.
  - Materiales: Proveedores · Perfiles y cortes · Otros materiales (y los que agregás) · Revestimientos · Uniones.
  - Instalaciones: Instalaciones · Equipos.
  - Obra: Lista de compras · Compras hechas · Partes y extras · Avance y contratistas · Finanzas.
  Con un número al lado cuando tiene cosas (piezas a mano, mesadas, compras…). Lo elegido en el 3D pasa solo a su
  sub-pestaña (una pared → Paredes y aberturas; un piso → Pisos). componentes/SubPestanas.jsx (useSubPestana,
  subDeTarjeta, BarraSubPestanas, PanelSub).
### Cambiado
- **Una sola barra de sub-pestañas** para todo (también la del Presupuesto): chips en un renglón que pasan abajo si no
  entran (antes en el Presupuesto quedaba "Precios y detalle" sola en un segundo renglón).
- **Desplegables y campos con estilo oscuro en toda la app** (antes los que no estaban dentro de un formulario salían
  blancos del navegador: "Se lo compro a…", "+ Precio en otro proveedor", pagos…).
- **Lista de compras en el panel angosto o el celular**: cada renglón es una ficha (material y cantidad, estado, proveedor
  y los botones a lo ancho); antes "Marcar" quedaba afuera de la pantalla.
- Materiales: cuando un apartado es lo único de su sub-pestaña (Proveedores, Revestimientos) no repite el título ni se pliega.

## [1.72.0] - 2026-11-17
### Agregado
- **Lista de compras** (Presupuesto → sub-pestaña, y en Obra): cada material por proveedor y por parte de la obra, con su
  cantidad y estado (falta · retirado sin pagar · comprado y pagado · parte terminada). Se pone cuánto se retiró
  (puede ser una parte) y "Retirado" (queda como deuda) o "Pagado": la compra se anota sola en Compras hechas. "Pagar lo
  retirado" salda la deuda. Filtro: todo / lo que falta / retirado sin pagar. motor/listaCompras.js,
  componentes/ListaDeCompras.jsx.
- **"Se lo compro a…"** en cada renglón: otro proveedor o ninguno (lo consigo yo / ya lo tengo). El plan de compra y el
  total lo respetan (`planDeCompra(…, asignaciones)`, `NINGUNO`).
- **Proveedor nuevo desde el precio de un material** ("+ Precio en otro proveedor… → + Proveedor nuevo…").
### Cambiado
- **Precios de un proveedor** (su ficha): de fábrica solo lo que tiene precio ahí; "Ver también lo que no tiene precio" para
  cargar nuevos (antes el tilde era al revés).
- **Precios de un material**: solo los proveedores que lo tienen; los demás se suman desde "+ Precio en otro proveedor".
- **Perfil de una pieza** (editarla en el 3D): la lista de perfiles (Caño 80x80x2.0…), no los renglones donde se usa
  (`perfilLista` en la edición: la pieza se cotiza con ese perfil en un renglón "(editada a mano)").
- **Pieza elegida en el 3D**: primero el tipo, el largo y el perfil ("Solera superior · 7,58 m · Caño 80x80x2.0"), sin
  "Seleccionada:".
- El lint revisa variables sin definir (no-undef, con los globales del navegador).

## [1.71.0] - 2026-11-17
### Agregado
- **Revestimientos: "Descontar las aberturas"** (de fábrica sí). Sin tildar se piden tiras (o placas) enteras y los huecos
  se cortan en obra: sin rellenos ni sugerencias para correr ventanas. Cada revestimiento dice cuánto se ahorra
  descontándolas ("pedís 143,12 m² en vez de 145,07: te ahorrás 1,95 m² ≈ $ …"): lo que se arriesga si un hueco viene
  mal cortado. `costadoEfectivo` y `ahorroPorAberturas` en motor/revestimientos.js.

## [1.70.0] - 2026-11-17
### Agregado
- **Descartar un proveedor** (Materiales → Proveedores): no aparece más en el presupuesto, en "el más barato", en las
  listas de precios ni en el plan de compra. Queda abajo en "Descartados" con sus precios ("Volver a usar" o "Borrar
  del todo"). Si el presupuesto calculaba con uno descartado, pasa al primero que queda.
- **Partes de la obra** (Obra): Pilotines y zapatas, Piso, Paredes, Entrepiso, Cubierta, Escalera, Techo,
  Revestimiento, Mesadas, Tabiques, cada parte de obra civil (tapial, pilar, cámara, pozo) y cada instalación.
  "Terminada": sus materiales ya no faltan (la obra civil se recalcula sin esa parte). "+ Agregar a…": extras de
  la parte (ej. manguera de riego para el nivel, tanza) que suman al presupuesto y a la lista de materiales.
  motor/partesObra.js, componentes/PanelPartesObra.jsx.
### Cambiado
- "Falta comprar" usa el precio del plan de compra (donde conviene) cuando hay varios proveedores.
- La lista de materiales dice "✓ parte terminada" o lo que falta también sin compras cargadas.

## [1.69.0] - 2026-11-17
### Agregado
- **Compras hechas** (Obra): fecha, proveedor y renglones. Un renglón es un material de la lista del presupuesto
  (ej. 12 bolsas de cemento para Pilotines: descuenta cantidad y plata) o un ticket suelto (descuenta solo la plata).
  Queda pagada entera; si no, se marca cuánto falta. motor/compras.js, componentes/PanelCompras.jsx.
- **Presupuesto**: arriba "Ya gastado · falta comprar · debés"; la lista de materiales dice lo comprado de cada uno
  ("✓ todo" o "10 · faltan 12") y "Copiar lo que falta".
- **Contratistas**: una lista (nombre, oficio, teléfono); cada trabajo elige el suyo y abajo cada contratista agrupa sus
  trabajos con lo contratado, lo pagado y lo que falta, con "+ Trabajo para…". Los proyectos de antes arman la lista
  con los nombres de "Quién".
- **Marcar pagado todo** en cada trabajo (carga lo que falta como un pago de hoy).
### Cambiado
- Un rubro de materiales suma lo pagado en las compras hechas a ese proveedor (mismo nombre); las compras a otros
  proveedores suman aparte en el resumen de la obra.

## [1.68.0] - 2026-11-17
### Agregado
- **Hoja de corte**: cada barra numerada (Barra 2.3 = grupo 2, barra 3) y cada pieza con su letra. El mismo código (2.3b)
  sale al tocar la pieza en el 3D y, con "Número de corte en cada pieza", en los planos. Con el mouse sobre una barra
  (o su 👁) se pintan sus piezas en el 3D. motor/hojaDeCorte.js.
- **Empalmes sobre un apoyo**: una pieza más larga que la barra se une donde cruza otra (viga, transversal, columna) y
  el optimizador prueba las formas posibles y se queda con la que gasta menos barras. Se puede apagar ("donde rinda
  más"). motor/empalmes.js.
- **Disco y retazo editables** (Materiales → Qué perfil va en cada parte): mm por corte (antes 3 fijos) y desde qué
  largo un sobrante se guarda (antes 30 cm fijos).
- **Revestimientos**: ancho total y encastre (el ancho útil sale solo: total − encastre, ej. 1000 − 50 = 950 mm);
  costado mínimo al lado de una abertura (antes 30 cm fijos); dónde va la tira angosta (derecha, izquierda o repartida).
- **Rellenos de recortes**: cada relleno al costado de una abertura sale del recorte de otra tira (dice de cuál) o del
  sobrante de una angosta; si no hay, se compra (entra en la cuenta).
- Las juntas de los rellenos se ven en el 3D.
### Cambiado
- **Pisos**: cada piso con sus preguntas: cómo se cruzan tirantes y transversales (mismo plano o apoyados), qué queda
  entero, la altura y **borde y tirantes** (ahora por piso; antes uno para los dos). Se sacaron de Materiales → Uniones
  (estaban repetidos), igual que vigas y correas (quedan en Techo). componentes/ArmadoPiso.jsx.
- El optimizador recuerda los últimos resultados (el presupuesto con cada proveedor no se vuelve a calcular).

## [1.67.0] - 2026-11-16
### Agregado
- **Plano de cada panel** (Planos, debajo de cada pared, y en el PDF): un dibujo por pedazo a pedir con su ancho y largo,
  el corte inclinado, los recortes de las aberturas (rayados, con su medida y lugar) y, en verde, **el costado que
  superpone** sobre la tira de al lado. Nuevo dato del revestimiento: "Lado que superpone" (izquierdo de fábrica: se
  coloca de izquierda a derecha). `pedazosDeLaTira` en motor/cortesPaneles.js.
- El cartel de lo elegido en el 3D se achica a su título con ▴ (y se recuerda).
### Cambiado
- **Paneles partidos por una abertura**: si al costado de una ventana o puerta quedan menos de 30 cm de la tira (como la
  tira 7 del Frente de Leandro, con 10 cm), la tira ya no se pide entera para recortarla: va en dos pedazos (abajo y
  arriba) y el costado angosto es un **relleno** de un retazo. Descuenta el alto de la abertura de lo que se compra.
  (`COSTADO_MINIMO`, `parteLaTira`, `intervalosDeTira`, `rellenosDeTira` en motor/revestimientos.js.)
- El cartel de lo elegido en el 3D es más angosto (360 px), más chico de letra y con un alto máximo.

## [1.66.0] - 2026-11-16
### Arreglado
- **Planos de pared**: el borde del entrepiso apoyado sobre una pared (ej. el Frente) no salía en el plano de esa pared
  porque es del grupo "piso 2". Ahora toda pieza del entrepiso que queda en el plano de la pared se dibuja, va a su
  lista de piezas y su altura se acota como una faja. La viga de cierre (adentro) sigue solo en la planta.

## [1.65.0] - 2026-11-16
### Agregado
- **Tocar un panel en el 3D**: un clic en una pared revestida pinta esa tira (o placa) y muestra su número (igual que en
  Planos), ancho, largo a pedir (o los pedazos) y sus cortes. `tiraEnPunto` en motor/cortesPaneles.js.
- **Materiales**: cada proveedor trae adentro la lista de **todos los precios de la obra** en él (con "ver solo los que
  faltan"): se carga la lista de un corralón de una vez. "+ Agregar material" en "Materiales que agregás vos".
### Cambiado
- **Materiales**: cada apartado se pliega y cada proveedor, material, accesorio y revestimiento es una ficha plegable con
  su precio en el encabezado: el del proveedor elegido y, si no lo vende o hay otro más barato, desde cuánto y dónde
  (motor/resumenPrecios.js). Con su proyecto, la pestaña pasó de ≈ 15.500 px de alto a ≈ 6.600.
- Un perfil arranca desplegado solo si no tiene precio en **ningún** proveedor (antes, en el elegido: con uno que no
  vende hierro se abrían todos).
- Las fichas plegables (también las de equipos, mesadas y muebles) ya no heredan el estilo del encabezado de la app
  (tenían un recuadro de más).
- Precios de más de mil millones marcados con ⚠ (error de tipeo).

## [1.64.0] - 2026-11-16
### Agregado
- **Piezas agregadas, eliminadas y editadas**: cada renglón muestra sus características (perfil, largo, vertical /
  horizontal / inclinada y a qué altura) y un 👁. Con el mouse encima la pieza se pinta en el 3D; una **eliminada** se
  dibuja como fantasma rosa en su lugar, para verla antes de restaurarla. Nuevo criterio de resaltado `{ tipo: 'pieza' }`
  (incluye sus tramos `id~n`).
### Cambiado
- **Ver estructura de hierro** también oculta los tabiques (el baño de montantes PGC) y sus etiquetas.

## [1.63.1] - 2026-11-16
### Cambiado
- Ficha del revestimiento: "Ancho útil" y "Solape" parecían lo mismo. Ahora dicen qué es cada uno: **Ancho útil (lo que
  cubre cada tira, sin el encastre)** es a lo ancho; el solape pasa a **"Tiras en tramos encimados"**, que es a lo
  largo y solo cuenta si la pared es más alta que el largo máximo de una tira.

## [1.63.0] - 2026-11-16
### Agregado
- **Tamaños y cortes de los paneles** (Planos, en cada pared; también en el PDF y el Excel): cada tira de izquierda a
  derecha con su ancho, lo que se pide y qué cortarle (a lo largo la angosta, inclinado arriba, el recorte de una
  abertura que la toma en parte, con su medida y posición), y cuánto se compra, se usa y se tira. Las juntas de los
  paneles se ven punteadas en el plano de la pared, con el número de cada tira.
- **Retazos de paneles entre paredes**: la tira angosta de una pared sale de lo que sobra a lo ancho de la de otra (si
  no es más alta): se compra una menos. Se puede apagar en la ficha del revestimiento ("Aprovechar retazos").
- **Ventanas en base a los paneles**: en cada abertura, "💡 Corriéndola N cm…": cuánto correrla para que su borde caiga
  en una junta y cuántos m² de panel se ahorran, con un botón para correrla.
- **Cortes de hierro**: se prueban varias formas de acomodar las piezas (primer y mejor ajuste, llenar cada barra con
  la mejor combinación, vaciar las barras menos usadas y órdenes mezclados) y se queda con la de menos barras y
  sobrantes más largos. Los sobrantes desde 30 cm son **retazos** (se guardan); en Cortes, el total de barras, metros
  usados, retazos y lo que se tira, y la lista de retazos.
### Cambiado
- **Barra del 3D en tres grupos** (cámara · qué se ve · herramientas), con ícono y nombre corto (solo íconos si el 3D
  es angosto); la ayuda de cómo moverse va en "?" (y sola al medir o recorrer). Capas con el mismo estilo.

## [1.62.0] - 2026-11-16
### Cambiado
- **Un color por cada hierro, de fábrica** (pedido de Leandro: el mismo 80x80x2 se veía de dos colores): "🎨 Color por
  perfil" arranca prendido (también si estaba guardado apagado). El mismo caño se reconoce aunque esté cargado distinto
  (rectangular 80x80 = cuadrado 80x80, "2" = "2.0", con o sin espacios, o elegido solo con su texto).
- **"Ver estructura de hierro" también saca las personas, los perros, las mesadas y las instalaciones.**
- **Pestañas nuevas**: una barra en un renglón con ícono y nombre corto (con el panel ancho, el nombre completo); el
  total del presupuesto y lo pagado en pocas letras ("$ 16,4 M"; el número entero, al pasar el mouse).
### Agregado
- **Ancho del 3D regulable** (en la compu): se arrastra el borde entre el 3D y el panel (o con ← →); doble clic vuelve
  al de fábrica. Se acuerda en el navegador.

## [1.61.0] - 2026-11-16
### Agregado
- **Techo en el mismo plano con marco perimetral**: el marco (borde del techo) queda entero y las vigas y las correas
  terminan contra su cara; en las esquinas, las puntas van entre los bordes. Todo al ras de las vigas.
- **Nadie se encima**: personas y perros ocupan su lugar. El que camina, si el siguiente paso lo mete en otro,
  espera; si sigue trabado, busca otro camino esquivándolo. Si adonde iba ya hay alguien, se queda al lado. Los que
  quedaron encimados quietos se separan solos.
- **Sillón por cuerpos** (de fábrica 3; en su ficha, de 1 a 5, y el ancho acompaña): en el 3D se ven los almohadones
  de cada cuerpo y cada cuerpo es un lugar para sentarse. **La cama de 2 plazas tiene 2 lugares.** Dos personas van a
  lugares distintos; si está lleno, avisa "está ocupado".
- **Los perros se suben al sillón y a la cama**: tocando el perro y después el mueble, o solos: a veces, al salir a dar
  una vuelta, se suben a un lugar libre y se echan un rato.

## [1.60.0] - 2026-11-16
### Arreglado
- **La app se caía al cambiar "Tirantes y transversales"** (proyecto de Leandro): una pieza editada a mano (ej. un
  tirante recortado) quedaba cortada en tramos por las uniones al cambiar la forma, la lista de "Editadas" no la
  encontraba y la pantalla se rompía. Ahora suma sus tramos ("en 2 tramos"). También: al cerrarse, el 3D no liberaba
  los materiales del color por perfil (otro error), y el piso 2 armaba sus transversales con la forma de planta baja.
- Los planos de pared emparejaban mal los huecos cuando había una abertura "a futuro".
### Agregado
- **Paredes para el proveedor de paneles**: solo el contorno, las aberturas a cortar y sus cotas (desde la esquina y
  desde el piso), sin la estructura, sus medidas ni las piezas; las aberturas "a futuro" no salen (la pared va entera).
  En Planos (casilla) y al imprimir o exportar (opción nueva; el atajo "Para quien cotiza paneles" la usa).
- **Perfiles C al ras del borde**: los tirantes y transversales de cada piso van con la cara de arriba al ras del
  borde (antes eje con eje: si el borde era más alto, quedaban más abajo). Con tirantes apoyados, los transversales
  al ras y los tirantes arriba. Se elige en planta baja y en el piso 2 ("Eje con eje" deja todo como antes).
- **Techo como los pisos** (tarjeta Techo y Uniones): correas apoyadas sobre las vigas (como siempre) o en el mismo
  plano, con las vigas enteras o las correas enteras (se cortan y se sueldan), al ras de las vigas o eje con eje.

## [1.59.0] - 2026-11-12
### Agregado
- **🔩 Ver estructura de hierro** (barra del 3D): oculta maderas (tirantes, escalones, machimbre), revestimientos,
  OSB, aberturas y muebles; quedan los marcos, montantes y perfiles C. Al apagarlo vuelve todo como estaba (no toca
  las casillas de Capas).
- **Abertura a futuro** (ficha de cada abertura): se arma su marco (dintel, jambas, alféizar) pero la pared va
  **revestida entera**, para cortarla y colocar la abertura el día de mañana. En el 3D se ve naranja casi
  transparente con "(a futuro)"; en la lista de aberturas dice "A FUTURO: solo el marco".
- **Comparar revestimientos** (pestaña Presupuesto, abajo): la obra con cada tipo de panel en las 4 paredes, con su
  espesor, lo que hace falta, el total y la diferencia con el de ahora; "Usar en las 4 paredes" lo elige. Para comparar
  uno nuevo (ej. 10 mm contra 50 mm), se agrega en Materiales → Revestimientos.

## [1.58.0] - 2026-11-12
### Agregado
- **Equipos** (pestaña Instalaciones, abajo):
  - **Aires acondicionados**: el split adentro en la pared y la condensadora afuera (en el 3D), con las **frigorías**:
    ≈ 50 por m³ del ambiente (sus m² o toda la planta) por un factor (sol de la tarde, mucho vidrio). Dice si alcanza
    y, si no, qué equipo poner. Lleva el kit: caño de cobre, ménsula, desagüe y cable.
  - **Salamandra** con su **caño de salida** (5" o 6", por el techo o por la pared y para arriba): metros, codos,
    sombrerete, babeta o pasamuro y placa ignífuga; si calienta la casa (≈ 45 kcal/h por m³) y aviso si el caño
    atraviesa el entrepiso.
  - **Paneles solares y termotanque solar**: cuántos paneles de 450 W pide el consumo (kWh por mes y horas de sol), lo
    que generan, la superficie que ocupan contra la del techo y el peso (con el termotanque lleno), con aviso para
    reforzar las correas o apoyarlo sobre las vigas.
  - Lo que hay que comprar, con precios editables: va al presupuesto (renglón "Equipos"), al PDF y al Excel.

## [1.57.0] - 2026-11-12
### Agregado
- **Pestaña Instalaciones**: eléctrica, agua, desagües y gas, un sistema a la vez.
  - **Puntos** (tablero, tomas, interruptores, lámparas, cajas de paso; canillas, pileta, lavamanos, ducha, inodoro,
    lavarropas, termotanque, cisterna, bomba presurizadora, entrada de agua; desagües de inodoro, ducha, lavamanos,
    pileta, cámara de inspección y ventilación; garrafa y cocina): en una pared, a una distancia de su esquina
    izquierda (vista desde afuera), a una altura y, si hace falta, hacia adentro (la lámpara del techo).
  - **Tramos** que trazás vos, de un punto a otro: van **por afuera, atornillados a la estructura** (salen, atraviesan
    la pared, suben o bajan a la altura del recorrido y dan la vuelta por el lado más corto). Dice el largo y las curvas.
  - **Canalización eléctrica elegible por tramo**: bandeja portacables, caño rígido de PVC, caño semipesado o
    cablecanal, con el cable (1,5 a 6 mm², 3 conductores). Agua en termofusión ø20 o ø25; desagües en PVC ø40 a ø110;
    gas en epoxi ½" o ¾". Lo que va afuera de la casa (hasta la cámara o la garrafa) como "largo extra".
  - **Lista de materiales** por sistema: lo de cada punto (cajas, tomas, grifería, termotanque, garrafa…) y lo de cada
    tramo (barras, cuplas, curvas, grampas, conectores o terminales, cable), con precios editables. El total de cada
    sistema va al presupuesto como un renglón y cada material a la lista para pedir.
- **Cada instalación se prende y se apaga**: en el 3D (Capas → Instalaciones), en Planos (una casilla por sistema) y al
  exportar (PDF: una hoja por sistema con su plano desde arriba, los tramos y los materiales; Excel: hoja "Instalaciones").
- En la pestaña Obra, "Armar desde el presupuesto" agrega un rubro por cada instalación.

## [1.56.0] - 2026-11-12
### Agregado
- **Obra civil (hormigón y ladrillos)** (pestaña Estructura, debajo del Terreno): cemento, arena, piedra, hierro (ø8,
  ø6 y ø4,2 de estribos), ladrillos y excavación de:
  - **Pilotines hormigonados en obra** (opcional): en vez del pilotín comprado y el hormigón elaborado de las zapatas,
    sus materiales (4 ø8 con estribos; profundidad bajo el terreno editable).
  - **Tapial del cerramiento**: ladrillo hueco 12x18x33 con columnas (cada X m), viga de fundación y encadenado. Con
    terreno se eligen los lados del lote (se ve en el 3D y en la implantación); sin terreno, un largo a mano.
  - **Pilar de luz** (nuevo elemento del terreno): ladrillo común con una columna de hormigón adentro y su base, más
    un renglón de accesorios (caja de medidor, caño, jabalina, tablero).
  - **Cámara séptica** (paredes de ladrillo, fondo y tapa de hormigón) y **pozo absorbente** (calzado de ladrillo en
    panal y tapa de hormigón armado), con la profundidad de cada uno.
- **Dosificación editable**: kg de cemento y m³ de arena y piedra por m³ de hormigón (de fábrica ≈ 1:2:3) y de
  mortero; kilos por bolsa. La tabla "Lo que lleva" muestra cada parte y abajo lo que hay que comprar.
- Los materiales nuevos van al catálogo (Materiales) con precios de ejemplo y a la lista de materiales.

## [1.55.0] - 2026-11-12
### Agregado
- **🎨 Color por perfil** (botón en la barra del 3D, pedido de Leandro): cada pieza se pinta del color de su caño o
  perfil, en vez de por función (columna, viga, tirante…). El mismo 80x80x2 se ve del mismo color en toda la obra.
  Abajo a la derecha, la leyenda: cada perfil con su color, cuántas piezas y cuántos metros. El perfil es el mismo con
  el que se compra (el elegido a mano, el de su pared o el de su tipo), así coincide con la lista de materiales. El
  color sigue al nombre del perfil: no cambia al agregar piezas. Se acuerda prendido o apagado en este navegador.

## [1.54.0] - 2026-11-12
### Agregado
- **Checklist de cada rubro** (pestaña Obra): la etapa sale sola del **avance** (cuánto está hecho, en %, a mano) y de
  lo pagado: Presupuestado → En proceso (con % hecho y % pagado) → Finalizado, falta pagar → Finalizado y pagado; y
  Pagado sin finalizar. Reemplaza el estado que se elegía a mano (los de antes: "terminado" pasa a 100 % hecho).
- **Cuotas** en cualquier rubro ("Pagar en cuotas"): cantidad, monto, mes de la primera y los meses en que la cuota es
  doble (de fábrica junio y diciembre). Dice cuántas están pagas, si debés alguna vencida y cuál es la próxima. Cada
  pago elige a qué cuota va (o se aplica en orden).
- **Por proveedor o contratista**: cuánto es de cada uno, lo pagado y lo que falta (agrupa por "Quién").
- **Terreno, créditos y acreedores** (pestaña Obra, abajo): compras en cuotas (el terreno) y créditos, cada uno en su
  moneda (pesos o dólares, sin convertir ni sumar entre sí), con anticipo y cuotas. Acreedores: si alguien pagó una
  cuota o un gasto por vos, en ese pago elegís "Lo pagó…" y queda lo que le debés (menos lo que le devolviste).
- Todo eso sale en el PDF y en la hoja "Seguimiento" del Excel.
- **Deploy automático** (GitHub Actions): cada push a main corre los tests, arma la página y la publica en gh-pages.

## [1.53.0] - 2026-11-12
### Agregado
- **Mano de obra por segmento** (Presupuesto → "Mano de obra, imprevistos, ganancia e IVA"): una tabla que ya trae
  Pilotines, Estructura, Revestimiento, Tabiques, Tapial, Pozo séptico, Electricista y Plomero (se agregan y se quitan).
  Cada uno se cobra como un monto total, por m² cubierto, por m² de revestimiento, por metro de tabique, por pilotín, por
  kg de hierro o como % de los materiales, y muestra lo que da con las medidas de la obra. En 0 no suma. Todos van al
  costo directo (y después los imprevistos, la ganancia y el IVA). La mano de obra de antes queda como "general".
- En la pestaña **Obra**, "Armar desde el presupuesto" crea un rubro por cada segmento con monto, para cargarle los
  pagos y ver lo que falta.

## [1.52.0] - 2026-11-12
### Cambiado
- **Las paredes se llaman como su etiqueta en toda la app** (pedido de Leandro): si a una pared le pusiste "Vecino" o
  "Patio" en su tarjeta (Paredes y aberturas → texto de la etiqueta), ese nombre aparece en las tarjetas, los
  desplegables (tabiques, mesadas, aberturas), los planos (títulos y alrededor de cada planta), las vistas del PDF, la
  descripción de las piezas, los aleros, el resumen y el Excel. Sin etiqueta, el nombre automático de siempre
  (Frente, Lateral derecho…). La letra (A, B, C, D) queda entre paréntesis donde ya estaba.

## [1.51.2] - 2026-11-12
### Agregado
- **Lugar libre para pasar, por puerta** (ficha del tabique → "Lugar libre a cada lado para pasar"): lo que hace falta
  libre de cada lado para que las personas pasen. De fábrica 0,50 m la de abrir y 0,35 m la corrediza (no barre el
  piso); "volver al de fábrica" lo restablece. El aviso de la puerta trabada usa ese valor.

## [1.51.1] - 2026-11-12
### Cambiado
- **El aviso de la puerta trabada es explícito**: dice qué la traba, de qué lado (cara A o B y hacia dónde mira), a
  cuánto queda de la puerta, cuánto hace falta (0,50 m libres de cada lado) y cuánto correrlo. Si algo está metido en
  el hueco de la puerta, lo dice así. Ej.: "Del lado B (hacia la esquina derecha, vista desde afuera), Inodoro queda a
  0,22 m de la puerta: hacen falta 0,50 m libres para pasar (correlo 0,28 m o corré la puerta)."
- El aviso de la persona: "No puede llegar a Inodoro. Se quedó a 1,34 m. No pasa por la puerta de Baño-Antebaño. …".
### Agregado
- **Puerta abierta o cerrada**: casilla "Mostrarla abierta en el 3D" en la ficha del tabique (cerrada, se abre sola
  cuando pasa alguien). La puerta de abrir muestra en el piso su **barrido** (celeste; rojo si algo la traba).

## [1.51.0] - 2026-11-12
### Agregado
- **Sentido de las puertas de los tabiques**: "De izquierda a derecha" o "De derecha a izquierda" (mirando el tabique
  desde su cara A). En la de abrir cambia de qué lado está la bisagra; en la corrediza, hacia dónde corre (el riel va
  para ese lado). La de abrir ahora también elige hacia qué cara abre.
- **Tabiques: desde dónde se mide**, como los muebles: la puerta desde el arranque o desde la punta del tabique; el
  tabique paralelo, desde su pared o desde la de enfrente; la esquina, izquierda o derecha. Al cambiar la referencia el
  número se pasa a la otra medida (el tabique no se mueve). La ficha muestra las otras distancias calculadas.

## [1.50.0] - 2026-11-11
### Corregido
- **"No hay por dónde llegar ahí"**: si no hay camino, la persona va lo más cerca que puede y el aviso dice cuánto le
  faltó y **por qué**: "La puerta de Tabique 1 está tapada por Mesada 1". La ficha del tabique también avisa
  "⚠ La puerta queda tapada por …" (mesada, mueble, la pared o una puerta muy angosta).
### Agregado
- **Seguimiento de la obra en el PDF y el Excel** (Imprimir / Exportar → Datos → "Seguimiento de la obra"): el resumen
  (presupuestado, contratado, pagado, falta) y cada rubro con su estado y sus pagos (fecha, monto, medio y nota). En el
  Excel, una hoja "Seguimiento".
- **Las plantas muestran los interiores y la fundación**: pilotines y zapatas (punteados), tabiques con el hueco de su
  puerta, mesadas y muebles con su nombre (los colgados o sobre la mesada, punteados). Con "Interiores" apagado en la
  exportación, las plantas salen sin tabiques, mesadas ni muebles.

## [1.49.0] - 2026-11-11
### Corregido
- **El sol con "Ver adentro"**: las paredes que se ocultan siguen dando sombra (pasan a una capa que la cámara no
  dibuja pero el sol sí), así la luz entra solo por las aberturas. Las aberturas de una pared oculta quedan a la vista.
- **Muebles afuera de la casa**: arrastrándolos o con las flechas se frenan en la pared; cargando distancias, la ficha y
  el cartelito del 3D avisan "⚠ Se sale por el lateral izquierdo 0,80 m · choca con Mesa" y el contorno se ve rojo.
### Agregado
- **Mover aberturas desde el 3D** (como los muebles): tocás la abertura → "✥ Mover" → arrastrás por la pared o flechas
  (← → por la pared vista desde afuera, ↑ ↓ el antepecho; 1 cm, Shift 10 cm). No se sale de la pared.
- **Apoyado sobre la mesada**: los electrodomésticos chicos (cafetera, horno de aire, máquina de pan) suben o bajan
  solos a la mesada o el mueble que tengan abajo al moverlos; se puede tildar en cualquier mueble.
- **Personas que se sientan y se acuestan**: tocás la cama (se acuesta), el sillón, una silla o el inodoro (se sienta);
  el plato de ducha se pisa. Se levantan con la próxima orden o con el teclado.

## [1.48.0] - 2026-11-11
### Agregado
- **Consumibles estimados solos** (Materiales → Accesorios y consumibles): cada accesorio puede ser "estimada sola"
  (medida de la obra x un coeficiente que se cambia, redondeado hacia arriba) o "a mano" (como antes). De fábrica:
  electrodos por kg de hierro (1 kg cada 80 kg), tornillería por m² de panel (6 autoperforantes por m², cajas de 100),
  sellador por m² de panel (1 cartucho cada 12 m²) y **antióxido** (nuevo) por m² de hierro (2 manos, 12 m²/l). La
  superficie del hierro sale del peso y el espesor de cada perfil. Coeficientes orientativos: validar con el herrero.
  Los proyectos de antes: los de fábrica en 0 pasan a estimados; los que tenían cantidad cargada quedan a mano.
- **Electrodomésticos aparte de los muebles**: la lista para agregar y las fichas se separan en Muebles,
  Electrodomésticos y Baño. Nuevos: **televisor** (colgado a 1 m), **cafetera**, **horno de aire** y **máquina de pan**
  (apoyados a 0,95 m, la altura de una mesada), cada uno con su forma en el 3D.
### Cambiado
- Un consumible estimado sin precio se ve en la lista (para saber cuánto comprar) pero no se avisa como "nadie lo vende".

## [1.47.1] - 2026-11-11
### Agregado
- **Perros** (Personas y perros → "+ Perro"): nombre, tamaño (chico, mediano, grande, con su altura a la cruz), piso y
  color del pelaje. Caminan solos por la casa y olfatean; también se eligen y se mandan como las personas, y se puede
  "ver con sus ojos". Las puertas no las abren: esperan a que pase alguien.
- **Las personas abren las puertas** de los tabiques: antes de cruzar una cerrada estiran el brazo, la puerta se abre
  (la de abrir gira sobre su bisagra; la granero corre por su riel) y se cierra sola cuando se van.
### Corregido
- **Por debajo de la escalera** ahora se pasa (agachándose) donde el escalón queda a más del 80 % de la altura de la
  persona más alta de ese piso; antes se cortaba todo lo que estaba a menos de 2 m. No se podía entrar al antebaño.
- **Baño chico**: el cuerpo ocupa 15 cm para cada lado (antes 20): se pasa entre el vanitory y el tabique.
- **El plato de ducha se pisa** (lo que mide menos de 15 cm de alto no corta el paso): se puede entrar a la ducha.
- "Ver adentro" oculta el techo también mirando justo desde arriba.

## [1.47.0] - 2026-11-11
### Agregado
- **Pestaña "Obra" (seguimiento)**: lo contratado, lo pagado y lo terminado, por rubro.
  - "Armar desde el presupuesto" agrega un rubro por proveedor (o uno de materiales) y la mano de obra del cierre; lo
    presupuestado de esos rubros se actualiza solo si cambian las medidas o los precios. También rubros a mano
    (electricista, plomero, flete…).
  - Cada rubro: quién lo hace, estado (pendiente, contratado, en curso, terminado), monto contratado (si se cerró
    distinto de lo presupuestado), fecha de contrato y de fin, detalle y **pagos parciales** (fecha, monto, medio y
    nota). Muestra lo pagado, lo que falta y si se pagó de más.
  - Arriba, el resumen de la obra: presupuestado, contratado, pagado, falta pagar y rubros terminados. La pestaña
    muestra cuánto va pagado.

## [1.46.0] - 2026-11-11
### Agregado
- **Cierre del presupuesto** (Presupuesto → "Mano de obra, imprevistos, ganancia e IVA"): de los materiales al precio
  de la obra, en el orden de siempre: materiales + mano de obra = costo directo; + imprevistos % = costo total;
  + ganancia % = precio sin IVA; + IVA (10,5 % vivienda, 21 % o 27 %) = **precio de la obra**.
  La mano de obra se carga como un monto, por m² cubierto (planta baja + entrepiso), por kg de hierro o como % de
  los materiales. El precio sale arriba, en la pestaña, en el PDF y en el Excel. De fábrica todo en 0 (nada cambia).

## [1.45.1] - 2026-11-11
### Agregado
- **Capas → Estructura → "Lo enterrado"**: apagada, el 3D se corta a nivel del suelo y no se ven los pilotines ni las
  zapatas por debajo de la tierra (también en las fotos del PDF). Prendida de fábrica, como hasta ahora.

## [1.45.0] - 2026-11-11
### Agregado
- **Personas** (Paredes y aberturas → Personas): nombre, sexo, altura, piso y color de la ropa. En el 3D se toca una
  persona y después el piso (camina hasta ahí esquivando paredes, muebles, mesadas, tabiques y la escalera; por los
  tabiques pasa por la puerta) o algo (va a buscarlo: se agacha si está abajo, estira el brazo si está a la altura del
  pecho, se estira si está arriba).
- **Manejar con el teclado**: W A S D o flechas (según hacia dónde mira la cámara), Shift corre, C se agacha. La cámara
  la acompaña.
- **👁 Primera persona**: la cámara a la altura de los ojos de la persona elegida (o de un visitante de 1,70 m si no hay
  ninguna). Arrastrás para mirar, W A S D para caminar; Esc vuelve a la vista de antes.
- **🏠 Ver adentro** (prendido de fábrica): las paredes que quedan entre la cámara y la casa se ocultan solas mientras
  girás (como en Los Sims), y el techo cuando mirás desde arriba. Las fotos del PDF salen con todas las paredes.
### Cambiado
- **Tocar un mueble ya no lo mueve**: abre su ficha. Para correrlo con el mouse o las flechas hay que apretar
  "✥ Mover" en el cartelito; al soltarlo (o con Esc) queda quieto otra vez.

## [1.44.0] - 2026-11-11
### Agregado
- **Mover y girar muebles desde el 3D**: tocás un mueble y lo arrastrás por el piso (de a 1 cm), o lo corrés con las
  flechas (1 cm; con Shift, 10 cm). Con R (o los botones "↺/↻ Girar 90°") gira sobre su centro. La ficha se actualiza
  sola con las distancias a las paredes. Esc lo suelta.
- **Modo "✨ Realista"** en el 3D: luz de cielo y sol con sombras, reflejos suaves, hierros con brillo metálico,
  paneles macizos y sin cotas, juntas ni etiquetas. Se apaga y vuelve a la vista de trabajo.
- **Exportar "por partes"** (Imprimir → 3D): planta baja y entrepiso vistos desde arriba, y el adentro visto desde cada
  lado (frente, lateral derecho, fondo, lateral izquierdo) sacando la pared desde donde se mira.
### Cambiado
- Las piezas de mesadas y tabiques saben en qué nivel están, así al ocultar el piso 2 se ocultan también.

## [1.43.2] - 2026-11-11
### Agregado
- **La puerta abierta avisa si choca** con otro mueble, una mesada o un tabique (además de la pared): "⚠ La puerta
  abierta choca con Mesada 1". Se mira el lugar real de cada hoja (el cuarto de círculo) y la altura, así una alacena
  colgada no molesta a la puerta de un lavarropas de abajo. En el 3D, el lugar de la puerta que choca se pinta de rojo.
- Lo mismo para los **cajones de la cama**: avisa si abiertos dan contra un mueble, una mesada o un tabique, y se ven
  en rojo.

## [1.43.1] - 2026-11-10
### Cambiado
- **La planta baja y el entrepiso se arman cada uno a su manera**: "Tirantes y transversales" ahora es por piso (por
  ejemplo, planta baja todo perfil C en el mismo plano y el altillo con tirantes de madera apoyados sobre los C). Al
  pasar los tirantes de un piso a madera, ese piso pasa solo a "apoyados" (se puede cambiar); el otro no se toca.
- **Borde del piso 2 con su propio perfil** ("Bordes de piso 2"): antes compartía el de planta baja. Los catálogos de
  antes lo arrancan con el mismo perfil y precio que tenía el borde de planta baja.
- Los tirantes de madera apoyados suben según su propio alto (5", unos 12,7 cm).

## [1.43.0] - 2026-11-10
### Agregado
- **Lugar que necesita la puerta** de cada mueble: elegís cómo abre (una hoja con bisagra a la izquierda o a la
  derecha, dos hojas, rebatible hacia abajo como el horno, corrediza o sin puerta). La puerta abierta se ve sombreada
  en el 3D, la ficha dice cuánto necesita adelante y avisa si choca con la pared. Heladera, lavarropas, cocina, placard
  y vanitory arrancan con la suya; también los electrodomésticos de los huecos de la mesada.
- **Copero y alacena** (tipos nuevos). Todo mueble tiene **altura desde el piso**: la alacena arranca colgada a 1,45 m.
- **Pisos con tirantes de madera y machimbre**: en cada piso (planta baja y entrepiso/altillo) elegís tirantes de
  hierro o de madera (las transversales y el borde siguen de perfil C) y cubierta de OSB o machimbre clavado. La madera
  va al presupuesto por metro ("Tirantes de madera") y el machimbre por m², y se ven de madera en el 3D.
- **Fichas plegables**: cada mesada, tabique y mueble se pliega tocando su título (la recién agregada arranca abierta).
- **Del 3D a su tarjeta**: al tocar un hierro, una abertura o un mueble en el 3D, se va a la pestaña donde se edita, se
  abre su tarjeta (y la pared, mesada, tabique o mueble) y queda a la vista, marcada. Al soltarlo, vuelve a cerrarse
  lo que estaba cerrado.

## [1.42.0] - 2026-11-10
### Agregado
- **Exportar solo los planos**: en "Imprimir / Exportar", el atajo **Solo planos** deja las paredes, las plantas y sus
  listas (sin 3D ni presupuesto). Ya no sale una hoja con el título solo: el nombre va arriba de la primera hoja que sale.
- **Caños y perfiles** con los planos (PDF y Excel, hoja "Caños"): cuántas barras de cada perfil (tipo, medidas,
  espesor, largo de barra y peso) y dónde va cada uno (piezas y metros).
- **Aberturas** con los planos (PDF y Excel, hoja "Aberturas"): número, tipo, pared, ancho, alto, antepecho y a qué
  distancia de qué esquina está.
- **Partes de la obra** para elegir qué va en los planos y en los caños: piso, entrepiso (altillo) y escalera, techo,
  divisiones interiores. Las paredes con la estructura de las aberturas van siempre. Atajo **Para quien cotiza
  paneles**: solo paredes, caños de las paredes y aberturas. Sacando partes, las barras se vuelven a calcular solo con
  lo que queda.

## [1.41.1] - 2026-11-05
### Corregido
- **La mesada ya no tiene que atravesar el tabique del baño.** Los botones de la mesada ahora llevan cada punta hasta lo
  que la limita en esa pared: la esquina o la cara de un tabique ("⇤ Hasta Tabique 1", "↔ Entre la esquina y Tabique 1",
  "Hasta la esquina ⇥"). Si la mesada atraviesa un tabique, avisa.
- Al correr una punta, los huecos y las bachas quedan en el mismo lugar (antes el ajuste se rechazaba sin avisar porque
  una bacha dejaba de entrar). Si un ajuste no se puede guardar, ahora dice por qué.

## [1.41.0] - 2026-11-04
### Agregado
- **Tabiques de Durlock** (Paredes y aberturas → Tabiques), para el baño, el antebaño y el cerramiento de la ducha:
  desde una pared, saliendo de ella (perpendicular) o al lado (paralelo, a X m), a una distancia de la esquina como las
  aberturas; largo y alto hasta el techo (sigue la pendiente), hasta el piso 2 o una medida. Estructura con un perfil
  de tu lista (soleras, montantes cada X, jambas, dintel y montantes cortos sobre la puerta), placa POR CARA de tus
  revestimientos y **puerta de abrir o corrediza tipo granero** (con riel, del lado que elijas). Va al 3D (capas
  "Estructura de tabiques" y "Placas y puertas de tabiques"), al presupuesto (estructura en barras con cortes, placas
  y las puertas) y se puede editar pieza por pieza.
- **Cajones de la cama** a la izquierda, a la derecha y a los pies (mirando desde los pies), con cuánto salen
  abiertos: se ven sombreados en el 3D y avisa si chocan con una pared.
- **3D**: doble clic sobre algo = girar alrededor de ese punto; la rueda acerca hacia donde está el mouse.
### Cambiado
- **Mesada en L o U con el largo que quieras**: ya no se pega sí o sí a la pared entera; se ubica con la distancia a la
  esquina (botones "Pegar a la esquina izquierda/derecha") y los tramos que siguen salen derechos desde las puntas
  aunque no haya pared (el límite puede ser un tabique). Si un tramo queda suelto, su lomo se puede revestir. Las L/U
  guardadas no se mueven.
### Corregido
- Los estantes ahora también van en el esquinero de la L/U.

## [1.40.0] - 2026-11-04
### Agregado
- **Mesada en L o en U**: en "Forma" elegís recta, L (sigue por la pared de la izquierda o de la derecha) o U. El
  tramo principal llega hasta la esquina (en U ocupa toda la pared) y cada tramo que sigue tiene su largo, medido
  desde la cara de adentro de la pared principal. Misma altura, profundidad, perfil y revestimiento; la esquina es del
  tramo principal y su frente tapado no lleva placa.
- **Huecos con o sin tapa, sobre zócalo y con el electrodoméstico adentro**: cada hueco elige en qué tramo va, qué
  lleva (heladera, cocina, lavarropas u otro), si la tapa sigue por arriba (lavarropas de carga frontal) o se corta
  (cocina con hornallas, heladera: ahí no hay estructura y los costados se revisten) y si la base del zócalo sigue
  por debajo. El electrodoméstico se dibuja en el hueco y avisa si no entra bajo la tapa.
- **Bachas de cocina** en la mesada (simple o doble, posición y medida): cortan la tapa (menos m²) y suman los
  renglones "Bachas simples" / "Bachas dobles" al presupuesto. No pueden caer sobre un hueco sin tapa.

## [1.39.0] - 2026-11-04
### Agregado
- **Muebles: desde qué pared se mide**. Elegís lateral izquierdo o derecho y frente o fondo; la distancia va de la
  cara de adentro de esa pared al borde del mueble. Debajo se calculan solas las **distancias a las otras dos
  paredes** y lo **libre arriba** (hasta la estructura del techo, o hasta los tirantes del piso 2 si el mueble está
  debajo del entrepiso), con aviso si no entra de alto.
- **Lavarropas de carga frontal** (puerta redonda al frente) o superior (tapa redonda arriba).
- **Cocina con hornallas** arriba y la puerta del horno.
- **Vanitory** (tipo nuevo): mueble con su bacha y el grifo.
### Cambiado
- Los muebles se miden desde la cara de adentro de las paredes (antes desde el eje). Los guardados se convierten
  solos y quedan en el mismo lugar.

## [1.38.2] - 2026-11-01
### Agregado
- **Color propio por mueble** (al lado del material; ↺ vuelve al del material) y **color de tapa y de estantes por
  mesada** (↺ vuelve al de la capa).
- Un solo selector de color para toda la app (`SelectorColor`): el mismo cuadradito en la leyenda, los muebles y las
  mesadas. En la leyenda, ↺ vuelve cada capa a su color de fábrica.
### Cambiado
- **Capas más chicas**: ahora es un recuadro abajo a la izquierda con pestañas (Estructura, Superficies, Interiores,
  Ayudas, Etiquetas, Opacidad, Partes) y se ve una sección a la vez (antes ocupaba todo el ancho y tapaba el 3D).
  Recuerda la última sección abierta.

## [1.38.1] - 2026-11-01
### Agregado
- **Etiquetas de mesadas y muebles** en el 3D, como las de paredes y aberturas: el nombre es el cartel. Cada mesada y
  cada mueble tiene su casilla "Etiqueta en el 3D", y en Capas → Etiquetas hay "Mesadas" y "Muebles" (con todo/nada,
  para sacarlas todas juntas). Los proyectos de la v1.38.0 quedan con las etiquetas prendidas.

## [1.38.0] - 2026-11-01
### Agregado
- **Mesadas** (Paredes y aberturas → Mesadas): contra una pared, medidas como las aberturas (desde la esquina vista
  desde afuera); largo, profundidad, alto y espesor de tapa. **Estructura** con el perfil que elijas de tu lista
  (fondo al piso, frente, travesaños, montantes cada X), **revestimiento** de tu lista al frente y a los costados
  (cada costado se puede dejar sin placa si da contra una pared), **estantes**, **zócalo para el pie** (retirado, con
  patas) y **huecos bajo mesada** (heladera, lavarropas: sin estructura ni placa al frente). Va al 3D (capas
  "Estructura de mesadas" y "Tapas, placas y estantes"), al presupuesto (estructura en barras con cortes, tapa y
  estantes en m², placas con los paños de siempre) y se puede editar pieza por pieza.
- **Muebles y electrodomésticos** (módulo): cama, mesa, silla, sillón, escritorio, placard, heladera, cocina,
  lavarropas, inodoro, plato de ducha u otro, con las medidas que cargues, material (madera, blanco, acero, tela,
  negro), distancia al lateral izquierdo y al frente, giro de a 90° y nivel. Avisa si se sale de la planta. No suman al
  presupuesto.
### Cambiado
- **Sol más fuerte**: la luz del sol arranca al 150 % y se regula de 50 % a 300 % en el panel ☀ Sol.

## [1.37.0] - 2026-10-31
### Agregado
- **Sol** (módulo nuevo, botón "☀ Sol" en el 3D): luz del sol del día y la hora que elijas, con **sombras**;
  atajos Invierno / Verano / Equinoccio y **▶ Día** (la hora avanza de la salida a la puesta). Muestra la altura y de
  dónde viene el sol, a qué hora sale y se pone, y **por qué aberturas entra**. Las aberturas dejan pasar la luz
  (se ve la mancha de sol adentro). El norte sale del terreno (o, sin terreno, se elige en el mismo panel); el lugar
  de fábrica es Mercedes (latitud, longitud y huso guardados en el proyecto). Cálculo de la NOAA, sin librerías.
### Cambiado
- **Pilotines con la modulación**: ya no van obligados en cada cruce (sobredimensiona). Se elige en Fundación: con su
  propia grilla (de fábrica), cada 2 módulos, o en cada cruce. "Un pilotín bajo cada columna" sigue siendo opcional.

## [1.36.0] - 2026-10-31
### Agregado
- **Forma y medida de los pilotines** (Fundación): redondo (diámetro) o cuadrado (lado). Se dibuja así en el 3D y el
  presupuesto lo dice ("Pilotín de hormigón ø 30 cm" / "40 x 40 cm").
- **Ejes, para que las cargas bajen derecho**:
  - **Modulación única** (Planta y altura): una medida (ej. 1,25 m) arma una grilla desde la esquina; las columnas
    van en sus líneas (alineadas frente con fondo), las vigas de techo y los tirantes también (parejos adentro de cada
    módulo, a no más de su separación) y los pilotines en los cruces.
  - Sin módulo: **vigas sobre las columnas** del lado bajo (Techo) y **un pilotín bajo cada columna** (Fundación; la
    grilla de siempre completa el resto sin repetir cerca).

## [1.35.1] - 2026-10-28
### Agregado
- **Aleros por lado** (Techo → Aleros): cuánto sale el techo en el frente, el fondo y cada lateral (sin tildar,
  sin alero). Por separado, si las **vigas** y las **correas** llegan al borde del alero o terminan en la
  estructura (el alero lo hace el panel solo). Con vigas al alero también hay correas en el alero; el marco
  perimetral va por el borde de afuera. El revestimiento del techo siempre cubre los aleros (más m² en el
  presupuesto).

## [1.35.0] - 2026-10-28
### Agregado
- **Tirantes y transversales del piso, 3 formas** (en Pisos y en Materiales → Uniones):
  tirantes enteros con transversales entre ellos (como hasta ahora) · transversales enteros de borde a borde con
  los tirantes cortados · **tirantes apoyados sobre los transversales** (dos niveles: nada se corta, los tirantes
  suben y llegan a la cara de afuera de los bordes).
- **Zapatas** (Fundación → "Pilotines con zapata"): lado, alto y profundidad (del terreno al fondo de la zapata).
  Se dibujan bajo tierra (capa "Zapatas"), el pilotín arranca arriba de la zapata y el presupuesto suma
  **hormigón** (m³) y **excavación** (m³) con precios de ejemplo para cargar los tuyos. El resumen de la obra
  suma la fundación.

## [1.34.3] - 2026-10-27
### Agregado
- **Capas del terreno por partes**: grupo **Terreno** en "Capas y colores" con Lote, Calle y línea municipal,
  Retiros, Pozo y cámara, Árboles, Construcciones, Accesos y veredas, y Norte (con "todo / nada"). Solo aparece
  si la obra tiene terreno.
- **Opacidad del terreno** (en Opacidad, de fábrica 90 %): el lote, la calle y lo que hay en el terreno se pueden
  ver a través para mirar la casa. Los carteles siempre se leen.

## [1.34.2] - 2026-10-27
### Cambiado
- **"Capas y colores" arranca cerrado** (en la compu arrancaba abierto y tapaba el 3D). Recuerda cómo lo dejaste en
  este navegador y **Esc** lo cierra.

## [1.34.1] - 2026-10-27
### Corregido
- **El terreno (y cualquier cambio) se perdía al volver a abrir el link**: si el proyecto venía de un link de la
  nube (sobre todo el de ver, que no se puede actualizar), al abrir el link de nuevo se cargaba la versión vieja
  del link sin preguntar. Ahora, si lo que guardaste es igual o más nuevo que el link, se abre tu versión; si el
  link es más nuevo, pregunta y avisa si perdés cambios sin guardar.
- **Al borrar una columna, la solera (o la faja) que cortaba quedaba con el hueco**: ahora lo borrado o editado a
  mano sobre piezas enteras se aplica antes de armar la red, así lo que cruzaba esa columna vuelve a quedar entero.
  (Lo hecho sobre un tramo ya cortado, "…~2", se sigue aplicando después.)

## [1.34.0] - 2026-10-27
### Agregado
- **Elegir qué queda entero** (Materiales → Uniones), por obra, en cada par: soleras ↔ columnas, columnas ↔ fajas,
  montantes ↔ fajas, bordes ↔ tirantes. Y **en cada abertura** (Paredes): jambas enteras, o dintel y alféizar
  enteros con las jambas cortadas.
### Cambiado
- Las uniones distinguen el tipo de cruce: **X** (las dos pasan: la que pierde queda en dos), **T** (una termina
  contra la otra: se corta la que termina, salvo en los pares que se pueden invertir) y **esquina** (la entera
  llega hasta la cara de afuera de la otra). Por eso los lados largos de soleras, marcos y bordes ahora se
  alargan hasta la cara de afuera de la esquina (antes quedaban eje a eje).
- En el proyecto de Leandro: de fábrica $ 7.544.950; con columnas enteras baja a $ 7.457.450; con fajas enteras
  sube a $ 8.157.450 (las fajas de 7,5 m enteras no se acomodan bien en las barras).

## [1.33.1] - 2026-10-27
### Agregado
- **Se pueden sacar todas las etiquetas del 3D**: en "Capas" hay un grupo **Etiquetas** (Paredes, Aberturas,
  Terreno) con "todo / nada". Terreno saca línea municipal, calle, la N y los nombres del pozo, árboles, etc.
  (la flecha del norte queda). Sirve para fotos limpias y para el PDF (sale como se ve).

## [1.33.0] - 2026-10-27
### Corregido
- **Las fajas ya no cruzan las puertas y ventanas**: se cortan en el marco de cada vano que está a su altura
  (en el proyecto de Leandro: una barra menos de Perfil C 80x40). Dintel, alféizar y travesaños llegan hasta la
  columna cuando una columna hace de jamba.
### Agregado
- **Uniones en red** (Materiales → "Uniones"): en cada cruce una pieza queda entera y la otra se corta contra sus
  caras; se le descuenta la mitad del perfil entero en cada punta (con su medida real de la lista de perfiles) y,
  si lo cruza por el medio, queda en dos tramos. Se recalculan cortes, barras, planos y 3D.
  Jerarquía (decisión de Leandro): paredes — soleras y marcos de piso (largos enteros) › columnas y jambas ›
  dinteles y alféizares › montantes › fajas y travesaños; pisos — bordes (largos enteros) › tirantes ›
  transversales. Techo, riostras y escalera, igual que antes.
- **Luz para soldar** configurable (mm por punta). Opción "Eje a eje (como antes)".
- **Perfil propio del marco de cada abertura** (o el general de "Marcos de aberturas"): sale en un renglón aparte,
  ej. "Marcos de aberturas (abertura #1)".
### Ojo
- Las fajas partidas cambian de id: si habías editado o borrado a mano una faja que ahora queda en tramos, hay que
  volver a hacerlo en el tramo.

## [1.32.0] - 2026-10-27
### Agregado
- **Terreno e implantación** (pestaña Estructura, tarjeta nueva): lote frente × fondo, la casa ubicada por su
  distancia a la línea municipal y al lateral izquierdo (las otras dos salen solas), hacia dónde mira la calle
  (rumbo o grados exactos). Retiros y distancias mínimas del pozo **los carga el diseñador** (cambian según el
  municipio); sin tildar, no se controlan.
- **En el terreno**: pozo séptico, cámara séptica, árboles, otras construcciones, accesos y veredas, cada uno con
  nombre, ubicación y medidas. El pozo muestra su distancia a la casa y a cada medianera.
- **Avisos**: la casa no entra, invade un retiro, algo queda fuera del lote o encima de la casa, el pozo no
  respeta los mínimos.
- **3D**: lote, calle, línea municipal, retiros punteados, los elementos con su altura y la flecha del norte;
  botón "Ver terreno" y capa "Terreno" para prenderlo y apagarlo. Con terreno, la grilla se apaga.
- **Módulos** (`src/modulos.js`): las funciones grandes se pueden apagar por instalación (quien publica decide;
  también al compilar con `VITE_MODULOS_APAGADOS=terreno`). Apagado, no se ve nada del módulo y los datos del
  proyecto se conservan. Terreno es el primero; en esta publicación va **prendido**.
- **Plano de implantación** (Planos y PDF): lote acotado, la casa con sus 4 distancias, retiros, elementos y el
  norte, con la calle abajo. El resumen de la obra (PDF y Excel) suma lote, ubicación, retiros y elementos.

## [1.31.0] - 2026-10-27
### Cambiado
- **Presupuesto reordenado**: arriba siempre el **TOTAL DE LA OBRA**, los kilos de hierro, cuántos proveedores y la
  forma de pago. Debajo, cuatro sub-pestañas (se recuerda la última; flechas del teclado para moverse):
  **Lista de materiales** · **Por proveedor** · **Cortes** · **Precios y detalle**.
- Las medidas a cortar de los paneles y "dónde va" cada material quedan plegados (▸): la lista se lee de un vistazo
  y en el celular se puede ver dónde va cada cosa (antes era solo pasar el mouse).
- Estados vacíos claros: sin proveedores, sin barras para cortar, sin materiales.
### Agregado
- **Lista de materiales de la obra, sin proveedor**: cantidad ("21 barras de 12 m"), material, tipo, medidas,
  espesor y kilos; botón **Copiar lista** (sin precios). También al principio del PDF y del Excel.

## [1.30.4] - 2026-10-27
### Cambiado
- **El pedido a cada proveedor dice qué barra es**: primero cantidad y largo ("21 barras de 12 m · Perfil C
  80x40x1.6"), abajo la ficha con cada medida con su nombre y el espesor ("Alto 80 mm · Ala 40 mm · Espesor 1.6 mm")
  y los kilos. Los ángulos también en pulgadas; los paneles con espesor, ancho útil y medidas a cortar.
  Igual en "Copiar pedido", el PDF y el Excel.

## [1.30.3] - 2026-10-27
### Cambiado
- **Plan de compra por material, no por dónde se usa**: cada proveedor muestra su lista (ej. "Perfil C 80x40x1.6 ·
  barra de 12 m: 21 barras" en vez de soleras, bordes, piso... por separado). Los paneles llevan las medidas a cortar.
  El uso queda en el globito al pasar el mouse. Igual en el PDF y el Excel.
### Agregado
- **"Copiar pedido"** en cada proveedor: la lista en texto (sin precios) para mandarla por WhatsApp o mail.

## [1.30.2] - 2026-10-27
### Corregido
- **El total no contaba lo que el proveedor elegido no vende** (ej. los paneles de Vastek): la pestaña decía
  $ 2.847.520 con $ 5.483.750 de paneles en otro proveedor. Ahora, con más de un proveedor, la pestaña y el
  **TOTAL DE LA OBRA** son el del plan de compra (cada material donde conviene, con flete); abajo queda, chico,
  "Con <proveedor> (sin lo que no vende: …)" para comparar. Igual en el PDF y el Excel.
- Al abrir un link corto por primera vez, la ventana "Proyecto compartido" ya no queda encima de la ayuda de bienvenida.

## [1.30.1] - 2026-10-25
### Cambiado
- **Links cortos activados**: la app ya apunta al proyecto de Firebase `pollo-calculator` (`src/proyecto/configNube.js`).
  "Compartir → Crear links cortos" sube el proyecto y da los links de ver y de editar.

## [1.30.0] - 2026-10-25
### Agregado
- **Links cortos que guardan los cambios** (con Firebase, ver `firebase/COMO-CONFIGURAR.md`): "Compartir" sube el
  proyecto y da dos links — **para ver** (`#p=<id>`, para el cliente) y **para editar** (`#e=<id>.<clave>`, para vos
  o el herrero). Con el de editar, "Guardar" guarda también en el link; quien abra cualquiera de los dos ve la última
  versión. Si dos guardan a la vez, el segundo recibe un aviso y no pisa nada.
- Reglas de seguridad de Firestore (`firebase/firestore.rules`): la clave nunca queda legible en la base (solo su
  huella sha256); sin la clave no se puede guardar; no se pueden listar los proyectos. Script de prueba con el
  emulador: `firebase/probarReglas.mjs`.
- El link de editar se guarda en Mis proyectos de tu navegador (no viaja en el .json ni en el link de ver).
### Cambiado
- El link sin nube ahora lleva solo lo que cambia respecto de lo de fábrica: **la mitad de largo** (tu casa: de
  4.550 a ~2.080 letras; el ejemplo: ~730). Los links viejos se siguen abriendo.
- "Compartir" abre una ventana (links cortos o, si la nube no está configurada, el link de siempre).

## [1.29.0] - 2026-10-24
### Agregado
- **Flete por proveedor** (en Materiales → Proveedores): monto por pedido y, opcional, "gratis desde $X" de compra.
  Se suma una vez a cada proveedor al que se le compra algo y aparece como renglón en el presupuesto.
- **Plan de compra** (en Presupuesto, con 2 o más proveedores): la combinación más barata **contando el flete**,
  con lo que hay que comprarle a cada uno, su subtotal y su flete. Si un proveedor ahorra menos que su flete, no se
  usa. También sale en el PDF y en el Excel.
- En cada renglón del presupuesto: "más barato en <proveedor>: $X" cuando otro lo vende más barato.
- **Accesorios** (en Materiales): tornillería, electrodos y selladores ya cargados, y "+ Agregar accesorio" para
  otros (nombre, descripción, cantidad, unidad y precio en cada proveedor). La cantidad se carga a mano; con 0 no
  entra al presupuesto.
### Cambiado
- Un material sin precio en un proveedor ahora se lee como "no lo vende" (antes "⚠ faltan" / "sin precio").
  La comparación muestra "no vende N" y los totales de cada proveedor incluyen su flete.

## [1.28.1] - 2026-10-24
### Cambiado
- La pestaña Presupuesto muestra el total completo ("$ 9.483.620") en vez del redondeado ("$ 9,4 M"); en el
  celular, con letra un poco más chica para que entre.

## [1.28.0] - 2026-10-24
### Agregado
- **Imprimir / Exportar** (un solo botón): ventana para elegir qué sale — vista 3D actual (con lo resaltado y lo
  seleccionado), vistas fijas (frente, lateral y desde arriba), cotas generales, medidas fijadas, datos de la obra,
  presupuesto, cómo cortar cada barra, paredes, plantas y (opcional) todos los formularios. Lo elegido se recuerda.
- **PDF en 3 hojas** (antes 20 en el ejemplo): 1) 3D + vistas fijas + medidas + datos de la obra; 2) presupuesto +
  piso, entrepiso y techo; 3) las 4 paredes acotadas en 2 x 2; 4) cortes, solo si se piden (barras iguales juntas:
  "16 × 6.06"). Las fotos del 3D salen recortadas al dibujo.
- **Excel en 4 hojas** (antes 9): Obra (datos, medidas y presupuesto), Paredes (las 4), Plantas (las 3) y Cortes,
  según lo elegido.
- **Cotas generales en el 3D** (capa en Ayudas): largo del frente y del lateral, altos en las esquinas y elevación.
- **Medidas fijadas**: después de medir con 📏, "📌 Fijar" la deja dibujada (M1, M2…); se quitan de a una o todas.
- **Bordes de pisos y techo con perfil propio** (pedido de Leandro: bordes 80x80, interior C 80x40):
  - "Bordes de piso" (marco de planta baja y entrepiso) separado de "Soleras" (arriba de las paredes).
  - Techo con **marco perimetral** opcional: las correas de los dos bordes + una pieza en cada punta forman
    "Bordes de techo"; vigas y correas del interior aparte. Cada sentido con su perfil.
  - Los perfiles de borde e interior se eligen también en las tarjetas Pisos y Techo (mismo dato que Materiales).
- **Piso 2 (entrepiso)**: altura elegible (antes fija en 2.30 m; la escalera la sigue); las columnas que lo
  sostienen tienen renglón propio ("Columnas del entrepiso", con su perfil), pueden terminar en el piso 2 en vez de
  subir al techo, y se puede agregar una **fila de columnas en el medio con viga de apoyo** aunque no haya borde
  libre (misma separación o cantidad que las del borde libre).
- **Travesaños de abertura**: casilla en cada abertura para poner una pieza horizontal a la altura del dintel y del
  antepecho, de la abertura hasta la columna de cada lado (renglón Marcos de aberturas).
### Cambiado
- Los proyectos de antes se abren sin marco de techo y con "Bordes de piso" con el mismo perfil que tenían los
  marcos: el total no cambia (casa de Leandro: $8.599.920).
- "Marco de piso" pasa a llamarse "Borde de piso" en listas y planos.

## [1.27.0] - 2026-10-24
### Agregado
- **Por medida o por cantidad**: cada separación (columnas, fajas y montantes de cada pared; tirantes y transversales de
  piso y entrepiso; columnas del borde libre; vigas y correas del techo) tiene un selector **Medida | Cantidad**.
  Por medida se muestra cuántas piezas salen ("= 4 columnas"); por cantidad, cada cuánto quedan ("una cada 2.50 m"),
  repartidas parejo. Al cambiar de modo se pasa el valor, así la estructura no salta.
  - Columnas de una pared: la cantidad es el **total de la pared, con las esquinas**.
  - Montantes: cantidad **por vano** entre cada par de columnas.
  - Fajas: se reparten en el alto mayor de la pared (en una pared inclinada las de arriba son más cortas).
- **Resaltar en el 3D**: al pasar el mouse por un perfil de la lista, un renglón de Materiales o del Presupuesto, una
  pared o las tarjetas Pisos, Techo, Escalera, Grada y Montaje, sus piezas se pintan de rosa y se ven a través de
  todo. Arriba del 3D un cartel dice qué es y cuántas piezas son. El botón **👁** lo deja fijo (otro toque o Esc lo
  suelta); en el celular además pasa a la vista 3D.
### Cambiado
- Los botones de borrar dicen **"Eliminar"** (antes ✕, que parecía "cerrar"): aberturas, revestimientos,
  proveedores, componentes del montaje y Mis proyectos.
- Carteles de pieza y abertura seleccionada en el 3D: **✕ para cerrar arriba a la derecha** y las acciones (Editar,
  Duplicar, Eliminar) en el pie, con Eliminar aparte a la derecha. En la lista de aberturas y de revestimientos,
  Duplicar/Eliminar también pasan al pie de cada una.

## [1.26.0] - 2026-10-23
### Agregado
- **Pestaña Planos**: cada pared vista desde afuera, dibujada y acotada (columnas, jambas, fajas, montantes, riostras,
  marcos y aberturas), con la cadena de cotas entre columnas y jambas, las alturas de las fajas, el largo y el alto.
  Debajo: la **lista de piezas para cortar** (pieza, perfil, largo y cantidad), las aberturas con su posición y el
  **revestimiento** de esa pared (tiras o placas, con las aberturas descontadas). También las plantas de **piso**,
  **entrepiso** y **techo** vistas desde arriba, con sus piezas.
- **Imprimir / PDF**: los planos salen al final, una hoja por plano.
- **Exportar Excel** (botón en el encabezado y en Planos): hoja de Presupuesto (con proveedor y forma de pago), una
  hoja por pared (cotas, piezas, aberturas, revestimiento), una por planta y la hoja de Cortes (cómo cortar cada
  barra). Se arma sin librerías nuevas.
### Cambiado
- En el celular las 6 pestañas entran en la barra de abajo ("Estruct.", "Presup.").

## [1.25.0] - 2026-10-23
### Agregado
- **Proveedores** en Materiales: nombre, recargo con tarjeta (%) y una nota (teléfono, dirección…).
- **Precio de cada material en cada proveedor**, en efectivo y con tarjeta: perfiles de la lista (por barra),
  revestimientos (por m² o por placa) y los demás materiales (OSB, pilotines, escalones, madera, chapas…).
  Con tarjeta, si no se carga, es el efectivo + el recargo del proveedor ("auto $…").
- **Presupuesto**: elegir proveedor y forma de pago, y una tabla para **comparar** los totales de cada proveedor en
  efectivo y con tarjeta. Avisa los materiales que un proveedor no tiene cargados ("⚠ faltan N"). Tocar una fila
  calcula con ese proveedor.
- **"Lo más barato de cada material"**: el presupuesto comprando cada cosa donde está más barata, y dónde.
### Cambiado
- Proyectos guardados: el precio de cada material pasa a "Mi proveedor" en efectivo (el total no cambia).
- El precio que se cambia en el Presupuesto se guarda en el proveedor y la forma de pago elegidos.

## [1.24.0] - 2026-10-20
### Agregado
- **Paneles con los huecos de las aberturas** en el 3D: las puertas y ventanas se ven (antes quedaban tapadas por el
  panel) y se pueden tocar. Las juntas de los paneles ya no cruzan los huecos.
- **Descontar aberturas** de los revestimientos, como en obra:
  - a medida: la tira que cae ENTERA dentro del ancho de una abertura se pide en pedazos (abajo del antepecho y
    arriba del dintel); las que la abertura corta solo en parte se piden enteras y se recortan;
  - placa fija: la placa que cae entera dentro de un hueco no se compra.
- **Opacidad de las juntas** en la leyenda (Opacidad → Juntas). Para apagarlas del todo sigue la casilla
  Ayudas → "Juntas de paneles".

## [1.23.0] - 2026-10-20
### Agregado
- **Precio de cada revestimiento en Materiales**, al lado de "Cómo se vende": "Precio por m²" (a medida) o "Precio por
  placa" (placa fija). Es el mismo precio del Presupuesto: se cambia en cualquiera de los dos lados.

## [1.22.1] - 2026-10-20
### Corregido
- Proyectos de antes de v1.21: el renglón nuevo "Columnas de esquina" (copia de Columnas) contaba como un precio más
  al armar la lista de perfiles y le daba ventaja al precio de Columnas. Ahora no vota; la esquina toma el perfil de
  Columnas después. (Probado con "pollo casa c/ aberturas".)
- El aviso "revisá el precio" se ve aunque el perfil esté plegado (al abrir otro proyecto la lista recordaba lo
  plegado y el aviso quedaba escondido). Dice también "o el más alto si empataban".

## [1.22.0] - 2026-10-20
### Agregado
- **Perfiles de cada pared**: en cada pared, "Perfiles de esta pared" con Columnas, Horizontales (fajas), Montantes y
  Marco de piso y solera. Por defecto dicen "General (…)"; se cambia solo en la pared que es distinta.
- **Patrón alternado** (ej. 80x80 cada 2 m y 60x60 entre medio): columnas cada 2 m con un perfil + montantes cada
  1 m con otro, eligiéndolos en la pared (decisión de Leandro: con montantes, sin campos nuevos).
- **Columnas de esquina** con renglón propio en Materiales (son de dos paredes). En proyectos guardados arranca con el
  mismo perfil que sus Columnas.
- En el presupuesto, las piezas de una pared con perfil propio salen en su renglón, justo debajo del general:
  "Columnas (lado B)", "Montantes (lados B, D)"… Comparten barras con las demás partes de ese perfil.
- Aviso en la lista cuando hay dos perfiles iguales (ej. uno agregado a mano y el mismo que usa la grada).
- Editor de pieza: dice si la pieza usa el perfil de su pared o es columna de esquina.
### Cambiado
- Desplegables de perfil más cortos ("Caño 80x80x2.0 · 6 m · $ 30.000").

## [1.21.0] - 2026-10-20
### Agregado
- **Lista de perfiles** en Materiales: cada hierro se carga una vez con su **tipo** (caño cuadrado, rectangular,
  redondo, perfil C, perfil U, ángulo, planchuela u otro), sus **medidas en mm**, el **largo de barra** y el
  **precio**. El nombre se arma solo ("Caño estructural 80x80x2.0", 'Ángulo 1 1/2" x 3/16"') y el **peso** (kg/m)
  sale de las medidas. Cada perfil se pliega en una línea y muestra en qué partes se usa.
- **Qué perfil va en cada parte**: Columnas, Zanca, Horizontales… (y los caños de la grada) eligen un perfil de la
  lista en vez de escribirlo. Las partes con el mismo perfil comparten barras y precio siempre.
- **Peso del hierro a comprar** (kg) debajo del total del presupuesto.
### Cambiado
- El precio de una barra es del perfil: cambiarlo (en Materiales o en el Presupuesto) lo cambia en todas sus partes.
  Desaparece el aviso de "precios distintos" de la v1.20.1.
- **Proyectos guardados**: al abrirlos se arma la lista sola con los perfiles que tenían escritos ("80x80x2" y
  "80x80x2.0" quedan como uno). Si el mismo perfil tenía precios distintos, toma el más usado (si empatan, el más
  alto) y avisa una vez para que lo revises.

## [1.20.1] - 2026-10-20
### Cambiado
- **Precios distintos del mismo perfil**: en vez de un aviso largo en cada renglón, ahora hay uno solo por perfil
  en Materiales, con cada precio, quién lo usa y un botón **"Usar $X en todos"** para igualarlos y que compartan
  barras. (Al cambiar el perfil de un renglón, su precio no cambia solo: por eso quedaban distintos.)
- "Comparte barras con otros N renglones del mismo perfil" cuando son más de dos (antes, una lista eterna).

## [1.20.0] - 2026-10-20
### Agregado
- **Cortes compartidos**: los renglones que usan el mismo hierro (mismo perfil, largo de barra y precio) cortan de
  las mismas barras, como en el taller: las piezas chicas de uno entran en los sobrantes del otro. Las barras se
  reparten entre los renglones según los metros que usa cada uno, así el total da justo.
- El perfil se reconoce aunque esté escrito distinto: "80x80x2" = "80 x 80 x 2.0" = "80×80×2,0".
- Diagrama de cortes por grupo: cada pieza con el color de su renglón y cuántas barras se ahorran.
- En Materiales, debajo de cada perfil: "Comparte barras con…", o un aviso si el mismo perfil tiene otro precio.
- Casilla en Materiales para apagarlo y comparar (viene prendida).
### Cambiado
- Los presupuestos guardados pueden bajar algunas barras al abrirlos (en el loft de ejemplo, 2 barras).

## [1.19.0] - 2026-10-20
### Cambiado
- **Casillas en vez de "0 = sin"**: "☑ Lleva transversales" + "cada 1.50 m", y lo mismo en entrepiso (y entrepiso
  parcial), columnas del borde libre, montantes, altura de la escalera, solape de revestimientos, patas y travesaños
  de montaje y parantes de grada. Al volver a tildar recupera el último valor. Los proyectos guardados se abren igual.
- **Diálogos propios** en lugar de los cuadros grises del navegador: Guardar como, Renombrar, ¿Borrar?, cambios sin
  guardar ("Volver" / "Seguir sin guardar") y abrir un proyecto compartido.
- **Leyenda del 3D agrupada**: Estructura · Superficies · Ayudas · Opacidad · Partes, cada grupo con "todo / nada".
- **Texto más legible**: los textos chicos pasan a 0,75 rem como mínimo y el gris es más claro.
- Sin entrepiso se ocultan sus campos (apoyado en, piso 2, transversales del piso 2).
### Agregado
- **Ayuda "?"** en el encabezado (o la tecla ?): primeros pasos y atajos de teclado.
- **Bienvenida** la primera vez que se abre la app, con los 3 pasos para armar un presupuesto.

## [1.18.1] - 2026-10-19
### Cambiado
- **Valor inválido**: al salir del campo ya no vuelve solo al valor anterior. Queda lo escrito, marcado en rojo, con
  el aviso "se sigue usando 7.50 (Esc para volver)". Esc descarta lo escrito.
- **Aviso al cerrar**: si el proyecto abierto tiene cambios sin guardar, el navegador pregunta antes de cerrar o
  recargar la pestaña.
- **Celular**: el encabezado entra en un renglón (🐤, nombre, ● sin guardar, ↶ ↷, Guardar y ⋯). La versión pasa
  al menú ⋯.

## [1.18.0] - 2026-10-19
### Agregado
- **Pestañas** en el panel: Estructura · Paredes y aberturas · Materiales · Presupuesto (con el total a la vista).
  Se ve una sección a la vez (el panel pasó de ~7.400 px de alto a ~2.200). Se recuerda la última por navegador.
  Al imprimir salen todas.
- **Deshacer / rehacer** todo el proyecto (medidas, paredes, aberturas, piezas, materiales y precios): botones ↶ ↷
  en el encabezado y Ctrl+Z / Ctrl+Y (o Ctrl+Shift+Z), hasta 50 pasos. Lo que se escribe seguido en un campo se
  deshace junto. Abrir otro proyecto arranca el historial de cero.
- **Celular**: barra de pestañas fija abajo con una pestaña más, **3D**: o se ve el modelo o se ven los datos.
  Encabezado más corto con un menú **⋯** para lo secundario. Botones y campos de 44 px para tocar con el dedo.
- Foco de teclado visible en todos los botones; ← y → pasan de una pestaña a otra.

## [1.17.0] - 2026-10-19
### Agregado
- **Aberturas dentro de cada pared**: cada pared muestra sus puertas y ventanas con "+ Puerta" / "+ Ventana" (van al
  primer lugar libre). Ya no hay una tarjeta Aberturas aparte. Para pasar una abertura a otra pared se cambia "Pared".
- **Etiqueta de cada abertura** (ej. "Ventana cocina") con mostrar/ocultar, igual que las paredes; en el 3D se ve
  "#2 Ventana cocina".
- **Montantes**: verticales livianos entre columnas, cada X m por pared (0 = sin), con renglón propio. En una abertura
  se parten en **montante de dintel** (arriba) y **montante de antepecho** (abajo de la ventana).
- **Riostras en cruz en las paredes**: sin, en las puntas o en todos los vanos entre columnas (los vanos con una
  abertura no llevan). Van al renglón de riostras.
### Cambiado
- **Jambas de piso a solera** (antes solo del alto del vano). Cambia el largo de los marcos de aberturas.
- Glosario unificado con Leandro: "Alféizar" pasa a **Travesaño de antepecho**; "Horizontal de pared" a
  **Horizontal (faja)**; "Sep. verticales" a **Sep. columnas**.

## [1.16.0] - 2026-10-18
### Agregado
- **📏 Medir** en el 3D: tocás dos hierros o dos puntos y muestra la distancia (total, horizontal y vertical). Entre
  dos columnas mide de eje a eje, aunque las toques a distinta altura. Esc para salir.
- **Aberturas desde el 3D**: un clic en una puerta o ventana la selecciona y abre sus datos para editarla,
  duplicarla o quitarla. Cada abertura muestra su **número** (#1, #2…, el mismo de la lista).
- **Copiar y pegar** (Ctrl+C / Ctrl+V) la abertura o la pieza seleccionada; la copia aparece al lado.
- **Duplicar una pieza** (botón o Ctrl+V): la copia se corre 50 cm (una columna, hacia el centro de su pared;
  una horizontal, más arriba), se cotiza en el mismo renglón y se puede editar o quitar. Quedan listadas en la
  tarjeta "Piezas agregadas, eliminadas y editadas".
- **Juntas de paneles** en el 3D (capa nueva): dónde termina cada tira o placa, para acomodar las aberturas y
  desperdiciar menos.
- **Planta de la escalera** vista desde arriba en su tarjeta: escalón 1 (el más bajo) en verde, el último (llega
  al entrepiso) en amarillo y una flecha que sube.
- **Versión** de la app al lado del título (sale sola de package.json).
### Cambiado
- Editor de piezas verticales: "Arranca a / Termina a" (altura desde el piso del loft) en lugar de "acortar la punta".
- "Baja hacia" de la escalera ahora dice "(lado del escalón 1)".

## [1.15.0] - 2026-10-16
### Agregado
- Tarjeta **Materiales**: qué es cada material (perfil, largo de barra, excedente de las barras) y los
  **revestimientos** (paneles, chapas, placas), que reemplazan a "Tipos de panel".
- Cada revestimiento dice **cómo se vende**:
  - **A medida**: ancho útil, largo máximo y solape. Se cuentan tiras enteras del alto de cada pared (en una pared
    inclinada, cada tira con su alto mayor) y, si pasan el largo máximo, en tramos. El presupuesto muestra la lista
    para pedir ("8 × 4.95 m + …") y los m² que se pagan.
  - **Placa fija** (OSB, fenólico, durlock, chapa de medida fija): ancho × largo; se cuentan placas enteras por
    paño (parada o acostada, la que use menos).
- **Ubicación** del revestimiento, que elige el herrero: sobre los perfiles (tapa la estructura, como se ve ahora en
  el 3D) o embutido entre perfiles. Y su **espesor**.
- **Revestimiento interior** en cada pared (ej. durlock en cocina y baño), con su propio renglón y dibujado por dentro.
- **Duplicar** una abertura: la copia queda al lado si entra en la pared y no pisa otra.
### Cambiado
- El **Presupuesto** queda con cantidades y precios; el perfil y el largo de barra se cargan en Materiales.
- Los paneles ya no se cuentan por m² netos sino por **tiras enteras** (más real para comprar: incluye el
  recorte). Los proyectos guardados pasan a "a medida" con 1 m de ancho útil y 12 m de largo máximo: revisá esos
  datos con tu proveedor.

## [1.14.1] - 2026-10-16
### Cambiado
- **Marcos de aberturas** (dintel, jambas y alféizar) en su propio renglón del presupuesto; "Columnas y vanos" pasa a
  llamarse "Columnas". Arranca con el mismo perfil para que el herrero ponga el suyo.
- Cada **pared se pliega** desde su título (se recuerda por navegador).
- Editor de piezas: "Acortar la punta de abajo / de arriba" (y para una vertical dice de qué altura a qué altura va),
  "Perfil de esta pieza" en vez de "Se cotiza en el renglón". "Eliminar pieza" queda aparte, a la derecha y con
  borde, para no tocarlo sin querer en vez de "Cerrar".
### Arreglado
- Un proyecto llamado "Pollo casa" se descargaba como `pollo-pollo-casa-….json`.

## [1.14.0] - 2026-10-15
### Agregado
- **Entrepiso parcial**: el piso 2 puede ocupar solo una parte de la pared donde se apoya (ej. un altillo).
  Se carga con **largo × profundidad** y desde qué esquina arranca (vista desde afuera, como las aberturas).
  Largo 0 = toda la pared, como hasta ahora.
- **Viga de cierre** en los bordes del entrepiso que no tocan una pared, con su propio renglón en el presupuesto
  ("Viga de cierre del entrepiso") para que el herrero elija el perfil. Se puede pasar a otro perfil desde el editor
  de piezas.
- **Columnas del borde libre cada X m** (0 = solo en las puntas). Si un borde libre termina contra una pared, en esa
  punta va una columna sobre la pared.
### Cambiado
- El campo "Ancho" del entrepiso se llama **Profundidad**.
- En los proyectos con entrepiso que no llega a la pared de enfrente, ese borde pasa del renglón "Marcos" al de
  "Viga de cierre" (mismo perfil y precio de arranque, mismo total). Las columnas no cambian: los proyectos guardados
  toman la separación de las verticales de la pared donde se apoya el entrepiso, que era la regla de antes.
- El encabezado dice **🐤 Pollo Calculator**.

## [1.13.1] - 2026-10-14
### Cambiado
- La app se llama **Pollo Calculator** (título de la pestaña, encabezado y README). Los archivos descargados empiezan
  con "pollo-". La dirección, el formato de los archivos (.json) y lo guardado en el navegador no cambian.

## [1.13.0] - 2026-10-14
### Agregado
- Grada: **unión de parantes** con un caño bajo en cada pórtico (de adelante hacia atrás) y a lo largo (uniendo los
  pórticos), a la altura que se elija.
- Grada: **respaldo**, tabla de ancho elegible arriba de cada contrahuella (renglón "Tablón de respaldo", por metro).
- Grada: **elegir el caño** de cada parte (zancas, parantes, apoyos, vigas, uniones, riostras) de una lista de caños
  comunes. Escribe el perfil del renglón del presupuesto y el 3D dibuja la barra con ese grosor (también en escalera
  y montaje).
- Grada **desmontable**: en módulos a lo largo que se atornillan entre sí (pórticos en las puntas de cada módulo,
  junta de 2 cm, bulones en cada unión) y filas atornillables (tornillos por tablón en cada pórtico).
### Cambiado
- Las gradas guardadas antes se abren con unión de parantes y respaldo (se pueden destildar).
- Con módulos, las riostras "en los extremos" van en las puntas de cada módulo (cada uno se sostiene solo).

## [1.12.0] - 2026-10-14
### Agregado
- **Opacidad** regulable en la leyenda del 3D: Paneles, OSB y Hierros (de "se ve a través" a sólido), para ver cómo
  queda la construcción cerrada. Se recuerda por navegador.
- Tipos de panel con **color exterior e interior**: cada cara de las paredes y del techo se pinta con el suyo.
- **Compartir**: botón que copia un link con el proyecto adentro (medidas, aberturas, perfiles, precios y colores).
  Quien lo abre ve ese proyecto y puede guardarlo con "Guardar como…". No usa servidor: los datos van en el link.
- **PDF con la imagen del 3D**: al imprimir, arriba sale la vista actual (fondo blanco) con el nombre y la fecha.
### Cambiado
- Los tipos de panel guardados antes toman gris claro como color interior.

## [1.11.0] - 2026-10-14
### Agregado
- Proyecto de **montaje industrial** ("+ Montaje nuevo" y "Ejemplo: montaje" en Mis proyectos): varios componentes
  paramétricos en un mismo proyecto, cada uno con nombre, posición (x, z) y giro (0° o 90°).
  - **Mesa / bastidor**: largo, ancho, alto, patas en las esquinas e intermedias, marco superior e inferior,
    travesaños bajo la tapa, riostras en cruz (cabeceras o todos los lados) y tapa de chapa, madera o sin tapa.
  - **Tanque cilíndrico**: vertical (sobre patas) u horizontal (sobre cunas), diámetro, largo, espesor de chapa y
    tapas planas. Calcula chapas (anillos de envolvente + tapas), metros de soldadura, peso de chapa y litros.
- Presupuesto del montaje: patas y cunas, marcos y travesaños, riostras, chapa para tanques, chapa para tapas de mesa,
  tapas de madera (m²) y soldadura de chapa (m).
- 3D: tanques de chapa semitransparentes, tapas de mesa, capas "Estructura" y "Chapa", y "Mostrar" por componente.

## [1.10.0] - 2026-10-14
### Agregado
- Grada: campo "Tablones" con tres opciones: asiento y pie separados (como antes), asiento y pie del mismo tablón
  (un solo renglón "Tablones de grada" con los metros sumados) o un solo tipo de tablón por fila (N tablones iguales
  repartidos de adelante hacia atrás, con su ancho y cantidad).

## [1.9.0] - 2026-10-14
### Agregado
- Proyecto de **grada para espectadores** ("+ Grada nueva" y "Ejemplo: grada" en Mis proyectos): filas (cantidad,
  largo, profundidad, altura), tablón de asiento y de pie, pórticos (zanca inclinada + apoyo por fila + parantes cada
  N filas), vigas longitudinales y riostras en cruz atrás (sin, extremos o todos los vanos). Resumen con altura,
  profundidad, pórticos y capacidad aproximada; avisos de comodidad, baranda y falta de parantes. Presupuesto propio
  (perfiles por optimizador de cortes, tablones por metro). Las piezas se seleccionan, editan y eliminan igual.
- Escalera: hasta 12 parantes bajo la zanca por tramo y riostras en cruz entre parantes (renglón "Riostras en cruz",
  solo si se usan).
### Cambiado
- "Columnas bajo la zanca" pasa a llamarse "Parantes bajo la zanca"; la capa "Escalones" pasa a "Escalones y tablones".
- Cada tipo de proyecto muestra solo sus tarjetas, capas y renglones del presupuesto.

## [1.8.1] - 2026-10-14
### Cambiado
- Presupuesto: la nota del excedente de las barras aclara que depende del proveedor y que hay que cargar el de cada uno.
- PENDIENTES.md ordenado por tema; lo resuelto antes de la v1.7 queda en este CHANGELOG.

## [1.8.0] - 2026-10-14
### Agregado
- Escaleras en U (2 descansos) y de 3/4 de vuelta (3 descansos, tipo caracol): cada giro es de 90° para el mismo
  lado y cada descanso es un cuadrado plano. Un campo por descanso (en qué contrahuella va); al elegir la forma se
  reparten parejo.
- Aviso de paso libre (2 m): si un tramo pasa por debajo de otro o por debajo del entrepiso.
- Editar una pieza seleccionada en el 3D (además de eliminarla): recortar desde cada extremo, moverla (hacia las
  paredes o subirla) y cotizarla con otro perfil del catálogo. Atajo "Que termine en el piso 2" para columnas.
  Las ediciones se guardan con el proyecto y se pueden deshacer de a una o todas.
- Etiquetas de las paredes en el 3D: texto propio (ej. "Cocina") y opción de ocultar cada una.
### Cambiado
- La tarjeta "Piezas eliminadas" pasa a "Piezas eliminadas y editadas".
- "Escalera debajo del entrepiso" deja de ser aviso por sí solo: ahora se controla el paso libre.
- Una L guardada con la v1.7 se convierte sola (el descanso pasa a la lista de descansos).
### Corregido
- Al elegir forma con descansos o cambiar hacia dónde baja, el giro del 2º tramo se acomoda solo si quedaba imposible
  (antes no dejaba cambiar la forma).
- Las piezas de la escalera se describían con el nombre de una pared; ahora dicen "Escalera".

## [1.7.0] - 2026-10-13
### Agregado
- Escaleras (panel "Escalera"): llegan al borde libre del entrepiso y bajan hacia la pared elegida
  (paralela al borde o perpendicular). Forma recta o en L con descanso (contrahuellas hasta el descanso y
  hacia dónde baja el 2º tramo).
- Medidas: ancho, huella, contrahuella objetivo y altura total (0 = automática, piso 2 + espesor del piso).
  Todas las contrahuellas salen iguales; resumen con cantidad y medida de escalones y regla de comodidad
  (2 contrahuellas + huella entre 60 y 65 cm). Avisos si es incómoda, empinada o se sale de la planta.
- Estructura: zanca central por tramo, apoyos de escalón (2 ángulos o 1 recorte de caño central, editables),
  columnas bajo la zanca y 1/2/4 columnas en el descanso. Todo se puede seleccionar y eliminar en el 3D.
- Presupuesto: zanca y marco de descanso, apoyos, columnas de escalera, escalones de madera (u) y piso del descanso (m²).
- Capas "Escalera" y "Escalones" con color propio y "Mostrar: Escalera".
- Tarjetas del panel plegables (tocando el título); cada una recuerda si estaba abierta. Al imprimir sale todo.
- Leyenda de capas del 3D plegable ("Capas y colores"); en el celular arranca plegada.
- Botón "Ocultar 3D / Ver 3D": sin el visor, el panel de datos usa todo el ancho (cómodo para cargar en el celular).
### Cambiado
- Los proyectos y datos guardados con versiones anteriores se abren sin escalera.
- Los colores guardados se conservan al agregar capas nuevas (antes se hubieran reseteado).

## [1.6.0] - 2026-10-09
### Agregado
- "Mis proyectos": lista de proyectos guardados en el navegador. Guardar, Guardar como… (con el nombre que se
  quiera), Abrir, Duplicar, Renombrar y Borrar. Indicador "✓ Guardado / ● Cambios sin guardar" al lado del nombre
  y aviso antes de perder cambios.
- Exportar un respaldo de todos los proyectos e importarlo en otro navegador (no pisa los existentes y saltea
  proyectos rotos avisando cuáles).
### Cambiado
- El encabezado queda con "Mis proyectos", "Guardar" y "Guardar como…". Nuevo, Ejemplo y los archivos .json
  (descargar / abrir) pasan a la ventana "Mis proyectos".

## [1.5.0] - 2026-10-09
### Agregado
- Seleccionar un hierro con un clic en el 3D (se resalta en amarillo) y eliminarlo. Las piezas eliminadas
  salen del dibujo y del presupuesto, se guardan con el proyecto y se pueden restaurar desde una lista.
- "Mostrar:" en la leyenda del 3D: ocultar una pared, el techo, el piso o el piso 2 oculta su panel y sus hierros.
- Los refuerzos de las aberturas (dintel, jambas y alféizar) se dibujan en el 3D.
### Corregido
- Una columna que caía dentro de un vano se contaba entera: ahora se corta (tramo bajo el antepecho y sobre el dintel).
- Una jamba que coincidía con una columna se contaba dos veces: ahora la columna hace de jamba.

## [1.4.0] - 2026-10-02
### Cambiado
- "Nuevo" borra todos los datos: caja mínima de 3 x 3 x 2,40 m, sin aberturas, sin entrepiso ni transversales,
  techo plano, precios en $0, perfiles vacíos y un solo tipo de panel genérico.
### Agregado
- Botón "Ejemplo" que carga el loft de referencia.
- Capa "Paneles" del 3D: interruptor general y uno por cada pared (frente, laterales, fondo) y el techo.

## [1.3.0] - 2026-10-02
### Agregado
- Tipos de panel (nombre, descripción, precio por m², color): cada pared y el techo eligen el suyo.
  El presupuesto suma los m² por tipo y el 3D pinta cada superficie con el color de su panel.
- Separación de transversales por piso (planta baja y piso 2), con renglones separados en el presupuesto.
- "Excedente de las barras" (%): el optimizador corta sobre el largo real de la barra (nominal + excedente).
### Cambiado
- Archivo de proyecto: formato versión 3. Los archivos de la v1.2 (versión 2) se siguen abriendo y se convierten solos.
- Los datos guardados en el navegador con la v1.2 se convierten solos (no se resetean).
### Corregido
- Estructura de piso 2 con 50 % de desperdicio: dos piezas de 3,00 m ahora entran en una barra (6,06 m reales).

## [1.2.0] - 2026-10-01
### Agregado
- Guardar proyecto como archivo `.json` (con nombre) y abrirlo después; botón "Nuevo".
  Al abrir se valida todo y un archivo roto no reemplaza el proyecto actual.
- Color editable por capa desde la leyenda del 3D (columnas, marcos, pisos, aberturas, paneles, etc.).
- Capa "Aberturas" que se puede ocultar.
### Corregido
- Las transversales no se veían: quedaban tapadas por la placa OSB. Ahora el OSB es semitransparente
  y las transversales son un poco más gruesas que la estructura de piso.

## [1.1.0] - 2026-10-01
### Agregado
- Frente seleccionable entre los 4 lados (A, B, C, D): nombres de paredes, carteles en el 3D y cámara se reacomodan.
- Configuración por pared: separación de verticales (eje X) y horizontales (eje Y).
- Entrepiso apoyado contra el lado que se elija.
- Techo a una agua: lado de caída, pendiente %, vigas y correas de techo (cálculo, presupuesto y 3D).
- Transversales entre la estructura de los pisos, con separación editable (0 = sin).
- Aberturas editables directamente en la lista; perfil/material editable en cada renglón del presupuesto.
- Botón "Ver frente" y capas nuevas en el 3D (piso, piso 2, transversales, techo).
### Cambiado
- "Tirantes" pasa a "Estructura de piso" y "Estructura de piso 2", en renglones separados.
- La estructura de cada piso cruza la luz más corta.
- Paneles: renglón separado para muros y techo; el techo se mide sobre la pendiente.
- Datos guardados en el navegador: prefijo `micasa.v2.` (los de v1 se descartan una vez).

## [1.0.0] - 2026-09-30
### Recuperado
- UI completa desde el commit `273301f` (el `94696eb` la había borrado).
### Agregado
- Motor de cálculo en `src/motor/` con 25 tests (Vitest).
- Optimizador de cortes con merma y empalmes; diagrama de cortes por perfil.
- Validación de parámetros y aberturas.
- Capas visibles en el 3D, guardado en el navegador, botón Restablecer.
### Corregido
- Barras subestimadas ~22 %; cuelgue con paso 0; 3D y presupuesto desalineados;
  fuga de contextos WebGL; inputs que se reformateaban al tipear; scroll horizontal en celular.
### Quitado
- `jspdf` (sin uso), alta de insumos libres, CSS y assets de plantilla.
