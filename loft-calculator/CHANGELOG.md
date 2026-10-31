# Changelog

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
