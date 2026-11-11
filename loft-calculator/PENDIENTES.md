# PENDIENTES — loft-calculator

Última limpieza: 2026-11-11 (v1.47.1). Espejo en Trello: tablero "Desarrollo", tarjetas `[CALC]`.

## 📌 Estado y próximos pasos (11/11)
En GitHub y publicado: hasta v1.47.0 (confirmar). **v1.47.1, v1.48.0 y v1.49.0 por subir.**

Lo que falta, en orden de prioridad (detalle en cada sección de abajo):
1. 🔴 **Validar con el herrero** los supuestos de obra (sección "Antes de considerar el presupuesto de obra") y
   llevarle la hoja de preguntas: es lo que más cambia el número final.
2. ✅ v1.48.0 **Consumibles automáticos** (electrodos, autoperforantes, sellador, antióxido) con coeficientes editables.
   - 🟡 [ ] Validar los coeficientes con el herrero (y el rendimiento del antióxido con el pintor).
   - 🟢 [ ] Tornillos del Durlock por m² de placa de los tabiques (hoy solo paneles de paredes y techo).
3. 🟡 **Seguimiento en el PDF y el Excel** (hoy solo en pantalla) + resumen "pagado / falta" en el PDF del cliente.
4. 🟡 **Precios con fecha** por proveedor y aviso de precios viejos (> 30 días).
5. 🟡 **Tabiques de Durlock completos**: PGU (soleras) aparte de PGC (montantes), tornillos, cinta y masilla.
6. 🟡 **Tabiques, mesadas, muebles, pilotines y zapatas en las plantas** (hoy solo 3D y listas).
7. 🟢 Personas: subir y bajar la escalera, puertas de muebles, sentarse/acostarse, esquivarse entre ellas.

Mejoras propuestas (técnicas, sin cambios aplicados):
- 🟡 **App.jsx y LoftCanvas.jsx muy grandes** (~1.500 y ~1.900 líneas): separar en hooks (`usePresupuesto`,
  `useSeguimiento`, `usePersonas3D`) y componentes de la barra del 3D. Hace más fácil cada cambio y testear.
- 🟡 **Tests de pantalla**: los flujos de Playwright que se usan para probar (mueble, personas, cierre, seguimiento)
  guardarlos en el repo (`e2e/`) para correrlos antes de cada deploy (`npm run e2e`).
- 🟡 **Respaldo del proyecto**: el trabajo vive en el navegador (localStorage); avisar si hace más de N días que no
  se guarda en archivo o en la nube, y guardar solo una copia en la nube al cerrar.
- 🟢 **Rendimiento del 3D**: geometrías y materiales compartidos entre piezas iguales (hoy una malla nueva por pieza);
  el modo realista con muchas piezas puede ir lento en el celular.
- 🟢 **Decisión pendiente (Construcción Modular)**: escribir el ADR "seguimiento dentro de Pollo Calculator, Django
  cuando crezca" para cerrar la opción A/B que quedó abierta en septiembre.

## 🗺️ Hoja de ruta (28/10, decisiones de Leandro): Estructura → Sol → Muebles
- ✅ **Pisos**: tirantes ↔ transversales con 3 opciones (mismo plano tirantes enteros / mismo plano
  transversales enteros / tirantes apoyados sobre los transversales) — v1.35.0.
- ✅ **Zapatas**: lado x lado x alto y profundidad de fundación; dibujo bajo tierra (capa propia); hormigón y
  excavación en el presupuesto — v1.35.0.
  - 🟢 [ ] Con tirantes apoyados, subir también el OSB del 3D (hoy queda a la altura de siempre).
- ✅ **Alero por lado** (v1.35.1) (frente, fondo, laterales; 0 = sin); vigas y correas: llegan al borde del alero o
  terminan en la estructura (cada una por separado).
- ✅ **Pilotines: forma y medida** (v1.36.0) (pedido de Leandro 29/10): redondo (diámetro) o cuadrado (lado), con su
  dibujo en el 3D y en los planos, y que el presupuesto lo diga ("Pilotín de hormigón ø 30 cm").
  - 🟢 [ ] Pilotines y zapatas en el plano de planta (hoy solo 3D y presupuesto).
- ✅ **Ejes** (v1.36.0): vigas de techo sobre columnas; columnas sobre pilotines; modulación única (una medida ordena
  columnas, vigas, tirantes y pilotines).
- ✅ **Sol** (módulo, v1.37.0): entrada del sol por las aberturas, sombras, ▶ animación del día (usa el norte).
  - 🟢 [ ] Lugar del sol (latitud/longitud/huso) editable en pantalla (hoy queda Mercedes de fábrica).
  - 🟢 [ ] Sombras en el PDF (foto del 3D con el sol de una fecha/hora).
- 🔴 [ ] **Tabiques interiores** (divisiones del baño y antebaño; pedido de Leandro 31/10): reusando el motor de
  paredes (soleras, montantes, uniones, cortes). Perfiles elegibles de la lista (ej. steel frame 70 mm); revestimiento
  POR CARA de la lista de revestimientos (Durlock común, verde para húmedos, cementicia…) con placas y recortes.
  Ubicación con medidas: paralelo a una pared, a X m de ella, desde Y m de la esquina, largo; alto hasta el techo,
  hasta el piso 2 o una medida. Puede llevar puerta (las aberturas de siempre). En 3D y planta.
