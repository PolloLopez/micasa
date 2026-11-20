# Manual de Pollo Calculator (v1.63.0)

Guía corta para usar el sistema y chequear que todo ande. Cada parte termina con **✔ Chequeá**: lo que tenés que ver.

Página: https://pollolopez.github.io/micasa/

---

## 1. Lo básico

- Arriba están las pestañas (con su ícono): **Estructura · Paredes y aberturas · Materiales · Presupuesto · Instalaciones · Planos · Obra**.
- **Dentro de cada pestaña hay sub-pestañas** (ej. Estructura: Planta · Pisos · Escalera · Techo · Fundación y terreno · Piezas a mano). Se ve una a la vez y recuerda la última. Si tocás algo en el 3D, se abre sola la que corresponde.
- **El borde entre el 3D y el panel se arrastra** para darle más lugar a uno o al otro (doble clic: vuelve como estaba).
- A la izquierda (o con **Ocultar 3D**) está el modelo 3D.
- **Guardar** guarda en este navegador. **Compartir** copia un link para otra persona (de fábrica, **sin la parte de plata**: pagos, compras, contratistas y finanzas quedan solo en tu navegador; destildalo si querés mandarla). **Mis proyectos** abre los guardados.
- **Ctrl+Z** deshace, **Ctrl+Y** rehace. **?** abre la ayuda.

✔ Chequeá: cambiás el largo en Estructura y el 3D y el total del Presupuesto cambian solos.

---

## 2. Estructura

Medidas de la planta, alturas, pisos (perfil C o tirantes de madera), entrepiso, escalera, techo, pilotines y zapatas.
En **Pisos**, **Recortes de placas** es el % que se suma al OSB y al machimbre (de fábrica 10 %).

Las notas grises largas muestran una línea: tocá **más ▾** para leerlas enteras.

**Obra civil (hormigón y ladrillos)** (debajo de Terreno): la dosificación (cemento, arena y piedra por m³), los
pilotines **hormigonados en obra**, el **tapial** (los lados del lote, el alto y cada cuánto van las columnas) y la
profundidad del pilar, la cámara y el pozo. El pilar de luz, la cámara y el pozo se agregan en **Terreno** (+ Pilar de
luz, + Cámara séptica, + Pozo séptico). Abajo, "Lo que lleva" cada parte y lo que hay que comprar.

- **Mezcla**: elegí **"como lo dice el albañil"** (1:2:3 = 1 balde de cemento, 2 de arena y 3 de piedra). Si no sabés,
  dejá la de fábrica.
- **Tapial encadenado**: un **pilotín bajo cada columna** (diámetro y profundidad), la viga de fundación que los une, las
  columnas cada X m y el encadenado. Elegí el **ladrillo** (hueco 8, 12 o 18, común o bloque).
- **Encofrado**: con **placas fenólicas propias** calcula las placas y los tirantes para los tramos que encofrás a la
  vez (se reusan en los siguientes).
- **Portón corredizo**: tildá "Dejar el hueco…", elegí el lado, desde dónde, el ancho y el alto, y con qué cerrás la hoja
  (chapa o metal desplegado). Suma el bastidor de caño (con su hoja de corte), la chapa, el riel y los herrajes.
- **Según el albañil**: lo que él te dijo que lleva el tapial (ej. 25 bolsas de cemento) manda sobre lo calculado. 0 =
  vuelve a lo calculado.

En **Pisos**, cada piso: **Tirantes y transversales** (en el mismo plano o los tirantes apoyados encima); en el mismo
plano, **Queda entero** (el tirante o el transversal) y la **Altura** (al ras del borde o eje con eje); y **Borde y
tirantes** (cuál queda entero). Ya no están repetidos en Materiales → Uniones. Los **tirantes de madera** se piden en tablas de largo comercial (3,05 / 3,66 / 4,27 / 4,88 m): el renglón dice cuántas de cada una.
En **Techo**: "Vigas y correas" (apoyadas o en el mismo plano) y su altura.

**Piezas agregadas, eliminadas y editadas**: cada renglón dice el perfil, el largo, si es vertical u horizontal y a qué
altura. Pasá el mouse por encima (o tocá el 👁) y la pieza se pinta de rosa en el 3D; si está **eliminada** aparece
como fantasma en su lugar, así ves cuál es antes de tocar **Restaurar**.

