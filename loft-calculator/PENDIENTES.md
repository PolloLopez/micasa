# PENDIENTES — loft-calculator

Última limpieza: 2026-10-15 (v1.14.0). Espejo en Trello: tablero "Desarrollo", tarjetas `[CALC]`.

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
- 🟡 [ ] Tiras y placas: descontar las aberturas grandes (hoy se cuentan como pared llena: sobra material) y
      placas estándar con aprovechamiento de recortes.
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

### 🔴 Lo que más fricción genera
- [ ] **Panel demasiado largo**: 9 tarjetas abiertas y 155 campos, sin índice. Propuesta: 3 pestañas o un índice
      fijo (Estructura · Paredes y aberturas · Materiales y presupuesto); tarjetas plegadas salvo la que se usa;
      un resumen en el título de cada tarjeta plegada (ej. "Paredes · 4 · 3 aberturas", "Presupuesto · $ 7,8 M").
- [ ] **No hay deshacer**: la ✕ de una abertura, de un revestimiento o "Eliminar pieza" no se pueden deshacer con
      Ctrl+Z. Propuesta: historial deshacer/rehacer (Ctrl+Z / Ctrl+Y) de las medidas, aberturas y piezas, y un
      aviso "Abertura #2 quitada · Deshacer" por unos segundos.
- [ ] **Celular**: el 3D ocupa toda la primera pantalla y los datos quedan abajo; el encabezado ocupa 3 renglones;
      botones de menos de 40 px (difíciles de tocar con el dedo en obra). Propuesta: barra inferior fija con
      "3D · Datos · Presupuesto", botones de 44 px, encabezado en un renglón con menú "⋯".

### 🟡 Mejoras importantes
- [ ] **Total del presupuesto siempre a la vista** (hoy solo al final de la tabla): en el título de la tarjeta o
      fijo arriba.
- [ ] **Valor inválido**: al salir del campo vuelve solo al valor anterior y el aviso desaparece. Mejor dejar lo
      escrito con el error hasta corregirlo, o avisar "se volvió a 2.50".
- [ ] **"0 = sin"** en muchos campos (montantes, transversales, largo de entrepiso…): reemplazar por una casilla
      "Lleva montantes" + el valor, más fácil de entender.
- [ ] **Cambios sin guardar**: solo un "Sin guardar" chico en amarillo. Avisar al cerrar la pestaña si hay cambios
      (y evaluar autoguardado en Mis proyectos).
- [ ] **Seleccionar en el 3D**: los hierros finos cuestan, y más con el dedo. Margen de toque más grande y, como
      alternativa, una lista de piezas filtrable por pared.
- [ ] **Leyenda de capas larga** (16 casillas): agrupar (Estructura · Superficies · Ayudas) con "todo / nada".
- [ ] **Confirmaciones nativas** (`window.confirm`): feas y bloquean el 3D. Diálogo propio que diga qué se borra.
- [ ] **Texto chico y tenue** (detalles de 0,68 rem en gris sobre fondo oscuro): subir a 0,75 rem mínimo y más
      contraste; pensar un **modo claro** para usar a pleno sol en la obra.
- [ ] **Unidades**: largo de barra y precios siempre en m y $ aunque la unidad global sea cm/mm (ya anotado en Uso).
- [ ] **Medir**: poder dejar varias medidas fijas en el 3D (hoy se ve una por vez).

### 🟢 Prolijidad
- [ ] **Foco de teclado visible** en todos los botones (hoy solo campos y títulos de tarjetas).
- [ ] **Atajos a la vista**: un "?" que liste Ctrl+C / Ctrl+V / Esc / (futuro Ctrl+Z).
- [ ] **Consistencia de botones**: "Duplicar" y "✕" de aberturas vs "+ Agregar revestimiento" grande y verde vs
      "+ Puerta" secundario; un mismo estilo para la misma acción.
- [ ] **Primer uso**: elegir "Proyecto vacío" o "Ejemplo" con una explicación de 3 pasos.
- [ ] **Textos de ayuda largos** en la barra del 3D: dejar uno corto y el resto en un "?".

## Pruebas de Leandro (18/10) — para la versión de materiales
- 🔴 [ ] Perfiles con **medidas reales**: al agregar un perfil se cargan tipo (caño cuadrado/rectangular, redondo,
      perfil C, ángulo, planchuela…), medidas (lados o diámetro) y espesor. Así se calcula el **peso del hierro**
      (kg/m) y se estandariza (hoy es un texto libre).
- 🟡 [ ] Paneles sándwich por **caras**: chapa/chapa, chapa/madera (interior), madera/madera (paneles SIP).
      Cada cara con su material y color.
- 🟡 [ ] Perfil por pared y **patrón alternado en la misma capa**: ej. caño 80x80 cada 2 m y 60x60 entre medio
      (decisión de Leandro: mejor que dos capas).
- 🟡 [ ] Columnas de esquina: perfil propio, **elegible en Materiales** (decisión de Leandro).
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
- [ ] Exportar PDF propio (hoy es "Imprimir → Guardar como PDF" del navegador; ya incluye la vista 3D). Sumar
      vistas fijas (frente, lateral, planta) además de la vista actual.

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
- [ ] En el celular el encabezado ocupa ~3 renglones: evaluar un menú compacto.
- [ ] Ayuda (tooltip) en campos poco obvios: "Dist. a esquina", "Sep. verticales" (glosario en CONTEXT.md).
- [ ] Bundle de ~906 KB (Three.js completo; Vite avisa al deployar): evaluar carga diferida del visor.
- [ ] Tests de componentes (testing-library) para CampoNumero, SelectorLado, PanelAberturas y EditorPieza.
- [ ] Piezas eliminadas/editadas se reconocen por su posición: si una medida las mueve, el cambio deja de
      aplicarse (se avisa en la lista). Evaluar si hace falta algo más robusto.
- [ ] Migrar el motor a Django cuando arranque Construcción Modular (los tests sirven de especificación).

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