- ✅ **Mesada** (v1.38.0): estructura (perfil de la lista) contra una pared; largo, profundidad, alto; revestimiento
  de la lista al frente y costados; tapa y estantes en m²; huecos bajo mesada sin estructura al frente; zócalo
  retirado con patas. En 3D, presupuesto y diagrama de cortes.
  - 🟡 [ ] Validar con el herrero cómo arma la estructura (fondo al piso, patas del zócalo, travesaños arriba y abajo).
  - 🟢 [ ] Mesadas en los planos (planta y vista de frente acotada).
  - 🟢 [ ] Mesada en L (dos tramos unidos en la esquina); bacha (hueco en la tapa).
- ✅ **Muebles** (módulo, v1.38.0): por tipo con medidas a mano, material, distancias, giro y nivel; aviso si se
  sale de la planta.
  - 🟢 [ ] Foto del frente pegada en su cara; fotos guardadas en este navegador (achicadas), no viajan en el link.
  - 🟢 [ ] Muebles en el plano de planta; mover con el mouse en el 3D.
  - ✅ Color propio por mueble y color de tapa y estantes por mesada (v1.38.2).
- ✅ Capas en pestañas, una sección a la vez, sin tapar el 3D (v1.38.2).
- 🗺️ **Pedido de Leandro 04/11** (orden acordado: muebles → mesada → tabiques):
  - ✅ v1.39.0 Muebles: pared de referencia, distancias y alto libre calculados, lavarropas frontal/superior, hornallas, vanitory.
  - ✅ v1.40.0 Mesada en L o U, huecos con/sin tapa y sobre zócalo con el electrodoméstico adentro, bachas en la mesada.
    - 🟡 [ ] Validar con el herrero la esquina de la L/U (el frente tapado del principal va sin solera de abajo ni zócalo).
    - 🟢 [ ] Bacha bajo mesada vs. apoyada; anafe y horno empotrados como huecos.
  - ✅ v1.41.0 Tabiques de Durlock con puerta de abrir o granero; mesada L/U de largo libre; cajones de cama; doble clic
    para el centro de giro del 3D.
    - 🟡 [ ] Validar con el herrero/durlero: montantes cortos sobre la puerta, dintel simple y barras de 2,60 m.
    - 🟢 [ ] Tabiques en los planos (planta); unir tabiques entre sí en L (hoy cada uno es recto).
    - 🟢 [ ] Cerramiento de ducha de vidrio (hoy es un tabique de placa con puerta).
    - 🟢 [ ] Puertas de abrir dibujadas entreabiertas con su barrido.
- ✅ Etiquetas de mesadas y muebles en el 3D, apagables una por una y por capa (v1.38.1).
- ✅ **Sol más fuerte** (v1.38.0): intensidad regulable (50–300 %, 150 % de fábrica).

## v1.49.0 Sol con "Ver adentro", choques, aberturas y personas que se sientan (pedido de Leandro 11/11)
- ✅ Sombras con paredes ocultas; mueble frenado en la pared y aviso de choques; mover aberturas; apoyar en la mesada; sentarse y acostarse.
  - 🟡 [ ] Mirar en pantalla el sol entrando por las aberturas con "Ver adentro" y a la persona sentada/acostada (probado con tests, no visto).
  - 🟢 [ ] Escalera: frenarla en la pared al moverla (hoy solo avisa en su tarjeta).

## v1.48.0 Electrodomésticos (pedido de Leandro 11/11)
- ✅ Muebles, electrodomésticos y baño por separado; televisor, cafetera, horno de aire y máquina de pan.
  - 🟢 [ ] Apoyar un electrodoméstico chico "sobre" una mesada o un mueble elegido (hoy se ubica con distancias y altura).
  - 🟢 [ ] Más: microondas, lavavajillas, termotanque, aire acondicionado, estufa.

## v1.47.1 Personas y perros (pedido de Leandro 11/11) — falta subir
- ✅ Pasar bajo la escalera, entrar al baño y a la ducha; las personas abren las puertas; perros que caminan solos.
  - 🟡 [ ] Probar con el proyecto real de Leandro (el de la nube es del 4/11, sin el antebaño): el arreglo se probó con una copia vieja + una puerta.
  - 🟢 [ ] Puertas de los muebles (heladera, placard) que se abran cuando la persona los busca.
  - 🟢 [ ] Que el perro siga a una persona elegida.

## v1.47.0 Seguimiento de la obra (pedido de Leandro 11/11)
- ✅ Rubros con estado, contrato, fechas y pagos parciales; armar desde el presupuesto; resumen de la obra.
  - 🟡 [ ] Seguimiento en el PDF y en el Excel (hoy solo en pantalla).
  - 🟢 [ ] Comprobantes (foto o PDF del recibo): necesita dónde guardarlos (Firebase Storage o Django).
  - 🟢 [ ] Si crece (varias obras, usuarios, comprobantes, historial), pasarlo a la app Django (opción B de Construcción Modular) y escribir el ADR.