✔ Chequeá:
- Con "Arriba al ras del borde", los perfiles C del piso quedan con la cara de arriba pareja con el borde.
- Pasando el mouse por una pieza eliminada, aparece rosa en el 3D y el cartel dice "1 pieza".
- Cambiar "Tirantes y transversales" ya no traba la app (aunque tengas piezas editadas a mano).
- Si la escalera no entra, su tarjeta avisa "La escalera se sale de la planta".
- Con terreno, tildá "Lateral izquierdo" y "Fondo" en el tapial: en el 3D aparece el muro y el largo es la suma de esos
  lados. Subí el cemento de la dosificación: suben las bolsas.
- Con "Hormigonados en obra", el renglón "Pilotines" sale del presupuesto y aparecen cemento, arena, piedra y hierro.

---

## 3. Paredes y aberturas

- **Paredes**: columnas, fajas, revestimiento y sus puertas y ventanas. El **texto de la etiqueta** de cada pared
  (por ejemplo "Vecino" o "Patio") pasa a ser su nombre en toda la app: tarjetas, listas, planos, PDF y Excel.
- **Mesadas**: recta, en L o en U, con huecos, bachas y electrodomésticos adentro.
- **Tabiques**: divisiones de Durlock con puerta de abrir o granero. Elegís desde dónde medís (la esquina izquierda o
  derecha; si es paralelo, su pared o la de enfrente; la puerta, desde el arranque o la punta) y el **sentido** de la
  puerta (de izquierda a derecha o al revés: la bisagra o hacia dónde corre).
- **Tornillos, cinta y masilla** (abajo de los tabiques): las soleras y el dintel van como PGU en su renglón; T1 por montante, T2, cinta y masilla por m² de placa. Los rendimientos se cambian ahí (validalos con el durlero).
- **Muebles y electrodomésticos**: elegí en "Mueble a agregar" (separado en Muebles, Electrodomésticos y Baño) y
  **+ Agregar**. Nuevos: televisor, cafetera, horno de aire, máquina de pan.
  - Los chicos (cafetera, horno de aire, máquina de pan) se **apoyan solos** sobre la mesada o el mueble de abajo.
- **Personas y perros**: **+ Persona** (nombre, sexo, altura) y **+ Perro** (tamaño, pelaje).
- Si por la puerta de un tabique no se puede pasar, su ficha avisa **"⚠ Por esta puerta no se puede pasar"** y dice qué la
  traba, de qué lado, a cuánto queda y cuánto correrlo. Lo que hace falta libre se cambia en **"Lugar libre a cada lado
  para pasar"** (de fábrica 0,50 m la de abrir y 0,35 m la corrediza).
- **"Mostrarla abierta en el 3D"**: la puerta queda abierta; si no, está cerrada y se abre sola cuando pasa alguien. La de
  abrir muestra en el piso hacia dónde abre (celeste; rojo si algo la traba).

- **A futuro** (en cada abertura): arma su marco pero la pared va revestida entera (se corta después).
- **💡 Corriéndola N cm…** (en cada abertura, si conviene): su borde cae en una junta de los paneles y ahorrás panel.
  **Correrla** la mueve.

✔ Chequeá:
- Tildá "A futuro" en una ventana: en el 3D queda naranja transparente y el revestimiento no se descuenta.
- Poné un sillón con "Distancia al lateral" negativa: la ficha dice **"⚠ Se sale por el lateral…"** y en el 3D se ve
  con **contorno rojo**.
- Dos muebles encimados: dice **"choca con …"**.

---

## 4. El 3D

La barra está en tres grupos: **cámara** (Girar, Frente, Terreno), **qué se ve** (Realista, Sol, Adentro, **Solo paneles** (las tiras con sus juntas, para ver los cortes), Solo hierro,
Por perfil) y **herramientas** (Recorrer, Medir, **?** = cómo moverse). Con el 3D angosto quedan los íconos.

| Botón | Qué hace |
|---|---|
| ▶ Girar | Gira solo |
| Ver frente | Vuelve a la vista de frente |
| ☀ Sol | Sol del día y la hora que elijas, con sombras |
| ✨ Realista | Paneles sólidos, reflejos, sin ayudas de dibujo |
| 🔩 Ver estructura de hierro | Oculta maderas, revestimientos, aberturas, muebles, mesadas, instalaciones, tabiques (el baño de montantes), personas y perros: quedan marcos, montantes y perfiles C |
| 🎨 Color por perfil | (Prendido de fábrica) cada pieza del color de su caño: el mismo perfil, el mismo color, con leyenda de piezas y metros |
| 🏠 Ver adentro | Oculta las paredes (y el techo) que te tapan mientras girás |
| 👁 Primera persona | Ves a la altura de los ojos (arrastrás para mirar, W A S D para caminar, Esc sale) |
| 📏 Medir | Tocás dos puntos y te da la medida |
| ▸ Capas | Prender y apagar partes (por ejemplo **Lo enterrado**, para no ver pilotines bajo tierra). Las **etiquetas del terreno** (línea municipal, calle, pozo, pilar) arrancan apagadas: se prenden acá. El **tapial** arranca apagado: se prende en **Terreno → Tapial** |

