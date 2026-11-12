# Manual de Pollo Calculator (v1.51.1)

Guía corta para usar el sistema y chequear que todo ande. Cada parte termina con **✔ Chequeá**: lo que tenés que ver.

Página: https://pollolopez.github.io/micasa/

---

## 1. Lo básico

- Arriba están las pestañas: **Estructura · Paredes y aberturas · Materiales · Presupuesto · Planos · Obra**.
- A la izquierda (o con **Ocultar 3D**) está el modelo 3D.
- **Guardar** guarda en este navegador. **Compartir** copia un link para otra persona. **Mis proyectos** abre los guardados.
- **Ctrl+Z** deshace, **Ctrl+Y** rehace. **?** abre la ayuda.

✔ Chequeá: cambiás el largo en Estructura y el 3D y el total del Presupuesto cambian solos.

---

## 2. Estructura

Medidas de la planta, alturas, pisos (perfil C o tirantes de madera), entrepiso, escalera, techo, pilotines y zapatas.

✔ Chequeá: si la escalera no entra, su tarjeta avisa "La escalera se sale de la planta".

---

## 3. Paredes y aberturas

- **Paredes**: columnas, fajas, revestimiento y sus puertas y ventanas.
- **Mesadas**: recta, en L o en U, con huecos, bachas y electrodomésticos adentro.
- **Tabiques**: divisiones de Durlock con puerta de abrir o granero. Elegís desde dónde medís (la esquina izquierda o
  derecha; si es paralelo, su pared o la de enfrente; la puerta, desde el arranque o la punta) y el **sentido** de la
  puerta (de izquierda a derecha o al revés: la bisagra o hacia dónde corre).
- **Muebles y electrodomésticos**: elegí en "Mueble a agregar" (separado en Muebles, Electrodomésticos y Baño) y
  **+ Agregar**. Nuevos: televisor, cafetera, horno de aire, máquina de pan.
  - Los chicos (cafetera, horno de aire, máquina de pan) se **apoyan solos** sobre la mesada o el mueble de abajo.
- **Personas y perros**: **+ Persona** (nombre, sexo, altura) y **+ Perro** (tamaño, pelaje).
- Si por la puerta de un tabique no se puede pasar, su ficha avisa **"⚠ Por esta puerta no se puede pasar"** y dice qué la
  traba, de qué lado, a cuánto queda y cuánto correrlo (hacen falta 0,50 m libres de cada lado).
- **"Mostrarla abierta en el 3D"**: la puerta queda abierta; si no, está cerrada y se abre sola cuando pasa alguien. La de
  abrir muestra en el piso hacia dónde abre (celeste; rojo si algo la traba).

✔ Chequeá:
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
- Sub-pestañas: **Lista de materiales** (para pedir), **Por proveedor**, **Cortes** (cómo cortar cada barra),
  **Precios y detalle**.

✔ Chequeá: con mano de obra por m², 5 % de imprevistos, 15 % de ganancia e IVA 10,5 %, el precio de la obra es mayor
que los materiales y la pestaña "Presupuesto" muestra ese precio.

---

## 7. Obra (seguimiento)

- **Armar desde el presupuesto**: crea un rubro por proveedor (o "Materiales") y la mano de obra.
- **+ Rubro a mano**: electricista, plomero, flete…
- En cada rubro: estado (pendiente, contratado, en curso, terminado), monto contratado, fechas y **+ Pago**
  (fecha, monto, medio, nota). Podés cargar varios pagos.

✔ Chequeá: con un pago parcial, el rubro dice "pagado $X de $Y · falta $Z" y arriba se suman Pagado y Falta pagar.

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