## Revisión de presupuesto y materiales (11/11, pedido de Leandro) — sin cambios aplicados
Revisado: motor/presupuesto.js, proveedores.js, revestimientos.js, optimizadorCortes.js, TablaPresupuesto y el PDF.
Lo que ya está bien: cortes compartidos entre renglones del mismo perfil, merma por corte (3 mm), excedente de
barra por proveedor, flete con "gratis desde", lista de materiales con kilos, plan de compra por proveedor.

### 🔴 Importante
- [x] ✅ v1.46.0 **El total no es un precio de obra**: suma solo materiales. Faltan mano de obra, consumibles, imprevistos,
      margen e IVA (ya estaba en 🟡 Funcionalidad → Presupuesto; lo subo porque el total se lee como "lo que cuesta").
      Propuesta: un bloque de cierre "Materiales + Consumibles + Mano de obra (por kg de hierro, por m² o global)
      + Imprevistos % + Margen % + IVA (opcional) = Total", que salga igual en pantalla, PDF y Excel.
- [x] ✅ v1.48.0 **Consumibles en 0 sin aviso**: tornillería, electrodos y selladores arrancan en cantidad 0 y no suman nada.
      Propuesta: cantidad estimada automática (que se pueda pisar a mano), por ejemplo electrodos ≈ 1–1,5 % de los kg
      de hierro, autoperforantes por m² de panel, sellador por metro de junta, antióxido/esmalte por m² de hierro
      (perímetro de la sección x largo). Los coeficientes, a validar con el herrero.

### 🟡 Conviene
- [ ] **Precios sin fecha** (con la inflación se vencen rápido): guardar cuándo se actualizó cada proveedor y avisar
      "precios de hace más de 30 días" en el presupuesto y el PDF.
- [ ] **Tabiques de Durlock**: soleras y montantes van en un mismo renglón con el mismo perfil; en obra la solera es
      PGU y el montante PGC. Faltan tornillos T1/T2, cinta y masilla por m² de placa.
- [ ] **Tirantes de madera** por metro (ya anotado en v1.43.0): comprarlos por largo comercial con el optimizador.
- [ ] **Desperdicio de placas fijo en 10 %** (OSB y machimbre, `DESPERDICIO_PLACAS`): editable como el excedente de barras.
- [ ] **Empalmes**: las piezas más largas que la barra se cortan en tramos, pero no se cuenta la unión (soldadura o
      cubrejunta). Mostrar cuántos empalmes hay en el resumen y, opcional, un renglón de refuerzos.
- [ ] **Precio por kilo**: muchos corralones venden el hierro por kg; poder cargar $/kg y que la barra se calcule con
      su peso (los kg por metro ya están).

### 🟢 Detalles
- [ ] El OSB del entrepiso no descuenta el hueco de la escalera (si la escalera sube por adentro del entrepiso).
- [ ] PDF del presupuesto: número de presupuesto y "válido por N días".

## v1.43.0 (pedido de Leandro 10/11)
- ✅ Puertas de muebles con su margen sombreado y aviso; copero, alacena y altura desde el piso.
- ✅ Tirantes de madera y machimbre en los dos pisos; fichas plegables; del 3D a su tarjeta.
  - 🟡 [ ] Validar sección y precio de los tirantes de madera (2" x 6" PB, 2" x 5" altillo) y si se compran por largo comercial (3,05 / 3,66 / 4,27 m).
  - 🟢 [ ] Separación recomendada de tirantes de madera según la luz (tabla simple).
  - 🟢 [ ] Seleccionar mesadas/tabiques en el 3D por sus placas (hoy por sus hierros).

## v1.45.0 (pedido de Leandro 11/11)
- ✅ v1.45.1 Capa "Lo enterrado" para no ver pilotines y zapatas bajo tierra.
- ✅ Personas con altura y sexo que caminan (clic o teclado), se agachan/estiran; primera persona; paredes que tapan ocultas; mover muebles solo con "✥ Mover".
  - 🟢 [ ] Subir y bajar la escalera caminando (hoy cada persona se queda en su piso; se cambia en su ficha).
  - 🟢 [ ] Salir por las puertas al terreno (hoy caminan solo adentro).
  - 🟢 [ ] Acciones con muebles: sentarse en sillas/sillón, acostarse en la cama, abrir la heladera.
  - 🟢 [ ] Que las personas se esquiven entre ellas.

## v1.44.0 (pedido de Leandro 11/11)
- ✅ Mover y girar muebles desde el 3D (arrastre, flechas, R); modo realista; exportar por partes (pisos y lados sin pared).
  - 🟢 [ ] Mover y girar también mesadas y tabiques desde el 3D (hoy se editan por sus campos).
  - 🟢 [ ] Elegir en la exportación qué vistas por partes van (hoy van todas).
  - 🟢 [ ] Texturas en el modo realista (madera, placa) si hace falta más realismo.