**Tocar un panel**: un clic en una pared revestida (donde no hay un hierro) pinta de amarillo esa **tira** y un cartel
dice cuál es (tira 4 de 8, de izquierda a derecha vista desde afuera, igual que en Planos), su ancho, de qué largo se
pide (o en cuántos pedazos) y qué cortarle (a lo largo, inclinado arriba, el hueco de una ventana). En placa fija dice
la columna y la fila. Esc o ✕ lo suelta.

**Mover un mueble o una abertura**: tocalo → en el cartelito **✥ Mover** → arrastralo o usá las flechas
(1 cm; con Shift, 10 cm). **R** gira el mueble. Esc termina. Sin "✥ Mover" no se mueve (así no se corre sin querer).

**Personas**: tocá una persona y después:
- el **piso** → camina hasta ahí (esquiva todo, pasa por las puertas y por debajo de la escalera agachándose);
- **algo** → va y se agacha, estira el brazo o se estira según la altura;
- la **cama** → se acuesta; el **sillón, una silla o el inodoro** → se sienta; el **plato de ducha** → se mete.
- **🎮 Manejar con el teclado**: W A S D, Shift corre, C se agacha. **👁 Ver con sus ojos**.

Los perros caminan solos, olfatean y a veces se suben al sillón o a la cama. Tocando un perro y después el sillón o la
cama, se sube y se echa. Nadie se encima: el que encuentra a otro en el camino espera o lo rodea. El sillón tiene un
lugar por cuerpo (en su ficha: **Cuerpos**) y la cama de 2 plazas, dos; lleno, avisa "está ocupado". Las puertas de los
tabiques se abren cuando pasa una persona.

✔ Chequeá:
- Con **🎨 Color por perfil**, las columnas y las vigas que son del mismo caño quedan del mismo color, y la leyenda
  dice cuántos metros hay de cada perfil.
- Un mueble arrastrado contra la pared **se frena** (no queda medio afuera).
- Una ventana con ✥ Mover y → se corre por su pared; ↑ sube el antepecho.
- **☀ Sol + 🏠 Ver adentro**: la luz entra **solo por las ventanas y puertas** (no por la pared que se ocultó).
- La persona se **sienta** en el sillón y se **acuesta** en la cama; se levanta al darle otra orden.
- Mandá a dos personas al sillón: se sientan en cuerpos distintos. Dos que se cruzan no se atraviesan.
- Pasando por un tabique con puerta, la puerta **se abre** y después se cierra sola.

---

## 5. Materiales

Perfiles de tu lista, largo de barra, revestimientos, proveedores y precios.

Cada apartado (Proveedores, Perfiles, Qué perfil va en cada parte, Otros materiales, Materiales que agregás vos,
Revestimientos) se pliega tocando su título, y cada material o proveedor es una ficha plegable. Plegada, cada ficha
dice lo importante: el material, su precio en el proveedor elegido en el Presupuesto y, si ese no lo vende o hay uno
más barato, **desde cuánto y dónde**. Arriba avisa cuántos materiales no tienen precio en ningún proveedor.

**Proveedor en dólares** (ej. ALPANEL): en su ficha, **Cotiza en: Dólares** y cargá el **dólar** del día. Sus precios se
cargan en US$ (con centavos, "300,50") y debajo ves cuánto da en pesos. El flete va en pesos.

**Panel por tira entera**: en el revestimiento, **Se cobra: por tira entera** y el largo de la tira. La app acomoda los
pedazos de cada pared en tiras enteras (los recortes, en la misma pared) y el precio es por tira. En **Presupuesto →
Cortes** ves de qué tira sale cada pedazo. Si destildás "Descontar las aberturas", pedís todo entero y los huecos los
cortás vos (la ficha dice cuántas tiras más son).

