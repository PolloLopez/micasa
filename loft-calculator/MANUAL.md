# Manual de Pollo Calculator (v1.59.0)

Guía corta para usar el sistema y chequear que todo ande. Cada parte termina con **✔ Chequeá**: lo que tenés que ver.

Página: https://pollolopez.github.io/micasa/

---

## 1. Lo básico

- Arriba están las pestañas: **Estructura · Paredes y aberturas · Materiales · Presupuesto · Instalaciones · Planos · Obra**.
- A la izquierda (o con **Ocultar 3D**) está el modelo 3D.
- **Guardar** guarda en este navegador. **Compartir** copia un link para otra persona. **Mis proyectos** abre los guardados.
- **Ctrl+Z** deshace, **Ctrl+Y** rehace. **?** abre la ayuda.

✔ Chequeá: cambiás el largo en Estructura y el 3D y el total del Presupuesto cambian solos.

---

## 2. Estructura

Medidas de la planta, alturas, pisos (perfil C o tirantes de madera), entrepiso, escalera, techo, pilotines y zapatas.

**Obra civil (hormigón y ladrillos)** (debajo de Terreno): la dosificación (cemento, arena y piedra por m³), los
pilotines **hormigonados en obra**, el **tapial** (los lados del lote, el alto y cada cuánto van las columnas) y la
profundidad del pilar, la cámara y el pozo. El pilar de luz, la cámara y el pozo se agregan en **Terreno** (+ Pilar de
luz, + Cámara séptica, + Pozo séptico). Abajo, "Lo que lleva" cada parte y lo que hay que comprar.

✔ Chequeá:
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

✔ Chequeá:
- Tildá "A futuro" en una ventana: en el 3D queda naranja transparente y el revestimiento no se descuenta.
- Poné un sillón con "Distancia al lateral" negativa: la ficha dice **"⚠ Se sale por el lateral…"** y en el 3D se ve
  con **contorno rojo**.
- Dos muebles encimados: dice **"choca con …"**.

---

## 4. El 3D

| Botón | Qué hace |
|---|---|
| ▶ Girar | Gira solo |
| Ver frente | Vuelve a la vista de frente |
| ☀ Sol | Sol del día y la hora que elijas, con sombras |
| ✨ Realista | Paneles sólidos, reflejos, sin ayudas de dibujo |
| 🔩 Ver estructura de hierro | Oculta maderas, revestimientos, aberturas y muebles: quedan marcos, montantes y perfiles C |
| 🎨 Color por perfil | Cada pieza del color de su caño (el mismo perfil, el mismo color), con leyenda de piezas y metros |
| 🏠 Ver adentro | Oculta las paredes (y el techo) que te tapan mientras girás |
| 👁 Primera persona | Ves a la altura de los ojos (arrastrás para mirar, W A S D para caminar, Esc sale) |
| 📏 Medir | Tocás dos puntos y te da la medida |
| ▸ Capas | Prender y apagar partes (por ejemplo **Lo enterrado**, para no ver pilotines bajo tierra) |

**Mover un mueble o una abertura**: tocalo → en el cartelito **✥ Mover** → arrastralo o usá las flechas
(1 cm; con Shift, 10 cm). **R** gira el mueble. Esc termina. Sin "✥ Mover" no se mueve (así no se corre sin querer).

**Personas**: tocá una persona y después:
- el **piso** → camina hasta ahí (esquiva todo, pasa por las puertas y por debajo de la escalera agachándose);
- **algo** → va y se agacha, estira el brazo o se estira según la altura;
- la **cama** → se acuesta; el **sillón, una silla o el inodoro** → se sienta; el **plato de ducha** → se mete.
- **🎮 Manejar con el teclado**: W A S D, Shift corre, C se agacha. **👁 Ver con sus ojos**.

Los perros caminan solos y olfatean. Las puertas de los tabiques se abren cuando pasa una persona.

✔ Chequeá:
- Con **🎨 Color por perfil**, las columnas y las vigas que son del mismo caño quedan del mismo color, y la leyenda
  dice cuántos metros hay de cada perfil.
- Un mueble arrastrado contra la pared **se frena** (no queda medio afuera).
- Una ventana con ✥ Mover y → se corre por su pared; ↑ sube el antepecho.
- **☀ Sol + 🏠 Ver adentro**: la luz entra **solo por las ventanas y puertas** (no por la pared que se ocultó).
- La persona se **sienta** en el sillón y se **acuesta** en la cama; se levanta al darle otra orden.
- Pasando por un tabique con puerta, la puerta **se abre** y después se cierra sola.

---

## 5. Materiales

Perfiles de tu lista, largo de barra, revestimientos, proveedores y precios.

**Accesorios y consumibles**: cada uno es **"Estimada sola"** (se calcula con los kilos de hierro, su superficie o los
m² de paneles por un coeficiente que podés cambiar) o **"A mano"**. Vienen: electrodos, tornillería, sellador y antióxido.

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
- Sub-pestañas: **Lista de materiales** (para pedir), **Por proveedor**, **Cortes** (cómo cortar cada barra),
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

- **Planos**: cada pared y planta acotadas.
- **Imprimir / Exportar**: elegís qué sale (PDF o Excel). Atajos: **Solo planos**, **Por partes** (cada piso desde
  arriba y el adentro desde cada lado, sin esa pared).

- Las **plantas** muestran pilotines y zapatas (punteados), tabiques con su puerta, mesadas y muebles.
- **Seguimiento de la obra** (en Datos): lo contratado, lo pagado y lo que falta, con los pagos de cada rubro.

✔ Chequeá: el PDF con "Por partes" trae la hoja "Vistas por partes"; si cargaste mano de obra, sale **Precio de la obra**;
con pagos cargados, sale **Seguimiento de la obra** (y en el Excel, la hoja "Seguimiento").

---

## Lo que todavía no hace (para no buscarlo)

- Subir o bajar la escalera caminando; salir al terreno.
- Abrir las puertas de los muebles (heladera, placard).
- Mover mesadas y tabiques desde el 3D (se editan en su ficha).
- Precios con fecha de actualización.