## Exportación (v1.42.0, pedido de Leandro 10/11)
- ✅ Solo planos; caños y perfiles (tipo, barras, dónde va); aberturas; partes de la obra y atajo "para quien cotiza paneles".
- 🟢 [ ] Tabiques y mesadas dibujados en las plantas (hoy solo en la lista de caños).
- 🟢 [ ] Guardar "perfiles de exportación" con nombre (ej. "Panelero", "Herrero", "Cliente").

## Uniones y marcos (v1.33.0, pedido de Leandro 27/10)
- ✅ Fajas cortadas en los vanos; uniones en red con jerarquía y luz; perfil propio del marco de cada abertura.
- 🟡 [ ] Validar con el herrero la "medida vista" que se descuenta (ala del C, ancho del caño rectangular) y la jerarquía.
- 🟢 [ ] Riostras: cortarlas contra columnas y marcos (corte a inglete, hoy van eje a eje).
- 🟢 [ ] Columnas del entrepiso y bordes del piso 2 contra las columnas de pared (hoy no se tocan).
- 🟢 [ ] Techo: bordes contra vigas si se arma como red (hoy las correas van apoyadas, que es lo correcto).
- ✅ Jerarquía elegible por obra (4 pares) y por abertura (v1.34.0).
- 🟢 [ ] Si hace falta, jerarquía por pared (se decidió no hacerlo por ahora: por obra + por abertura alcanza).

## 🗺️ Hoja de ruta acordada (27/10): terreno → sol → muebles
Decisiones de Leandro: lote rectangular; ubicar pozo séptico y cámara, árboles y otras construcciones, accesos y
veredas; sol con animación del día; orden Terreno → Sol → Muebles.
- ✅ **Etapa 1 — Terreno e implantación (v1.32.0)**: lote frente × fondo, línea municipal en el frente, casa
  ubicada por distancia a frente/fondo/laterales (con aviso si no entra o invade retiros que carga Leandro),
  pozo séptico + cámara (con distancias), árboles/otras construcciones (cajas o cilindros con altura), accesos y
  veredas (rectángulos en el piso), flecha del norte. En el 3D, en una planta "Implantación" en Planos y en el PDF.
  - 🟡 [ ] Probar con Leandro en un lote real (medidas, orientación, retiros de Mercedes) y ajustar.
  - 🟢 [ ] Mover elementos arrastrando en el 3D (hoy se cargan las distancias); se resuelve junto con los muebles.
  - 🟢 [ ] Vereda municipal y ochava (lotes en esquina) si hace falta.
- ✅ **Módulos por instalación** (v1.32.0, `src/modulos.js`): Terreno es el primero. Cada etapa nueva (Sol, Muebles)
  entra como módulo propio.
  - 🟢 [ ] Pasar a módulo lo que ya existe y no todos usan: Grada, Montaje industrial, Nube (links cortos).
  - 🟢 [ ] Opción C (más adelante): usuarios con login (Firebase Auth) y módulos por usuario/organización con
    superadmin. Enchufa en `moduloActivo` sin tocar los módulos.
- 🟡 [ ] **Etapa 2 — Sol (v1.33)**: posición del sol por latitud/fecha/hora (fórmulas astronómicas, sin
  librerías), luz con sombras en el 3D, día y hora elegibles + botones invierno/verano + ▶ animación del día;
  sombras de árboles y otras construcciones; sol que entra por cada abertura. Cuidar el rendimiento en celular.
- 🟢 [ ] **Etapa 3 — Muebles (v1.34)**: cajas con nombre, medidas y color en un piso; mover (arrastre/flechas) y
  girar; separar "mover mueble" de "girar cámara".

## 🔴 Antes de considerar el presupuesto "de obra" (validar con el herrero)
- [ ] Llevarle la hoja "Preguntas para el herrero" (Claude Docs, enlazada en la tarjeta de Trello) — antes,
      Leandro actualiza su plano y se regenera con los valores de SU proyecto.
- [ ] Supuestos de `constantes.js` y del modelo: ubicación de columnas, empalmes, perfil de cada renglón
      y separación de transversales.
- [ ] Horizontales de pared: hoy NO se cortan en las aberturas (cálculo conservador: sobra material). ¿Se cortan en obra?
- [ ] Reglas de vanos: columna dentro del vano se corta (tramo bajo el antepecho y sobre el dintel);
      jamba a menos de 10 cm de una columna no se agrega.
- [ ] Escalera: perfil de zanca (caño 120x60), ángulos de apoyo, espesor de piso 2 (8 cm para la altura
      automática) y cantidad de columnas.
- [ ] Excedente de las barras: depende del proveedor. El herrero tiene que cargar el % de SU proveedor
      (viene en 1 %; avisado en la pantalla y en el manual).

## Pruebas de Leandro (16/10) — a ordenar
- ✅ Tiras y placas: descontar aberturas (v1.24.0; solo lo tapado entero por el hueco).
- 🟡 [ ] Placas estándar: aprovechar recortes (hoy cada recorte se tira).
- 🟡 [ ] Revestimiento interior también en el techo (cielorraso) y precio por metro lineal para chapas a medida.
- 🟡 [ ] En cada pared: elegir el perfil de sus columnas y horizontales (no solo el panel / revestimiento).
- 🟡 [ ] Patrón de perfiles en una pared: "cada N columnas, una de otro perfil" o dos capas de perfiles.
- 🟡 [ ] Elegir color en todos los materiales (como en los tipos de panel).
- 🟡 [ ] Acortar piezas horizontales con "desde X m / hasta Y m de la esquina" (las verticales ya lo tienen).
- 🟡 [ ] Pegar una abertura en OTRA pared (hoy se pega al lado y después se cambia la pared en sus datos).