**Comparar y mover recortes** (panel por tira entera): en la ficha del panel, **Comparar** muestra cuántas tiras (y
cuánta plata) son sin usar recortes, usándolos en la misma pared o entre paredes, con o sin descontar aberturas. En
**Presupuesto → Cortes**, cada pedazo tiene **sale de…** para elegir de qué tira cortarlo (de otra pared o una tira
nueva) y cada tira con sobrante tiene **usar el sobrante en…** (elegís en qué pared va ese recorte). En **Comparar**
tocá la opción que querés usar. En el 3D, con **Solo paneles**, cada pedazo dice su tira (T3). En el 3D y en el plano de cada pared, en
**naranja** el empalme (el tramo de arriba va por fuera del de abajo) y en **verde** el encastre (el costado que
monta sobre la tira de al lado; cargá el ancho total del panel para verlo).

**Precios de un material**: se ven solo los proveedores que lo tienen. **+ Precio en otro proveedor…** suma otro, o
**+ Proveedor nuevo…** lo crea ahí mismo.

**Descartar un proveedor**: en su ficha, **Descartar**. No aparece más en el presupuesto ni en las listas; queda abajo en
"Descartados" para volver a usarlo o borrarlo del todo.

**Cargar los precios de un proveedor de una vez**: abrí el proveedor. Abajo de sus datos está **la lista de todos los
materiales de la obra** con su precio ahí (efectivo y tarjeta). De fábrica ves solo lo que tiene precio ahí; tildá "Ver también lo que no tiene precio" para
cargar lo que te pasó en su lista. Un precio absurdo (mil millones o más) sale marcado con ⚠ para revisar.

**Agregar un material**: en "Materiales que agregás vos", **+ Agregar material** (arranca abierto): nombre,
descripción, cantidad a mano o estimada, unidad y precio en cada proveedor. Entra al Presupuesto.

**Revestimiento**: cargá el **ancho total** de la tira y el **encastre** (lo que monta sobre la de al lado), como dice el
catálogo: el ancho útil sale solo (ej. 1000 − 50 = 950 mm). También: dónde va la tira angosta (derecha, izquierda o
repartida) y el **costado mínimo** al lado de una abertura (con menos, la tira se parte y el costado es un relleno).

**Descontar las aberturas** (en cada revestimiento): tildado, se pide cortado (el proveedor saca los huecos);
sin tildar, entero y los huecos se cortan en obra. Debajo dice cuánto te ahorrás descontándolas, en m² y en plata:
es lo que arriesgás si un hueco viene mal cortado.

**Cortes de hierro**: el ancho del disco, desde qué largo un sobrante se guarda y si los empalmes van con la unión sobre
un apoyo (en "Qué perfil va en cada parte").

**Accesorios y consumibles**: cada uno es **"Estimada sola"** (se calcula con los kilos de hierro, su superficie o los
m² de paneles por un coeficiente que podés cambiar) o **"A mano"**. Vienen: electrodos, tornillería, sellador y antióxido.

✔ Chequeá: abrí un proveedor, cargá un precio en su lista: el encabezado pasa de "2 de 30 precios" a "3 de 30" y el
material muestra ese precio.
✔ Chequeá: en cada consumible estimado aparece "≈ N unidades (medida x coeficiente)". Si cambiás el coeficiente,
cambia la cantidad y el presupuesto.

---

## 6. Presupuesto

- Arriba, el **total**. Debajo, **"Mano de obra, imprevistos, ganancia e IVA"**: con algo cargado, arriba pasa a decir
  **PRECIO DE LA OBRA** y abajo ves la cuenta (materiales + mano de obra = costo directo; + imprevistos; + ganancia;
  + IVA).
- **Mano de obra por segmento** (en el mismo bloque): pilotines, estructura, revestimiento, tabiques, tapial, pozo
  séptico, electricista, plomero (y los que agregues). Elegís cómo cobra cada uno (monto, por m², por metro de tabique,
  por pilotín, por kg…) y te muestra cuánto da.