## Revisión UX/UI (19/10, v1.17.0) — skill experiencia-ux-ui, sin cambios aplicados
Quién la usa: el herrero (y Leandro) cargando una obra, en la compu del taller o en el celular en la obra.
Medido: panel derecho de ~7.400 px de alto en escritorio y ~10.000 px en el celular, 155 campos, 9 tarjetas
abiertas a la vez, 15+ botones de menos de 40 px en el celular.

### 🔴 Lo que más fricción genera (✅ resuelto en v1.18.0)
- [x] **Panel demasiado largo**: 9 tarjetas abiertas y 155 campos, sin índice. Propuesta: 3 pestañas o un índice
      fijo (Estructura · Paredes y aberturas · Materiales y presupuesto); tarjetas plegadas salvo la que se usa;
      un resumen en el título de cada tarjeta plegada (ej. "Paredes · 4 · 3 aberturas", "Presupuesto · $ 7,8 M").
- [x] **No hay deshacer**: la ✕ de una abertura, de un revestimiento o "Eliminar pieza" no se pueden deshacer con
      Ctrl+Z. Propuesta: historial deshacer/rehacer (Ctrl+Z / Ctrl+Y) de las medidas, aberturas y piezas, y un
      aviso "Abertura #2 quitada · Deshacer" por unos segundos.
- [x] **Celular**: el 3D ocupa toda la primera pantalla y los datos quedan abajo; el encabezado ocupa 3 renglones;
      botones de menos de 40 px (difíciles de tocar con el dedo en obra). Propuesta: barra inferior fija con
      "3D · Datos · Presupuesto", botones de 44 px, encabezado en un renglón con menú "⋯".

### 🟡 Mejoras importantes
- [ ] **Total del presupuesto siempre a la vista** (hoy solo al final de la tabla): en el título de la tarjeta o
      fijo arriba.
- [x] **Valor inválido** (v1.18.1): lo escrito queda con el aviso al salir del campo ("se sigue usando 7.50");
      Esc vuelve al último valor válido.
- [x] **"0 = sin"** → casilla + valor (v1.19.0): transversales, entrepiso, entrepiso parcial, columnas del borde
      libre, montantes, altura de escalera, solape, patas y travesaños de montaje, parantes de grada.
- [x] **Cambios sin guardar** (v1.18.1): el navegador avisa al cerrar o recargar si el proyecto abierto tiene
      cambios sin guardar. Queda evaluar autoguardado en Mis proyectos.
- [ ] **Seleccionar en el 3D**: los hierros finos cuestan, y más con el dedo. Margen de toque más grande y, como
      alternativa, una lista de piezas filtrable por pared.
- [x] **Leyenda de capas** agrupada (v1.19.0): Estructura · Superficies · Ayudas · Opacidad · Partes, con "todo / nada".
- [x] **Diálogos propios** (v1.19.0) en vez de `window.confirm` / `prompt`: dicen qué se borra o qué se pierde.
- [x] **Texto chico y tenue** (v1.19.0): mínimo 0,75 rem en textos de lectura y gris más claro.
- [ ] **Modo claro** para usar a pleno sol en la obra.
- [ ] **Unidades**: largo de barra y precios siempre en m y $ aunque la unidad global sea cm/mm (ya anotado en Uso).
- [x] **Medir**: varias medidas fijas en el 3D (v1.28.0).

### 🟢 Prolijidad
- [x] **Foco de teclado visible** en todos los botones (v1.18.0).
- [x] **Encabezado en el celular** en un renglón (v1.18.1): 🐤, nombre, ●, ↶ ↷, Guardar y ⋯ (la versión va en el menú).
- [x] **Atajos a la vista** (v1.19.0): botón "?" (o la tecla ?) con primeros pasos y atajos.
- [ ] **Consistencia de botones**: "Duplicar" y "✕" de aberturas vs "+ Agregar revestimiento" grande y verde vs
      "+ Puerta" secundario; un mismo estilo para la misma acción.
- [x] **Primer uso** (v1.19.0): bienvenida con 3 pasos la primera vez (el ejemplo ya viene cargado).
- [ ] **Textos de ayuda largos** en la barra del 3D: dejar uno corto y el resto en un "?".

## Pruebas de Leandro (18/10) — para la versión de materiales
- ✅ **Cortes compartidos** (v1.20.0, pedido del 20/10): renglones con el mismo perfil (80x80x2 = 80x80x2.0),
      largo de barra y precio cortan de las mismas barras; aviso si el mismo perfil tiene otro precio.
      Siguiente paso natural: la lista de perfiles de abajo (elegir en vez de escribir).
      v1.20.1: botón "Usar $X en todos" cuando el mismo perfil tiene precios distintos (el precio es por renglón y
      no sigue al perfil: con la lista de perfiles el precio pasa a ser del perfil y esto desaparece).
- 🟡 [ ] Desperdicio que no se arregla compartiendo: columnas de ~4,70 m en barras de 6 m dejan ~1,30 m cada una.
      Ideas: usar esos sobrantes en piezas de otro renglón del mismo perfil (ya lo hace si lo hay), sugerir
      largo de barra (ej. 12 m si el proveedor lo vende) o listar los sobrantes reutilizables.
- 🟡 [ ] Cortes compartidos: aprovechar también recortes de **otras obras** o del stock del taller (sobrantes guardados).
- ✅ **Lista de perfiles** (v1.21.0): tipo, medidas, barra, precio y peso; cada parte elige su perfil.
- ✅ Perfil por **pared** (columnas, fajas, montantes, marco de piso y solera) y **patrón alternado** con montantes (v1.22.0).
- 🟢 [ ] El 3D dibuja todo con el grosor de la lista (hoy solo grada/montaje leen la medida del nombre).
- 🟢 [ ] Peso con tablas del fabricante (esquinas redondeadas) en vez del cálculo aproximado.
- ✅ Perfiles con **medidas reales** (v1.21.0): tipo, medidas y espesor → peso (kg/m); ya no es texto libre.
- ✅ Precio de los revestimientos también en Materiales (v1.23.0).
- ✅ Proveedores y comparar presupuestos (v1.25.0): precio por proveedor en efectivo/tarjeta, "lo más barato de cada material".
- ✅ Exportar las paredes completas (v1.26.0): pestaña Planos, PDF y Excel.
- ✅ Separaciones por medida o por cantidad, en paredes, pisos y techo (v1.27.0).
- ✅ Imprimir/exportar eligiendo qué sale: PDF de 3 hojas y Excel de 4 (v1.28.0).
- ✅ Imprimir el 3D con lo seleccionado, cotas generales, medidas fijadas y vistas fijas (v1.28.0).
- ✅ Bordes de pisos y techo con perfil propio; interior por sentido (v1.28.0).
- ✅ Travesaños de abertura hasta las columnas, arriba y abajo (v1.28.0).
- ✅ Altura del piso 2 elegible; columnas del entrepiso con perfil propio, hasta el piso 2 o al techo, y fila del medio con viga (v1.28.0).
- 🟢 [ ] Fila del medio del entrepiso: hoy una sola, a media profundidad. Evaluar varias filas o elegir dónde.
- 🟢 [ ] Medidas fijadas: hoy son de la sesión (no se guardan en el proyecto). Evaluar guardarlas.
- 🟢 [ ] Vistas fijas del PDF: ocultar los carteles de las paredes (se superponen en las vistas chicas).
- 🟡 [ ] Paneles por caras, colores por capa o material, cielorraso (próxima versión de Materiales).
- ✅ Resaltar en el 3D lo que se señala (perfil, renglón, pared, pisos, techo…) con el mouse o fijo con 👁 (v1.27.0).
- ✅ Botones de borrar con texto "Eliminar"; carteles del 3D con ✕ arriba y acciones en el pie (v1.27.0).
- 🟢 [ ] Resaltar también desde la pestaña Planos (cada pared/planta) y cada componente del montaje por separado.
- 🟢 [ ] Columnas del borde libre por cantidad: hoy es la misma cantidad en cada borde libre (podría ser una por borde).
- 🟢 [ ] Revisar con Leandro si los otros listados (proveedores, perfiles) también quieren Eliminar al pie.
- 🟢 [ ] Planos: escalonar las cotas cuando quedan muy juntas (hoy se omiten las de menos de 15 cm); escalera en planta; DXF para CAD.
- 🟢 [ ] Proveedores compartidos entre proyectos (hoy viajan con cada proyecto).
- ✅ Flete por proveedor, plan de compra contando el flete y "más barato en" (v1.29.0).
- ✅ Accesorios con cantidad a mano y precio por proveedor (v1.29.0).
- ✅ Link compacto (la mitad) y links cortos de ver/editar en Firebase (v1.30.0; falta que Leandro cree el proyecto Firebase: ver firebase/COMO-CONFIGURAR.md).
- ✅ Proyecto Firebase `pollo-calculator` creado (Firestore Standard, southamerica-east1, modo producción) y cargado en configNube.js (v1.30.1).
- ✅ Total de la obra = plan de compra con varios proveedores (v1.30.2).
- ✅ Lista de materiales por proveedor + "Copiar pedido" (v1.30.3); con tipo, medidas, espesor y kilos (v1.30.4).
- ✅ Presupuesto reordenado en sub-pestañas + lista de materiales sin proveedor (v1.31.0).
- 🟢 [ ] Si "Lo más barato de cada material" y el plan dan igual (sin flete), quizás sobra una de las dos filas en la comparación.
- 🔴 [ ] Prueba en vivo después del deploy: crear links, guardar con el de editar desde otro navegador/celular, confirmar que el de ver no guarda. Opcional: probar las reglas con firebase/probarReglas.mjs (las reglas reales no se pudieron correr en el emulador desde la sesión: se probó la misma lógica con un Firestore falso).
- 🟡 [ ] Restringir la API key de Firebase al dominio pollolopez.github.io y a la API de Firestore.
- 🟢 [ ] Historial de versiones del link (hoy `cambios/` guarda solo quién/cuándo; se podría guardar la versión para volver atrás).
- 🟢 [ ] Accesorios calculados (ej. tornillos por m² de panel, electrodos por metro de soldadura).
- 🟢 [ ] Flete por viaje según cantidad (cada N barras o kg) si algún proveedor lo cobra así.
- 🟡 [ ] Paneles sándwich por **caras**: chapa/chapa, chapa/madera (interior), madera/madera (paneles SIP).
      Cada cara con su material y color.