- **Lo que no tiene precio**: arriba del Presupuesto, "⚠ N materiales sin precio". Tocalo y tocá un material: te lleva a su ficha en Materiales, abierta, para cargarle el precio.
- **Precios de ejemplo**: si la ficha de un proveedor dice "⚠ N precios de ejemplo", son números que puso la app (no los de ese proveedor): cargá los de verdad o tocá "Borrar los de ejemplo".
- **Precio por kilo**: si el corralón te cotiza el hierro en $/kg, cargalo en la columna "o $/kg" (en el proveedor o en el perfil): la barra sale de su peso. En la ficha del proveedor podés poner el mismo $/kg a todos sus hierros de una vez.
- **Precios viejos**: cada proveedor dice de qué fecha son sus precios; pasados 30 días el Presupuesto avisa. Si le preguntaste y no cambiaron, tocá "Siguen iguales hoy" en su ficha.
- **Lista de compras** (en Obra; desde acá, el botón **🛒 Lista de compras (en Obra)**): cada material por proveedor y por parte. Poné cuánto retiraste y
  tocá **Retirado** (queda como deuda) o **Pagado** (se anota solo en Compras hechas); **↶ Deshacer** borra la última marca si te equivocaste; **Pagar lo retirado** salda la
  deuda. En **Se lo compro a…** cambiás el proveedor de ese renglón, o "a nadie" si lo conseguís vos.
- Sub-pestañas: **Lista de materiales** (para pedir), **Por proveedor**, **Cortes** (la hoja de corte: Barra 2.3 = grupo 2,
  barra 3; cada pieza con su letra, 2.3b, igual que en el 3D y en los planos; ⛓ = tramo de un empalme),
  **Precios y detalle** (ahí también el total con cada proveedor).
- **Comparar revestimientos** (abajo): la obra con cada panel en las 4 paredes y la diferencia; "Usar en las 4 paredes".

✔ Chequeá: con mano de obra por m², 5 % de imprevistos, 15 % de ganancia e IVA 10,5 %, el precio de la obra es mayor
que los materiales y la pestaña "Presupuesto" muestra ese precio.

---

## 6b. Instalaciones

- Elegí el sistema arriba (**Eléctrica, Agua, Desagües, Gas**).
- **+ Punto**: elegí qué es (toma, canilla, garrafa…). En su ficha: la pared, la distancia desde la esquina izquierda
  (mirando la pared desde afuera), la altura y, si va en el medio del techo, cuánto hacia adentro.
- **+ Tramo**: de qué punto a qué punto, con qué caño o canalización (y el cable en la eléctrica), a qué altura corre por
  afuera y el largo extra si sigue afuera de la casa. Dice el largo y las curvas.
- Abajo, la **lista de materiales** con su precio (cargá los tuyos): su total va al presupuesto.
- **Equipos** (más abajo): **+ Aire** (frigorías, m² del ambiente, pared y altura), **+ Salamandra** (dónde va, caño y
  por dónde sale) y **Va con energía solar** (consumo por mes, paneles y termotanque solar).

✔ Chequeá:
- Un tablero en el frente y una toma en el lateral: el tramo dobla 1 esquina y la lista trae caños, cuplas, curvas,
  grampas, conectores, las cajas y el cable.
- En el 3D se ve el caño por afuera; en **Capas → Instalaciones** se apaga. En **Planos**, cada instalación tiene su
  casilla; al imprimir, una hoja por sistema.
- Un aire de 2.250 frigorías para 20 m² dice **"⚠ No alcanza"** y sugiere uno de 3.000.
- Con 300 kWh por mes salen 7 paneles; con un termotanque solar de 200 l, aviso de apoyarlo sobre las vigas.

---

## 7. Obra (seguimiento)

- **Partes de la obra**: cada parte (Pilotines y zapatas, Paredes, Techo, el pozo…) con su casilla **Terminada**: lo
  que lleva ya no falta comprar.
- **Comparar presupuestos en una parte** (ej. el Tapial): **+ Material para Tapial** (Ladrillo hueco 8, 300 u) y en su
  ficha el precio de cada corralón: entra al presupuesto y a la lista de compras, comprando donde conviene. **+
  Presupuesto de mano de obra**: quién y cuánto te cobra en total (uno por albañil); el más barato sale marcado.
  **Elegir** pasa ese monto a la mano de obra del Presupuesto y crea el trabajo en el seguimiento con su nombre.
  **📋 Copiar pedido para cotizar** copia la lista de esa parte (sin precios) para pegarla en WhatsApp y pedirle precio
  a cada corralón. En **Mano de obra** ves el trabajo de esa parte (quién, % hecho,
  pagado); con la parte terminada, **Marcar el trabajo terminado** lo pone al 100 %. El trabajo se une desde la parte
  ("Unir un trabajo") o desde el seguimiento ("Parte de la obra").