- 🟡 [ ] Perfil por pared y **patrón alternado en la misma capa**: ej. caño 80x80 cada 2 m y 60x60 entre medio
      (decisión de Leandro: mejor que dos capas).
- ✅ Columnas de esquina: perfil propio, elegible en Materiales (v1.22.0).
- 🟡 [ ] Colores: **elegible** "por capa" o "por material" en el 3D (decisión de Leandro).
- ✅ Hecho en v1.14.1: marcos de aberturas con renglón propio; paredes plegables (aria-expanded); "Eliminar
      pieza" menos llamativo que "Cerrar"; textos del editor ("Perfil de esta pieza", "Acortar la punta de…");
      nombre de archivo sin "pollo-pollo".

## 🟡 Funcionalidad

### Estructura
- [ ] Entrepiso parcial — confirmar con el herrero (hoja de preguntas, sección 4): si el borde libre necesita
      columnas y cada cuánto (hoy 2,50 m), sentido de los tirantes, perfil de la viga de cierre.
- [ ] Escalera que llegue a un borde LATERAL del entrepiso parcial (hoy solo al borde de enfrente de la pared).
- [ ] Aleros del techo (voladizo de vigas y chapa más allá de las paredes).

### Escalera
- [ ] Baranda (en la escalera y en el borde del entrepiso).
- [ ] Escalera atravesando el entrepiso (hueco en la estructura de piso 2 con su marco; descontar OSB).
- [ ] Escalones compensados (en abanico) en los giros, como alternativa al descanso plano.

### Grada
- [ ] Baranda trasera y lateral (aviso cuando pasa de 1 m de alto).
- [ ] Peso por módulo (para saber si lo levantan dos personas): necesita kg/m de cada caño.
- [ ] Planchuelas o placas de unión entre módulos (hoy solo se cuentan los bulones).
- [ ] Escalera o pasillo de acceso entre filas; riostras también en el sentido de adelante hacia atrás.
- [ ] Validar con el herrero los perfiles de la grada y la carga por pórtico.

### Montaje industrial
- [ ] Cinta transportadora (estructura, rodillos de carga y retorno, tambores, largo de banda).
- [ ] Cilindro / cono / tolva sueltos de chapa, con su desarrollo.
- [ ] Croquis en la tablet (dibujar o calcar una foto, acotar líneas, repetir el bastidor a lo largo).
- [ ] Chapa por espesor: hoy hay un solo renglón para tanques y uno para tapas; si hay tanques de distinto espesor,
      separar renglones. Tamaño de chapa comercial editable (hoy 2,44 x 1,22).
- [ ] Anclajes, bridas, bocas y accesorios de tanques; giro libre (no solo 0° / 90°).
- [ ] Más adelante: que la IA lea la foto de un croquis (necesita servidor, Construcción Modular).

### Presupuesto
- [ ] Bulonería, soldadura, pintura, fijaciones de paneles, babetas/zinguería y mano de obra.
- ✅ Vistas fijas (frente, lateral, desde arriba) en el PDF (v1.28.0). [ ] PDF propio sin pasar por el navegador.

### Uso
- [ ] Botón "aplicar a todas las paredes" para no cargar 4 veces la misma separación.
- [ ] Largo de barra y precios se editan siempre en metros/pesos, aunque la unidad global sea cm/mm.
- [ ] Seleccionar varias piezas a la vez (ej. Shift + clic) para eliminarlas o editarlas juntas.
- [ ] Pieza editada con otro perfil: dibujarla con la sección/color de ese perfil en el 3D (hoy solo cambia el presupuesto).
- [ ] Orientación real (norte) en el 3D para estudiar asoleamiento de aberturas.

### Requiere backend (Construcción Modular / Django o Firebase) — a futuro
- [ ] Cuentas por herrero (usuario y contraseña): cada uno ve sus planos desde cualquier compu o celular.
- [ ] Proyectos en la nube: verlos desde cualquier compu/celular y compartirlos con el herrero por link.
- [ ] Catálogo compartido: el herrero carga sus precios una sola vez ("plantilla de catálogo").

## 🟢 Técnico
- [x] En el celular el encabezado ocupa ~3 renglones: resuelto en v1.18.1 (un renglón de 61 px).
- [ ] Ayuda (tooltip) en campos poco obvios: "Dist. a esquina", "Sep. verticales" (glosario en CONTEXT.md).
- [ ] Bundle de ~906 KB (Three.js completo; Vite avisa al deployar): evaluar carga diferida del visor.
- [ ] Tests de componentes (testing-library) para CampoNumero, SelectorLado, PanelAberturas y EditorPieza.
- [ ] Piezas eliminadas/editadas se reconocen por su posición: si una medida las mueve, el cambio deja de
      aplicarse (se avisa en la lista). Evaluar si hace falta algo más robusto.