- **Compras hechas**: **+ Compra** (fecha y proveedor) y en cada renglón el material de la lista (ej. Cemento · 12
  bolsas · $ 150.000 · para Pilotines) u "Otro" para un ticket suelto. Queda pagada; si dejaste seña, destildá "Pagada
  entera" y poné cuánto falta. El Presupuesto muestra **ya gastado** y **falta comprar**, y la lista de materiales lo
  comprado de cada uno ("Copiar lo que falta" para el próximo pedido).
- **Contratistas** (abajo del seguimiento): **+ Contratista** (nombre, oficio, teléfono). En cada trabajo elegís su
  contratista; cada uno agrupa sus trabajos con lo contratado, lo pagado y lo que falta. **Marcar pagado todo** carga lo
  que falta como un pago de hoy.
- **Armar desde el presupuesto**: crea un rubro por proveedor (o "Materiales") y uno por cada segmento de mano de obra.
- **+ Rubro a mano**: electricista, plomero, flete…
- En cada rubro: **Avance** (cuánto está hecho, en %), quién lo hace, monto contratado, fechas y **+ Pago** (fecha,
  monto, medio, nota). La etapa sale sola: **Presupuestado → En proceso → Finalizado, falta pagar → Finalizado y
  pagado** (o **Pagado sin finalizar**).
- **Pagar en cuotas**: cantidad, cada cuota, mes de la primera y los meses dobles (de fábrica junio y diciembre).
- **Por proveedor o contratista** (abajo): el total de cada uno, lo pagado y lo que falta.
- **Terreno, créditos y acreedores**: **+ Compra en cuotas (terreno)** (en dólares) o **+ Crédito**, con anticipo y
  cuotas. **+ Acreedor**: después, en el pago que hizo otro, elegís **"Lo pagó…"** y queda lo que le debés. Lo que le
  devolvés va en **+ Devolución**.

✔ Chequeá:
- Un rubro con 40 % de avance y un pago parcial dice "En proceso · 40 % hecho · N % pagado".
- El terreno con anticipo USD 5.000 y 12 cuotas de USD 400: total USD 10.600 (junio y diciembre se pagan doble).
- Si el anticipo lo pagó un acreedor, su ficha dice "le debés USD 5.000". Los dólares no se mezclan con los pesos.

---

## 8. Planos e Imprimir / Exportar

- En **Imprimir / Exportar → Datos**: "Lista de compras por proveedor y compras hechas" (en el PDF y en la hoja *Compras* del Excel). Con "solo lo que falta comprar" sale la lista para llevar al corralón, con una casilla para tildar a mano.

- **Planos**: cada pared y planta acotadas. Abajo de cada pared, la tabla de **tiras de panel** (ancho, qué pedir y qué
  cortar) y en el dibujo las juntas punteadas. Con **"Paredes para el proveedor de paneles"** quedan solo el contorno y las
  aberturas con sus cotas (sin la estructura). Al imprimir, el atajo **Para quien cotiza paneles** hace lo mismo.
- **Imprimir / Exportar**: elegís qué sale (PDF o Excel). Atajos: **Solo planos**, **Por partes** (cada piso desde
  arriba y el adentro desde cada lado, sin esa pared).

- Las **plantas** muestran pilotines y zapatas (punteados), tabiques con su puerta, mesadas y muebles.
- En el plano de una pared sale también el **borde del entrepiso** que apoya sobre ella (con su altura acotada).
- **Plano de cada panel** (debajo de la tabla de tiras): un dibujo por pedazo a pedir, con ancho, largo, recortes
  (rayados) y en verde el costado que **superpone** (se elige en Materiales → el revestimiento → "Lado que superpone").
- Si una ventana o puerta deja menos de 30 cm de tira al costado, esa tira va en dos pedazos (abajo y arriba) y el
  costado se completa con un **relleno** de un retazo (la lista de rellenos está debajo de los planos).
- **Seguimiento de la obra** (en Datos): lo contratado, lo pagado y lo que falta, con los pagos de cada rubro.

✔ Chequeá: el PDF con "Por partes" trae la hoja "Vistas por partes"; si cargaste mano de obra, sale **Precio de la obra**;
con pagos cargados, sale **Seguimiento de la obra** (y en el Excel, la hoja "Seguimiento").

---

## Lo que todavía no hace (para no buscarlo)

- Subir o bajar la escalera caminando; salir al terreno.
- Abrir las puertas de los muebles (heladera, placard).
- Mover mesadas y tabiques desde el 3D (se editan en su ficha).
- Precios con fecha de actualización.