- [ ] Migrar el motor a Django cuando arranque Construcción Modular (los tests sirven de especificación).

## ✅ Resuelto en v1.18.0 (2026-10-19)
- [x] Pestañas (Estructura · Paredes y aberturas · Materiales · Presupuesto con total).
- [x] Deshacer / rehacer del proyecto (↶ ↷, Ctrl+Z / Ctrl+Y, 50 pasos).
- [x] Celular: barra de pestañas abajo con "3D", menú ⋯, botones de 44 px. Foco visible en botones.

## ✅ Resuelto en v1.17.0 (2026-10-19)
- [x] Aberturas dentro de cada pared, con etiqueta en el 3D.
- [x] Montantes (y de dintel / de antepecho), riostras en cruz de pared, jambas de piso a solera.
- [x] Glosario unificado (travesaño de antepecho, horizontales/fajas, montante).

## ✅ Resuelto en v1.16.0 (2026-10-18)
- [x] Medir en el 3D (de eje a eje entre columnas).
- [x] Aberturas seleccionables desde el 3D, con número (#1, #2…); copiar y pegar aberturas y piezas.
- [x] Duplicar piezas (piezas agregadas a mano).
- [x] Juntas de paneles en el 3D.
- [x] Planta de la escalera (escalón más bajo y más alto, a la vista).
- [x] "Arranca a / Termina a" en piezas verticales; versión visible en el encabezado.

## ✅ Resuelto en v1.15.0 (2026-10-16)
- [x] Tarjeta Materiales; Presupuesto solo con cantidades y precios.
- [x] Revestimientos a medida (ancho útil, largo máximo, solape) y en placa fija (ancho × largo): tiras y placas enteras.
- [x] Ubicación del revestimiento (sobre los perfiles / embutido) y espesor, a elección del herrero.
- [x] Revestimiento interior por pared (base para el durlock).
- [x] Duplicar aberturas desde su tarjeta.

## ✅ Resuelto en v1.14.1 (2026-10-16)
- [x] Dintel, jambas y alféizar en su propio renglón "Marcos de aberturas" (antes con las columnas).
- [x] Cada pared se pliega desde su título; "Eliminar pieza" aparte y con borde; textos del editor más claros.
- [x] Archivo "Pollo casa" => pollo-casa-fecha.json (antes pollo-pollo-casa-…).

## ✅ Resuelto en v1.14.0 (2026-10-15)
- [x] Entrepiso parcial (largo × profundidad, desde una esquina) con viga de cierre en los bordes libres (renglón
      propio) y columnas del borde libre cada X m.
- [x] Encabezado "🐤 Pollo Calculator".

## ✅ Resuelto en v1.13.1 (2026-10-14)
- [x] La app se llama Pollo Calculator.

## ✅ Resuelto en v1.13.0 (2026-10-14)
- [x] Grada: caño que une los parantes, tabla de respaldo, elegir el caño de cada parte, módulos y filas atornillables.

## ✅ Resuelto en v1.12.0 (2026-10-14)
- [x] Opacidad de paneles, OSB y hierros; color interior y exterior de los paneles.
- [x] Compartir un proyecto por link (con las medidas, no el ejemplo).
- [x] El PDF incluye la imagen de la estructura.

## ✅ Resuelto en v1.11.0 (2026-10-14)
- [x] Montaje industrial con varios componentes: mesa / bastidor y tanque cilíndrico (chapas, soldadura, peso, litros).

## ✅ Resuelto en v1.10.0 (2026-10-14)
- [x] Grada: asiento y pie pueden ser el mismo tablón, o un solo tipo de tablón por fila.

## ✅ Resuelto en v1.9.0 (2026-10-14)
- [x] Grada para espectadores como proyecto propio, con parantes, vigas longitudinales y riostras en cruz.
- [x] Escalera: parantes (hasta 12 por tramo) y riostras en cruz entre parantes.

## ✅ Resuelto en v1.8.0 (2026-10-14)
- [x] Escalera con más de un descanso (U y 3/4 de vuelta) y aviso de paso libre.
- [x] Editar piezas sueltas: recortar, mover y cambiar el perfil (ej. columna del altillo hasta el piso 2).
- [x] Etiquetas de las paredes en el 3D: nombre propio y mostrar/ocultar.

## ✅ Resuelto en v1.7.0 (2026-10-13)
- [x] Diseño de escaleras: recta o en L con descanso, al borde del entrepiso; ancho, huella, contrahuella,
      altura total; zanca central, apoyos de ángulo o recorte de caño, columnas de soporte; presupuesto y 3D.
- [x] Tarjetas del panel y leyenda de capas plegables; ocultar el 3D para cargar datos (sobre todo en celular).

Versiones anteriores (v1.0 a v1.6): ver `CHANGELOG.md`.
